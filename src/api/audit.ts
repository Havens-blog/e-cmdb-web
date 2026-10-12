/**
 * 变更审计 API（编排层：转发 e-cam-service /api/v1/cam/audit/changes）
 * 端点：/api/v1/cmdb/audit/*
 */
import instance from './request/service'

// ==================== 类型 ====================
export interface ChangeRecord {
    id?: number
    asset_id?: string
    field_name?: string
    old_value?: any
    new_value?: any
    change_source?: string
    change_task_id?: string
    operator?: string
    create_time?: number
}

export interface ChangeSummary {
    total?: number
    by_model?: Record<string, number>
    by_field?: Record<string, number>
    by_provider?: Record<string, number>
}

export interface ChangeList {
    items: ChangeRecord[]
    total: number
}

// ==================== 函数 ====================

/** 查询变更历史 */
export function listChangesApi(params: {
    asset_id?: string
    field_name?: string
    start_time?: number
    end_time?: number
    offset?: number
    limit?: number
}) {
    return instance.get<ChangeList>({ url: '/cmdb/audit/changes', params })
}

/** 获取变更统计汇总 */
export function getChangeSummaryApi(params: {
    model_uid?: string
    provider?: string
    start_time?: number
    end_time?: number
}) {
    return instance.get<ChangeSummary>({ url: '/cmdb/audit/changes/summary', params })
}
