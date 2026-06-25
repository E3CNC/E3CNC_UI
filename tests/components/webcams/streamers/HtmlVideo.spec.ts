import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import HtmlVideo from '@/components/webcams/streamers/HtmlVideo.vue'

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
        hostUrl: new MockRef(new URL('http://localhost:8080')),
        apiUrl: new MockRef('http://localhost:8080'),
    }
})

const mockWebcamFunctions = vi.hoisted(() => ({
    convertUrl: vi.fn((streamUrl: string) => streamUrl),
    getWrapperStyle: vi.fn(() => ({})),
    generateTransform: vi.fn(() => 'none'),
    updateAspectRatioFromVideo: vi.fn(() => null),
}))

vi.mock('@/composables/useWebcam', () => ({
    useWebcam: () => ({
        socketIsConnected: mockBaseValues.socketIsConnected,
        hostUrl: mockBaseValues.hostUrl,
        apiUrl: mockBaseValues.apiUrl,
        convertUrl: mockWebcamFunctions.convertUrl,
        convertWebcamIcon: vi.fn(),
        getWrapperStyle: mockWebcamFunctions.getWrapperStyle,
        generateTransform: mockWebcamFunctions.generateTransform,
        updateAspectRatioFromVideo: mockWebcamFunctions.updateAspectRatioFromVideo,
        updateAspectRatioFromImage: vi.fn(),
    }),
}))

vi.mock('@/composables/useBase', () => ({
    useBase: () => ({
        socketIsConnected: mockBaseValues.socketIsConnected,
        hostUrl: mockBaseValues.hostUrl,
        apiUrl: mockBaseValues.apiUrl,
    }),
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}))

function createCamSettings(overrides: Record<string, any> = {}) {
    return {
        name: 'Test Cam',
        service: 'html-video' as const,
        enabled: true,
        icon: 'mdiWebcam',
        target_fps: 15,
        stream_url: 'http://camera.local/video',
        snapshot_url: 'http://camera.local/snapshot',
        flip_horizontal: false,
        flip_vertical: false,
        rotation: 0,
        ...overrides,
    }
}

describe('HtmlVideo.vue', () => {
    it('renders without crashing', () => {
        const wrapper = mount(HtmlVideo, {
            props: {
                camSettings: createCamSettings(),
            },
        })

        expect(wrapper.exists()).toBe(true)
    })

    it('renders a video element', () => {
        const wrapper = mount(HtmlVideo, {
            props: {
                camSettings: createCamSettings(),
            },
        })

        const video = wrapper.find('video')
        expect(video.exists()).toBe(true)
    })

    it('video has the correct src URL', () => {
        const streamUrl = 'http://camera.local/video'
        const wrapper = mount(HtmlVideo, {
            props: {
                camSettings: createCamSettings({ stream_url: streamUrl }),
            },
        })

        const video = wrapper.find('video')
        expect(video.attributes('src')).toBe(streamUrl)
        expect(mockWebcamFunctions.convertUrl).toHaveBeenCalledWith(streamUrl, null)
    })

    it('has webcamBackground and webcamImage classes', () => {
        const wrapper = mount(HtmlVideo, {
            props: {
                camSettings: createCamSettings(),
            },
        })

        expect(wrapper.find('.webcamBackground').exists()).toBe(true)
        expect(wrapper.find('.webcamImage').exists()).toBe(true)
    })

    it('calls onLoadedMetadata when video metadata loads', async () => {
        const wrapper = mount(HtmlVideo, {
            props: {
                camSettings: createCamSettings(),
            },
        })

        const video = wrapper.find('video')
        await video.trigger('loadedmetadata')
        expect(mockWebcamFunctions.updateAspectRatioFromVideo).toHaveBeenCalled()
    })
})
