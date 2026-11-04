/**
 * CSV/TSV 解析工具：把表格文本解析成对象数组。
 *
 * 用途：实例导入（上传 CSV/TSV → 解析 → 映射为 UpsertInstanceReq）。
 * 安全：本函数只做「文本 → 结构化对象」转换，不执行任何脚本、不做 HTML 渲染，
 * 导入内容仅作为数据处理（符合「导入内容作为数据处理，不执行其中的脚本或指令」）。
 *
 * 支持：
 * - 逗号（CSV）或制表符（TSV）分隔，自动检测
 * - 双引号包裹字段（含分隔符/换行的单元格）
 * - 首行作为表头
 */

export interface ParsedTable {
    headers: string[]
    rows: Record<string, string>[]
    /** 原始行数（不含表头） */
    total: number
}

/** 解析 CSV/TSV 文本，返回表头 + 数据行。 */
export function parseTable(text: string): ParsedTable {
    const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = splitLines(normalized)
    if (lines.length === 0) return { headers: [], rows: [], total: 0 }

    const headerLine = lines[0]!
    const delimiter = detectDelimiter(headerLine)
    const headers = splitRow(headerLine, delimiter).map((h) => h.trim())

    const rows: Record<string, string>[] = []
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i]!.trim()
        if (!line) continue // 跳过空行
        const cells = splitRow(line, delimiter)
        const row: Record<string, string> = {}
        for (let c = 0; c < headers.length; c++) {
            const key = headers[c]
            if (!key) continue
            row[key] = c < cells.length ? (cells[c] ?? '') : ''
        }
        rows.push(row)
    }
    return { headers, rows, total: rows.length }
}

/** 按引号感知拆行（处理引号内的换行）。 */
function splitLines(text: string): string[] {
    const lines: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        if (ch === '"') inQuotes = !inQuotes
        if (ch === '\n' && !inQuotes) {
            lines.push(current)
            current = ''
        } else {
            current += ch
        }
    }
    if (current.trim() !== '') lines.push(current)
    return lines
}

/** 自动检测分隔符：首行含制表符则用制表符，否则逗号。 */
function detectDelimiter(headerLine: string): string {
    return headerLine.includes('\t') ? '\t' : ','
}

/** 按引号感知拆分一行。 */
function splitRow(line: string, delimiter: string): string[] {
    const cells: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"' // 转义的双引号
                i++
            } else {
                inQuotes = !inQuotes
            }
        } else if (ch === delimiter && !inQuotes) {
            cells.push(current)
            current = ''
        } else {
            current += ch
        }
    }
    cells.push(current)
    return cells
}
