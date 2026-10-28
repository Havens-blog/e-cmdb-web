<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getQualityOverviewApi, listQualityIssuesApi, type QualityIssue, type QualityOverview } from '@/api/quality'
import { CircleCheck, Warning, Connection, Box, RefreshRight } from '@element-plus/icons-vue'

const loading = ref(false)
const overview = ref<QualityOverview | null>(null)
const issues = ref<QualityIssue[]>([])
const total = ref(0)
const activeType = ref<'orphan_instance' | 'missing_field' | 'dangling_relation' | ''>('')

const typeMeta: Record<string, { label: string; color: string; icon: any }> = {
    orphan_instance: { label: '孤儿实例', color: 'var(--accent-red)', icon: Box },
    missing_field: { label: '缺失必填字段', color: 'var(--accent-yellow)', icon: Warning },
    dangling_relation: { label: '悬空关系', color: 'var(--accent-purple)', icon: Connection },
}

const page = ref({ offset: 0, limit: 20 })

const healthColor = computed(() => {
    const s = overview.value?.health_score ?? 100
    if (s >= 90) return 'var(--accent-green)'
    if (s >= 70) return 'var(--accent-yellow)'
    return 'var(--accent-red)'
})

async function loadOverview() {
    loading.value = true
    try {
        const resp = await getQualityOverviewApi()
        overview.value = resp.data
    } catch (e: any) {
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

function switchType(t: '' | 'orphan_instance' | 'missing_field' | 'dangling_relation') {
    activeType.value = t
    page.value.offset = 0
    loadIssues()
}

onMounted(() => { loadOverview() })
</script>

<template>
  <div class="quality" v-loading="loading">
    <div class="page-head">
      <div>
        <h1 class="page-title">数据质量</h1>
        <p class="page-subtitle">持续评估配置事实源的完整性与一致性</p>
      </div>
      <el-button class="refresh-btn" :icon="RefreshRight" circle @click="loadOverview" />
    </div>

    <!-- 健康度概览 -->
    <div class="overview-grid" v-if="overview">
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
        <div class="metric-card">
          <div class="metric-value">{{ overview.total_instances }}</div>
          <div class="metric-label">实例总数</div>
        </div>
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
.metric-label { font-size: 12px; color: var(--text-secondary); }

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
</style>
