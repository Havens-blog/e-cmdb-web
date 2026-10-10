import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'

/**
 * e-cmdb-web 路由（base '/cmdb/'，与 vite base 一致）。
 *
 * 鉴权口径：本应用无本地登录页——会话 cookie（ecmdb-token-key）+ Bearer 由请求层
 * 承载，401 统一跳控制台登录（/console/login）。路由守卫（eiam 登录跳转等 CAM
 * 特有逻辑）已在迁移中移除，直接放行渲染。
 */
export const router = createRouter({
    // BASE_URL 来自 vite base '/cmdb/'，与 nginx 同域反代形态一致
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
})
