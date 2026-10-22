// @vitest-environment happy-dom
/**
 * AppShell 侧边栏外壳单测：
 * - 分组/菜单项渲染（与 menu-config 一致，8 项）；
 * - 激活态跟随路由（前缀匹配 + /assets/instances/:uid 归「资源实例」特例）；
 * - 租户透传（关键）：菜单 href 必须携带当前 tenant_id（与路由守卫闭环），
 *   租户 0 时不拼参数；
 * - 侧栏徽标显示当前租户；折叠切换 appStore.sidebarCollapsed 且隐藏文字。
 *
 * 注意：router-link 不透出 to 属性（渲染为 href）；模块级 tenantContext 变更后
 * 断言 DOM 需 await nextTick()；折叠态无菜单文字，按 href 定位菜单项。
 */
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { clearTenantId, setTenantId } from '@/api/tenantContext'
import { useAppStore } from '@/stores/app'
import { menuGroups } from '../menu-config'
import AppShell from '../AppShell.vue'

const allItems = menuGroups.flatMap((g) => g.items)

const routes = [
    ...allItems.map((i) => ({ path: i.path, component: { template: '<div />' } })),
    { path: '/assets/instances/:uid', component: { template: '<div />' } },
]

let router: Router

/** 挂载外壳（router 已在 beforeEach push 到目标路由） */
function mountShell() {
    const pinia = createPinia()
    setActivePinia(pinia)
    return mount(AppShell, { global: { plugins: [pinia, router] } })
}

/** 按菜单标题找菜单项（仅展开态可用；折叠态请用 itemByHref） */
function itemByText(wrapper: ReturnType<typeof mountShell>, title: string) {
    return wrapper.findAll('.menu-item').find((w) => w.text().includes(title))!
}

/** 按目标路径前缀找菜单项（折叠态也可用） */
function itemByHref(wrapper: ReturnType<typeof mountShell>, path: string) {
    return wrapper.findAll('.menu-item').find((w) => (w.attributes('href') ?? '').startsWith(path))!
}

beforeEach(async () => {
    clearTenantId()
    router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/cmdb/models')
})

describe('AppShell 菜单渲染', () => {
    it('渲染全部分组标题与菜单项（含六页：仪表盘/影响分析/数据质量/变更审计/发现同步/开放 API）', () => {
        const wrapper = mountShell()
        const titles = wrapper.findAll('.menu-item').map((w) => w.text())
        expect(titles).toHaveLength(allItems.length)
        // 原有页面
        expect(titles).toContain('资源模型')
        expect(titles).toContain('资源实例')
        expect(titles).toContain('模型关系')
        expect(titles).toContain('拓扑视图')
        expect(titles).toContain('服务树')
        expect(titles).toContain('环境管理')
        expect(titles).toContain('绑定规则')
        expect(titles).toContain('资源拓扑')
        // 新接入的六页
        expect(titles).toContain('仪表盘')
        expect(titles).toContain('影响分析')
        expect(titles).toContain('数据质量')
        expect(titles).toContain('变更审计')
        expect(titles).toContain('发现同步')
        expect(titles).toContain('开放 API')
        const groupTitles = wrapper.findAll('.menu-group-title').map((w) => w.text())
        expect(groupTitles).toEqual(['概览', 'CMDB', '服务树', '洞察', '集成'])
    })
})

describe('AppShell 激活态', () => {
    it('当前路由对应菜单项高亮，其余不亮', async () => {
        await router.push('/cmdb/relations')
        const wrapper = mountShell()
        expect(itemByText(wrapper, '模型关系').classes()).toContain('active')
        expect(itemByText(wrapper, '资源模型').classes()).not.toContain('active')
    })

    it('前缀匹配：/cmdb/models/extra 也高亮资源模型', async () => {
        // 动态注册一个子路径路由，验证 startsWith(`${path}/`) 语义
        router.addRoute({ path: '/cmdb/models/extra', component: { template: '<div />' } })
        await router.push('/cmdb/models/extra')
        const wrapper = mountShell()
        expect(itemByText(wrapper, '资源模型').classes()).toContain('active')
    })

    it('特例：/assets/instances/:uid 归「资源实例」高亮', async () => {
        await router.push('/assets/instances/host')
        const wrapper = mountShell()
        expect(itemByText(wrapper, '资源实例').classes()).toContain('active')
    })
})

