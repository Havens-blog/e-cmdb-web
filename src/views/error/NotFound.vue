<script setup lang="ts">
/**
 * 404 页。
 *
 * 为什么需要它（iter339 实测）：CMDB 的 catch-all 原先是 `redirect: '/models'` ——
 * 任何未登记路径都被**静默重定向到资源模型页**，而且**地址栏也跟着变**。
 * 用户视角的后果很具体：
 *   ① 输错地址 → 被送到「资源模型」→ 他会以为这就是目标页，可能在这里继续操作；
 *   ② 地址栏已经变成 `/cmdb/models`，**无法回头检查自己拼错了什么**；
 *   ③ 没有任何提示说"你要找的页面不存在"。
 *
 * 对照两个兄弟仓（实测同轮）：`e-cam-web` 与 `haven-console` 都是**原地渲染 404 文案**、
 * 地址栏保持不变。本页让 CMDB 与它们对齐 —— 三站面对"地址打错"应给同一个回答。
 *
 * 设计：与 `e-cmdb-web` 的主题体系一致（`@haven/ui` 令牌 + Element Plus 按钮），
 * 不自造第二套视觉。
 *
 * 版式注意：本仓路由是**扁平结构、无 layout 包裹**（见 `routes.ts` 头注释：
 * 「原结构为 MainLayout 嵌套 children；本独立仓库简化为直接渲染组件」），
 * 因此本页是**顶层整页渲染**，必须自己铺满视口（`min-height: 100vh` + `var(--bg-base)`），
 * 否则会变成「内容挤在顶部、下方一大片浏览器默认底色」。
 * 这一点与 haven-console 的 404 页一致。
 */
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
</script>

<template>
  <section class="not-found-page" role="alert" aria-live="polite" aria-labelledby="not-found-title">
    <p class="not-found-code" aria-hidden="true">404</p>
    <h1 id="not-found-title" class="not-found-title">页面不存在</h1>
    <!-- 回显用户实际访问的路径：便于自查拼写，也便于反馈问题时定位 -->
    <p v-if="route.fullPath" class="not-found-path">{{ route.fullPath }}</p>
    <p class="not-found-hint">
      你访问的页面不存在或已被移除，请检查地址是否正确；也可以返回资源模型继续操作。
    </p>
    <el-button type="primary" @click="router.push('/models')">返回资源模型</el-button>
  </section>
</template>

<style scoped lang="scss">
.not-found-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  /* 顶层整页渲染（本仓无 layout），必须铺满视口并自带背景 */
  min-height: 100vh;
  background: var(--bg-base);
  padding: 16px;
  box-sizing: border-box;
  color: var(--text-primary);
  text-align: center;
}

.not-found-code {
  margin: 0;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 56px;
  font-weight: 700;
  line-height: 1;
  color: var(--text-secondary);
  letter-spacing: 2px;
}

.not-found-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
}

.not-found-path {
  margin: 0;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 13px;
  color: var(--accent-blue);
  overflow-wrap: anywhere;
  max-width: 560px;
}

.not-found-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  max-width: 560px;
}
</style>
