import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import pinia from './stores'

// 主题令牌（单一来源 @haven/ui；在 index.scss 之前加载）
import '@haven/ui/theme'

// 全局样式（Linear 深色主题 + Element Plus 覆盖）
import './assets/styles/index.scss'

// iconfont 图标库（字体图标 + SVG symbol 彩色图标，与 e-cam-web 同源）
import '../public/iconfont/iconfont.css'
import '../public/iconfont/iconfont.js'

// 全局组件
import { IconFont } from '@haven/ui/IconFont'

const app = createApp(App)

// 注册全局组件（页面模板中 <IconFont> 使用）
app.component('IconFont', IconFont)

app.use(pinia)
app.use(router)

app.mount('#app')
