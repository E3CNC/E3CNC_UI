import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createStore } from 'vuex'
import MiscellaneousLight from '@/components/panels/Miscellaneous/MiscellaneousLight.vue'

function createStoreWithConfig(configOverrides: Record<string, any> = {}, printerOverrides: Record<string, any> = {}) {
    return createStore({
        state: {
            printer: {
                configfile: {
                    settings: {
                        'led my_light': {
                            red_pin: 'PA0',
                        },
                        ...configOverrides,
                    },
                },
                'led my_light': {
                    color_data: [[1]],
                },
                ...printerOverrides,
            },
        },
    })
}

describe('MiscellaneousLight.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders MiscellaneousSlider for single-channel LED', () => {
        const store = createStoreWithConfig()
        const wrapper = shallowMount(MiscellaneousLight, {
            props: { type: 'led', name: 'my_light' },
            global: { plugins: [store] },
        })

        const slider = wrapper.findComponent({ name: 'MiscellaneousSlider' })
        expect(slider.exists()).toBe(true)
        expect(slider.props('name')).toBe('my_light')
        expect(slider.props('type')).toBe('led')
    })

    it('renders MiscellaneousLightNeopixel for multi-channel LED', () => {
        const store = createStoreWithConfig({
            'led rgb_light': {
                red_pin: 'PA0',
                green_pin: 'PA1',
                blue_pin: 'PA2',
            },
        })
        const wrapper = shallowMount(MiscellaneousLight, {
            props: { type: 'led', name: 'rgb_light' },
            global: {
                plugins: [store],
                stubs: { 'miscellaneous-light-neopixel': true },
            },
        })

        const neopixel = wrapper.findComponent({ name: 'MiscellaneousLightNeopixel' })
        expect(neopixel.exists()).toBe(true)
    })

    it('renders MiscellaneousLightNeopixel for non-led types (neopixel)', () => {
        const store = createStoreWithConfig({
            'neopixel my_strip': {
                color_order: ['GRB'],
            },
        })
        const wrapper = shallowMount(MiscellaneousLight, {
            props: { type: 'neopixel', name: 'my_strip' },
            global: {
                plugins: [store],
                stubs: { 'miscellaneous-light-neopixel': true },
            },
        })

        const neopixel = wrapper.findComponent({ name: 'MiscellaneousLightNeopixel' })
        expect(neopixel.exists()).toBe(true)
    })

    it('passes correct target to slider for single red-channel LED', () => {
        const store = createStoreWithConfig(
            {
                'led red_light': {
                    red_pin: 'PB0',
                },
            },
            {
                'led red_light': {
                    color_data: [[1]],
                },
            }
        )
        const wrapper = shallowMount(MiscellaneousLight, {
            props: { type: 'led', name: 'red_light' },
            global: { plugins: [store] },
        })

        const slider = wrapper.findComponent({ name: 'MiscellaneousSlider' })
        expect(slider.props('target')).toBe(1)
        expect(slider.props('colorOrder')).toBe('R')
    })
})
