/**
 * 租户上下文 (e-cmdb-web 专用)
 * =============================================================
 * 设计背景: e-cmdb-web 作为平台嵌入应用,所有请求都需带 X-Tenant-Id 头
 * (后端 RequireTenant 中间件强约束, 缺则 403)。
 *
 * 平台跳转过来时, URL 带 `?tenant_id=<id>` (e.g. /cmdb/instances?tenant_id=5),
 * 路由守卫在进站时把它写入本模块; axios 请求拦截器每次请求都从本模块读 → 注入
 * `X-Tenant-Id` 头。
 *
 * 设计要点 (不引入 Pinia store 的理由):
 *  - 租户上下文是平台透传的会话事实, 不是前端 UI 状态, 不需要在组件间 reactivity
 *  - 整个 e-cmdb-web 没有 user store (无租户列表), 也没有"切租户"按钮
 *    (切租户动作在 haven-console 完成), 所以无需 Pinia 的 getter / setter 跨组件
 *  - 模块级 ref + 简单 getter/setter 已经足够, 避免多一层 Pinia 抽象
 *
 * Hard Rule:
 *  - getTenantId() 在请求拦截器热路径上调用, 必须 O(1), 不允许 any
 *    throw / 副作用
 *  - setTenantId(0) 等同于 clearTenantId(): 0 = 未选定 (与后端语义对齐)
 */
import { ref } from 'vue'

/** 当前租户 id; 0 = 未选定 (进站守卫未跑 / URL 未带 / 跳回平台态) */
const tenantId = ref<number>(0)

/**
 * 读取当前租户 id (供 axios 拦截器调用)
 * @returns 当前租户 id; 0 = 未选定
 */
export function getTenantId(): number {
    return tenantId.value
}

/**
 * 设置当前租户 id (供路由守卫 / 启动初始化调用)
 * @param id 租户 id; 传 0 等同于 clearTenantId
 */
export function setTenantId(id: number): void {
    tenantId.value = id
}

/**
 * 清除租户上下文 (401 / 登出 / 切到平台前清理; 当前未使用, 预留)
 */
export function clearTenantId(): void {
    tenantId.value = 0
}
