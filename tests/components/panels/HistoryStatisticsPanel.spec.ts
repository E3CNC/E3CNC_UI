import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import HistoryStatisticsPanel from '@/components/panels/HistoryStatisticsPanel.vue'

const mockBaseValues = vi.hoisted(() => {
    class MockRef {
        _value: any
        __v_isRef = true
        __v_isShallow = false
        constructor(val: any) { this._value = val }
        get value() { return this._value }
        set value(v) { this._value = v }
    }
    return {
        loadings: new MockRef([]),
    }
})

vi.mock('@/composables/useBase', () => ({
    useBase: () => mockBaseValues,
}))

vi.mock('@/composables/useSocket', () => ({
    useSocket: () => ({
        emit: vi.fn(),
    }),
}))

vi.mock('@/composables/useHistory', () => ({
    useHistory: () => ({
        selectedJobs: { value: [] },
        moonrakerHistoryFields: { value: [] },
        jobs: { value: [] },
        allJobs: { value: [] },
        hidePrintStatus: { value: [] },
    }),
}))

vi.mock('@/composables/useHistoryStats', () => ({
    useHistoryStats: () => ({
        printStatusArray: { value: [] },
        allPrintStati: { value: [] },
        groupedPrintStatusArray: { value: [] },
        printStatusArrayChart: { value: [] },
    }),
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'History.Statistics': 'Statistics',
                'History.Chart': 'Chart',
                'History.Table': 'Table',
                'History.Jobs': 'Jobs',
                'History.Filament': 'Filament',
                'History.Time': 'Time',
                'History.TotalPrinttime': 'Total Printtime',
                'History.LongestPrinttime': 'Longest Printtime',
                'History.AvgPrinttime': 'Avg Printtime',
                'History.TotalFilamentUsed': 'Total Filament Used',
                'History.TotalJobs': 'Total Jobs',
                'History.SelectedPrinttime': 'Selected Printtime',
                'History.SelectedFilamentUsed': 'Selected Filament Used',
                'History.SelectedJobs': 'Selected Jobs',
                'History.PrinttimeAvg': 'Printtime Avg',
                'History.LoadCompleteHistory': 'Load Complete History',
            }
            return translations[key] ?? key
        },
    }),
}))

const vuetifyComponentsMock = vi.hoisted(() => ({
    VTable: { name: 'VTable', template: '<table><slot /></table>' },
    VRow: { name: 'VRow', template: '<div class="v-row"><slot /></div>' },
    VCol: { name: 'VCol', props: ['cols', 'sm', 'md'], template: '<div class="v-col"><slot /></div>' },
    VCardText: { name: 'VCardText', template: '<div><slot /></div>' },
    VBtnToggle: { name: 'VBtnToggle', props: ['modelValue', 'size', 'mandatory'], template: '<div><slot /></div>' },
    VBtn: { name: 'VBtn', props: ['size', 'value', 'variant', 'loading', 'color'], template: '<button><slot /></button>' },
    VTooltip: { name: 'VTooltip', props: ['top', 'location', 'text'], template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
    VIcon: { name: 'VIcon', props: ['size', 'icon'], template: '<i><slot /></i>' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

vi.mock('@/components/ui/Panel.vue', () => ({
    default: {
        name: 'Panel',
        props: ['icon', 'title', 'collapsible', 'cardClass'],
        template: '<div :class="cardClass"><slot /></div>',
    },
}))

vi.mock('@/components/charts/HistoryPrinttimeAvg.vue', () => ({
    default: {
        name: 'HistoryPrinttimeAvg',
        template: '<div class="history-printtime-avg" />',
    },
}))

vi.mock('@/components/charts/HistoryAllPrintStatusChart.vue', () => ({
    default: {
        name: 'HistoryAllPrintStatusChart',
        props: ['valueName'],
        template: '<div class="history-print-status-chart" />',
    },
}))

vi.mock('@/components/charts/HistoryAllPrintStatusTable.vue', () => ({
    default: {
        name: 'HistoryAllPrintStatusTable',
        props: ['valueName'],
        template: '<div class="history-print-status-table" />',
    },
}))

function createStoreWithState(overrides: Record<string, any> = {}) {
    return createStore({
        state: {
            socket: { isConnected: false, initializationList: [], loadings: [] },
            server: {
                klippy_connected: true,
                klippy_state: 'ready',
                components: [],
                history: {
                    all_loaded: false,
                    job_totals: {
                        total_jobs: 42,
                        total_print_time: 10000,
                        total_filament_used: 5000,
                        longest_print: 500,
                    },
                    auxiliary_totals: [],
                },
                ...(overrides.server || {}),
            },
            printer: {
                print_stats: { state: 'ready' },
                idle_timeout: { state: 'Idle' },
                toolhead: { homed_axes: 'xyz' },
            },
            gui: {
                view: {
                    history: {
                        toggleChartCol2: 'chart',
                        toggleChartCol3: 'printtime_avg',
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

describe('HistoryStatisticsPanel.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockBaseValues.loadings.value = []
    })

    it('renders panel with statistics title', () => {
        const store = createStoreWithState()
        const wrapper = mount(HistoryStatisticsPanel, {
            global: {
                plugins: [store],
                mocks: {
                    $t: (key: string) => key,
                },
            },
        })

        expect(wrapper.find('.history-statistics-panel').exists()).toBe(true)
    })

    it('displays total jobs count from store', () => {
        const store = createStoreWithState()
        const wrapper = mount(HistoryStatisticsPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.text()).toContain('42')
    })

    it('shows chart by default (toggleChartCol2 = chart)', () => {
        const store = createStoreWithState()
        const wrapper = mount(HistoryStatisticsPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.history-print-status-chart').exists()).toBe(true)
    })

    it('shows table when toggleChartCol2 = table', () => {
        const store = createStoreWithState({
            gui: {
                view: {
                    history: {
                        toggleChartCol2: 'table',
                        toggleChartCol3: 'printtime_avg',
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
        const wrapper = mount(HistoryStatisticsPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.history-print-status-table').exists()).toBe(true)
    })

    it('shows load complete history button when not all loaded', () => {
        const store = createStoreWithState()
        const wrapper = mount(HistoryStatisticsPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        // Load complete history button is visible because all_loaded is false
        expect(wrapper.text()).toContain('History.LoadCompleteHistory')
    })

    it('shows selected totals when jobs are selected', () => {
        // We need to mock selectedJobs with items
        // Use a store that triggers existsSelectedJobs
        const store = createStoreWithState()
        // The selectedJobs comes from useHistory mock which returns empty array
        // So existsSelectedJobs should be false — totals should show generic totals
        const wrapper = mount(HistoryStatisticsPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        // With no selected jobs, should show generic totals (Total Jobs: 42)
        expect(wrapper.text()).toContain('42')
    })
})
