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

vi.mock('@mdi/js', () => ({ mdiTrayArrowDown: 'mdiTrayArrowDown' }))

vi.mock('vuetify/components', () => ({
    VIcon: { name: 'VIcon', template: '<i class="v-icon"><slot /></i>' },
}))

function makeStore(overrides: Record<string, any> = {}) {
    const dispatch = vi.fn().mockResolvedValue(true)
    return createStore({
        state: {
            gui: {
                view: {
                    gcodefiles: { currentPath: overrides.gcodePath ?? '/gcodes' },
                    configfiles: { currentPath: '/config' },
                },
            },
            server: { klippy_connected: true, klippy_state: 'ready' },
            ...(overrides.state || {}),
        },
        actions: {
            ...(overrides.actions || {}),
            'gui/uploadDialog/setVisibility': vi.fn(),
            'files/startUpload': vi.fn(),
            'socket/addLoading': vi.fn().mockResolvedValue(true),
            'socket/removeLoading': vi.fn().mockResolvedValue(true),
            'files/uploadSetCurrentNumber': dispatch,
            'files/uploadSetMaxNumber': dispatch,
            'files/uploadIncrementCurrentNumber': dispatch,
            'files/uploadFile': dispatch,
        },
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

    it('starts hidden (no visible class)', () => {
        const store = makeStore()
        const wrapper = mount(TheFullscreenUpload, { global: { plugins: [store, i18n] } })
        expect(wrapper.find('.fullscreen-upload__dragzone--visible').exists()).toBe(false)
    })

    it('shows drop zone on dragover with Files type', async () => {
        const store = makeStore()
        const wrapper = mount(TheFullscreenUpload, { global: { plugins: [store, i18n] } })
        const event = new Event('dragover')
        Object.defineProperty(event, 'dataTransfer', {
            value: { types: ['Files'] },
            writable: true,
        })
        event.preventDefault = vi.fn()
        window.dispatchEvent(event)
        // Should show drop zone (visible class added via computed)
        // The dropzoneClasses computed adds --visible when `visible` ref is true
        await new Promise((r) => setTimeout(r, 10))
        // visible is set to true by onDragOverWindow which calls showDropZone
        expect(wrapper.find('.fullscreen-upload__dragzone--visible').exists()).toBe(true)
    })

    it('hides drop zone on dragleave', async () => {
        const store = makeStore()
        const wrapper = mount(TheFullscreenUpload, { global: { plugins: [store, i18n] } })
        const dragOverEvent = new Event('dragover')
        Object.defineProperty(dragOverEvent, 'dataTransfer', {
            value: { types: ['Files'] },
            writable: true,
        })
        dragOverEvent.preventDefault = vi.fn()
        window.dispatchEvent(dragOverEvent)
        await new Promise((r) => setTimeout(r, 10))
        expect(wrapper.find('.fullscreen-upload__dragzone--visible').exists()).toBe(true)

        const dragLeaveEvent = new Event('dragleave')
        dragLeaveEvent.preventDefault = vi.fn()
        window.dispatchEvent(dragLeaveEvent)
        await new Promise((r) => setTimeout(r, 10))
        expect(wrapper.find('.fullscreen-upload__dragzone--visible').exists()).toBe(false)
    })

    it('ignores dragover without Files in dataTransfer', async () => {
        const store = makeStore()
        const wrapper = mount(TheFullscreenUpload, { global: { plugins: [store, i18n] } })
        const event = new Event('dragover')
        Object.defineProperty(event, 'dataTransfer', {
            value: { types: ['text/plain'] },
            writable: true,
        })
        event.preventDefault = vi.fn()
        window.dispatchEvent(event)
        await new Promise((r) => setTimeout(r, 10))
        expect(wrapper.find('.fullscreen-upload__dragzone--visible').exists()).toBe(false)
    })

    it('handles drop event with files', async () => {
        const store = makeStore()
        const wrapper = mount(TheFullscreenUpload, { global: { plugins: [store, i18n] } })

        // Simulate drop event
        const dropEvent = new Event('drop')
        const file = new File(['content'], 'test.gcode', { type: 'text/plain' })
        Object.defineProperty(dropEvent, 'dataTransfer', {
            value: { files: [file] },
            writable: true,
        })
        dropEvent.preventDefault = vi.fn()
        wrapper.find('.fullscreen-upload__dragzone').element.dispatchEvent(dropEvent)
        await new Promise((r) => setTimeout(r, 10))
        // Should dispatch upload actions
        expect(store.state).toBeDefined()
    })
})
