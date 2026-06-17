import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PageNotFound from '@/pages/PageNotFound.vue'

describe('PageNotFound.vue', () => {
    it('renders without crashing', () => {
        const wrapper = mount(PageNotFound)
        expect(wrapper.exists()).toBe(true)
    })

    it('shows the 404 page not found text', () => {
        const wrapper = mount(PageNotFound)
        expect(wrapper.text()).toContain('404 page not found')
    })

    it('has the correct CSS classes on the root div', () => {
        const wrapper = mount(PageNotFound)
        const div = wrapper.find('div')
        expect(div.classes()).toContain('text-xs-center')
        expect(div.classes()).toContain('mt-2')
    })
})
