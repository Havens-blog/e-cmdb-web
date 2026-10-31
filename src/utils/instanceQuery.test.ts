import { describe, expect, it } from 'vitest'
import { buildInstanceListParams, type InstanceFilterState } from './instanceQuery'

describe('buildInstanceListParams', () => {
    it('分页用 offset/limit，而不是 page/pageSize', () => {
        const p = buildInstanceListParams({}, 3, 20)
        expect(p.offset).toBe(40)
        expect(p.limit).toBe(20)
        expect(p).not.toHaveProperty('page')
        expect(p).not.toHaveProperty('pageSize')
    })

    it('资产类型映射为后端字段名 model_uid（回归：曾误传 uid）', () => {
        const p = buildInstanceListParams({ asset_type: 'ecs' }, 1, 20)
        expect(p.model_uid).toBe('ecs')
        expect(p).not.toHaveProperty('uid')
        expect(p).not.toHaveProperty('asset_type')
    })

    it('空字符串筛选不上送，避免后端把空串当有效条件', () => {
        const p = buildInstanceListParams(
            { keyword: '', asset_type: '', provider: '', region: '', model_uid: '' },
            1,
            20
        )
        expect(Object.keys(p).sort()).toEqual(['limit', 'offset'])
    })

    it('各筛选条件正确映射到后端参数名', () => {
        const p = buildInstanceListParams(
            { keyword: 'web', provider: 'aliyun', region: 'cn-hangzhou' },
            1,
            10
        )
        // 注意：后端实例列表的模糊搜索参数名是 asset_name（DAO 用
        // $regex + $options:"i" 对 asset_name 做不区分大小写的包含匹配），
        // 发 keyword 会被后端忽略（实测 2026-10-31：带 keyword 仍返回全量）。
        expect(p.asset_name).toBe('web')
        expect(p.keyword).toBeUndefined()
        expect(p.provider).toBe('aliyun')
        expect(p.region).toBe('cn-hangzhou')
    })

    it('asset_type 优先于 model_uid（回归：带 URL model_uid 时改选类型不生效）', () => {
        // 场景：从 /instances?model_uid=snapshot 进入，用户又在下拉选了「云服务器」
        const filters: InstanceFilterState = { model_uid: 'snapshot', asset_type: 'ecs' }
        const p = buildInstanceListParams(filters, 1, 20)
        expect(p.model_uid).toBe('ecs')
    })

    it('只有 model_uid 时按模型下钻', () => {
        const p = buildInstanceListParams({ model_uid: 'snapshot' }, 1, 20)
        expect(p.model_uid).toBe('snapshot')
    })

    it('两者都没有时不传 model_uid', () => {
        const p = buildInstanceListParams({}, 1, 20)
        expect(p).not.toHaveProperty('model_uid')
    })
})
