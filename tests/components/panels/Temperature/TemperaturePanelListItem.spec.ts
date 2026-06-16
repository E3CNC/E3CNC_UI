import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import TemperaturePanelListItem from '@/components/panels/Temperature/TemperaturePanelListItem.vue'

// Mock eventBus — MUST use vi.hoisted because vi.mock is hoisted above all code
const mockEventBus = vi.hoisted(() => ({
    $on: vi.fn(),
    $emit: vi.fn(),
    $off: vi.fn(),
}))

const mockSocketEmit = vi.hoisted(() => vi.fn())

// Mock Vuetify components to prevent CSS import errors — before other vi.mock calls
vi.mock('vuetify/components', () => ({
    VApp: { template: '<div><slot /></div>' },
    VTooltip: { template: '<div class="mock-v-tooltip"><slot name="activator" :props="{}" /><slot /></div>' },
    VIcon: { template: '<i class="mock-v-icon"><slot /></i>' },
    VMenu: { template: '<div class="mock-v-menu"><slot /></div>' },
    VList: { template: '<div class="mock-v-list"><slot /></div>' },
    VListItem: { template: '<div class="mock-v-list-item"><slot /></div>' },
}))

vi.mock('@/plugins/eventBus', () => ({
    EventBus: mockEventBus,
    CLOSE_CONTEXT_MENU: 'close-context-menu',
}))

// Mock child components
vi.mock('@/components/inputs/TemperatureInput.vue', () => ({
    default: {
        name: 'TemperatureInput',
        props: ['name', 'target', 'minTemp', 'maxTemp', 'command', 'inputDigits', 'attributeName'],
        template: '<div class="mock-temp-input" :data-target="target"></div>',
    },
}))

vi.mock('@/components/panels/Temperature/TemperaturePanelListItemEdit.vue', () => ({
    default: {
        name: 'TemperaturePanelListItemEdit',
        props: ['modelValue', 'showDialog', 'objectName', 'name', 'formatName', 'additionalSensorName', 'icon', 'color'],
        template: '<div class="mock-edit-dialog" />',
    },
}))

vi.mock('@/components/panels/Temperature/TemperaturePanelListItemAdditionalSensor.vue', () => ({
    default: {
        name: 'TemperaturePanelListItemAdditionalSensor',
        props: ['objectName', 'additionalObjectName'],
        template: '<div class="mock-additional-sensor" />',
    },
}))

// Mock composables
vi.mock('@/composables/useSocket', () => ({
    useSocket: () => ({
        emit: mockSocketEmit,
    }),
}))

vi.mock('@/composables/useBase', () => ({
    useBase: () => ({}),
}))

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}))

// Mock @mdi/js
vi.mock('@mdi/js', () => ({
    mdiCog: 'cog-icon',
    mdiFan: 'fan-icon',
    mdiFire: 'fire-icon',
    mdiMemory: 'memory-icon',
    mdiPrinter3dNozzle: 'nozzle-icon',
    mdiPrinter3dNozzleAlert: 'nozzle-alert-icon',
    mdiRadiator: 'radiator-icon',
    mdiRadiatorDisabled: 'radiator-disabled-icon',
    mdiSnowflake: 'snowflake-icon',
    mdiThermometer: 'thermometer-icon',
}))

// Mock helpers
vi.mock('@/plugins/helpers', () => ({
    convertName: (name: string) =>
        name
            .replace(/_/g, ' ')
            .split(' ')
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(' '),
}))

// Mock store/variables
vi.mock('@/store/variables', () => ({
    additionalSensors: ['bme280', 'htu21d', 'temperature_combined'],
    opacityHeaterActive: '99',
    opacityHeaterInactive: '44',
}))

