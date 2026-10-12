<script setup lang="ts">
// 应用根：仅承载路由出口。导航壳由路由顶层 '/' 挂载的 AppShell 提供
// （src/router/routes.ts），此处不得再包一层 AppShell——否则壳会渲染两次，
// 出现两条侧边栏（该双壳 bug 已实测复现并修复）。
</script>

<template>
  <router-view />
</template>
