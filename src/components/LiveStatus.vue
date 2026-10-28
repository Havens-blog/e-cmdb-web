<!--
  供读屏播报的状态区（视觉不可见）。

  背景：本仓各页加载态用的是 Element Plus 的 `v-loading` 指令，只渲染视觉遮罩与转圈图标，
  **没有 role="status" / aria-live**，读屏用户完全感知不到「正在加载」与「加载完成」。
  该组件提供一个只播报不出声的 polite live region，用法：

    <LiveStatus :text="loading ? '正在加载模型列表…' : `共 ${list.length} 个模型`" />

  注意：文本必须由父组件传入且**变化时才有播报**；空字符串即静默。
-->
<template>
  <div class="live-status" role="status" aria-live="polite" aria-atomic="true">{{ text }}</div>
</template>

<script setup lang="ts">
defineProps<{
  /** 需要播报的文案；空字符串表示静默 */
  text: string
}>()
</script>

<style scoped>
/* 视觉隐藏但保留在无障碍树中（不要用 display:none / visibility:hidden，那会连播报一起消失） */
.live-status {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
