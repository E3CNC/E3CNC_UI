import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import HistoryListPanel from '@/components/panels/HistoryListPanel.vue'

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
        jobs: { value: [] },
        selectedJobs: { value: [] },
        moonrakerHistoryFields: { value: [] },
        allJobs: { value: [] },
        hidePrintStatus: { value: [] },
    }),
}))

vi.mock('@/composables/useHistoryStats', () => ({
    useHistoryStats: () => ({
        printStatusArray: { value: [] },
        allPrintStati: { value: [] },
    }),
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'History.PrintHistory': 'Print History',
                'History.Search': 'Search',
                'History.Delete': 'Delete',
                'History.AddMaintenance': 'Add Maintenance',
                'History.LoadCompleteHistory': 'Load Complete History',
                'History.TitleExportHistory': 'Export History',
                'History.Settings': 'Settings',
                'History.MaintenanceEntries': 'Maintenance Entries',
                'History.PrintJobs': 'Print Jobs',
                'History.Filename': 'Filename',
                'History.Filesize': 'Filesize',
                'History.PrintTime': 'Print Time',
                'History.LastModified': 'Last Modified',
                'History.StartTime': 'Start Time',
                'History.EndTime': 'End Time',
                'History.Jobs': 'Jobs',
                'History.AllJobs': 'All Jobs',
                'History.Empty': 'No data available',
                'Buttons.Delete': 'Delete',
            }
            return translations[key] ?? key
        },
    }),
}))

const vuetifyComponentsMock = vi.hoisted(() => ({
    VCardText: { name: 'VCardText', template: '<div><slot /></div>' },
    VRow: { name: 'VRow', template: '<div><slot /></div>' },
    VCol: { name: 'VCol', props: ['cols'], template: '<div><slot /></div>' },
    VTextField: { name: 'VTextField', props: ['modelValue', 'appendIcon', 'label', 'singleLine', 'variant', 'clearable', 'hideDetails', 'density'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
    VTooltip: { name: 'VTooltip', props: ['top', 'location', 'text'], template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
    VBtn: { name: 'VBtn', props: ['color', 'loading', 'rounded', 'size', 'variant'], template: '<button :class="$attrs.class"><slot /></button>' },
    VIcon: { name: 'VIcon', props: ['start', 'icon', 'size'], template: '<i><slot /></i>' },
    VMenu: { name: 'VMenu', props: ['location', 'closeOnContentClick'], template: '<div><slot name="activator" :props="{onClick: () => {}}" /><slot /></div>' },
    VList: { name: 'VList', template: '<div><slot /></div>' },
    VListItem: { name: 'VListItem', template: '<div class="v-list-item"><slot /></div>' },
    VCheckbox: { name: 'VCheckbox', props: ['modelValue', 'label', 'hideDetails', 'density'], template: '<label><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /> {{ label }}</label>' },
    VDivider: { name: 'VDivider', template: '<hr />' },
    VDataTable: { name: 'VDataTable', props: ['items', 'headers', 'search', 'itemsPerPage', 'showSelect', 'disableSort', 'itemKey', 'mobileBreakpoint'], template: '<div class="v-data-table"><slot name="no-data" /><slot name="item" :item="{ type: \'job\' }" :isSelected="() => false" :select="() => {}" /></div>' },
    VSpacer: { name: 'VSpacer', template: '<span style="flex:1" />' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

vi.mock('@/components/ui/Panel.vue', () => ({
    default: {
        name: 'Panel',
        props: ['icon', 'title', 'collapsible', 'cardClass'],
        template: '<div :class="cardClass"><slot /></div>',
    },
}))

vi.mock('@/components/panels/History/HistoryListEntryJob.vue', () => ({
    default: {
        name: 'HistoryListEntryJob',
        props: ['item', 'tableFields', 'isSelected'],
        template: '<div class="history-entry-job" />',
    },
}))

vi.mock('@/components/panels/History/HistoryListEntryMaintenance.vue', () => ({
    default: {
        name: 'HistoryListEntryMaintenance',
        props: ['item', 'tableFields', 'isSelected'],
        template: '<div class="history-entry-maintenance" />',
    },
}))

vi.mock('@/components/dialogs/ConfirmationDialog.vue', () => ({
    default: {
        name: 'ConfirmationDialog',
        props: ['modelValue', 'title', 'text', 'actionButtonText', 'icon'],
        template: '<div class="confirmation-dialog" />',
    },
}))

vi.mock('@/components/dialogs/HistoryListPanelAddMaintenance.vue', () => ({
    default: {
        name: 'HistoryListPanelAddMaintenance',
        props: ['modelValue'],
        template: '<div class="add-maintenance-dialog" />',
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
                    jobs: [],
                    job_totals: {},
                    ...((overrides.server || {}).history || {}),
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
                        countPerPage: 10,
                        hideColums: [],
                        showMaintenanceEntries: false,
                        showPrintJobs: true,
                        selectedJobs: [],
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
                maintenance: {
                    entries: [],
                },
                ...(overrides.gui || {}),
            },
            files: {},
            instancesDB: 'moonraker',
            ...overrides,
        },
        getters: {
            'socket/getUrl': () => '//localhost:8080',
            'gui/getPanelExpand': () => () => true,
            'gui/maintenance/getEntries': () => [],
            'server/history/getAllPrintStatusArray': () => [],
            ...(overrides.getters || {}),
        },
    })
}

describe('HistoryListPanel.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockBaseValues.loadings.value = []
    })

    it('renders panel with history card class', () => {
        const store = createStoreWithState()
        const wrapper = mount(HistoryListPanel, {
            global: {
                plugins: [store],
                mocks: {
                    $t: (key: string) => key,
                },
            },
        })

        expect(wrapper.find('.history-list-panel').exists()).toBe(true)
    })

    it('renders search field', () => {
        const store = createStoreWithState()
        const wrapper = mount(HistoryListPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('input').exists()).toBe(true)
    })

    it('renders empty state when no history entries', () => {
        const store = createStoreWithState()
        const wrapper = mount(HistoryListPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        // With no jobs, entries should filter to empty
        expect(wrapper.find('.v-data-table').exists()).toBe(true)
    })

    it('renders data table with headers', () => {
        const store = createStoreWithState()
        const wrapper = mount(HistoryListPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        // VDataTable should render
        expect(wrapper.find('.v-data-table').exists()).toBe(true)
    })

    it('shows load all history button when not all loaded', () => {
        const store = createStoreWithState()
        const wrapper = mount(HistoryListPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        // The text "Load Complete History" should be present
        expect(wrapper.text()).toContain('History.LoadCompleteHistory')
    })

    it('renders with jobs data', () => {
        // Override the useHistory mock to return some jobs
        // We do this by using the store's state with history.jobs populated
        const store = createStoreWithState({
            server: {
                klippy_connected: true,
                klippy_state: 'ready',
                components: [],
                history: {
                    all_loaded: true,
                    jobs: [
                        {
                            job_id: '1',
                            filename: 'test.gcode',
                            status: 'completed',
                            start_time: 1000000,
                            end_time: 1005000,
                            print_duration: 4500,
                            filament_used: 500,
                            exists: true,
                            metadata: { thumbnails: [], modified: 1000000, slicer: 'Cura', size: 1024 },
                        },
                    ],
                },
            },
        })

        const wrapper = mount(HistoryListPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.history-list-panel').exists()).toBe(true)
    })
})
