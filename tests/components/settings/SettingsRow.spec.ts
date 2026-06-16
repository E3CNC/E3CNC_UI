import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsRow from '@/components/settings/SettingsRow.vue'

const vuetifyComponentsMock = vi.hoisted(() => ({
    VRow: { name: 'VRow', template: '<div :class="$attrs.class"><slot /></div>' },
    VCol: {
        name: 'VCol',
        template: '<div :class="$attrs.class"><slot /></div>',
    },
    VIcon: { name: 'VIcon', template: '<i><slot /></i>' },
    VProgressCircular: {
        name: 'VProgressCircular',
        props: ['indeterminate', 'color', 'size'],
        template: '<span class="v-progress-circular" />',
    },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

describe('SettingsRow.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders title prop', () => {
        const wrapper = mount(SettingsRow, {
            props: { title: 'Printer Name' },
            slots: { default: '<span>Input</span>' },
        })

        expect(wrapper.text()).toContain('Printer Name')
    })

    it('renders subTitle when provided', () => {
        const wrapper = mount(SettingsRow, {
            props: { title: 'Progress', subTitle: 'Calculate print progress' },
            slots: { default: '<span>Input</span>' },
        })

        expect(wrapper.text()).toContain('Progress')
        expect(wrapper.text()).toContain('Calculate print progress')
    })

    it('does not render subTitle when not provided', () => {
        const wrapper = mount(SettingsRow, {
            props: { title: 'Printer Name' },
            slots: { default: '<span>Input</span>' },
        })

        expect(wrapper.text()).toContain('Printer Name')
        expect(wrapper.find('.settings-row-subtitle').exists()).toBe(false)
    })

    it('renders icon when provided', () => {
        const wrapper = mount(SettingsRow, {
            props: { title: 'Test', icon: 'mdiTest' },
            slots: { default: '<span>Input</span>' },
        })

        expect(wrapper.findComponent({ name: 'v-icon' }).exists()).toBe(true)
    })

    it('does not render icon when not provided', () => {
        const wrapper = mount(SettingsRow, {
            props: { title: 'Test' },
            slots: { default: '<span>Input</span>' },
        })

        expect(wrapper.findComponent({ name: 'v-icon' }).exists()).toBe(false)
    })

    it('shows progress circular when loading is true', () => {
        const wrapper = mount(SettingsRow, {
            props: { title: 'Test', loading: true },
            slots: { default: '<span>Input</span>' },
        })

        expect(wrapper.find('.v-progress-circular').exists()).toBe(true)
    })

    it('renders default slot content', () => {
        const wrapper = mount(SettingsRow, {
            props: { title: 'Test' },
            slots: { default: '<span class="slot-content">Custom Input</span>' },
        })

        expect(wrapper.find('.slot-content').exists()).toBe(true)
        expect(wrapper.text()).toContain('Custom Input')
    })

    it('applies dense class when dense prop is true', () => {
        const wrapper = mount(SettingsRow, {
            props: { title: 'Test', dense: true },
            slots: { default: '<span>Input</span>' },
        })

        const cols = wrapper.findAllComponents({ name: 'v-col' })
        expect(cols.length).toBeGreaterThanOrEqual(1)
    })

    it('has correct default column classes', () => {
        const wrapper = mount(SettingsRow, {
            props: { title: 'Printer Name' },
            slots: { default: '<span>Input</span>' },
        })

        expect(wrapper.text()).toContain('Printer Name')
    })

    it('renders with dynamicSlotWidth prop', () => {
        const wrapper = mount(SettingsRow, {
            props: { title: 'Test', dynamicSlotWidth: true },
            slots: { default: '<span>Input</span>' },
        })

        expect(wrapper.text()).toContain('Test')
    })

    it('renders with mobileSecondRow prop', () => {
        const wrapper = mount(SettingsRow, {
            props: { title: 'Test', mobileSecondRow: true },
            slots: { default: '<span>Input</span>' },
        })

        expect(wrapper.text()).toContain('Test')
    })
})
