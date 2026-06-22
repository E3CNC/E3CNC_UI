import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import MoonrakerSensor from '@/components/panels/Miscellaneous/MoonrakerSensor.vue'

vi.mock('vuetify/components', () => ({
    VContainer: { name: 'VContainer', template: '<div class="v-container"><slot /></div>' },
    VRow: { name: 'VRow', template: '<div class="v-row"><slot /></div>' },
    VCol: { name: 'VCol', template: '<div class="v-col"><slot /></div>' },
    VListSubheader: { name: 'VListSubheader', template: '<div class="v-list-subheader"><slot /></div>' },
}))

vi.mock('@/components/panels/Miscellaneous/MoonrakerSensorValue.vue', () => ({
    default: {
        name: 'MoonrakerSensorValue',
        props: ['sensor', 'valueName'],
        template: '<div class="moonraker-sensor-value-stub">{{ sensor }}.{{ valueName }}</div>',
    },
}))

vi.mock('@/plugins/helpers', () => ({
    convertName: (name: string) => `converted-${name}`,
}))

function createStoreWithState(serverOverrides: Record<string, any> = {}) {
    return createStore({
        state: {
            server: {
                sensor: {
                    sensors: {
                        my_sensor: {
                            friendly_name: 'My Custom Sensor',
                            values: { temperature: 25.5, humidity: 60 },
                        },
                        name_only: {
                            friendly_name: 'name_only',
                            values: { value: 42 },
                        },
                        ...(serverOverrides.sensors || {}),
                    },
                },
            },
        },
    })
}

describe('MoonrakerSensor.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders the friendly_name when different from sensor name', () => {
        const store = createStoreWithState()
        const wrapper = mount(MoonrakerSensor, {
            props: { name: 'my_sensor' },
            global: { plugins: [store] },
        })
        expect(wrapper.text()).toContain('My Custom Sensor')
    })

    it('renders converted name when friendly_name equals sensor name', () => {
        const store = createStoreWithState()
        const wrapper = mount(MoonrakerSensor, {
            props: { name: 'name_only' },
            global: { plugins: [store] },
        })
        expect(wrapper.text()).toContain('converted-name_only')
    })

    it('renders converted name when sensor is not in store', () => {
        const store = createStoreWithState()
        const wrapper = mount(MoonrakerSensor, {
            props: { name: 'unknown_sensor' },
            global: { plugins: [store] },
        })
        expect(wrapper.text()).toContain('converted-unknown_sensor')
    })

    it('renders MoonrakerSensorValue for each value', () => {
        const store = createStoreWithState()
        const wrapper = mount(MoonrakerSensor, {
            props: { name: 'my_sensor' },
            global: { plugins: [store] },
        })
        const values = wrapper.findAllComponents({ name: 'MoonrakerSensorValue' })
        expect(values).toHaveLength(2)
        expect(values[0].props('sensor')).toBe('my_sensor')
        expect(values[0].props('valueName')).toBe('temperature')
        expect(values[1].props('valueName')).toBe('humidity')
    })
})
