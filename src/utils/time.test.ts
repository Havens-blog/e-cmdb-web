/**
 * formatTimestamp 单元测试。
 *
 * 覆盖历史 bug 回归：资源实例列表曾把「毫秒」时间戳误当「秒」再 ×1000，
 * 导致年份被放大到 5 万以上（如 58776/06/01）。本测试确保按毫秒解析。
 */
import { describe, expect, it } from 'vitest'
import { formatTimestamp } from '@/utils/time'

describe('formatTimestamp', () => {
    // 1792637322135 ms ≈ 2026-10-21（13 位毫秒时间戳）
    const TS_MS = 1792637322135

    it('毫秒时间戳按毫秒解析，年份为真实年份而非放大后的乱码', () => {
        const result = formatTimestamp(TS_MS)
        expect(result).not.toBe('-')
        expect(result).toContain(String(new Date(TS_MS).getFullYear())) // '2026'
        // 回归断言：不允许出现 5 万多年的放大年份
        expect(result).not.toMatch(/\b5\d{4}\b/)
    })

    it('数字字符串按毫秒解析，与数字入参等价', () => {
        expect(formatTimestamp(String(TS_MS))).toBe(formatTimestamp(TS_MS))
    })

    it('空值 / null / undefined 返回占位符 "-"', () => {
        expect(formatTimestamp('')).toBe('-')
        expect(formatTimestamp(null)).toBe('-')
        expect(formatTimestamp(undefined)).toBe('-')
    })

    it('非法值返回占位符 "-"', () => {
        expect(formatTimestamp('not-a-date')).toBe('-')
        expect(formatTimestamp(NaN)).toBe('-')
    })

    it('可被 Date 解析的日期字符串正常格式化', () => {
        expect(formatTimestamp('2026-10-21T11:42:00Z')).not.toBe('-')
    })

    it('withSeconds=true 正常输出且含真实年份', () => {
        const result = formatTimestamp(TS_MS, true)
        expect(result).not.toBe('-')
        expect(result).toContain(String(new Date(TS_MS).getFullYear()))
    })
})
