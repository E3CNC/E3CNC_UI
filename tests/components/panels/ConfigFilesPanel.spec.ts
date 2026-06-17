import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import ConfigFilesPanel from '@/components/panels/Machine/ConfigFilesPanel.vue'

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
        apiUrl: new MockRef('//localhost:8080'),
        isMobile: new MockRef(false),
        formatDateTime: new MockRef((d: Date) => d.toISOString()),
    }
})

vi.mock('@/composables/useBase', () => ({
    useBase: () => mockBaseValues,
}))

vi.mock('@/composables/useSocket', () => ({
    useSocket: () => ({
        emit: vi.fn(),
    }),
}))

vi.mock('@/composables/useTheme', () => ({
    useTheme: () => ({
        machineButtonCol: { value: 'primary' },
    }),
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}))

vi.mock('vue-toast-notification', () => ({
    useToast: () => vi.fn(),
}))

vi.mock('axios', () => ({
    default: {
        CancelToken: { source: () => ({ token: {}, cancel: vi.fn() }) },
    },
}))

const vuetifyComponentsMock = vi.hoisted(() => ({
    VCardText: { name: 'VCardText', template: '<div><slot /></div>' },
    VRow: { name: 'VRow', template: '<div><slot /></div>' },
    VCol: { name: 'VCol', template: '<div><slot /></div>' },
    VSelect: {
        name: 'VSelect',
        props: ['modelValue', 'items', 'label', 'variant', 'hideDetails', 'density', 'attach'],
        template:
            '<select :value="modelValue"><option v-for="item in items" :key="item" :value="item">{{ item }}</option></select>',
    },
    VBtn: {
        name: 'VBtn',
        props: ['icon', 'rounded', 'variant', 'color', 'density', 'loading', 'disabled'],
        template: '<button :class="$attrs.class" @click="$attrs.onClick || $attrs.click"><slot /></button>',
    },
    VIcon: { name: 'VIcon', props: ['size', 'start', 'color'], template: '<i><slot /></i>' },
    VTooltip: { name: 'VTooltip', props: ['top'], template: '<div><slot name="activator" /><slot /></div>' },
    VMenu: {
        name: 'VMenu',
        props: ['offsetY', 'left', 'title', 'positionX', 'positionY', 'absolute', 'modelValue'],
        template: '<div class="v-menu"><slot /><slot name="activator" /></div>',
    },
    VList: { name: 'VList', template: '<div><slot /></div>' },
    VListItem: { name: 'VListItem', props: ['class'], template: '<div :class="$attrs.class"><slot /></div>' },
    VCheckbox: {
        name: 'VCheckbox',
        props: ['modelValue', 'hideDetails', 'label', 'class'],
        template: '<label><input type="checkbox" :checked="modelValue" /><span>{{ label }}</span></label>',
    },
    VDataTable: {
        name: 'VDataTable',
        props: ['items', 'headers', 'modelValue'],
        template:
            '<div class="v-data-table"><slot name="no-data" /><slot name="item" /><slot name="header.filename" /><slot name="header.size" /><slot name="header.modified" /><slot name="header.filetype" /><slot name="body.prepend" /></div>',
    },
    VSpacer: { name: 'VSpacer', template: '<span style="flex:1" />' },
    VDivider: { name: 'VDivider', template: '<hr />' },
    VDialog: {
        name: 'VDialog',
        props: ['modelValue', 'maxWidth', 'fullscreen', 'hideOverlay'],
        template: '<div v-if="modelValue" class="v-dialog"><slot /></div>',
    },
    VTextField: {
        name: 'VTextField',
        props: ['modelValue', 'label', 'required', 'rules'],
        template: '<input :value="modelValue" />',
    },
    VCardActions: { name: 'VCardActions', template: '<div><slot /></div>' },
    VAlert: {
        name: 'VAlert',
        props: ['density', 'variant', 'type', 'icon', 'elevation', 'maxWidth'],
        template: '<div class="v-alert"><slot /></div>',
    },
    VSnackbar: {
        name: 'VSnackbar',
        props: ['modelValue', 'timeout', 'location'],
        template: '<div v-if="modelValue" class="v-snackbar"><slot /><slot name="actions" /></div>',
    },
    VProgressLinear: { name: 'VProgressLinear', props: ['modelValue'], template: '<div class="v-progress-linear" />' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)
vi.mock('@/components/ui/Panel.vue', () => ({
    default: {
        name: 'Panel',
        props: ['icon', 'title', 'collapsible', 'cardClass', 'marginBottom'],
        template: '<div :class="cardClass"><slot name="buttons" /><slot /></div>',
    },
}))
vi.mock('@/components/ui/PathNavigation.vue', () => ({
    default: {
        name: 'PathNavigation',
        props: ['path', 'baseDirectoryLabel', 'onSegmentClick'],
        template: '<div class="path-nav">{{ path }}</div>',
    },
}))
vi.mock('@/components/dialogs/ConfirmationDialog.vue', () => ({
    default: {
        name: 'ConfirmationDialog',
        props: ['modelValue', 'title', 'text', 'actionButtonText'],
        template: '<div v-if="modelValue" class="confirmation-dialog">{{ title }}: {{ text }}</div>',
        emits: ['action'],
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
                registered_directories: ['config'],
                ...(overrides.server || {}),
            },
            printer: {
                print_stats: { state: 'standby' },
                idle_timeout: { state: 'Idle' },
                toolhead: { homed_axes: 'xyz' },
            },
            gui: {
                view: {
                    configfiles: {
                        rootPath: 'config',
                        currentPath: '',
                        selectedFiles: [],
                        countPerPage: 10,
                        showHiddenFiles: false,
                        hideBackupFiles: false,
                        sortBy: 'filename',
                        sortDesc: false,
                    },
                    blockFileUpload: false,
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
            'files/getDirectory': () => () => ({
                childrens: [],
                disk_usage: { used: 1000, free: 9000, total: 10000 },
                permissions: 'rw',
            }),
            ...(overrides.getters || {}),
        },
    })
}

describe('ConfigFilesPanel.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders panel with title and root select', () => {
        const store = createStoreWithState()
        const wrapper = mount(ConfigFilesPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
                stubs: {
                    'v-data-table': true,
                    'v-select': true,
                },
            },
        })

        expect(wrapper.find('.machine-configfiles-panel').exists()).toBe(true)
    })

    it('warns when config root is missing', () => {
        const store = createStoreWithState({
            server: {
                klippy_connected: true,
                klippy_state: 'ready',
                components: [],
                registered_directories: [],
            },
        })
        const wrapper = mount(ConfigFilesPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        expect(wrapper.text()).toContain('Machine.ConfigFilesPanel.ConfigRootDirectoryDoesntExists')
    })

    it('renders panel structure', () => {
        const store = createStoreWithState()
        const wrapper = mount(ConfigFilesPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
                stubs: { 'v-data-table': true },
            },
        })

        expect(wrapper.find('.machine-configfiles-panel').exists()).toBe(true)
    })
})
