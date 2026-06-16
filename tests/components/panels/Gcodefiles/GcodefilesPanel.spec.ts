import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import GcodefilesPanel from '@/components/panels/GcodefilesPanel.vue'

const vuetifyComponentsMock = vi.hoisted(() => ({
    VCardText: { name: 'VCardText', template: '<div><slot /></div>' },
    VDivider: { name: 'VDivider', template: '<hr />' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

vi.mock('@/components/ui/Panel.vue', () => ({
    default: {
        name: 'Panel',
        props: ['title', 'icon', 'cardClass'],
        template: '<div :class="cardClass"><slot /></div>',
    },
}))

vi.mock('@/components/panels/Gcodefiles/GcodefilesPanelHeader.vue', () => ({
    default: {
        name: 'GcodefilesPanelHeader',
        template: '<div class="gcodefiles-panel-header" />',
    },
}))

vi.mock('@/components/panels/Gcodefiles/GcodefilesPanelHeaderPathSize.vue', () => ({
    default: {
        name: 'GcodefilesPanelHeaderPathSize',
        template: '<div class="gcodefiles-panel-header-path-size" />',
    },
}))

vi.mock('@/components/panels/Gcodefiles/GcodefilesPanelList.vue', () => ({
    default: {
        name: 'GcodefilesPanelList',
        template: '<div class="gcodefiles-panel-list" />',
    },
}))

vi.mock('@/plugins/helpers', () => ({
    escapePath: vi.fn((path: string) => path),
    formatFilesize: vi.fn((size: number) => `${size} B`),
    formatPrintTime: vi.fn((seconds: number) => `${seconds}s`),
    generateTimestamp: vi.fn(() => '20240101_120000'),
    convertPrintStatusIcon: vi.fn((status: string) => 'mdi-check-circle'),
    convertPrintStatusIconColor: vi.fn((status: string) => 'success'),
}))

describe('GcodefilesPanel.vue', () => {
    it('renders the panel with correct card class', () => {
        const wrapper = mount(GcodefilesPanel, {
            global: {
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.gcode-files-panel').exists()).toBe(true)
    })

    it('renders all child components', () => {
        const wrapper = mount(GcodefilesPanel, {
            global: {
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.gcodefiles-panel-header').exists()).toBe(true)
        expect(wrapper.find('.gcodefiles-panel-header-path-size').exists()).toBe(true)
        expect(wrapper.find('.gcodefiles-panel-list').exists()).toBe(true)
    })

    it('renders a divider between header and list', () => {
        const wrapper = mount(GcodefilesPanel, {
            global: {
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.findComponent({ name: 'VDivider' }).exists()).toBe(true)
    })

    it('renders children in VCardText', () => {
        const wrapper = mount(GcodefilesPanel, {
            global: {
                mocks: { $t: (key: string) => key },
            },
        })

        const cardText = wrapper.findComponent({ name: 'VCardText' })
        expect(cardText.exists()).toBe(true)
        expect(cardText.find('.gcodefiles-panel-header').exists()).toBe(true)
        expect(cardText.find('.gcodefiles-panel-header-path-size').exists()).toBe(true)
    })
})
