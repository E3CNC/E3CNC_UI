import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import AboutDialog from '@/components/dialogs/AboutDialog.vue'

// Mock Vuetify 3 components
const vuetifyComponentsMock = vi.hoisted(() => ({
    VTooltip: {
        name: 'VTooltip',
        props: ['location', 'color'],
        template: '<div class="v-tooltip"><slot name="activator" /><slot /></div>',
    },
    VIcon: {
        name: 'VIcon',
        props: { size: String },
        template: '<i class="v-icon"><slot /></i>',
    },
    VContainer: {
        name: 'VContainer',
        template: '<div><slot /></div>',
    },
    VImg: {
        name: 'VImg',
        props: { height: [String, Number], src: String },
        template: '<img :src="src" :height="height" />',
    },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

function createStoreWithState(overrides: Record<string, any> = {}) {
    return createStore({
        state: {
            packageVersion: '2.17.0',
            socket: { isConnected: false, initializationList: [], loadings: [] },
            server: {
                klippy_connected: true,
                klippy_state: 'ready',
                components: [],
                moonraker_version: 'v0.9.2-123',
            },
            printer: {
                print_stats: { state: 'ready' },
                idle_timeout: { state: 'Idle' },
                toolhead: { homed_axes: 'xyz' },
                software_version: 'v0.12.0-456',
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

describe('AboutDialog.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders the tooltip activator icon', () => {
        const store = createStoreWithState()
        const wrapper = mount(AboutDialog, {
            global: { plugins: [store] },
        })

        expect(wrapper.findComponent({ name: 'v-icon' }).exists()).toBe(true)
    })

    it('displays Mainsail version from store state', () => {
        const store = createStoreWithState()
        const wrapper = mount(AboutDialog, {
            global: { plugins: [store] },
        })

        expect(wrapper.text()).toContain('2.17.0')
    })

    it('displays different Mainsail version when store value changes', () => {
        const store = createStoreWithState({ packageVersion: '3.0.0-beta' })
        const wrapper = mount(AboutDialog, {
            global: { plugins: [store] },
        })

        expect(wrapper.text()).toContain('3.0.0-beta')
    })

    it('displays Moonraker version from server store', () => {
        const store = createStoreWithState()
        const wrapper = mount(AboutDialog, {
            global: { plugins: [store] },
        })

        expect(wrapper.text()).toContain('v0.9.2-123')
    })

    it('displays Klipper version from printer store', () => {
        const store = createStoreWithState()
        const wrapper = mount(AboutDialog, {
            global: { plugins: [store] },
        })

        expect(wrapper.text()).toContain('v0.12.0-456')
    })

    it('handles empty software_version gracefully', () => {
        const store = createStoreWithState({
            printer: {
                print_stats: { state: 'ready' },
                idle_timeout: { state: 'Idle' },
                toolhead: { homed_axes: 'xyz' },
                software_version: '',
            },
        })
        const wrapper = mount(AboutDialog, {
            global: { plugins: [store] },
        })

        // Should not throw, component renders without klipper version
        expect(wrapper.exists()).toBe(true)
    })

    it('renders the klipper logo image', () => {
        const store = createStoreWithState()
        const wrapper = mount(AboutDialog, {
            global: { plugins: [store] },
        })

        const klipperImg = wrapper.find('.klipper-logo')
        expect(klipperImg.exists()).toBe(true)
        expect(klipperImg.attributes('src')).toContain('/img/klipper.svg')
    })

    it('renders the mainsail logo image', () => {
        const store = createStoreWithState()
        const wrapper = mount(AboutDialog, {
            global: { plugins: [store] },
        })

        const mainsailImg = wrapper.find('img[alt="mainsail-logo"]')
        expect(mainsailImg.exists()).toBe(true)
        // The src may be resolved by vite to a data URI; just verify it's set
        expect(mainsailImg.attributes('src')).toBeTruthy()
    })
})
