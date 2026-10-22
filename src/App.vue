<script setup lang="ts">
// 应用壳：AppShell 侧边栏布局（对齐运维平台 e-cam-web 设计，见 layouts/AppShell.vue），
// 所有子路由由 AppShell 承接；菜单导航经 buildTenantUrl 透传当前租户。
import AppShell from '@/layouts/AppShell.vue'
</script>

<template>
  <AppShell>
    <router-view />
  </AppShell>
</template>