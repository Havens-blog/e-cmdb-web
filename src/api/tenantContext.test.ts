// @vitest-environment happy-dom
/**
 * tenantContext 模块: 平台透传的租户上下文单一真值。
 *
 * Hard Rule:
 *  - 0 = 未选定 (与后端 RequireTenant 语义对齐)
 *  - getTenantId() 在 axios 拦截器热路径调用, 必须 O(1)
 *  - setTenantId(0) 等同 clearTenantId()
 *
 * 模块级 ref: 每个用例需 vi.resetModules 隔离状态 (与 request/index.test.ts 同款模式)。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('tenantContext', () => {
    async function freshModule() {
        vi.resetModules()
        return await import('@/api/tenantContext')
    }

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('初值 0 (未选定)', async () => {
        const { getTenantId } = await freshModule()
        expect(getTenantId()).toBe(0)
    })

    it('setTenantId(5) -> getTenantId() === 5', async () => {
        const { getTenantId, setTenantId } = await freshModule()
        setTenantId(5)
        expect(getTenantId()).toBe(5)
    })

    it('setTenantId(0) 等同 clearTenantId()', async () => {
        const { clearTenantId, getTenantId, setTenantId } = await freshModule()
        setTenantId(7)
        expect(getTenantId()).toBe(7)
        setTenantId(0)
        expect(getTenantId()).toBe(0)
        setTenantId(9)
        clearTenantId()
        expect(getTenantId()).toBe(0)
    })

    it('setTenantId 接受任意整数 (含负数/超大值, 不抛错, 不归一化)', async () => {
        // tenantContext 不做归一化: 合法性由 parseTenantIdFromSearch 把关,
        // 拦截器只在 > 0 时下发头。
        const { getTenantId, setTenantId } = await freshModule()
        setTenantId(-3)
        expect(getTenantId()).toBe(-3)
        setTenantId(2 ** 40)
        expect(getTenantId()).toBe(2 ** 40)
    })
})
