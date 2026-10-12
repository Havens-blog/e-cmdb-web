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
            { path: '/cmdb/topology', label: '拓扑视图', icon: Share },
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
        <span class="logo-mark">◆</span>
        <span class="logo-text">CMDB</span>
        <span class="logo-sub">配置数据平台</span>
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
  align-items: baseline;
  gap: 8px;
  padding: 0 8px 20px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 16px;
}

.logo-mark {
  color: var(--accent-blue);
  font-size: 14px;
}

.logo-text {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.logo-sub {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-left: auto;
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
