/**
 * 开放 API 管理（e-cmdb-service 本地能力）
 * 端点：/api/v1/cmdb/open-api/*
 */
import instance from './request/service'

// ==================== 类型 ====================
export interface ApiToken {
    id: number
    name: string
    scopes: string[]
    status: string
    expire_at: number
    create_time: number
}

export interface Webhook {
    id: number
    name: string
    event_types: string[]
    target_url: string
    status: string
    create_time: number
    update_time: number
}

export interface CreatedToken {
    token: string
    id: number
    name: string
    scopes: string[]
    expire_at: number
    created_at: number
}

export interface TokenList {
    items: ApiToken[]
    total: number
}

export interface WebhookList {
    items: Webhook[]
    total: number
}

// ==================== 函数 ====================

/** 创建 API Token（明文仅返回一次） */
export function createTokenApi(data: { name: string; scopes?: string[]; ttl_days?: number }) {
    return instance.post<CreatedToken>({ url: '/cmdb/open-api/tokens', data })
}

/** 列出 API Token */
export function listTokensApi(params?: { offset?: number; limit?: number }) {
    return instance.get<TokenList>({ url: '/cmdb/open-api/tokens', params })
}

/** 吊销 API Token */
export function revokeTokenApi(id: number) {
    return instance.delete({ url: `/cmdb/open-api/tokens/${id}` })
}

/** 创建 Webhook 订阅 */
export function createWebhookApi(data: { name: string; event_types: string[]; target_url: string; secret?: string }) {
    return instance.post({ url: '/cmdb/open-api/webhooks', data })
}

/** 列出 Webhook 订阅 */
export function listWebhooksApi(params?: { offset?: number; limit?: number }) {
    return instance.get<WebhookList>({ url: '/cmdb/open-api/webhooks', params })
}

/** 更新 Webhook 订阅 */
export function updateWebhookApi(id: number, data: Partial<{ name: string; event_types: string[]; target_url: string; secret: string; status: string }>) {
    return instance.put({ url: `/cmdb/open-api/webhooks/${id}`, data })
}

/** 删除 Webhook 订阅 */
export function deleteWebhookApi(id: number) {
    return instance.delete({ url: `/cmdb/open-api/webhooks/${id}` })
}
