<script setup lang="ts">
/**
 * 应用外壳：对齐运维平台 e-cam-web MainLayout 的侧边栏设计。
 *
 * 【设计来源】
 * 视觉规格取自 e-cam-web src/layouts/components/AppSidebar.vue：
 * 侧栏 220px / 折叠 64px、背景 var(--bg-elevated)、菜单项 40px 高 / 8px 圆角 /
 * 2px 8px 外边距、hover var(--bg-hover)、激活态品牌色 var(--accent-blue)、
 * 息壤 Xirang logo（同款渐变 #7170ff→#5e6ad2）。设计令牌全部复用本仓
 * theme-variables.scss 的同名 CSS 变量，深浅主题自动跟随。
 *
 * 【租户透传（与路由守卫闭环，关键）】
 * 平台侧 AppSidebar 对 /cmdb/* 是 window.open(item.path) 新窗口打开，**不带
 * tenant_id**；本应用路由守卫（feat/cmdb-tenant-context）对无租户 URL 会弹回
 * 登录页——平台跳转链路因此依赖本壳在**应用内导航**时补齐租户：菜单项一律经
 * buildTenantUrl(path, getTenantId()) 拼上 ?tenant_id=，SPA 内切页不再丢租户。
 *
 * 【刻意不做】（保持最小壳，缺口由平台侧承接）
 * - 租户切换器（切租户是平台 TopNavBar/TenantSelector 的职责，本应用被动接收）
 * - 用户信息 / 主题切换 / 全局搜索（平台顶栏能力，独立仓暂不复制）
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getTenantId } from '@/api/tenantContext'
import { useAppStore } from '@/stores/app'
import { buildTenantUrl } from '@/utils/tenantFromUrl'
import { menuGroups } from './menu-config'

const route = useRoute()
const appStore = useAppStore()

// 守卫保证进入本壳时租户已选定（>0）；0 仅在测试/异常态出现，徽标显示为「未选定」
const tenantId = computed(() => getTenantId())

/**
 * 菜单跳转地址：SPA 内导航必须携带当前租户，否则守卫视为「未带租户」弹回登录。
 * tenantId=0 时 buildTenantUrl 不拼参数（防御：让守卫按既有语义处理）。
 */
function hrefFor(path: string): string {
    return buildTenantUrl(path, tenantId.value)
}

/**
 * 激活态：当前路由前缀匹配。
 * 特例：/assets/instances/:uid 是资源实例页按模型过滤的别名路由，归「资源实例」高亮。
 */
function isActive(path: string): boolean {
    if (route.path === path) return true
    if (path === '/cmdb/instances' && route.path.startsWith('/assets/')) return true
    return route.path.startsWith(`${path}/`)
}
</script>

<template>
    <div class="app-shell">
        <aside class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
            <!-- Logo：折叠态显示方块 mark，展开态加横版 wordmark（与平台侧边栏同款渐变） -->
            <div class="sidebar-logo" title="息壤 Xirang · CMDB">
                <div class="logo-icon" role="img" aria-label="息壤 Xirang">
                    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                        <title>息壤 Xirang</title>
                        <defs>
                            <linearGradient id="xrm-shell-top" x1="8" y1="22" x2="56" y2="46" gradientUnits="userSpaceOnUse">
                                <stop offset="0" stop-color="#7170ff" />
                                <stop offset="1" stop-color="#5e6ad2" />
                            </linearGradient>
                        </defs>
                        <path d="M32 22 L56 34 L32 46 L8 34 Z" fill="url(#xrm-shell-top)" />
                        <g stroke="#7170ff" stroke-width="3" stroke-linecap="round" fill="none">
                            <path d="M32 34 V14" />
                            <path d="M32 24 L22 17" />
                            <path d="M32 24 L42 17" />
                        </g>
                        <circle cx="32" cy="34" r="3.2" fill="#ffffff" />
                    </svg>
                </div>
                <span v-if="!appStore.sidebarCollapsed" class="logo-wordmark">CMDB</span>
            </div>

            <nav class="sidebar-nav">
                <div v-for="group in menuGroups" :key="group.title" class="menu-group">
                    <div v-if="!appStore.sidebarCollapsed" class="menu-group-title">{{ group.title }}</div>
                    <router-link
                        v-for="item in group.items"
                        :key="item.key"
                        :to="hrefFor(item.path)"
                        class="menu-item"
                        :class="{ active: isActive(item.path) }"
                        :title="appStore.sidebarCollapsed ? item.title : undefined"
                    >
                        <i v-if="item.icon" class="iconfont menu-icon" :class="item.icon" aria-hidden="true"></i>
                        <span v-if="!appStore.sidebarCollapsed" class="menu-title">{{ item.title }}</span>
                    </router-link>
                </div>
            </nav>

            <div class="sidebar-footer">
                <span class="tenant-badge" title="当前租户（由平台跳转 ?tenant_id= 透传）">
                    {{ tenantId > 0 ? `租户 #${tenantId}` : '未选定租户' }}
                </span>
                <button
                    class="collapse-btn"
                    type="button"
                    :aria-label="appStore.sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'"
                    @click="appStore.toggleSidebar()"
                >
                    <span class="collapse-arrow" :class="{ flipped: appStore.sidebarCollapsed }">⟨</span>
                </button>
            </div>
        </aside>

        <main class="app-content">
            <slot />
        </main>
    </div>
