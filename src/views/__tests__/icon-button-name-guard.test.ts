/**
 * 图标按钮可访问名守卫（iter375）
 *
 * 与 console `inline-button-name-guard` / CAM `icon-button-name-guard` 同一思路，
 * 但**判据必须覆盖 Element Plus 的两种写法** —— 这是 iter374 踩过的漏洞。
 *
 * ── iter374 的判据漏洞（本轮补上）──
 * iter374 在 CAM 只扫了「`<button>` 里嵌 `<el-icon>`」这一种形态，结论是「CAM 14 个」。
 * 本轮补扫 Element Plus 的另两种形态后发现**还漏了 22 个**：
 *   · `<el-button :icon="X" circle />`（属性式，cmdb 8 个 / CAM 0 个）
 *   · `<el-button><el-icon><X /></el-icon></el-button>`（子标签式，CAM 14 个）
 *
 * **同一个概念（"纯图标按钮"）在 Element Plus 里有三种写法**，只查一种就会系统性漏报。
 * 这正是 S200「穷举别名」与 S210「0 分不清干净与没扫」要防的。
 *
 * ── 判据 ──
 * 纯图标按钮 = 去标签后没有可见文字，且满足以下任一：
 *   ① `<el-button :icon="X" ... />`（自闭合，无子内容）
 *   ② `<el-button ...><el-icon>...</el-icon></el-button>`（子标签是图标）
 *   ③ `<button ...><el-icon>...</el-icon></button>`（原生 button 内嵌图标）
 *   ④ `<button ...><svg>...</svg></button>`
 * 且**缺少可访问名**：无 `aria-label` / `aria-labelledby` / `title` / 内含 `sr-only`。
 *
 * ── 本轮修复的 8 个（cmdb）──
 * `audit` / `quality` 的刷新、`discovery` 刷新、`open-api` 刷新 Token 列表 +
 * 刷新 Webhook 列表 + 复制 Token、`ModelAliasDrawer` 删除别名、`RuleFormDialog` 删除规则。
 *
 * ── 已核查的写法差异（我没改，但记下来）──
 * `audit/logs/index.vue`（CAM）的 `<el-button :icon="Download" circle title="...">` 带 `title`，
 * 属**正确写法**，扫描器必须不报它 —— 这是本守卫的阳性对照样本。
 */
import { describe, expect, it } from 'vitest'

