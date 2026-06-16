import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import Printstatus from '@/components/panels/Status/Printstatus.vue'

// Mock useBase with a controllable printer_state ref
const mockBaseValues = vi.hoisted(() => {
    class MockRef {
        _value: any
        __v_isRef = true
        __v_isShallow = false
        constructor(val: any) { this._value = val }
        get value() { return this._value }
        set value(v) { this._value = v }
    }
    return {
        printer_state: new MockRef('printing'),
    }
})

vi.mock('@/composables/useBase', () => ({
    useBase: () => ({
        printer_state: mockBaseValues.printer_state,
    }),
}))

vi.mock('@/components/panels/Status/PrintstatusPrinting.vue', () => ({
    default: {
        name: 'StatusPanelPrintstatusPrinting',
        template: '<div class="printstatus-printing">Printing</div>',
    },
}))

vi.mock('@/components/panels/Status/PrintstatusComplete.vue', () => ({
    default: {
        name: 'StatusPanelPrintstatusComplete',
        template: '<div class="printstatus-complete">Complete</div>',
    },
}))

function createStoreWithState(overrides: Record<string, any> = {}) {
    return createStore({
        state: {
            printer: {
                print_stats: { state: 'printing' },
                idle_timeout: { state: 'Printing' },
                ...(overrides.printer || {}),
            },
            ...overrides,
        },
        getters: {
            ...(overrides.getters || {}),
        },
    })
}

describe('Printstatus.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders PrintstatusPrinting when printer_state is printing', () => {
        mockBaseValues.printer_state.value = 'printing'
        const store = createStoreWithState()
        const wrapper = mount(Printstatus, {
            global: { plugins: [store] },
        })
        expect(wrapper.find('.printstatus-printing').exists()).toBe(true)
        expect(wrapper.find('.printstatus-complete').exists()).toBe(false)
    })

    it('renders PrintstatusPrinting when printer_state is paused', () => {
        mockBaseValues.printer_state.value = 'paused'
        const store = createStoreWithState({
            printer: { print_stats: { state: 'paused' }, idle_timeout: { state: 'Printing' } },
        })
        const wrapper = mount(Printstatus, {
            global: { plugins: [store] },
        })
        expect(wrapper.find('.printstatus-printing').exists()).toBe(true)
        expect(wrapper.find('.printstatus-complete').exists()).toBe(false)
    })

    it('renders PrintstatusPrinting when printer_state is error', () => {
        mockBaseValues.printer_state.value = 'error'
        const store = createStoreWithState({
            printer: { print_stats: { state: 'error' }, idle_timeout: { state: 'Idle' } },
        })
        const wrapper = mount(Printstatus, {
            global: { plugins: [store] },
        })
        expect(wrapper.find('.printstatus-printing').exists()).toBe(true)
        expect(wrapper.find('.printstatus-complete').exists()).toBe(false)
    })

    it('renders PrintstatusPrinting when printer_state is cancelled', () => {
        mockBaseValues.printer_state.value = 'cancelled'
        const store = createStoreWithState({
            printer: { print_stats: { state: 'cancelled' }, idle_timeout: { state: 'Idle' } },
        })
        const wrapper = mount(Printstatus, {
            global: { plugins: [store] },
        })
        expect(wrapper.find('.printstatus-printing').exists()).toBe(true)
        expect(wrapper.find('.printstatus-complete').exists()).toBe(false)
    })

    it('renders PrintstatusComplete when printer_state is complete', () => {
        mockBaseValues.printer_state.value = 'complete'
        const store = createStoreWithState({
            printer: { print_stats: { state: 'complete' }, idle_timeout: { state: 'Idle' } },
        })
        const wrapper = mount(Printstatus, {
            global: { plugins: [store] },
        })
        expect(wrapper.find('.printstatus-complete').exists()).toBe(true)
        expect(wrapper.find('.printstatus-printing').exists()).toBe(false)
    })

    it('renders neither when printer_state is standby', () => {
        mockBaseValues.printer_state.value = 'standby'
        const store = createStoreWithState({
            printer: { print_stats: { state: 'standby' }, idle_timeout: { state: 'Idle' } },
        })
        const wrapper = mount(Printstatus, {
            global: { plugins: [store] },
        })
        expect(wrapper.find('.printstatus-printing').exists()).toBe(false)
        expect(wrapper.find('.printstatus-complete').exists()).toBe(false)
    })

    it('renders neither when printer_state is empty string', () => {
        mockBaseValues.printer_state.value = ''
        const store = createStoreWithState({
            printer: { print_stats: { state: '' }, idle_timeout: { state: '' } },
        })
        const wrapper = mount(Printstatus, {
            global: { plugins: [store] },
        })
        expect(wrapper.find('.printstatus-printing').exists()).toBe(false)
        expect(wrapper.find('.printstatus-complete').exists()).toBe(false)
    })
})
