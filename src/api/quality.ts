/**
 * 数据质量 API（e-cmdb-service 本地能力）
 * 端点：/api/v1/cmdb/quality/*
 *
 * 泛型约定：instance.get<T> 的 T 是响应体内层 data 的类型
 * （ResponseData<T> = { code, msg, data: T }，信封由请求层统一承载）。
 */
import instance from './request/service'

// ==================== 类型 ====================
export interface QualityOverview {
    total_instances: number
    orphan_count: number
    missing_field_count: number
    dangling_relation_count: number
    health_score: number
}

export interface QualityIssue {
    type: string
    instance_id?: number
    asset_id?: string
    asset_name?: string
    model_uid?: string
    field_uid?: string
    field_name?: string
    relation_id?: number
    description: string
}

export interface QualityIssueList {
    items: QualityIssue[]
    total: number
}


/** 孤儿实例来源：按缺失模型聚合 */
export interface OrphanModelGroup {
    model_uid: string
    count: number
}

/** 孤儿实例来源分布 */
export interface OrphanSourceResult {
    total: number
    groups: OrphanModelGroup[]
}
// ==================== 函数 ====================

/** 获取质量概览与健康度 */
export function getQualityOverviewApi() {
    return instance.get<QualityOverview>({ url: '/cmdb/quality/overview' })
}

/** 分页列出质量问题 */
export function listQualityIssuesApi(params: { type: string; offset?: number; limit?: number }) {
    return instance.get<QualityIssueList>({ url: '/cmdb/quality/issues', params })
}

/**
 * 孤儿实例来源分布（按 model_uid 聚合，降序）。
 *
 * 背景：/quality/overview 只给 orphan_count 总数，
 * /quality/issues?type=orphan_instance 只给逐条分页明细，
 * 两者都无法回答「这些孤儿主要是哪些模型缺失导致的」。
 * 实测 tenant 3：12760 条孤儿来自 58 个未定义模型，
 * 补上本接口后才知道该补哪些模型。
 */
export function getOrphanSourcesApi() {
    return instance.get<OrphanSourceResult>({ url: '/cmdb/quality/orphan-sources' })
}