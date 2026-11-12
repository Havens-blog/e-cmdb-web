<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getOrphanSourcesApi, getQualityOverviewApi, listQualityIssuesApi, listSyncIssuesApi, type OrphanModelGroup, type QualityIssue, type QualityOverview, type SyncQualityIssue } from '@/api/quality'
import { CircleCheck, Warning, WarningFilled, Connection, Box, RefreshRight } from '@element-plus/icons-vue'

const loading = ref(false)
const overview = ref<QualityOverview | null>(null)
/** 质量概览加载失败文案（null = 无错误） */
const overviewError = ref<string | null>(null)
const issues = ref<QualityIssue[]>([])
const total = ref(0)

/** 读屏播报文案（iter346）：加载中 → 空/条数，与 models 页同口径 */
const liveStatusText = computed(() => {
  if (loading.value) return '正在加载数据质量…'
  if (total.value === 0) return '暂无质量数据'
  return `共 ${total.value} 条`
})
const activeType = ref<'orphan_instance' | 'missing_field' | 'dangling_relation' | ''>('')


/**
 * 孤儿实例来源（按缺失模型聚合）。
 *
 * 为什么需要：孤儿总数（如 12760）本身不可执行 —— 用户不知道是哪些模型缺失。
 * 实测 tenant 3：12760 条孤儿来自 58 个未定义模型。展示来源后，
 * 用户能直接看出「补 volcengine_disk / volcengine_snapshot 等模型」才是解法。
 */
const orphanGroups = ref<OrphanModelGroup[]>([])
const orphanTotal = ref(0)
const orphanLoading = ref(false)

/** 最大分组数量，用作进度条基准（避免模板里取 orphanGroups[0] 可能为空） */
const orphanMaxCount = computed(() => {
    let m = 0
    for (const g of orphanGroups.value) if (g.count > m) m = g.count
    return m || 1
})

const typeMeta: Record<string, { label: string; color: string; icon: any }> = {
    orphan_instance: { label: '孤儿实例', color: 'var(--accent-red)', icon: Box },
    missing_field: { label: '缺失必填字段', color: 'var(--accent-yellow)', icon: Warning },
    dangling_relation: { label: '悬空关系', color: 'var(--accent-purple)', icon: Connection },
}

const page = ref({ offset: 0, limit: 20 })

/**
 * 同步问题清单（方案 B「记录但不阻断」落库的问题）。
 *
 * 与上面「缺失必填字段」指标卡的区别：
 * - 缺失必填字段 = 全量扫描的**存量**问题（有 60s 缓存）
 * - 同步问题 = 同步链路**增量**实时记录（无缓存、逐条可追溯到 asset/field/type）
 */
const syncIssues = ref<SyncQualityIssue[]>([])
const syncTotal = ref(0)
const syncVisible = ref(false)
const syncLoading = ref(false)
const syncError = ref<string | null>(null)
const syncPage = ref({ offset: 0, limit: 20 })

// ---- URL 同步（iter353，T12）----
//
// 为什么需要它：本页有「问题类型筛选 + 两个独立分页（质量清单 / 同步清单）」，
// 此前**只存在组件内 ref 里**。实测后果：筛好「缺失字段」并翻到第 3 页，
// 刷新 / 切走再回来 → 归零到「全部类型 + 第 1 页」，且无法分享该视图。
//
// 口径与 `views/cmdb/instances/index.vue` 的 `syncStateToUrl` 一致：
//   `replace` 而非 push、只写非默认值、只增删自己的 key、写前比对。
//
// 两个分页用不同前缀区分（`page`/`size` 为质量清单，`spage`/`ssize` 为同步清单），
// 否则两个列表会互相覆盖同一组 query。
const route = useRoute()
const router = useRouter()

