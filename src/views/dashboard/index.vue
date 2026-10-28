<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listCmdbModelsApi, listCmdbInstancesApi, listInstanceRelationsApi } from '@/api'
import { getQualityOverviewApi, type QualityOverview } from '@/api/quality'
import {
    Box, Connection, Grid, Aim, Timer, CircleCheck, ArrowRight
} from '@element-plus/icons-vue'

const router = useRouter()

const loading = ref(true)
const modelCount = ref(0)
const instanceCount = ref(0)
const relationCount = ref(0)
const quality = ref<QualityOverview | null>(null)

const stats = computed(() => [
    { label: '资源模型', value: modelCount.value, icon: Grid, color: 'var(--accent-blue)', path: '/models' },
    { label: '资源实例', value: instanceCount.value, icon: Box, color: 'var(--accent-cyan)', path: '/instances' },
    { label: '实例关系', value: relationCount.value, icon: Connection, color: 'var(--accent-purple)', path: '/relations' },
    { label: '数据健康度', value: quality.value ? `${Math.round(quality.value.health_score)}%` : '—', icon: CircleCheck, color: 'var(--accent-green)', path: '/quality' },
])

const entries = [
    { label: '资源模型', desc: '定义配置项的字段、分组与关系', icon: Grid, path: '/models' },
    { label: '资源实例', desc: '管理配置事实的实例数据', icon: Box, path: '/instances' },
    { label: '模型关系', desc: '定义模型间的拓扑关系类型', icon: Connection, path: '/relations' },
    { label: '影响分析', desc: '评估配置变更的波及范围', icon: Aim, path: '/impact' },
    { label: '变更审计', desc: '追溯每一次配置变更', icon: Timer, path: '/audit' },
    { label: '数据质量', desc: '持续评估数据完整性与一致性', icon: CircleCheck, path: '/quality' },
]

async function load() {
    loading.value = true
    try {
        const [models, instances, relations, q] = await Promise.allSettled([
            listCmdbModelsApi({ limit: 1 }),
            listCmdbInstancesApi({ limit: 1 }),
            listInstanceRelationsApi({ limit: 1 } as any),
            getQualityOverviewApi(),
        ])
        if (models.status === 'fulfilled') modelCount.value = (models.value as any)?.data?.total ?? 0
        if (instances.status === 'fulfilled') instanceCount.value = (instances.value as any)?.data?.total ?? 0
        if (relations.status === 'fulfilled') relationCount.value = (relations.value as any)?.data?.data?.total ?? (relations.value as any)?.data?.total ?? 0
        if (q.status === 'fulfilled') quality.value = (q.value as any)?.data ?? null
    } finally {
        loading.value = false
    }
}

onMounted(load)
</script>

<template>
  <div class="dashboard" v-loading="loading">
    <div class="page-head">
      <h1 class="page-title">仪表盘</h1>
      <p class="page-subtitle">配置数据平台 · 单一事实源</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-grid">
      <div v-for="s in stats" :key="s.label" class="stat-card" @click="router.push(s.path)">
        <div class="stat-icon" :style="{ color: s.color }">
          <el-icon :size="22"><component :is="s.icon" /></el-icon>
        </div>
        <div class="stat-meta">
          <div class="stat-value">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
        <el-icon class="stat-arrow"><ArrowRight /></el-icon>
      </div>
    </div>

    <!-- 快速入口 -->
    <h2 class="section-title">快速入口</h2>
    <div class="entry-grid">
      <div v-for="e in entries" :key="e.label" class="entry-card" @click="router.push(e.path)">
        <div class="entry-icon">
          <el-icon :size="20"><component :is="e.icon" /></el-icon>
        </div>
        <div class="entry-meta">
          <div class="entry-label">{{ e.label }}</div>
          <div class="entry-desc">{{ e.desc }}</div>
        </div>
        <el-icon class="entry-arrow"><ArrowRight /></el-icon>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dashboard { max-width: 1100px; }

.page-head { margin-bottom: 24px; }
.page-title { font-size: 22px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
.page-subtitle { font-size: 13px; color: var(--text-secondary); margin: 0; }

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 28px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover {
    border-color: var(--border-strong);
    background: var(--bg-surface);
    transform: translateY(-1px);
  }
}

.stat-icon {
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  flex-shrink: 0;
}

.stat-value { font-size: 24px; font-weight: 600; line-height: 1; }
.stat-label { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.stat-arrow { color: var(--text-tertiary); margin-left: auto; font-size: 14px; }

.section-title { font-size: 15px; font-weight: 600; margin: 0 0 14px; color: var(--text-primary); }

.entry-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.entry-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover {
    border-color: var(--border-strong);
    background: var(--bg-surface);
  }
}

.entry-icon {
  width: 38px; height: 38px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(113, 112, 255, 0.12);
  color: var(--accent-blue);
  border-radius: 8px;
  flex-shrink: 0;
}

.entry-label { font-size: 14px; font-weight: 500; }
.entry-desc { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.entry-arrow { color: var(--text-tertiary); margin-left: auto; font-size: 13px; }
</style>
