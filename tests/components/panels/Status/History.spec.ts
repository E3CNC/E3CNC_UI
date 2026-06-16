import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore as createVuexStore } from 'vuex'
import History from '@/components/panels/Status/History.vue'

vi.mock('@/composables/useBase', () => ({
    useBase: () => ({}),
}))

const vuetifyComponentsMock = vi.hoisted(() => ({
    VCard: { name: 'VCard', inheritAttrs: false, template: '<div :class="$attrs.class" :style="$attrs.style"><slot /></div>' },
    VRow: { name: 'VRow', template: '<div :class="$attrs.class"><slot /></div>' },
    VCol: { name: 'VCol', template: '<div :class="$attrs.class"><slot /></div>' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

vi.mock('@/components/panels/Status/HistoryEntry.vue', () => ({
    default: {
        name: 'StatusPanelHistoryEntry',
        props: ['job'],
        template: '<div class="mock-history-entry">{{ job.filename }}</div>',
    },
}))

function createTestStore(overrides: Record<string, any> = {}) {
    const serverOverrides = overrides.server || {}
    const guiOverrides = overrides.gui || {}
    return createVuexStore({
        state: {
            socket: { isConnected: true, initializationList: [], loadings: [] },
            server: {
                klippy_connected: true,
                klippy_state: 'ready',
                components: [],
                history: {
                    jobs: [],
                    job_totals: { total_jobs: 0, total_time: 0, total_print_time: 0, total_filament_used: 0, longest_job: 0, longest_print: 0 },
                    auxiliary_totals: [],
                    all_loaded: false,
                    ...(serverOverrides.history || {}),
                },
                ...serverOverrides,
            },
            printer: {
                print_stats: { state: 'ready' },
                idle_timeout: { state: 'Idle' },
                toolhead: { homed_axes: 'xyz' },
            },
            gui: {
                dashboard: { nonExpandPanels: { mobile: [], tablet: [], desktop: [], widescreen: [] }, floatingPanels: {} },
                general: { printername: 'Test' },
                control: {},
                uiSettings: {
                    dashboardHistoryLimit: 5,
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
            ...(overrides.getters || {}),
        },
    })
}

function makeJob(job_id: string, filename: string, overrides: Record<string, any> = {}) {
    return {
        job_id,
        filename,
        exists: true,
        end_time: 1005000,
        filament_used: 500,
        print_duration: 4500,
        total_duration: 5000,
        start_time: 1000000,
        status: 'completed',
        metadata: {
            uuid: null,
            thumbnails: [],
            modified: 1000000,
            filament_total: 0,
            filament_weight_total: 0,
            estimated_time: 0,
            ...(overrides.metadata || {}),
        },
        ...overrides,
    }
}

describe('History.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders empty state when no jobs', () => {
        const store = createTestStore()
        const wrapper = mount(History, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })
        expect(wrapper.text()).toContain('Panels.StatusPanel.EmptyHistory')
    })

    it('renders history entries when jobs exist', () => {
        const jobs = [
            makeJob('1', 'test1.gcode', { metadata: { uuid: 'uuid-1' } }),
            makeJob('2', 'test2.gcode', { metadata: { uuid: 'uuid-2' } }),
        ]
        const store = createTestStore({
            server: { history: { jobs } },
        })
        const wrapper = mount(History, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })
        const entries = wrapper.findAllComponents({ name: 'StatusPanelHistoryEntry' })
        expect(entries).toHaveLength(2)
        expect(wrapper.text()).toContain('test1.gcode')
        expect(wrapper.text()).toContain('test2.gcode')
    })

    it('combines jobs with same UUID and status', () => {
        const uuid = 'abc-123'
        const jobs = [
            makeJob('1', 'test.gcode', { metadata: { uuid } }),
            makeJob('2', 'test.gcode', { metadata: { uuid }, filament_used: 300, print_duration: 2000, total_duration: 2500 }),
        ]
        const store = createTestStore({
            server: { history: { jobs } },
        })
        const wrapper = mount(History, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })
        const entries = wrapper.findAllComponents({ name: 'StatusPanelHistoryEntry' })
        expect(entries).toHaveLength(1)
    })

    it('respects dashboardHistoryLimit', () => {
        const jobs = Array.from({ length: 10 }, (_, i) =>
            makeJob(`${i}`, `test${i}.gcode`, { metadata: { uuid: `uuid-${i}` } })
        )
        const store = createTestStore({
            server: { history: { jobs } },
            gui: { uiSettings: { dashboardHistoryLimit: 3 } },
        })
        const wrapper = mount(History, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })
        const entries = wrapper.findAllComponents({ name: 'StatusPanelHistoryEntry' })
        expect(entries).toHaveLength(3)
    })

    it('does not combine jobs with different UUIDs', () => {
        const jobs = [
            makeJob('1', 'test1.gcode', { metadata: { uuid: 'abc-1' } }),
            makeJob('2', 'test2.gcode', { metadata: { uuid: 'abc-2' } }),
        ]
        const store = createTestStore({
            server: { history: { jobs } },
        })
        const wrapper = mount(History, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })
        const entries = wrapper.findAllComponents({ name: 'StatusPanelHistoryEntry' })
        expect(entries).toHaveLength(2)
    })
})
