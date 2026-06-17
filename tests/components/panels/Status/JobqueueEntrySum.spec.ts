import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore as createVuexStore } from 'vuex'
import JobqueueEntrySum from '@/components/panels/Status/JobqueueEntrySum.vue'
import type { ServerJobQueueStateJob } from '@/store/server/jobQueue/types'

const mockBaseValues = vi.hoisted(() => {
    class MockRef<T> {
        _value: T
        __v_isRef = true
        __v_isShallow = false
        constructor(val: T) {
            this._value = val
        }
        get value() {
            return this._value
        }
        set value(v: T) {
            this._value = v
        }
    }
    return {
        printerIsPrinting: new MockRef(false),
        loadings: new MockRef([]),
    }
})

vi.mock('@/composables/useBase', () => ({
    useBase: () => mockBaseValues,
}))

const vuetifyComponentsMock = vi.hoisted(() => ({
    VRow: { name: 'VRow', template: '<div :class="$attrs.class"><slot /></div>' },
    VCol: { name: 'VCol', props: ['cols'], template: '<div :class="$attrs.class"><slot /></div>' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

function makeJob(
    job_id: string,
    filename: string,
    overrides: Partial<ServerJobQueueStateJob> = {}
): ServerJobQueueStateJob {
    return {
        job_id,
        filename,
        time_added: 1000,
        time_in_queue: 100,
        metadata: null,
        combinedIds: undefined,
        ...overrides,
    }
}

function makeJobWithMetadata(job_id: string, filename: string, metaOverrides: Record<string, any> = {}) {
    return makeJob(job_id, filename, {
        metadata: {
            filename,
            modified: new Date('2024-01-01'),
            permissions: 'rw',
            isDirectory: false,
            filament_total: 2000,
            filament_weight_total: 40,
            estimated_time: 1800,
            ...metaOverrides,
        } as any,
    })
}

function createTestStore(overrides: Record<string, any> = {}) {
    const overrideGetters = overrides.getters || {}
    return createVuexStore({
        state: {
            socket: { isConnected: true, initializationList: [], loadings: [] },
            server: {
                klippy_connected: true,
                klippy_state: 'ready',
                components: [],
            },
            printer: {
                print_stats: { state: 'ready' },
                idle_timeout: { state: 'Idle' },
                toolhead: { homed_axes: 'xyz' },
                current_file: null,
            },
            gui: {
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
        },
        getters: {
            'socket/getUrl': () => '//localhost:8080',
            'gui/getPanelExpand': () => () => true,
            'printer/getEstimatedTimeETA': () => null,
            'gui/getHours12Format': () => false,
            ...overrideGetters,
        },
    })
}

describe('JobqueueEntrySum.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders filament, print time, and ETA labels', () => {
        const store = createTestStore()
        const jobs = [makeJobWithMetadata('1', 'test1.gcode')]
        const wrapper = mount(JobqueueEntrySum, {
            props: { jobs },
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.text()).toContain('Panels.StatusPanel.Filament')
        expect(wrapper.text()).toContain('Panels.StatusPanel.PrintTime')
        expect(wrapper.text()).toContain('Panels.StatusPanel.ETA')
    })

    it('computes filament output correctly', () => {
        const store = createTestStore()
        const jobs = [
            makeJobWithMetadata('1', 'test1.gcode', { filament_total: 1500, filament_weight_total: 30 }),
            makeJobWithMetadata('2', 'test2.gcode', { filament_total: 2500, filament_weight_total: 50 }),
        ]
        const wrapper = mount(JobqueueEntrySum, {
            props: { jobs },
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.text()).toContain('4.0 m')
        expect(wrapper.text()).toContain('80 g')
    })

    it('computes filament output with only length', () => {
        const store = createTestStore()
        const jobs = [makeJobWithMetadata('1', 'test1.gcode', { filament_total: 500, filament_weight_total: 0 })]
        const wrapper = mount(JobqueueEntrySum, {
            props: { jobs },
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.text()).toContain('500 mm')
        expect(wrapper.text()).not.toContain('g')
    })

    it('shows -- for empty job sums', () => {
        const store = createTestStore()
        const jobs = [makeJob('1', 'test.gcode')]
        const wrapper = mount(JobqueueEntrySum, {
            props: { jobs },
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.text()).toContain('--')
    })

    it('computes estimated time with hours', () => {
        const store = createTestStore()
        const jobs = [makeJobWithMetadata('1', 'test1.gcode', { estimated_time: 7200 })]
        const wrapper = mount(JobqueueEntrySum, {
            props: { jobs },
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.text()).toContain('2h')
    })

    it('computes estimated time with days', () => {
        const store = createTestStore()
        const jobs = [makeJobWithMetadata('1', 'test1.gcode', { estimated_time: 90000 })]
        const wrapper = mount(JobqueueEntrySum, {
            props: { jobs },
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.text()).toContain('1d')
        expect(wrapper.text()).toContain('1h')
    })

    it('computes ETA from store getter', () => {
        const now = Date.now()
        const store = createTestStore({
            getters: {
                'printer/getEstimatedTimeETA': () => now + 3600000,
                'gui/getHours12Format': () => false,
            },
        })
        const jobs = [makeJobWithMetadata('1', 'test1.gcode', { estimated_time: 3600 })]
        const wrapper = mount(JobqueueEntrySum, {
            props: { jobs },
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        const etaMatch = /\d{2}:\d{2}/.exec(wrapper.text())
        expect(etaMatch).not.toBeNull()
    })

    it('handles combinedIds in sums', () => {
        const store = createTestStore()
        const job = makeJobWithMetadata('1', 'test1.gcode', { filament_total: 1000, estimated_time: 600 })
        job.combinedIds = ['2', '3'] // combinedIds at job level, not in metadata
        const jobs = [job]
        const wrapper = mount(JobqueueEntrySum, {
            props: { jobs },
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        // filamentLength: 1000 * 3 = 3000 -> "3.0 m"
        expect(wrapper.text()).toContain('3.0 m')
        // estimatedTime: 600 * 3 = 1800 -> "30m"
        expect(wrapper.text()).toContain('30m')
    })

    it('handles 12-hour format for ETA', () => {
        const mockDate = new Date('2024-01-15T08:00:00')
        vi.useFakeTimers()
        vi.setSystemTime(mockDate)

        const store = createTestStore({
            getters: {
                // Return a current print ETA of 8AM so the job queue ETA will be 8AM + 1h = 9AM
                'printer/getEstimatedTimeETA': () => mockDate.getTime(),
                'gui/getHours12Format': () => true,
            },
        })
        const jobs = [makeJobWithMetadata('1', 'test1.gcode', { estimated_time: 3600 })]
        const wrapper = mount(JobqueueEntrySum, {
            props: { jobs },
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })
        // ETA = currentPrintEta (8AM) + sums.estimatedTime (3600s) = 9AM
        expect(wrapper.text()).toContain('09:00 AM')
        expect(wrapper.text()).toContain('AM')

        vi.useRealTimers()
    })
})
