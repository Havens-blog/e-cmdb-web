/**
 * 澶氫簯鍙戠幇 API锛堢紪鎺掑眰锛氳浆鍙?e-cam-service /api/v1/certs/discovery/*锛? * 绔偣锛?api/v1/cmdb/discovery/*
 *
 * 涓婃父 cert 妯″潡鐨?{success,data} 淇″皝宸茬敱缂栨帓灞傚綊涓€涓?{code,msg,data}銆? */
import instance from './request/service'

// ==================== 绫诲瀷锛堝榻?e-cam cert/web VO锛?====================

/** 鍙戠幇棰勮鏉＄洰锛坈loud+accountKey+cloudCertId 涓夊厓缁勫幓閲嶏級 */
export interface DiscoveryPreviewEntry {
    cloud: string
    accountKey: string
    cloudCertId: string
    /** 鍙鍚嶏紙寮曠敤 resourceId 閲囨牱锛歝as=璇佷功鍚嶃€乧dn/waf=鍩熷悕锛夛紱绌?寮曠敤鏈甫 */
    label: string
    /** 蹇収鍐呰涓夊厓缁勭殑寮曠敤璧勬簮鏁?*/
    refCount: number
    /** 鏄惁宸插湪璇佷功鍙拌处锛坱rue=宸插鍏ワ級 */
    inLedger: boolean
    /** 鍙拌处鍒版湡鏃堕棿 RFC3339锛涙湭鐧昏涓哄崰浣嶆枃妗?*/
    notAfter: string
    /** false=涓嶅彲閫夌粍锛堝崕涓轰簯/AWS IAM-hosted锛?*/
    parseable: boolean
    /** deferred_parse / unsupported_cloud / iam_hosted锛涘父鎬佺┖ */
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
    /** running / done / failed锛涢浂蹇収涓虹┖ */
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

// ==================== 鍑芥暟 ====================

/** 鍙戠幇棰勮锛堟棤 done 蹇収鏃朵笂娓?409 NO_SNAPSHOT锛屼俊灏?code=409锛?*/
export function getDiscoveryPreviewApi() {
    return instance.get<DiscoveryPreview>({ url: '/cmdb/discovery/preview' })
}

/** 鏈€杩戝揩鐓х姸鎬侊紙闆跺揩鐓т负 hasSnapshot=false 绌烘€侊級 */
export function getSnapshotStatusApi() {
    return instance.get<DiscoverySnapshotStatus>({ url: '/cmdb/discovery/snapshot-status' })
}

/** 鍕鹃€夋潯鐩垱寤哄鍏ヤ細璇濓紙涓婃父 202锛岃繑鍥?pending 鍒濆蹇収锛?*/
export function createDiscoveryImportApi(items: DiscoveryImportItem[]) {
    return instance.post<DiscoveryImportSession>({ url: '/cmdb/discovery/import', data: { items } })
}

/** 瀵煎叆浼氳瘽杩涘害杞锛堢粓鎬?completed/partial_failed 鐢?status/finishedAt 鍒ゅ畾锛?*/
export function getImportSessionApi(sessionId: string) {
    return instance.get<DiscoveryImportSession>({ url: `/cmdb/discovery/import/${sessionId}` })
}

/** 鎵嬪姩瑙﹀彂涓€杞浜戝閲忓悓姝ワ紙OpsEngineer 鐧藉悕鍗曪紝涓€娆℃€х粓鎬佹憳瑕侊級 */
export function triggerDiscoverySyncApi() {
    return instance.post<Record<string, unknown>>({ url: '/cmdb/discovery/sync' })
}
