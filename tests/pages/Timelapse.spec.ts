import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}))

// Mock vuetify/components - VRow and VCol as simple div wrappers
vi.mock('vuetify/components', () => ({
    VRow: {
        name: 'VRow',
        template: '<div class="v-row"><slot /></div>',
    },
    VCol: {
        name: 'VCol',
        template: '<div class="v-col"><slot /></div>',
    },
}))

// Mock vuetify useDisplay (component uses display.mdAndUp.value)
vi.mock('vuetify', () => ({
    useDisplay: () => ({
        mdAndUp: { value: true },
    }),
}))

// Mock child components
vi.mock('@/components/panels/Timelapse/TimelapseFilesPanel.vue', () => ({
    default: {
        name: 'TimelapseFilesPanel',
        template: '<div class="timelapse-files-panel" />',
    },
}))

vi.mock('@/components/panels/Timelapse/TimelapseStatusPanel.vue', () => ({
    default: {
        name: 'TimelapseStatusPanel',
        template: '<div class="timelapse-status-panel" />',
    },
}))

// Mock useBase composable
vi.mock('@/composables/useBase', () => ({
    useBase: vi.fn(() => ({
        socketIsConnected: true,
        hostUrl: new URL('http://localhost:8080'),
        apiUrl: 'http://localhost:8080',
    })),
}))

import TimelapsePage from '@/pages/Timelapse.vue'

describe('Timelapse.vue', () => {
    it('renders without crashing', () => {
        const wrapper = mount(TimelapsePage)
        expect(wrapper.exists()).toBe(true)
    })

    it('renders timelapse-files-panel', () => {
        const wrapper = mount(TimelapsePage)
        const filesPanel = wrapper.findComponent({ name: 'TimelapseFilesPanel' })
        expect(filesPanel.exists()).toBe(true)
    })

    it('renders timelapse-status-panel', () => {
        const wrapper = mount(TimelapsePage)
        const statusPanel = wrapper.findComponent({ name: 'TimelapseStatusPanel' })
        expect(statusPanel.exists()).toBe(true)
    })
})
