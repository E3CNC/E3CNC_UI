import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import LogfilesPanel from '@/components/panels/Machine/LogfilesPanel.vue'

const mockBaseValues = vi.hoisted(() => ({
    loadings: { value: [] as string[], __v_isRef: true },
    printer_state: { value: 'ready', __v_isRef: true },
}))

vi.mock('@/composables/useBase', () => ({
    useBase: () => mockBaseValues,
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}))

vi.mock('@/store/variables', () => ({
    genericLogfiles: ['klippy', 'moonraker', 'crowsnest', 'mmu', 'sonar'],
}))

const vuetifyComponentsMock = vi.hoisted(() => ({
    VRow: { name: 'VRow', template: '<div :class="$attrs.class"><slot /></div>' },
    VCol: { name: 'VCol', template: '<div :class="$attrs.class"><slot /></div>' },
    VTooltip: { name: 'VTooltip', template: '<div><slot name="activator" /><slot /></div>' },
    VIcon: { name: 'VIcon', template: '<i class="v-icon"><slot /></i>' },
    VBtn: {
        name: 'VBtn',
        props: ['icon', 'rounded', 'ripple', 'color', 'loading', 'disabled'],
        template: '<button :class="$attrs.class" @click="$attrs.onClick || $attrs.click"><slot /></button>',
    },
    VCard: { name: 'VCard', template: '<div><slot /></div>' },
    VCardText: { name: 'VCardText', template: '<div><slot /></div>' },
    VDialog: {
        name: 'VDialog',
        props: ['modelValue', 'persistent', 'width', 'fullscreen'],
        template: '<div v-if="modelValue" class="v-dialog"><slot /></div>',
    },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

vi.mock('@/components/ui/Panel.vue', () => ({
    default: {
        name: 'Panel',
        props: ['title', 'icon', 'cardClass', 'collapsible'],
        template: '<div :class="cardClass">{{ title }}<slot name="buttons" /><slot /></div>',
    },
}))

vi.mock('@/components/panels/Machine/LogfilesPanel/LogfilesPanelGenericLog.vue', () => ({
    default: {
        name: 'LogfilesPanelGenericLog',
        props: ['name'],
        template: '<div class="generic-log">{{ name }}</div>',
    },
}))

vi.mock('@/components/panels/Machine/LogfilesPanel/LogfilesPanelRolloverDialog.vue', () => ({
    default: {
        name: 'LogfilesPanelRolloverDialog',
        props: ['modelValue'],
        template: '<div class="rollover-dialog" />',
        emits: ['update:model-value'],
    },
}))

const $t = (key: string) => key

function createStoreWithState(overrides: Record<string, any> = {}) {
    return createStore({
        state: {
            socket: { isConnected: true, initializationList: [], loadings: [] },
            server: {
                klippy_connected: true,
                klippy_state: 'ready',
                components: [],
                ...(overrides.server || {}),
            },
            printer: {
                print_stats: { state: 'standby' },
                idle_timeout: { state: 'Idle' },
                toolhead: { homed_axes: 'xyz' },
                ...(overrides.printer || {}),
            },
            gui: {
                dashboard: {
                    nonExpandPanels: { mobile: [], tablet: [], desktop: [], widescreen: [] },
                    floatingPanels: {},
                },
                general: { printername: 'Test' },
                control: {},
                uiSettings: {},
                navigationSettings: { entries: [] },
            },
            files: {},
            instancesDB: 'moonraker',
            ...overrides,
        },
        getters: {
            'socket/getUrl': () => '//localhost:8080',
            'socket/getHostUrl': () => '//localhost:8080',
            'gui/getPanelExpand': () => () => true,
            ...(overrides.getters || {}),
        },
    })
}

describe('LogfilesPanel.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockBaseValues.loadings.value = []
        mockBaseValues.printer_state.value = 'ready'
    })

    it('renders the panel with logfiles title', () => {
        const store = createStoreWithState()
        const wrapper = mount(LogfilesPanel, {
            global: {
                plugins: [store],
                mocks: { $t },
            },
        })

        expect(wrapper.find('.machine-logfiles-panel').exists()).toBe(true)
        expect(wrapper.text()).toContain('Machine.LogfilesPanel.Logfiles')
    })

    it('renders generic log files for known log types', () => {
        const store = createStoreWithState()
        const wrapper = mount(LogfilesPanel, {
            global: {
                plugins: [store],
                mocks: { $t },
            },
        })

        const logs = wrapper.findAll('.generic-log')
        expect(logs).toHaveLength(5)
        expect(logs[0].text()).toBe('klippy')
        expect(logs[1].text()).toBe('moonraker')
        expect(logs[2].text()).toBe('crowsnest')
        expect(logs[3].text()).toBe('mmu')
        expect(logs[4].text()).toBe('sonar')
    })

    it('renders the rollover button', () => {
        const store = createStoreWithState()
        const wrapper = mount(LogfilesPanel, {
            global: {
                plugins: [store],
                mocks: { $t },
            },
        })

        expect(wrapper.text()).toContain('Machine.LogfilesPanel.Rollover')
    })

    it('renders the rollover dialog component', () => {
        const store = createStoreWithState()
        const wrapper = mount(LogfilesPanel, {
            global: {
                plugins: [store],
                mocks: { $t },
            },
        })

        expect(wrapper.find('.rollover-dialog').exists()).toBe(true)
    })

    it('shows loading state on rollover button when loading', () => {
        mockBaseValues.loadings.value = ['loadingBtnRolloverLogs']

        const store = createStoreWithState()
        const wrapper = mount(LogfilesPanel, {
            global: {
                plugins: [store],
                mocks: { $t },
            },
        })

        const btn = wrapper.findComponent({ name: 'VBtn' })
        expect(btn.props('loading')).toBe(true)
    })

    it('disables rollover button when printer is printing', () => {
        mockBaseValues.printer_state.value = 'printing'

        const store = createStoreWithState()
        const wrapper = mount(LogfilesPanel, {
            global: {
                plugins: [store],
                mocks: { $t },
            },
        })

        const btn = wrapper.findComponent({ name: 'VBtn' })
        expect(btn.props('disabled')).toBe(true)
    })

    it('disables rollover button when printer is paused', () => {
        mockBaseValues.printer_state.value = 'paused'

        const store = createStoreWithState()
        const wrapper = mount(LogfilesPanel, {
            global: {
                plugins: [store],
                mocks: { $t },
            },
        })

        const btn = wrapper.findComponent({ name: 'VBtn' })
        expect(btn.props('disabled')).toBe(true)
    })
})