describe('TemperaturePanelListItem.vue', () => {
    let store: ReturnType<typeof createStore>

    function createStoreWithState(overrides: Record<string, any> = {}) {
        return createStore({
            state: {
                printer: {
                    extruder: {
                        temperature: 200.5,
                        target: 210,
                        can_extrude: true,
                    },
                    heater_bed: {
                        temperature: 60.0,
                        target: 60,
                    },
                    'heater_generic chamber': {
                        temperature: 30.0,
                        target: 35,
                    },
                    'temperature_sensor chamber': {
                        temperature: 25.0,
                    },
                    'temperature_fan hotend_fan': {
                        temperature: 30.0,
                        speed: 0.75,
                        rpm: 5000,
                    },
                    tmc2209: {
                        temperature: 40.0,
                    },
                    configfile: {
                        settings: {
                            extruder: { min_temp: 0, max_temp: 300 },
                            heater_bed: { min_temp: 0, max_temp: 120 },
                            'temperature_sensor chamber': { sensor_type: 'temperature_mcu' },
                        },
                    },
                    heaters: {
                        available_heaters: ['extruder', 'heater_bed', 'heater_generic chamber'],
                        available_sensors: [],
                        available_monitors: [],
                    },
                },
                gui: {
                    view: {
                        tempchart: {},
                    },
                    uiSettings: {
                        disableFanAnimation: false,
                    },
                },
                ...overrides,
            },
            getters: {
                'printer/tempHistory/getDatasetColor': () => () => '#FF5500',
                'printer/tempHistory/getAvgPower': () => () => 0,
                'printer/tempHistory/getAvgSpeed': () => () => 0,
                ...(overrides.getters || {}),
            },
        })
    }

    function mountListItem(props: Record<string, any> = {}, storeOverrides: Record<string, any> = {}) {
        const s = createStoreWithState(storeOverrides)
        return {
            wrapper: mount(TemperaturePanelListItem, {
                props: {
                    objectName: 'extruder',
                    isResponsiveMobile: false,
                    ...props,
                },
                global: {
                    plugins: [s],
                    mocks: { $t: (key: string) => key },
                },
            }),
            store: s,
        }
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('rendering', () => {
        it('renders extruder name', () => {
            const { wrapper } = mountListItem()
            expect(wrapper.text()).toContain('Extruder')
        })

        it('renders heater_bed name', () => {
            const { wrapper } = mountListItem({ objectName: 'heater_bed' })
            expect(wrapper.text()).toContain('Heater Bed')
        })

        it('renders temperature_sensor name', () => {
            const { wrapper } = mountListItem({ objectName: 'temperature_sensor chamber' })
            expect(wrapper.text()).toContain('Chamber')
        })

        it('renders temperature_fan name', () => {
            const { wrapper } = mountListItem({ objectName: 'temperature_fan hotend_fan' })
            expect(wrapper.text()).toContain('Hotend Fan')
        })

        it('displays formatted temperature with °C suffix', () => {
            const { wrapper } = mountListItem()
            expect(wrapper.text()).toContain('200.5°C')
        })

        it('displays --°C when temperature is null', () => {
            const { wrapper } = mountListItem(
                { objectName: 'temperature_sensor chamber' },
                {
                    printer: {
                        'temperature_sensor chamber': {},
                        configfile: { settings: {} },
                    },
                }
            )
            expect(wrapper.text()).toContain('--°C')
        })

        it('displays state as percentage when speed is present', () => {
            const { wrapper } = mountListItem({ objectName: 'temperature_fan hotend_fan' })
            expect(wrapper.text()).toContain('75 %')
        })

        it('displays RPM for fans when present', () => {
            const { wrapper } = mountListItem({ objectName: 'temperature_fan hotend_fan' })
            expect(wrapper.text()).toContain('5000 RPM')
        })

        it('renders TemperatureInput for heaters', () => {
            const { wrapper } = mountListItem()
            expect(wrapper.find('.mock-temp-input').exists()).toBe(true)
        })

        it('does not render TemperatureInput for sensors', () => {
            const { wrapper } = mountListItem({ objectName: 'temperature_sensor chamber' })
            expect(wrapper.find('.mock-temp-input').exists()).toBe(false)
        })

        it('renders edit dialog', () => {
            const { wrapper } = mountListItem()
            expect(wrapper.find('.mock-edit-dialog').exists()).toBe(true)
        })

        it('renders icon', () => {
            const { wrapper } = mountListItem()
            expect(wrapper.find('.mock-v-icon').exists()).toBe(true)
        })
    })

    describe('measured temperatures', () => {
        it('handles measured_min_temp and measured_max_temp gracefully', () => {
            const { wrapper } = mountListItem(
                {},
                {
                    printer: {
                        extruder: {
                            temperature: 200.5,
                            target: 210,
                            can_extrude: true,
                            measured_min_temp: 199.1234,
                            measured_max_temp: 201.5678,
                        },
                        configfile: {
                            settings: { extruder: { min_temp: 0, max_temp: 300 } },
                        },
                    },
                }
            )

            expect(wrapper.text()).toContain('200.5°C')
        })
    })

    describe('lifecycle', () => {
        it('registers event bus listener on mount', () => {
            const { wrapper } = mountListItem()
            expect(mockEventBus.$on).toHaveBeenCalledWith('close-context-menu', expect.any(Function))
        })

        it('unregisters event bus listener on unmount', () => {
            const { wrapper } = mountListItem()
            wrapper.unmount()
            expect(mockEventBus.$off).toHaveBeenCalledWith('close-context-menu', expect.any(Function))
        })
    })
})
