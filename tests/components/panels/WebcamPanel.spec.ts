import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import WebcamPanel from '@/components/panels/WebcamPanel.vue'

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

vi.mock('@/composables/useWebcam', () => ({
    useWebcam: () => ({
        socketIsConnected: mockBaseValues.socketIsConnected,
        convertWebcamIcon: (icon: string) => icon,
        generateTransform: () => 'none',
        getWrapperStyle: () => ({}),
        apiUrl: mockBaseValues.apiUrl,
    }),
}))

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
    VCardText: { name: 'VCardText', template: '<div><slot /></div>' },
    VRow: { name: 'VRow', template: '<div><slot /></div>' },
    VCol: { name: 'VCol', template: '<div><slot /></div>' },
    VBtn: {
        name: 'VBtn',
        props: ['icon', 'ripple', 'rounded', 'variant', 'size'],
        template: '<button :class="$attrs.class"><slot /></button>',
    },
    VIcon: { name: 'VIcon', props: ['start', 'icon', 'size'], template: '<i><slot /></i>' },
    VMenu: {
        name: 'VMenu',
        props: ['offsetY', 'closeOnContentClick'],
        template: '<div><slot name="activator" :props="{onClick: () => {}}" /><slot /></div>',
    },
    VList: { name: 'VList', props: ['density'], template: '<div><slot /></div>' },
    VListItem: {
        name: 'VListItem',
        props: ['link'],
        template: '<div class="v-list-item"><slot name="prepend" /><slot name="title" /></div>',
    },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

vi.mock('@/components/ui/Panel.vue', () => ({
    default: {
        name: 'Panel',
        props: ['icon', 'title', 'collapsible', 'cardClass'],
        template: '<div :class="cardClass"><slot name="buttons" /><slot /></div>',
    },
}))

vi.mock('@/components/webcams/WebcamWrapper.vue', () => ({
    default: {
        name: 'WebcamWrapper',
        props: ['webcam', 'page'],
        template: '<div class="webcam-wrapper">{{ webcam?.name }}</div>',
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
                view: {
                    webcam: {
                        currentCam: {},
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

describe('WebcamPanel.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockBaseValues.socketIsConnected.value = true
    })

    it('does not render when socket is not connected', () => {
        mockBaseValues.socketIsConnected.value = false

        const store = createStoreWithState()
        const wrapper = mount(WebcamPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key, $route: { fullPath: '/cam' } },
            },
        })

        expect(wrapper.find('.webcam-panel').exists()).toBe(false)
    })

    it('renders panel with webcam-panel class when connected', () => {
        const store = createStoreWithState()
        const wrapper = mount(WebcamPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key, $route: { fullPath: '/cam' } },
            },
        })

        expect(wrapper.find('.webcam-panel').exists()).toBe(true)
    })

    it('shows no-webcam text when webcams list is empty', () => {
        const store = createStoreWithState()
        const wrapper = mount(WebcamPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key, $route: { fullPath: '/cam' } },
            },
        })

        expect(wrapper.text()).toContain('Panels.WebcamPanel.NoWebcam')
    })

    it('renders webcam wrapper when webcams are available', () => {
        const store = createStoreWithState({
            gui: {
                webcams: {
                    webcams: [{ name: 'TestCam', service: 'mjpegstreamer', icon: 'mdiWebcam' }],
                },
            },
        })
        const wrapper = mount(WebcamPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key, $route: { fullPath: '/cam' } },
            },
        })

        expect(wrapper.find('.webcam-wrapper').exists()).toBe(true)
    })

    it('renders webcam name in wrapper', () => {
        const store = createStoreWithState({
            gui: {
                webcams: {
                    webcams: [{ name: 'TestCam', service: 'mjpegstreamer', icon: 'mdiWebcam' }],
                },
            },
        })
        const wrapper = mount(WebcamPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key, $route: { fullPath: '/cam' } },
            },
        })

        expect(wrapper.text()).toContain('TestCam')
    })

    it('renders with current-page prop', () => {
        const store = createStoreWithState({
            gui: {
                webcams: {
                    webcams: [{ name: 'Cam1', service: 'mjpegstreamer', icon: 'mdiWebcam' }],
                },
            },
        })
        const wrapper = mount(WebcamPanel, {
            props: { currentPage: 'page' },
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key, $route: { fullPath: '/cam' } },
            },
        })

        expect(wrapper.find('.webcam-panel').exists()).toBe(true)
        expect(wrapper.text()).toContain('Cam1')
    })
})
