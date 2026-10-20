// @vitest-environment happy-dom
/**
 * 租户守卫（tenantGuard）单测——三级递进：
 *   1) URL ?tenant_id= 显式 → 采信放行，不调 profile
 *   2) URL 未带 → eiam 会话自愈：profile 拉到租户 → 重写 URL（保留既有 query）放行
 *   3) 会话无效 → 弹回 /console/login?redirect=…
 *
 * 回归：修复前只有 1/3 两级，任何不带参入口都被弹登录（即使会话有效），
 * 平台跳 CMDB 表现为「永远要重新登录」。
 */
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import { clearTenantId, getTenantId } from '@/api/tenantContext'
import { restoreLocation } from '@/test-utils/stub-location'

const profileGet = vi.fn()
const replaceSpy = vi.fn()

vi.mock('@/api/request/eiam', () => ({
    eiamAxios: {
        get: (...args: unknown[]) => profileGet(...args),
    },
}))

vi.mock('@/api/request', () => ({
    resolveLoginTarget: () => '/console/login',
}))

import { tenantGuard } from '../index'

/** 构造最小 RouteLocationNormalized 形状（守卫只读 fullPath/path/query） */
function toAt(fullPath: string): RouteLocationNormalized {
    const qIndex = fullPath.indexOf('?')
    const path = qIndex >= 0 ? fullPath.slice(0, qIndex) : fullPath
    const search = qIndex >= 0 ? fullPath.slice(qIndex + 1) : ''
    return {
        fullPath,
        path,
        query: Object.fromEntries(new URLSearchParams(search)),
    } as unknown as RouteLocationNormalized
}

beforeEach(() => {
    clearTenantId()
    profileGet.mockReset()
    replaceSpy.mockReset()
    Object.defineProperty(window, 'location', {
        value: { replace: replaceSpy, href: 'http://localhost:5176/cmdb/models' },
        configurable: true,
        writable: true,
    })
    setActivePinia(createPinia())
})

describe('守卫分支 1：URL 显式租户', () => {
    it('tenant_id=5 → 放行 + 写入上下文，不调 profile', async () => {
        await expect(tenantGuard(toAt('/cmdb/models?tenant_id=5'))).resolves.toBe(true)
        expect(getTenantId()).toBe(5)
        expect(profileGet).not.toHaveBeenCalled()
    })

    it('非法值 tenant_id=abc → 落入会话自愈分支', async () => {
        profileGet.mockResolvedValue({ data: { code: 0, data: { current_tenant_id: 7 } } })
        await expect(tenantGuard(toAt('/cmdb/models?tenant_id=abc'))).resolves.toMatchObject({
            path: '/cmdb/models',
            query: { tenant_id: '7' },
        })
    })
})

describe('守卫分支 2：会话自愈（修复点）', () => {
    it('URL 无参 + 会话租户 7 → 重写 URL 带上 tenant_id=7 并放行', async () => {
        profileGet.mockResolvedValue({ data: { code: 0, data: { current_tenant_id: 7 } } })
        await expect(tenantGuard(toAt('/cmdb/models'))).resolves.toMatchObject({
            path: '/cmdb/models',
            query: { tenant_id: '7' },
            replace: true,
        })
        expect(getTenantId()).toBe(7)
        expect(profileGet).toHaveBeenCalledTimes(1)
    })

    it('既有 query 保留（tab=cert 不丢）', async () => {
        profileGet.mockResolvedValue({ data: { code: 0, data: { current_tenant_id: 3 } } })
        await expect(tenantGuard(toAt('/cmdb/instances?tab=cert'))).resolves.toMatchObject({
            path: '/cmdb/instances',
            query: { tab: 'cert', tenant_id: '3' },
        })
    })

    it('重写后的 URL 再进守卫（tenant_id=7）→ 走分支 1 放行，不再调 profile（天然终止）', async () => {
        profileGet.mockResolvedValue({ data: { code: 0, data: { current_tenant_id: 7 } } })
        const first = await tenantGuard(toAt('/cmdb/models'))
        expect(first).not.toBe(true)
        const second = await tenantGuard(toAt('/cmdb/models?tenant_id=7'))
        expect(second).toBe(true)
        expect(profileGet).toHaveBeenCalledTimes(1)
    })
})

describe('守卫分支 3：会话无效弹登录', () => {
    it('profile code≠0 → replace 到 /console/login?redirect=<当前URL>，中止导航', async () => {
        profileGet.mockResolvedValue({ data: { code: 401, msg: 'unauthorized' } })
        await expect(tenantGuard(toAt('/cmdb/models'))).resolves.toBe(false)
        expect(replaceSpy).toHaveBeenCalledTimes(1)
        const call = replaceSpy.mock.calls[0]
        expect(call).toBeDefined()
        const url = String(call?.[0])
        expect(url.startsWith('/console/login?redirect=')).toBe(true)
        expect(decodeURIComponent(url)).toContain('http://localhost:5176/cmdb/models')
    })

    it('profile 网络异常 → 同样弹登录（守卫不抛错）', async () => {
        profileGet.mockRejectedValue(new Error('Network Error'))
        await expect(tenantGuard(toAt('/cmdb/models'))).resolves.toBe(false)
        expect(replaceSpy).toHaveBeenCalledTimes(1)
    })

    it('会话有效但未选定租户（0）→ 弹登录', async () => {
        profileGet.mockResolvedValue({ data: { code: 0, data: { current_tenant_id: 0 } } })
        await expect(tenantGuard(toAt('/cmdb/models'))).resolves.toBe(false)
        expect(replaceSpy).toHaveBeenCalledTimes(1)
    })
})

describe('守卫后置清理', () => {
    it('restoreLocation 可还原（避免污染其他用例）', async () => {
        const original = window.location
        profileGet.mockResolvedValue({ data: { code: 401 } })
        await tenantGuard(toAt('/cmdb/models'))
        restoreLocation(original)
        expect(window.location).toBe(original)
    })
})
