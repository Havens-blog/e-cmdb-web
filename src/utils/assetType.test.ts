import { describe, expect, it } from 'vitest'
import { resolveAssetTypeLabel, type ModelLike } from './assetType'

// 真实后端模型表样本（取自 /api/v1/cmdb/models）
const MODELS: ModelLike[] = [
    { uid: 'host', name: '主机' },
    { uid: 'cloud_rds', name: '关系型数据库' },
    { uid: 'cloud_redis', name: 'Redis缓存' },
    { uid: 'aliyun_rds', name: '阿里云RDS' },
    { uid: 'aliyun_slb', name: '阿里云SLB' },
    { uid: 'snapshot', name: '快照' },
    { uid: 'cdn', name: 'CDN 域名' },
    { uid: 'lb', name: '负载均衡' },
    { uid: 'security_group', name: '安全组' },
    { uid: 'ecs', name: '云服务器' },
]

describe('resolveAssetTypeLabel', () => {
    it('优先返回模型表中文名（回归：曾因取 uid 前缀导致 88% 模型显示错误）', () => {
        // 这些在旧实现下会退化成 cloud / aliyun / host
        expect(resolveAssetTypeLabel('cloud_rds', MODELS)).toBe('关系型数据库')
        expect(resolveAssetTypeLabel('cloud_redis', MODELS)).toBe('Redis缓存')
        expect(resolveAssetTypeLabel('aliyun_rds', MODELS)).toBe('阿里云RDS')
        expect(resolveAssetTypeLabel('aliyun_slb', MODELS)).toBe('阿里云SLB')
        expect(resolveAssetTypeLabel('host', MODELS)).toBe('主机')
    })

    it('不再把包含下划线的 uid 截断成前缀', () => {
        // 旧实现：security_group -> security（截断）、snapshot 无映射 -> snapshot
        expect(resolveAssetTypeLabel('security_group', MODELS)).toBe('安全组')
        expect(resolveAssetTypeLabel('snapshot', MODELS)).toBe('快照')
        expect(resolveAssetTypeLabel('cdn', MODELS)).toBe('CDN 域名')
        expect(resolveAssetTypeLabel('lb', MODELS)).toBe('负载均衡')
    })

    it('模型表中无对应 uid 时回退到前缀映射（未注册模型）', () => {
        // volcengine_vswitch 不在 MODELS 中 -> 前缀 volcengine 也无回退项 -> 返回前缀
        expect(resolveAssetTypeLabel('volcengine_vswitch', MODELS)).toBe('volcengine')
    })

    it('回退时仍能命中内置前缀表', () => {
        // ecs 在 MODELS 里，但不传 models 时走回退表
        expect(resolveAssetTypeLabel('ecs', [])).toBe('云服务器')
        expect(resolveAssetTypeLabel('rds', [])).toBe('RDS')
        expect(resolveAssetTypeLabel('oss', [])).toBe('对象存储')
    })

    it('空值与空白返回空串', () => {
        expect(resolveAssetTypeLabel('', MODELS)).toBe('')
        expect(resolveAssetTypeLabel(null, MODELS)).toBe('')
        expect(resolveAssetTypeLabel(undefined, MODELS)).toBe('')
        expect(resolveAssetTypeLabel('   ', MODELS)).toBe('')
    })

    it('模型项缺少 name 时继续回退，不返回空', () => {
        const partial: ModelLike[] = [{ uid: 'snapshot' }]
        expect(resolveAssetTypeLabel('snapshot', partial)).toBe('snapshot')
    })

    it('模型列表为空数组时安全回退', () => {
        expect(resolveAssetTypeLabel('some_unknown', [])).toBe('some')
    })
})
