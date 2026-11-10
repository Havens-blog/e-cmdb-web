/**
 * 操作审计查询参数构造（纯函数，便于单测锁定接线）。
 *
 * 契约：start_time/end_time 为 Unix 毫秒（与变更审计 tab 的时间筛选同口径）；
 * timeRange 未设置时不产生时间参数；api_path 前缀匹配、operation_type 等值。
 */
export interface AuditLogQueryInput {
    api_path: string
    operation_type: string
    /** 操作者 ID（精确匹配，字符串；"0" 表示系统/S2S 调用） */
    operator_id: string
    timeRange: [Date, Date] | null
}

export function buildAuditLogParams(
    input: AuditLogQueryInput,
    offset: number,
    limit: number,
): Record<string, unknown> {
    const params: Record<string, unknown> = { offset, limit }
    if (input.api_path.trim()) params.api_path = input.api_path.trim()
    if (input.operation_type) params.operation_type = input.operation_type
    if (input.operator_id.trim()) params.operator_id = input.operator_id.trim()
    if (input.timeRange) {
        params.start_time = input.timeRange[0].getTime()
        params.end_time = input.timeRange[1].getTime()
    }
    return params
}
