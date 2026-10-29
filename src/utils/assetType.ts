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
