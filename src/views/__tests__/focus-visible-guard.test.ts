/**
 * 键盘焦点可见守卫（iter377 / WCAG 2.4.7「焦点可见」）
 *
 * 缺陷：`src/assets/styles/index.scss` 里有 `button { outline: none }` ——
 * 它把**所有按钮**的默认焦点环都清掉了。而本仓**全仓没有任何 `:focus-visible` 补偿**
 * （对比 `e-cam-web` 有 19 个文件，是那边 iter320 统一补过的）。
 *
 * 实测（iter377，`/cmdb/models`，真实浏览器聚焦后读 computed style）：
 *   原生 `<button>` 共 **88 个**（含 v-for 渲染的 85 个模型卡片「更多」按钮），
 *   **全部 `outline-style: none`、`box-shadow: none`** → 键盘用户 Tab 过去时
 *   **完全看不出焦点在哪**。
 *
 * 修法：与 `e-cam-web` 完全一致 —— 2px 实线 + 2px 外扩，只对键盘生效
 * （`:focus-visible`，鼠标点击不出现焦点环，不影响现有视觉）。
 *
 * ── 一个必须记下的事实：不是所有按钮都受影响 ──
 * Element Plus 的 `el-button` **自带**焦点样式（实测 `outline: solid 3px`），
 * 出问题的只有**自己写的原生 `<button>`**。所以本守卫只检查：
 * 「文件里有 `outline: none` 清掉焦点环」+「全仓是否补了 `:focus-visible`」这**一对**关系，
 * 不去逐个按钮断言（那个数字会随 v-for 数据变化，不稳定）。
 *
 * ── 已核查但不是缺陷 ──
 * `/cmdb/relations` 有 1 个按钮聚焦后仍无焦点环 —— 它是 `disabled` 的分页「上一页」
 * （第 1 页时禁用）。**禁用的按钮不可聚焦，无焦点环是正确行为。**
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** 读取仓库内的源文件（用 fs 而不是 import.meta.glob('*.scss', {query:'?raw'}) —— 后者对 scss 返回空串，见 iter363） */
function readSrc(relFromRoot: string): string {
  return readFileSync(resolve(process.cwd(), relFromRoot), 'utf8')
}

/** 去掉注释，避免「注释里提到 outline: none」被误判 */
function stripCssComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

describe('键盘焦点可见守卫（iter377 / WCAG 2.4.7）', () => {
  it('凡有 `outline: none` 清掉按钮焦点环，就必须有 `:focus-visible` 补偿', () => {
    const src = readSrc('src/assets/styles/index.scss')
    const clean = stripCssComments(src)

    // 是否存在「把焦点环清掉」的规则
    const clearsFocusRing = /outline\s*:\s*(none|0)\b/.test(clean)
    // 是否有补偿
    const hasCompensation = /:focus-visible/.test(clean)

    expect(
      clearsFocusRing && !hasCompensation,
      'index.scss 里有 `outline: none` 清了焦点环，但全文件没有 `:focus-visible` 补偿 ——\n' +
        '  键盘用户 Tab 到原生 <button> 时完全看不出焦点在哪（WCAG 2.4.7 失败）。\n' +
        '  修法：照 e-cam-web 的 iter320 方案补\n' +
        "    button:focus-visible, [role='button']:focus-visible, a:focus-visible, summary:focus-visible {\n" +
        '      outline: 2px solid var(--accent-primary);\n' +
        '      outline-offset: 2px;\n' +
        '    }',
    ).toBe(false)
  })

  it('补偿规则用的是本仓真实存在的变量（防止写成不生效的样式）', () => {
    const src = readSrc('src/assets/styles/index.scss')
    const clean = stripCssComments(src)

    // 找到 focus-visible 块
    const m = clean.match(/:focus-visible[\s\S]{0,300}?\{([\s\S]*?)\}/)
    expect(m, 'index.scss 里找不到 :focus-visible 规则块').toBeTruthy()
    const body = m?.[1] ?? ''

    // 必须有可见的 outline（不是 none）
    expect(/outline\s*:\s*(?!none)/.test(body), ':focus-visible 块里没有给出可见的 outline').toBe(true)

    // 若引用了 CSS 变量，该变量必须在主题里定义过。
    //
    // ⚠️ 判据必须同时接受两种写法（iter377 踩过）：
    //   · CSS 变量形式：`--accent-primary: #5e6ad2;`
    //   · **SCSS 变量形式：`$accent-primary: #5e6ad2;`** ← 本仓用的是这个！
    // 我第一版只找第一个，于是报"变量没有定义"，但真实浏览器里
    // `getComputedStyle(document.documentElement).getPropertyValue('--accent-primary')`
    // 返回 `#5e6ad2` —— **变量是存在的**，只是定义为 SCSS 变量，编译后才变成 CSS 变量。
    // 这是 S213「一个概念有几种写法」在变量上的翻版。
    const vars = [...body.matchAll(/var\((--[\w-]+)\)/g)].map((x) => x[1] ?? '').filter(Boolean)
    if (vars.length) {
      const themeFiles = [
        'src/assets/styles/index.scss',
        'src/assets/styles/element-theme.scss',
        'src/assets/styles/variables.scss',
      ]
      let themeText = ''
      for (const f of themeFiles) {
        try {
          themeText += stripCssComments(readSrc(f))
        } catch {
          // 文件不存在则跳过
        }
      }
      const missing = vars.filter((v) => {
        const bare = v.replace(/^--/, '')
        const esc = bare.replace(/[-]/g, '\\-')
        // CSS 变量形式 或 SCSS 变量形式，任一存在即可
        const asCssVar = new RegExp('--' + esc + '\\s*:').test(themeText)
        // 用字符串拼接而不是模板串里的 $，避免把 $ 当作替换模式
        const asScssVar = new RegExp('\\' + '$' + esc + '\\s*:').test(themeText)
        return !(asCssVar || asScssVar)
      })
      expect(
        missing,
        '这些变量在主题里既没有 CSS 变量定义也没有 SCSS 变量定义，焦点环不会生效：\n  ' + missing.join('\n  '),
      ).toEqual([])
    }
  })
})
