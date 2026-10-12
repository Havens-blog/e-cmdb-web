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

// ==================== 函数 ====================

/** 获取质量概览与健康度 */
export function getQualityOverviewApi() {
    return instance.get<QualityOverview>({ url: '/cmdb/quality/overview' })
}

/** 分页列出质量问题 */
export function listQualityIssuesApi(params: { type: string; offset?: number; limit?: number }) {
    return instance.get<QualityIssueList>({ url: '/cmdb/quality/issues', params })
}
