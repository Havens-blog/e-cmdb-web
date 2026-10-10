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
        redirect: '/cmdb',
    },
    // ==================== CMDB 管理路由 ====================
    {
        path: '/cmdb',
        redirect: '/cmdb/models',
    },
    {
        path: '/cmdb/models',
        name: 'CmdbModels',
        component: () => import('@/views/cmdb/models/index.vue'),
        meta: {
            title: '资源模型',
            icon: 'Grid',
        },
    },
    {
        path: '/cmdb/instances',
        name: 'CmdbInstances',
        component: () => import('@/views/cmdb/instances/index.vue'),
        meta: {
            title: '资源实例',
            icon: 'Box',
        },
    },
    {
        path: '/cmdb/relations',
        name: 'CmdbRelations',
        component: () => import('@/views/cmdb/relations/index.vue'),
        meta: {
            title: '模型关系',
            icon: 'Connection',
        },
    },
    {
        path: '/cmdb/topology',
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
    // 兜底：未知路径回 CMDB 首页
    {
        path: '/:pathMatch(.*)*',
        redirect: '/cmdb',
    },
]

export default routes
