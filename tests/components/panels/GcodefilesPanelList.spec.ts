import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import GcodefilesPanelList from '@/components/panels/Gcodefiles/GcodefilesPanelList.vue'

const mockGcodeFilesValues = vi.hoisted(() => {
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
        currentPath: new MockRef(''),
        files: new MockRef([]),
        selectedFiles: new MockRef([]),
        setSelectedFiles: vi.fn(),
    }
})

vi.mock('@/composables/useGcodeFiles', () => ({
    useGcodeFiles: () => mockGcodeFilesValues,
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}))

const vuetifyComponentsMock = vi.hoisted(() => ({
    VIcon: { name: 'VIcon', props: ['size', 'color'], template: '<i><slot /></i>' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)
vi.mock('@/components/panels/Gcodefiles/GcodefilesPanelListCardBack.vue', () => ({
    default: {
        name: 'GcodefilesPanelListCardBack',
        template: '<div class="gcode-dir-back" />',
    },
}))
vi.mock('@/components/panels/Gcodefiles/GcodefilesPanelListCardDirectory.vue', () => ({
    default: {
        name: 'GcodefilesPanelListCardDirectory',
        props: ['item'],
        template: '<div class="gcode-dir-card">{{ item.filename }}</div>',
    },
}))
vi.mock('@/components/panels/Gcodefiles/GcodefilesPanelListCardFile.vue', () => ({
    default: {
        name: 'GcodefilesPanelListCardFile',
        props: ['item', 'isSelected', 'select'],
        template: '<div class="gcode-file-card">{{ item.filename }}</div>',
    },
}))

function createStoreWithState(overrides: Record<string, any> = {}) {
    return createStore({
        state: {
            socket: { isConnected: true, initializationList: [], loadings: [] },
            server: { klippy_connected: true, klippy_state: 'ready', components: [] },
            printer: {
                print_stats: { state: 'standby' },
                idle_timeout: { state: 'Idle' },
                toolhead: { homed_axes: 'xyz' },
            },
            gui: {
                view: {
                    gcodefiles: {
                        currentPath: '',
                        search: '',
                        showHiddenFiles: false,
                        showCompletedFiles: true,
                        selectedFiles: [],
                        hideMetadataColumns: [],
                        orderMetadataColumns: [],
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
            'socket/getHostUrl': () => '//localhost:8080',
            'gui/getPanelExpand': () => () => true,
            'files/getGcodeFiles': () => () => [],
            ...(overrides.getters || {}),
        },
    })
}

describe('GcodefilesPanelList.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockGcodeFilesValues.currentPath.value = ''
        mockGcodeFilesValues.files.value = []
        mockGcodeFilesValues.selectedFiles.value = []
    })

    it('shows empty state when no files or directories', () => {
        const store = createStoreWithState()
        const wrapper = mount(GcodefilesPanelList, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.gcode-list').exists()).toBe(true)
        expect(wrapper.text()).toContain('Files.Empty')
    })

    it('renders directory cards when directories exist', () => {
        mockGcodeFilesValues.files.value = [
            { isDirectory: true, filename: 'prints' },
            { isDirectory: true, filename: 'backups' },
        ]

        const store = createStoreWithState()
        const wrapper = mount(GcodefilesPanelList, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        const dirCards = wrapper.findAll('.gcode-dir-card')
        expect(dirCards).toHaveLength(2)
        expect(dirCards[0].text()).toBe('prints')
        expect(dirCards[1].text()).toBe('backups')
    })

    it('renders file cards when files exist', () => {
        mockGcodeFilesValues.files.value = [
            { isDirectory: false, filename: 'test.gcode' },
            { isDirectory: false, filename: 'benchmark.gcode' },
        ]

        const store = createStoreWithState()
        const wrapper = mount(GcodefilesPanelList, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        const fileCards = wrapper.findAll('.gcode-file-card')
        expect(fileCards).toHaveLength(2)
        expect(fileCards[0].text()).toBe('test.gcode')
        expect(fileCards[1].text()).toBe('benchmark.gcode')
    })

    it('shows back card when currentPath is not empty', () => {
        mockGcodeFilesValues.currentPath.value = '/subfolder'
        mockGcodeFilesValues.files.value = [{ isDirectory: false, filename: 'test.gcode' }]

        const store = createStoreWithState({
            gui: {
                view: {
                    gcodefiles: {
                        currentPath: '/subfolder',
                        search: '',
                        showHiddenFiles: false,
                        showCompletedFiles: true,
                        selectedFiles: [],
                        hideMetadataColumns: [],
                        orderMetadataColumns: [],
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
        const wrapper = mount(GcodefilesPanelList, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.gcode-dir-back').exists()).toBe(true)
    })

    it('renders mixed directories and files', () => {
        mockGcodeFilesValues.files.value = [
            { isDirectory: true, filename: 'folder1' },
            { isDirectory: false, filename: 'file1.gcode' },
            { isDirectory: true, filename: 'folder2' },
            { isDirectory: false, filename: 'file2.gcode' },
        ]

        const store = createStoreWithState()
        const wrapper = mount(GcodefilesPanelList, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.findAll('.gcode-dir-card')).toHaveLength(2)
        expect(wrapper.findAll('.gcode-file-card')).toHaveLength(2)
    })
})
