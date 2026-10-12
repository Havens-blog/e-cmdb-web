import type { RouteRecordRaw } from 'vue-router'

/**
 * e-cmdb-web 路由（base: '/cmdb/'，与 vite base 一致）。
 *
 * 全部页面嵌套在 AppShell（深色侧边栏导航壳）下渲染。
 * 现有页面（cmdb models/instances/relations/topology、service-tree、topology）
 * 与新页面（dashboard/impact/audit/quality/discovery/open-api）整合为统一导航。
 */
const routes: RouteRecordRaw[] = [
    {
        path: '/',
        component: () => import('@/layout/AppShell.vue'),
        redirect: '/dashboard',
        children: [
            {
                path: 'dashboard',
                name: 'Dashboard',
                component: () => import('@/views/dashboard/index.vue'),
                meta: { title: '仪表盘', icon: 'Odometer' },
            },
            // ==================== CMDB 管理 ====================
            {
                path: 'cmdb/models',
                name: 'CmdbModels',
                component: () => import('@/views/cmdb/models/index.vue'),
                meta: { title: '资源模型', icon: 'Grid' },
            },
            {
                path: 'cmdb/instances',
                name: 'CmdbInstances',
                component: () => import('@/views/cmdb/instances/index.vue'),
                meta: { title: '资源实例', icon: 'Box' },
            },
            {
                path: 'cmdb/relations',
                name: 'CmdbRelations',
                component: () => import('@/views/cmdb/relations/index.vue'),
                meta: { title: '模型关系', icon: 'Connection' },
            },
            {
                path: 'cmdb/topology',
                name: 'CmdbTopology',
                component: () => import('@/views/cmdb/topology/index.vue'),
                meta: { title: '拓扑视图', icon: 'Share' },
            },
            // ==================== 服务树 ====================
            {
                path: 'service-tree',
                name: 'ServiceTree',
                component: () => import('@/views/service-tree/index.vue'),
                meta: { title: '服务树', icon: 'Connection' },
            },
            {
                path: 'service-tree/environments',
                name: 'ServiceTreeEnvironments',
                component: () => import('@/views/service-tree/environments/index.vue'),
                meta: { title: '环境管理', icon: 'Setting', hideInMenu: true },
            },
            {
                path: 'service-tree/rules',
                name: 'ServiceTreeRules',
                component: () => import('@/views/service-tree/rules/index.vue'),
                meta: { title: '绑定规则', icon: 'List', hideInMenu: true },
            },
            // ==================== 资源拓扑 ====================
            {
                path: 'topology',
                name: 'Topology',
                component: () => import('@/views/topology/index.vue'),
                meta: { title: '资源拓扑', icon: 'Share', hideInMenu: true },
            },
            // ==================== 影响分析 ====================
            {
                path: 'impact',
                name: 'Impact',
                component: () => import('@/views/impact/index.vue'),
                meta: { title: '影响分析', icon: 'Aim' },
            },
            // ==================== 变更审计 ====================
            {
                path: 'audit',
                name: 'Audit',
                component: () => import('@/views/audit/index.vue'),
                meta: { title: '变更审计', icon: 'Timer' },
            },
            // ==================== 数据质量 ====================
            {
                path: 'quality',
                name: 'Quality',
                component: () => import('@/views/quality/index.vue'),
                meta: { title: '数据质量', icon: 'CircleCheck' },
            },
            // ==================== 发现同步 ====================
            {
                path: 'discovery',
                name: 'Discovery',
                component: () => import('@/views/discovery/index.vue'),
                meta: { title: '发现同步', icon: 'RefreshRight' },
            },
            // ==================== 开放 API ====================
            {
                path: 'open-api',
                name: 'OpenApi',
                component: () => import('@/views/open-api/index.vue'),
                meta: { title: '开放 API', icon: 'Key' },
            },
            // ==================== 资产实例（按模型 uid） ====================
            {
                path: 'assets/instances/:uid',
                name: 'AssetInstances',
                component: () => import('@/views/cmdb/instances/index.vue'),
                meta: { title: '资产实例', icon: 'Box', hideInMenu: true },
            },
        ],
    },
    // 兜底：未知路径回仪表盘
    {
        path: '/:pathMatch(.*)*',
        redirect: '/dashboard',
    },
]

export default routes
