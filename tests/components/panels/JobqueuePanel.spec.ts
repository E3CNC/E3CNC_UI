import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import JobqueuePanel from '@/components/panels/JobqueuePanel.vue'

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
        klipperReadyForGui: new MockRef(true),
        loadings: new MockRef([]),
    }
})

vi.mock('@/composables/useBase', () => ({
    useBase: () => mockBaseValues,
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}))

const vuetifyComponentsMock = vi.hoisted(() => ({
    VRow: { name: 'VRow', template: '<div><slot /></div>' },
    VCol: { name: 'VCol', template: '<div><slot /></div>' },
    VCardText: { name: 'VCardText', template: '<div><slot /></div>' },
    VBtn: { name: 'VBtn', props: ['icon', 'ripple', 'color', 'loading', 'disabled'], template: '<button :class="$attrs.class" :disabled="$attrs.disabled" @click="$attrs.onClick || $attrs.click"><slot /></button>' },
    VIcon: { name: 'VIcon', props: ['start', 'icon'], template: '<i><slot /></i>' },
    VTooltip: { name: 'VTooltip', props: ['top'], template: '<div><slot /></div>' },
    VToolbar: { name: 'VToolbar', inheritAttrs: false, template: '<div :class="$attrs.class" :style="$attrs.style"><slot /></div>' },
    VToolbarTitle: { name: 'VToolbarTitle', template: '<span><slot /></span>' },
    VToolbarItems: { name: 'VToolbarItems', template: '<div><slot /></div>' },
    VSpacer: { name: 'VSpacer', template: '<span style="flex:1" />' },
    VExpandTransition: { name: 'VExpandTransition', template: '<div><slot /></div>' },
    VCard: { name: 'VCard', inheritAttrs: false, template: '<div :class="$attrs.class" :style="$attrs.style"><slot /></div>' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)
vi.mock('@/components/ui/Panel.vue', () => ({
    default: {
        name: 'Panel',
        props: ['icon', 'title', 'cardClass'],
        template: '<div :class="cardClass"><slot name="buttons" /><slot /></div>',
    },
}))
vi.mock('@/components/panels/Status/JobqueueEntry.vue', () => ({
    default: {
        name: 'JobqueueEntry',
        props: ['job', 'showHandle'],
        template: '<div class="jobqueue-entry">{{ job?.filename }}</div>',
    },
}))
vi.mock('@/components/panels/Status/JobqueueEntrySum.vue', () => ({
    default: {
        name: 'JobqueueEntrySum',
        props: ['jobs'],
        template: '<div class="jobqueue-sum">{{ jobs?.length }} job(s)</div>',
    },
}))
vi.mock('vuedraggable', () => ({
    default: {
        name: 'Draggable',
        props: ['list', 'handle', 'group', 'forceFallback'],
        template: '<div class="draggable"><slot /></div>',
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
                    queue_state: 'ready',
                    ...(overrides.jobQueue || {}),
                },
            },
            printer: {
                print_stats: { state: 'standby' },
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
            'socket/getHostUrl': () => '//localhost:8080',
            'server/jobQueue/getJobs': () => [],
            'server/jobQueue/getJobsCount': () => 0,
            'gui/getPanelExpand': () => () => true,
            ...(overrides.getters || {}),
        },
    })
}

describe('JobqueuePanel.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockBaseValues.klipperReadyForGui.value = true
        mockBaseValues.loadings.value = []
    })

    it('renders empty message when there are no jobs', () => {
        const store = createStoreWithState()
        const wrapper = mount(JobqueuePanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.jobqueue-panel').exists()).toBe(true)
        expect(wrapper.text()).toContain('JobQueue.Empty')
    })

    it('renders job entries when there are jobs', () => {
        const jobs = [
            { job_id: '1', filename: 'test.gcode', filament: 0.5, estimated_time: 3600, total_duration: 0 },
            { job_id: '2', filename: 'benchy.gcode', filament: 2.0, estimated_time: 7200, total_duration: 0 },
        ]
        const store = createStoreWithState({
            getters: {
                'server/jobQueue/getJobs': () => jobs,
                'server/jobQueue/getJobsCount': () => jobs.length,
                'gui/getPanelExpand': () => () => true,
            },
        })
        const wrapper = mount(JobqueuePanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.draggable').exists()).toBe(true)
        const entries = wrapper.findAll('.jobqueue-entry')
        expect(entries).toHaveLength(2)
        expect(entries[0].text()).toBe('test.gcode')
        expect(entries[1].text()).toBe('benchy.gcode')
        expect(wrapper.find('.jobqueue-sum').exists()).toBe(true)
    })

    it('shows pause button when queue state is ready', () => {
        const store = createStoreWithState()
        const wrapper = mount(JobqueuePanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        // The pause button should be rendered (v-if="['ready', 'loading'].includes(queueState)")
        const pauseBtn = wrapper.find('.v-btn--pause')
        // Since VBtn is a mock, we can check if there are at least 2 buttons (including from slot)
        // Actually let's just check the text includes pause key
        expect(wrapper.text()).toContain('JobQueue.Pause')
    })

    it('shows start button when queue state is paused', () => {
        const store = createStoreWithState({
            jobQueue: { queue_state: 'paused' },
        })
        const wrapper = mount(JobqueuePanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.text()).toContain('JobQueue.Start')
    })

    it('dispatches start action when start button is clicked', async () => {
        const store = createStoreWithState({
            jobQueue: { queue_state: 'paused' },
        })
        const dispatchSpy = vi.spyOn(store, 'dispatch')
        const wrapper = mount(JobqueuePanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        // Find the start button and click it
        const buttons = wrapper.findAllComponents({ name: 'v-btn' })
        expect(buttons.length).toBeGreaterThan(0)

        // Click the button - since our mock template just has <button>, we can click the wrapper button
        const btn = wrapper.find('button')
        if (btn.exists()) {
            await btn.trigger('click')
        }

        expect(dispatchSpy).toHaveBeenCalledWith('server/jobQueue/start')
    })
})
