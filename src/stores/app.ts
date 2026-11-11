import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 主题类型
 */
export type Theme = 'light' | 'dark' | 'auto'

/**
 * 语言类型
 */
export type Language = 'zh-CN' | 'en-US'

/**
 * 应用配置状态管理
 */
export const useAppStore = defineStore(
    'app',
    () => {
        // 状态
        const theme = ref<Theme>('dark')
        const language = ref<Language>('zh-CN')
        const sidebarCollapsed = ref(false)
        const loading = ref(false)
        const pageTitle = ref('CAM 多云资产管理')

        /**
         * 获取系统主题偏好
         */
        const getSystemTheme = (): 'light' | 'dark' => {
            if (typeof window !== 'undefined' && window.matchMedia) {
                return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
            }
            return 'dark'
        }

        /**
         * 应用主题到 DOM
         */
        const applyTheme = (themeValue: 'light' | 'dark') => {
            const root = document.documentElement
            console.log('Apply theme:', themeValue)
            if (themeValue === 'light') {
                root.classList.add('light')
                root.classList.remove('dark')
            } else {
                root.classList.add('dark')
                root.classList.remove('light')
            }
        }

        /**
         * 设置主题
         */
        const setTheme = (newTheme: Theme) => {
            theme.value = newTheme

            if (newTheme === 'auto') {
                applyTheme(getSystemTheme())
            } else {
                applyTheme(newTheme)
            }
        }

        /**
         * 切换主题 (在 light 和 dark 之间切换)
         */
        const toggleTheme = () => {
            const currentTheme = theme.value === 'auto' ? getSystemTheme() : theme.value
            const newTheme = currentTheme === 'light' ? 'dark' : 'light'
            console.log('Toggle theme:', currentTheme, '->', newTheme)
            setTheme(newTheme)
        }

        /**
         * 获取当前实际应用的主题
         */
        const getActiveTheme = (): 'light' | 'dark' => {
            if (theme.value === 'auto') {
                return getSystemTheme()
            }
            return theme.value
        }

        /**
         * 设置语言
         */
        const setLanguage = (newLanguage: Language) => {
            language.value = newLanguage
            // 这里可以集成 i18n
        }

        /**
         * 设置侧边栏折叠状态
         */
        const setSidebarCollapsed = (collapsed: boolean) => {
            sidebarCollapsed.value = collapsed
        }

        /**
         * 切换侧边栏折叠状态
         */
        const toggleSidebar = () => {
            sidebarCollapsed.value = !sidebarCollapsed.value
        }

        /**
         * 设置全局加载状态
         */
        const setLoading = (value: boolean) => {
            loading.value = value
        }

        /**
         * 设置页面标题。
         *
         * iter342：修正两处问题。
         *
         * ① **品牌名写错了** —— 原为 `CAM 多云资产管理`，那是从 `e-cam-web` 复制本仓时的遗留。
         *    本仓是 CMDB（配置管理数据库），标题里出现「CAM」会让用户以为进错了系统。
         *    现改为与本仓 `index.html` 的 `<title>息壤 · CMDB</title>` 一致。
         *
         * ② **它目前没有任何调用点**（全仓仅定义 + 导出）。路由级标题已由
         *    `router/index.ts` 的 `afterEach` 统一消费 `meta.title` 承担 ——
         *    那才是正确位置：标题应在**每次导航**更新，而不是等某个页面主动调用。
         *    保留本函数（有导出、对外有契约），但**页面不必再调它**；
         *    若将来有页面需要在路由标题之外覆盖（如详情页带对象名），
         *    调它仍可生效 —— 只是品牌名不能再写错。
         */
        const setPageTitle = (title: string) => {
            pageTitle.value = title
            document.title = `${title} - 息壤 · CMDB`
        }

        /**
         * 初始化应用状态
         */
        const initAppState = () => {
            // 应用保存的主题
            setTheme(theme.value)

            // 监听系统主题变化 (仅当设置为 auto 时)
            if (typeof window !== 'undefined' && window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                    if (theme.value === 'auto') {
                        applyTheme(e.matches ? 'dark' : 'light')
                    }
                })
            }

            // 旧版 app store 曾把 string tenantId 写入 localStorage 供请求拦截器注入 X-Tenant-ID。
            // 该头已被后端忽略并在此移除；清掉残留键，避免误导。
            localStorage.removeItem('tenantId')
        }

        return {
            // 状态
            theme,
            language,
            sidebarCollapsed,
            loading,
            pageTitle,
            // 方法
            setTheme,
            toggleTheme,
            getActiveTheme,
            setLanguage,
            setSidebarCollapsed,
            toggleSidebar,
            setLoading,
            setPageTitle,
            initAppState,
        }
    },
    {
        persist: {
            key: 'cam-app',
            storage: localStorage,
        },
    }
)
