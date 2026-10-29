/**
 * CMDB (配置管理数据库) 类型定义
 *
 * 说明：与后端契约一一对应的实体/请求类型已迁移到 ./cmdb.generated，
 * 由 e-cmdb-service/cmd/openapi 从后端 struct 生成（字段名与后端强一致）。
 * 本文件保留：响应信封、查询参数、以及后端无对应 struct 的本地类型。
 * 下方 import 供本文件内的组合类型引用；文件末尾 export * 对外统一导出。
 */

import type {
    ModelVO,
    ModelGroupVO,
    ModelGroupWithModelsVO,
    InstanceVO,
    ModelRelationVO,
    InstanceRelationVO,
    AttributeVO,
    AttributeGroupVO,
    AttributeGroupWithAttrsVO,
} from './cmdb.generated'

// ==================== 通用响应 ====================

export interface SuccessResp {
    code: number
    msg: string
    data?: any
}

export interface ErrorResp {
    code: number
    msg: string
    data?: any
}

// ==================== 模型相关 ====================

/** 资源类别 */
export type ModelCategory = 'compute' | 'storage' | 'network' | 'database' | 'security' | 'iam'

/** 云厂商 */
export type ModelProvider = 'aliyun' | 'aws' | 'azure' | 'all'

/** 模型列表查询参数 */
export interface ListModelsParams {
    provider?: string
    category?: string
    parent_uid?: string
    level?: number
    offset?: number
    limit?: number
}

/** 模型列表响应 */
export interface ModelListResp {
    code: number
    msg: string
    data: {
        models: ModelVO[]
        total: number
    }
}

/** 模型详情响应 */
export interface ModelResp {
    code: number
    msg: string
    data: ModelVO
}

/** 创建模型响应 */
export interface CreateModelResp {
    code: number
    msg: string
    data: {
        id: number
    }
}

// ==================== 模型分组相关 ====================

/** 模型分组列表响应 */
export interface ModelGroupListResp {
    code: number
    msg: string
    data: {
        groups: ModelGroupVO[]
        total: number
    }
}

/** 带模型的分组列表响应 */
export interface ModelGroupWithModelsListResp {
    code: number
    msg: string
    data: {
        groups: ModelGroupWithModelsVO[]
    }
}

/** 模型分组详情响应 */
export interface ModelGroupResp {
    code: number
    msg: string
    data: ModelGroupVO
}

// ==================== 实例相关 ====================

/** 实例列表查询参数 */
export interface ListInstancesParams {
    uid?: string
    tenant_id?: string
    account_id?: number
    asset_name?: string
    status?: string
    region?: string
    zone?: string
    vpc_id?: string
    instance_type?: string
    os_type?: string
    charge_type?: string
    private_ip?: string
    public_ip?: string
    provider?: string
    project_id?: string
    has_tags?: boolean
    tag_key?: string
    tag_value?: string
    offset?: number
    limit?: number
}

/** 实例列表响应 */
export interface InstanceListResp {
    code: number
    msg: string
    data: {
        instances: InstanceVO[]
        total: number
    }
}

/** 实例详情响应 */
export interface InstanceResp {
    code: number
    msg: string
    data: InstanceVO
}

/** 创建实例响应 */
export interface CreateInstanceResp {
    code: number
    msg: string
    data: {
        id: number
    }
}

/** 批量创建响应 */
export interface BatchCreateResp {
    code: number
    msg: string
    data: {
        count: number
    }
}

// ==================== 模型关系类型相关 ====================

/** 关系类型枚举 */
export type RelationType = 'belongs_to' | 'contains' | 'bindto' | 'connects' | 'depends_on'

/** 关系方向枚举 */
export type RelationDirection = 'one_to_one' | 'one_to_many' | 'many_to_many'

/** 模型关系类型列表查询参数 */
export interface ListModelRelationsParams {
    source_model_uid?: string
    target_model_uid?: string
    relation_type?: string
    offset?: number
    limit?: number
}

/** 模型关系类型列表响应 */
export interface ModelRelationListResp {
    code: number
    msg: string
    data: {
        relations: ModelRelationVO[]
        total: number
    }
}

/** 模型关系类型详情响应 */
export interface ModelRelationResp {
    code: number
    msg: string
    data: ModelRelationVO
}

// ==================== 实例关系相关 ====================

