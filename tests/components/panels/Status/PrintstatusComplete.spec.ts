import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import PrintstatusComplete from '@/components/panels/Status/PrintstatusComplete.vue'

const vuetifyComponentsMock = vi.hoisted(() => ({
    VCardText: { name: 'VCardText', template: '<div><slot /></div>' },
    VContainer: { template: '<div><slot /></div>' },
    VRow: { template: '<div><slot /></div>' },
    VCol: { name: 'VCol', template: '<div><slot /></div>' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

const mockT = vi.hoisted(() =>
    vi.fn((key: string) => {
        const translations: Record<string, string> = {
            'Panels.StatusPanel.Filament': 'Filament',
            'Panels.StatusPanel.Slicer': 'Slicer',
            'Panels.StatusPanel.Print': 'Print',
            'Panels.StatusPanel.Total': 'Total',
        }
        return translations[key] ?? key
    })
)

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: mockT,
    }),
}))

function createStoreWithState(overrides: Record<string, any> = {}) {
    return createStore({
        state: {
            printer: {
                print_stats: {
                    print_duration: 3600,
                    total_duration: 4000,
                    filament_used: 5000,
                    state: 'complete',
                },
                current_file: {
                    estimated_time: 3800,
                    filament_total: 6000,
                    object_height: 50,
                },
                ...(overrides.printer || {}),
            },
            ...overrides,
        },
        getters: {
            ...(overrides.getters || {}),
        },
    })
}

describe('PrintstatusComplete.vue', () => {
    it('renders filament used in meters when >= 1000 mm', () => {
        const store = createStoreWithState()
        const wrapper = mount(PrintstatusComplete, {
            global: { plugins: [store], mocks: { $t: mockT } },
        })
        expect(wrapper.text()).toContain('5.00 m')
    })

    it('renders filament used in mm when < 1000', () => {
        const store = createStoreWithState({
            printer: {
                print_stats: {
                    print_duration: 600,
                    total_duration: 700,
                    filament_used: 500,
                },
                current_file: {},
            },
        })
        const wrapper = mount(PrintstatusComplete, {
            global: { plugins: [store], mocks: { $t: mockT } },
        })
        expect(wrapper.text()).toContain('500.00 mm')
    })

    it('renders slicer estimated time from current_file', () => {
        const store = createStoreWithState({
            printer: {
                print_stats: {
                    print_duration: 3661,
                    total_duration: 4000,
                    filament_used: 0,
                },
                current_file: {
                    estimated_time: 3661,
                },
            },
        })
        const wrapper = mount(PrintstatusComplete, {
            global: { plugins: [store], mocks: { $t: mockT } },
        })
        expect(wrapper.text()).toContain('1:01:01')
    })

    it('renders -- when current_file has no estimated_time', () => {
        const store = createStoreWithState({
            printer: {
                print_stats: {
                    print_duration: 0,
                    total_duration: 0,
                    filament_used: 0,
                },
                current_file: {},
            },
        })
        const wrapper = mount(PrintstatusComplete, {
            global: { plugins: [store], mocks: { $t: mockT } },
        })
        expect(wrapper.text()).toContain('--')
    })

    it('renders print time (print_duration)', () => {
        const store = createStoreWithState({
            printer: {
                print_stats: {
                    print_duration: 3661,
                    total_duration: 4000,
                    filament_used: 0,
                },
                current_file: {},
            },
        })
        const wrapper = mount(PrintstatusComplete, {
            global: { plugins: [store], mocks: { $t: mockT } },
        })
        expect(wrapper.text()).toContain('1:01:01')
    })

    it('renders -- for print time when print_duration is 0', () => {
        const store = createStoreWithState({
            printer: {
                print_stats: {
                    print_duration: 0,
                    total_duration: 0,
                    filament_used: 0,
                },
                current_file: {},
            },
        })
        const wrapper = mount(PrintstatusComplete, {
            global: { plugins: [store], mocks: { $t: mockT } },
        })
        expect(wrapper.text()).toContain('--')
    })

    it('renders total time (total_duration)', () => {
        const store = createStoreWithState({
            printer: {
                print_stats: {
                    print_duration: 3600,
                    total_duration: 4000,
                    filament_used: 0,
                },
                current_file: {},
            },
        })
        const wrapper = mount(PrintstatusComplete, {
            global: { plugins: [store], mocks: { $t: mockT } },
        })
        expect(wrapper.text()).toContain('1:06:40')
    })

    it('renders -- for total time when total_duration is 0', () => {
        const store = createStoreWithState({
            printer: {
                print_stats: {
                    print_duration: 0,
                    total_duration: 0,
                    filament_used: 0,
                },
                current_file: {},
            },
        })
        const wrapper = mount(PrintstatusComplete, {
            global: { plugins: [store], mocks: { $t: mockT } },
        })
        expect(wrapper.text()).toContain('--')
    })

    it('renders all four columns: Filament, Slicer, Print, Total', () => {
        const store = createStoreWithState()
        const wrapper = mount(PrintstatusComplete, {
            global: { plugins: [store], mocks: { $t: mockT } },
        })
        const text = wrapper.text()
        expect(text).toContain('Filament')
        expect(text).toContain('Slicer')
        expect(text).toContain('Print')
        expect(text).toContain('Total')
    })

    it('handles missing print_stats gracefully', () => {
        const store = createStoreWithState({
            printer: {
                print_stats: undefined,
                current_file: {},
            },
        })
        const wrapper = mount(PrintstatusComplete, {
            global: { plugins: [store], mocks: { $t: mockT } },
        })
        expect(wrapper.exists()).toBe(true)
        expect(wrapper.text()).toContain('--')
    })

    it('handles 0 filament_used', () => {
        const store = createStoreWithState({
            printer: {
                print_stats: {
                    print_duration: 0,
                    total_duration: 0,
                    filament_used: 0,
                },
                current_file: {},
            },
        })
        const wrapper = mount(PrintstatusComplete, {
            global: { plugins: [store], mocks: { $t: mockT } },
        })
        expect(wrapper.text()).toContain('0.00 mm')
    })

    it('formatTime handles fractional seconds', () => {
        const store = createStoreWithState({
            printer: {
                print_stats: {
                    print_duration: 3661.5,
                    total_duration: 0,
                    filament_used: 0,
                },
                current_file: {},
            },
        })
        const wrapper = mount(PrintstatusComplete, {
            global: { plugins: [store], mocks: { $t: mockT } },
        })
        // .toFixed(0) rounds 1.5 to 2, so 3661.5s -> 1:01:02
        expect(wrapper.text()).toContain('1:01:02')
    })
})
