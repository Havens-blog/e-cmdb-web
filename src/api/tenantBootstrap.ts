/**
 * 租户自愈：URL 未携带 tenant_id 时，经 eiam 会话兜底解析当前租户。
 *
 * 【为什么需要】
 * 路由守卫（feat/cmdb-tenant-context）最初只认 URL ?tenant_id=——任何不带参的
 * 入口（平台旧跳转 / 书签 / 刷新 / 控制台回跳）都会被弹回登录，即使会话完全
 * 有效，表现为「平台跳 CMDB 永远要重新登录」的死循环。
 *
 * 【自愈语义】
 * - 会话有效（eiam profile 返回 current_tenant_id > 0）→ 写入 tenantContext，
 *   守卫放行并把租户重写进 URL（书签/分享/刷新不再二次拉 profile）
 * - 未登录 / code != 0 / current_tenant_id <= 0（未选定租户）→ 返回 0，
 *   由守卫按既有语义弹回登录
 *
 * 端点与信封同 e-cam-web stores/user.ts：GET /api/iam/user/profile，
 * ginx 信封 { code, msg, data }，成功 code === 0，data.current_tenant_id 为数字。
 */
import { eiamAxios } from './request/eiam'
import { setTenantId, setTenantName } from './tenantContext'

interface ProfileTenant {
    id?: unknown
    name?: unknown
}

interface ProfileEnvelope {
    code?: number
    data?: { current_tenant_id?: unknown; tenants?: ProfileTenant[] }
}

/**
 * 从会话解析当前租户并写入 tenantContext。
 * @returns 当前租户 id；会话无效 / 未选定 / 请求失败 返回 0（不抛错）
 */
export async function bootstrapTenantFromSession(): Promise<number> {
    try {
        const res = await eiamAxios.get('/api/iam/user/profile')
        const body = res.data as ProfileEnvelope
        if (body?.code !== 0) return 0
        const raw = body.data?.current_tenant_id
        const tid = typeof raw === 'number' ? raw : Number(raw)
        if (!Number.isFinite(tid) || !Number.isInteger(tid) || tid <= 0) return 0
        setTenantId(tid)
        // 租户名：profile 的 tenants 数组按 current_tenant_id 匹配（与平台 TenantSelector 同款回退口径：
        // 找到→名称，找不到/空名→空串，UI 回退「租户 #<id>」）
        const tenants = Array.isArray(body.data?.tenants) ? body.data.tenants : []
        const match = tenants.find((t) => Number(t?.id) === tid)
        setTenantName(typeof match?.name === 'string' && match.name !== '' ? match.name : '')
        return tid
    } catch {
        // 网络/401 等：401 时 eiamAxios 拦截器已自行跳登录，这里静默归 0
        return 0
    }
}
