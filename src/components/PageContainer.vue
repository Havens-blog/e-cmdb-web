<!--
  页面外壳容器：统一 padding / 高度 / 文字色，页面正文仍以 .xxx-page 类自管宽度与背景。
  当前 e-cmdb-web 4 个业务页（service-tree / service-tree/rules / service-tree/environments /
  cmdb/topology）共用 <PageContainer><div class="xxx-page">…</div></PageContainer> 形态。

  历史：该组件原在 rescue/other-author-pagecontainer 分支（d330f0a）以
  src/components/PageContainer/index.vue 落地，但分支未合入 main；main 上 4 个页面
  早已引用 <PageContainer> 而组件文件缺失，unplugin-vue-components 亦无此注册
  （components.d.ts 无该条目），导致运行期 "Failed to resolve component: PageContainer"
  ——页面正文虽渲染，但丢失了外壳的 padding / min-height / 文字色。

  本次恢复为平铺 src/components/PageContainer.vue：unplugin-vue-components 默认扫描
  src/components 顶层文件，无需手动改 components.d.ts（dev/build 时自动重新生成）。
-->
<template>
  <section class="page-container">
    <slot />
  </section>
</template>

<script setup lang="ts">
// 纯透传容器：未声明 props，所有内容由 default slot 提供。
</script>

<style scoped lang="scss">
.page-container {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 20px 24px;
  box-sizing: border-box;
  color: var(--text-primary);
}
</style>
