import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import PrintstatusPrinting from '@/components/panels/Status/PrintstatusPrinting.vue'

const vuetifyComponentsMock = vi.hoisted(() => ({
    VCardText: { template: '<div><slot /></div>' },
    VContainer: { template: '<div><slot /></div>' },
    VRow: { template: '<div><slot /></div>' },
    VCol: { name: 'VCol', template: '<div><slot /></div>' },
    VTooltip: { template: '<div><slot name="activator" /><slot /></div>' },
    VDivider: { template: '<hr />' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

const mockT = vi.hoisted(() =>
    vi.fn((key: string) => {
        const translations: Record<string, string> = {
            'Panels.StatusPanel.Speed': 'Speed',
            'Panels.StatusPanel.Requested': 'Requested',
            'Panels.StatusPanel.Flow': 'Flow',
            'Panels.StatusPanel.Max': 'Max',
            'Panels.StatusPanel.Layer': 'Layer',
            'Panels.StatusPanel.ObjectHeight': 'Object Height',
            'Panels.StatusPanel.Estimate': 'Estimate',
            'Panels.StatusPanel.File': 'File',
            'Panels.StatusPanel.Filament': 'Filament',
            'Panels.StatusPanel.Slicer': 'Slicer',
            'Panels.StatusPanel.Total': 'Total',
            'Panels.StatusPanel.Print': 'Print',
            'Panels.StatusPanel.Difference': 'Difference',
            'Panels.StatusPanel.ETA': 'ETA',
        }
        return translations[key] ?? key
    })
)

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: mockT,
    }),
}))

const mountOptions = {
    global: { plugins: [] as any[], mocks: { $t: mockT } },
}

function createStoreWithState(overrides: Record<string, any> = {}) {
    return createStore({
        state: {
            printer: {
                motion_report: {
                    live_velocity: 50.123,
                    live_extruder_velocity: 4.5,
                },
                gcode_move: {
                    speed: 3000,
                    speed_factor: 1.0,
                },
                toolhead: {
                    max_velocity: 500,
                },
                print_stats: {
                    print_duration: 600,
                    total_duration: 3600,
                    filament_used: 1500,
                },
                current_file: {
                    filament_total: 5000,
                    object_height: 50,
                },
                configfile: {
                    settings: {
                        extruder: {
                            filament_diameter: 1.75,
                        },
                    },
                },
                ...(overrides.printer || {}),
            },
            ...overrides,
        },
        getters: {
            'printer/getPrintMaxLayers': () => 100,
            'printer/getPrintCurrentLayer': () => 25,
            'printer/getEstimatedTimeFile': () => 3600,
            'printer/getEstimatedTimeFilament': () => 3500,
            'printer/getEstimatedTimeSlicer': () => 3800,
            'printer/getEstimatedTimeAvg': () => 3633,
            'printer/getEstimatedTimeETAFormat': () => '14:30',
            ...(overrides.getters || {}),
        },
    })
}

function mountComponent(store: any) {
    return mount(PrintstatusPrinting, {
        global: { plugins: [store], mocks: { $t: mockT } },
    })
}

