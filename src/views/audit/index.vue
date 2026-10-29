<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { listChangesApi, getChangeSummaryApi, type ChangeRecord, type ChangeSummary } from '@/api/audit'
import { formatTimestamp } from '@/utils/time'
import { Search, Timer, RefreshRight } from '@element-plus/icons-vue'

const loading = ref(false)
const records = ref<ChangeRecord[]>([])
const total = ref(0)
const summary = ref<ChangeSummary | null>(null)
const summaryLoading = ref(false)
const summaryFailed = ref(false)

const query = ref({
    asset_id: '',
    field_name: '',
    timeRange: null as [Date, Date] | null,
})
const page = ref({ offset: 0, limit: 20 })

// 顶部统计：按云厂商分布 Top（真实 ChangeSummary.by_provider）
const providerStats = ref<Array<{ name: string; count: number }>>([])

async function load() {
    loading.value = true
    try {
        const params: Record<string, unknown> = {
            offset: page.value.offset,
            limit: page.value.limit,
        }
        if (query.value.asset_id.trim()) params.asset_id = query.value.asset_id.trim()
        if (query.value.field_name.trim()) params.field_name = query.value.field_name.trim()
        if (query.value.timeRange) {
            // 上游契约：Unix 毫秒
            params.start_time = query.value.timeRange[0].getTime()
            params.end_time = query.value.timeRange[1].getTime()
        }
        // 列表与统计解耦：统计接口后端需对 540 万条变更记录做全量聚合，
        // 实测极慢且常失败（详见 getChangeSummaryApi 注释）。若与列表一起 await，
        // 整个页面会被拖住数分钟。故列表先渲染，统计单独异步补上。
        await Promise.allSettled([
            loadList(params),
            loadSummary(),
        ])
    } catch (e: any) {
        ElMessage.error(e?.message || '加载变更审计失败')
    } finally {
        loading.value = false
    }
}

async function loadList(params: Record<string, unknown>) {
    try {
        const resp = await listChangesApi(params as any)
        records.value = resp.data.items
        total.value = resp.data.total
    } catch (e: any) {
        ElMessage.error(e?.message || '加载变更列表失败')
    }
}

async function loadSummary() {
    summaryLoading.value = true
    try {
        const resp = await getChangeSummaryApi({})
        summary.value = resp.data
        providerStats.value = Object.entries(summary.value.by_provider || {})
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
        summaryFailed.value = false
    } catch {
        // 统计属增强信息，失败不影响列表查阅：静默降级，由模板给出占位提示
        summary.value = null
        providerStats.value = []
        summaryFailed.value = true
    } finally {
        summaryLoading.value = false
    }
}

function search() {
    page.value.offset = 0
    load()
}

/** 旧值/新值为 JSON 序列化字符串：解析后紧凑展示 */
function fmtValue(raw?: string): string {
    if (raw === null || raw === undefined || raw === '') return '—'
    try {
        const parsed = JSON.parse(raw)
        if (typeof parsed === 'object' && parsed !== null) return JSON.stringify(parsed)
        return String(parsed)
    } catch {
        return String(raw)
    }
}

// 统一走共享格式化（补零 + 时分），与其它页口径一致；
// 原实现 toLocaleString() 依赖运行环境 locale，输出形如 "2026/1/20 17:01:00"（不补零、带秒），
// 且空值占位是 '—'，与其它页的 '-' 不一致。
function fmtTime(ms?: number): string {
    return formatTimestamp(ms)
}

const truncate = (s: string, n = 42) => (s.length > n ? s.slice(0, n) + '…' : s)

onMounted(load)
</script>

