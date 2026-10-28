import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { getEcmdbToken } from '@/utils/cookie'
import { redirectToLogin } from './index'

/**
 * Certificate-domain (e-cam-service /api/v1/certs) dedicated axios instance.
 *
 * The cert API envelope is { success, data, error, meta }, which is incompatible
 * with the main HttpRequest instance that only accepts { code, data, message }.
 * This instance mirrors eiam.ts: it reads the shared cookie into a Bearer header,
 * redirects on 401, and unwraps { success: true, data } down to `data` in the
 * response interceptor. { success: false } (or a missing envelope) is treated as
 * a business failure.
 *
 * baseURL is the same as the main instance (VITE_API_BASE_URL || '/api/v1');
 * callers use URLs under /certs/* and the dev server proxies to e-cam-service.
 */
export const certAxios: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
    timeout: 30000,
    withCredentials: false,
})

interface CertEnvelope<T = unknown> {
    success: boolean
    data?: T
    error?: { code?: string; message?: string }
    meta?: unknown
}

export interface CertApiError extends Error {
    code?: number
}

function buildCertError(status: number | undefined, body?: CertEnvelope): CertApiError {
    const message =
        body?.error?.message ||
        body?.error?.code ||
        (status ? `Certificate service request failed (HTTP ${status})` : 'Certificate service request failed')
    const error = new Error(message) as CertApiError
    if (status) error.code = status
    return error
}

certAxios.interceptors.request.use((config) => {
    const token = getEcmdbToken()
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

certAxios.interceptors.response.use(
    (response: AxiosResponse) => {
        const body = response.data as CertEnvelope
        if (body && body.success === true) {
            // Unwrap { success: true, data } -> data. Typed helpers below resolve
            // directly to the payload, so the returned value is not an AxiosResponse.
            return body.data as AxiosResponse
        }
        return Promise.reject(buildCertError(response.status, body))
    },
    (error) => {
        if (error.response?.status === 401) {
            redirectToLogin()
        }
        return Promise.reject(buildCertError(error.response?.status, error.response?.data))
    }
)

/**
 * Typed helpers over certAxios. Because the response interceptor unwraps the
 * envelope, these resolve directly to the payload T.
 */
export const cert = {
    get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        return certAxios.get(url, config) as unknown as Promise<T>
    },
    post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
        return certAxios.post(url, data, config) as unknown as Promise<T>
    },
}
