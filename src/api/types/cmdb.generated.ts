/* eslint-disable */
import type { CreateInstanceRelationReq } from './cmdb'
// 本文件由 e-cmdb-service/cmd/openapi 自动生成，请勿手工编辑。
// 重新生成：go run ./cmd/openapi -root . -o docs/openapi.json -ts-out <本文件>

export interface AttributeGroupVO {
    create_time: number
    description: string
    id: number
    index: number
    is_builtin: boolean
    model_uid: string
    name: string
    uid: string
    update_time: number
}

export interface AttributeGroupWithAttrsVO {
    attributes: AttributeVO[]
    create_time: number
    description: string
    id: number
    index: number
    is_builtin: boolean
    model_uid: string
    name: string
    uid: string
    update_time: number
}

export interface AttributeVO {
    create_time: number
    default: string
    description: string
    display: boolean
    display_name: string
    editable: boolean
    field_name: string
    field_type: string
    field_uid: string
    group_id: number
    id: number
    index: number
    link: boolean
    link_model: string
    model_uid: string
    option: any
    placeholder: string
    required: boolean
    searchable: boolean
    secure: boolean
    unique: boolean
    update_time: number
}

export interface CreateAttributeGroupReq {
    description?: string
    index?: number
    name: string
    uid: string
}

export interface CreateAttributeReq {
    default?: string
    description?: string
    display?: boolean
    display_name?: string
    editable?: boolean
    field_name: string
    field_type: string
    field_uid: string
    group_id?: number
    index?: number
    link?: boolean
    link_model?: string
    option?: any
    placeholder?: string
    required?: boolean
    searchable?: boolean
    secure?: boolean
    unique?: boolean
}

export interface CreateBatchInstanceRelationReq {
    relations: CreateInstanceRelationReq[]
}

export interface CreateBatchInstanceReq {
    instances: CreateInstanceReq[]
}


export interface CreateInstanceReq {
    account_id?: number
    asset_id: string
    asset_name?: string
    attributes?: Record<string, any>
    model_uid: string
}

export interface CreateModelGroupReq {
    description?: string
    icon?: string
    name: string
    sort_order?: number
    uid: string
}

export interface CreateModelRelationReq {
    description?: string
    direction?: string
    name: string
    relation_type: string
    source_model_uid: string
    source_to_target?: string
    target_model_uid: string
    target_to_source?: string
    uid: string
}

export interface CreateModelReq {
    category: string
    description?: string
    extensible?: boolean
    icon?: string
    level?: number
    model_group_id?: number
    name: string
    parent_uid?: string
    provider?: string
    uid: string
}

export interface InstanceRelationVO {
    create_time: number
    id: number
    relation_type_uid: string
    source_instance_id: number
    target_instance_id: number
    tenant_id: number
}

export interface InstanceVO {
    account_id: number
    asset_id: string
    asset_name: string
    attributes: Record<string, any>
    create_time: number
    id: number
    model_uid: string
    tenant_id: number
    update_time: number
}

export interface ModelGroupVO {
    create_time: number
    description: string
    icon: string
    id: number
    is_builtin: boolean
    name: string
    sort_order: number
    uid: string
    update_time: number
}

export interface ModelGroupWithModelsVO {
    create_time: number
    description: string
    icon: string
    id: number
    is_builtin: boolean
    models: ModelVO[]
    name: string
    sort_order: number
    uid: string
    update_time: number
}

export interface ModelRelationVO {
    create_time: number
    description: string
    direction: string
    id: number
    name: string
    relation_type: string
    source_model_uid: string
    source_to_target: string
    target_model_uid: string
    target_to_source: string
    uid: string
    update_time: number
}

export interface ModelVO {
    category: string
    create_time: number
    description: string
    extensible: boolean
    icon: string
    id: number
    level: number
    model_group_id: number
    name: string
    parent_uid: string
    provider: string
    uid: string
    update_time: number
}

export interface UpdateAttributeGroupReq {
    description?: string
    index?: number
    name?: string
}

export interface UpdateAttributeReq {
    default?: string
    description?: string
    display?: boolean
    display_name?: string
    editable?: boolean
    field_name?: string
    field_type?: string
    group_id?: number
    index?: number
    link?: boolean
    link_model?: string
    option?: any
    placeholder?: string
    required?: boolean
    searchable?: boolean
    secure?: boolean
    unique?: boolean
}

export interface UpdateInstanceReq {
    asset_name?: string
    attributes?: Record<string, any>
}

export interface UpdateModelGroupReq {
    description?: string
    icon?: string
    name?: string
    sort_order?: number
}

export interface UpdateModelRelationReq {
    description?: string
    name?: string
    source_to_target?: string
    target_to_source?: string
}

export interface UpdateModelReq {
    description?: string
    extensible?: boolean
    icon?: string
    model_group_id?: number
    name?: string
}

export interface UpsertBatchInstanceReq {
    instances: UpsertInstanceReq[]
}

export interface UpsertInstanceReq {
    account_id?: number
    asset_id: string
    asset_name?: string
    attributes?: Record<string, any>
    model_uid: string
}

