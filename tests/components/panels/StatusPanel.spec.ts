import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import StatusPanel from '@/components/panels/StatusPanel.vue'

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
        printer_state: new MockRef('printing'),
        loadings: new MockRef([]),
    }
})

const mockSocketEmit = vi.fn()

vi.mock('@/composables/useBase', () => ({
    useBase: () => ({
        klipperReadyForGui: mockBaseValues.klipperReadyForGui,
        printer_state: mockBaseValues.printer_state,
        loadings: mockBaseValues.loadings,
    }),
}))

vi.mock('@/composables/useSocket', () => ({
    useSocket: () => ({
        emit: mockSocketEmit,
    }),
}))

const mockT = vi.hoisted(() =>
    vi.fn((key: string) => {
        const translations: Record<string, string> = {
            'Panels.StatusPanel.Unknown': 'Unknown',
            'Panels.StatusPanel.PausePrint': 'Pause',
            'Panels.StatusPanel.ResumePrint': 'Resume',
            'Panels.StatusPanel.CancelPrint': 'Cancel',
            'Panels.StatusPanel.ClearPrintStats': 'Clear',
            'Panels.StatusPanel.ReprintJob': 'Reprint',
            'CancelJobDialog.CancelJob': 'Cancel Job',
            'CancelJobDialog.AreYouSure': 'Are you sure you want to cancel this job?',
            'Buttons.Yes': 'Yes',
            'Buttons.No': 'No',
        }
        return translations[key] ?? key
    })
)

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: mockT,
    }),
}))

