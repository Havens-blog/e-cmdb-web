/**
 * tenantBootstrap 租户自愈单测。
 *
 * 背景：URL 未带 tenant_id 时经 eiam profile 兜底解析当前租户——否则任何不带参
 * 入口（平台旧跳转/书签/刷新/控制台回跳）都被弹回登录，即使会话有效。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearTenantId, getTenantId, getTenantName } from './tenantContext'

const profileGet = vi.fn()

vi.mock('./request/eiam', () => ({
    eiamAxios: {
        get: (...args: unknown[]) => profileGet(...args),
    },
}))

import { bootstrapTenantFromSession } from './tenantBootstrap'

beforeEach(() => {
    clearTenantId()
    profileGet.mockReset()
})

describe('bootstrapTenantFromSession', () => {
    it('会话有效：current_tenant_id=7 → 返回 7 并写入 tenantContext', async () => {
        profileGet.mockResolvedValue({ data: { code: 0, data: { current_tenant_id: 7 } } })
        await expect(bootstrapTenantFromSession()).resolves.toBe(7)
        expect(getTenantId()).toBe(7)
    })

    it('数字字符串 "7" 兼容 → 7', async () => {
        profileGet.mockResolvedValue({ data: { code: 0, data: { current_tenant_id: '7' } } })
        await expect(bootstrapTenantFromSession()).resolves.toBe(7)
        expect(getTenantId()).toBe(7)
    })

    it('信封 code≠0 → 0，且不写 tenantContext', async () => {
        profileGet.mockResolvedValue({ data: { code: 401, msg: 'unauthorized' } })
        await expect(bootstrapTenantFromSession()).resolves.toBe(0)
        expect(getTenantId()).toBe(0)
    })

    it('未选定租户（current_tenant_id=0）→ 0', async () => {
        profileGet.mockResolvedValue({ data: { code: 0, data: { current_tenant_id: 0 } } })
        await expect(bootstrapTenantFromSession()).resolves.toBe(0)
        expect(getTenantId()).toBe(0)
    })

    it('载荷缺失（current_tenant_id undefined）→ 0', async () => {
        profileGet.mockResolvedValue({ data: { code: 0, data: {} } })
        await expect(bootstrapTenantFromSession()).resolves.toBe(0)
    })

    it('非整数/非数字值 → 0（防御）', async () => {
        profileGet.mockResolvedValue({ data: { code: 0, data: { current_tenant_id: 1.5 } } })
        await expect(bootstrapTenantFromSession()).resolves.toBe(0)
        profileGet.mockResolvedValue({ data: { code: 0, data: { current_tenant_id: 'abc' } } })
        await expect(bootstrapTenantFromSession()).resolves.toBe(0)
    })

    it('网络异常 reject → 0（不向守卫抛错）', async () => {
        profileGet.mockRejectedValue(new Error('Network Error'))
        await expect(bootstrapTenantFromSession()).resolves.toBe(0)
        expect(getTenantId()).toBe(0)
    })

    it('会话有效：profile tenants 数组按 current_tenant_id 匹配写入租户名', async () => {
        profileGet.mockResolvedValue({
            data: {
                code: 0,
                data: {
                    current_tenant_id: 7,
                    tenants: [
                        { id: 3, name: '甲租户' },
                        { id: 7, name: '息壤科技' },
                    ],
                },
            },
        })
        await expect(bootstrapTenantFromSession()).resolves.toBe(7)
        expect(getTenantId()).toBe(7)
        expect(getTenantName()).toBe('息壤科技')
    })

    it('租户名缺失/空串 → 空串（UI 回退「租户 #<id>」）', async () => {
        profileGet.mockResolvedValue({
            data: {
                code: 0,
                data: { current_tenant_id: 7, tenants: [{ id: 3, name: '甲租户' }] },
            },
        })
        await expect(bootstrapTenantFromSession()).resolves.toBe(7)
        expect(getTenantName()).toBe('')

        profileGet.mockResolvedValue({
            data: {
                code: 0,
                data: { current_tenant_id: 7, tenants: [{ id: 7, name: '' }] },
            },
        })
        await expect(bootstrapTenantFromSession()).resolves.toBe(7)
        expect(getTenantName()).toBe('')
    })
})
