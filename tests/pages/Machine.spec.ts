import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// --- Mock classes ---

const mockKlipperState = vi.hoisted(() => {
    class MockRef<T> {
        _value: T
        __v_isRef = true
        __v_isShallow = false
        constructor(val: T) {
            this._value = val
        }
        get value() {
            return this._value
        }
        set value(v: T) {
            this._value = v
        }
    }
    return new MockRef<string>('ready')
})

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}))

// Mock vuetify/components — VContainer, VRow, VCol as slot wrappers
vi.mock('vuetify/components', () => {
    const VContainer = {
        name: 'VContainer',
        template: '<div class="v-container"><slot /></div>',
    }
    const VRow = {
        name: 'VRow',
        template: '<div class="v-row"><slot /></div>',
    }
    const VCol = {
        name: 'VCol',
        template: '<div class="v-col"><slot /></div>',
    }
    return { VContainer, VRow, VCol }
})

// Mock @/composables/useBase — klipperState as a mutable ref so tests can change it
vi.mock('@/composables/useBase', () => ({
    useBase: () => ({
        klipperState: mockKlipperState,
        socketIsConnected: true,
        hostUrl: new URL('http://localhost:8080'),
        apiUrl: 'http://localhost:8080',
    }),
}))

// Import after mocks
import MachinePage from '@/pages/Machine.vue'

function mountMachine() {
    return mount(MachinePage, {
        global: {
            stubs: {
                ConfigFilesPanel: {
                    name: 'ConfigFilesPanel',
                    template: '<div class="config-files-panel-stub" />',
                },
                KlippyStatePanel: {
                    name: 'KlippyStatePanel',
                    template: '<div class="klippy-state-panel-stub" />',
                },
                SystemPanel: {
                    name: 'SystemPanel',
                    template: '<div class="system-panel-stub" />',
                },
                UpdatePanel: {
                    name: 'UpdatePanel',
                    template: '<div class="update-panel-stub" />',
                },
                EndstopPanel: {
                    name: 'EndstopPanel',
                    template: '<div class="endstop-panel-stub" />',
                },
                LogfilesPanel: {
                    name: 'LogfilesPanel',
                    template: '<div class="logfiles-panel-stub" />',
                },
            },
        },
    })
}

describe('Machine.vue', () => {
    beforeEach(() => {
        mockKlipperState.value = 'ready'
    })

    it('renders without crashing', () => {
        const wrapper = mountMachine()
        expect(wrapper.exists()).toBe(true)
    })

    it('renders config-files-panel and klippy-state-panel', () => {
        const wrapper = mountMachine()
        expect(wrapper.findComponent({ name: 'ConfigFilesPanel' }).exists()).toBe(true)
        expect(wrapper.findComponent({ name: 'KlippyStatePanel' }).exists()).toBe(true)
    })

    it('renders system-panel and update-panel', () => {
        const wrapper = mountMachine()
        expect(wrapper.findComponent({ name: 'SystemPanel' }).exists()).toBe(true)
        expect(wrapper.findComponent({ name: 'UpdatePanel' }).exists()).toBe(true)
    })

    describe('endstop-panel conditional rendering', () => {
        it('renders endstop-panel when klipperState is "ready"', () => {
            mockKlipperState.value = 'ready'
            const wrapper = mountMachine()
            expect(wrapper.findComponent({ name: 'EndstopPanel' }).exists()).toBe(true)
        })

        it('does NOT render endstop-panel when klipperState is "error"', () => {
            mockKlipperState.value = 'error'
            const wrapper = mountMachine()
            expect(wrapper.findComponent({ name: 'EndstopPanel' }).exists()).toBe(false)
        })

        it('does NOT render endstop-panel when klipperState is "startup"', () => {
            mockKlipperState.value = 'startup'
            const wrapper = mountMachine()
            expect(wrapper.findComponent({ name: 'EndstopPanel' }).exists()).toBe(false)
        })

        it('does NOT render endstop-panel when klipperState is "disconnected"', () => {
            mockKlipperState.value = 'disconnected'
            const wrapper = mountMachine()
            expect(wrapper.findComponent({ name: 'EndstopPanel' }).exists()).toBe(false)
        })

        it('does NOT render endstop-panel when klipperState is "shutdown"', () => {
            mockKlipperState.value = 'shutdown'
            const wrapper = mountMachine()
            expect(wrapper.findComponent({ name: 'EndstopPanel' }).exists()).toBe(false)
        })
    })

    describe('logfiles-panel always rendered', () => {
        it('renders logfiles-panel when klipperState is "ready"', () => {
            mockKlipperState.value = 'ready'
            const wrapper = mountMachine()
            expect(wrapper.findComponent({ name: 'LogfilesPanel' }).exists()).toBe(true)
        })

        it('renders logfiles-panel when klipperState is "error"', () => {
            mockKlipperState.value = 'error'
            const wrapper = mountMachine()
            expect(wrapper.findComponent({ name: 'LogfilesPanel' }).exists()).toBe(true)
        })

        it('renders logfiles-panel when klipperState is "disconnected"', () => {
            mockKlipperState.value = 'disconnected'
            const wrapper = mountMachine()
            expect(wrapper.findComponent({ name: 'LogfilesPanel' }).exists()).toBe(true)
        })
    })
})
