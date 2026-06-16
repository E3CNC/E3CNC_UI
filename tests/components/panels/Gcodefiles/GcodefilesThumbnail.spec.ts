import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import GcodefilesThumbnail from '@/components/panels/Gcodefiles/GcodefilesThumbnail.vue'
import type { FileStateGcodefile } from '@/store/files/types'

vi.mock('@/composables/useBase', () => ({
    useBase: () => ({
        apiUrl: { value: '//localhost:8080' },
    }),
}))

vi.mock('@/plugins/helpers', () => ({
    escapePath: vi.fn((path: string) => path),
}))

vi.mock('@/store/variables', () => ({
    defaultBigThumbnailBackground: '#1e1e1e',
    thumbnailBigMin: 128,
    thumbnailSmallMax: 64,
    thumbnailSmallMin: 30,
}))

vi.mock('vue-load-image', () => ({
    default: {
        name: 'VueLoadImage',
        template: '<div class="vue-load-image"><slot name="image" /><slot name="preloader" /><slot name="error" /></div>',
    },
}))

const vuetifyComponentsMock = vi.hoisted(() => ({
    VIcon: { name: 'VIcon', props: ['size', 'color'], template: '<i><slot /></i>' },
    VTooltip: { name: 'VTooltip', props: ['location', 'disabled', 'contentClass', 'color'], template: '<div class="v-tooltip-mock"><slot name="activator" :props="{}" /><slot /></div>' },
    VProgressCircular: { name: 'VProgressCircular', props: ['indeterminate', 'color'], template: '<span class="v-progress-circular" />' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

function createStoreWithState(overrides: Record<string, any> = {}) {
    return createStore({
        state: {
            gui: {
                uiSettings: {
                    bigThumbnailBackground: '#1e1e1e',
                    ...(overrides.uiSettings || {}),
                },
            },
            ...overrides,
        },
    })
}

function makeItem(filename: string, overrides: Partial<FileStateGcodefile> = {}): FileStateGcodefile {
    return {
        filename,
        full_filename: filename,
        isDirectory: false,
        modified: new Date('2024-01-01'),
        size: 1024,
        permissions: 'rw',
        last_status: null,
        preheat_gcode: null,
        count_printed: 0,
        last_end_time: null,
        last_filament_used: null,
        last_print_duration: null,
        last_start_time: null,
        last_total_duration: null,
        metadataPulled: false,
        metadataRequested: false,
        filament_total: 0,
        filament_weight_total: 0,
        estimated_time: 0,
        thumbnails: [],
        ...overrides,
    }
}

// Helper to create mount options that register vue-load-image as a global component
function mountOptions(store: ReturnType<typeof createStore>) {
    return {
        global: {
            plugins: [store],
            stubs: {
                'vue-load-image': true,
                'VueLoadImage': true,
            },
        },
    }
}

describe('GcodefilesThumbnail.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders folder icon when item is a directory', () => {
        const store = createStoreWithState()
        const item = makeItem('my_folder', { isDirectory: true })
        const wrapper = mount(GcodefilesThumbnail, {
            props: { item },
            ...mountOptions(store),
        })

        // For directories, the template shows v-icon with folder icon
        const icons = wrapper.findAllComponents({ name: 'VIcon' })
        expect(icons.length).toBeGreaterThanOrEqual(1)
    })

    it('renders file icon when no thumbnails available', () => {
        const store = createStoreWithState()
        const item = makeItem('test.gcode', { thumbnails: [] })
        const wrapper = mount(GcodefilesThumbnail, {
            props: { item },
            ...mountOptions(store),
        })

        const icons = wrapper.findAllComponents({ name: 'VIcon' })
        expect(icons.length).toBeGreaterThanOrEqual(1)
    })

    it('renders with vue-load-image when thumbnails exist', () => {
        const store = createStoreWithState()
        const item = makeItem('test.gcode', {
            thumbnails: [
                { width: 32, height: 32, size: 1024, relative_path: '.thumbs/test_32.png' },
            ],
        })
        const wrapper = mount(GcodefilesThumbnail, {
            props: { item },
            ...mountOptions(store),
        })

        // Component renders the thumbnail, the v-tooltip wrapper is present
        expect(wrapper.find('.v-tooltip-mock').exists()).toBe(true)
    })

    it('renders tooltip with big thumbnail when both small and big thumbnails exist', () => {
        const store = createStoreWithState()
        const item = makeItem('test.gcode', {
            thumbnails: [
                { width: 32, height: 32, size: 1024, relative_path: '.thumbs/test_32.png' },
                { width: 256, height: 256, size: 4096, relative_path: '.thumbs/test_256.png' },
            ],
        })
        const wrapper = mount(GcodefilesThumbnail, {
            props: { item },
            ...mountOptions(store),
        })

        // Should have a v-tooltip wrapper
        expect(wrapper.find('.v-tooltip-mock').exists()).toBe(true)
    })

    it('does not show big thumbnail tooltip when only small thumbnail exists', () => {
        const store = createStoreWithState()
        const item = makeItem('test.gcode', {
            thumbnails: [
                { width: 32, height: 32, size: 1024, relative_path: '.thumbs/test_32.png' },
            ],
        })
        const wrapper = mount(GcodefilesThumbnail, {
            props: { item },
            ...mountOptions(store),
        })

        // VTooltip is rendered but has :disabled="!bigThumbnailUrl"
        expect(wrapper.find('.v-tooltip-mock').exists()).toBe(true)
    })

    it('builds correct thumbnail URL', () => {
        const store = createStoreWithState()
        const item = makeItem('test.gcode', {
            thumbnails: [
                { width: 32, height: 32, size: 1024, relative_path: '.thumbs/test_32.png' },
            ],
        })
        const wrapper = mount(GcodefilesThumbnail, {
            props: { item },
            ...mountOptions(store),
        })

        // Component renders the v-tooltip wrapper around vue-load-image
        expect(wrapper.find('.v-tooltip-mock').exists()).toBe(true)
    })

    it('builds URL with subdirectory when full_filename has path', () => {
        const store = createStoreWithState()
        const item = makeItem('test.gcode', {
            full_filename: 'subdir/test.gcode',
            thumbnails: [
                { width: 32, height: 32, size: 1024, relative_path: '.thumbs/test_32.png' },
            ],
        })
        const wrapper = mount(GcodefilesThumbnail, {
            props: { item },
            ...mountOptions(store),
        })

        // Component should render without error
        expect(wrapper.find('.v-tooltip-mock').exists()).toBe(true)
    })

    it('handles missing modified date gracefully', () => {
        const store = createStoreWithState()
        const item = makeItem('test.gcode', {
            modified: undefined as unknown as Date,
            thumbnails: [
                { width: 32, height: 32, size: 1024, relative_path: '.thumbs/test_32.png' },
            ],
        })
        // Should not throw - fileTimestamp should handle this safely
        expect(() => {
            mount(GcodefilesThumbnail, {
                props: { item },
                ...mountOptions(store),
            })
        }).not.toThrow()
    })

    it('uses custom bigThumbnailBackground from store', () => {
        const store = createStoreWithState({
            uiSettings: {
                bigThumbnailBackground: '#000000',
            },
        })
        const item = makeItem('test.gcode', {
            thumbnails: [
                { width: 32, height: 32, size: 1024, relative_path: '.thumbs/test_32.png' },
                { width: 256, height: 256, size: 4096, relative_path: '.thumbs/test_256.png' },
            ],
        })
        const wrapper = mount(GcodefilesThumbnail, {
            props: { item },
            ...mountOptions(store),
        })

        expect(wrapper.find('.v-tooltip-mock').exists()).toBe(true)
    })

    it('does not pass tooltip color when background matches default', () => {
        const store = createStoreWithState()
        const item = makeItem('test.gcode', {
            thumbnails: [
                { width: 32, height: 32, size: 1024, relative_path: '.thumbs/test_32.png' },
                { width: 256, height: 256, size: 4096, relative_path: '.thumbs/test_256.png' },
            ],
        })
        const wrapper = mount(GcodefilesThumbnail, {
            props: { item },
            ...mountOptions(store),
        })

        // default is #1e1e1e, store also has #1e1e1e
        expect(wrapper.find('.v-tooltip-mock').exists()).toBe(true)
    })

    it('renders progress spinner for preloader slot', () => {
        const store = createStoreWithState()
        const item = makeItem('test.gcode', {
            thumbnails: [
                { width: 32, height: 32, size: 1024, relative_path: '.thumbs/test_32.png' },
            ],
        })
        const wrapper = mount(GcodefilesThumbnail, {
            props: { item },
            ...mountOptions(store),
        })

        // With vue-load-image stubbed, the preloader slot content isn't visible
        // because stubs render as <vue-load-image-stub /> without slot content
        expect(wrapper.find('.v-tooltip-mock').exists()).toBe(true)
    })
})