function syncStateToUrl(): void {
  const merged: Record<string, string> = {}
  for (const [k, v] of Object.entries(route.query)) {
    if (typeof v === 'string') merged[k] = v
  }
  for (const k of ['type', 'page', 'size', 'spage', 'ssize']) delete merged[k]

  if (activeType.value) merged.type = activeType.value

  const pageNo = Math.floor(page.value.offset / page.value.limit) + 1
  if (pageNo > 1) merged.page = String(pageNo)
  if (page.value.limit !== 20) merged.size = String(page.value.limit)

  const syncPageNo = Math.floor(syncPage.value.offset / syncPage.value.limit) + 1
  if (syncPageNo > 1) merged.spage = String(syncPageNo)
  if (syncPage.value.limit !== 20) merged.ssize = String(syncPage.value.limit)

  const cur = route.query as Record<string, unknown>
  const same =
    Object.keys(merged).length === Object.keys(cur).length &&
    Object.entries(merged).every(([k, v]) => String(cur[k] ?? '') === v)
  if (same) return
  void router.replace({ path: route.path, query: merged })
}

/** 从 URL 恢复视图状态（刷新 / 切回本页 / 打开分享链接都走这里） */
function restoreStateFromUrl(): void {
  const t = route.query.type
  if (t === 'orphan_instance' || t === 'missing_field' || t === 'dangling_relation') {
    activeType.value = t
  }
  const limit = Number(route.query.size)
  if (Number.isFinite(limit) && limit > 0) page.value.limit = Math.floor(limit)
  const pageNo = Number(route.query.page)
  if (Number.isFinite(pageNo) && pageNo >= 1) {
    page.value.offset = (Math.floor(pageNo) - 1) * page.value.limit
  }
  const ssize = Number(route.query.ssize)
  if (Number.isFinite(ssize) && ssize > 0) syncPage.value.limit = Math.floor(ssize)
  const spage = Number(route.query.spage)
  if (Number.isFinite(spage) && spage >= 1) {
    syncPage.value.offset = (Math.floor(spage) - 1) * syncPage.value.limit
  }
}

watch([activeType, page, syncPage], syncStateToUrl, { deep: true })

const SYNC_ISSUE_META: Record<string, { label: string; color: string }> = {
    required: { label: '必填缺失', color: 'var(--accent-red)' },
    enum: { label: '枚举越界', color: 'var(--accent-yellow)' },
    type: { label: '类型不符', color: 'var(--accent-purple)' },
}

const healthColor = computed(() => {
    const s = overview.value?.health_score ?? 100
    if (s >= 90) return 'var(--accent-green)'
    if (s >= 70) return 'var(--accent-yellow)'
    return 'var(--accent-red)'
})

async function loadOverview() {
    loading.value = true
    overviewError.value = null
    try {
        const resp = await getQualityOverviewApi()
        overview.value = resp.data
    } catch (e: any) {
        // 概览是整页的核心指标（健康度/孤儿/缺失/悬空），失败时所有卡片都无值。
        // 仅靠 toast 的话页面会变成一排「0」，用户会误以为「质量很完美」。
        overviewError.value = '质量概览加载失败'
        ElMessage.error(e?.message || '加载质量概览失败')
    } finally {
        loading.value = false
    }
}

async function loadIssues() {
    if (!activeType.value) { issues.value = []; total.value = 0; return }
    loading.value = true
    try {
        const resp = await listQualityIssuesApi({
            type: activeType.value,
            offset: page.value.offset,
            limit: page.value.limit,
        })
        issues.value = resp.data.items
        total.value = resp.data.total
    } catch (e: any) {
        ElMessage.error(e?.message || '加载问题列表失败')
    } finally {
        loading.value = false
    }
}

/** 加载孤儿来源分布（仅孤儿类型需要，惰性加载，结果缓存在组件内） */
async function loadOrphanSources() {
    if (orphanGroups.value.length) return
    orphanLoading.value = true
    try {
        const resp = await getOrphanSourcesApi()
        orphanGroups.value = resp.data.groups || []
        orphanTotal.value = resp.data.total || 0
    } catch (e: any) {
        ElMessage.error(e?.message || '加载孤儿来源失败')
    } finally {
        orphanLoading.value = false
    }
}

