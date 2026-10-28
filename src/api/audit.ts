/**
 * 变更审计 API（直连 e-cam-service /api/v1/cam/audit/changes）
 * 端点：/api/v1/cam/audit/*
 */
import instance from './request/service'

// ==================== 类型（对齐 e-cam audit/domain ChangeRecord） ====================
export interface ChangeRecord {
    id: number
    asset_id: string
    asset_name: string
    model_uid: string
    tenant_id: number
    account_id: number
    provider: string
    region: string
    field_name: string
    /** JSON 序列化字符串 */
    old_value: string
    /** JSON 序列化字符串 */
    new_value: string
    change_source: string
    change_task_id: string
    /** 变更时间（Unix 毫秒） */
    ctime: number
}

export interface ChangeSummary {
    total: number
    by_resource_type: Record<string, number>
    by_field: Record<string, number>
    by_provider: Record<string, number>
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
    return instance.get<ChangeList>({ url: '/cam/audit/changes', params })
}

/** 获取变更统计汇总 */
export function getChangeSummaryApi(params: {
    model_uid?: string
    provider?: string
    start_time?: number
    end_time?: number
}) {
    return instance.get<ChangeSummary>({ url: '/cam/audit/changes/summary', params })
}
