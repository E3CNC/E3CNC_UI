import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MiscellaneousSensor from '@/components/panels/Miscellaneous/MiscellaneousSensor.vue'

vi.mock('vuetify/components', () => ({
    VContainer: { name: 'VContainer', template: '<div class="v-container"><slot /></div>' },
    VRow: { name: 'VRow', template: '<div class="v-row"><slot /></div>' },
    VCol: { name: 'VCol', template: '<div class="v-col"><slot /></div>' },
    VListSubheader: { name: 'VListSubheader', template: '<div class="v-list-subheader"><slot /></div>' },
    VIcon: { name: 'VIcon', props: ['size'], template: '<i class="v-icon"><slot /></i>' },
    VSpacer: { name: 'VSpacer', template: '<span class="v-spacer" />' },
}))

vi.mock('@/plugins/helpers', () => ({
    convertName: (name: string) => `converted-${name}`,
    unitToSymbol: (unit: string) => `symbol-${unit}`,
}))

describe('MiscellaneousSensor.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders the converted name', () => {
        const wrapper = mount(MiscellaneousSensor, {
            props: { name: 'my_sensor', value: 42 },
        })
        expect(wrapper.text()).toContain('converted-my_sensor')
    })

    it('renders the numeric value', () => {
        const wrapper = mount(MiscellaneousSensor, {
            props: { name: 'sensor', value: 123 },
        })
        expect(wrapper.text()).toContain('123')
    })

    it('renders value with unit when unit is provided', () => {
        const wrapper = mount(MiscellaneousSensor, {
            props: { name: 'temp', value: 25.5, unit: '°C' },
        })
        expect(wrapper.text()).toContain('25.5 °C')
    })

    it('renders -- when value is NaN', () => {
        const wrapper = mount(MiscellaneousSensor, {
            props: { name: 'bad', value: NaN },
        })
        expect(wrapper.text()).toContain('--')
    })

    it('renders -- with unit when value is NaN and unit is provided', () => {
        const wrapper = mount(MiscellaneousSensor, {
            props: { name: 'bad', value: NaN, unit: 'V' },
        })
        expect(wrapper.text()).toContain('-- V')
    })

    it('renders value without unit when unit is empty string', () => {
        const wrapper = mount(MiscellaneousSensor, {
            props: { name: 'test', value: 99, unit: '' },
        })
        expect(wrapper.text()).toContain('99')
        expect(wrapper.text()).not.toContain('undefined')
    })

    it('renders the unit symbol via unitToSymbol', () => {
        const wrapper = mount(MiscellaneousSensor, {
            props: { name: 'temp', value: 30, unit: '°C' },
        })
        expect(wrapper.text()).toContain('symbol-°C')
    })
})
