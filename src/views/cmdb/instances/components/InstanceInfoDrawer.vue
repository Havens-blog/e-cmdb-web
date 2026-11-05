<template>
  <el-drawer
    :model-value="visible"
    title="实例详情"
    size="min(560px, 92vw)"
    :close-on-click-modal="true"
    @update:model-value="$emit('update:visible', $event)"
  >
    <template v-if="instance">
      <div class="gd-body">
        <!-- 基本信息（顶层字段，所有模型通用） -->
        <div class="gd-section">
          <div class="gd-title">基本信息</div>
          <div class="gd-rows">
            <div class="gd-row"><span class="gd-label">系统ID</span><span class="gd-value">{{ instance.id }}</span></div>
            <div class="gd-row"><span class="gd-label">资产ID</span><span class="gd-value"><code>{{ instance.asset_id }}</code></span></div>
            <div class="gd-row"><span class="gd-label">名称</span><span class="gd-value">{{ instance.asset_name || '—' }}</span></div>
            <div class="gd-row"><span class="gd-label">模型</span><span class="gd-value">{{ instance.model_uid }}</span></div>
            <div class="gd-row"><span class="gd-label">来源</span><span class="gd-value">{{ sourceLabel(instance.source) }}</span></div>
            <div class="gd-row"><span class="gd-label">责任人</span><span class="gd-value">{{ instance.owner || '—' }}</span></div>
            <div class="gd-row"><span class="gd-label">云账号ID</span><span class="gd-value">{{ instance.account_id || '—' }}</span></div>
            <div class="gd-row"><span class="gd-label">租户</span><span class="gd-value">{{ instance.tenant_id }}</span></div>
            <div class="gd-row"><span class="gd-label">创建时间</span><span class="gd-value">{{ fmtTime(instance.create_time) }}</span></div>
            <div class="gd-row"><span class="gd-label">更新时间</span><span class="gd-value">{{ fmtTime(instance.update_time) }}</span></div>
          </div>
        </div>

        <!-- 全量动态属性（键值对，对任意模型通用） -->
        <div class="gd-section">
          <div class="gd-title">属性（{{ attrEntries.length }}）</div>
          <div v-if="attrEntries.length" class="gd-rows">
            <div v-for="[k, v] in attrEntries" :key="k" class="gd-row">
              <span class="gd-label" :title="k">{{ k }}</span>
              <span class="gd-value"><code class="gd-attr">{{ formatAttr(v) }}</code></span>
            </div>
          </div>
          <div v-else class="gd-empty">该实例没有动态属性</div>
        </div>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { InstanceVO } from '@/api/types/cmdb'
import { formatTimestamp } from '@/utils/time'

const props = defineProps<{
  visible: boolean
  instance: InstanceVO | null
}>()

defineEmits<{ 'update:visible': [value: boolean] }>()

const SOURCE_LABELS: Record<string, string> = { sync: '同步', manual: '手工', import: '导入' }
const sourceLabel = (s: string | undefined) => (s ? (SOURCE_LABELS[s] || s) : '未知')

const fmtTime = (time: number | undefined) => (time ? formatTimestamp(time) : '—')

/** 全量属性键值对；对象/数组序列化为 JSON 字符串展示（仅展示，不执行任何内容） */
const attrEntries = computed<[string, unknown][]>(() => {
  const attrs = props.instance?.attributes
  if (!attrs || typeof attrs !== 'object') return []
  return Object.entries(attrs)
})

const formatAttr = (v: unknown): string => {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') {
    try { return JSON.stringify(v) } catch { return String(v) }
  }
  return String(v)
}
</script>

<style scoped>
.gd-body { display: flex; flex-direction: column; gap: 20px; }
.gd-section { }
.gd-title { font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--border-subtle); }
.gd-rows { display: flex; flex-direction: column; }
.gd-row { display: flex; align-items: flex-start; gap: 12px; padding: 6px 0; font-size: 13px; min-height: 28px; }
.gd-label { width: 110px; flex-shrink: 0; color: var(--text-muted); word-break: break-all; line-height: 1.5; }
.gd-value { flex: 1; color: var(--text-primary); word-break: break-all; line-height: 1.5; }
.gd-attr { font-size: 12px; background: var(--bg-hover, rgba(0,0,0,.04)); padding: 1px 5px; border-radius: 3px; }
.gd-empty { font-size: 13px; color: var(--text-tertiary); }
</style>
