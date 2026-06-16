import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import { createI18n } from 'vue-i18n'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'

vi.mock('@/composables/useBase', () => ({
    useBase: () => ({
        isMobile: { value: false },
    }),
}))

// Mock Vuetify 3 components — each component exposes its own `props` so vue-test-utils can
// see them, and the template renders props as data- attributes for easy assertions.
const vuetifyComponentsMock = vi.hoisted(() => ({
    VDialog: {
        name: 'VDialog',
        props: { modelValue: Boolean, width: [String, Number], fullscreen: Boolean },
        template: '<div v-if="modelValue" :data-width="width" :data-fullscreen="fullscreen"><slot /></div>',
    },
    VCard: { name: 'VCard', inheritAttrs: false, template: '<div><slot /></div>' },
    VCardText: { name: 'VCardText', template: '<div><slot /></div>' },
    VCardActions: { name: 'VCardActions', template: '<div><slot /></div>' },
    VBtn: {
        name: 'VBtn',
        props: { icon: Boolean, variant: String, color: String },
        template: '<button :data-color="color" :data-variant="variant" @click="$emit(\'click\', $event)"><slot /></button>',
    },
    VSpacer: { name: 'VSpacer', template: '<span />' },
    VIcon: { name: 'VIcon', props: { start: Boolean, icon: String }, template: '<i><slot /></i>' },
    VToolbar: { name: 'VToolbar', inheritAttrs: false, template: '<div><slot /></div>' },
    VToolbarTitle: { name: 'VToolbarTitle', template: '<span><slot /></span>' },
    VToolbarItems: { name: 'VToolbarItems', template: '<div><slot /></div>' },
    VExpandTransition: { name: 'VExpandTransition', template: '<div><slot /></div>' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

// Mock Panel to render its title prop in the slot so it appears in wrapper.text()
vi.mock('@/components/ui/Panel.vue', () => ({
    default: {
        name: 'Panel',
        props: { title: String, icon: String, cardClass: String, marginBottom: Boolean },
        template: '<div :class="cardClass" :data-title="title" :data-icon="icon"><slot name="buttons" /><slot /></div>',
    },
}))

const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: {
        en: {
            Buttons: { Cancel: 'Cancel' },
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

describe('ConfirmationDialog.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders nothing when modelValue is false', () => {
        const store = createStoreWithState()
        const wrapper = mount(ConfirmationDialog, {
            props: {
                modelValue: false,
                title: 'Delete?',
                text: 'Are you sure?',
                actionButtonText: 'Delete',
            },
            global: { plugins: [store, i18n] },
        })

        expect(wrapper.find('.confirm-top-corner-menu-dialog').exists()).toBe(false)
    })

    it('renders title, text, and action button when modelValue is true', () => {
        const store = createStoreWithState()
        const wrapper = mount(ConfirmationDialog, {
            props: {
                modelValue: true,
                title: 'Confirm Action',
                text: 'Are you sure?',
                actionButtonText: 'Delete',
            },
            global: { plugins: [store, i18n] },
        })

        expect(wrapper.text()).toContain('Are you sure?')
        expect(wrapper.text()).toContain('Delete')
        expect(wrapper.text()).toContain('Cancel')
    })

    it('shows cancel button text from cancelButtonText prop', () => {
        const store = createStoreWithState()
        const wrapper = mount(ConfirmationDialog, {
            props: {
                modelValue: true,
                title: 'Delete?',
                text: 'Are you sure?',
                actionButtonText: 'Delete',
                cancelButtonText: 'Keep',
            },
            global: { plugins: [store, i18n] },
        })

        expect(wrapper.text()).toContain('Keep')
    })

    it('shows translated Cancel when no cancelButtonText prop is given', () => {
        const store = createStoreWithState()
        const wrapper = mount(ConfirmationDialog, {
            props: {
                modelValue: true,
                title: 'Delete?',
                text: 'Are you sure?',
                actionButtonText: 'Delete',
            },
            global: { plugins: [store, i18n] },
        })

        expect(wrapper.text()).toContain('Cancel')
    })

    it('passes actionButtonColor to the action button', () => {
        const store = createStoreWithState()
        const wrapper = mount(ConfirmationDialog, {
            props: {
                modelValue: true,
                title: 'Confirm',
                text: 'Proceed?',
                actionButtonText: 'OK',
                actionButtonColor: 'primary',
            },
            global: { plugins: [store, i18n] },
        })

        const buttons = wrapper.findAll('button')
        const lastBtn = buttons[buttons.length - 1]
        expect(lastBtn.attributes('data-color')).toBe('primary')
    })

    it('uses error as the default action button color', () => {
        const store = createStoreWithState()
        const wrapper = mount(ConfirmationDialog, {
            props: {
                modelValue: true,
                title: 'Delete?',
                text: 'Are you sure?',
                actionButtonText: 'Delete',
            },
            global: { plugins: [store, i18n] },
        })

        const buttons = wrapper.findAll('button')
        const lastBtn = buttons[buttons.length - 1]
        expect(lastBtn.attributes('data-color')).toBe('error')
    })

    it('emits action on action button click and closes dialog', async () => {
        const store = createStoreWithState()
        const wrapper = mount(ConfirmationDialog, {
            props: {
                modelValue: true,
                title: 'Delete?',
                text: 'Are you sure?',
                actionButtonText: 'Delete',
            },
            global: { plugins: [store, i18n] },
        })

        // Find the action button by its text content
        const actionBtn = wrapper.findAll('button').filter(
            (b) => b.text() === 'Delete'
        )
        expect(actionBtn).toHaveLength(1)
        await actionBtn[0].trigger('click')

        // The action emits once; update:modelValue also emits once when dialog closes
        expect(wrapper.emitted('action')?.length).toBeGreaterThanOrEqual(1)
        expect(wrapper.emitted('update:modelValue')?.length).toBeGreaterThanOrEqual(1)
        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    })

    it('closes dialog via close button without emitting action', async () => {
        const store = createStoreWithState()
        const wrapper = mount(ConfirmationDialog, {
            props: {
                modelValue: true,
                title: 'Delete?',
                text: 'Are you sure?',
                actionButtonText: 'Delete',
            },
            global: { plugins: [store, i18n] },
        })

        // The first button is the close (X) button in the #buttons slot
        const buttons = wrapper.findAll('button')
        const closeBtn = buttons[0]
        await closeBtn.trigger('click')

        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
        expect(wrapper.emitted('action')).toBeUndefined()
    })

    it('closes dialog via cancel button without emitting action', async () => {
        const store = createStoreWithState()
        const wrapper = mount(ConfirmationDialog, {
            props: {
                modelValue: true,
                title: 'Delete?',
                text: 'Are you sure?',
                actionButtonText: 'Delete',
            },
            global: { plugins: [store, i18n] },
        })

        const buttons = wrapper.findAll('button')
        // Cancel button is second-to-last
        const cancelBtn = buttons[buttons.length - 2]
        await cancelBtn.trigger('click')

        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
        expect(wrapper.emitted('action')).toBeUndefined()
    })
})
