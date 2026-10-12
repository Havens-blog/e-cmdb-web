/**
 * 影响分析 API（e-cmdb-service 本地能力，blast radius）
 * 端点：/api/v1/cmdb/impact
 */
import instance from './request/service'

// ==================== 类型 ====================
export interface ImpactNode {
    instance_id: number
    asset_id: string
    asset_name: string
    model_uid: string
    depth: number
    direction?: string
}

export interface ImpactEdge {
    source_id: number
    target_id: number
    relation_type_uid: string
    direction: string
}

export interface ImpactGraph {
    root: ImpactNode
    nodes: ImpactNode[]
    edges: ImpactEdge[]
    upstream_count: number
    downstream_count: number
}

// ==================== 函数 ====================

/** 计算实例的影响分析图 */
export function getImpactApi(params: { instance_id: number; depth?: number }) {
    return instance.get<ImpactGraph>({ url: '/cmdb/impact', params })
}
