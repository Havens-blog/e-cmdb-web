<script setup lang="ts">
/**
 * 应用外壳：header + 侧边栏参考 WatchAlert（opsre/WatchAlert-web）设计。
 *
 * 【设计来源】
 * 布局骨架取自 WatchAlert-web（悬浮圆角卡片 + 无独立顶栏的轻量子应用壳），
 * 品牌/视觉已对齐平台（e-cam-web / haven-console 同款 @haven/ui/theme 令牌）：
 * - 页面底 var(--bg-base)（#08090a，非纯黑），侧边栏与内容区为「悬浮圆角卡片」，
 *   四周留 16px 呼吸缝；
 * - 侧栏 210px / 折叠 64px、圆角 12px，自上而下：居中 logo（完整息壤 mark +
 *   「息壤 XIRANG CLOUD」）→ 租户徽标（半透明底 + 品牌色描边）→ 品牌色渐变
 *   分割线 → 分组菜单 → 底部毛玻璃操作区；
 * - 菜单项 40px 高 / 8px 圆角 / 2px 8px 外边距 / 14px 字号，hover bg-hover 底 +
 *   主文字色，激活态品牌色 15% 淡染底（color-mix）+ 蓝紫文字（与平台菜单一致）；
 * - 无独立顶栏：logo / 租户 / 用户职能全在侧边栏，内容卡片内部滚动，
 *   底部居中品牌 footer。
 *
 * 【主题策略】
 * 壳背景 var(--bg-base)、侧栏/内容卡表面 var(--bg-elevated)，均消费
 * @haven/ui/theme 令牌，随本仓深浅主题切换（浅色主题下即「浅底 + 白色内容卡」）。
 *
 * 【租户透传（与路由守卫闭环，关键）】
 * 平台侧 AppSidebar 对 /cmdb/* 是 window.open(item.path) 新窗口打开，**不带
 * tenant_id**；本应用路由守卫（feat/cmdb-tenant-context）对无租户 URL 会弹回
 * 登录页——平台跳转链路因此依赖本壳在**应用内导航**时补齐租户：菜单项一律经
 * buildTenantUrl(path, getTenantId()) 拼上 ?tenant_id=，SPA 内切页不再丢租户。
 *
 * 【刻意不做】（保持最小壳，缺口由平台侧承接）
 * - 租户切换器（切租户是平台 TopNavBar/TenantSelector 的职责，本应用被动接收，
 *   徽标仅展示，不可点击）
 * - 登录用户信息（本应用无用户 API，底部操作区为「返回平台」入口）
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getTenantId, getTenantName } from '@/api/tenantContext'
import { useAppStore } from '@/stores/app'
import { buildTenantUrl } from '@/utils/tenantFromUrl'
import { menuGroups } from './menu-config'

const route = useRoute()
const appStore = useAppStore()

/** 运维平台首页（底部「返回平台」入口）；同源部署在 /cam/，dev 可用 env 覆盖 */
const platformHome = import.meta.env.VITE_PLATFORM_HOME || '/cam/'

// 守卫保证进入本壳时租户已选定（>0）；0 仅在测试/异常态出现，徽标显示为「未选定」
const tenantId = computed(() => getTenantId())
const tenantLabel = computed(() => {
    if (tenantId.value <= 0) return '未选定租户'
    // 优先展示租户名（自 eiam profile tenants 解析）；未知名回退「租户 #<id>」
    const name = getTenantName()
    return name || `租户 #${tenantId.value}`
})

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
    if (path === '/instances' && route.path.startsWith('/assets/')) return true
    return route.path.startsWith(`${path}/`)
}
</script>

