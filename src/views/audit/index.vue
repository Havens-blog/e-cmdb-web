<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { listChangesApi, getChangeSummaryApi, type ChangeRecord, type ChangeSummary } from '@/api/audit'
import { Search, Timer, RefreshRight } from '@element-plus/icons-vue'

const loading = ref(false)
const records = ref<ChangeRecord[]>([])
const total = ref(0)
const summary = ref<ChangeSummary | null>(null)

const query = ref({
    asset_id: '',
    field_name: '',
    start_time: undefined as number | undefined,
    end_time: undefined as number | undefined,
})
const page = ref({ offset: 0, limit: 20 })

async function load() {
    loading.value = true
    try {
        const [listResp, summaryResp] = await Promise.allSettled([
            listChangesApi({ ...query.value, offset: page.value.offset, limit: page.value.limit }),
            getChangeSummaryApi({}),
        ])
        if (listResp.status === 'fulfilled') {
            records.value = listResp.value.data.items
            total.value = listResp.value.data.total
        }
        if (summaryResp.status === 'fulfilled') {
            summary.value = summaryResp.value.data
        }
    } catch (e: any) {
        ElMessage.error(e?.message || '加载变更审计失败')
    } finally {
        loading.value = false
    }
}

function search() {
    page.value.offset = 0
    load()
}

function fmt(v: any): string {
    if (v === null || v === undefined) return '—'
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
}

onMounted(load)
</script>

<template>
  <div class="audit" v-loading="loading">
    <div class="page-head">
      <h1 class="page-title">变更审计</h1>
      <p class="page-subtitle">追溯每一次配置变更（复用 e-cam-service 审计能力）</p>
      <el-button class="refresh-btn" :icon="RefreshRight" circle @click="load" />
    </div>

    <!-- 变更汇总 -->
    <div v-if="summary" class="summary-bar">
      <div class="summary-item"><span class="s-num">{{ summary.total ?? 0 }}</span><span class="s-label">变更记录总数</span></div>
    </div>

    <!-- 查询 -->
    <div class="query-bar">
      <el-input v-model="query.asset_id" placeholder="资产 ID" class="q-input" :prefix-icon="Search" clearable />
      <el-input v-model="query.field_name" placeholder="字段名" class="q-input" clearable />
      <el-button type="primary" :icon="Search" @click="search">查询</el-button>
    </div>

    <!-- 变更记录表 -->
    <el-table :data="records" style="width: 100%">
      <el-table-column prop="asset_id" label="资产 ID" min-width="160" />
      <el-table-column prop="field_name" label="字段" width="140" />
      <el-table-column label="旧值" min-width="160">
        <template #default="{ row }"><code class="val old">{{ fmt(row.old_value) }}</code></template>
      </el-table-column>
      <el-table-column label="新值" min-width="160">
        <template #default="{ row }"><code class="val new">{{ fmt(row.new_value) }}</code></template>
      </el-table-column>
      <el-table-column prop="change_source" label="来源" width="120" />
      <el-table-column prop="operator" label="操作人" width="120" />
      <el-table-column label="时间" width="180">
        <template #default="{ row }">{{ row.create_time ? new Date(row.create_time).toLocaleString() : '—' }}</template>
      </el-table-column>
    </el-table>

    <div v-if="total > 0" class="pagination">
      <el-pagination
        layout="total, prev, pager, next"
        :total="total"
        :page-size="page.limit"
        :current-page="page.offset / page.limit + 1"
        @current-change="(p: number) => { page.offset = (p - 1) * page.limit; load() }"
      />
    </div>

    <div v-if="!loading && records.length === 0" class="empty-hint">
      <el-icon :size="40"><Timer /></el-icon>
      <p>暂无变更记录</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.audit { max-width: 1200px; }

.page-head { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.page-title { font-size: 22px; font-weight: 600; margin: 0; letter-spacing: -0.01em; }
.page-subtitle { font-size: 13px; color: var(--text-tertiary); margin: 0; flex: 1; }
.refresh-btn { margin-left: auto; }

.summary-bar { display: flex; margin-bottom: 16px; }
.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
}
.s-num { font-size: 22px; font-weight: 600; color: var(--accent-blue); }
.s-label { font-size: 12px; color: var(--text-tertiary); }

.query-bar { display: flex; gap: 12px; margin-bottom: 16px; }
.q-input { width: 240px; }

.val {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  &.old { background: rgba(239, 68, 68, 0.12); color: var(--accent-red); }
  &.new { background: rgba(16, 185, 129, 0.12); color: var(--accent-green); }
}

.pagination { display: flex; justify-content: flex-end; margin-top: 14px; }

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px;
  color: var(--text-tertiary);
  font-size: 14px;
}
</style>