describe('AppShell 租户透传（与路由守卫闭环）', () => {
    it('菜单 href 携带当前 tenant_id（SPA 内切页不丢租户）', () => {
        setTenantId(5)
        const wrapper = mountShell()
        expect(itemByText(wrapper, '资源实例').attributes('href')).toBe('/cmdb/instances?tenant_id=5')
        expect(itemByText(wrapper, '绑定规则').attributes('href')).toBe('/service-tree/rules?tenant_id=5')
    })

    it('租户为 0 时不拼参数（防御：交由守卫按既有语义弹回）', () => {
        clearTenantId()
        const wrapper = mountShell()
        expect(itemByText(wrapper, '资源实例').attributes('href')).toBe('/cmdb/instances')
    })
})

describe('AppShell 侧栏状态', () => {
    it('徽标显示当前租户号；未选定时显示「未选定租户」', async () => {
        setTenantId(12)
        const wrapper = mountShell()
        expect(wrapper.find('.tenant-badge').text()).toBe('租户 #12')
        clearTenantId()
        await nextTick()
        expect(wrapper.find('.tenant-badge').text()).toBe('未选定租户')
    })

    it('折叠按钮切换 sidebarCollapsed，折叠后隐藏分组标题与菜单文字', async () => {
        const wrapper = mountShell()
        const store = useAppStore()
        expect(store.sidebarCollapsed).toBe(false)
        await wrapper.find('.collapse-btn').trigger('click')
        expect(store.sidebarCollapsed).toBe(true)
        expect(wrapper.findAll('.menu-group-title')).toHaveLength(0)
        expect(wrapper.find('.menu-title').exists()).toBe(false)
        // 折叠态以 title 提示菜单名（可及性）；此时无文字，改按 href 定位
        const modelsItem = itemByHref(wrapper, '/cmdb/models')
        expect(modelsItem.exists()).toBe(true)
        expect(modelsItem.attributes('title')).toBe('资源模型')
        await wrapper.find('.collapse-btn').trigger('click')
        expect(store.sidebarCollapsed).toBe(false)
        expect(wrapper.find('.menu-title').exists()).toBe(true)
    })
})

describe('AppShell WatchAlert 布局（黑底悬浮壳）', () => {
    it('无独立顶栏：header 职能（logo/租户/用户）全在侧边栏，结构齐全', () => {
        const wrapper = mountShell()
        // 侧边栏 header 区：居中 logo + 租户徽标 + 渐变分割线
        expect(wrapper.find('.sidebar-logo').exists()).toBe(true)
        expect(wrapper.find('.tenant-badge').exists()).toBe(true)
        expect(wrapper.find('.shell-divider').exists()).toBe(true)
        // 底部操作区：返回平台入口（WatchAlert 毛玻璃用户区同构）
        expect(wrapper.find('.sidebar-user .user-entry').exists()).toBe(true)
        // 内容列：悬浮圆角卡片 + 品牌 footer，无独立 header 元素
        expect(wrapper.find('.content-card').exists()).toBe(true)
        expect(wrapper.find('.app-main header').exists()).toBe(false)
    })

    it('返回平台入口指向运维平台首页（默认 /cam/，可用 VITE_PLATFORM_HOME 覆盖）', () => {
        const wrapper = mountShell()
        const entry = wrapper.find('.sidebar-user .user-entry')
        expect(entry.attributes('href')).toBe('/cam/')
        expect(entry.text()).toContain('返回平台')
    })

    it('footer 品牌文案与息壤 logo 存在（WatchAlert footer 同构）', () => {
        const wrapper = mountShell()
        expect(wrapper.find('.app-footer').text()).toContain('息壤 CMDB')
        expect(wrapper.find('.app-footer').text()).toContain('提供轻量级一站式配置管理服务')
        expect(wrapper.find('.sidebar-logo .logo-icon svg').exists()).toBe(true)
    })
})
