import { describe, it, expect } from 'vitest'
import { validateImportRows } from './importValidation'

const HEADERS = ['model_uid', 'asset_id', 'asset_name', 'source', 'note']
const goodRow = { model_uid: 'ecs', asset_id: 'i-1', asset_name: '主机', source: 'manual', note: 'x' }

describe('validateImportRows', () => {
    it('正常行映射为实例（source 显式提供则尊重）', () => {
        const r = validateImportRows([goodRow], HEADERS, new Set(['ecs']))
        expect(r.errors).toEqual([])
        expect(r.instances).toHaveLength(1)
        expect(r.instances[0]).toMatchObject({
            model_uid: 'ecs', asset_id: 'i-1', source: 'manual',
            attributes: { note: 'x' },
        })
    })

    it('source 缺省默认 import', () => {
        const r = validateImportRows(
            [{ model_uid: 'ecs', asset_id: 'i-2', asset_name: '', source: '', note: '' }],
            HEADERS, new Set(['ecs']),
        )
        expect(r.instances[0]!.source).toBe('import')
    })

    it('缺 model_uid / asset_id 的行报错并排除', () => {
        const r = validateImportRows(
            [{ model_uid: '', asset_id: 'i-3' }, { model_uid: 'ecs', asset_id: '' }],
            HEADERS, null,
        )
        expect(r.instances).toHaveLength(0)
        expect(r.errors).toHaveLength(2)
        expect(r.errors[0]).toContain('第 2 行')
    })

    it('模型不存在：knownModelUids 非空时报错排除', () => {
        const r = validateImportRows(
            [{ model_uid: 'zz_typo', asset_id: 'i-4' }],
            HEADERS, new Set(['ecs']),
        )
        expect(r.instances).toHaveLength(0)
        expect(r.errors[0]).toContain('zz_typo')
        expect(r.errors[0]).toContain('不存在')
    })

    it('模型列表不可用（null）时跳过存在性校验，优雅降级', () => {
        // 场景：模型 API 加载失败 → 校验失去依据；此时放行而非把所有行误报「不存在」
        const r = validateImportRows([{ model_uid: 'whatever', asset_id: 'i-5' }], HEADERS, null)
        expect(r.errors).toHaveLength(0)
        expect(r.instances).toHaveLength(1)
    })

    it('其余列进入 attributes，固定列不重复', () => {
        const r = validateImportRows(
            [{ model_uid: 'ecs', asset_id: 'i-6', source: 'manual', extra1: 'a', extra2: 'b' }],
            [...HEADERS, 'extra1', 'extra2'], new Set(['ecs']),
        )
        expect(r.instances[0]!.attributes).toEqual({ extra1: 'a', extra2: 'b' })
        expect(r.instances[0]!.source).toBe('manual')
    })
})
