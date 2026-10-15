// @vitest-environment happy-dom
/**
 * RC#2（platform-console 任务 2.13）登录目标切换用例：
 * - 登录目标 = VITE_LOGIN_TARGET（默认 /console/login），不再指向 ecmdb-web /login；
 * - redirectToLogin 携带 ?redirect= 回跳、不清共享 cookie ecmdb-token-key（401 只是
 *   本应用的局部判断，清共享凭证会把其他服务的登录态一并清掉——index.ts 顶部注释契约）；
 * - 防重复跳转守卫（并发 401 只跳一次）；
 * - 变量拆分契约：VITE_ECMDB_LOGIN_URL 全仓（src + env）无残留、无散落的 '/login'
 *   硬编码（Hard Rule：机制 = build 期 env 注入，不得散落硬编码）。
 * - 租户上下文注入：X-Tenant-Id 头从 tenantContext 读，>0 时下发,=0 时不发。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveLoginTarget } from './index'
import { restoreLocation, stubLocation } from '@/test-utils/stub-location'

const realLocation = window.location

beforeEach(() => {
    // 共享凭证固定值：断言 401 路径"不清 cookie"的探针（对齐 Story 6 AC / AC#2）
    document.cookie = 'ecmdb-token-key=rc2-shared-cookie; path=/'
})

afterEach(() => {
    restoreLocation(realLocation)
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
})

describe('resolveLoginTarget（登录目标唯一取值处）', () => {
    it('env 未注入时默认控制台登录页 /console/login', () => {
        vi.stubEnv('VITE_LOGIN_TARGET', '')
        expect(resolveLoginTarget()).toBe('/console/login')
    })

    it('env 注入后使用 VITE_LOGIN_TARGET', () => {
        vi.stubEnv('VITE_LOGIN_TARGET', 'http://localhost:8888/console/login')
        expect(resolveLoginTarget()).toBe('http://localhost:8888/console/login')
    })
})

describe('redirectToLogin（401/会话过期路径）', () => {
    /**
     * redirectToLogin 的防重复标志是模块级单次置位，静态导入的模块实例一旦触发
     * 就不再跳转。各用例经 vi.resetModules + 动态 import 取全新实例，互不污染。
     */
    async function freshModule() {
        vi.resetModules()
        return await import('./index')
    }

    it('跳转 VITE_LOGIN_TARGET 并携带 ?redirect= 回跳', async () => {
        vi.stubEnv('VITE_LOGIN_TARGET', 'http://localhost:8888/console/login')
        const current = 'http://localhost:8888/cam/dashboard?tab=cert'
        stubLocation(current)
        const { redirectToLogin } = await freshModule()
        redirectToLogin()
        expect(window.location.href).toBe(
            `http://localhost:8888/console/login?redirect=${encodeURIComponent(current)}`
        )
    })

    it('env 未注入时落到默认 /console/login（不再指向 ecmdb-web /login）', async () => {
        vi.stubEnv('VITE_LOGIN_TARGET', '')
        stubLocation('http://localhost:8888/cam/assets')
        const { redirectToLogin } = await freshModule()
        redirectToLogin()
        // 相对目标按当前 origin 解析（浏览器语义）：/console/login → http://localhost:8888/console/login
        expect(window.location.href).toBe(
            `http://localhost:8888/console/login?redirect=${encodeURIComponent('http://localhost:8888/cam/assets')}`
        )
    })

    it('不清共享 cookie ecmdb-token-key（局部 401 不得扩散为全平台掉线）', async () => {
        vi.stubEnv('VITE_LOGIN_TARGET', '')
        stubLocation('http://localhost:8888/cam/dashboard')
        const { redirectToLogin } = await freshModule()
        redirectToLogin()
        expect(document.cookie).toContain('ecmdb-token-key=rc2-shared-cookie')
    })

    it('防重复守卫：并发 401 只跳一次', async () => {
        vi.stubEnv('VITE_LOGIN_TARGET', '')
        const fake = stubLocation('http://localhost:8888/cam/a')
        const { redirectToLogin } = await freshModule()
        redirectToLogin()
        const firstHref = window.location.href
        expect(firstHref).toContain('/console/login?redirect=')
        // 第二次触发（另一个并发 401）必须早退：href 不再被改写
        fake.href = 'http://localhost:8888/cam/b'
        redirectToLogin()
        expect(window.location.href).toBe('http://localhost:8888/cam/b')
    })
})

