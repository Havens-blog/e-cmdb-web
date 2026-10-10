import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

/**
 * e-cmdb-web Pinia 实例。
 * app store 使用 persist 选项，故注册 persistedstate 插件。
 * 仅 re-export 迁出的 store（app / topology）；
 * e-cam-web 原 stores/index.ts 里的 account/asset/recentVisits/user
 * 属 CAM 特有 store，未随本次迁移，已移除。
 */
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

export default pinia

export { useAppStore } from './app'
export { useTopologyStore } from './topology'
