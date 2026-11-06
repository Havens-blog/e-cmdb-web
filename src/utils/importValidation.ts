/**
 * 实例导入行校验与映射（纯函数，便于单测锁定）。
 *
 * 契约：
 * - 必需列 model_uid / asset_id，缺失的行报错并排除
 * - knownModelUids 非空时校验模型存在性（堵「静默孤儿」：upsert-batch 对
 *   不存在的模型会静默创建孤儿实例，实测 2026-11-06）
 * - knownModelUids 为 null 表示模型列表不可用（加载失败），**跳过存在性校验**
 *   优雅降级——此时误报「模型不存在」会把所有行都挡掉，比放行危害更大；
 *   放行后最坏结果是产生孤儿（同步路径本就允许孤儿，质量页可见）
 * - 固定列映射顶层字段，其余列进 attributes；source 缺省标记 import
 */
export interface ImportRowInput {
    [col: string]: string | undefined
}

export interface ImportValidationResult {
    instances: Array<{
        model_uid: string
        asset_id: string
        asset_name?: string
        account_id?: number
        source?: string
        owner?: string
        attributes?: Record<string, any>
    }>
    errors: string[]
}

const FIXED_COLS = ['model_uid', 'asset_id', 'asset_name', 'account_id', 'source', 'owner']

export function validateImportRows(
    rows: ImportRowInput[],
    headers: string[],
    knownModelUids: Set<string> | null,
): ImportValidationResult {
    const instances: ImportValidationResult['instances'] = []
    const errors: string[] = []

    for (const [i, row] of rows.entries()) {
        const modelUid = (row.model_uid || '').trim()
        const assetId = (row.asset_id || '').trim()
        if (!modelUid || !assetId) {
            errors.push(`第 ${i + 2} 行：缺少 model_uid 或 asset_id`)
            continue
        }
        // 模型存在性预校验：仅在校验依据可用时执行
        if (knownModelUids && !knownModelUids.has(modelUid)) {
            errors.push(`第 ${i + 2} 行：模型「${modelUid}」不存在（请先在资源模型中创建）`)
            continue
        }
        const attrs: Record<string, any> = {}
        for (const h of headers) {
            if (FIXED_COLS.includes(h)) continue
            const v = row[h]
            if (v !== undefined && v !== '') attrs[h] = v
        }
        instances.push({
            model_uid: modelUid,
            asset_id: assetId,
            asset_name: (row.asset_name || '').trim() || undefined,
            account_id: row.account_id ? Number(row.account_id) : undefined,
            // UI 导入路径：CSV 未显式提供来源时默认标记 import（导入的实例来源就是导入）
            source: (row.source || '').trim() || 'import',
            owner: (row.owner || '').trim() || undefined,
            attributes: Object.keys(attrs).length ? attrs : undefined,
        })
    }
    return { instances, errors }
}