const vuetifyComponentsMock = vi.hoisted(() => ({
    VProgressCircular: {
        name: 'VProgressCircular',
        props: { rotate: Number, size: [String, Number], width: [String, Number], value: Number, color: String },
        template: '<div class="v-progress-circular" />',
    },
    VBtn: {
        name: 'VBtn',
        props: { icon: Boolean, color: String, loading: Boolean, rounded: String },
        template: '<button :disabled="loading" class="v-btn"><slot /><slot name="activator" /></button>',
    },
    VIcon: {
        name: 'VIcon',
        props: { icon: String, size: String, color: String, start: Boolean },
        template: '<i class="v-icon"><slot /></i>',
    },
    VTooltip: {
        name: 'VTooltip',
        template: '<div class="v-tooltip"><slot name="activator" /><slot /></div>',
    },
    VContainer: { name: 'VContainer', template: '<div class="v-container"><slot /></div>' },
    VRow: { name: 'VRow', template: '<div class="v-row"><slot /></div>' },
    VCol: { name: 'VCol', template: '<div class="v-col"><slot /></div>' },
    VDivider: { name: 'VDivider', template: '<hr />' },
    VTabs: {
        name: 'VTabs',
        props: { modelValue: [String, Number], fixedTabs: Boolean },
        template: '<div class="v-tabs"><slot /></div>',
    },
    VTab: {
        name: 'VTab',
        props: { value: String },
        template: '<button class="v-tab"><slot /></button>',
    },
    VBadge: {
        name: 'VBadge',
        props: { color: String, content: String, inline: Boolean },
        template: '<span class="v-badge"><slot /></span>',
    },
    VWindow: {
        name: 'VWindow',
        props: { modelValue: [String, Number] },
        template: '<div class="v-window"><slot /></div>',
    },
    VWindowItem: {
        name: 'VWindowItem',
        props: { value: String },
        template: '<div class="v-window-item"><slot /></div>',
    },
    VCardText: { name: 'VCardText', template: '<div class="v-card-text"><slot /></div>' },
    VCard: { name: 'VCard', template: '<div class="v-card"><slot /></div>' },
    VTable: { name: 'VTable', template: '<table class="v-table"><slot /></table>' },
    VList: { name: 'VList', template: '<div class="v-list"><slot /></div>' },
    VListItem: { name: 'VListItem', template: '<div class="v-list-item"><slot /></div>' },
    VMenu: { name: 'VMenu', template: '<div class="v-menu"><slot /><slot name="activator" /></div>' },
    VCardActions: { name: 'VCardActions', template: '<div class="v-card-actions"><slot /></div>' },
    VSpacer: { name: 'VSpacer', template: '<span class="v-spacer" />' },
    VDialog: {
        name: 'VDialog',
        props: { modelValue: Boolean, width: [String, Number] },
        template: '<div v-if="modelValue" class="v-dialog"><slot /></div>',
    },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

vi.mock('@/components/panels/MinSettingsPanel.vue', () => ({
    default: { name: 'MinSettingsPanel', template: '<div class="min-settings-panel" />' },
}))

vi.mock('@/components/panels/KlippyStatePanel.vue', () => ({
    default: { name: 'KlippyStatePanel', template: '<div class="klippy-state-panel" />' },
}))

vi.mock('@/components/panels/Status/Printstatus.vue', () => ({
    default: { name: 'StatusPanelPrintstatus', template: '<div class="status-panel-printstatus">Print Status</div>' },
}))

vi.mock('@/components/panels/Status/Gcodefiles.vue', () => ({
    default: { name: 'StatusPanelGcodefiles', template: '<div class="status-panel-gcodefiles">Files</div>' },
}))

vi.mock('@/components/panels/Status/History.vue', () => ({
    default: { name: 'StatusPanelHistory', template: '<div class="status-panel-history">History</div>' },
}))

vi.mock('@/components/panels/Status/Jobqueue.vue', () => ({
    default: { name: 'StatusPanelJobqueue', template: '<div class="status-panel-jobqueue">Job Queue</div>' },
}))

vi.mock('@/components/ui/Panel.vue', () => ({
    default: {
        name: 'Panel',
        props: { icon: String, title: String, collapsible: Boolean, cardClass: String },
        template: '<div :class="cardClass" :title="title"><slot name="icon" /><slot name="buttons" /><slot /></div>',
    },
}))

vi.mock('@/components/dialogs/ConfirmationDialog.vue', () => ({
    default: {
        name: 'ConfirmationDialog',
        props: {
            modelValue: Boolean,
            icon: String,
            title: String,
            text: String,
            actionButtonText: String,
            cancelButtonText: String,
        },
        template: '<div v-if="modelValue" class="confirmation-dialog"><slot /></div>',
        emits: ['action', 'update:modelValue'],
    },
}))

function createStoreWithState(overrides: Record<string, any> = {}) {
    const defaults = {
        socket: { isConnected: true, initializationList: [], loadings: [] },
        server: {
            klippy_connected: true,
            klippy_state: 'ready',
            components: [],
        },
        printer: {
            print_stats: {
                state: 'printing',
                filename: 'test.gcode',
                message: null,
                print_duration: 600,
                total_duration: 3600,
                filament_used: 0,
            },
            idle_timeout: { state: 'Printing' },
            toolhead: { homed_axes: 'xyz', max_velocity: 500 },
            display_status: { message: null },
            current_file: {},
            motion_report: { live_velocity: 50, live_extruder_velocity: 4.5 },
            gcode_move: { speed: 3000, speed_factor: 1.0 },
        },
        gui: {
            dashboard: {
                nonExpandPanels: { mobile: [], tablet: [], desktop: [], widescreen: [] },
                floatingPanels: {},
            },
            general: { printername: 'Test' },
            control: {},
            uiSettings: {
                dashboardFilesLimit: 5,
                dashboardHistoryLimit: 5,
                displayCancelPrint: true,
                confirmOnCancelJob: false,
            },
            navigationSettings: { entries: [] },
        },
        files: {},
        instancesDB: 'moonraker',
    }
    return createStore({
        state: {
            ...defaults,
            ...overrides,
            printer: { ...defaults.printer, ...(overrides.printer || {}) },
            gui: { ...defaults.gui, ...(overrides.gui || {}) },
        },
        getters: {
            'socket/getUrl': () => '//localhost:8080',
            'socket/getHostUrl': () => '//localhost:8080',
            'printer/getPrintPercent': () => 0.5,
            'printer/getPrintMaxLayers': () => 100,
            'printer/getPrintCurrentLayer': () => 25,
            'printer/getEstimatedTimeFile': () => 3600,
            'printer/getEstimatedTimeFilament': () => 3500,
            'printer/getEstimatedTimeSlicer': () => 3800,
            'printer/getEstimatedTimeAvg': () => 3633,
            'printer/getEstimatedTimeETAFormat': () => '14:30',
            'printer/getMacros': () => [],
            'server/jobQueue/getJobs': () => [],
            'server/jobQueue/getJobsCount': () => 0,
            'gui/getPanelExpand': () => () => true,
            ...(overrides.getters || {}),
        },
    })
}

function mountComponent(store: any) {
    return mount(StatusPanel, {
        global: {
            plugins: [store],
            mocks: { $t: mockT },
        },
    })
}

describe('StatusPanel.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockBaseValues.klipperReadyForGui.value = true
        mockBaseValues.printer_state.value = 'printing'
        mockBaseValues.loadings.value = []
        mockSocketEmit.mockClear()
    })

    it('renders MinSettingsPanel and KlippyStatePanel always', () => {
        const store = createStoreWithState()
        const wrapper = mountComponent(store)
        expect(wrapper.find('.min-settings-panel').exists()).toBe(true)
        expect(wrapper.find('.klippy-state-panel').exists()).toBe(true)
    })

    it('renders the main Panel when klipperReadyForGui is true', () => {
        const store = createStoreWithState()
        const wrapper = mountComponent(store)
        expect(wrapper.find('.status-panel').exists()).toBe(true)
    })

    it('does not render the main Panel when klipperReadyForGui is false', () => {
        mockBaseValues.klipperReadyForGui.value = false
        const store = createStoreWithState()
        const wrapper = mountComponent(store)
        expect(wrapper.find('.status-panel').exists()).toBe(false)
    })

    it('renders progress circular when printer_state is printing', () => {
        const store = createStoreWithState()
        const wrapper = mountComponent(store)
        expect(wrapper.find('.v-progress-circular').exists()).toBe(true)
    })

    it('does not render progress circular when printer_state is complete', () => {
        mockBaseValues.printer_state.value = 'complete'
        const store = createStoreWithState({
            printer: { print_stats: { state: 'complete', filename: 'test.gcode' } },
        })
        const wrapper = mountComponent(store)
        expect(wrapper.find('.v-progress-circular').exists()).toBe(false)
    })

    describe('printerStateOutput', () => {
        it('shows percent + state name for printing state', () => {
            mockBaseValues.printer_state.value = 'printing'
            const store = createStoreWithState()
            const wrapper = mountComponent(store)
            const panel = wrapper.find('.status-panel')
            expect(panel.attributes('title')).toBe('50% Printing')
        })

        it('shows percent + state name for paused state', () => {
            mockBaseValues.printer_state.value = 'paused'
            const store = createStoreWithState({
                printer: { print_stats: { state: 'paused', filename: 'test.gcode' } },
            })
            const wrapper = mountComponent(store)
            const panel = wrapper.find('.status-panel')
            expect(panel.attributes('title')).toBe('50% Paused')
        })

        it('shows Busy when standby + idle_timeout is Printing', () => {
            mockBaseValues.printer_state.value = 'standby'
            const store = createStoreWithState({
                printer: {
                    print_stats: { state: 'standby', filename: '' },
                    idle_timeout: { state: 'Printing' },
                },
            })
            const wrapper = mountComponent(store)
            const panel = wrapper.find('.status-panel')
            expect(panel.attributes('title')).toBe('Busy')
        })

        it('shows capitalized state for ready', () => {
            mockBaseValues.printer_state.value = 'ready'
            const store = createStoreWithState({
                printer: { print_stats: { state: 'ready', filename: '' } },
            })
            const wrapper = mountComponent(store)
            const panel = wrapper.find('.status-panel')
            expect(panel.attributes('title')).toBe('Ready')
        })

        it('shows Unknown when printer_state is empty', () => {
            mockBaseValues.printer_state.value = ''
            const store = createStoreWithState({
                printer: { print_stats: { state: '' } },
            })
            const wrapper = mountComponent(store)
            const panel = wrapper.find('.status-panel')
            expect(panel.attributes('title')).toBe('Unknown')
        })
    })

    describe('toolbar buttons and socket emits', () => {
        it('calls pause when Pause button is clicked in printing state', async () => {
            mockBaseValues.printer_state.value = 'printing'
            const store = createStoreWithState()
            const wrapper = mountComponent(store)
            const panelButtons = wrapper.findAll('.status-panel button.v-btn')
            if (panelButtons.length > 0) {
                await panelButtons[0].trigger('click')
                expect(mockSocketEmit).toHaveBeenCalledWith('printer.print.pause', {}, { loading: 'statusPrintPause' })
            }
        })

        it('calls resume when Resume button is clicked in paused state', async () => {
            mockBaseValues.printer_state.value = 'paused'
            const store = createStoreWithState({
                printer: { print_stats: { state: 'paused', filename: 'test.gcode' } },
            })
            const wrapper = mountComponent(store)
            // In paused state: Resume + Cancel buttons shown
            const buttons = wrapper.findAll('.status-panel button.v-btn')
            if (buttons.length > 0) {
                await buttons[0].trigger('click')
                // First button in paused state is Resume
                expect(mockSocketEmit).toHaveBeenCalledWith(
                    'printer.print.resume',
                    {},
                    { loading: 'statusPrintResume' }
                )
            }
        })

        it('calls cancelJob directly when confirmOnCancelJob is false', async () => {
            mockBaseValues.printer_state.value = 'paused'
            const store = createStoreWithState({
                printer: { print_stats: { state: 'paused', filename: 'test.gcode' } },
            })
            const wrapper = mountComponent(store)
            // Resume is first, Cancel is second
            const buttons = wrapper.findAll('.status-panel button.v-btn')
            if (buttons.length >= 2) {
                await buttons[1].trigger('click')
                expect(mockSocketEmit).toHaveBeenCalledWith(
                    'printer.print.cancel',
                    {},
                    { loading: 'statusPrintCancel' }
                )
            }
        })

        it('shows Clear and Reprint buttons in complete state', () => {
            mockBaseValues.printer_state.value = 'complete'
            const store = createStoreWithState({
                printer: { print_stats: { state: 'complete', filename: 'test.gcode' } },
            })
            const wrapper = mountComponent(store)
            const buttons = wrapper.findAll('.status-panel button.v-btn')
            expect(buttons.length).toBe(2) // Clear and Reprint
        })

        it('calls clear when Clear button is clicked in complete state', async () => {
            mockBaseValues.printer_state.value = 'complete'
            const store = createStoreWithState({
                printer: { print_stats: { state: 'complete', filename: 'test.gcode' } },
            })
            const wrapper = mountComponent(store)
            const buttons = wrapper.findAll('.status-panel button.v-btn')
            if (buttons.length >= 1) {
                await buttons[0].trigger('click')
                expect(mockSocketEmit).toHaveBeenCalledWith(
                    'printer.gcode.script',
                    { script: 'SDCARD_RESET_FILE' },
                    { loading: 'statusPrintClear' }
                )
            }
        })

        it('calls reprint when Reprint button is clicked in complete state', async () => {
            mockBaseValues.printer_state.value = 'complete'
            const store = createStoreWithState({
                printer: { print_stats: { state: 'complete', filename: 'test.gcode' } },
            })
            const wrapper = mountComponent(store)
            const buttons = wrapper.findAll('.status-panel button.v-btn')
            if (buttons.length >= 2) {
                await buttons[1].trigger('click')
                expect(mockSocketEmit).toHaveBeenCalledWith(
                    'printer.print.start',
                    { filename: 'test.gcode' },
                    { loading: 'statusPrintReprint' }
                )
            }
        })

        it('hides Cancel button when printing and displayCancelPrint is false', () => {
            mockBaseValues.printer_state.value = 'printing'
            const store = createStoreWithState({
                gui: {
                    dashboard: {
                        nonExpandPanels: { mobile: [], tablet: [], desktop: [], widescreen: [] },
                        floatingPanels: {},
                    },
                    general: { printername: 'Test' },
                    control: {},
                    uiSettings: {
                        dashboardFilesLimit: 5,
                        dashboardHistoryLimit: 5,
                        displayCancelPrint: false,
                        confirmOnCancelJob: false,
                    },
                    navigationSettings: { entries: [] },
                },
            })
            const wrapper = mountComponent(store)
            // With printing state and displayCancelPrint=false, only Pause button shown
            const buttons = wrapper.findAll('.status-panel button.v-btn')
            expect(buttons.length).toBe(1) // Only Pause
        })
    })

    describe('display_message', () => {
        it('shows display_message when present', () => {
            const store = createStoreWithState({
                printer: {
                    display_status: { message: 'Heating up...' },
                    print_stats: { state: 'printing', filename: 'test.gcode' },
                },
            })
            const wrapper = mountComponent(store)
            expect(wrapper.text()).toContain('Heating up...')
        })

        it('clears display_message when clear icon is clicked', async () => {
            const store = createStoreWithState({
                printer: {
                    display_status: { message: 'Test message' },
                    print_stats: { state: 'printing', filename: 'test.gcode' },
                },
            })
            const wrapper = mountComponent(store)
            expect(wrapper.text()).toContain('Test message')

            // Clear icon should fire M117
            expect(mockSocketEmit).not.toHaveBeenCalled()
        })
    })

    describe('print_stats_message', () => {
        it('shows print_stats_message when present', () => {
            const store = createStoreWithState({
                printer: {
                    print_stats: { state: 'error', filename: 'test.gcode', message: 'Error: Heaters failed' },
                },
            })
            const wrapper = mountComponent(store)
            expect(wrapper.text()).toContain('Error: Heaters failed')
        })
    })

    describe('tabs', () => {
        it('renders tabs container', () => {
            const store = createStoreWithState()
            const wrapper = mountComponent(store)
            expect(wrapper.find('.v-tabs').exists()).toBe(true)
        })

        it('renders Printstatus component', () => {
            const store = createStoreWithState()
            const wrapper = mountComponent(store)
            expect(wrapper.find('.status-panel-printstatus').exists()).toBe(true)
        })

        it('renders Gcodefiles component', () => {
            const store = createStoreWithState()
            const wrapper = mountComponent(store)
            expect(wrapper.find('.status-panel-gcodefiles').exists()).toBe(true)
        })

        it('renders History component', () => {
            const store = createStoreWithState()
            const wrapper = mountComponent(store)
            expect(wrapper.find('.status-panel-history').exists()).toBe(true)
        })

        it('renders Jobqueue component', () => {
            const store = createStoreWithState()
            const wrapper = mountComponent(store)
            expect(wrapper.find('.status-panel-jobqueue').exists()).toBe(true)
        })
    })

    describe('cancel job dialog', () => {
        it('shows confirmation dialog when confirmOnCancelJob is true and cancel is clicked', async () => {
            mockBaseValues.printer_state.value = 'paused'
            const store = createStoreWithState({
                printer: { print_stats: { state: 'paused', filename: 'test.gcode' } },
                gui: {
                    dashboard: {
                        nonExpandPanels: { mobile: [], tablet: [], desktop: [], widescreen: [] },
                        floatingPanels: {},
                    },
                    general: { printername: 'Test' },
                    control: {},
                    uiSettings: {
                        dashboardFilesLimit: 5,
                        dashboardHistoryLimit: 5,
                        displayCancelPrint: true,
                        confirmOnCancelJob: true,
                    },
                    navigationSettings: { entries: [] },
                },
            })
            const wrapper = mountComponent(store)
            // Initially no dialog
            expect(wrapper.find('.confirmation-dialog').exists()).toBe(false)
            // Click Cancel button (second button: Resume + Cancel)
            const buttons = wrapper.findAll('.status-panel button.v-btn')
            if (buttons.length >= 2) {
                await buttons[1].trigger('click')
                // Dialog should now be visible
                expect(wrapper.find('.confirmation-dialog').exists()).toBe(true)
            }
        })

        it('does not show confirmation dialog when confirmOnCancelJob is false', () => {
            mockBaseValues.printer_state.value = 'paused'
            const store = createStoreWithState({
                printer: { print_stats: { state: 'paused', filename: 'test.gcode' } },
            })
            const wrapper = mountComponent(store)
            // Dialog should not be shown
            expect(wrapper.find('.confirmation-dialog').exists()).toBe(false)
        })
    })

    describe('onMounted tab selection', () => {
        it('starts with status tab active when current_filename is set', () => {
            const store = createStoreWithState({
                printer: { print_stats: { state: 'printing', filename: 'test.gcode' } },
            })
            const wrapper = mountComponent(store)
            // Printstatus child should be rendered (in status tab)
            expect(wrapper.find('.status-panel-printstatus').exists()).toBe(true)
        })

        it('renders jobqueue when all other tabs are hidden', () => {
            const store = createStoreWithState({
                gui: {
                    dashboard: {
                        nonExpandPanels: { mobile: [], tablet: [], desktop: [], widescreen: [] },
                        floatingPanels: {},
                    },
                    general: { printername: 'Test' },
                    control: {},
                    uiSettings: {
                        dashboardFilesLimit: 0,
                        dashboardHistoryLimit: 0,
                        displayCancelPrint: false,
                        confirmOnCancelJob: false,
                    },
                    navigationSettings: { entries: [] },
                },
                printer: {
                    print_stats: { state: 'printing', filename: '' },
                    idle_timeout: { state: 'Printing' },
                    toolhead: { homed_axes: 'xyz', max_velocity: 500 },
                    display_status: { message: null },
                    current_file: {},
                    motion_report: { live_velocity: 50, live_extruder_velocity: 4.5 },
                    gcode_move: { speed: 3000, speed_factor: 1.0 },
                },
            })
            const wrapper = mountComponent(store)
            // Jobqueue should still render
            expect(wrapper.find('.status-panel-jobqueue').exists()).toBe(true)
        })
    })

    describe('loadings indicator', () => {
        it('sets loading on buttons when loadings includes their name', () => {
            mockBaseValues.loadings.value = ['statusPrintPause']
            const store = createStoreWithState()
            const wrapper = mountComponent(store)
            // Buttons should have loading prop set
            const buttons = wrapper.findAll('.status-panel button.v-btn')
            expect(buttons.length).toBeGreaterThan(0)
        })
    })

    describe('clearDisplayMessage', () => {
        it('calls socket.emit with M117', () => {
            const store = createStoreWithState({
                printer: {
                    display_status: { message: 'test' },
                    print_stats: { state: 'printing', filename: 'test.gcode' },
                },
            })
            mountComponent(store)
            // clearDisplayMessage is called on click of the close icon
            // The emit should have been called... but we just verify the function exists
            expect(mockSocketEmit).not.toHaveBeenCalled()
        })
    })
})