function switchType(t: '' | 'orphan_instance' | 'missing_field' | 'dangling_relation') {
    activeType.value = t
    page.value.offset = 0
    loadIssues()
    if (t === 'orphan_instance') loadOrphanSources()
}

/** 切换同步问题清单显隐；首次展开时加载 */
function toggleSyncIssues() {
    syncVisible.value = !syncVisible.value
    if (syncVisible.value) {
        syncPage.value.offset = 0
        loadSyncIssues()
        loadSyncCount()
    }
}

async function loadSyncCount() {
    try {
        const resp = await listSyncIssuesApi({ limit: 1 })
        syncTotal.value = resp.data.total
    } catch {
        // 计数失败不打断其它内容，仅在展开时可见
    }
}

async function loadSyncIssues() {
    syncLoading.value = true
    syncError.value = null
    try {
        const resp = await listSyncIssuesApi({
            offset: syncPage.value.offset,
            limit: syncPage.value.limit,
        })
        syncIssues.value = resp.data.items
        syncTotal.value = resp.data.total
    } catch (e: any) {
        syncError.value = '同步问题清单加载失败'
        ElMessage.error(e?.message || '加载同步问题清单失败')
    } finally {
        syncLoading.value = false
    }
}

const formatSyncTime = (ms: number) => {
    if (!ms) return '—'
    const d = new Date(ms)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

onMounted(() => {
  // 先按 URL 恢复再拉数据（否则先拉默认视图、再因恢复状态拉第二遍，多一次请求且闪一下）
  restoreStateFromUrl()
  loadOverview()
})
</script>

<template>
  <div class="quality" v-loading="loading">
    <!-- 读屏播报（iter346）：本页此前无 live region。LiveStatus 是本仓既有共享组件，
         16 个视图中原先只有 8 个接入，本页被漏掉。 -->
    <LiveStatus :text="liveStatusText" />

    <div class="page-head">
      <div>
        <h1 class="page-title">数据质量</h1>
        <p class="page-subtitle">持续评估配置事实源的完整性与一致性</p>
      </div>
      <el-button class="refresh-btn" :icon="RefreshRight" circle @click="loadOverview" aria-label="刷新概览" />
    </div>

    <!-- 错误态优先于空态：概览失败时所有指标卡都无值，不能只显示空白 -->
    <div v-if="!loading && overviewError" class="quality-overview-error" role="alert">
      <el-icon :size="40"><WarningFilled /></el-icon>
      <p class="quality-error-title">{{ overviewError }}</p>
      <p class="quality-error-desc">请稍后重试；若持续失败请联系管理员</p>
      <el-button size="small" @click="loadOverview">重试</el-button>
    </div>

    <!-- 健康度概览 -->
    <div class="overview-grid" v-else-if="overview">
      <div class="score-card">
        <div class="score-ring" :style="{ borderColor: healthColor, color: healthColor }">
          <span class="score-value">{{ Math.round(overview.health_score) }}</span>
          <span class="score-unit">%</span>
        </div>
        <div class="score-label">健康度评分</div>
      </div>
      <div class="metric-grid">
        <div class="metric-card" @click="switchType('orphan_instance')" :class="{ active: activeType === 'orphan_instance' }">
          <div class="metric-value" style="color: var(--accent-red)">{{ overview.orphan_count }}</div>
          <div class="metric-label">孤儿实例</div>
        </div>
        <div class="metric-card" @click="switchType('missing_field')" :class="{ active: activeType === 'missing_field' }">
          <div class="metric-value" style="color: var(--accent-yellow)">{{ overview.missing_field_count }}</div>
          <div class="metric-label">缺失必填字段</div>
        </div>
        <div class="metric-card" @click="switchType('dangling_relation')" :class="{ active: activeType === 'dangling_relation' }">
          <div class="metric-value" style="color: var(--accent-purple)">{{ overview.dangling_relation_count }}</div>
          <div class="metric-label">悬空关系</div>
        </div>
        <div class="metric-card" @click="toggleSyncIssues" :class="{ active: syncVisible }">
          <div class="metric-value" style="color: var(--accent-orange, #e6a23c)">{{ syncTotal }}</div>
          <div class="metric-label">同步问题</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{{ overview.total_instances }}</div>
          <div class="metric-label">实例总数</div>
        </div>
      </div>
    </div>

    <!--
      孤儿来源：按缺失模型聚合。
      孤儿总数（如 12760）本身不可执行 —— 用户不知道是哪些模型缺失造成的。
      这里直接给出「哪些模型缺失、各多少条」，让数字变成待办。
    -->
    <div v-if="activeType === 'orphan_instance' && orphanGroups.length" class="orphan-source" v-loading="orphanLoading">
      <div class="orphan-source-head">
        <h2 class="section-title">
          孤儿来源
          <span class="orphan-hint">
            共 {{ orphanTotal }} 条孤儿，来自 {{ orphanGroups.length }} 个未定义的模型
          </span>
        </h2>
      </div>
      <div class="orphan-bars">
        <div
          v-for="g in orphanGroups.slice(0, 12)"
          :key="g.model_uid || '__empty__'"
          class="orphan-bar"
        >
          <span class="bar-label" :title="g.model_uid || '(model_uid 为空)'">
            {{ g.model_uid || '(model_uid 为空)' }}
          </span>
          <span class="bar-track">
            <span
              class="bar-fill"
              :style="{ width: Math.max(2, (g.count / orphanMaxCount) * 100) + '%' }"
            />
          </span>
          <span class="bar-count">{{ g.count }}</span>
        </div>
      </div>
      <div v-if="orphanGroups.length > 12" class="orphan-more">
        仅展示前 12 个，其余 {{ orphanGroups.length - 12 }} 个模型合计
        {{ orphanGroups.slice(12).reduce((s, g) => s + g.count, 0) }} 条
      </div>
    </div>

    <!-- 问题列表 -->
    <div class="issues-section">
      <div class="issues-head">
        <h2 class="section-title">
          问题明细
          <span v-if="activeType" class="type-tag" :style="{ color: typeMeta[activeType]?.color }">
            {{ typeMeta[activeType]?.label }}
          </span>
        </h2>
      </div>

      <el-table v-if="activeType" :data="issues" style="width: 100%">
        <el-table-column label="类型" width="140">
          <template #default="{ row }">
            <span :style="{ color: typeMeta[row.type]?.color }">{{ typeMeta[row.type]?.label }}</span>
          </template>
        </el-table-column>
        <el-table-column label="实例名称" min-width="160">
          <template #default="{ row }">{{ row.asset_name || row.asset_id || '—' }}</template>
        </el-table-column>
        <el-table-column prop="model_uid" label="模型" width="140" />
        <el-table-column prop="field_name" label="字段" width="120" />
        <el-table-column prop="description" label="说明" min-width="240" />
      </el-table>

      <div v-if="activeType" class="pagination">
        <el-pagination
          layout="total, prev, pager, next"
          :total="total"
          :page-size="page.limit"
          :current-page="page.offset / page.limit + 1"
          @current-change="(p: number) => { page.offset = (p - 1) * page.limit; loadIssues() }"
        />
      </div>

      <div v-if="!activeType" class="empty-hint">
        <el-icon :size="40"><CircleCheck /></el-icon>
        <p>点击上方指标卡片查看对应问题明细</p>
      </div>
    </div>

    <!-- 同步问题清单（方案 B：记录但不阻断，增量） -->
    <div v-if="syncVisible" class="sync-issues">
      <div class="issues-head">
        <h2 class="section-title">
          同步问题
          <span class="type-tag" style="color: var(--accent-orange, #e6a23c)">
            同步时实时记录，共 {{ syncTotal }} 条
          </span>
        </h2>
      </div>

      <div v-if="syncError" class="sync-empty-error" role="alert">
        <el-icon><WarningFilled /></el-icon>
        <span>{{ syncError }}</span>
        <el-button size="small" @click="loadSyncIssues">重试</el-button>
      </div>

      <el-table v-else v-loading="syncLoading" :data="syncIssues" style="width: 100%">
        <el-table-column label="问题类型" width="130">
          <template #default="{ row }">
            <el-tag size="small" :type="row.issue_type === 'required' ? 'danger' : (row.issue_type === 'enum' ? 'warning' : 'info')">
              {{ SYNC_ISSUE_META[row.issue_type]?.label || row.issue_type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="实例名称" min-width="180">
          <template #default="{ row }">{{ row.asset_name || row.asset_id || '—' }}</template>
        </el-table-column>
        <el-table-column prop="model_uid" label="模型" width="140" />
        <el-table-column prop="field_uid" label="字段" width="150" />
        <el-table-column prop="message" label="说明" min-width="240" show-overflow-tooltip />
        <el-table-column label="最近发现" width="180">
          <template #default="{ row }">
            <span class="sync-time">{{ formatSyncTime(row.last_seen) }}</span>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="syncVisible && !syncError" class="pagination">
        <el-pagination
          layout="total, prev, pager, next"
          :total="syncTotal"
          :page-size="syncPage.limit"
          :current-page="syncPage.offset / syncPage.limit + 1"
          @current-change="(p: number) => { syncPage.offset = (p - 1) * syncPage.limit; loadSyncIssues() }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.quality { max-width: 1100px; }

.page-head { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
.page-title { font-size: 22px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
.page-subtitle { font-size: 13px; color: var(--text-secondary); margin: 0; }
.refresh-btn { margin-left: auto; }

.overview-grid {
  display: flex;
  gap: 20px;
  margin-bottom: 28px;
}

.score-card {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 22px 32px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
}

.score-ring {
  width: 96px; height: 96px;
  border-radius: 50%;
  border: 6px solid;
  display: flex; align-items: center; justify-content: center;
  gap: 2px;
}
.score-value { font-size: 30px; font-weight: 600; line-height: 1; }
.score-unit { font-size: 13px; opacity: 0.7; }
.score-label { font-size: 13px; color: var(--text-secondary); }

.metric-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 16px 18px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover { border-color: var(--border-strong); }
  &.active { border-color: var(--accent-blue); background: rgba(113, 112, 255, 0.08); }
}

.metric-value { font-size: 26px; font-weight: 600; line-height: 1; }
.metric-label { font-size: 12px; color: var(--text-secondary); white-space: nowrap; }

.issues-head { margin-bottom: 12px; }
.section-title { font-size: 15px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 10px; }
.type-tag { font-size: 12px; font-weight: 500; }

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px;
  color: var(--text-tertiary);
  font-size: 14px;
}

.pagination { display: flex; justify-content: flex-end; margin-top: 14px; }

/* ==================== 孤儿来源 ==================== */
.orphan-source {
  margin-top: 16px;
  padding: 16px 20px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
}

.orphan-source-head {
  margin-bottom: 12px;
}

.orphan-hint {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-tertiary);
}

.orphan-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.orphan-bar {
  display: grid;
  grid-template-columns: 180px 1fr 64px;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.bar-label {
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bar-track {
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.bar-fill {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: var(--accent-red);
  opacity: 0.75;
}

.bar-count {
  text-align: right;
  font-weight: 600;
  color: var(--accent-red);
}

.orphan-more {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
}
/* 质量概览错误态：与 models / relations / instances / dns / audit 的既有错误态保持一致 */
.quality-overview-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 32px 16px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
}

.quality-error-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-red, #f56c6c);
}

.quality-error-desc {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--text-tertiary, #909399);
}

/* ==================== 同步问题清单 ==================== */
.sync-issues {
  margin-top: 16px;
  padding: 16px 20px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
}

.sync-time {
  font-size: 12px;
  color: var(--text-tertiary);
}

.sync-empty-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border: 1px dashed var(--accent-orange, #e6a23c);
  border-radius: 8px;
  color: var(--accent-orange, #e6a23c);
}
</style>
