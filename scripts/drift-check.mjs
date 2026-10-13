// drift-check.mjs — 拷贝面漂移防线（e-cmdb-web 侧）
//
// 与 haven-console/scripts/drift-check.mjs 同构（同一套语义与判定规则），
// 源仓同为 e-cam-web：从 e-cam-web 对应源文件重算 sha256，比对 shared-hashes.json 登记值。
// 不一致 → 红（exit 1）。
//
// 为什么本仓需要这条防线：本仓由 e-cam-web 拆分而来，其中 28 个文件与 e-cam-web
// **逐字节相同**（主题令牌层 6 个 scss、请求层 4 个、通用组件 6 个、utils 8 个…），
// 拆分后没有任何机制阻止两边各自演化——漂移是静默的，直到用户看见两套颜色/两套错误处理。
// 本防线把"静默漂移"变成"显式决策"：源文件一变即红，强制走
// 「人工评估差异 → 同步拷贝或显式分叉 → 更新登记」三步。
//
// Hard Rule：漂移对比只能以 e-cam-web 对应源文件为准。
//
// hash 归一化说明：
//   shared-hashes.json 的 sha256 一律登记源文件的 LF 形态（跨平台确定）；
//   本脚本对每个源文件同时计算 LF 与 CRLF 两种形态 sha256，任一与登记值一致
//   即视为「未漂移」——只检测真实内容漂移，不因行尾差异误红
//   （CI Linux 为 LF，本地 Windows 工作区为 CRLF）。

import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 计算内容的 sha256（hex）。
 * @param {string|Buffer} content
 * @returns {string}
 */
export function sha256OfContent(content) {
    return createHash('sha256').update(content).digest('hex')
}

/**
 * 将内容归一化为 LF（去掉所有 \r），返回 sha256。
 * @param {Buffer} buf
 * @returns {string}
 */
export function sha256Lf(buf) {
    const lf = buf.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    return sha256OfContent(lf)
}

/**
 * 将内容归一化为 CRLF（每行以 \r\n 结尾），返回 sha256。
 * @param {Buffer} buf
 * @returns {string}
 */
export function sha256Crlf(buf) {
    const lf = buf.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const crlf = lf.replace(/\n/g, '\r\n')
    return sha256OfContent(crlf)
}

/**
 * 读取并解析 shared-hashes.json。
 * @param {string} jsonPath shared-hashes.json 绝对/相对路径
 * @returns {{ sourceRepo?: string, sourceRepoRoot?: string, files: Array, pending?: Array }}
 */
export function loadHashes(jsonPath) {
    if (!existsSync(jsonPath)) {
        throw new Error(`shared-hashes.json not found: ${jsonPath}`)
    }
    return JSON.parse(readFileSync(jsonPath, 'utf8'))
}

/**
 * 取某条登记的参考 hash。
 * 模式文件（含 sourceSha256）以 sourceSha256 为准（e-cam-web 源形态）；
 * 逐字节拷贝（仅 sha256）以 sha256 为准。
 * @param {object} entry shared-hashes.files[i]
 * @returns {string}
 */
export function referenceHash(entry) {
    return entry.sourceSha256 || entry.sha256
}

/**
 * 对单个 e-cam-web 源文件做漂移比对。
 * @param {object} entry shared-hashes.files[i]
 * @param {string} sourceRoot e-cam-web 仓库根（含 src/）
 * @returns {object}
 */
export function checkOne(entry, sourceRoot) {
    const abs = join(sourceRoot, entry.sourcePath)
    const out = {
        path: entry.path,
        sourcePath: entry.sourcePath,
        category: entry.category,
        sourceCommit: entry.sourceCommit,
        reference: referenceHash(entry),
        lf: '',
        crlf: '',
        drifted: false,
        note: entry.note,
    }
    if (!existsSync(abs)) {
        out.drifted = true
        out.error = `源文件不存在: ${abs}`
        return out
    }
    const buf = readFileSync(abs)
    out.lf = sha256Lf(buf)
    out.crlf = sha256Crlf(buf)
    // 任一形态匹配参考值 → 未漂移
    out.drifted = out.lf !== out.reference && out.crlf !== out.reference
    return out
}

/**
 * 全量漂移比对。
 * @param {string} jsonPath shared-hashes.json 路径
 * @param {string} sourceRoot e-cam-web 仓库根（默认从 json.sourceRepoRoot 或 ../e-cam-web）
 * @returns {object}
 */
export function checkDrift(jsonPath, sourceRoot) {
    const json = loadHashes(jsonPath)
    const root = sourceRoot || json.sourceRepoRoot || '../e-cam-web'
    const results = json.files.map((entry) => checkOne(entry, root))
    return {
        passed: results.every((r) => !r.drifted),
        results,
        sourceRepo: json.sourceRepo || 'e-cam-web',
        sourceRoot: root,
    }
}

/**
 * 格式化漂移报告。
 * @param {object} result checkDrift 返回值
 * @returns {string}
 */
export function formatReport(result) {
    const lines = []
    const drifted = result.results.filter((r) => r.drifted)
    lines.push(`拷贝面漂移比对（源仓: ${result.sourceRepo} @ ${result.sourceRoot}）`)
    lines.push('─'.repeat(60))
    for (const r of result.results) {
        const status = r.drifted ? 'DRIFT' : 'OK'
        lines.push(`[${status}] ${r.category ? `(${r.category}) ` : ''}${r.path}`)
        lines.push(`    sourceCommit : ${r.sourceCommit || '(未登记)'}`)
        lines.push(`    reference    : ${r.reference}`)
        if (r.error) {
            lines.push(`    error        : ${r.error}`)
        } else {
            lines.push(`    lf  sha256   : ${r.lf}`)
            lines.push(`    crlf sha256  : ${r.crlf}`)
        }
    }
    lines.push('─'.repeat(60))
    if (result.passed) {
        lines.push(`✅ 漂移比对通过（${result.results.length} 个拷贝面源文件与登记 hash 一致）`)
    } else {
        lines.push(`❌ 漂移检出 ${drifted.length}/${result.results.length}（Hard Rule：以 e-cam-web 源文件为准）`)
        lines.push('')
        lines.push('恢复绿必须完成以下步骤（与 haven-console 同口径）:')
        lines.push('  1. 人工评估 e-cam-web 侧差异：是"平台统一口径"的改进（需同步）还是本仓特有需求（需显式分叉）')
        lines.push('  2. 同步拷贝到本仓对应文件，或在 shared-hashes.json 该条 note 里写明分叉理由')
        lines.push('  3. 更新 shared-hashes.json（sha256 / sourceSha256 / sourceCommit / sourceCommitDate）')
        lines.push('  4. 跑 typecheck + build + test 三件套回归')
        lines.push('  5. 将漂移来源 commit 记入变更记录')
    }
    return lines.join('\n')
}

// ── CLI 入口 ──────────────────────────────────────────────
// 用法: node scripts/drift-check.mjs [shared-hashes.json] [e-cam-web-root]
export function main(argv = process.argv) {
    const jsonPath = argv[2] || 'shared-hashes.json'
    const result = checkDrift(jsonPath, argv[3])
    console.log(formatReport(result))
    if (!result.passed) process.exit(1)
}

const isDirect = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isDirect) main()
