import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import Jobqueue from '@/components/panels/Status/Jobqueue.vue'

vi.mock('@/composables/useBase', () => ({
    useBase: () => ({}),
}))

const vuetifyComponentsMock = vi.hoisted(() => ({
    VCard: {
        name: 'VCard',
        inheritAttrs: false,
        template: '<div :class="$attrs.class" :style="$attrs.style"><slot /></div>',
    },
    VRow: { name: 'VRow', template: '<div :class="$attrs.class"><slot /></div>' },
    VCol: { name: 'VCol', template: '<div :class="$attrs.class"><slot /></div>' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

vi.mock('@/components/panels/Status/JobqueueEntry.vue', () => ({
    default: {
        name: 'JobqueueEntry',
        props: ['job', 'showPrintButton', 'showHandle'],
        template: '<div class="mock-jobqueue-entry">{{ job.filename }}:print={{ showPrintButton }}</div>',
    },
}))

vi.mock('@/components/panels/Status/JobqueueEntryRest.vue', () => ({
    default: {
        name: 'JobqueueEntryRest',
        props: ['jobs'],
        template: '<div class="mock-jobqueue-rest">+{{ jobs.length }} more</div>',
    },
}))

function createStoreWithState(overrides: Record<string, any> = {}) {
    return createStore({
        state: {
            socket: { isConnected: true, initializationList: [], loadings: [] },
            server: {
                klippy_connected: true,
                klippy_state: 'ready',
                components: [],
                jobQueue: {
                    queued_jobs: [],
                    queue_state: 'ready',
                    ...((overrides.server || {}).jobQueue || {}),
                },
                ...(overrides.server || {}),
            },
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
            'server/jobQueue/getJobs': () => overrides.getters?.['server/jobQueue/getJobs'] ?? [],
            ...(overrides.getters || {}),
        },
        actions: {
            'server/jobQueue/start': vi.fn(),
            ...(overrides.actions || {}),
        },
    })
}

function makeJob(job_id: string, filename: string) {
    return {
        job_id,
        filename,
        time_added: 1000,
        time_in_queue: 100,
        metadata: null,
        combinedIds: undefined,
    }
}

describe('Jobqueue.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders empty state when no jobs', () => {
        const store = createStoreWithState()
        const wrapper = mount(Jobqueue, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })
        expect(wrapper.text()).toContain('Panels.StatusPanel.EmptyJobqueue')
    })

    it('renders job entries when jobs exist (<= 5)', () => {
        const jobs = [makeJob('1', 'test1.gcode'), makeJob('2', 'test2.gcode'), makeJob('3', 'test3.gcode')]
        const store = createStoreWithState({
            getters: { 'server/jobQueue/getJobs': () => jobs },
        })
        const wrapper = mount(Jobqueue, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        const entries = wrapper.findAllComponents({ name: 'JobqueueEntry' })
        expect(entries).toHaveLength(3)
        expect(wrapper.text()).toContain('test1.gcode')
        expect(wrapper.text()).toContain('test2.gcode')
        expect(wrapper.text()).toContain('test3.gcode')
    })

    it('shows only 4 entries when more than 5 jobs', () => {
        const jobs = Array.from({ length: 8 }, (_, i) => makeJob(`${i}`, `test${i}.gcode`))
        const store = createStoreWithState({
            getters: { 'server/jobQueue/getJobs': () => jobs },
        })
        const wrapper = mount(Jobqueue, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        const entries = wrapper.findAllComponents({ name: 'JobqueueEntry' })
        expect(entries).toHaveLength(4)
    })

    it('shows jobqueue-rest when jobs > 5', () => {
        const jobs = Array.from({ length: 8 }, (_, i) => makeJob(`${i}`, `test${i}.gcode`))
        const store = createStoreWithState({
            getters: { 'server/jobQueue/getJobs': () => jobs },
        })
        const wrapper = mount(Jobqueue, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.findComponent({ name: 'JobqueueEntryRest' }).exists()).toBe(true)
    })

    it('does not show jobqueue-rest when jobs <= 5', () => {
        const jobs = Array.from({ length: 5 }, (_, i) => makeJob(`${i}`, `test${i}.gcode`))
        const store = createStoreWithState({
            getters: { 'server/jobQueue/getJobs': () => jobs },
        })
        const wrapper = mount(Jobqueue, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.findComponent({ name: 'JobqueueEntryRest' }).exists()).toBe(false)
    })

    it('sets showPrintButton only for first entry', () => {
        const jobs = [makeJob('1', 'first.gcode'), makeJob('2', 'second.gcode')]
        const store = createStoreWithState({
            getters: { 'server/jobQueue/getJobs': () => jobs },
        })
        const wrapper = mount(Jobqueue, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        const entries = wrapper.findAllComponents({ name: 'JobqueueEntry' })
        // First entry should have print button
        expect(entries[0].text()).toContain(':print=true')
        // Second should not
        expect(entries[1].text()).toContain(':print=false')
    })
})
