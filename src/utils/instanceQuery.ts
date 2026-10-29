/**
 * 实例列表查询参数构造。
 *
 * 背景：本模块多次出现"筛选条件没传到后端"或"传了错误字段名"的问题
 * （如前端传 `uid` 而后端要 `model_uid`）。把参数构造抽成纯函数并加单测，
 * 锁住「前端筛选键 → 后端 query 参数」的映射关系。
 */

/** 页面筛选状态（与组件内 filters 对应） */
export interface InstanceFilterState {
    keyword?: string
    asset_type?: string
    provider?: string
    region?: string
    model_uid?: string
}

/**
 * 构造 `GET /cmdb/instances` 的查询参数。
 *
 * 约定（与后端 instance_handler.List 对齐）：
 * - 分页用 `offset` + `limit`（不是 page/pageSize）
 * - 资产类型筛选映射为 `model_uid`（后端字段名，非 `uid`）
 * - 空字符串筛选不传，避免后端把空串当有效条件
 *
 * 优先级：`model_uid`（模型下钻，通常来自 URL）与 `asset_type`（资产类型下拉）
 * 共用后端 `model_uid` 参数。**同时存在时以 `asset_type` 为准**——它是用户的
 * 显式操作，而 `model_uid` 多来自进入页面时的 URL。
 * 历史缺陷：原实现反过来（model_uid 覆盖 asset_type），导致「带 model_uid 进入后
 * 在下拉里改选类型，筛选完全不生效」（实测请求仍为旧 model_uid）。
 *
 * @param filters 当前筛选状态
 * @param page    页码（从 1 开始）
 * @param size    每页条数
 */
export function buildInstanceListParams(
    filters: InstanceFilterState,
    page: number,
    size: number
): Record<string, string | number> {
    const params: Record<string, string | number> = {
        offset: (page - 1) * size,
        limit: size,
    }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.provider) params.provider = filters.provider
    if (filters.region) params.region = filters.region

    // 资产类型优先于模型下钻：用户在下拉中的显式选择应覆盖 URL 带入的 model_uid
    const modelUID = filters.asset_type || filters.model_uid
    if (modelUID) params.model_uid = modelUID

    return params
}
