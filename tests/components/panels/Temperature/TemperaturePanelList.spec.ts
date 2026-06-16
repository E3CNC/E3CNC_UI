import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import TemperaturePanelList from '@/components/panels/Temperature/TemperaturePanelList.vue'

// Mock Vuetify components — simple templates
vi.mock('vuetify/components', () => ({
    VTable: {
        name: 'VTable',
        props: { class: String },
        template: '<div class="v-table"><slot /></div>',
    },
}))

// Mock Responsive — pass through el.is.mobile to slot
vi.mock('@/components/ui/Responsive.vue', () => ({
    default: {
        name: 'Responsive',
        props: { breakpoints: Object, noHide: Boolean },
        template: '<div class="responsive"><slot :el="{ is: { mobile: false } }" /></div>',
    },
}))

// Mock child components
vi.mock('@/components/panels/Temperature/TemperaturePanelListItem.vue', () => ({
    default: {
        name: 'TemperaturePanelListItem',
        props: ['objectName', 'inputDigits', 'isResponsiveMobile'],
        template: '<div class="mock-list-item" :data-object-name="objectName" :data-input-digits="inputDigits">{{ objectName }}</div>',
    },
}))

vi.mock('@/components/panels/Temperature/TemperaturePanelListItemNevermore.vue', () => ({
    default: {
        name: 'TemperaturePanelListItemNevermore',
        props: ['objectName', 'isResponsiveMobile'],
        template: '<div class="mock-nevermore-item" :data-object-name="objectName">{{ objectName }}</div>',
    },
}))

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}))

