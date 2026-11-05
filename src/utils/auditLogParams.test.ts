import { describe, it, expect } from 'vitest'
import { buildAuditLogParams } from './auditLogParams'

describe('buildAuditLogParams', () => {
    it('未设筛选时只含分页参数', () => {
        const p = buildAuditLogParams({ api_path: '', operation_type: '', timeRange: null }, 0, 20)
        expect(p).toEqual({ offset: 0, limit: 20 })
    })

    it('api_path 去首尾空格；operation_type 空串不产生参数', () => {
        const p = buildAuditLogParams({ api_path: '  /api/v1/cam  ', operation_type: '', timeRange: null }, 40, 20)
        expect(p.api_path).toBe('/api/v1/cam')
        expect(p.operation_type).toBeUndefined()
        expect(p.offset).toBe(40)
    })

    it('timeRange 映射为毫秒 start_time/end_time', () => {
        const s = new Date(2026, 10, 5, 10, 0, 0)
        const e = new Date(2026, 10, 5, 11, 0, 0)
        const p = buildAuditLogParams({ api_path: '', operation_type: 'log_search', timeRange: [s, e] }, 0, 20)
        expect(p.start_time).toBe(s.getTime())
        expect(p.end_time).toBe(e.getTime())
        expect(p.operation_type).toBe('log_search')
    })

    it('多条件叠加', () => {
        const e = new Date(2026, 10, 5, 11, 0, 0)
        const p = buildAuditLogParams({ api_path: '/x', operation_type: 'log_export', timeRange: [e, e] }, 0, 10)
        expect(p.api_path).toBe('/x')
        expect(p.operation_type).toBe('log_export')
        expect(p.start_time).toBe(e.getTime())
    })
})
