/**
 * 平台跳转租户 ID 解析。
 *
 * e-cmdb-web 作为平台嵌入应用, 由 haven-console / e-cam-web 等父级跳转过来时
 * URL 携带 `?tenant_id=<id>`。本模块从 URL search 解析这个参数, 供
 * 1) main.ts 启动时初始化
 * 2) router beforeEach 守卫每次切换路由时刷新 (因为 SPA 内部可能 push 掉 search)
 *
 * 设计要点:
 *  - 解析失败 (非数字 / 0 / 负数 / NaN) 视为 "未带", 不抛错, 由路由守卫
 *    统一处理 (跳回平台)
 *  - 不依赖 URLSearchParams API (老浏览器兼容, 也便于测试)
 */
const TENANT_ID_PARAM = 'tenant_id'

/**
 * 从 URL 解析 tenant_id
 * @param search 可选, 默认读 window.location.search (含 '?' 前缀)
 * @returns 合法租户 id; 未带 / 非法 返回 0
 */
export function parseTenantIdFromSearch(search?: string): number {
    const raw = search ?? (typeof window !== 'undefined' ? window.location.search : '')
    if (!raw) return 0
    // raw 可能以 '?' 开头
    const params = new URLSearchParams(raw.startsWith('?') ? raw : `?${raw}`)
    const value = params.get(TENANT_ID_PARAM)
    if (value === null || value === '') return 0
    const id = Number(value)
    // 校验: 必须是正整数
    if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) return 0
    return id
}

/**
 * 构造带 tenant_id 的 URL (供路由守卫跳回平台时使用, 也可被页面 push 用)
 * @param base 基础路径, e.g. '/console/workbench'
 * @param tenantId 租户 id; 0 表示不带
 * @param extra 额外参数
 * @returns 完整 URL 字符串
 */
export function buildTenantUrl(base: string, tenantId: number, extra?: Record<string, string>): string {
    const params = new URLSearchParams()
    if (tenantId > 0) params.set(TENANT_ID_PARAM, String(tenantId))
    if (extra) {
        for (const [k, v] of Object.entries(extra)) params.set(k, v)
    }
    const qs = params.toString()
    return qs ? `${base}?${qs}` : base
}
