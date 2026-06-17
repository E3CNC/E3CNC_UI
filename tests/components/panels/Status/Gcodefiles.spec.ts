import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore as createVuexStore } from 'vuex'
import Gcodefiles from '@/components/panels/Status/Gcodefiles.vue'

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
        set value(v: any) {
            this._value = v
        }
    }
    return { loadings: new MockRef([]) }
})

vi.mock('@/composables/useBase', () => ({
    useBase: () => mockBaseValues,
}))

vi.mock('@/composables/useControl', () => ({
    useControl: () => ({}),
}))

const vuetifyComponentsMock = vi.hoisted(() => ({
    VCard: {
        name: 'VCard',
        inheritAttrs: false,
        template: '<div :class="$attrs.class" :style="$attrs.style"><slot /></div>',
    },
    VTable: { name: 'VTable', template: '<table><slot /></table>' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

vi.mock('@/components/panels/Status/GcodefilesEntry.vue', () => ({
    default: {
        name: 'StatusPanelGcodefilesEntry',
        props: ['item', 'contentTdWidth'],
        template: '<tr class="mock-gcodefiles-entry">{{ item.filename }}</tr>',
    },
}))

const mockResizeObserverInstance = vi.hoisted(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
}))

vi.stubGlobal(
    'ResizeObserver',
    vi.fn(() => mockResizeObserverInstance)
)

function createTestStore(overrides: Record<string, any> = {}) {
    const guiOverrides = overrides.gui || {}
    const overrideGetters = overrides.getters || {}
    const overrideActions = overrides.actions || {}
    return createVuexStore({
        state: {
            socket: { isConnected: true, initializationList: [], loadings: [] },
            server: { klippy_connected: true, klippy_state: 'ready', components: [] },
            printer: {
                print_stats: { state: 'ready' },
                idle_timeout: { state: 'Idle' },
                toolhead: { homed_axes: 'xyz' },
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
                    dashboardFilesFilter: [],
                    ...(guiOverrides.uiSettings || {}),
                },
                navigationSettings: { entries: [] },
            },
            files: {},
            instancesDB: 'moonraker',
        },
        getters: {
            'socket/getUrl': () => '//localhost:8080',
            'gui/getPanelExpand': () => () => true,
            'files/getAllGcodes': () => overrideGetters['files/getAllGcodes'] ?? [],
            ...overrideGetters,
        },
        actions: {
            'files/requestMetadata': vi.fn(),
            ...overrideActions,
        },
    })
}

function makeGcodefile(filename: string, overrides: Record<string, any> = {}) {
    return {
        filename,
        full_filename: filename,
        modified: new Date('2024-01-01'),
        size: 1024,
        permissions: 'rw',
        last_status: null,
        preheat_gcode: null,
        count_printed: 0,
        last_end_time: null,
        last_filament_used: null,
        last_print_duration: null,
        last_start_time: null,
        last_total_duration: null,
        metadataPulled: false,
        metadataRequested: false,
        filament_total: 0,
        filament_weight_total: 0,
        estimated_time: 0,
        ...overrides,
    }
}

describe('Gcodefiles.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockBaseValues.loadings.value = []
        mockResizeObserverInstance.observe.mockClear()
        mockResizeObserverInstance.disconnect.mockClear()
    })

    it('renders empty state when no gcode files', () => {
        const store = createTestStore()
        const wrapper = mount(Gcodefiles, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })
        expect(wrapper.text()).toContain('Panels.StatusPanel.EmptyGcodes')
    })

    it('renders gcodefiles entries when gcodes exist', () => {
        const gcodes = [
            makeGcodefile('test1.gcode', { last_status: 'completed' }),
            makeGcodefile('sub/test2.gcode', { last_status: null }),
        ]
        const store = createTestStore({
            getters: {
                'files/getAllGcodes': () => gcodes,
            },
        })
        const wrapper = mount(Gcodefiles, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })
        const entries = wrapper.findAllComponents({ name: 'StatusPanelGcodefilesEntry' })
        expect(entries).toHaveLength(2)
        expect(wrapper.text()).toContain('test1.gcode')
        expect(wrapper.text()).toContain('test2.gcode')
    })

    it('dispatches requestMetadata for files without metadata', () => {
        const requestMetadata = vi.fn()
        const gcodes = [
            makeGcodefile('test1.gcode', { metadataPulled: false, metadataRequested: false }),
            makeGcodefile('test2.gcode', { metadataPulled: true, metadataRequested: true }),
        ]
        const store = createTestStore({
            getters: { 'files/getAllGcodes': () => gcodes },
            actions: { 'files/requestMetadata': requestMetadata },
        })
        mount(Gcodefiles, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })
        expect(requestMetadata).toHaveBeenCalledTimes(1)
        const payload = requestMetadata.mock.calls[0][1]
        expect(payload).toEqual([{ filename: 'gcodes/test1.gcode' }])
    })

    it('respects dashboardFilesLimit', () => {
        const gcodes = Array.from({ length: 10 }, (_, i) => makeGcodefile(`test${i}.gcode`, { last_status: null }))
        const store = createTestStore({
            gui: {
                uiSettings: { dashboardFilesLimit: 3, dashboardFilesFilter: [] },
            },
            getters: { 'files/getAllGcodes': () => gcodes },
        })
        const wrapper = mount(Gcodefiles, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })
        const entries = wrapper.findAllComponents({ name: 'StatusPanelGcodefilesEntry' })
        expect(entries).toHaveLength(3)
    })

    it('filters by new/completed/failed status', () => {
        const gcodes = [
            makeGcodefile('new.gcode', { last_status: null }),
            makeGcodefile('completed.gcode', { last_status: 'completed' }),
            makeGcodefile('failed.gcode', { last_status: 'error' }),
            makeGcodefile('cancelled.gcode', { last_status: 'cancelled' }),
        ]
        const store = createTestStore({
            gui: {
                uiSettings: { dashboardFilesLimit: 5, dashboardFilesFilter: ['new', 'completed'] },
            },
            getters: { 'files/getAllGcodes': () => gcodes },
        })
        const wrapper = mount(Gcodefiles, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })
        // new.gcode (null) + completed.gcode = 2 entries
        const entries = wrapper.findAllComponents({ name: 'StatusPanelGcodefilesEntry' })
        expect(entries).toHaveLength(2)
    })

    it('filters by failed status only', () => {
        const gcodes = [
            makeGcodefile('new.gcode', { last_status: null }),
            makeGcodefile('completed.gcode', { last_status: 'completed' }),
            makeGcodefile('failed.gcode', { last_status: 'error' }),
            makeGcodefile('cancelled.gcode', { last_status: 'cancelled' }),
        ]
        const store = createTestStore({
            gui: {
                uiSettings: { dashboardFilesLimit: 5, dashboardFilesFilter: ['failed'] },
            },
            getters: { 'files/getAllGcodes': () => gcodes },
        })
        const wrapper = mount(Gcodefiles, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })
        // failed: error and cancelled (status !== null && status !== 'completed') = 2 entries
        const entries = wrapper.findAllComponents({ name: 'StatusPanelGcodefilesEntry' })
        expect(entries).toHaveLength(2)
    })

    it('sets up ResizeObserver on mount', () => {
        const store = createTestStore({
            getters: { 'files/getAllGcodes': () => [makeGcodefile('test.gcode')] },
        })
        mount(Gcodefiles, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })
        expect(ResizeObserver).toHaveBeenCalled()
    })
})