describe('TemperaturePanelList.vue', () => {
    let store: ReturnType<typeof createStore>

    function createStoreWithState(overrides: Record<string, any> = {}) {
        return createStore({
            state: {
                printer: {
                    heaters: {
                        available_heaters: ['extruder', 'heater_bed'],
                        available_sensors: ['temperature_sensor chamber', 'temperature_fan hotend_fan', 'temperature_mcu mcu'],
                        available_monitors: ['temperature_host raspberry_pi'],
                    },
                    configfile: {
                        settings: {
                            extruder: { max_temp: 300 },
                            heater_bed: { max_temp: 120 },
                        },
                    },
                    extruder: { temperature: 200.0, target: 210.0 },
                    heater_bed: { temperature: 60.0, target: 60.0 },
                    'temperature_sensor chamber': { temperature: 25.0 },
                    'temperature_fan hotend_fan': { temperature: 30.0, speed: 0.5 },
                    'temperature_mcu mcu': { temperature: 35.0 },
                    'temperature_host raspberry_pi': { temperature: 40.0 },
                },
                gui: {
                    view: {
                        tempchart: {
                            boolTempchart: true,
                            hideMcuHostSensors: false,
                            hideMonitors: false,
                        },
                    },
                },
                ...overrides,
            },
            getters: {},
        })
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders the table headers', () => {
        const store = createStoreWithState()
        const wrapper = mount(TemperaturePanelList, {
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })

        expect(wrapper.text()).toContain('Panels.TemperaturePanel.Name')
        expect(wrapper.text()).toContain('Panels.TemperaturePanel.Current')
        expect(wrapper.text()).toContain('Panels.TemperaturePanel.Target')
        expect(wrapper.text()).toContain('Panels.TemperaturePanel.State')
    })

    it('renders heater objects (extruder, heater_bed)', () => {
        const store = createStoreWithState()
        const wrapper = mount(TemperaturePanelList, {
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })

        const items = wrapper.findAll('.mock-list-item')
        const objectNames = items.map(item => item.attributes('data-object-name'))
        expect(objectNames).toContain('extruder')
        expect(objectNames).toContain('heater_bed')
    })

    it('renders temperature_fan items as list items', () => {
        const store = createStoreWithState()
        const wrapper = mount(TemperaturePanelList, {
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })

        const items = wrapper.findAll('.mock-list-item')
        const objectNames = items.map(item => item.attributes('data-object-name'))
        expect(objectNames).toContain('temperature_fan hotend_fan')
    })

    it('renders nevermore items', () => {
        const store = createStoreWithState({
            printer: {
                ...createStoreWithState().state.printer,
                nevermore: { speed: 0.5 },
                'nevermore carbon_filter': { speed: 0.75 },
            },
        })
        const wrapper = mount(TemperaturePanelList, {
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })

        const nevermoreItems = wrapper.findAll('.mock-nevermore-item')
        const objectNames = nevermoreItems.map(item => item.attributes('data-object-name'))
        expect(objectNames).toContain('nevermore')
        expect(objectNames).toContain('nevermore carbon_filter')
    })

    it('renders temperature sensors (excluding heaters and fans)', () => {
        const store = createStoreWithState()
        const wrapper = mount(TemperaturePanelList, {
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })

        const items = wrapper.findAll('.mock-list-item')
        const objectNames = items.map(item => item.attributes('data-object-name'))

        expect(objectNames).toContain('temperature_sensor chamber')
    })

    it('renders monitors when hideMonitors is false', () => {
        const store = createStoreWithState()
        const wrapper = mount(TemperaturePanelList, {
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })

        const items = wrapper.findAll('.mock-list-item')
        const objectNames = items.map(item => item.attributes('data-object-name'))
        expect(objectNames).toContain('temperature_host raspberry_pi')
    })

    it('hides monitors when hideMonitors is true', () => {
        const store = createStoreWithState({
            gui: {
                view: {
                    tempchart: {
                        boolTempchart: true,
                        hideMcuHostSensors: false,
                        hideMonitors: true,
                    },
                },
            },
        })
        const wrapper = mount(TemperaturePanelList, {
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })

        const items = wrapper.findAll('.mock-list-item')
        const objectNames = items.map(item => item.attributes('data-object-name'))
        expect(objectNames).not.toContain('temperature_host raspberry_pi')
    })

    it('hides mcu/host sensors when hideMcuHostSensors is true', () => {
        const baseState = createStoreWithState().state.printer as Record<string, any>
        const store = createStoreWithState({
            printer: {
                ...baseState,
                configfile: {
                    settings: {
                        ...baseState.configfile?.settings,
                        'temperature_mcu mcu': { sensor_type: 'temperature_mcu' },
                    },
                },
            },
            gui: {
                view: {
                    tempchart: {
                        boolTempchart: true,
                        hideMcuHostSensors: true,
                        hideMonitors: false,
                    },
                },
            },
        })
        const wrapper = mount(TemperaturePanelList, {
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })

        const items = wrapper.findAll('.mock-list-item')
        const objectNames = items.map(item => item.attributes('data-object-name'))

        expect(objectNames).not.toContain('temperature_mcu mcu')
        expect(objectNames).toContain('temperature_sensor chamber')
        expect(objectNames).toContain('temperature_fan hotend_fan')
    })

    it('hides items with names starting with underscore', () => {
        const store = createStoreWithState({
            printer: {
                heaters: {
                    available_heaters: ['extruder', 'heater_bed'],
                    available_sensors: ['temperature_sensor _hidden'],
                    available_monitors: [],
                },
                configfile: {
                    settings: {},
                },
            },
        })
        const wrapper = mount(TemperaturePanelList, {
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })

        const items = wrapper.findAll('.mock-list-item')
        const objectNames = items.map(item => item.attributes('data-object-name'))
        expect(objectNames).not.toContain('temperature_sensor _hidden')
    })

    it('calculates inputFieldDigits based on max temperature', () => {
        const store = createStoreWithState({
            printer: {
                heaters: {
                    available_heaters: ['extruder'],
                    available_sensors: [],
                    available_monitors: [],
                },
                configfile: {
                    settings: {
                        extruder: { max_temp: 300 },
                    },
                },
            },
        })
        const wrapper = mount(TemperaturePanelList, {
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })

        const items = wrapper.findAll('.mock-list-item')
        expect(items.length).toBeGreaterThan(0)
        expect(items[0].attributes('data-input-digits')).toBe('3')
    })

    it('handles empty available_heaters gracefully', () => {
        const store = createStoreWithState({
            printer: {
                heaters: {
                    available_heaters: [],
                    available_sensors: [],
                    available_monitors: [],
                },
                configfile: { settings: {} },
            },
        })
        const wrapper = mount(TemperaturePanelList, {
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })

        expect(wrapper.find('.v-table').exists()).toBe(true)
        expect(wrapper.findAll('.mock-list-item').length).toBe(0)
    })

    it('renders state column by default (non-mobile)', () => {
        const store = createStoreWithState()
        const wrapper = mount(TemperaturePanelList, {
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })

        expect(wrapper.text()).toContain('Panels.TemperaturePanel.State')
    })
})
