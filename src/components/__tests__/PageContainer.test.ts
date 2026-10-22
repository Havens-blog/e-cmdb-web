// @vitest-environment happy-dom
/**
 * PageContainer 页面外壳容器冒烟测试。
 * 回归背景：该组件曾在拆分后缺失（4 页面引用悬空，运行期
 * "Failed to resolve component: PageContainer"，外壳样式丢失）。
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PageContainer from '../PageContainer.vue'

describe('PageContainer', () => {
    it('渲染 default slot 内容，并带上 .page-container 外壳类', () => {
        const wrapper = mount(PageContainer, {
            slots: { default: '<div class="inner">content</div>' },
        })
        const section = wrapper.find('section.page-container')
        expect(section.exists()).toBe(true)
        expect(section.find('.inner').text()).toBe('content')
    })

    it('无 slot 时也正常渲染空外壳（不抛错）', () => {
        const wrapper = mount(PageContainer)
        expect(wrapper.find('section.page-container').exists()).toBe(true)
    })
})
