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

/**
 * 各统计项的加载失败标记（局部降级用）。
 *
 * 仪表盘 4 个卡片各自独立请求，任一失败时**不能整页报错**（其余卡片仍然有效），
 * 也**不能显示 0**（那是错误数据）。故失败项显示「—」并在悬停提示中说明。
 */
const modelFailed = ref(false)
const instanceFailed = ref(false)
const relationFailed = ref(false)
const qualityFailed = ref(false)

const stats = computed(() => [
    {
        label: '资源模型',
        value: modelFailed.value ? '—' : modelCount.value,
        failed: modelFailed.value,
        tip: modelFailed.value ? '资源模型数量加载失败' : '',
        icon: Grid, color: 'var(--accent-blue)', path: '/models',
    },
    {
        label: '资源实例',
        value: instanceFailed.value ? '—' : instanceCount.value,
        failed: instanceFailed.value,
        tip: instanceFailed.value ? '资源实例数量加载失败' : '',
        icon: Box, color: 'var(--accent-cyan)', path: '/instances',
    },
    {
        label: '实例关系',
        value: relationFailed.value ? '—' : relationCount.value,
        failed: relationFailed.value,
        tip: relationFailed.value ? '实例关系数量加载失败' : '',
        icon: Connection, color: 'var(--accent-purple)', path: '/relations',
    },
    {
        label: '数据健康度',
        value: qualityFailed.value ? '—' : (quality.value ? `${Math.round(quality.value.health_score)}%` : '—'),
        failed: qualityFailed.value,
        tip: qualityFailed.value ? '数据健康度加载失败' : '',
        icon: CircleCheck, color: 'var(--accent-green)', path: '/quality',
    },
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
    // 每项独立标记加载失败，用于卡片局部降级（显示「—」而不是错误的 0）
    modelFailed.value = false
    instanceFailed.value = false
    relationFailed.value = false
    qualityFailed.value = false
    try {
        const [models, instances, relations, q] = await Promise.allSettled([
            listCmdbModelsApi({ limit: 1 }),
            listCmdbInstancesApi({ limit: 1 }),
            listInstanceRelationsApi({ limit: 1 } as any),
            getQualityOverviewApi(),
        ])
        // allSettled 保证单项失败不影响其它卡片，但**必须显式标记失败项**。
        // 原实现在失败分支什么都不做，卡片停留在初始值 0，
        // 用户看到「0 资源模型 / 0 资源实例」——这是错误数据，比不显示更糟。
        if (models.status === 'fulfilled') {
            modelCount.value = (models.value as any)?.data?.total ?? 0
        } else {
            modelFailed.value = true
        }
        if (instances.status === 'fulfilled') {
            instanceCount.value = (instances.value as any)?.data?.total ?? 0
        } else {
            instanceFailed.value = true
        }
        if (relations.status === 'fulfilled') {
            relationCount.value = (relations.value as any)?.data?.data?.total ?? (relations.value as any)?.data?.total ?? 0
        } else {
            relationFailed.value = true
        }
        if (q.status === 'fulfilled') {
            quality.value = (q.value as any)?.data ?? null
        } else {
            qualityFailed.value = true
        }
    } finally {
        loading.value = false
    }
}

onMounted(load)
</script>

<template>
  <div class="dashboard" v-loading="loading">
    <!-- 读屏加载播报（v-loading 无 live region） -->
    <LiveStatus :text="loading ? '正在加载概览数据…' : '概览数据已加载'" />
    <div class="page-head">
      <h1 class="page-title">仪表盘</h1>
      <p class="page-subtitle">配置数据平台 · 单一事实源</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-grid">
      <div
        v-for="s in stats"
        :key="s.label"
        class="stat-card"
        :class="{ 'stat-card--failed': s.failed }"
        :title="s.tip || undefined"
        @click="router.push(s.path)"
      >
        <div class="stat-icon" :style="{ color: s.color }">
          <el-icon :size="22"><component :is="s.icon" /></el-icon>
        </div>
        <div class="stat-meta">
          <div class="stat-value">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
          <!-- 局部降级：单项加载失败时明确告知，而不是显示错误的 0 -->
          <div v-if="s.failed" class="stat-failed-hint">加载失败</div>
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

/* 统计卡片局部降级：单项加载失败时用虚线边框 + 提示文字区分，数值显示「—」 */
.stat-card--failed {
  border-style: dashed;
  border-color: rgba(245, 108, 108, 0.45);

  .stat-value {
    color: var(--text-tertiary, #909399);
  }
}

.stat-failed-hint {
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.2;
  color: var(--accent-red, #f56c6c);
}</style>
