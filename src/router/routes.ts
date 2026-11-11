import type { RouteRecordRaw } from 'vue-router'

/**
 * e-cmdb-web 路由（base: '/cmdb/'，与 vite base 一致）。
 *
 * 从 e-cam-web/src/router/routes.ts 提取 CMDB / service-tree / topology 相关路由。
 * 原结构为 MainLayout 嵌套 children；MainLayout 依赖过深（PlatformNav / 菜单 /
 * 用户信息 / eiam 等），本独立仓库简化为直接渲染组件（去掉 layout 与权限守卫）。
 * meta.title / icon / hideInMenu 原样保留。
 */
const routes: RouteRecordRaw[] = [
    {
        path: '/',
        redirect: '/dashboard',
    },
    // ==================== 概览 ====================
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: {
            title: '仪表盘',
            icon: 'Odometer',
        },
    },
    // ==================== CMDB 管理路由 ====================
    // 注意：router base 已是 '/cmdb/'（与 vite base 一致），路由 path **不能**再带 '/cmdb' 前缀，
    // 否则真实 URL 会变成 /cmdb/cmdb/models 这类双段形态（单段 /cmdb/instances 会落到兜底路由）。
    {
        // 旧入口（原 '/cmdb'，真实 URL /cmdb/cmdb）→ 资源模型
        path: '/cmdb',
        redirect: '/models',
    },
    {
        path: '/models',
        name: 'CmdbModels',
        component: () => import('@/views/cmdb/models/index.vue'),
        meta: {
            title: '资源模型',
            icon: 'Grid',
        },
    },
    {
        path: '/instances',
        name: 'CmdbInstances',
        component: () => import('@/views/cmdb/instances/index.vue'),
        meta: {
            title: '资源实例',
            icon: 'Box',
        },
    },
    {
        path: '/relations',
        name: 'CmdbRelations',
        component: () => import('@/views/cmdb/relations/index.vue'),
        meta: {
            title: '模型关系',
            icon: 'Connection',
        },
    },
    {
        path: '/instance-relations',
        name: 'CmdbInstanceRelations',
        component: () => import('@/views/cmdb/instance-relations/index.vue'),
        meta: {
            title: '实例关系',
            icon: 'Connection',
        },
    },
    {
        // 原 '/cmdb/topology'：去掉前缀后会与下方「资源拓扑」的 '/topology' 撞车，
        // 因此收进模型域下（真实 URL /cmdb/models/topology），语义即「模型拓扑」
        path: '/models/topology',
        name: 'CmdbTopology',
        component: () => import('@/views/cmdb/topology/index.vue'),
        meta: {
            title: '拓扑视图',
            icon: 'Share',
        },
    },
    // ==================== 服务树路由 ====================
    {
        path: '/service-tree',
        name: 'ServiceTree',
        component: () => import('@/views/service-tree/index.vue'),
        meta: {
            title: '服务树',
            icon: 'Connection',
        },
    },
    {
        path: '/service-tree/environments',
        name: 'ServiceTreeEnvironments',
        component: () => import('@/views/service-tree/environments/index.vue'),
        meta: {
            title: '环境管理',
            icon: 'Setting',
        },
    },
    {
        path: '/service-tree/rules',
        name: 'ServiceTreeRules',
        component: () => import('@/views/service-tree/rules/index.vue'),
        meta: {
            title: '绑定规则',
            icon: 'List',
        },
    },
    // ==================== 资源拓扑路由 ====================
    {
        path: '/topology',
        name: 'Topology',
        component: () => import('@/views/topology/index.vue'),
        meta: {
            title: '资源拓扑',
            icon: 'Share',
        },
    },
    // ==================== 影响分析 ====================
    {
        path: '/impact',
        name: 'Impact',
        component: () => import('@/views/impact/index.vue'),
        meta: {
            title: '影响分析',
            icon: 'Aim',
        },
    },
    // ==================== 变更审计 ====================
    {
        path: '/audit',
        name: 'Audit',
        component: () => import('@/views/audit/index.vue'),
        meta: {
            title: '变更审计',
            icon: 'Timer',
        },
    },
    // ==================== 数据质量 ====================
    {
        path: '/dns',
        name: 'Dns',
        component: () => import('@/views/dns/index.vue'),
        meta: { title: 'DNS 解析' },
    },
    {
        path: '/quality',
        name: 'Quality',
        component: () => import('@/views/quality/index.vue'),
        meta: {
            title: '数据质量',
            icon: 'CircleCheck',
        },
    },
    // ==================== 发现同步 ====================
    {
        path: '/discovery',
        name: 'Discovery',
        component: () => import('@/views/discovery/index.vue'),
        meta: {
            title: '发现同步',
            icon: 'RefreshRight',
        },
    },
    // ==================== 开放 API ====================
    {
        path: '/open-api',
        name: 'OpenApi',
        component: () => import('@/views/open-api/index.vue'),
        meta: {
            title: '开放 API',
            icon: 'Key',
        },
    },
    // ==================== 资产实例（按模型 uid） ====================
    {
        path: '/assets/instances/:uid',
        name: 'AssetInstances',
        component: () => import('@/views/cmdb/instances/index.vue'),
        meta: {
            title: '资产实例',
            icon: 'Box',
            hideInMenu: true,
        },
    },
    // ==================== 旧 URL 兼容重定向 ====================
    // 历史链接形如 /cmdb/cmdb/models（base + 带前缀的 path）。前缀修正后这些路径不再有对应路由，
    // 这里显式重定向，保证旧书签与外部引用不失效。
    { path: '/cmdb/models', redirect: '/models' },
    { path: '/cmdb/instances', redirect: '/instances' },
    { path: '/cmdb/relations', redirect: '/relations' },
    { path: '/cmdb/topology', redirect: '/models/topology' },
    // 兜底：未知路径渲染 404 页（iter339）
    //
    // **原先这里是 `redirect: '/models'`** —— 实测后果很具体：输错地址会被静默送到
    // 「资源模型」页，**地址栏也跟着变成 `/cmdb/models`**，用户既不知道自己输错了什么、
    // 也无法回头检查拼写，还会误以为资源模型就是他要找的页面（可能在这里继续操作）。
    //
    // 改为渲染 404 页后与 `e-cam-web` / `haven-console` 行为一致（同轮实测两者都是
    // 原地显示 404、地址栏不变）—— 三站面对「地址打错」应给同一个回答。
    //
    // 必须放在**最后一条**：vue-router 按数组顺序匹配，catch-all 若在前面会吃掉所有路由。
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/error/NotFound.vue'),
    },
]

export default routes
