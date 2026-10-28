<script setup lang="ts">
// 应用壳：AppShell 侧边栏布局（对齐运维平台 e-cam-web 设计，见 layouts/AppShell.vue），
// 所有子路由由 AppShell 承接；菜单导航经 buildTenantUrl 透传当前租户。
import AppShell from '@/layouts/AppShell.vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

// Element Plus 默认使用英文 locale，导致界面出现英文残留：
//   分页「Total 3181 / 820/page 1 2 3 … Go to」、关闭按钮 aria-label「Close this dialog」、
//   分页读屏名「Go to previous page」「page 1591」等。
// 通过 ElConfigProvider 注入中文包，一次性修好所有 EP 组件（分页 / 弹窗 / 抽屉 / 空态 / 日期选择等）。
</script>

<template>
  <el-config-provider :locale="zhCn">
    <AppShell>
      <router-view />
    </AppShell>
  </el-config-provider>
</template>
