import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import { createI18n } from 'vue-i18n'
import TheFullscreenUpload from '@/components/TheFullscreenUpload.vue'

const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: { en: { FullscreenUpload: { DropFilesToUploadFiles: 'Drop files here' } } },
})

vi.mock('vue-router', () => ({ useRoute: () => ({ path: '/files' }) }))

vi.mock('@/composables/useBase', () => ({
    useBase: () => ({ klipperReadyForGui: { value: true }, printerIsPrinting: { value: false } }),
}))

vi.mock('vuetify/components', () => ({
    VIcon: { name: 'VIcon', template: '<i class="v-icon"><slot /></i>' },
}))

function makeStore(path: string = '/gcodes') {
    return createStore({
        state: {
            gui: {
                view: {
                    gcodefiles: { currentPath: path },
                    configfiles: { currentPath: '/config' },
                },
            },
            server: { klippy_connected: true, klippy_state: 'ready' },
        },
        actions: { 'gui/uploadDialog/setVisibility': vi.fn(), 'files/startUpload': vi.fn() },
    })
}

describe('TheFullscreenUpload.vue', () => {
    beforeEach(() => {
        document.body.classList.remove('fullscreenUpload--active')
    })

    it('mounts without crashing', () => {
        const store = makeStore()
        const wrapper = mount(TheFullscreenUpload, { global: { plugins: [store, i18n] } })
        expect(wrapper.exists()).toBe(true)
    })

    it('renders drop zone text', () => {
        const store = makeStore()
        const wrapper = mount(TheFullscreenUpload, { global: { plugins: [store, i18n] } })
        expect(wrapper.text()).toContain('Drop files here')
    })

    it('renders tray icon', () => {
        const store = makeStore()
        const wrapper = mount(TheFullscreenUpload, { global: { plugins: [store, i18n] } })
        expect(wrapper.find('.v-icon').exists()).toBe(true)
    })

    it('has fullscreen-upload drag zone class', () => {
        const store = makeStore()
        const wrapper = mount(TheFullscreenUpload, { global: { plugins: [store, i18n] } })
        expect(wrapper.find('.fullscreen-upload__dragzone').exists()).toBe(true)
    })
})
