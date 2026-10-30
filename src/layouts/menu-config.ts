/**
 * 侧边栏菜单配置（对齐 e-cam-web src/layouts/menu-config.ts 的模块模式）。
 *
 * 【为什么独立成模块】
 * 与平台侧同构：菜单树只含类型与纯数据，无副作用、无 Vue 运行时依赖，
 * 由 AppShell.vue 单一消费方 import。未来若增加面包屑等第二个消费方，
 * 本模块无需改动即可复用（平台侧拆分时的同款理由）。
 *
 * 【与平台菜单的关系】
 * CMDB 分组的 4 个菜单项与 e-cam-web menu-config.ts「平台管理 > CMDB」
 * 逐字一致（key / title / icon / path），保证用户从平台侧边栏跳入本应用后
 * 看到同款文案与图标；「服务树」「洞察」两组是本独立仓新增页面（平台菜单
 * 尚未收录），图标从同款 iconfont 中选取。
 *
 * 【不含】
 * - /assets/instances/:uid（hideInMenu 资产实例路由，由实例页内部跳转进入）
 * - 面包屑 / 三级子菜单（本应用页面扁平，无需平台的三级 flyout 能力）
 */
export interface MenuItem {
    key: string
    title: string
    /** iconfont 类名（public/iconfont，与平台 ops-* 线性图标同源） */
    icon?: string
    path: string
}

export interface MenuGroup {
    title: string
    items: MenuItem[]
}

export const menuGroups: MenuGroup[] = [
    {
        title: '概览',
        items: [
            { key: 'dashboard', path: '/dashboard', title: '仪表盘', icon: 'ops-cmdb-dashboard' },
        ],
    },
    {
        title: 'CMDB',
        items: [
            { key: 'cmdb-models', path: '/models', title: '资源模型', icon: 'icon-xianxing-wuliji' },
            { key: 'cmdb-instances', path: '/instances', title: '资源实例', icon: 'icon-xianxing-xuniji' },
            { key: 'cmdb-relations', path: '/relations', title: '模型关系', icon: 'icon-xianxing-jiaohuanji' },
            { key: 'cmdb-topology', path: '/models/topology', title: '拓扑视图', icon: 'icon-xianxing-luyouqi' },
        ],
    },
    {
        title: '服务树',
        items: [
            { key: 'service-tree', path: '/service-tree', title: '服务树', icon: 'icon-xianxing-bumen' },
            { key: 'service-tree-environments', path: '/service-tree/environments', title: '环境管理', icon: 'icon-xianxing-chanpin' },
            { key: 'service-tree-rules', path: '/service-tree/rules', title: '绑定规则', icon: 'ops-itsm-logs' },
        ],
    },
    {
        title: '洞察',
        items: [
            { key: 'topology', path: '/topology', title: '资源拓扑', icon: 'caise-computer' },
            { key: 'impact', path: '/impact', title: '影响分析', icon: 'monitor-analysis' },
            { key: 'quality', path: '/quality', title: '数据质量', icon: 'monitor-zongfenhegexiangpingfen' },
            { key: 'dns', path: '/dns', title: 'DNS 解析', icon: 'cmdb-discovery_resources' },
            { key: 'audit', path: '/audit', title: '变更审计', icon: 'icon-xianxing-shenji' },
        ],
    },
    {
        title: '集成',
        items: [
            { key: 'discovery', path: '/discovery', title: '发现同步', icon: 'cmdb-discovery_resources' },
            { key: 'open-api', path: '/open-api', title: '开放 API', icon: 'oneterm-secret_key' },
        ],
    },
]
