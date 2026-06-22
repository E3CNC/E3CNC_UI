import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import MoonrakerSensorValue from '@/components/panels/Miscellaneous/MoonrakerSensorValue.vue'

vi.mock('vuetify/components', () => ({
    VIcon: { name: 'VIcon', props: ['size'], template: '<i class="v-icon"><slot /></i>' },
    VSpacer: { name: 'VSpacer', template: '<span class="v-spacer" />' },
}))

vi.mock('@/plugins/helpers', () => ({
    convertName: (name: string) => `cnv-${name}`,
    unitToSymbol: (unit: string) => `sym-${unit}`,
}))

function createStoreWithState(serverOverrides: Record<string, any> = {}) {
    return createStore({
        state: {
            server: {
                sensor: {
                    sensors: {
                        my_sensor: {
                            friendly_name: 'My Sensor',
                            values: { temperature: 25.567, humidity: 60 },
                        },
                        ...(serverOverrides.sensors || {}),
                    },
                },
                config: {
                    config: {
                        'sensor my_sensor': {
                            parameter_temperature: { units: '°C' },
                            parameter_humidity: { units: '%' },
                        },
                        ...(serverOverrides.config || {}),
                    },
                },
            },
        },
    })
}

describe('MoonrakerSensorValue.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders the converted value name', () => {
        const store = createStoreWithState()
        const wrapper = mount(MoonrakerSensorValue, {
            props: { sensor: 'my_sensor', valueName: 'temperature' },
            global: { plugins: [store] },
        })
        expect(wrapper.text()).toContain('cnv-temperature')
    })

    it('renders value with rounded precision (3 decimals)', () => {
        const store = createStoreWithState()
        const wrapper = mount(MoonrakerSensorValue, {
            props: { sensor: 'my_sensor', valueName: 'temperature' },
            global: { plugins: [store] },
        })
        expect(wrapper.text()).toContain('25.567 °C')
    })

    it('renders value with unit symbol', () => {
        const store = createStoreWithState()
        const wrapper = mount(MoonrakerSensorValue, {
            props: { sensor: 'my_sensor', valueName: 'temperature' },
            global: { plugins: [store] },
        })
        expect(wrapper.text()).toContain('sym-°C')
    })

    it('renders -- when valueName does not exist in sensor data', () => {
        const store = createStoreWithState()
        const wrapper = mount(MoonrakerSensorValue, {
            props: { sensor: 'my_sensor', valueName: 'nonexistent' },
            global: { plugins: [store] },
        })
        expect(wrapper.text()).toContain('--')
    })

    it('renders value without unit when no unit config', () => {
        const store = createStoreWithState({
            sensors: {
                raw_sensor: {
                    friendly_name: 'Raw',
                    values: { reading: 42 },
                },
            },
            config: {},
        })
        const wrapper = mount(MoonrakerSensorValue, {
            props: { sensor: 'raw_sensor', valueName: 'reading' },
            global: { plugins: [store] },
        })
        expect(wrapper.text()).toContain('42')
        expect(wrapper.text()).not.toContain('undefined')
    })

    it('handles missing sensor gracefully', () => {
        const store = createStoreWithState()
        const wrapper = mount(MoonrakerSensorValue, {
            props: { sensor: 'nonexistent', valueName: 'temp' },
            global: { plugins: [store] },
        })
        expect(wrapper.text()).toContain('--')
    })

    it('renders rounded humidity value', () => {
        const store = createStoreWithState()
        const wrapper = mount(MoonrakerSensorValue, {
            props: { sensor: 'my_sensor', valueName: 'humidity' },
            global: { plugins: [store] },
        })
        expect(wrapper.text()).toContain('60 %')
    })
})
