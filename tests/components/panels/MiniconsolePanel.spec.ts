import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import MiniconsolePanel from '@/components/panels/MiniconsolePanel.vue'

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
        klipperState: new MockRef('ready'),
        moonrakerComponents: new MockRef([]),
    }
})

const mockConsoleValues = vi.hoisted(() => {
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
        direction: new MockRef('table'),
        autoscroll: new MockRef(true),
        hideWaitTemperatures: new MockRef(false),
        hideTlCommands: new MockRef(false),
        rawOutput: new MockRef(false),
        customFilters: new MockRef([]),
        toggleFilter: vi.fn(),
        clearConsole: vi.fn(),
        setAutoscroll: vi.fn(),
        setHideWaitTemperatures: vi.fn(),
        setHideTlCommands: vi.fn(),
        setRawOutput: vi.fn(),
    }
})

vi.mock('@/composables/useBase', () => ({
    useBase: () => mockBaseValues,
}))

vi.mock('@/composables/useConsole', () => ({
    useConsole: () => ({
        consoleDirection: mockConsoleValues.direction,
        hideWaitTemperatures: mockConsoleValues.hideWaitTemperatures,
        setHideWaitTemperatures: mockConsoleValues.setHideWaitTemperatures,
        hideTlCommands: mockConsoleValues.hideTlCommands,
        setHideTlCommands: mockConsoleValues.setHideTlCommands,
        customFilters: mockConsoleValues.customFilters,
        autoscroll: mockConsoleValues.autoscroll,
        setAutoscroll: mockConsoleValues.setAutoscroll,
        rawOutput: mockConsoleValues.rawOutput,
        setRawOutput: mockConsoleValues.setRawOutput,
        toggleFilter: mockConsoleValues.toggleFilter,
        clearConsole: mockConsoleValues.clearConsole,
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
        props: ['icon', 'ripple', 'rounded'],
        template: '<button :class="$attrs.class" @click="$attrs.onClick || $attrs.click"><slot /></button>',
    },
    VIcon: { name: 'VIcon', props: ['start', 'icon'], template: '<i><slot /></i>' },
    VMenu: {
        name: 'VMenu',
        props: ['offsetY', 'closeOnContentClick', 'title'],
        template: '<div class="v-menu"><slot /><slot name="activator" /></div>',
    },
    VList: { name: 'VList', template: '<div><slot /></div>' },
    VListItem: { name: 'VListItem', props: ['class'], template: '<div :class="$attrs.class"><slot /></div>' },
    VCheckbox: {
        name: 'VCheckbox',
        props: ['modelValue', 'hideDetails', 'label', 'class'],
        template:
            '<label class="v-checkbox"><input type="checkbox" :checked="modelValue" /><span>{{ label }}</span></label>',
    },
    VDivider: { name: 'VDivider', template: '<hr />' },
    VToolbar: {
        name: 'VToolbar',
        inheritAttrs: false,
        template: '<div :class="$attrs.class" :style="$attrs.style"><slot /></div>',
    },
    VToolbarTitle: { name: 'VToolbarTitle', template: '<span><slot /></span>' },
    VToolbarItems: { name: 'VToolbarItems', template: '<div><slot /></div>' },
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
        props: ['icon', 'title', 'collapsible', 'cardClass', 'hideButtonsOnCollapse'],
        template: '<div :class="cardClass"><slot name="buttons" /><slot /></div>',
    },
}))
vi.mock('@/components/console/ConsoleTable.vue', () => ({
    default: {
        name: 'ConsoleTable',
        props: ['events', 'isMini'],
        template: '<div class="console-table">{{ events?.length }} events</div>',
    },
}))
vi.mock('@/components/console/CommandHelpModal.vue', () => ({
    default: {
        name: 'CommandHelpModal',
        props: ['inToolbar'],
        template: '<div class="command-help-modal">Help</div>',
        emits: ['on-command'],
    },
}))
vi.mock('@/components/inputs/ConsoleTextarea.vue', () => ({
    default: {
        name: 'ConsoleTextarea',
        template: '<textarea class="console-textarea"></textarea>',
        methods: { setGcode: vi.fn() },
    },
}))
vi.mock('overlayscrollbars-vue', () => ({
    OverlayScrollbarsComponent: {
        name: 'OverlayScrollbarsComponent',
        props: ['options', 'style'],
        template: '<div :style="style" class="os-component"><slot /></div>',
        methods: { osInstance: () => ({ scroll: vi.fn() }) },
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
            },
            printer: {
                print_stats: { state: 'standby' },
                idle_timeout: { state: 'Idle' },
                toolhead: { homed_axes: 'xyz' },
            },
            gui: {
                console: {
                    direction: 'table',
                    height: 300,
                    ...(overrides.gui?.console || {}),
                },
                dashboard: {
                    nonExpandPanels: { mobile: [], tablet: [], desktop: [], widescreen: [] },
                    floatingPanels: {},
                },
                general: { printername: 'Test' },
                control: {},
                uiSettings: {},
                navigationSettings: { entries: [] },
                gcodehistory: { entries: [] },
            },
            files: {},
            instancesDB: 'moonraker',
            ...overrides,
        },
        getters: {
            'socket/getUrl': () => '//localhost:8080',
            'socket/getHostUrl': () => '//localhost:8080',
            'server/getConsoleEvents': () => (filterM117: boolean, limit: number) => [],
            'gui/getPanelExpand': () => () => true,
            ...(overrides.getters || {}),
        },
    })
}

describe('MiniconsolePanel.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockBaseValues.socketIsConnected.value = true
        mockBaseValues.klipperState.value = 'ready'
    })

    it('renders nothing when socket is not connected', () => {
        mockBaseValues.socketIsConnected.value = false

        const store = createStoreWithState()
        const wrapper = mount(MiniconsolePanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.miniconsole-panel').exists()).toBe(false)
    })

    it('renders nothing when klipper state is disconnected', () => {
        mockBaseValues.klipperState.value = 'disconnected'

        const store = createStoreWithState()
        const wrapper = mount(MiniconsolePanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.miniconsole-panel').exists()).toBe(false)
    })

    it('renders panel with console components when connected', () => {
        const store = createStoreWithState()
        const wrapper = mount(MiniconsolePanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.find('.miniconsole-panel').exists()).toBe(true)
        expect(wrapper.find('.console-table').exists()).toBe(true)
        expect(wrapper.find('.console-textarea').exists()).toBe(true)
        expect(wrapper.find('.command-help-modal').exists()).toBe(true)
        expect(wrapper.find('.os-component').exists()).toBe(true)
    })

    it('calls clearConsole when trash button is clicked', async () => {
        const store = createStoreWithState()
        const wrapper = mount(MiniconsolePanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        // Find all buttons
        const buttons = wrapper.findAll('button')
        // Click the first button (trash/clear - no conditional)
        if (buttons.length > 0) {
            await buttons[0].trigger('click')
        }

        expect(mockConsoleValues.clearConsole).toHaveBeenCalled()
    })
})
