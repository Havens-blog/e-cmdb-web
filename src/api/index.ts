/**
 * e-cmdb-web API 统一出口
 *
 * 迁出页面（cmdb / service-tree / topology）的 `from '@/api'` 桶导入在此 re-export。
 * CMDB 相关函数来自 ./cmdb（后端已拆为 e-cmdb-service，见 ./cmdb 路径改造）；
 * listAssetsApi 来自 ./cam-assets（仍走 e-cam-service）。
 */

// ==================== CMDB 管理 API ====================
export {
    createBatchInstanceRelationApi,
    createCmdbInstanceApi,
    createCmdbInstanceBatchApi,
    createCmdbModelApi,
    createInstanceRelationApi,
    createModelRelationApi,
    deleteCmdbInstanceApi,
    deleteCmdbModelApi,
    deleteInstanceRelationApi,
    deleteModelRelationApi,
    getCmdbInstanceApi,
    getCmdbModelApi,
    getInstanceTopologyApi,
    getModelRelationApi,
    getModelTopologyApi,
    getRelatedInstancesApi,
    listCmdbInstancesApi,
    listCmdbModelsApi,
    listInstanceRelationsApi,
    listModelRelationsApi,
    updateCmdbInstanceApi,
    updateCmdbModelApi,
    updateModelRelationApi,
    upsertCmdbInstanceApi,
    upsertCmdbInstanceBatchApi
} from './cmdb'

// ==================== CAM 资产管理 API ====================
export { listAssetsApi } from './cam-assets'
