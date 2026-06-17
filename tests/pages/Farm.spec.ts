import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import FarmPage from '@/pages/Farm.vue'

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

vi.mock('@/components/panels/FarmPrinterPanel.vue', () => ({
    default: {
        name: 'FarmPrinterPanel',
        props: ['printer'],
        template: '<div class="farm-printer-panel-stub"><slot /></div>',
    },
}))

function createStoreWithPrinters(printerList: any[] = []) {
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
                },
            },
            files: {},
            instancesDB: 'moonraker',
        },
        getters: {
            'socket/getUrl': () => '//localhost:8080',
            'gui/getPanelExpand': () => () => true,
            'farm/getPrinters': () => printerList,
        },
    })
}

describe('FarmPage.vue', () => {
    it('renders without crashing', () => {
        const store = createStoreWithPrinters()
        const wrapper = mount(FarmPage, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.exists()).toBe(true)
    })

    it('renders nothing when printers list is empty', () => {
        const store = createStoreWithPrinters()
        const wrapper = mount(FarmPage, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        const panels = wrapper.findAllComponents({ name: 'FarmPrinterPanel' })
        expect(panels).toHaveLength(0)
    })

    it('renders farm-printer-panel for each printer', () => {
        const printers = [
            { _namespace: 'printer1', socket: { hostname: 'host1', port: 7125, webPort: 80 } },
            { _namespace: 'printer2', socket: { hostname: 'host2', port: 7125, webPort: 80 } },
            { _namespace: 'printer3', socket: { hostname: 'host3', port: 7125, webPort: 80 } },
        ]
        const store = createStoreWithPrinters(printers)
        const wrapper = mount(FarmPage, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        const panels = wrapper.findAllComponents({ name: 'FarmPrinterPanel' })
        expect(panels).toHaveLength(3)

        // Verify each panel receives the correct printer prop
        panels.forEach((panel, index) => {
            expect(panel.props('printer')).toEqual(printers[index])
        })
    })
})
