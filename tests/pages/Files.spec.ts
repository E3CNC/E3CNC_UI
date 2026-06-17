import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import FilesPage from '@/pages/Files.vue'

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
        existGcodesRootDirectory: new MockRef(true),
        moonrakerComponents: new MockRef<string[]>([]),
        socketIsConnected: new MockRef(true),
        hostUrl: new MockRef(new URL('http://localhost:8080')),
        apiUrl: new MockRef('http://localhost:8080'),
    }
})

vi.mock('@/composables/useBase', () => ({
    useBase: () => ({
        existGcodesRootDirectory: mockBaseValues.existGcodesRootDirectory,
        moonrakerComponents: mockBaseValues.moonrakerComponents,
        socketIsConnected: mockBaseValues.socketIsConnected,
        hostUrl: mockBaseValues.hostUrl,
        apiUrl: mockBaseValues.apiUrl,
    }),
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}))

const vuetifyComponentsMock = vi.hoisted(() => ({
    VRow: { name: 'VRow', template: '<div><slot /></div>' },
    VCol: { name: 'VCol', template: '<div><slot /></div>' },
    VAlert: { name: 'VAlert', template: '<div><slot /></div>' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

vi.mock('@mdi/js', () => ({
    mdiLockOutline: 'mdiLockOutline',
}))

vi.mock('@/components/panels/GcodefilesPanel.vue', () => ({
    default: {
        name: 'GcodefilesPanel',
        template: '<div class="gcodefiles-panel-stub" />',
    },
}))

vi.mock('@/components/panels/JobqueuePanel.vue', () => ({
    default: {
        name: 'JobqueuePanel',
        template: '<div class="jobqueue-panel-stub" />',
    },
}))

function createStoreWithState(overrides: Record<string, any> = {}) {
    return createStore({
        state: {
            socket: {
                isConnected: true,
                hostname: 'localhost',
                port: '8080',
                initializationList: [],
                loadings: [],
            },
            server: {
                klippy_connected: true,
                klippy_state: 'ready',
                components: [],
                config: { config: {}, orig: {} },
                registered_directories: ['gcodes'],
                jobQueue: {
                    queued_jobs: [],
                },
                ...(overrides.server || {}),
            },
            printer: {
                print_stats: { state: 'ready' },
                idle_timeout: { state: 'Idle' },
                toolhead: { homed_axes: 'xyz' },
            },
            gui: {
                view: {},
                dashboard: {
                    nonExpandPanels: { mobile: [], tablet: [], desktop: [], widescreen: [] },
                    floatingPanels: {},
                },
                general: { printername: 'Test' },
                control: {},
                uiSettings: {},
                navigationSettings: { entries: [] },
                webcams: {
                    webcams: [],
                },
            },
            files: {},
            instancesDB: 'moonraker',
            ...overrides,
        },
        getters: {
            'socket/getUrl': () => '//localhost:8080',
            'socket/getHostUrl': () => new URL('http://localhost:8080'),
            'gui/getPanelExpand': () => () => true,
            ...(overrides.getters || {}),
        },
    })
}

describe('Files.vue', () => {
    afterEach(() => {
        // Reset mock values to defaults
        mockBaseValues.existGcodesRootDirectory._value = true
        mockBaseValues.moonrakerComponents._value = []
    })

    it('renders gcodefiles-panel when existGcodesRootDirectory is true', () => {
        const store = createStoreWithState()
        const wrapper = mount(FilesPage, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.findComponent({ name: 'GcodefilesPanel' }).exists()).toBe(true)
        expect(wrapper.findComponent({ name: 'VAlert' }).exists()).toBe(false)
    })

    it('shows warning alert when existGcodesRootDirectory is false', () => {
        mockBaseValues.existGcodesRootDirectory._value = false

        const store = createStoreWithState({
            server: {
                registered_directories: [],
            },
        })
        const wrapper = mount(FilesPage, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.findComponent({ name: 'GcodefilesPanel' }).exists()).toBe(false)
        expect(wrapper.findComponent({ name: 'VAlert' }).exists()).toBe(true)
        expect(wrapper.text()).toContain('Files.GcodesRootDirectoryDoesntExists')
    })

    it('shows jobqueue-panel when showJobQueue is true', () => {
        mockBaseValues.moonrakerComponents._value = ['job_queue']

        const store = createStoreWithState({
            server: {
                components: ['job_queue'],
                jobQueue: {
                    queued_jobs: [{ filename: 'test.gcode' }],
                },
            },
        })
        const wrapper = mount(FilesPage, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.findComponent({ name: 'GcodefilesPanel' }).exists()).toBe(true)
        expect(wrapper.findComponent({ name: 'JobqueuePanel' }).exists()).toBe(true)
    })

    it('hides jobqueue-panel when queued_jobs is empty', () => {
        mockBaseValues.moonrakerComponents._value = ['job_queue']

        const store = createStoreWithState({
            server: {
                components: ['job_queue'],
                jobQueue: {
                    queued_jobs: [],
                },
            },
        })
        const wrapper = mount(FilesPage, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.findComponent({ name: 'GcodefilesPanel' }).exists()).toBe(true)
        expect(wrapper.findComponent({ name: 'JobqueuePanel' }).exists()).toBe(false)
    })
})
