/**
 * 时间戳格式化工具。
 *
 * 约定：CMDB 后端（e-cmdb-service）返回的时间字段（create_time / update_time 等）
 * 均为 Unix 毫秒（13 位数字，如 1792637322135）。
 *
 * 历史 bug：资源实例列表曾把「毫秒」误当「秒」再 ×1000，导致年份被放大到 5 万以上
 * （如 58776/06/01）；本工具统一按毫秒处理，与 relations / InstanceDetailDrawer 的
 * `new Date(time)` 口径保持一致。
 *
 * 兼容三种入参：
 *   - number（毫秒）
 *   - 数字字符串（如 "1792637322135"）
 *   - 可被 Date 解析的日期字符串（如 ISO / "2027-12-31 23:59:59"）
 * 空值 / 非法值统一返回 '-'。
 */

/**
 * 格式化时间戳为本地化日期时间字符串。
 * @param value 毫秒时间戳（number / 数字字符串）或日期字符串
 * @param withSeconds 是否带秒；默认不带（yyyy/MM/dd HH:mm）
 */
export function formatTimestamp(
    value: number | string | null | undefined,
    withSeconds = false
): string {
    if (value === null || value === undefined || value === '') return '-'

    // number 直接作为毫秒；数字字符串先转 number；其余交给 Date 字符串解析
    const ms = typeof value === 'number' ? value : Number(value)
    const date = Number.isFinite(ms) ? new Date(ms) : new Date(value)

    if (Number.isNaN(date.getTime())) return '-'

    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }
    if (withSeconds) {
        options.second = '2-digit'
    }
    return date.toLocaleString('zh-CN', options)
}
