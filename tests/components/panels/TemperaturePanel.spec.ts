import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import TemperaturePanel from '@/components/panels/TemperaturePanel.vue'

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

vi.mock('@/composables/useControl', () => ({
    useControl: () => ({}),
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}))

const vuetifyComponentsMock = vi.hoisted(() => ({
    VCardText: { name: 'VCardText', template: '<div><slot /></div>' },
    VDivider: { name: 'VDivider', template: '<hr />' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)
vi.mock('@/components/ui/Panel.vue', () => ({
    default: {
        name: 'Panel',
        props: ['icon', 'title', 'collapsible', 'cardClass'],
        template: '<div :class="cardClass"><slot name="buttons" /><slot /></div>',
    },
}))
vi.mock('@/components/panels/Temperature/TemperaturePanelSettings.vue', () => ({
    default: {
        name: 'TemperaturePanelSettings',
        template: '<div class="temp-settings" />',
    },
}))
vi.mock('@/components/panels/Temperature/TemperaturePanelList.vue', () => ({
    default: {
        name: 'TemperaturePanelList',
        template: '<div class="temp-list" />',
    },
}))
vi.mock('@/components/charts/TempChart.vue', () => ({
    default: {
        name: 'TempChart',
        template: '<div class="temp-chart" />',
    },
}))

function createStoreWithState(overrides: Record<string, any> = {}) {
    return createStore({
        state: {
            socket: { isConnected: true, initializationList: [], loadings: [] },
            server: { klippy_connected: true, klippy_state: 'ready', components: [] },
            printer: {
                print_stats: { state: 'standby' },
                idle_timeout: { state: 'Idle' },
                toolhead: { homed_axes: 'xyz' },
            },
            gui: {
                view: {
                    tempchart: {
                        boolTempchart: false,
                    },
                },
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
            'gui/getPanelExpand': () => () => true,
            ...(overrides.getters || {}),
        },
    })
}

describe('TemperaturePanel.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockBaseValues.klipperReadyForGui.value = true
    })

    it('renders nothing when klipper is not ready', () => {
        mockBaseValues.klipperReadyForGui.value = false

        const store = createStoreWithState()
        const wrapper = mount(TemperaturePanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.temperature-panel').exists()).toBe(false)
    })

    it('renders panel with temperature list when klipper is ready', () => {
        const store = createStoreWithState()
        const wrapper = mount(TemperaturePanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.temperature-panel').exists()).toBe(true)
        expect(wrapper.find('.temp-list').exists()).toBe(true)
        expect(wrapper.find('.temp-settings').exists()).toBe(true)
    })

    it('does not render temp chart when boolTempchart is false', () => {
        const store = createStoreWithState()
        const wrapper = mount(TemperaturePanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.temp-chart').exists()).toBe(false)
    })

    it('renders temp chart when boolTempchart is true', () => {
        const store = createStoreWithState({
            gui: {
                view: {
                    tempchart: {
                        boolTempchart: true,
                    },
                },
                dashboard: {
                    nonExpandPanels: { mobile: [], tablet: [], desktop: [], widescreen: [] },
                    floatingPanels: {},
                },
                general: { printername: 'Test' },
                control: {},
                uiSettings: {},
                navigationSettings: { entries: [] },
            },
        })
        const wrapper = mount(TemperaturePanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.temp-chart').exists()).toBe(true)
    })
})
