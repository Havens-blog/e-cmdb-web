import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import routes from './routes'
import { setTenantId } from '@/api/tenantContext'
import { parseTenantIdFromSearch } from '@/utils/tenantFromUrl'
import { resolveLoginTarget } from '@/api/request'

/**
 * e-cmdb-web 路由（base '/cmdb/'，与 vite base 一致）。
 *
 * 鉴权口径：本应用无本地登录页——会话 cookie（ecmdb-token-key）+ Bearer 由请求层
 * 承载，401 统一跳控制台登录（/console/login）。路由守卫（eiam 登录跳转等 CAM
 * 特有逻辑）已在迁移中移除，直接放行渲染。
 *
 * 租户守卫:
 *   e-cmdb-web 作为平台嵌入应用, 平台跳转过来时 URL 带 `?tenant_id=<id>`。
 *   每次路由切换时:
 *     1) 从 URL 解析 tenant_id, setTenantId() 写全局
 *     2) 若 URL 未带或非法 (0), 跳回平台登录 (缺租户无业务可看, 必跳回选租户)
 *   不豁免任何路由——所有 e-cmdb-web 业务页都需要租户上下文。
 *
 *   跳回目标的优先级 (与 login redirect 同款):
 *     resolveLoginTarget() (build env VITE_LOGIN_TARGET) + ?redirect=<currentUrl>
 *   平台登录页/工作台收到后, 用户登录/选租户后由平台跳回带租户头的目标 URL。
 */
export const router = createRouter({
    // BASE_URL 来自 vite base '/cmdb/'，与 nginx 同域反代形态一致
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
})

/**
 * 租户守卫:每次路由切换都跑,保证 SPA 内 push 路由也带最新 tenant_id。
 * 返回 false = 跳回平台; 返回 true = 放行。
 */
function ensureTenant(to: RouteLocationNormalized): boolean {
    // 从 to.fullPath 切出 search 部分 (含 '?' 前缀)
    const qIndex = to.fullPath.indexOf('?')
    const search = qIndex >= 0 ? to.fullPath.slice(qIndex) : undefined
    const tid = parseTenantIdFromSearch(search)
    if (tid > 0) {
        setTenantId(tid)
        return true
    }
    // 未带/非法: 跳回控制台登录 + 带 redirect
    const currentUrl = window.location.href
    const loginUrl = `${resolveLoginTarget()}?redirect=${encodeURIComponent(currentUrl)}`
    window.location.replace(loginUrl)
    return false
}

router.beforeEach((to, _from, next) => {
    if (ensureTenant(to)) {
        next()
    } else {
        // 跳回平台中, 不调 next() (已经 replace 整页了)
        next(false)
    }
})
