// @vitest-environment happy-dom
/**
 * parseTenantIdFromSearch / buildTenantUrl:
 *   平台跳转 URL `?tenant_id=<id>` 解析与构造。
 *
 * 设计口径:
 *  - 非数字 / 0 / 负数 / NaN 视为 "未带", 返回 0 (由路由守卫统一跳回平台)
 *  - buildTenantUrl 与 parseTenantIdFromSearch 互为反函数
 *  - 不依赖全局 URLSearchParams 兼容老浏览器
 */
import { describe, expect, it } from 'vitest'
import { buildTenantUrl, parseTenantIdFromSearch } from '@/utils/tenantFromUrl'

describe('parseTenantIdFromSearch', () => {
    it('无 search → 0', () => {
        expect(parseTenantIdFromSearch('')).toBe(0)
    })

    it('search 无 tenant_id → 0', () => {
        expect(parseTenantIdFromSearch('?tab=dashboard')).toBe(0)
    })

    it('合法正整数 (含前导 0) → 取数值', () => {
        expect(parseTenantIdFromSearch('?tenant_id=5')).toBe(5)
        expect(parseTenantIdFromSearch('?tenant_id=007')).toBe(7) // Number 去掉前导 0
    })

    it('search 含其它参数 → 正确提取 tenant_id', () => {
        expect(parseTenantIdFromSearch('?tab=dashboard&tenant_id=12&foo=bar')).toBe(12)
    })

    it('tenant_id=0 → 0 (视为未带, 由守卫跳回平台)', () => {
        expect(parseTenantIdFromSearch('?tenant_id=0')).toBe(0)
    })

    it('负数 / 非整数 / 非数字 → 0 (不抛错)', () => {
        expect(parseTenantIdFromSearch('?tenant_id=-3')).toBe(0)
        expect(parseTenantIdFromSearch('?tenant_id=1.5')).toBe(0)
        expect(parseTenantIdFromSearch('?tenant_id=abc')).toBe(0)
        expect(parseTenantIdFromSearch('?tenant_id=NaN')).toBe(0)
        expect(parseTenantIdFromSearch('?tenant_id=')).toBe(0) // 空值
    })

    it('缺 ? 前缀也兼容', () => {
        expect(parseTenantIdFromSearch('tenant_id=8')).toBe(8)
    })
})

describe('buildTenantUrl (parseTenantIdFromSearch 的反函数)', () => {
    it('tenantId=5 → 路径 + ?tenant_id=5', () => {
        expect(buildTenantUrl('/cmdb/instances', 5)).toBe('/cmdb/instances?tenant_id=5')
    })

    it('tenantId=0 → 不带参数', () => {
        // 0 = 未选定, 不下发, 路由守卫会让请求跳回平台
        expect(buildTenantUrl('/cmdb/dashboard', 0)).toBe('/cmdb/dashboard')
    })

    it('extra 参数一并附加 (不与 tenant_id 冲突)', () => {
        expect(buildTenantUrl('/cmdb/instances', 5, { tab: 'cert' })).toBe(
            '/cmdb/instances?tenant_id=5&tab=cert'
        )
    })

    it('与 parseTenantIdFromSearch 互逆 (合法值)', () => {
        const original = '/cmdb/audit?tenant_id=42'
        const tid = parseTenantIdFromSearch(original.slice(original.indexOf('?')))
        const rebuilt = buildTenantUrl('/cmdb/audit', tid)
        expect(parseTenantIdFromSearch(rebuilt.slice(rebuilt.indexOf('?')))).toBe(tid)
    })
})
