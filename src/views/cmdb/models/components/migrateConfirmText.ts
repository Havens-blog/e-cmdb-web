/**
 * 「执行存量迁移」的二次确认文案（iter164）。
 *
 * 背景：原本文案是固定的「按映射批量改写存量实例的 model_uid（…）？」——
 * 用户看不出**有多少条映射生效**，也看不到「不可撤销」。
 *
 * 说明：受影响的**实例**数量要迁移后才知道（接口 `migrateModelAliasesApi` 只返回执行结果），
 * 所以这里**如实只讲映射条数**，不编造实例数。
 */
export function buildMigrateConfirmText(aliasCount: number): string {
  const scope =
    aliasCount > 0
      ? `将按当前 ${aliasCount} 条别名映射批量改写存量实例的 model_uid（目标已存在同资产的副本会被删除）。`
      : '当前没有任何别名映射，执行不会有改动。'
  return `${scope}此操作不可撤销，是否继续？`
}
