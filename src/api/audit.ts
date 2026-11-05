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

// ==================== 操作审计（e-cam /api/v1/cam/audit/logs，AuditLog） ====================

/** 操作审计日志（API 级：谁在什么时候调了什么接口、结果如何） */
export interface AuditLog {
    id: number
    operation_type: string
    operator_id: string
    operator_name: string
    tenant_id: number
    http_method: string
    api_path: string
    request_body: string
    status_code: number
    result: string
    request_id: string
    duration_ms: number
    client_ip: string
    user_agent: string
    ctime: number
}

export interface AuditLogList {
    items: AuditLog[]
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

/**
 * 获取变更统计汇总
 *
 * 性能说明（实测 2026-10-29）：该接口在后端对 change_history 做 4 次串行全量聚合，
 * 当前租户数据量约 540 万条，实测耗时 2s→170s 持续恶化，最终以
 * `connection(...): socket was unexpectedly closed: EOF` 返回 500。
 * 前端不应让它阻塞页面，故单独设置较短超时（15s），失败即降级为“统计暂不可用”。
 */
export function getChangeSummaryApi(params: {
    model_uid?: string
    provider?: string
    start_time?: number
    end_time?: number
}) {
    return instance.get<ChangeSummary>({
        url: '/cam/audit/changes/summary',
        params,
        timeout: 15000,
    })
}

/**
 * 查询操作审计日志列表（API 级操作审计，聚合进统一审计面板）。
 *
 * 与 listChangesApi（变更审计：字段级 old→new）互补：
 * 变更审计回答「改了哪个字段」，操作审计回答「谁调了什么接口、结果如何」。
 */
export function listAuditLogsApi(params: {
    operation_type?: string
    operator_id?: string
    http_method?: string
    api_path?: string
    start_time?: number
    end_time?: number
    offset?: number
    limit?: number
}) {
    return instance.get<AuditLogList>({ url: '/cam/audit/logs', params })
}

/** 操作审计的 operation_type 常见取值（对齐 e-cam AuditOperationType） */
export const AUDIT_OPERATION_TYPES = [
    { value: 'api_generic', label: '通用 API' },
    { value: 'api_account_create', label: '创建云账号' },
    { value: 'api_account_update', label: '更新云账号' },
    { value: 'api_account_delete', label: '删除云账号' },
    { value: 'api_asset_sync', label: '资产同步' },
    { value: 'api_task_create', label: '创建任务' },
    { value: 'log_search', label: '日志检索' },
    { value: 'log_export', label: '日志导出' },
]