/** 创建实例关系请求 */
export interface CreateInstanceRelationReq {
    source_instance_id: number
    target_instance_id: number
    relation_type_uid: string
    /** 租户由会话 claims 决定，后端不接受该字段（传入会被忽略） */
    tenant_id?: string
}

/** 实例关系列表查询参数 */
export interface ListInstanceRelationsParams {
    source_instance_id?: number
    target_instance_id?: number
    relation_type_uid?: string
    tenant_id?: string
    offset?: number
    limit?: number
}

/** 实例关系列表响应 */
export interface InstanceRelationListResp {
    code: number
    msg: string
    data: {
        relations: InstanceRelationVO[]
        total: number
    }
}

// ==================== 拓扑相关 ====================

/** 拓扑节点 */
export interface TopologyNode {
    id: number
    model_uid: string
    model_name: string
    asset_id: string
    asset_name?: string
    icon?: string
    category: string
    attributes?: Record<string, any>
}

/** 拓扑边 */
export interface TopologyEdge {
    source_id: number
    target_id: number
    relation_type_uid: string
    relation_name: string
    relation_type: string
}

/** 拓扑图 */
export interface TopologyGraph {
    nodes: TopologyNode[]
    edges: TopologyEdge[]
}

/** 实例拓扑查询参数 */
export interface GetInstanceTopologyParams {
    depth?: number
    direction?: 'both' | 'outgoing' | 'incoming'
    uid?: string
    tenant_id?: string
}

/** 拓扑图响应 */
export interface TopologyGraphResp {
    code: number
    msg: string
    data: TopologyGraph
}

/** 模型拓扑节点 */
export interface ModelTopologyNode {
    uid: string
    name: string
    category: string
    provider: string
    icon?: string
}

/** 模型拓扑边 */
export interface ModelTopologyEdge {
    source_model_uid: string
    target_model_uid: string
    relation_uid: string
    relation_name: string
    relation_type: string
}

/** 模型拓扑图 */
export interface ModelTopologyGraph {
    nodes: ModelTopologyNode[]
    edges: ModelTopologyEdge[]
}

/** 模型拓扑图响应 */
export interface ModelTopologyGraphResp {
    code: number
    msg: string
    data: ModelTopologyGraph
}

/** 关联实例响应 */
export interface RelatedInstancesResp {
    code: number
    msg: string
    data: {
        instances: InstanceVO[]
        total: number
    }
}

/** 创建ID响应 */
export interface CreateIDResp {
    code: number
    msg: string
    data: {
        id: number
    }
}

// ==================== 字段类型相关 ====================

/** 字段类型枚举 */
export type FieldType = 'string' | 'text' | 'int' | 'float' | 'bool' | 'enum' | 'datetime' | 'date' | 'array' | 'json' | 'link'

/** 字段类型视图对象 */
export interface FieldTypeVO {
    value: string
    label: string
}

/** 字段类型列表响应 */
export interface FieldTypesResp {
    code: number
    msg: string
    data: FieldTypeVO[]
}

// ==================== 模型属性相关 ====================

/** 属性列表查询参数 */
export interface ListAttributesParams {
    group_id?: number
    field_type?: string
    offset?: number
    limit?: number
}

/** 属性列表响应 */
export interface AttributeListResp {
    code: number
    msg: string
    data: {
        attributes: AttributeVO[]
        total: number
    }
}

/** 属性详情响应 */
export interface AttributeResp {
    code: number
    msg: string
    data: AttributeVO
}

// ==================== 属性分组相关 ====================

/** 属性分组列表响应 */
export interface AttributeGroupListResp {
    code: number
    msg: string
    data: AttributeGroupVO[]
}

/** 带属性的分组列表响应 */
export interface AttributeGroupWithAttrsListResp {
    code: number
    msg: string
    data: AttributeGroupWithAttrsVO[]
}

/** 属性分组详情响应 */
export interface AttributeGroupResp {
    code: number
    msg: string
    data: AttributeGroupVO
}

// ==================== 由后端 OpenAPI 生成的契约类型 ====================
// 以下类型不再手写，改由 e-cmdb-service/cmd/openapi 从后端 struct 生成，
// 保证字段名与后端一致（历史已 4 次因手写与后端不一致导致缺陷）。
// 重新生成：go run ./cmd/openapi -root . -o docs/openapi.json -ts-out <本文件同级的 cmdb.generated.ts>
export * from './cmdb.generated'
