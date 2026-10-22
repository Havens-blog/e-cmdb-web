<script setup lang="ts">
// 模型别名映射管理抽屉：别名（多云同步写入的 model_uid）→ CMDB 模型。
// 支持列表/新增/删除/存量迁移。
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, RefreshRight } from '@element-plus/icons-vue'
import { listModelAliasesApi, createModelAliasApi, deleteModelAliasApi, migrateModelAliasesApi, type ModelAlias, type AliasMigrationResp } from '@/api/model-alias'
import { listCmdbModelsApi } from '@/api'

const visible = defineModel<boolean>('visible', { default: false })
const emit = defineEmits<{ (e: 'migrated'): void }>()

const loading = ref(false)
const aliases = ref<ModelAlias[]>([])
const modelOptions = ref<Array<{ uid: string; name: string }>>([])
const migrating = ref(false)
const migrateResult = ref<AliasMigrationResp | null>(null)

const form = ref({ alias_uid: '', model_uid: '' })

const sourceLabel = (s: string) => (s === 'manual' ? '手动' : '内置')

async function load() {
    loading.value = true
    try {
        const [aliasResp, modelResp] = await Promise.allSettled([
            listModelAliasesApi(),
            listCmdbModelsApi({ limit: 200 } as any),
        ])
        if (aliasResp.status === 'fulfilled') aliases.value = aliasResp.value.data || []
        if (modelResp.status === 'fulfilled') {
            const d = (modelResp.value as any)?.data
            modelOptions.value = d?.data?.models || d?.models || d?.list || []
        }
    } catch (e: any) {
        ElMessage.error(e?.message || '加载别名映射失败')
    } finally {
        loading.value = false
    }
}

watch(visible, v => { if (v) { load(); migrateResult.value = null } })

async function handleAdd() {
    if (!form.value.alias_uid || !form.value.model_uid) {
        ElMessage.warning('请填写别名与目标模型')
        return
    }
    try {
        await createModelAliasApi(form.value.alias_uid, form.value.model_uid)
        ElMessage.success('映射已添加')
        form.value = { alias_uid: '', model_uid: '' }
        await load()
    } catch (e: any) {
        ElMessage.error(e?.message || '添加失败')
    }
}

async function handleDelete(row: ModelAlias) {
    try {
        await ElMessageBox.confirm(`删除映射「${row.alias_uid} → ${row.model_uid}」？删除后同步写入将恢复为孤儿实例。`, '删除映射', { type: 'warning' })
        await deleteModelAliasApi(row.alias_uid)
        ElMessage.success('已删除')
        await load()
    } catch { /* 取消 */ }
}

async function handleMigrate() {
    try {
        await ElMessageBox.confirm('按映射批量改写存量实例的 model_uid（目标已存在同资产的副本会被删除）？', '执行存量迁移', { type: 'warning' })
    } catch { return }
    migrating.value = true
    try {
        const resp = await migrateModelAliasesApi()
        migrateResult.value = resp.data
        if (resp.data?.total > 0 || resp.data?.removed_total > 0) {
            ElMessage.success(`迁移完成：改写 ${resp.data.total} 条，删除冲突副本 ${resp.data.removed_total} 条`)
        } else {
            ElMessage.info('没有需要迁移的实例')
        }
        emit('migrated')
    } catch (e: any) {
        ElMessage.error(e?.message || '迁移失败')
    } finally {
        migrating.value = false
    }
}

const totalMigrated = computed(() => migrateResult.value ? `${migrateResult.value.total} 条改写 / ${migrateResult.value.removed_total} 条副本删除` : '')
</script>

<template>
  <el-drawer v-model="visible" title="模型别名映射" size="640px">
    <div class="alias-drawer" v-loading="loading">
      <p class="drawer-tip">
        多云同步写入实例的 model_uid 由「云厂商_资源类型」拼接（如 volcengine_ecs），
        与 CMDB 模型命名空间不一致。映射表把同步侧别名归一到 CMDB 模型，从源头消除孤儿实例。
      </p>

      <!-- 存量迁移 -->
      <div class="migrate-bar">
        <el-button type="warning" :icon="RefreshRight" :loading="migrating" @click="handleMigrate">
          执行存量迁移
        </el-button>
        <span v-if="migrateResult" class="migrate-result">{{ totalMigrated }}</span>
      </div>

      <!-- 新增映射 -->
      <div class="add-bar">
        <el-input v-model="form.alias_uid" placeholder="别名（如 aliyun_ecs）" class="alias-input" />
        <span class="arrow">→</span>
        <el-select v-model="form.model_uid" filterable placeholder="目标模型" class="model-select">
          <el-option v-for="m in modelOptions" :key="m.uid" :value="m.uid" :label="`${m.name} (${m.uid})`" />
        </el-select>
        <el-button type="primary" @click="handleAdd">添加</el-button>
      </div>

      <!-- 映射列表 -->
      <el-table :data="aliases" size="small" max-height="460">
        <el-table-column prop="alias_uid" label="别名（同步侧）" min-width="180" show-overflow-tooltip />
        <el-table-column prop="model_uid" label="CMDB 模型" min-width="150" show-overflow-tooltip />
        <el-table-column label="来源" width="70">
          <template #default="{ row }">
            <el-tag size="small" :type="row.source === 'manual' ? 'primary' : 'info'">{{ sourceLabel(row.source) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="" width="60" align="center">
          <template #default="{ row }">
            <el-button text type="danger" size="small" :icon="Delete" @click="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
    </div>
  </el-drawer>
</template>

<style scoped lang="scss">
.alias-drawer { display: flex; flex-direction: column; gap: 14px; }

.drawer-tip {
  font-size: 12.5px;
  color: var(--text-tertiary);
  line-height: 1.6;
  margin: 0;
  padding: 10px 12px;
  background: rgba(113, 112, 255, 0.06);
  border-radius: 8px;
}

.migrate-bar { display: flex; align-items: center; gap: 12px; }
.migrate-result { font-size: 13px; color: var(--accent-green); }

.add-bar { display: flex; align-items: center; gap: 10px; }
.alias-input { flex: 1; }
.arrow { color: var(--text-tertiary); }
.model-select { flex: 1.2; }
</style>
