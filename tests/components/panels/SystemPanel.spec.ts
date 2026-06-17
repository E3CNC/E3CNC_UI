import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import SystemPanel from '@/components/panels/Machine/SystemPanel.vue'

const mockBaseValues = vi.hoisted(() => {
    class MockRef {
        _value: any
        __v_isRef = true
        __v_isShallow = false
        constructor(val: any) {
            this._value = val
        }
        get value() {
            return this._value
        }
        set value(v) {
            this._value = v
        }
    }
    return {
        klipperReadyForGui: new MockRef(true),
    }
})

vi.mock('@/composables/useBase', () => ({
    useBase: () => mockBaseValues,
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}))

const vuetifyComponentsMock = vi.hoisted(() => ({
    VCardText: { name: 'VCardText', template: '<div><slot /></div>' },
    VDivider: { name: 'VDivider', template: '<hr />' },
    VBtn: {
        name: 'VBtn',
        props: ['icon', 'rounded', 'variant'],
        template: '<button :class="$attrs.class" @click="$attrs.onClick || $attrs.click"><slot /></button>',
    },
    VIcon: { name: 'VIcon', props: ['size'], template: '<i><slot /></i>' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)
vi.mock('@/components/ui/Panel.vue', () => ({
    default: {
        name: 'Panel',
        props: ['icon', 'title', 'collapsible', 'cardClass'],
        template: '<div :class="cardClass"><slot name="buttons" /><slot /></div>',
    },
}))
vi.mock('@/components/panels/Machine/SystemPanelMcu.vue', () => ({
    default: {
        name: 'SystemPanelMcu',
        props: ['mcu'],
        template: '<div class="system-mcu">{{ mcu.name }}</div>',
    },
}))
vi.mock('@/components/panels/Machine/SystemPanelHost.vue', () => ({
    default: {
        name: 'SystemPanelHost',
        template: '<div class="system-host" />',
    },
}))
vi.mock('@/components/dialogs/DevicesDialog.vue', () => ({
    default: {
        name: 'DevicesDialog',
        props: ['modelValue'],
        template: '<div class="devices-dialog" />',
    },
}))

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
            'printer/getMcus': () => [],
            'server/getHostStats': () => null,
            ...(overrides.getters || {}),
        },
    })
}

describe('SystemPanel.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockBaseValues.klipperReadyForGui.value = true
    })

    it('renders nothing when klipper not ready', () => {
        mockBaseValues.klipperReadyForGui.value = false

        const store = createStoreWithState()
        const wrapper = mount(SystemPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.machine-systemload-panel').exists()).toBe(false)
    })

    it('renders nothing when no MCUs and no host stats', () => {
        const store = createStoreWithState()
        const wrapper = mount(SystemPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.machine-systemload-panel').exists()).toBe(false)
    })

    it('renders with MCU items when MCUs exist', () => {
        const store = createStoreWithState({
            getters: {
                'printer/getMcus': () => [{ name: 'mcu' }, { name: 'rpi' }],
                'server/getHostStats': () => null,
                'gui/getPanelExpand': () => () => true,
            },
        })
        const wrapper = mount(SystemPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.machine-systemload-panel').exists()).toBe(true)
        const mcus = wrapper.findAll('.system-mcu')
        expect(mcus).toHaveLength(2)
        expect(mcus[0].text()).toBe('mcu')
        expect(mcus[1].text()).toBe('rpi')
    })

    it('renders host section when host stats exist', () => {
        const store = createStoreWithState({
            getters: {
                'printer/getMcus': () => [],
                'server/getHostStats': () => ({ cpu: 25, memory: 50 }),
                'gui/getPanelExpand': () => () => true,
            },
        })
        const wrapper = mount(SystemPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.machine-systemload-panel').exists()).toBe(true)
        expect(wrapper.find('.system-host').exists()).toBe(true)
    })

    it('renders MCUs and host together when both exist', () => {
        const store = createStoreWithState({
            getters: {
                'printer/getMcus': () => [{ name: 'mcu' }],
                'server/getHostStats': () => ({ cpu: 25, memory: 50 }),
                'gui/getPanelExpand': () => () => true,
            },
        })
        const wrapper = mount(SystemPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.machine-systemload-panel').exists()).toBe(true)
        expect(wrapper.findAll('.system-mcu')).toHaveLength(1)
        expect(wrapper.find('.system-host').exists()).toBe(true)
    })

    it('has devices dialog button', () => {
        const store = createStoreWithState({
            getters: {
                'printer/getMcus': () => [{ name: 'mcu' }],
                'server/getHostStats': () => null,
                'gui/getPanelExpand': () => () => true,
            },
        })
        const wrapper = mount(SystemPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.machine-systemload-panel').exists()).toBe(true)
        // Should find the buttons slot with the USB/device button
        const buttons = wrapper.findAll('button')
        expect(buttons.length).toBeGreaterThanOrEqual(1)
    })
})
