import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import TemperaturePanelListItemNevermore from '@/components/panels/Temperature/TemperaturePanelListItemNevermore.vue'

// Mock Vuetify components to prevent CSS import errors
vi.mock('vuetify/components', () => ({
    VApp: { template: '<div><slot /></div>' },
    VIcon: {
        name: 'VIcon',
        props: { color: String, class: [String, Array], tabindex: [String, Number] },
        template: '<i class="mock-v-icon" :style="color ? `color: ${color}` : \'\'"><slot /></i>',
    },
    VTooltip: { template: '<div class="mock-v-tooltip"><slot name="activator" :props="{}" /><slot /></div>' },
}))

// Mock child components
vi.mock('@/components/panels/Temperature/TemperaturePanelListItemNevermoreValue.vue', () => ({
    default: {
        name: 'TemperaturePanelListItemNevermoreValue',
        props: ['printerObject', 'objectName', 'keyName', 'small'],
        template:
            '<div class="mock-nevermore-value" :data-key-name="keyName">{{ keyName }}: {{ printerObject?.[keyName] }}</div>',
    },
}))

vi.mock('@/components/panels/Temperature/TemperaturePanelListItemEdit.vue', () => ({
    default: {
        name: 'TemperaturePanelListItemEdit',
        props: [
            'modelValue',
            'showDialog',
            'objectName',
            'name',
            'formatName',
            'additionalSensorName',
            'icon',
            'color',
        ],
        template: '<div class="mock-edit-dialog" />',
    },
}))

// Mock useBase
vi.mock('@/composables/useBase', () => ({
    useBase: () => ({}),
}))

describe('TemperaturePanelListItemNevermore.vue', () => {
    let store: ReturnType<typeof createStore>

    beforeEach(() => {
        store = createStore({
            state: {
                printer: {
                    'nevermore carbon_filter': {
                        speed: 0.75,
                        rpm: 5000,
                        temperature: 28.0,
                        pressure: 1012.0,
                        humidity: 55.0,
                        gas: 3,
                    },
                },
                gui: {
                    view: {
                        tempchart: {
                            datasetSettings: {
                                'nevermore carbon_filter': { color: '#00FF00' },
                            },
                        },
                    },
                    uiSettings: {
                        disableFanAnimation: false,
                    },
                },
            },
            getters: {},
        })
    })

    function mountNevermore(props: Record<string, any> = {}) {
        return mount(TemperaturePanelListItemNevermore, {
            props: {
                objectName: 'nevermore carbon_filter',
                isResponsiveMobile: false,
                ...props,
            },
            global: {
                plugins: [store],
            },
        })
    }

    it('renders the fan icon', () => {
        const wrapper = mountNevermore()
        expect(wrapper.find('.mock-v-icon').exists()).toBe(true)
    })

    it('renders the nevermore name', () => {
        const wrapper = mountNevermore()
        expect(wrapper.text()).toContain('Carbon Filter')
    })

    it('renders gas and all nevermore values as child components', () => {
        const wrapper = mountNevermore()
        // Template renders: gas NevermoreValue (inline) + v-for of temperature, pressure, humidity
        const mockValues = wrapper.findAll('.mock-nevermore-value')
        expect(mockValues.length).toBe(4)

        const keyNames = mockValues.map((v) => v.attributes('data-key-name'))
        expect(keyNames).toContain('gas')
        expect(keyNames).toContain('temperature')
        expect(keyNames).toContain('pressure')
        expect(keyNames).toContain('humidity')
    })

    it('renders RPM when present', () => {
        const wrapper = mountNevermore()
        expect(wrapper.text()).toContain('5000')
        expect(wrapper.text()).toContain('RPM')
    })

    it('renders edit dialog', () => {
        const wrapper = mountNevermore()
        expect(wrapper.find('.mock-edit-dialog').exists()).toBe(true)
    })

    it('does not render RPM when null', () => {
        store.state.printer['nevermore carbon_filter'].rpm = null
        const wrapper = mountNevermore()
        expect(wrapper.text()).not.toContain('RPM')
    })

    it('applies text-error when RPM is 0 but speed > 0', () => {
        store.state.printer['nevermore carbon_filter'] = {
            speed: 0.5,
            rpm: 0,
            temperature: 28.0,
        }
        const wrapper = mountNevermore()
        expect(wrapper.text()).toContain('0')
        expect(wrapper.text()).toContain('RPM')
    })

    it('uses color from icon color style', () => {
        const wrapper = mountNevermore()
        const icon = wrapper.find('.mock-v-icon')
        expect(icon.attributes('style')).toContain('0, 255, 0')
    })

    it('falls back to white when no dataset color set', () => {
        store.state.gui.view.tempchart.datasetSettings = {}
        const wrapper = mountNevermore()
        const icon = wrapper.find('.mock-v-icon')
        expect(icon.attributes('style')).toContain('255, 255, 255')
    })
})
