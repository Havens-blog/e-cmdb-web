<!--
  页面外壳容器：统一 padding / 高度 / 文字色，页面正文仍以 .xxx-page 类自管宽度与背景。
  当前 e-cmdb-web 4 个业务页（service-tree / service-tree/rules / service-tree/environments /
  cmdb/topology）共用 <PageContainer><div class="xxx-page">…</div></PageContainer> 形态。
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
