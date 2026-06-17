import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import TemperaturePanelSettings from '@/components/panels/Temperature/TemperaturePanelSettings.vue'

// Mock Vuetify components — keep templates simple
vi.mock('vuetify/components', () => ({
    VMenu: {
        name: 'VMenu',
        props: { offsetY: Boolean, closeOnContentClick: Boolean, title: String },
        template:
            '<div class="v-menu-wrap"><slot name="activator" :props=\'{ onClick: () => true }\' /><div class="v-menu-content"><slot /></div></div>',
    },
    VBtn: {
        name: 'VBtn',
        props: { icon: Boolean, rounded: String },
        template: '<button class="v-btn" @click="$emit(\'click\', $event)"><slot /></button>',
    },
    VList: {
        name: 'VList',
        template: '<div class="v-list"><slot /></div>',
    },
    VListItem: {
        name: 'VListItem',
        template: '<div class="v-list-item"><slot /></div>',
    },
    VCheckbox: {
        name: 'VCheckbox',
        props: ['modelValue', 'label', 'hideDetails'],
        template:
            '<label class="v-checkbox"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', ($event.target).checked)" /><span>{{ label }}</span></label>',
    },
}))

describe('TemperaturePanelSettings.vue', () => {
    let store: ReturnType<typeof createStore>

    beforeEach(() => {
        store = createStore({
            state: {
                gui: {
                    view: {
                        tempchart: {
                            boolTempchart: false,
                            autoscale: false,
                            hideMcuHostSensors: false,
                            hideMonitors: false,
                        },
                    },
                },
            },
            getters: {},
        })
    })

    it('renders a menu activator button with cog icon', () => {
        const wrapper = mount(TemperaturePanelSettings, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })
        expect(wrapper.find('.v-btn').exists()).toBe(true)
    })

    it('renders four checkbox settings', () => {
        const wrapper = mount(TemperaturePanelSettings, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })
        const checkboxes = wrapper.findAll('.v-checkbox')
        expect(checkboxes.length).toBe(4)
    })

    it('dispatches gui/saveSetting when toggling boolTempchart', async () => {
        const dispatchSpy = vi.fn()
        store.dispatch = dispatchSpy

        const wrapper = mount(TemperaturePanelSettings, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        const checkboxes = wrapper.findAll('.v-checkbox input')
        await checkboxes[0].setValue(true)

        expect(dispatchSpy).toHaveBeenCalledWith('gui/saveSetting', {
            name: 'view.tempchart.boolTempchart',
            value: true,
        })
    })

    it('dispatches gui/saveSetting when toggling autoscaleTempchart', async () => {
        const dispatchSpy = vi.fn()
        store.dispatch = dispatchSpy

        const wrapper = mount(TemperaturePanelSettings, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        const checkboxes = wrapper.findAll('.v-checkbox input')
        await checkboxes[3].setValue(true)

        expect(dispatchSpy).toHaveBeenCalledWith('gui/saveSetting', {
            name: 'view.tempchart.autoscale',
            value: true,
        })
    })

    it('dispatches gui/saveSetting when toggling hideMcuHostSensors', async () => {
        const dispatchSpy = vi.fn()
        store.dispatch = dispatchSpy

        const wrapper = mount(TemperaturePanelSettings, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        const checkboxes = wrapper.findAll('.v-checkbox input')
        await checkboxes[1].setValue(true)

        expect(dispatchSpy).toHaveBeenCalledWith('gui/saveSetting', {
            name: 'view.tempchart.hideMcuHostSensors',
            value: true,
        })
    })

    it('dispatches gui/saveSetting when toggling hideMonitors', async () => {
        const dispatchSpy = vi.fn()
        store.dispatch = dispatchSpy

        const wrapper = mount(TemperaturePanelSettings, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        const checkboxes = wrapper.findAll('.v-checkbox input')
        await checkboxes[2].setValue(true)

        expect(dispatchSpy).toHaveBeenCalledWith('gui/saveSetting', {
            name: 'view.tempchart.hideMonitors',
            value: true,
        })
    })

    it('reflects current boolTempchart state', () => {
        store.state.gui.view.tempchart.boolTempchart = true

        const wrapper = mount(TemperaturePanelSettings, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })

        const checkboxes = wrapper.findAll('.v-checkbox input')
        expect((checkboxes[0].element as HTMLInputElement).checked).toBe(true)
    })
})
