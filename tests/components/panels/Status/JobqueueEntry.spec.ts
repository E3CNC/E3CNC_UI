import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore as createVuexStore } from 'vuex'
import JobqueueEntry from '@/components/panels/Status/JobqueueEntry.vue'
import type { ServerJobQueueStateJob } from '@/store/server/jobQueue/types'

const mockBaseValues = vi.hoisted(() => {
    class MockRef<T> {
        _value: T
        __v_isRef = true
        __v_isShallow = false
        constructor(val: T) { this._value = val }
        get value() { return this._value }
        set value(v: T) { this._value = v }
    }
    return {
        printerIsPrinting: new MockRef(false),
        loadings: new MockRef([]),
    }
})

vi.mock('@/composables/useBase', () => ({
    useBase: () => mockBaseValues,
}))

vi.mock('@/plugins/eventBus', () => ({
    EventBus: { $emit: vi.fn(), $on: vi.fn(), $off: vi.fn() },
    CLOSE_CONTEXT_MENU: 'close-context-menu',
}))

vi.mock('@/directives/longpress', () => ({
    default: {},
}))

const vuetifyComponentsMock = vi.hoisted(() => ({
    VRow: { name: 'VRow', template: '<div :class="$attrs.class"><slot /></div>' },
    VCol: { name: 'VCol', props: ['cols'], template: '<div :class="$attrs.class"><slot /></div>' },
    VMenu: { name: 'VMenu', props: ['modelValue', 'positionX', 'positionY', 'absolute', 'offsetY'], template: '<div class="v-menu" :class="{ visible: modelValue }"><slot name="activator" :props="{onClick: () => {}}" /><div v-if="modelValue"><slot /></div></div>' },
    VList: { name: 'VList', template: '<div class="v-list"><slot /></div>' },
    VListItem: { name: 'VListItem', props: ['disabled'], template: '<div class="v-list-item" :class="{disabled: disabled}" @click="$emit(\'click\')"><slot /></div>' },
    VIcon: { name: 'VIcon', props: ['size', 'color', 'icon'], template: '<i :class="$attrs.class"><slot /></i>' },
    VBtn: { name: 'VBtn', props: ['icon', 'color'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

vi.mock('@/components/panels/Gcodefiles/GcodefilesThumbnail.vue', () => ({
    default: { name: 'GcodefilesThumbnail', props: ['item'], template: '<div class="gcodefiles-thumbnail" />' },
}))

vi.mock('@/components/dialogs/JobqueueEntryChangeCountDialog.vue', () => ({
    default: { name: 'JobqueueEntryChangeCountDialog', props: ['modelValue', 'job'], template: '<div class="change-count-dialog" />' },
}))

function createTestStore(overrides: Record<string, any> = {}) {
    const overrideGetters = overrides.getters || {}
    const overrideActions = overrides.actions || {}
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
            },
            gui: {
                dashboard: { nonExpandPanels: { mobile: [], tablet: [], desktop: [], widescreen: [] }, floatingPanels: {} },
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
            'server/jobQueue/getSmallThumbnail': () => () => null,
            'server/jobQueue/getBigThumbnail': () => () => null,
            ...overrideGetters,
        },
        actions: {
            'server/jobQueue/startByJobId': vi.fn(),
            'server/jobQueue/start': vi.fn(),
            'server/jobQueue/deleteFromQueue': vi.fn(),
            ...overrideActions,
        },
    })
}

function makeJob(job_id: string, filename: string, overrides: Partial<ServerJobQueueStateJob> = {}): ServerJobQueueStateJob {
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

describe('JobqueueEntry.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders filename', () => {
        const store = createTestStore()
        const job = makeJob('1', 'test_file.gcode')
        const wrapper = mount(JobqueueEntry, {
            props: { job, showPrintButton: false, showHandle: false },
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })
        expect(wrapper.text()).toContain('test_file.gcode')
    })

    it('shows combined count when job.combinedIds has items', () => {
        const store = createTestStore()
        const job = makeJob('1', 'test.gcode', { combinedIds: ['2', '3'] })
        const wrapper = mount(JobqueueEntry, {
            props: { job, showPrintButton: false, showHandle: false },
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })
        expect(wrapper.text()).toContain('3x')
    })

    it('shows print button when showPrintButton is true and not printing', () => {
        const store = createTestStore()
        const job = makeJob('1', 'test.gcode')
        const wrapper = mount(JobqueueEntry, {
            props: { job, showPrintButton: true, showHandle: false },
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })
        expect(wrapper.findComponent({ name: 'v-btn' }).exists()).toBe(true)
    })

    it('hides print button when showPrintButton is false', () => {
        const store = createTestStore()
        const job = makeJob('1', 'test.gcode')
        const wrapper = mount(JobqueueEntry, {
            props: { job, showPrintButton: false, showHandle: false },
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })
        expect(wrapper.findComponent({ name: 'v-btn' }).exists()).toBe(false)
    })

    it('shows handle icon when showHandle is true', () => {
        const store = createTestStore()
        const job = makeJob('1', 'test.gcode')
        const wrapper = mount(JobqueueEntry, {
            props: { job, showPrintButton: false, showHandle: true },
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })
        const icons = wrapper.findAllComponents({ name: 'v-icon' })
        expect(icons.length).toBeGreaterThanOrEqual(1)
    })

    it('renders description when metadata is pulled', () => {
        const store = createTestStore()
        const job = makeJob('1', 'test.gcode', {
            metadata: {
                filename: 'test.gcode',
                modified: new Date('2024-01-01'),
                permissions: 'rw',
                isDirectory: false,
                metadataPulled: true,
                filament_total: 2500,
                filament_weight_total: 50,
                estimated_time: 3600,
            } as any,
        })
        const wrapper = mount(JobqueueEntry, {
            props: { job, showPrintButton: false, showHandle: false },
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })
        expect(wrapper.text()).toContain('Filament:')
        expect(wrapper.text()).toContain('Print Time:')
    })

    it('emits CLOSE_CONTEXT_MENU on contextmenu event', async () => {
        const { EventBus, CLOSE_CONTEXT_MENU } = await import('@/plugins/eventBus')
        const store = createTestStore()
        const job = makeJob('1', 'test.gcode')
        const wrapper = mount(JobqueueEntry, {
            props: { job, showPrintButton: false, showHandle: false },
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })

        const row = wrapper.find('.jobqueue-list-entry')
        await row.trigger('contextmenu')

        expect(EventBus.$emit).toHaveBeenCalledWith(CLOSE_CONTEXT_MENU)
    })

    it('registers EventBus listener on mount', async () => {
        const { EventBus, CLOSE_CONTEXT_MENU } = await import('@/plugins/eventBus')
        const store = createTestStore()
        const job = makeJob('1', 'test.gcode')
        const wrapper = mount(JobqueueEntry, {
            props: { job, showPrintButton: false, showHandle: false },
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })

        expect(EventBus.$on).toHaveBeenCalledWith(CLOSE_CONTEXT_MENU, expect.any(Function))
    })

    it('unregisters EventBus listener on unmount', async () => {
        const { EventBus, CLOSE_CONTEXT_MENU } = await import('@/plugins/eventBus')
        const store = createTestStore()
        const job = makeJob('1', 'test.gcode')
        const wrapper = mount(JobqueueEntry, {
            props: { job, showPrintButton: false, showHandle: false },
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })

        wrapper.unmount()
        expect(EventBus.$off).toHaveBeenCalledWith(CLOSE_CONTEXT_MENU, expect.any(Function))
    })

    it('dispatches start on print button click', async () => {
        const start = vi.fn()
        const store = createTestStore({ actions: { 'server/jobQueue/start': start } })
        const job = makeJob('1', 'test.gcode')
        const wrapper = mount(JobqueueEntry, {
            props: { job, showPrintButton: true, showHandle: false },
            global: { plugins: [store], mocks: { $t: (key: string) => key } },
        })

        const btn = wrapper.findComponent({ name: 'v-btn' })
        await btn.trigger('click')
        expect(start).toHaveBeenCalled()
    })
})