<template>
    <div class="app-shell">
        <aside class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
            <!-- 顶部：居中 logo + 租户徽标（WatchAlert sider 顶部同构） -->
            <div class="sidebar-top">
                <div class="sidebar-logo" title="息壤 Xirang · CMDB">
                    <div class="logo-icon" role="img" aria-label="息壤 Xirang">
                        <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                            <title>息壤 Xirang</title>
                            <defs>
                                <linearGradient id="xrm-top" x1="8" y1="22" x2="56" y2="46" gradientUnits="userSpaceOnUse">
                                    <stop offset="0" stop-color="#7170ff" />
                                    <stop offset="1" stop-color="#5e6ad2" />
                                </linearGradient>
                                <linearGradient id="xrm-sprout" x1="32" y1="34" x2="32" y2="6" gradientUnits="userSpaceOnUse">
                                    <stop offset="0" stop-color="#7170ff" />
                                    <stop offset="1" stop-color="#a5b4fc" />
                                </linearGradient>
                            </defs>
                            <path d="M8 46 L32 58 L56 46" fill="none" stroke="#5e6ad2" stroke-opacity="0.45" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                            <path d="M8 40 L32 52 L56 40" fill="none" stroke="#5e6ad2" stroke-opacity="0.75" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                            <path d="M32 22 L56 34 L32 46 L8 34 Z" fill="url(#xrm-top)" />
                            <g stroke="url(#xrm-sprout)" stroke-width="3" stroke-linecap="round" fill="none">
                                <path d="M32 34 V14" />
                                <path d="M32 24 L22 17" />
                                <path d="M32 24 L42 17" />
                            </g>
                            <circle cx="32" cy="34" r="3.2" fill="#ffffff" />
                            <circle cx="32" cy="11" r="3.6" fill="#a5b4fc" />
                            <circle cx="20" cy="15.5" r="3" fill="#8b93ff" />
                            <circle cx="44" cy="15.5" r="3" fill="#8b93ff" />
                        </svg>
                    </div>
                    <span v-if="!appStore.sidebarCollapsed" class="logo-wordmark">
                        <span class="wm-cn">息壤</span>
                        <span class="wm-en">XIRANG CLOUD</span>
                    </span>
                </div>

                <div class="tenant-badge" title="当前租户（由平台跳转 ?tenant_id= 透传）">
                    <i class="iconfont tenant-icon icon-xianxing-bumen" aria-hidden="true"></i>
                    <span v-if="!appStore.sidebarCollapsed" class="tenant-text">{{ tenantLabel }}</span>
                </div>
            </div>

            <!-- 品牌色渐变分割线（WatchAlert 金色分割线同构） -->
            <div class="shell-divider" role="presentation"></div>

            <!-- 主目录导航：需显式命名，否则读屏只报「导航」无法与其他 nav 区分 -->
            <nav class="sidebar-nav" aria-label="主目录">
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

            <!-- 底部操作区：返回平台 + 折叠开关（WatchAlert 毛玻璃用户区同构） -->
            <div class="sidebar-user">
                <a class="user-entry" :href="platformHome" title="返回运维平台">
                    <span class="user-avatar" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M16 17l5-5-5-5M21 12H9M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </span>
                    <span v-if="!appStore.sidebarCollapsed" class="user-label">返回平台</span>
                </a>
                <button
                    class="collapse-btn"
                    type="button"
                    :aria-label="appStore.sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'"
                    @click="appStore.toggleSidebar()"
                >
                    <svg class="collapse-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path
                            d="M15 18l-6-6 6-6"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                </button>
            </div>
        </aside>

        <!-- 内容区：悬浮圆角卡片 + 居中品牌 footer（WatchAlert 内容列同构） -->
        <main class="app-main">
            <div class="content-card">
                <slot />
            </div>
            <footer class="app-footer">
                <span class="footer-brand">息壤 CMDB</span> 提供轻量级一站式配置管理服务
            </footer>
        </main>
    </div>
</template>

<style scoped lang="scss">
// 品牌常量（局部作用域）；壳背景/侧栏表面改用 @haven/ui/theme 令牌，与平台对齐
$brand-a: #7170ff;
$brand-b: #5e6ad2;
$brand-light: #a5a4ff;
$sidebar-width: 210px;
$sidebar-collapsed-width: 64px;

.app-shell {
    display: flex;
    gap: 16px;
    height: 100vh;
    padding: 16px;
    overflow: hidden;
    background: var(--bg-base);
}

.sidebar {
    display: flex;
    flex-direction: column;
    width: $sidebar-width;
    flex-shrink: 0;
    overflow: hidden;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
    transition: width 300ms cubic-bezier(0.645, 0.045, 0.355, 1);

    &.collapsed {
        width: $sidebar-collapsed-width;

        .menu-item {
            justify-content: center;
            padding: 0;
        }

        .tenant-badge {
            justify-content: center;
            padding: 0;
        }

        .sidebar-user {
            justify-content: center;
            padding: 12px 6px;
        }
    }
}

// ── 顶部：logo + 租户徽标 ──────────────────────────────────────────────
.sidebar-top {
    padding: 16px 12px 0;
}

.sidebar-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 14px;

    .logo-icon {
        width: 30px;
        height: 30px;
        flex-shrink: 0;

        svg {
            width: 100%;
            height: 100%;
        }
    }

    .logo-wordmark {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        line-height: 1;
        white-space: nowrap;

        .wm-cn {
            font-family: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', 'Source Han Sans SC', sans-serif;
            font-size: 16px;
            font-weight: 700;
            letter-spacing: 3px;
            color: var(--text-primary);
        }

        .wm-en {
            font-family: 'Inter Variable', Inter, 'Segoe UI', Roboto, Arial, sans-serif;
            font-size: 8.5px;
            font-weight: 600;
            letter-spacing: 3px;
            color: var(--accent-blue);
        }
    }
}

