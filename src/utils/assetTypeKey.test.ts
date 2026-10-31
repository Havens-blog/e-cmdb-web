import { describe, expect, it } from 'vitest'
import { resolveAssetTypeKey } from './assetType'

/** 详情页路由表覆盖的 10 个资源类型（与 instances/index.vue 的 assetTypeRouteMap 一致） */
const KNOWN = [
    'ecs', 'rds', 'redis', 'mongodb', 'vpc', 'eip',
    'nas', 'oss', 'kafka', 'elasticsearch',
]

describe('resolveAssetTypeKey', () => {
    it('uid 本身是已知类型时直接返回', () => {
        expect(resolveAssetTypeKey('ecs', KNOWN)).toBe('ecs')
        expect(resolveAssetTypeKey('eip', KNOWN)).toBe('eip')
        expect(resolveAssetTypeKey('mongodb', KNOWN)).toBe('mongodb')
    })

    it('剥离厂商前缀后命中资源类型（回归：此前会取到厂商名）', () => {
        // 实测缺陷：aws_eip → "aws"（map 无）→ 200 条实例全部无法查看详情
        expect(resolveAssetTypeKey('aws_eip', KNOWN)).toBe('eip')
        expect(resolveAssetTypeKey('volcengine_ecs', KNOWN)).toBe('ecs')
        expect(resolveAssetTypeKey('aliyun_rds', KNOWN)).toBe('rds')
        expect(resolveAssetTypeKey('tencent_redis', KNOWN)).toBe('redis')
        expect(resolveAssetTypeKey('huawei_vpc', KNOWN)).toBe('vpc')
        expect(resolveAssetTypeKey('aliyun_oss', KNOWN)).toBe('oss')
        expect(resolveAssetTypeKey('aws_nas', KNOWN)).toBe('nas')
        expect(resolveAssetTypeKey('cloud_elasticsearch', KNOWN)).toBe('elasticsearch')
    })

    it('多段资源类型需拼回后匹配（security_group 这类不含已知类型）', () => {
        // 都不在 KNOWN 中，应回退到首段（调用方走「不支持」分支）
        expect(resolveAssetTypeKey('aliyun_security_group', KNOWN)).toBe('aliyun')
        expect(resolveAssetTypeKey('volcengine_security_group', KNOWN)).toBe('volcengine')
    })

    it('无厂商前缀的未知类型回退到首段', () => {
        expect(resolveAssetTypeKey('host', KNOWN)).toBe('host')
        expect(resolveAssetTypeKey('snapshot', KNOWN)).toBe('snapshot')
    })

    it('空值与空串安全', () => {
        expect(resolveAssetTypeKey('', KNOWN)).toBe('')
        expect(resolveAssetTypeKey(null, KNOWN)).toBe('')
        expect(resolveAssetTypeKey(undefined, KNOWN)).toBe('')
        expect(resolveAssetTypeKey('   ', KNOWN)).toBe('')
    })

    it('从右往左找最具体的段', () => {
        // aliyun_x_ecs → 剥离厂商后 "x_ecs" 不在表中，第二段 "x" 不在，
        // 退化路径从右往左命中 "ecs"
        expect(resolveAssetTypeKey('aliyun_x_ecs', KNOWN)).toBe('ecs')
    })
})