const sources = import.meta.glob('../../**/*.vue', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/**
 * 已知待补清单（当前为空）。
 *
 * iter375 只修了 cmdb 的 8 个；**CAM 还剩 14 个**（`<el-button>` 内嵌 `<el-icon>` 那种写法，
 * 以及 `el-button :icon=` 的若干）未修 —— 它们记在 CAM 仓自己的守卫里，本文件只覆盖 cmdb。
 *
 * 保留空数组的理由同 iter373：**登记机制必须比清单本身活得更久。**
 */
const KNOWN_GAPS: readonly string[] = []

function templateOf(src: string): string {
  const t0 = src.indexOf('<template>')
  const t1 = src.lastIndexOf('</template>')
  if (t0 < 0 || t1 <= t0) return ''
  return src.slice(t0, t1).replace(/<!--[\s\S]*?-->/g, '')
}

/** glob key → 相对路径（key 前缀不统一，见 iter372 教训） */
function normalizeKey(p: string): string | null {
  const idx = p.indexOf('views/')
  if (idx >= 0) return p.slice(idx)
  let rest = p
  let depth = 0
  while (rest.startsWith('../')) {
    rest = rest.slice(3)
    depth++
  }
  if (depth === 1) return 'views/' + rest
  return null
}

/** 找出所有「纯图标且无可访问名」的按钮 */
function findUnnamedIconButtons(tpl: string): string[] {
  const out: string[] = []

  // ---- 形态 ① ②：el-button（含 :icon 属性式与子标签式）----
  const reEl = /<el-button\b([^>]*?)(\/>|>([\s\S]*?)<\/el-button>)/g
  let m: RegExpExecArray | null
  while ((m = reEl.exec(tpl))) {
    const attrs = m[1] ?? ''
    const inner = m[2] === '/>' ? '' : (m[3] ?? '')
    const hasIconAttr = /(:icon=|icon=")/.test(attrs)
    const hasIconChild = /<el-icon|<svg/.test(inner)
    if (!hasIconAttr && !hasIconChild) continue

    // 有可见文字 → 不是纯图标
    if (inner.replace(/<[^>]+>/g, '').replace(/\s/g, '').length > 0) continue

    // 可访问名
    if (/aria-label|aria-labelledby|title=/.test(attrs)) continue
    if (/sr-only|visually-hidden/.test(inner)) continue

    const icon =
      (attrs.match(/:icon="([^"]+)"/) ?? attrs.match(/icon="([^"]+)"/) ?? [])[1] ??
      (inner.match(/<([A-Z]\w+)\s*\/>/) ?? [])[1] ??
      'svg'
    out.push('el-button:' + icon)
  }

  // ---- 形态 ③ ④：原生 button ----
  const reBtn = /<button\b([^>]*)>([\s\S]*?)<\/button>/g
  while ((m = reBtn.exec(tpl))) {
    const attrs = m[1] ?? ''
    const inner = (m[2] ?? '').trim()
    if (!inner) continue
    if (!/<el-icon|<svg|<i\s+class="[^"]*icon|<ElIcon/.test(inner)) continue
    if (inner.replace(/<[^>]+>/g, '').replace(/\s/g, '').length > 0) continue
    if (/aria-label|aria-labelledby|title=/.test(attrs)) continue
    if (/sr-only|visually-hidden/.test(inner)) continue
    const icon =
      (inner.match(/<([A-Z]\w+)\s*\/>/) ?? [])[1] ??
      (inner.match(/class="([^"]*icon[^"]*)"/) ?? [])[1] ??
      'svg'
    out.push('button:' + icon)
  }

  return out
}

describe('图标按钮可访问名守卫（iter375）', () => {
  it('纯图标按钮必须有可访问名（覆盖 el-button :icon / el-button 内嵌 / 原生 button 三种写法）', () => {
    const offenders: string[] = []

    for (const [path, src] of Object.entries(sources)) {
      if (/\.(test|spec)\./.test(path)) continue
      const rel = normalizeKey(path)
      if (!rel) continue
      if (KNOWN_GAPS.includes(rel)) continue
      const tpl = templateOf(src)
      if (!tpl) continue

      const missing = findUnnamedIconButtons(tpl)
      if (missing.length) offenders.push(`${rel}  →  ${missing.join(', ')}`)
    }

    expect(
      offenders,
      '以下纯图标按钮没有可访问名 —— 读屏只会念「按钮」，用户不知道它会做什么。\n' +
        '修法：加 `aria-label="动作名"`（如 刷新 / 删除 / 复制）：\n  ' +
        offenders.join('\n  '),
    ).toEqual([])
  })

  it('KNOWN_GAPS 里的条目必须仍然存在（防止清单过期后掩盖新问题）', () => {
    const stale: string[] = []

    for (const gap of KNOWN_GAPS) {
      const hit = Object.entries(sources).some(([path, src]) => {
        if (/\.(test|spec)\./.test(path)) return false
        if (normalizeKey(path) !== gap) return false
        const tpl = templateOf(src)
        return tpl ? findUnnamedIconButtons(tpl).length > 0 : false
      })
      if (!hit) stale.push(gap)
    }

    expect(
      stale,
      '这些条目已经没有「无名的纯图标按钮」了，请从 KNOWN_GAPS 删掉（清单只应变短）：\n  ' +
        stale.join('\n  '),
    ).toEqual([])
  })
})
