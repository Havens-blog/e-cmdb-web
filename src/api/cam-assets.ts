/**
 * CAM 资产管理 API（从 e-cam-web 迁出的 listAssetsApi）
 *
 * 服务树 BindResourceDialog 需按「资产」维度查询可绑定资源，
 * 该接口仍走 e-cam-service（/api/v1/cam/assets），故单独建文件承载，
 * 并复用 e-cam-web 的 CAM 响应拦截器（code:200 → code:0 信封归一）。
 */
import type { AxiosResponse } from 'axios'
import instance, { API_SERVICE } from './request/service'
import type { AssetListResponse, ListAssetsParams } from './types/asset'

// CAM API 响应拦截器 - 处理不同的响应格式
function createCamApiInterceptor() {
    return {
        responseInterceptor: (response: AxiosResponse) => {
            const data = response.data

            // CAM API 使用 code: 200 表示成功，需要转换为系统标准的 code: 0
            if (data.code === 200) {
                response.data = {
                    code: 0,
                    data: data.data,
                    message: data.msg || data.message || 'success'
                }
                return response
            }

            // 如果已经是标准格式（code: 0），直接返回
            if (data.code === 0) {
                return response
            }

            // 如果没有 code 字段，将整个响应包装成标准格式
            if (data.code === undefined) {
                response.data = {
                    code: 0,
                    data: data,
                    message: 'success'
                }
                return response
            }

            // 其他情况直接返回，让全局拦截器处理
            return response
        }
    }
}

/** 查询资产列表 */
export function listAssetsApi(params: ListAssetsParams) {
    return instance.get<AssetListResponse>({
        url: `${API_SERVICE.CAM}/assets`,
        params,
        interceptorsToOnce: createCamApiInterceptor()
    })
}
