/**
 * 模型别名映射 API
 * 端点：/api/v1/cmdb/models/aliases
 *
 * 多云同步写入的 model_uid（如 volcengine_ecs）与 CMDB 模型命名空间不一致，
 * 映射表把同步侧 uid 归一到 CMDB 模型 uid（如 volcano_ecs / 通用模型）。
 */
import instance from './request/service'

export interface ModelAlias {
    id: number
    alias_uid: string
    model_uid: string
    /** default=内置种子 / manual=手动添加 */
    source: string
    create_time: number
}

export interface AliasMigrationResult {
    alias_uid: string
    model_uid: string
    migrated: number
    removed: number
}

export interface AliasMigrationResp {
    items: AliasMigrationResult[]
    total: number
    removed_total: number
}

/** 全量映射列表 */
export function listModelAliasesApi() {
    return instance.get<ModelAlias[]>({ url: '/cmdb/models/aliases' })
}

/** 手动添加映射（校验目标模型存在） */
export function createModelAliasApi(aliasUid: string, modelUid: string) {
    return instance.post<null>({ url: '/cmdb/models/aliases', data: { alias_uid: aliasUid, model_uid: modelUid } })
}

/** 删除映射 */
export function deleteModelAliasApi(aliasUid: string) {
    return instance.delete<null>({ url: `/cmdb/models/aliases/${aliasUid}` })
}

/** 执行存量迁移：按映射批量改写实例 model_uid（冲突副本自动删除） */
export function migrateModelAliasesApi() {
    return instance.post<AliasMigrationResp>({ url: '/cmdb/models/aliases/migrate' })
}
