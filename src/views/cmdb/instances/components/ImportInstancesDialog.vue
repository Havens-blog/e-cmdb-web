<template>
  <el-dialog
    :model-value="visible"
    title="导入实例"
    width="min(720px, 92vw)"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div class="import-body">
      <!-- 模板说明 -->
      <el-alert type="info" :closable="false" class="import-tip">
        <template #title>
          支持 CSV 或制表符分隔文本（可用 Excel 另存）。首行为表头，必需列：
          <code>model_uid</code>、<code>asset_id</code>；可选列
          <code>asset_name</code>、<code>account_id</code>、<code>source</code>、
          <code>owner</code>，其余列作为动态属性。
        </template>
      </el-alert>

      <!-- 文件选择 -->
      <el-upload
        drag
        :auto-upload="false"
        :limit="1"
        accept=".csv,.tsv,.txt"
        :on-change="handleFile"
        :on-remove="clearFile"
        :file-list="fileList"
        class="import-upload"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">拖拽文件到此处，或<em>点击选择</em></div>
        <template #tip>
          <div class="el-upload__tip">
          仅支持 .csv / .tsv / .txt 文本文件，导入走 upsert（幂等，不产生重复）。
          <el-button link type="primary" size="small" @click="downloadTemplate">下载模板</el-button>
        </div>
        </template>
      </el-upload>

      <!-- 解析结果预览 -->
      <div v-if="parsed && parsed.total > 0" class="preview">
        <div class="preview-head">
          <span>解析到 <b>{{ parsed.total }}</b> 行</span>
          <span v-if="errors.length" class="err-count">{{ errors.length }} 行有误（将被跳过）</span>
        </div>
        <el-table :data="previewRows" size="small" max-height="200" class="preview-table">
          <el-table-column v-for="h in parsed.headers" :key="h" :prop="h" :label="h" min-width="120" show-overflow-tooltip />
        </el-table>
        <div v-if="errors.length" class="import-errors">
          <div v-for="(e, i) in errors.slice(0, 5)" :key="i" class="err-line">{{ e }}</div>
          <div v-if="errors.length > 5" class="err-more">… 共 {{ errors.length }} 行有误</div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="importing" :disabled="!canImport" @click="doImport">
        导入 {{ validCount }} 行
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { upsertCmdbInstanceBatchApi } from '@/api'
import { parseTable } from '@/utils/csv'
import type { UploadFile } from 'element-plus'
import type { UpsertInstanceReq } from '@/api/types/cmdb.generated'

const props = defineProps<{
  visible: boolean
  /** 已加载的模型列表（用于预校验 model_uid 存在性，堵住「静默孤儿」缺口） */
  models: Array<{ uid: string; name?: string }>
}>()
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void; (e: 'imported'): void }>()

const fileList = ref<UploadFile[]>([])
const parsed = ref<{ headers: string[]; rows: Record<string, string>[]; total: number } | null>(null)
const errors = ref<string[]>([])
const importing = ref(false)

// 固定列 → 顶层字段，其余列 → attributes
const FIXED_COLS = ['model_uid', 'asset_id', 'asset_name', 'account_id', 'source', 'owner']

const knownModelUids = computed(() => new Set(props.models.map(m => m.uid)))

const parsedInstances = computed<UpsertInstanceReq[]>(() => {
  if (!parsed.value) return []
  const out: UpsertInstanceReq[] = []
  const errs: string[] = []
  for (const [i, row] of parsed.value.rows.entries()) {
    const modelUid = (row.model_uid || '').trim()
    const assetId = (row.asset_id || '').trim()
    if (!modelUid || !assetId) {
      errs.push(`第 ${i + 2} 行：缺少 model_uid 或 asset_id`)
      continue
    }
    // 模型存在性预校验：upsert-batch 对不存在的模型会静默创建孤儿实例
    // （实测 2026-11-06：code=0、无同步问题记录），必须在导入前拦下
    if (!knownModelUids.value.has(modelUid)) {
      errs.push(`第 ${i + 2} 行：模型「${modelUid}」不存在（请先在资源模型中创建）`)
      continue
    }
    const attrs: Record<string, any> = {}
    for (const h of parsed.value.headers) {
      if (FIXED_COLS.includes(h)) continue
      const v = row[h]
      if (v !== undefined && v !== '') attrs[h] = v
    }
    out.push({
      model_uid: modelUid,
      asset_id: assetId,
      asset_name: (row.asset_name || '').trim() || undefined,
      account_id: row.account_id ? Number(row.account_id) : undefined,
      // UI 导入路径：CSV 未显式提供来源时默认标记 import（导入的实例来源就是导入）
      source: (row.source || '').trim() || 'import',
      owner: (row.owner || '').trim() || undefined,
      attributes: Object.keys(attrs).length ? attrs : undefined,
    })
  }
  errors.value = errs
  return out
})

const validCount = computed(() => parsedInstances.value.length)
const canImport = computed(() => validCount.value > 0 && !importing.value)
const previewRows = computed(() => (parsed.value ? parsed.value.rows.slice(0, 8) : []))

function handleFile(file: UploadFile) {
  errors.value = []
  const raw = file.raw
  if (!raw) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const text = String(reader.result || '')
      const table = parseTable(text)
      if (table.headers.length === 0 || !table.headers.includes('model_uid') || !table.headers.includes('asset_id')) {
        ElMessage.error('表头缺少必需的 model_uid / asset_id 列')
        parsed.value = null
        return
      }
      parsed.value = table
    } catch (e: any) {
      ElMessage.error('解析失败：' + (e?.message || '文件格式不正确'))
      parsed.value = null
    }
  }
  reader.readAsText(raw, 'utf-8')
}

function clearFile() {
  parsed.value = null
  errors.value = []
}

/** 下载导入模板 CSV（表头 + 一行示例），免去用户照文档手拼表头 */
function downloadTemplate() {
  const header = 'model_uid,asset_id,asset_name,account_id,source,owner,note'
  const example = 'huawei_ecs,i-bp1234567890,示例主机,0,manual,zhangsan,示例备注'
  const blob = new Blob(['\uFEFF' + header + '\n' + example + '\n'], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'cmdb-instance-import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function close() {
  emit('update:visible', false)
}

async function doImport() {
  if (!canImport.value) return
  importing.value = true
  try {
    await upsertCmdbInstanceBatchApi({ instances: parsedInstances.value })
    ElMessage.success(`已导入 ${validCount.value} 行`)
    emit('imported')
    parsed.value = null
    errors.value = []
    fileList.value = []
    close()
  } catch (e: any) {
    ElMessage.error(e?.message || '导入失败')
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.import-body { display: flex; flex-direction: column; gap: 16px; }
.import-tip code { background: rgba(0,0,0,.06); padding: 1px 5px; border-radius: 3px; }
.import-upload { width: 100%; }
.preview { border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; }
.preview-head { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; font-size: 13px; }
.err-count { color: var(--accent-red, #f56c6c); }
.preview-table { width: 100%; }
.import-errors { margin-top: 8px; font-size: 12px; color: var(--accent-red, #f56c6c); }
.err-line { line-height: 1.6; }
.err-more { color: var(--text-tertiary); }
</style>
