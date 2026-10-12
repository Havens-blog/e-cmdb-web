<script setup lang="ts">
// 发现同步：多云发现/同步能力已由 e-cam-service 实现（cert 域 discovery import 编排，
// 含 scan→enumerate→import→失败隔离）。CMDB 作为整合层复用该能力，此处提供来源
// 概览与入口，不重复实现同步逻辑。
import { Cloudy, Monitor, Upload, Document, ArrowRight } from '@element-plus/icons-vue'

const sources = [
    {
        key: 'cloud_api',
        label: '多云 API 发现',
        desc: 'AWS / 阿里云 / 腾讯云 / 火山引擎等云厂商 API 同步（复用 e-cam-service 编排）',
        icon: Cloudy,
        color: 'var(--accent-blue)',
        status: '已复用',
    },
    {
        key: 'agent',
        label: 'Agent 采集',
        desc: '主机内 Agent 上报资源与配置（复用 e-cam-service 采集能力）',
        icon: Monitor,
        color: 'var(--accent-cyan)',
        status: '已复用',
    },
    {
        key: 'declaration',
        label: '声明式导入',
        desc: 'YAML/JSON 声明文件批量导入拓扑与关系',
        icon: Upload,
        color: 'var(--accent-purple)',
        status: '规划中',
    },
    {
        key: 'excel',
        label: 'Excel 导入',
        desc: '表格批量导入实例与属性',
        icon: Document,
        color: 'var(--accent-green)',
        status: '规划中',
    },
]
</script>

<template>
  <div class="discovery">
    <div class="page-head">
      <h1 class="page-title">发现同步</h1>
      <p class="page-subtitle">配置数据的自动发现与同步来源</p>
    </div>

    <div class="notice">
      <div class="notice-title">多云同步已实现</div>
      <p class="notice-body">
        多云发现/同步编排能力已由 e-cam-service 实现（scan → enumerate → import → 失败隔离），
        CMDB 作为整合层复用该能力，不在此重复造轮子。
      </p>
    </div>

    <div class="source-grid">
      <div v-for="s in sources" :key="s.key" class="source-card">
        <div class="source-icon" :style="{ color: s.color }">
          <el-icon :size="22"><component :is="s.icon" /></el-icon>
        </div>
        <div class="source-meta">
          <div class="source-head">
            <span class="source-label">{{ s.label }}</span>
            <span class="source-status" :class="{ reused: s.status === '已复用' }">{{ s.status }}</span>
          </div>
          <p class="source-desc">{{ s.desc }}</p>
        </div>
        <el-icon class="source-arrow"><ArrowRight /></el-icon>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.discovery { max-width: 900px; }

.page-head { margin-bottom: 24px; }
.page-title { font-size: 22px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
.page-subtitle { font-size: 13px; color: var(--text-tertiary); margin: 0; }

.notice {
  padding: 16px 20px;
  background: rgba(113, 112, 255, 0.06);
  border: 1px solid rgba(113, 112, 255, 0.2);
  border-radius: 10px;
  margin-bottom: 20px;
}
.notice-title { font-size: 14px; font-weight: 600; color: var(--accent-blue); margin-bottom: 6px; }
.notice-body { font-size: 13px; color: var(--text-secondary); margin: 0; line-height: 1.6; }

.source-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.source-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  transition: all 150ms ease;

  &:hover { border-color: var(--border-strong); }
}

.source-icon {
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  flex-shrink: 0;
}

.source-meta { flex: 1; }
.source-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.source-label { font-size: 14px; font-weight: 500; }
.source-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-tertiary);

  &.reused { background: rgba(16, 185, 129, 0.12); color: var(--accent-green); }
}
.source-desc { font-size: 12.5px; color: var(--text-tertiary); margin: 0; line-height: 1.5; }
.source-arrow { color: var(--text-tertiary); margin-top: 12px; font-size: 14px; }
</style>