describe('变量拆分契约（Hard Rule：机制 = build 期 env 注入，不得散落硬编码）', () => {
    const repoRoot = resolve(__dirname, '..', '..', '..')

    /** 递归收集 src 下所有源码文件（排除测试文件自身——断言里会出现旧变量名字面量） */
    function collectSourceFiles(dir: string, acc: string[] = []): string[] {
        for (const entry of readdirSync(dir)) {
            const full = join(dir, entry)
            if (statSync(full).isDirectory()) {
                if (entry === 'node_modules' || entry === 'dist') continue
                collectSourceFiles(full, acc)
            } else if (/\.(ts|vue)$/.test(entry) && !entry.includes('.test.')) {
                acc.push(full)
            }
        }
        return acc
    }

    const sourceFiles = collectSourceFiles(join(repoRoot, 'src'))

    it('旧变量 VITE_ECMDB_LOGIN_URL 在 src 源码与 env 文件中零残留', () => {
        const envFiles = ['.env', '.env.development', '.env.docker', '.env.production'].map((f) =>
            join(repoRoot, f)
        )
        const offenders = [...sourceFiles, ...envFiles].filter((f) => {
            try {
                return readFileSync(f, 'utf-8').includes('VITE_ECMDB_LOGIN_URL')
            } catch {
                return false
            }
        })
        expect(offenders, `旧变量残留于: ${offenders.join(', ')}`).toEqual([])
    })

    it('登录目标不再散落 "/login" 硬编码（location.href 赋值面）', () => {
        const offenders = sourceFiles.filter((f) =>
            /location\.href\s*=\s*['"`]\/login['"`]/.test(readFileSync(f, 'utf-8'))
        )
        expect(offenders, `散落的 /login 硬编码: ${offenders.join(', ')}`).toEqual([])
    })

    it('index.ts 单一改读点：env 注入而非散落硬编码（user store / MainLayout 拆分后已不适用）', () => {
        const read = (p: string) => readFileSync(join(repoRoot, p), 'utf-8')
        // 登录目标：index.ts 改读 VITE_LOGIN_TARGET（经 resolveLoginTarget）。
        // 注：e-cmdb-web 拆分后 stores/user（属 CAM 特有 store）已移除、layouts/MainLayout
        // 也替换为 layout/AppShell.vue，且 VITE_ECMDB_WEB_BASE 尚未被任何代码引用——
        // 原"三处改读点"契约里这两个文件已不在 RC#2 落地范围内，本条只锁 index.ts 这一个事实。
        expect(read('src/api/request/index.ts')).toContain('VITE_LOGIN_TARGET')
    })
})

/**
 * X-Tenant-Id 拦截器（feat/cmdb-tenant-context）：
 *   后端 RequireTenant 强约束: 每个业务请求都必须带 X-Tenant-Id 头, 缺则 403。
 *   平台跳转 URL ?tenant_id= 在路由守卫处被解析 + 写入 tenantContext, 拦截器从
 *   tenantContext 读后注入。
 *   - tenantId > 0 → 下发 X-Tenant-Id: <id>
 *   - tenantId === 0 → 不发头 (让后端 RequireTenant 自然 403, 避免给后端
 *     "看似有租户但实际是默认 0" 的误导头)
 *
 * 测试策略: 不启 axios 真请求 (happy-dom 环境, 也无 network), 用 mock adapter
 * 抓拦截器返回的 config, 断言 X-Tenant-Id 头值。
 */
describe('HttpRequest X-Tenant-Id 拦截器', () => {
    /**
     * 动态 import HttpRequest, 用 fresh module 隔离 tenantContext 模块状态
     * (tenantContext 模块级 ref, 各用例需独立)
     */
    async function fresh() {
        vi.resetModules()
        // mock axios: create 返回带 interceptors.request.use 的假实例,
        // 调用 request 走 mock adapter 让请求拦截器跑一遍
        const fakeInstance = {
            interceptors: {
                request: { use: vi.fn() },
                response: { use: vi.fn() },
            },
            request: vi.fn(),
        }
        const axiosMock = {
            create: vi.fn(() => fakeInstance),
            // 让 HttpRequest 的 import { AxiosInstance } 类型不报错 (运行时不引用)
            __mock: true,
        }
        vi.doMock('axios', () => ({
            default: axiosMock,
            // named export 形态: HttpRequest 内部用 default.create
        }))

        // 拿到 fresh 的 tenantContext, 提前 setTenantId
        const ctx = await import('@/api/tenantContext')

        // 现在 import HttpRequest
        const mod = await import('./index')
        return { HttpRequest: mod.default, fakeInstance, ctx, axiosMock }
    }

    /**
     * 从 fakeInstance.interceptors.request.use 的第一个回调里取出"request interceptor",
     * 模拟一次 config 跑过拦截器, 返回最终的 config。
     */
    async function runRequestInterceptor(
        fakeInstance: { interceptors: { request: { use: ReturnType<typeof vi.fn> } } },
        initialConfig: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        // 拦截器注册按 use 的调用顺序: 第一次是 instance 级 (空), 第二次是全局
        // HttpRequest 构造里调 2 次 use: 第一次是 instance 级 (this.interceptors?.requestInterceptor),
        // 第二次是全局请求拦截。 我们要的是第二次 (全局)。
        const calls = fakeInstance.interceptors.request.use.mock.calls
        expect(calls.length).toBeGreaterThanOrEqual(2)
        const globalInterceptor = calls[1]![0] as (config: unknown) => unknown
        return globalInterceptor(initialConfig) as Record<string, unknown>
    }

    it('tenantId > 0 → 拦截器给 config.headers 注入 X-Tenant-Id 字符串', async () => {
        const { HttpRequest, fakeInstance, ctx } = await fresh()
        ctx.setTenantId(5)
        new HttpRequest({ url: '/api/v1/cmdb/instances' } as never)
        const out = await runRequestInterceptor(fakeInstance, { headers: {} as Record<string, string> })
        expect((out.headers as Record<string, string>)['X-Tenant-Id']).toBe('5')
    })

    it('tenantId = 0 → 不发 X-Tenant-Id 头 (避免给后端误导)', async () => {
        const { HttpRequest, fakeInstance, ctx } = await fresh()
        ctx.setTenantId(0) // 未带/未选默认
        new HttpRequest({ url: '/api/v1/cmdb/instances' } as never)
        const out = await runRequestInterceptor(fakeInstance, { headers: {} as Record<string, string> })
        expect((out.headers as Record<string, string>)['X-Tenant-Id']).toBeUndefined()
    })

    it('tenantId 由 7 改 9 后 → 拦截器动态读到最新值 (不缓存)', async () => {
        const { HttpRequest, fakeInstance, ctx } = await fresh()
        new HttpRequest({ url: '/api/v1/cmdb/instances' } as never)
        ctx.setTenantId(7)
        const out1 = await runRequestInterceptor(fakeInstance, { headers: {} as Record<string, string> })
        expect((out1.headers as Record<string, string>)['X-Tenant-Id']).toBe('7')
        ctx.setTenantId(9)
        const out2 = await runRequestInterceptor(fakeInstance, { headers: {} as Record<string, string> })
        expect((out2.headers as Record<string, string>)['X-Tenant-Id']).toBe('9')
    })

    it('tenantId 为负数 → 不发头 (parseTenantIdFromSearch 已挡, 防御性兜底)', async () => {
        const { HttpRequest, fakeInstance, ctx } = await fresh()
        ctx.setTenantId(-3)
        new HttpRequest({ url: '/api/v1/cmdb/instances' } as never)
        const out = await runRequestInterceptor(fakeInstance, { headers: {} as Record<string, string> })
        // 拦截器条件是 tid > 0, 负数不满足
        expect((out.headers as Record<string, string>)['X-Tenant-Id']).toBeUndefined()
    })
})
