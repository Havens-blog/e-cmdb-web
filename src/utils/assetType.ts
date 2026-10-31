/**
 * 资产类型（模型）显示名解析。
 *
 * 背景：本模块曾出现「取 model_uid 第一段 + 查 10 项硬编码表」的写法，
 * 实测后端模型表 80 个模型中 70 个（88%）匹配不到，导出「资产类型」列
 * 退化成厂商名或英文原文（cloud_rds → "cloud"、aliyun_rds → "aliyun"、
 * host → "host"），对使用者毫无意义。
 *
 * 正确做法：后端模型表本身带中文名（model.uid -> model.name），
 * 优先用它反查；只有模型表中不存在该 uid（未注册模型）时才回退到
 * 按前缀推断的旧逻辑，保证历史数据仍可展示。
 */

/** 后端模型表的最小信息（只需 uid 与中文名） */
export interface ModelLike {
    uid?: string
    name?: string
}

/** 回退表：仅在模型表中找不到 uid 时使用 */
const FALLBACK_TYPE_LABELS: Record<string, string> = {
    ecs: '云服务器',
    rds: 'RDS',
    redis: 'Redis',
    mongodb: 'MongoDB',
    vpc: 'VPC',
    eip: '弹性公网IP',
    nas: '文件存储',
    oss: '对象存储',
    kafka: 'Kafka',
    elasticsearch: 'Elasticsearch',
}

/**
 * 把 model_uid 解析为可展示的资产类型名。
 *
 * @param modelUid 实例的 model_uid（可能为空）
 * @param models   页面已加载的模型列表（来自 /cmdb/models）
 * @returns 展示名；无法解析时返回空串
 */
export function resolveAssetTypeLabel(
    modelUid: string | null | undefined,
    models: readonly ModelLike[]
): string {
    const uid = (modelUid || '').trim()
    if (!uid) return ''

    // 1) 优先用后端模型表的中文名
    const hit = models.find((m) => m && m.uid === uid)
    if (hit && hit.name) return hit.name

    // 2) 回退：未注册模型按前缀推断，保持历史行为
    const prefix = uid.split('_')[0] || uid
    return FALLBACK_TYPE_LABELS[prefix] || prefix
}

/** 已知厂商前缀：`aliyun_ecs` 这类 uid 的厂商段，不是资源类型段 */
const VENDOR_PREFIXES = new Set([
    'aliyun',
    'tencent',
    'huawei',
    'aws',
    'volcengine',
    'azure',
    'gcp',
    'qingcloud',
    'ucloud',
    'cloud',
])

/**
 * 从 model_uid 中解析出「资源类型键」（用于匹配详情页路由）。
 *
 * 缺陷修复（实测 2026-10-31，tenant 3 采样 200 条实例）：
 * 原实现用 `model_uid.split('_')[0]` 作为类型键：
 *   aws_eip        → "aws"        （map 中无，但 eip 在）
 *   volcengine_ecs → "volcengine" （map 中无，但 ecs 在）
 *   aliyun_snapshot→ "aliyun"
 * 结果采样 200 条中**可查看详情 0 条、不可查看 200 条**，
 * 「查看」按钮对几乎所有实例都只弹「暂不支持查看」。
 *
 * 正确做法：先剥离已知厂商前缀，再取资源类型；若整体已在
 * 类型表中则直接用（如 `ecs`、`host`）。
 *
 * @param modelUid 实例的 model_uid
 * @param knownTypes 已知资源类型集合（如路由表的 key）
 */
export function resolveAssetTypeKey(
    modelUid: string | null | undefined,
    knownTypes: readonly string[]
): string {
    const uid = (modelUid || '').trim()
    if (!uid) return ''

    // 0) uid 本身就是已知类型（如 ecs / host / eip）
    if (knownTypes.includes(uid)) return uid

    const parts = uid.split('_').filter(Boolean)
    if (parts.length === 0) return ''

    // 1) 剥离厂商前缀后，剩余部分拼回去再匹配（处理 security_group、route_table）
    if (parts.length > 1 && VENDOR_PREFIXES.has(parts[0]!.toLowerCase())) {
        const rest = parts.slice(1).join('_')
        if (knownTypes.includes(rest)) return rest
        // 也尝试只取下一段（如 aliyun_cdn_x → cdn）
        const second = parts[1]!
        if (knownTypes.includes(second)) return second
    }

    // 2) 退化：任一段命中已知类型即采用（从右往左，越靠后越具体）
    for (let i = parts.length - 1; i >= 0; i--) {
        const seg = parts[i]!
        if (knownTypes.includes(seg)) return seg
    }

    // 3) 都匹配不到，返回首段（与旧行为一致，调用方会走「不支持」分支）
    return parts[0]!
}
