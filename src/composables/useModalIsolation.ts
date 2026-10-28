/**
 * 弹窗/抽屉的「背景隔离」与「焦点归还」。
 *
 * 为什么需要：Element Plus 的 el-dialog / el-drawer 自带焦点陷阱（Tab 不会跑出去）、
 * Esc 关闭、以及初始焦点（.el-drawer__sr-focus），但**不会**：
 *   1. 隔离背景 —— 弹窗打开时读屏仍能浏览背后的页面内容；
 *   2. 把焦点还给触发元素 —— 关闭后焦点落到 <body>，键盘用户丢失位置。
 *
 * 本仓的抽屉是**就地挂载**的（挂在 .xxx-page 内部，不是 append-to-body），
 * 所以隔离要沿「抽屉 → #app」的祖先链逐层把**兄弟节点**设为 inert + aria-hidden，
 * 并在关闭时按记录的原始值精确还原（避免把别人设过的 aria-hidden 一并抹掉）。
 *
 * 用法：
 *   useModalIsolation(() => props.visible)
 *
 * 注意：不要在弹窗打开期间卸载本组件，否则隔离不会被还原。
 */
import { onBeforeUnmount, watch, type WatchSource } from 'vue'

interface Restore {
  el: HTMLElement
  hadInert: boolean
  prevAriaHidden: string | null
}

export function useModalIsolation(isOpen: WatchSource<boolean>) {
  let restores: Restore[] = []
  let focusBefore: HTMLElement | null = null

  function isolate(root: HTMLElement | null): Restore[] {
    const touched: Restore[] = []
    if (!root) return touched
    let node: HTMLElement | null = root
    // 沿祖先链上溯，直到 body
    while (node && node !== document.body) {
      const parent: HTMLElement | null = node.parentElement
      if (!parent) break
      for (const sibling of Array.from(parent.children)) {
        if (sibling === node) continue
        if (!(sibling instanceof HTMLElement)) continue
        // 跳过非内容节点（script/style）与已隐藏节点
        const tag = sibling.tagName
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK') continue
        touched.push({
          el: sibling,
          hadInert: sibling.hasAttribute('inert'),
          prevAriaHidden: sibling.getAttribute('aria-hidden'),
        })
        sibling.setAttribute('inert', '')
        sibling.setAttribute('aria-hidden', 'true')
      }
      node = parent
    }
    return touched
  }

  function release(list: Restore[]) {
    for (const r of list) {
      if (!r.hadInert) r.el.removeAttribute('inert')
      if (r.prevAriaHidden === null) r.el.removeAttribute('aria-hidden')
      else r.el.setAttribute('aria-hidden', r.prevAriaHidden)
    }
  }

  function findDialogRoot(): HTMLElement | null {
    // 取当前可见的抽屉/弹窗
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>('.el-drawer, .el-dialog'),
    ).filter((el) => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.1
    })
    // noUncheckedIndexedAccess 下索引访问可能为 undefined，显式归一为 null
    const last = candidates.length ? candidates[candidates.length - 1] : null
    return last ?? null
  }

  watch(
    isOpen,
    (open, wasOpen) => {
      if (open) {
        focusBefore = document.activeElement instanceof HTMLElement ? document.activeElement : null
        // 等 EP 把抽屉挂载/显示后再隔离
        requestAnimationFrame(() => {
          restores = isolate(findDialogRoot())
        })
      } else if (wasOpen) {
        release(restores)
        restores = []
        const target = focusBefore
        focusBefore = null
        // 归还焦点：元素已不在文档中时兜底到页面主标题
        const fallback =
          document.querySelector<HTMLElement>('.page-title') ||
          document.querySelector<HTMLElement>('main') ||
          null
        // EP 会在关闭动画结束后把焦点推到 <body>（约 200~300ms），
        // 所以这里要多等一会再归还，否则会被它覆盖（实测 1 帧不够）。
        window.setTimeout(() => {
          const canRestore =
            target && target !== document.body && document.contains(target)
          if (canRestore) {
            target.focus()
            return
          }
          // 触发元素不可聚焦（如 <div class="model-card">）时，焦点会落到 <body>；
          // 此时改为把焦点交给页面主标题：h1 默认不可聚焦，需临时加 tabindex="-1"。
          if (fallback && document.contains(fallback)) {
            if (!fallback.hasAttribute('tabindex')) {
              fallback.setAttribute('tabindex', '-1')
              fallback.focus()
              fallback.addEventListener('blur', () => fallback.removeAttribute('tabindex'), {
                once: true,
              })
            } else {
              fallback.focus()
            }
          }
        }, 320)
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    release(restores)
    restores = []
  })
}
