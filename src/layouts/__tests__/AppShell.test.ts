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
    it('渲染全部分组标题与 8 个菜单项', () => {
        const wrapper = mountShell()
        const titles = wrapper.findAll('.menu-item').map((w) => w.text())
        expect(titles).toHaveLength(allItems.length)
        expect(titles).toContain('资源模型')
        expect(titles).toContain('资源实例')
        expect(titles).toContain('模型关系')
        expect(titles).toContain('拓扑视图')
        expect(titles).toContain('服务树')
        expect(titles).toContain('环境管理')
        expect(titles).toContain('绑定规则')
        expect(titles).toContain('资源拓扑')
        const groupTitles = wrapper.findAll('.menu-group-title').map((w) => w.text())
        expect(groupTitles).toEqual(['CMDB', '服务树', '洞察'])
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
