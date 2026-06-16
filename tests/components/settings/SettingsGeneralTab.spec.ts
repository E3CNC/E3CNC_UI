import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import { createI18n } from 'vue-i18n'
import SettingsGeneralTab from '@/components/settings/SettingsGeneralTab.vue'

// Mock composables
vi.mock('@/composables/useBase', () => ({
    useBase: () => ({
        browserLocale: { value: 'en-US' },
        formatDate: (date: Date, format: string | null) => {
            if (format === null) return date.toLocaleDateString('en-US', { dateStyle: 'medium' })
            if (format === 'short') return date.toLocaleDateString('en-US', { dateStyle: 'short' })
            return date.toLocaleDateString('en-US')
        },
    }),
}))

vi.mock('@/composables/useSettingsDatabase', () => ({
    useSettingsDatabase: () => ({}),
}))

// Mock child components
vi.mock('@/components/settings/SettingsRow.vue', () => ({
    default: {
        name: 'SettingsRow',
        props: {
            title: { required: true },
            subTitle: { default: null },
            dynamicSlotWidth: { default: false },
        },
        template: '<div class="settings-row">{{ title }}<slot /></div>',
    },
}))

vi.mock('@/components/settings/General/GeneralBackup.vue', () => ({
    default: {
        name: 'SettingsGeneralTabBackupDatabase',
        template: '<span class="backup-database">Backup</span>',
    },
}))

vi.mock('@/components/settings/General/GeneralRestore.vue', () => ({
    default: {
        name: 'SettingsGeneralTabRestoreDatabase',
        template: '<span class="restore-database">Restore</span>',
    },
}))

vi.mock('@/components/settings/General/GeneralReset.vue', () => ({
    default: {
        name: 'SettingsGeneralTabResetDatabase',
        template: '<span class="reset-database">Reset</span>',
    },
}))

const vuetifyComponentsMock = vi.hoisted(() => ({
    VCard: { name: 'VCard', inheritAttrs: false, template: '<div><slot /></div>' },
    VCardText: { name: 'VCardText', template: '<div><slot /></div>' },
    VDivider: { name: 'VDivider', template: '<hr class="v-divider" />' },
    VTextField: {
        name: 'VTextField',
        props: ['modelValue', 'hideDetails', 'variant', 'density'],
        template: '<input :value="modelValue" class="v-text-field" />',
    },
    VSelect: {
        name: 'VSelect',
        props: ['modelValue', 'items', 'itemTitle', 'itemValue', 'multiple', 'hideDetails', 'density', 'variant'],
        template: '<select class="v-select" :value="modelValue"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.text }}</option></select>',
    },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: {
        en: {
            Settings: {
                GeneralTab: {
                    PrinterName: 'Printer Name',
                    Language: 'Language',
                    DateFormat: 'Date Format',
                    TimeFormat: 'Time Format',
                    CalcPrintProgress: 'Calculate Print Progress',
                    CalcPrintProgressDescription: 'Description',
                    CalcEtaTime: 'Calculate ETA Time',
                    CalcEtaTimeDescription: 'ETA Description',
                    MainsailSettingsMoonrakerDb: 'Database Settings',
                    FactoryReset: 'Factory Reset',
                    '24hours': '24 hours ({time})',
                    '12hours': '12 hours ({time})',
                    CalcPrintProgressItems: {
                        FileRelative: 'File Relative',
                        FileAbsolute: 'File Absolute',
                        Slicer: 'Slicer',
                    },
                    EstimateValues: {
                        File: 'File',
                        Slicer: 'Slicer',
                    },
                },
            },
        },
    },
})

function createStoreWithState(overrides: Record<string, any> = {}) {
    return createStore({
        state: {
            socket: { isConnected: false, initializationList: [], loadings: [] },
            server: { klippy_connected: true, klippy_state: 'ready', components: [] },
            printer: {
                print_stats: { state: 'ready' },
                idle_timeout: { state: 'Idle' },
                toolhead: { homed_axes: 'xyz' },
            },
            gui: {
                dashboard: {},
                general: {
                    printername: 'My Printer',
                    language: 'en',
                    dateFormat: null,
                    timeFormat: null,
                    calcPrintProgress: 'file-relative',
                    calcEtaTime: ['file'],
                },
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
            ...(overrides.getters || {}),
        },
    })
}

describe('SettingsGeneralTab.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders the printer name setting row', () => {
        const store = createStoreWithState()
        const wrapper = mount(SettingsGeneralTab, {
            global: { plugins: [store, i18n] },
        })

        expect(wrapper.text()).toContain('Printer Name')
    })

    it('renders the language setting row', () => {
        const store = createStoreWithState()
        const wrapper = mount(SettingsGeneralTab, {
            global: { plugins: [store, i18n] },
        })

        expect(wrapper.text()).toContain('Language')
    })

    it('renders the date format setting row', () => {
        const store = createStoreWithState()
        const wrapper = mount(SettingsGeneralTab, {
            global: { plugins: [store, i18n] },
        })

        expect(wrapper.text()).toContain('Date Format')
    })

    it('renders the time format setting row', () => {
        const store = createStoreWithState()
        const wrapper = mount(SettingsGeneralTab, {
            global: { plugins: [store, i18n] },
        })

        expect(wrapper.text()).toContain('Time Format')
    })

    it('renders the calculation progress setting', () => {
        const store = createStoreWithState()
        const wrapper = mount(SettingsGeneralTab, {
            global: { plugins: [store, i18n] },
        })

        expect(wrapper.text()).toContain('Calculate Print Progress')
    })

    it('renders the ETA time setting', () => {
        const store = createStoreWithState()
        const wrapper = mount(SettingsGeneralTab, {
            global: { plugins: [store, i18n] },
        })

        expect(wrapper.text()).toContain('Calculate ETA Time')
    })

    it('renders the database settings section', () => {
        const store = createStoreWithState()
        const wrapper = mount(SettingsGeneralTab, {
            global: { plugins: [store, i18n] },
        })

        expect(wrapper.find('.settings-row').exists()).toBe(true)
    })

    it('renders with text field for printer name', () => {
        const store = createStoreWithState()
        const wrapper = mount(SettingsGeneralTab, {
            global: { plugins: [store, i18n] },
        })

        expect(wrapper.find('.v-text-field').exists()).toBe(true)
    })

    it('renders select elements for dropdown settings', () => {
        const store = createStoreWithState()
        const wrapper = mount(SettingsGeneralTab, {
            global: { plugins: [store, i18n] },
        })

        const selects = wrapper.findAll('.v-select')
        expect(selects.length).toBeGreaterThanOrEqual(3)
    })

    it('renders without errors with default store state', () => {
        const store = createStoreWithState()
        const wrapper = mount(SettingsGeneralTab, {
            global: { plugins: [store, i18n] },
        })

        expect(wrapper.exists()).toBe(true)
    })
})
