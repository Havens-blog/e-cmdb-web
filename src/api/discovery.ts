/**
 * Multi-cloud certificate discovery API.
 * Direct integration with e-cam-service /api/v1/certs/discovery/*.
 *
 * The upstream cert envelope is { success, data }. The dedicated cert axios
 * instance (./request/cert) unwraps success responses to `data`; here we re-wrap
 * into the { code, data, message } shape so views/discovery keeps its existing
 * `resp.data` access unchanged.
 */
import type { ResponseData } from './request/types'
import { cert } from './request/cert'

// ==================== Types (aligned with e-cam cert/web VO) ====================

/** Preview entry (deduped by cloud + accountKey + cloudCertId) */
export interface DiscoveryPreviewEntry {
    cloud: string
    accountKey: string
    cloudCertId: string
    /** Readable name (resourceId sample: cas=cert name, cdn/waf=domain); empty when not referenced */
    label: string
    /** Reference resource count for this tuple within the snapshot */
    refCount: number
    /** Whether already imported into the cert ledger */
    inLedger: boolean
    /** Ledger expiry RFC3339; placeholder for unregistered */
    notAfter: string
    /** false = not selectable (Huawei/AWS IAM-hosted) */
    parseable: boolean
    /** deferred_parse / unsupported_cloud / iam_hosted; usually empty */
    parseReason: string
}

export interface DiscoveryPreview {
    snapshotId: string
    snapshotStartedAt: string
    items: DiscoveryPreviewEntry[]
}

export interface SnapshotChannelFailure {
    cloud?: string
    channel?: string
    reason?: string
}

export interface DiscoverySnapshotStatus {
    hasSnapshot: boolean
    snapshotId?: string
    /** running / done / failed; empty for zero snapshots */
    status?: string
    startedAt?: string
    failReason?: string
    partialFailures?: SnapshotChannelFailure[]
}

export interface DiscoveryImportItem {
    cloud: string
    accountKey: string
    cloudCertId: string
}

export interface DiscoveryImportSession {
    sessionId: string
    /** running / completed / partial_failed */
    status: string
    items: Array<DiscoveryImportItem & {
        result: 'pending' | 'success' | 'failed'
        mappedCertId?: string
        errorReason?: string
    }>
    progress: { total: number; succeeded: number; failed: number }
    createdAt: string
    finishedAt?: string
}

// ==================== Helpers ====================

function toResponse<T>(promise: Promise<T>): Promise<ResponseData<T>> {
    return promise.then((data) => ({ code: 0, data, message: '' }))
}

// ==================== Functions ====================

/** Discovery preview (upstream 409 NO_SNAPSHOT when no done snapshot exists) */
export function getDiscoveryPreviewApi() {
    return toResponse(cert.get<DiscoveryPreview>('/certs/discovery/preview'))
}

/** Latest snapshot status (zero snapshots => hasSnapshot=false empty state) */
export function getSnapshotStatusApi() {
    return toResponse(cert.get<DiscoverySnapshotStatus>('/certs/discovery/snapshot-status'))
}

/** Create an import session from selected entries (upstream 202, returns pending initial snapshot) */
export function createDiscoveryImportApi(items: DiscoveryImportItem[]) {
    return toResponse(cert.post<DiscoveryImportSession>('/certs/discovery/import', { items }))
}

/** Poll import session progress (terminal status decided by status/finishedAt) */
export function getImportSessionApi(sessionId: string) {
    return toResponse(cert.get<DiscoveryImportSession>(`/certs/discovery/import/${sessionId}`))
}

/** Manually trigger one round of multi-cloud incremental sync (OpsEngineer allowlist, one-shot terminal summary) */
export function triggerDiscoverySyncApi() {
    return toResponse(cert.post<Record<string, unknown>>('/certs/discovery/sync'))
}