.tenant-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 34px;
    padding: 0 10px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(113, 112, 255, 0.22);
    transition: all 0.2s ease;

    .tenant-icon {
        flex-shrink: 0;
        font-size: 14px;
        color: $brand-light;
    }

    .tenant-text {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12.5px;
        color: rgba(255, 255, 255, 0.85);
    }
}

// ── 品牌色渐变分割线 ──────────────────────────────────────────────────
.shell-divider {
    height: 1px;
    margin: 14px 16px;
    border-radius: 1px;
    background: linear-gradient(90deg, transparent 0%, rgba(113, 112, 255, 0.55) 50%, transparent 100%);
}

// ── 分组菜单（WatchAlert 暗色菜单同构：hover 右移 / 激活品牌渐变） ────
.sidebar-nav {
    flex: 1;
    overflow-y: auto;
    padding: 2px 0 8px;
    scroll-behavior: smooth;
    overscroll-behavior: contain;

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.06);
        border-radius: 3px;
        margin: 8px 0;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(113, 112, 255, 0.35);
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: rgba(113, 112, 255, 0.6);
    }
}

.menu-group-title {
    padding: 12px 16px 4px;
    font-size: 11px;
    font-weight: normal;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.45);
    white-space: nowrap;
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 40px;
    padding: 0 16px;
    margin: 2px 8px;
    border-radius: 8px;
    font-size: 14px;
    color: var(--text-secondary);
    text-decoration: none;
    cursor: pointer;
    position: relative;
    transition: all 150ms ease;

    .menu-icon {
        flex-shrink: 0;
        width: 16px;
        font-size: 15px;
        line-height: 1;
        color: var(--text-secondary);
    }

    .menu-title {
        flex: 1;
        font-size: 14px;
        line-height: 1;
        white-space: nowrap;
        color: var(--text-regular);
    }

    // 悬停：平台同款——bg-hover 底 + 主文字色（去掉 WatchAlert translateX(6px) 右移动效）
    &:hover {
        background: var(--bg-hover);

        .menu-icon,
        .menu-title {
            color: var(--text-primary);
        }
    }

    // 激活态：平台同款——品牌色 15% 淡染底 + 蓝紫文字（替代 WatchAlert 渐变全底 + 白字）
    &.active {
        background: color-mix(in srgb, var(--accent-primary) 15%, transparent);

        .menu-icon,
        .menu-title {
            // 直接用 --accent-blue(#7070FF) 在 15% 淡染底上只有 4.31:1（WCAG AA 需 4.5）。
            // 与白色混到 70% 提亮到约 #A0A0FF → 实测 ≈7.0:1，保留品牌色相同时达标。
            color: color-mix(in srgb, var(--accent-blue) 70%, #fff);
        }

        .menu-title {
            font-weight: 600;
        }
    }
}

// ── 底部操作区：返回平台 + 折叠 ───────────────────────────────────────
.sidebar-user {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 12px;
    border-top: 1px solid rgba(113, 112, 255, 0.2);
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.6) 0%, #000000 100%);
    backdrop-filter: blur(10px);

    .user-entry {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
        min-width: 0;
        padding: 6px;
        border-radius: 6px;
        color: rgba(255, 255, 255, 0.65);
        text-decoration: none;
        transition: all 0.2s ease;

        &:hover {
            background: rgba(113, 112, 255, 0.1);
            color: #ffffff;
        }
    }

    .user-avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        flex-shrink: 0;
        border-radius: 50%;
        background: linear-gradient(135deg, $brand-a 0%, $brand-b 100%);
        color: #ffffff;

        svg {
            width: 14px;
            height: 14px;
        }
    }

    .user-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12.5px;
    }

    .collapse-btn {
        flex-shrink: 0;
        width: 26px;
        height: 26px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        transition: all 150ms ease;

        &:hover {
            background: rgba(113, 112, 255, 0.12);
            color: #ffffff;
        }

        .collapse-icon {
            width: 14px;
            height: 14px;
            transition: transform 200ms ease;
        }
    }
}

.sidebar.collapsed .sidebar-user .collapse-icon {
    transform: rotate(180deg);
}

// ── 内容列：悬浮圆角卡片 + 品牌 footer ────────────────────────────────
.app-main {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-width: 0;
}

.content-card {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    background: var(--bg-elevated);
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-thumb {
        background: var(--scrollbar-thumb);
        border-radius: 3px;
    }
}

.app-footer {
    flex-shrink: 0;
    padding: 2px 0;
    text-align: center;
    font-size: 12px;
    /* 40% 白在近黑底上只有 3.76:1（AA 需 4.5）→ 提到 62%（实测 ≈6.5:1） */
    color: rgba(255, 255, 255, 0.62);

    .footer-brand {
        color: $brand-light;
    }
}
</style>