</template>

<style scoped lang="scss">
$sidebar-width: 220px;
$sidebar-collapsed-width: 64px;

.app-shell {
    display: flex;
    min-height: 100vh;
    background: var(--bg-base);
}

.sidebar {
    display: flex;
    flex-direction: column;
    width: $sidebar-width;
    flex-shrink: 0;
    background: var(--bg-elevated);
    border-right: 1px solid var(--border-subtle);
    transition: width 300ms ease, background-color 0.3s ease, border-color 0.3s ease;

    &.collapsed {
        width: $sidebar-collapsed-width;

        .menu-item {
            justify-content: center;
            padding: 0;
            margin: 2px 8px;
        }

        .sidebar-footer {
            justify-content: center;
        }
    }
}

.sidebar-logo {
    height: 56px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 20px;
    border-bottom: 1px solid var(--border-subtle);

    .logo-icon {
        width: 28px;
        height: 28px;
        flex-shrink: 0;

        svg {
            width: 100%;
            height: 100%;
        }
    }

    .logo-wordmark {
        font-family: 'Inter Variable', Inter, 'Segoe UI', Roboto, Arial, sans-serif;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 4px;
        color: var(--text-primary);
        white-space: nowrap;
    }
}

.sidebar-nav {
    flex: 1;
    overflow-y: auto;
    padding: 12px 0;

    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-thumb {
        background: var(--scrollbar-thumb);
        border-radius: 2px;
    }
}

.menu-group-title {
    padding: 12px 20px 6px;
    font-size: 11px;
    color: var(--text-tertiary);
    white-space: nowrap;
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 40px;
    padding: 0 20px;
    margin: 2px 8px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 150ms ease;
    color: var(--text-secondary);
    text-decoration: none;
    position: relative;

    .menu-icon {
        opacity: 0.85;
        flex-shrink: 0;
        width: 18px;
        height: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        color: var(--text-secondary);
    }

    .menu-title {
        font-size: 14px;
        font-weight: 500;
        white-space: nowrap;
        color: var(--text-regular);
        flex: 1;
        line-height: 1;
    }

    &:hover {
        background: var(--bg-hover);

        .menu-icon,
        .menu-title {
            color: var(--text-primary);
        }
    }

    // 激活态：品牌色左侧指示条 + 高亮文案（平台同款视觉语言）
    &.active {
        background: var(--bg-hover);

        &::before {
            content: '';
            position: absolute;
            left: 0;
            top: 8px;
            bottom: 8px;
            width: 3px;
            border-radius: 2px;
            background: var(--accent-blue);
        }

        .menu-icon,
        .menu-title {
            color: var(--accent-blue);
        }
    }
}

.sidebar-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 16px;
    border-top: 1px solid var(--border-subtle);

    .tenant-badge {
        font-size: 12px;
        color: var(--text-tertiary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .collapse-btn {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--text-tertiary);
        cursor: pointer;
        transition: all 150ms ease;

        &:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }

        .collapse-arrow {
            font-size: 13px;
            line-height: 1;
            transition: transform 200ms ease;

            &.flipped {
                transform: rotate(180deg);
            }
        }
    }
}

.app-content {
    flex: 1;
    min-width: 0;
}
</style>
