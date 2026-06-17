import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import WebcamPage from '@/pages/Webcam.vue'

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
        socketIsConnected: new MockRef(true),
        hostUrl: new MockRef(new URL('http://localhost:8080')),
        apiUrl: new MockRef('http://localhost:8080'),
    }
})

vi.mock('@/composables/useBase', () => ({
    useBase: () => ({
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
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

vi.mock('@/components/panels/WebcamPanel.vue', () => ({
    default: {
        name: 'WebcamPanel',
        props: ['currentPage'],
        template: '<div class="webcam-panel-stub"><slot /></div>',
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
                config: { config: {}, orig: {} },
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
                    ...(overrides.gui?.webcams || {}),
                },
            },
            files: {},
            instancesDB: 'moonraker',
            ...overrides,
        },
        getters: {
            'socket/getUrl': () => '//localhost:8080',
            'gui/getPanelExpand': () => () => true,
            'gui/webcams/getWebcams': () => {
                const webcams = overrides.gui?.webcams?.webcams ?? []
                return webcams
            },
            ...(overrides.getters || {}),
        },
    })
}

describe('WebcamPage.vue', () => {
    it('renders without crashing', () => {
        const store = createStoreWithState()
        const wrapper = mount(WebcamPage, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.exists()).toBe(true)
    })

    it('renders the webcam-panel component', () => {
        const store = createStoreWithState()
        const wrapper = mount(WebcamPage, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        const webcamPanel = wrapper.findComponent({ name: 'WebcamPanel' })
        expect(webcamPanel.exists()).toBe(true)
    })

    it('passes current-page prop to webcam-panel', () => {
        const store = createStoreWithState()
        const wrapper = mount(WebcamPage, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        const webcamPanel = wrapper.findComponent({ name: 'WebcamPanel' })
        expect(webcamPanel.props('currentPage')).toBe('page')
    })
})
