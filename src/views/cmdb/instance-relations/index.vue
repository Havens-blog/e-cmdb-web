<template>
  <div class="instance-relations-page">
    <LiveStatus :text="loading ? '正在加载实例关系…' : (loadError || `共 ${total} 条实例关系`)" />

    <div class="page-head">
      <div>
        <h1 class="page-title">实例关系</h1>
        <p class="page-subtitle">资产实例之间的真实关联（如云服务器挂载的云盘）</p>
      </div>
      <div class="head-actions">
        <el-select
          v-model="relationType"
          class="type-filter"
          placeholder="全部关系类型"
          clearable
          @change="onFilterChange"
        >
          <el-option
            v-for="(label, uid) in RELATION_LABELS"
            :key="uid"
            :label="label"
            :value="uid"
          />
        </el-select>
        <el-button class="refresh-btn" :icon="Refresh" circle @click="load" title="刷新" />
      </div>
    </div>

    <!-- 错误态 -->
    <div v-if="loadError" class="rel-empty-error" role="alert">
      <el-icon><WarningFilled /></el-icon>
      <span>{{ loadError }}</span>
      <el-button size="small" @click="load">重试</el-button>
    </div>

    <el-table
      v-else
      v-loading="loading"
      :data="rows"
      style="width: 100%"
      class="rel-table"
      empty-text="暂无实例关系"
    >
      <el-table-column label="源资产" min-width="260">
        <template #default="{ row }">
          <div class="asset-cell">
            <span class="asset-name">{{ row.source_asset_name || row.source_asset_id || `#${row.source_instance_id}` }}</span>
            <span class="asset-meta">{{ row.source_model_uid }} · {{ row.source_asset_id || row.source_instance_id }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="关系" width="170">
        <template #default="{ row }">
          <el-tag size="small" type="primary" effect="plain">{{ relationLabel(row.relation_type_uid) }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="目标资产" min-width="260">
        <template #default="{ row }">
          <div class="asset-cell">
            <span class="asset-name">{{ row.target_asset_name || row.target_asset_id || `#${row.target_instance_id}` }}</span>
            <span class="asset-meta">{{ row.target_model_uid }} · {{ row.target_asset_id || row.target_instance_id }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">
          <span class="time-text">{{ formatTime(row.create_time) }}</span>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="!loadError" class="pager">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="size"
        :total="total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @current-change="load"
        @size-change="onSizeChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useLatestRequest } from '@/composables/useLatestRequest'
import { Refresh, WarningFilled } from '@element-plus/icons-vue'
import { listInstanceRelationsApi } from '@/api'
import type { InstanceRelationVO } from '@/api/types/cmdb.generated'
import LiveStatus from '@/components/LiveStatus.vue'

const rows = ref<InstanceRelationVO[]>([])
const total = ref(0)
const loading = ref(false)
const loadError = ref<string | null>(null)
const page = ref(1)
const size = ref(20)

// 列表请求竞态守卫（iter284）：翻页连点时只认最后一次请求的结果
const latestRequest = useLatestRequest()
// 关系类型筛选（空 = 全部）
const relationType = ref('')

/**
 * 关系类型 UID → 中文。当前库中仅有 ecs_disk 一种实例关系；
 * 未收录的类型回退显示原始 UID，避免出现空白。
 */
const RELATION_LABELS: Record<string, string> = {
  ecs_disk: '云服务器挂载云盘',
}
const relationLabel = (uid: string) => RELATION_LABELS[uid] || uid

const formatTime = (ms: number) => {
  if (!ms) return '—'
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const load = async () => {
  // 竞态守卫（iter284）：翻页连点时，第 2 页的慢响应会晚于第 3 页返回，
  // 若不判断就会把列表覆盖回第 2 页的数据 —— 表现为「页码是 3、数据是第 2 页」。
  const seq = latestRequest.begin()
  loading.value = true
  loadError.value = null
  try {
    const params: Record<string, any> = {
      offset: (page.value - 1) * size.value,
      limit: size.value,
    }
    if (relationType.value) params.relation_type_uid = relationType.value
    const res = await listInstanceRelationsApi(params)
    const data = res.data?.data || res.data
    // 已有更新的请求发出：本次结果作废，不写任何状态（含 loading，交给最新那次收尾）
    if (!latestRequest.isCurrent(seq)) return
    rows.value = data?.relations || []
    total.value = data?.total || 0
  } catch (error) {
    if (!latestRequest.isCurrent(seq)) return
    console.error('加载实例关系失败:', error)
    loadError.value = '实例关系加载失败'
  } finally {
    if (latestRequest.isCurrent(seq)) loading.value = false
  }
}

const onSizeChange = () => {
  page.value = 1
  load()
}

const onFilterChange = () => {
  page.value = 1
  load()
}

onMounted(() => {
  load()
})
// 卸载时作废在途请求，避免组件已销毁还写状态
onUnmounted(() => latestRequest.reset())

</script>

<style scoped>
.instance-relations-page {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.type-filter {
  width: 200px;
}

.page-title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.page-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.refresh-btn {
  flex: 0 0 auto;
}

.rel-table {
  flex: 1 1 auto;
}

.asset-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.asset-name {
  font-weight: 500;
  color: var(--text-primary);
  word-break: break-all;
}

.asset-meta {
  font-size: 12px;
  color: var(--text-tertiary);
  word-break: break-all;
}

.time-text {
  font-size: 13px;
  color: var(--text-regular);
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}

.rel-empty-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px dashed var(--el-color-danger);
  border-radius: 8px;
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}
</style>
