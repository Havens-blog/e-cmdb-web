<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { listChangesApi, getChangeSummaryApi, type ChangeRecord, type ChangeSummary } from '@/api/audit'
import { formatTimestamp } from '@/utils/time'
import { Search, Timer, RefreshRight, WarningFilled } from '@element-plus/icons-vue'

const loading = ref(false)
const records = ref<ChangeRecord[]>([])
const total = ref(0)
/** 后端 total 返回 -1 表示「总数统计超时、不可用」，此时不显示分页器并给出提示 */
const totalUnknown = ref(false)
/** 变更列表加载失败文案（null = 无错误）。与 models / relations / instances / dns 的既有错误态一致 */
const listError = ref<string | null>(null)
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
    listError.value = null
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
        // total = -1 表示后端「统计总数超时，无法给出准确值」。
        //
        // 背景（实测 2026-10-31）：ecam_change_history 有 540 万条，
        // 按 field_name 筛选时该字段无索引，CountDocuments 全表扫需 >30 秒
        // 乃至 Mongo 断连导致接口 500。后端已改为：列表数据照常返回，total 返回 -1。
        // 此处归一为 0 让分页器隐藏（其 v-if="total > 0"），
        // 同时用 totalUnknown 标记，在页面上明确提示，而不是静默隐藏分页。
        totalUnknown.value = resp.data.total < 0
        total.value = resp.data.total > 0 ? resp.data.total : 0
    } catch (e: any) {
        // 列表是该页核心：加载失败时若只弹 toast，页面会只剩「暂无变更记录」，
        // 用户无法区分「接口故障」与「真的没有变更」，也没有重试入口。
        listError.value = '变更列表加载失败'
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

    <div v-if="totalUnknown" class="total-unknown-tip">
      当前筛选下无法统计总条数（数据量过大、聚合超时），列表数据不受影响
    </div>

    <div v-if="total > 0" class="pagination">
      <el-pagination
        layout="total, prev, pager, next"
        :total="total"
        :page-size="page.limit"
        :current-page="page.offset / page.limit + 1"
        @current-change="(p: number) => { page.offset = (p - 1) * page.limit; load() }"
      />
    </div>

    <!-- 错误态优先于空态：加载失败时若只显示「暂无变更记录」，会误判为「真的没有变更」 -->
    <div v-if="!loading && listError" class="audit-empty-error" role="alert">
      <el-icon :size="40"><WarningFilled /></el-icon>
      <p class="audit-error-title">{{ listError }}</p>
      <p class="audit-error-desc">请稍后重试；若持续失败请联系管理员</p>
      <el-button size="small" @click="load()">重试</el-button>
    </div>

    <div v-else-if="!loading && records.length === 0" class="empty-hint">
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

.total-unknown-tip {
  margin: 8px 0 4px;
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 6px;
  color: var(--accent-yellow, #e6a23c);
  background: rgba(230, 162, 60, 0.1);
  border: 1px solid rgba(230, 162, 60, 0.25);
}
/* 变更列表错误态：与 models / relations / instances / dns 的既有错误态保持一致 */
.audit-empty-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 32px 16px;
}

.audit-error-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-red, #f56c6c);
}

.audit-error-desc {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--text-tertiary, #909399);
}</style>
