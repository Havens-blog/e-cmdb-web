import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import routes from './routes'
import { setTenantId } from '@/api/tenantContext'
import { bootstrapTenantFromSession } from '@/api/tenantBootstrap'
import { parseTenantIdFromSearch } from '@/utils/tenantFromUrl'
import { resolveLoginTarget } from '@/api/request'

/**
 * e-cmdb-web 路由（base '/cmdb/'，与 vite base 一致）。
 *
 * 鉴权口径：本应用无本地登录页——会话 cookie（ecmdb-token-key）+ Bearer 由请求层
 * 承载，401 统一跳控制台登录（/console/login）。路由守卫（eiam 登录跳转等 CAM
 * 特有逻辑）已在迁移中移除，直接放行渲染。
 *
 * 租户守卫（三级递进，fix/cmdb-tenant-bootstrap）:
 *   1) URL ?tenant_id= 显式携带（平台跳转 / SPA 内 AppShell 菜单）→ 直接采信，
 *      setTenantId() 后放行——每次切换都会刷新，SPA 内 push 不会丢租户
 *   2) URL 未带 → 会话自愈：经 eiam profile 拉 current_tenant_id（会话有效时
 *      无感进入，并把租户重写进 URL 使书签/刷新/分享显式化）。此前的实现缺这级，
 *      任何不带参入口都被弹回登录，即使会话完全有效——表现为「平台跳 CMDB
 *      永远要重新登录」的死循环
 *   3) 会话也无效 / 未选定租户 → 弹回控制台登录（resolveLoginTarget + ?redirect=）
 *
 *   不豁免任何路由——所有 e-cmdb-web 业务页都需要租户上下文。
 */
export const router = createRouter({
    // BASE_URL 来自 vite base '/cmdb/'，与 nginx 同域反代形态一致
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
})

/**
 * 租户守卫（可导出以便单测直接驱动，不依赖真实路由实例）。
 * 返回值语义与 vue-router beforeEach 一致：true 放行 / false 中止 /
 * 位置对象重定向。
 */
export async function tenantGuard(to: RouteLocationNormalized): Promise<true | false | { path: string; query: Record<string, string>; replace: boolean }> {
    // 1) URL 显式租户：直接采信（守卫每次都跑，SPA 内 push 也带最新值）
    const qIndex = to.fullPath.indexOf('?')
    const search = qIndex >= 0 ? to.fullPath.slice(qIndex) : undefined
    const tid = parseTenantIdFromSearch(search)
    if (tid > 0) {
        setTenantId(tid)
        return true
    }

    // 2) 会话自愈：profile 拉当前租户（bootstrapTenantFromSession 内部已写入
    //    tenantContext；失败/未选定返回 0 不抛错）
    const sessionTid = await bootstrapTenantFromSession()
    if (sessionTid > 0) {
        // 重写 URL 使租户显式化：保留既有 query，追加 tenant_id。
        // 返回新位置会再进一次本守卫，届时走分支 1) 放行，天然终止。
        return {
            path: to.path,
            query: { ...to.query, tenant_id: String(sessionTid) },
            replace: true,
        }
    }

    // 3) 未认证 / 未选定租户：跳回控制台登录 + redirect 回跳
    const currentUrl = window.location.href
    const loginUrl = `${resolveLoginTarget()}?redirect=${encodeURIComponent(currentUrl)}`
    window.location.replace(loginUrl)
    return false
}

router.beforeEach(tenantGuard)
