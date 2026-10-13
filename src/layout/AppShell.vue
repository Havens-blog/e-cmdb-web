<script setup lang="ts">
// AppShell：CMDB 配置数据平台统一导航壳。
// 深色侧边栏（Linear 主题）+ 内容区 router-view，整合全部功能页。
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
    Aim, Box, CircleCheck, Connection, Grid, Key, Odometer,
    RefreshRight, Share, Timer
} from '@element-plus/icons-vue'

interface NavItem {
    path: string
    label: string
    icon: any
}

interface NavGroup {
    title: string
    items: NavItem[]
}

const navGroups: NavGroup[] = [
    {
        title: '概览',
        items: [{ path: '/dashboard', label: '仪表盘', icon: Odometer }],
    },
    {
        title: '配置',
        items: [
            { path: '/models', label: '资源模型', icon: Grid },
            { path: '/instances', label: '资源实例', icon: Box },
            { path: '/relations', label: '模型关系', icon: Connection },
        ],
    },
    {
        title: '拓扑',
        items: [
            { path: '/topology', label: '资源拓扑', icon: Share },
            { path: '/model-topology', label: '拓扑视图', icon: Share },
            { path: '/service-tree', label: '服务树', icon: Connection },
            { path: '/impact', label: '影响分析', icon: Aim },
        ],
    },
    {
        title: '治理',
        items: [
            { path: '/audit', label: '变更审计', icon: Timer },
            { path: '/quality', label: '数据质量', icon: CircleCheck },
            { path: '/discovery', label: '发现同步', icon: RefreshRight },
        ],
    },
    {
        title: '集成',
        items: [{ path: '/open-api', label: '开放 API', icon: Key }],
    },
]

const route = useRoute()
const activePath = computed(() => route.path)
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-horizontal" role="img" aria-label="息壤 Xirang">
          <svg viewBox="0 0 260 64" xmlns="http://www.w3.org/2000/svg">
            <title>息壤 Xirang</title>
            <defs>
              <linearGradient id="xec-top" x1="8" y1="22" x2="56" y2="46" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#7170ff"/>
                <stop offset="1" stop-color="#5e6ad2"/>
              </linearGradient>
              <linearGradient id="xec-sprout" x1="32" y1="34" x2="32" y2="6" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#7170ff"/>
                <stop offset="1" stop-color="#a5b4fc"/>
              </linearGradient>
            </defs>
            <path d="M8 46 L32 58 L56 46" fill="none" stroke="#5e6ad2" stroke-opacity="0.45" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8 40 L32 52 L56 40" fill="none" stroke="#5e6ad2" stroke-opacity="0.75" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M32 22 L56 34 L32 46 L8 34 Z" fill="url(#xec-top)"/>
            <g stroke="url(#xec-sprout)" stroke-width="3" stroke-linecap="round" fill="none">
              <path d="M32 34 V14"/>
              <path d="M32 24 L22 17"/>
              <path d="M32 24 L42 17"/>
            </g>
            <circle cx="32" cy="34" r="3.2" fill="#ffffff"/>
            <circle cx="32" cy="11" r="3.6" fill="#a5b4fc"/>
            <circle cx="20" cy="15.5" r="3" fill="#8b93ff"/>
            <circle cx="44" cy="15.5" r="3" fill="#8b93ff"/>
            <text x="74" y="36" fill="currentColor" font-family="'PingFang SC','Microsoft YaHei','Noto Sans SC','Source Han Sans SC',sans-serif" font-size="28" font-weight="700" letter-spacing="4">息壤</text>
            <text x="75" y="54" fill="#7170ff" font-family="'Inter Variable',Inter,'Segoe UI',Roboto,Arial,sans-serif" font-size="11.5" font-weight="600" letter-spacing="5.2">XIRANG CLOUD</text>
          </svg>
        </div>
      </div>

      <nav class="nav">
        <div v-for="group in navGroups" :key="group.title" class="nav-group">
          <div class="nav-group-title">{{ group.title }}</div>
          <router-link
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            :class="{ active: activePath === item.path }"
          >
            <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
            <span class="nav-label">{{ item.label }}</span>
          </router-link>
        </div>
      </nav>

      <div class="sidebar-footer">
        <span class="footer-dot" />
        <span>Single Source of Truth</span>
      </div>
    </aside>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped lang="scss">
.app-shell {
  display: flex;
  height: 100vh;
  width: 100%;
  background: var(--bg-base);
  color: var(--text-primary);
  overflow: hidden;
}

.sidebar {
  width: 232px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  border-right: 1px solid var(--border-subtle);
  padding: 20px 12px;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px 20px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 16px;
}

// 息壤 Xirang 横版 wordmark；sidebar 232px - 24px padding = 208px 内容宽，logo 限 180px
.logo-horizontal {
  max-width: 180px;
  height: auto;
  flex-shrink: 0;
  color: var(--text-primary);

  svg {
    width: 100%;
    height: auto;
    display: block;
  }
}

.nav {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.nav-group-title {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
  padding: 0 8px;
  margin-bottom: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border-radius: 6px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 13.5px;
  transition: all 120ms ease;
  margin-bottom: 1px;

  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  &.active {
    background: rgba(113, 112, 255, 0.12);
    color: var(--text-primary);

    .nav-icon {
      color: var(--accent-blue);
    }
  }
}

.nav-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.nav-label {
  line-height: 1;
}

.sidebar-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 8px 0;
  border-top: 1px solid var(--border-subtle);
  font-size: 11px;
  color: var(--text-tertiary);
}

.footer-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-green);
  flex-shrink: 0;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  box-sizing: border-box;
}
</style>
