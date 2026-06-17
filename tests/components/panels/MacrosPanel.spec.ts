import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import MacrosPanel from '@/components/panels/MacrosPanel.vue'

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
        klipperReadyForGui: new MockRef(true),
    }
})

vi.mock('@/composables/useBase', () => ({
    useBase: () => mockBaseValues,
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'Panels.MacrosPanel.Headline': 'Macros',
            }
            return translations[key] ?? key
        },
    }),
}))

const vuetifyComponentsMock = vi.hoisted(() => ({
    VCardText: { name: 'VCardText', template: '<div><slot /></div>' },
    VRow: { name: 'VRow', template: '<div><slot /></div>' },
    VCol: { name: 'VCol', template: '<div><slot /></div>' },
    VToolbar: {
        name: 'VToolbar',
        inheritAttrs: false,
        template: '<div :class="$attrs.class" :style="$attrs.style"><slot /></div>',
    },
    VToolbarTitle: { name: 'VToolbarTitle', template: '<span><slot /></span>' },
    VToolbarItems: { name: 'VToolbarItems', template: '<div><slot /></div>' },
    VIcon: { name: 'VIcon', props: ['start', 'icon'], template: '<i><slot /></i>' },
    VBtn: { name: 'VBtn', props: ['icon', 'ripple'], template: '<button><slot /></button>' },
    VSpacer: { name: 'VSpacer', template: '<span style="flex:1" />' },
    VExpandTransition: { name: 'VExpandTransition', template: '<div><slot /></div>' },
    VCard: {
        name: 'VCard',
        inheritAttrs: false,
        template: '<div :class="$attrs.class" :style="$attrs.style"><slot /></div>',
    },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)
vi.mock('@/components/ui/Panel.vue', () => ({
    default: {
        name: 'Panel',
        props: ['icon', 'title', 'collapsible', 'cardClass'],
        template: '<div :class="cardClass"><slot /></div>',
    },
}))
vi.mock('@/components/inputs/MacroButton.vue', () => ({
    default: {
        name: 'MacroButton',
        props: ['macro', 'color'],
        template: '<button class="macro-btn">{{ macro?.name }}</button>',
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
                macros: {
                    hiddenMacros: [],
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
            'printer/getMacros': () => [{ name: 'START_PRINT' }, { name: 'END_PRINT' }, { name: 'CANCEL_PRINT' }],
            'gui/getPanelExpand': () => () => true,
            ...(overrides.getters || {}),
        },
    })
}

describe('MacrosPanel.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockBaseValues.klipperReadyForGui.value = true
    })

    it('renders nothing when klipper is not ready', () => {
        mockBaseValues.klipperReadyForGui.value = false

        const store = createStoreWithState()
        const wrapper = mount(MacrosPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.macros-panel').exists()).toBe(false)
    })

    it('renders nothing when there are no macros', () => {
        const store = createStoreWithState({
            getters: {
                'printer/getMacros': () => [],
                'gui/getPanelExpand': () => () => true,
            },
        })
        const wrapper = mount(MacrosPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.macros-panel').exists()).toBe(false)
    })

    it('renders panel with macro buttons when klipper is ready and macros exist', () => {
        const store = createStoreWithState()
        const wrapper = mount(MacrosPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.macros-panel').exists()).toBe(true)
        const macroBtns = wrapper.findAll('.macro-btn')
        expect(macroBtns).toHaveLength(3)
        expect(macroBtns[0].text()).toBe('START_PRINT')
        expect(macroBtns[1].text()).toBe('END_PRINT')
        expect(macroBtns[2].text()).toBe('CANCEL_PRINT')
    })

    it('filters out hidden macros', () => {
        const store = createStoreWithState({
            gui: {
                macros: {
                    hiddenMacros: ['END_PRINT'],
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
        const wrapper = mount(MacrosPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        const macroBtns = wrapper.findAll('.macro-btn')
        expect(macroBtns).toHaveLength(2)
        expect(macroBtns[0].text()).toBe('START_PRINT')
        expect(macroBtns[1].text()).toBe('CANCEL_PRINT')
    })
})
