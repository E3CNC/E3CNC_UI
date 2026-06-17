import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import HtmlIframe from '@/components/webcams/streamers/HtmlIframe.vue'

const mockConvertUrl = vi.fn((url: string, _printerUrl: string | null) => url)
const mockGetWrapperStyle = vi.fn(() => ({}))
const mockGenerateTransform = vi.fn(() => 'none')

vi.mock('@/composables/useWebcam', () => ({
    useWebcam: () => ({
        convertUrl: mockConvertUrl,
        getWrapperStyle: mockGetWrapperStyle,
        generateTransform: mockGenerateTransform,
    }),
}))

function createCamSettings(overrides: Record<string, any> = {}) {
    return {
        name: 'Test Webcam',
        stream_url: 'http://camera.local/stream',
        aspect_ratio: null,
        rotation: 0,
        flip_horizontal: false,
        flip_vertical: false,
        ...overrides,
    }
}

describe('HtmlIframe.vue', () => {
    it('renders without crashing', () => {
        const wrapper = mount(HtmlIframe, {
            props: {
                camSettings: createCamSettings(),
            },
        })
        expect(wrapper.exists()).toBe(true)
    })

    it('renders an iframe element', () => {
        const wrapper = mount(HtmlIframe, {
            props: {
                camSettings: createCamSettings(),
            },
        })
        const iframe = wrapper.find('iframe')
        expect(iframe.exists()).toBe(true)
    })

    it('iframe has correct src URL', () => {
        const wrapper = mount(HtmlIframe, {
            props: {
                camSettings: createCamSettings(),
            },
        })
        const iframe = wrapper.find('iframe')
        expect(iframe.attributes('src')).toBe('http://camera.local/stream')
    })

    it('has webcamBackground and webcamImage classes', () => {
        const wrapper = mount(HtmlIframe, {
            props: {
                camSettings: createCamSettings(),
            },
        })
        expect(wrapper.classes()).toContain('webcamBackground')
        expect(wrapper.find('iframe').classes()).toContain('webcamImage')
    })

    it('calls convertUrl with stream_url and printerUrl', () => {
        const printerUrl = 'http://printer.local'
        const wrapper = mount(HtmlIframe, {
            props: {
                camSettings: createCamSettings(),
                printerUrl,
            },
        })
        expect(mockConvertUrl).toHaveBeenCalledWith('http://camera.local/stream', printerUrl)
    })

    it('iframe has correct title attribute from camSettings.name', () => {
        const wrapper = mount(HtmlIframe, {
            props: {
                camSettings: createCamSettings({ name: 'My Webcam' }),
            },
        })
        const iframe = wrapper.find('iframe')
        expect(iframe.attributes('title')).toBe('My Webcam')
    })
})