<template>
  <div class="audit" v-loading="loading">
    <div class="page-head">
      <div>
        <h1 class="page-title">变更审计</h1>
        <p class="page-subtitle">追溯每一次配置变更（复用 e-cam-service 审计能力）</p>
      </div>
      <el-button class="refresh-btn" :icon="RefreshRight" circle @click="load" />
    </div>

    <!-- 汇总：总数 + 云厂商分布。统计失败不影响列表使用，给出明确占位而非静默消失 -->
    <div class="summary-bar" v-if="summary">
      <div class="summary-item">
        <span class="s-num">{{ summary.total ?? 0 }}</span>
        <span class="s-label">变更记录总数</span>
      </div>
      <div v-for="p in providerStats" :key="p.name" class="summary-item">
        <span class="s-num small">{{ p.count }}</span>
        <span class="s-label">{{ p.name }}</span>
      </div>
    </div>
    <div class="summary-bar summary-placeholder" v-else-if="summaryLoading">
      <span class="s-label">正在统计变更汇总…</span>
    </div>
    <div class="summary-bar summary-placeholder" v-else-if="summaryFailed">
      <span class="s-label">统计汇总暂不可用（数据量较大，后端聚合超时），列表数据不受影响</span>
    </div>

    <!-- 查询 -->
    <div class="query-bar">
      <el-input v-model="query.asset_id" placeholder="资产 ID" class="q-input" :prefix-icon="Search" clearable @keyup.enter="search" />
      <el-input v-model="query.field_name" placeholder="字段名" class="q-input" clearable @keyup.enter="search" />
      <el-date-picker
        v-model="query.timeRange"
        type="datetimerange"
        start-placeholder="开始时间"
        end-placeholder="结束时间"
        value-format="x"
        class="q-range"
      />
      <el-button type="primary" :icon="Search" @click="search">查询</el-button>
    </div>

    <!-- 变更记录表 -->
    <el-table :data="records" style="width: 100%">
      <el-table-column label="时间" width="170">
        <template #default="{ row }">{{ fmtTime(row.ctime) }}</template>
      </el-table-column>
      <el-table-column label="资产" min-width="170" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="asset-cell">
            <span>{{ row.asset_name || '—' }}</span>
            <code class="asset-id">{{ row.asset_id }}</code>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="model_uid" label="模型" width="120" show-overflow-tooltip />
      <el-table-column prop="field_name" label="字段" width="130" show-overflow-tooltip />
      <el-table-column label="旧值 → 新值" min-width="260">
        <template #default="{ row }">
          <div class="diff-cell">
            <code class="val old">{{ truncate(fmtValue(row.old_value)) }}</code>
            <span class="arrow">→</span>
            <code class="val new">{{ truncate(fmtValue(row.new_value)) }}</code>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="change_source" label="来源" width="110" show-overflow-tooltip />
      <el-table-column label="云厂商 / 区域" width="150">
        <template #default="{ row }">
          <span v-if="row.provider || row.region">{{ [row.provider, row.region].filter(Boolean).join(' / ') }}</span>
          <span v-else>—</span>
        </template>
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
      <p>暂无变更记录（可输入资产 ID 精确查询）</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.audit { max-width: 1200px; }

.page-head { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
.page-title { font-size: 22px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
.page-subtitle { font-size: 13px; color: var(--text-secondary); margin: 0; }
.refresh-btn { margin-left: auto; }

.summary-bar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
/* 统计不可用/加载中的占位：低调呈现，避免与真实统计混淆 */
.summary-placeholder { align-items: center; color: var(--text-secondary); font-size: 12.5px; }
.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 18px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  min-width: 100px;
}
.s-num { font-size: 22px; font-weight: 600; color: var(--accent-blue);
  &.small { font-size: 18px; color: var(--text-primary); }
}
.s-label { font-size: 11px; color: var(--text-tertiary); }

.query-bar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.q-input { width: 220px; }
.q-range { max-width: 380px; }

.asset-cell { display: flex; flex-direction: column; gap: 2px; }
.asset-id { font-size: 11px; color: var(--text-tertiary); font-family: var(--font-mono); }

.diff-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  .arrow { color: var(--text-tertiary); }
}
.val {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: var(--font-mono);
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
