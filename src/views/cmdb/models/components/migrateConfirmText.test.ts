import { describe, expect, it } from 'vitest'
import { buildMigrateConfirmText } from './migrateConfirmText'

/**
 * iter164：「执行存量迁移」二次确认文案
 *
 * 动机：原本文案固定，用户看不出有多少条映射生效、也没有「不可撤销」提示。
 * 该组件依赖 Element Plus 挂载、且本租户没有模型/别名数据，难以端到端覆盖两个分支，
 * 故把文案抽成纯函数在此断言。
 */
describe('buildMigrateConfirmText', () => {
  it('有映射时：说明映射条数 + 不可撤销', () => {
    const text = buildMigrateConfirmText(3)
    expect(text).toContain('将按当前 3 条别名映射')
    expect(text).toContain('批量改写存量实例的 model_uid')
    expect(text).toContain('目标已存在同资产的副本会被删除')
    expect(text).toContain('此操作不可撤销')
  })

  it('无映射时：明确告知「执行不会有改动」，而不是继续吓唬用户', () => {
    const text = buildMigrateConfirmText(0)
    expect(text).toContain('当前没有任何别名映射，执行不会有改动。')
    expect(text).not.toContain('将按当前')
    expect(text).toContain('此操作不可撤销')
  })

  it('不编造「实例」数量（接口只在迁移后返回，事前无从得知）', () => {
    const text = buildMigrateConfirmText(5)
    // 只应出现「5 条别名映射」，不应出现「5 条实例」「5 个实例」这类臆测
    expect(text).toContain('5 条别名映射')
    expect(text).not.toMatch(/5\s*(条|个)?\s*实例/)
  })

  it('数量变化时文案随之变化（避免写死）', () => {
    expect(buildMigrateConfirmText(1)).toContain('1 条别名映射')
    expect(buildMigrateConfirmText(42)).toContain('42 条别名映射')
  })
})
