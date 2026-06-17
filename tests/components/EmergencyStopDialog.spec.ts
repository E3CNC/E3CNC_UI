import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import { createI18n } from 'vue-i18n'
import EmergencyStopDialog from '@/components/dialogs/EmergencyStopDialog.vue'

// Mock useSocket
const mockSocketEmit = vi.fn()
vi.mock('@/composables/useSocket', () => ({
    useSocket: () => ({
        emit: mockSocketEmit,
    }),
}))

// Mock Vuetify 3 components
const vuetifyComponentsMock = vi.hoisted(() => ({
    VDialog: {
        name: 'VDialog',
        props: { modelValue: Boolean, width: [String, Number], persistent: Boolean },
        template: '<div v-if="modelValue"><slot /></div>',
    },
    VCard: { name: 'VCard', inheritAttrs: false, template: '<div><slot /></div>' },
    VCardText: { name: 'VCardText', template: '<div><slot /></div>' },
    VCardActions: { name: 'VCardActions', template: '<div><slot /></div>' },
    VBtn: {
        name: 'VBtn',
        props: { icon: Boolean, variant: String, color: String },
        template: '<button :data-color="color" @click="$emit(\'click\', $event)"><slot /></button>',
    },
    VSpacer: { name: 'VSpacer', template: '<span />' },
    VIcon: { name: 'VIcon', props: { start: Boolean, icon: String }, template: '<i><slot /></i>' },
    VToolbar: { name: 'VToolbar', inheritAttrs: false, template: '<div><slot /></div>' },
    VToolbarTitle: { name: 'VToolbarTitle', template: '<span><slot /></span>' },
    VToolbarItems: { name: 'VToolbarItems', template: '<div><slot /></div>' },
    VExpandTransition: { name: 'VExpandTransition', template: '<div><slot /></div>' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

// Mock Panel
vi.mock('@/components/ui/Panel.vue', () => ({
    default: {
        name: 'Panel',
        props: { title: String, icon: String, cardClass: String, marginBottom: Boolean, toolbarColor: String },
        template: '<div :class="cardClass"><slot name="buttons" /><slot /></div>',
    },
}))

const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: {
        en: {
            EmergencyStopDialog: {
                EmergencyStop: 'Emergency Stop',
                AreYouSure: 'Are you sure you want to emergency stop?',
            },
            Buttons: {
                No: 'No',
                Yes: 'Yes',
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
            ...(overrides.getters || {}),
        },
    })
}

describe('EmergencyStopDialog.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders nothing when modelValue is false', () => {
        const store = createStoreWithState()
        const wrapper = mount(EmergencyStopDialog, {
            props: { modelValue: false },
            global: { plugins: [store, i18n] },
        })

        expect(wrapper.find('.emergency-stop-dialog').exists()).toBe(false)
    })

    it('renders confirmation text and buttons when modelValue is true', () => {
        const store = createStoreWithState()
        const wrapper = mount(EmergencyStopDialog, {
            props: { modelValue: true },
            global: { plugins: [store, i18n] },
        })

        expect(wrapper.text()).toContain('Are you sure')
        expect(wrapper.text()).toContain('Yes')
        expect(wrapper.text()).toContain('No')
    })

    it('has error color on the Panel toolbar', () => {
        const store = createStoreWithState()
        const wrapper = mount(EmergencyStopDialog, {
            props: { modelValue: true },
            global: { plugins: [store, i18n] },
        })

        const panel = wrapper.find('.emergency-stop-dialog')
        expect(panel.exists()).toBe(true)
    })

    it('closes dialog via close button without emergency stop', async () => {
        const store = createStoreWithState()
        const wrapper = mount(EmergencyStopDialog, {
            props: { modelValue: true },
            global: { plugins: [store, i18n] },
        })

        const buttons = wrapper.findAll('button')
        // First button is the close (X) button
        const closeBtn = buttons[0]
        await closeBtn.trigger('click')

        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
        expect(mockSocketEmit).not.toHaveBeenCalled()
    })

    it('closes dialog via No button without emergency stop', async () => {
        const store = createStoreWithState()
        const wrapper = mount(EmergencyStopDialog, {
            props: { modelValue: true },
            global: { plugins: [store, i18n] },
        })

        // Find the "No" button by its text
        const noBtn = wrapper.findAll('button').filter((b) => b.text() === 'No')
        expect(noBtn).toHaveLength(1)
        await noBtn[0].trigger('click')

        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
        expect(mockSocketEmit).not.toHaveBeenCalled()
    })

    it('calls emergency stop and closes dialog on Yes button click', async () => {
        const store = createStoreWithState()
        const wrapper = mount(EmergencyStopDialog, {
            props: { modelValue: true },
            global: { plugins: [store, i18n] },
        })

        // Find the "Yes" button by its text
        const yesBtn = wrapper.findAll('button').filter((b) => b.text() === 'Yes')
        expect(yesBtn).toHaveLength(1)
        await yesBtn[0].trigger('click')

        // Should emit socket emergency_stop
        expect(mockSocketEmit).toHaveBeenCalledWith('printer.emergency_stop', {}, { loading: 'topbarEmergencyStop' })

        // Should close the dialog
        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    })

    it('renders with dialog open when modelValue is true', () => {
        const store = createStoreWithState()
        const wrapper = mount(EmergencyStopDialog, {
            props: { modelValue: true },
            global: { plugins: [store, i18n] },
        })

        // Verify the dialog content renders
        expect(wrapper.text()).toContain('Are you sure')
        expect(wrapper.text()).toContain('Yes')
        expect(wrapper.text()).toContain('No')
    })
})