describe('PrintstatusPrinting.vue', () => {
    it('renders live velocity from motion_report', () => {
        const store = createStoreWithState()
        const wrapper = mountComponent(store)
        expect(wrapper.text()).toContain('50 mm/s')
    })

    it('renders requested speed when live_velocity is null', () => {
        const store = createStoreWithState({
            printer: {
                motion_report: {
                    live_velocity: null,
                    live_extruder_velocity: null,
                },
                gcode_move: {
                    speed: 3000,
                    speed_factor: 1.0,
                },
                toolhead: {
                    max_velocity: 500,
                },
                print_stats: {
                    print_duration: 0,
                    total_duration: 0,
                    filament_used: 0,
                },
                current_file: {},
                configfile: {
                    settings: {
                        extruder: {
                            filament_diameter: 1.75,
                        },
                    },
                },
            },
        })
        const wrapper = mountComponent(store)
        expect(wrapper.text()).toContain('50 mm/s')
    })

    it('caps requested speed at max_velocity', () => {
        const store = createStoreWithState({
            printer: {
                motion_report: {
                    live_velocity: null,
                    live_extruder_velocity: null,
                },
                gcode_move: {
                    speed: 60000,
                    speed_factor: 1.0,
                },
                toolhead: {
                    max_velocity: 200,
                },
                print_stats: {
                    print_duration: 0,
                    total_duration: 0,
                    filament_used: 0,
                },
                current_file: {},
                configfile: {
                    settings: {
                        extruder: {
                            filament_diameter: 1.75,
                        },
                    },
                },
            },
        })
        const wrapper = mountComponent(store)
        expect(wrapper.text()).toContain('200 mm/s')
    })

    it('renders flow column', () => {
        const store = createStoreWithState()
        const wrapper = mountComponent(store)
        expect(wrapper.text()).toContain('Flow')
    })

    it('renders filament column with value in meters when >= 1000', () => {
        const store = createStoreWithState()
        const wrapper = mountComponent(store)
        expect(wrapper.text()).toContain('Filament')
        expect(wrapper.text()).toContain('1.50 m')
    })

    it('renders filament in mm when < 1000', () => {
        const store = createStoreWithState({
            printer: {
                motion_report: {
                    live_velocity: null,
                    live_extruder_velocity: null,
                },
                gcode_move: { speed: 3000, speed_factor: 1.0 },
                toolhead: { max_velocity: 500 },
                print_stats: {
                    print_duration: 0,
                    total_duration: 0,
                    filament_used: 500,
                },
                current_file: {},
                configfile: {
                    settings: {
                        extruder: {
                            filament_diameter: 1.75,
                        },
                    },
                },
            },
        })
        const wrapper = mountComponent(store)
        expect(wrapper.text()).toContain('500.00 mm')
    })

    it('renders layer column', () => {
        const store = createStoreWithState()
        const wrapper = mountComponent(store)
        expect(wrapper.text()).toContain('Layer')
        expect(wrapper.text()).toContain('25 of 100')
    })

    it('renders estimate column with formatDuration', () => {
        const store = createStoreWithState()
        const wrapper = mountComponent(store)
        expect(wrapper.text()).toContain('1:00:33')
    })

    it('renders ETA from getter', () => {
        const store = createStoreWithState()
        const wrapper = mountComponent(store)
        expect(wrapper.text()).toContain('14:30')
    })

    it('renders Slicer estimate column', () => {
        const store = createStoreWithState()
        const wrapper = mountComponent(store)
        expect(wrapper.text()).toContain('Slicer')
        expect(wrapper.text()).toContain('1:03:20')
    })

    it('renders total column with print_time_total', () => {
        const store = createStoreWithState()
        const wrapper = mountComponent(store)
        expect(wrapper.text()).toContain('Total')
        expect(wrapper.text()).toContain('1:00:00')
    })

    it('renders -- for estimate when null', () => {
        const store = createStoreWithState({
            printer: {
                motion_report: {
                    live_velocity: null,
                    live_extruder_velocity: null,
                },
                gcode_move: { speed: 3000, speed_factor: 1.0 },
                toolhead: { max_velocity: 500 },
                print_stats: {
                    print_duration: 0,
                    total_duration: 0,
                    filament_used: 0,
                },
                current_file: {},
                configfile: {
                    settings: {
                        extruder: {
                            filament_diameter: 1.75,
                        },
                    },
                },
            },
            getters: {
                'printer/getPrintMaxLayers': () => 0,
                'printer/getPrintCurrentLayer': () => 0,
                'printer/getEstimatedTimeFile': () => null,
                'printer/getEstimatedTimeFilament': () => null,
                'printer/getEstimatedTimeSlicer': () => null,
                'printer/getEstimatedTimeAvg': () => null,
                'printer/getEstimatedTimeETAFormat': () => '--',
            },
        })
        const wrapper = mountComponent(store)
        expect(wrapper.text()).toContain('--')
    })

    it('renders all top-row stat headers', () => {
        const store = createStoreWithState()
        const wrapper = mountComponent(store)
        const text = wrapper.text()
        expect(text).toContain('Speed')
        expect(text).toContain('Flow')
        expect(text).toContain('Filament')
        expect(text).toContain('Layer')
    })

    it('renders all bottom-row stat headers', () => {
        const store = createStoreWithState()
        const wrapper = mountComponent(store)
        const text = wrapper.text()
        expect(text).toContain('Estimate')
        expect(text).toContain('Slicer')
        expect(text).toContain('Total')
        expect(text).toContain('ETA')
    })
})
