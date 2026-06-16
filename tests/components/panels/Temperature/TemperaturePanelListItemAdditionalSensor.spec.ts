import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import TemperaturePanelListItemAdditionalSensor from '@/components/panels/Temperature/TemperaturePanelListItemAdditionalSensor.vue'

// Mock child component
vi.mock('@/components/panels/Temperature/TemperaturePanelListItemAdditionalSensorValue.vue', () => ({
    default: {
        name: 'TemperaturePanelListItemAdditionalSensorValue',
        props: ['printerObject', 'objectName', 'keyName'],
        template: '<div class="mock-additional-sensor-value" :data-key-name="keyName">{{ keyName }}: {{ printerObject?.[keyName] }}</div>',
    },
}))

describe('TemperaturePanelListItemAdditionalSensor.vue', () => {
    let store: ReturnType<typeof createStore>

    beforeEach(() => {
        store = createStore({
            state: {
                printer: {
                    'bme280 nozzle': {
                        temperature: 25.5,
                        pressure: 1013.0,
                        humidity: 45.0,
                    },
                },
            },
        })
    })

    it('renders additional values for a sensor (excluding temperature)', () => {
        const wrapper = mount(TemperaturePanelListItemAdditionalSensor, {
            props: {
                objectName: 'extruder',
                additionalObjectName: 'bme280 nozzle',
            },
            global: {
                plugins: [store],
            },
        })

        const values = wrapper.findAll('.mock-additional-sensor-value')
        // Should render pressure and humidity (not temperature)
        expect(values.length).toBe(2)
        expect(values[0].attributes('data-key-name')).toBe('pressure')
        expect(values[1].attributes('data-key-name')).toBe('humidity')
    })

    it('renders current_z_adjust for z_thermal_adjust', () => {
        store.state.printer = {
            z_thermal_adjust: {
                temperature: 30.0,
                current_z_adjust: 0.025,
            },
        }

        const wrapper = mount(TemperaturePanelListItemAdditionalSensor, {
            props: {
                objectName: 'z_thermal_adjust',
                additionalObjectName: 'z_thermal_adjust',
            },
            global: {
                plugins: [store],
            },
        })

        const values = wrapper.findAll('.mock-additional-sensor-value')
        expect(values.length).toBe(1)
        expect(values[0].attributes('data-key-name')).toBe('current_z_adjust')
    })

    it('renders nothing when additionalObjectName is not in store', () => {
        const wrapper = mount(TemperaturePanelListItemAdditionalSensor, {
            props: {
                objectName: 'extruder',
                additionalObjectName: 'nonexistent_sensor',
            },
            global: {
                plugins: [store],
            },
        })

        const values = wrapper.findAll('.mock-additional-sensor-value')
        expect(values.length).toBe(0)
    })
})
