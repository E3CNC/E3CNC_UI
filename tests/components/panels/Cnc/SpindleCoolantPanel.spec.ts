import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createStore } from 'vuex'
import { ref } from 'vue'
import SpindleCoolantPanel from '@/components/panels/Cnc/SpindleCoolantPanel.vue'

// Mock Vuetify components
vi.mock('vuetify/components', () => ({
    VContainer: { name: 'VContainer', template: '<div class="v-container"><slot /></div>' },
    VRow: {
        name: 'VRow',
        props: { density: String },
        template: '<div class="v-row" :class="`density-${density}`"><slot /></div>',
    },
    VCol: {
        name: 'VCol',
        props: { cols: String },
        template: '<div class="v-col" :class="`cols-${cols}`"><slot /></div>',
    },
    VBtn: {
        name: 'VBtn',
        props: { icon: Boolean, variant: String, size: String, color: String, disabled: Boolean },
        template:
            '<button class="v-btn" :disabled="disabled" :color="color" @click="$emit(\'click\', $event)"><slot /></button>',
    },
    VIcon: {
        name: 'VIcon',
        props: { start: Boolean },
        template: '<i class="v-icon"><slot /></i>',
    },
    VTextField: {
        name: 'VTextField',
        props: ['modelValue', 'label', 'type', 'density', 'variant', 'hideDetails', 'min', 'max'],
        template:
            '<input class="v-text-field" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
        emits: ['update:modelValue'],
    },
    VDivider: {
        name: 'VDivider',
        props: { class: String },
        template: '<hr class="v-divider" />',
    },
}))

// Mock Panel child — MUST render title text
vi.mock('@/components/ui/Panel.vue', () => ({
    default: {
        name: 'Panel',
        props: { icon: String, title: [String, Object], collapsible: Boolean, cardClass: String },
        template: '<div class="panel" :class="cardClass"><slot /><span class="panel-title">{{ title }}</span></div>',
    },
}))

// Mock ConfirmationDialog child (simplified — avoids $t calls)
vi.mock('@/components/dialogs/ConfirmationDialog.vue', () => ({
    default: {
        name: 'ConfirmationDialog',
        props: { modelValue: Boolean, title: String, text: String, actionButtonText: String, cancelButtonText: String },
        emits: ['update:modelValue', 'action'],
        template:
            '<div class="confirmation-dialog" v-if="modelValue"><span class="dialog-text">{{ text }}</span><button class="dialog-action" @click="$emit(\'action\')">Yes</button><button class="dialog-cancel" @click="$emit(\'update:modelValue\', false)">No</button></div>',
    },
}))

// Mock composables — use ref() for Vue auto-unwrap
const mockKlipperReadyForGui = ref(true)
const mockSpindleEnabled = ref(true)
const mockCoolantEnabled = ref(true)
const mockRequireConfirmForSpindleStart = ref(false)

vi.mock('@/composables/useBase', () => ({
    useBase: () => ({
        klipperReadyForGui: mockKlipperReadyForGui,
    }),
}))

vi.mock('@/composables/useControl', () => ({
    useControl: () => ({}),
}))

vi.mock('@/composables/useCncProfile', () => ({
    useCncProfile: () => ({
        spindleEnabled: mockSpindleEnabled,
        coolantEnabled: mockCoolantEnabled,
        requireConfirmForSpindleStart: mockRequireConfirmForSpindleStart,
    }),
}))

// Mock API functions
const mockSetCncSpindle = vi.fn().mockResolvedValue(undefined)
const mockSetCncCoolant = vi.fn().mockResolvedValue(undefined)

vi.mock('@/store/files/cncApi', () => ({
    setCncSpindle: (...args: unknown[]) => mockSetCncSpindle(...args),
    setCncCoolant: (...args: unknown[]) => mockSetCncCoolant(...args),
}))

// Mock vue-toast-notification
vi.mock('vue-toast-notification', () => ({
    useToast: () => ({
        error: vi.fn(),
    }),
}))

describe('SpindleCoolantPanel.vue', () => {
    let store: ReturnType<typeof createStore>
    let addEventSpy: ReturnType<typeof vi.fn>

    beforeEach(() => {
        mockKlipperReadyForGui.value = true
        mockSpindleEnabled.value = true
        mockCoolantEnabled.value = true
        mockRequireConfirmForSpindleStart.value = false
        mockSetCncSpindle.mockReset().mockResolvedValue(undefined)
        mockSetCncCoolant.mockReset().mockResolvedValue(undefined)

        addEventSpy = vi.fn()

        store = createStore({
            state: {},
            getters: {
                'socket/getUrl': () => 'ws://localhost:8080/websocket',
            },
            actions: {
                'server/addEvent': addEventSpy,
            },
        })
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    function createWrapper(): VueWrapper {
        return mount(SpindleCoolantPanel, {
            global: {
                plugins: [store],
                // Provide $t so ConfirmationDialog's template doesn't crash
                mocks: {
                    $t: (key: string) => {
                        const map: Record<string, string> = {
                            'Buttons.Yes': 'Yes',
                            'Buttons.No': 'No',
                        }
                        return map[key] ?? key
                    },
                },
            },
        })
    }

    it('renders when klipperReadyForGui and spindleEnabled', () => {
        const wrapper = createWrapper()
        expect(wrapper.find('.panel').exists()).toBe(true)
        expect(wrapper.find('.panel-title').text()).toContain('Spindle & Coolant')
    })

    it('does not render when both spindle and coolant are disabled', () => {
        mockSpindleEnabled.value = false
        mockCoolantEnabled.value = false
        const wrapper = createWrapper()
        expect(wrapper.find('.panel').exists()).toBe(false)
    })

    it('does not render when klipperReadyForGui is false', () => {
        mockKlipperReadyForGui.value = false
        const wrapper = createWrapper()
        expect(wrapper.find('.panel').exists()).toBe(false)
    })

    it('renders spindle control ON, OFF, CCW buttons', () => {
        const wrapper = createWrapper()
        const allText = wrapper.text()
        // Buttons contain VIcon with SVG path text mixed in, so check text includes key substrings
        expect(allText).toContain('ON')
        expect(allText).toContain('OFF')
        expect(allText).toContain('CCW')
    })

    it('calls setCncSpindle with state "cw" when ON is clicked', async () => {
        const wrapper = createWrapper()
        const onButton = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('ON'))
        expect(onButton).toBeDefined()
        await onButton!.trigger('click')

        expect(mockSetCncSpindle).toHaveBeenCalledWith('ws://localhost:8080/websocket', {
            state: 'cw',
            rpm: 0,
        })
        expect(addEventSpy).toHaveBeenCalled()
    })

    it('calls setCncSpindle with state "off" when OFF is clicked', async () => {
        const wrapper = createWrapper()
        const offButton = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('OFF'))
        expect(offButton).toBeDefined()
        await offButton!.trigger('click')

        expect(mockSetCncSpindle).toHaveBeenCalledWith('ws://localhost:8080/websocket', {
            state: 'off',
            rpm: 0,
        })
        expect(addEventSpy).toHaveBeenCalled()
    })

    it('calls setCncSpindle with state "ccw" when CCW is clicked', async () => {
        const wrapper = createWrapper()
        const ccwButton = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('CCW'))
        expect(ccwButton).toBeDefined()
        await ccwButton!.trigger('click')

        expect(mockSetCncSpindle).toHaveBeenCalledWith('ws://localhost:8080/websocket', {
            state: 'ccw',
            rpm: 0,
        })
        expect(addEventSpy).toHaveBeenCalled()
    })

    it('renders RPM input field and SET button', () => {
        const wrapper = createWrapper()
        expect(wrapper.find('.v-text-field').exists()).toBe(true)
        const setButton = wrapper.findAll('.v-btn').find((btn) => btn.text().trim() === 'SET')
        expect(setButton).toBeDefined()
        // SET button should be disabled when spindleSpeedInput is null
        expect(setButton!.attributes('disabled')).toBeDefined()
    })

    it('enables SET button when RPM value is entered', async () => {
        const wrapper = createWrapper()
        const input = wrapper.find('.v-text-field')
        // Simulate entering an RPM value
        await input.setValue(5000)

        const setButton = wrapper.findAll('.v-btn').find((btn) => btn.text().trim() === 'SET')
        expect(setButton).toBeDefined()
        expect(setButton!.attributes('disabled')).toBeUndefined()
    })

    it('calls setCncSpindle with RPM when SET is clicked', async () => {
        const wrapper = createWrapper()
        const input = wrapper.find('.v-text-field')
        await input.setValue(8000)

        const setButton = wrapper.findAll('.v-btn').find((btn) => btn.text().trim() === 'SET')
        await setButton!.trigger('click')

        // When rpm > 0, state is 'cw'
        expect(mockSetCncSpindle).toHaveBeenCalledWith('ws://localhost:8080/websocket', {
            state: 'cw',
            rpm: 8000,
        })
    })

    it('calls setCncSpindle with state "off" when SET is clicked with 0 RPM', async () => {
        const wrapper = createWrapper()
        const input = wrapper.find('.v-text-field')
        await input.setValue(0)

        const setButton = wrapper.findAll('.v-btn').find((btn) => btn.text().trim() === 'SET')
        await setButton!.trigger('click')

        expect(mockSetCncSpindle).toHaveBeenCalledWith('ws://localhost:8080/websocket', {
            state: 'off',
            rpm: 0,
        })
    })

    it('shows confirmation dialog when requireConfirmForSpindleStart is true and starting spindle', async () => {
        mockRequireConfirmForSpindleStart.value = true
        const wrapper = createWrapper()

        const onButton = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('ON'))
        await onButton!.trigger('click')

        // Should NOT call setCncSpindle directly
        expect(mockSetCncSpindle).not.toHaveBeenCalled()

        // Dialog should appear
        const dialog = wrapper.find('.confirmation-dialog')
        expect(dialog.exists()).toBe(true)
        expect(dialog.text()).toContain('Send spindle command')
    })

    it('executes spindle command after confirming dialog', async () => {
        mockRequireConfirmForSpindleStart.value = true
        const wrapper = createWrapper()

        const onButton = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('ON'))
        await onButton!.trigger('click')

        // Should show dialog
        expect(wrapper.find('.confirmation-dialog').exists()).toBe(true)

        // Click the action button in the dialog
        const dialogActionBtn = wrapper.find('.dialog-action')
        await dialogActionBtn.trigger('click')

        // Now setCncSpindle should have been called
        expect(mockSetCncSpindle).toHaveBeenCalledWith('ws://localhost:8080/websocket', {
            state: 'cw',
            rpm: 0,
        })
    })

    it('does not show confirmation when turning spindle off even if requireConfirmForSpindleStart is true', async () => {
        mockRequireConfirmForSpindleStart.value = true
        const wrapper = createWrapper()

        const offButton = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('OFF'))
        await offButton!.trigger('click')

        // Should call setCncSpindle directly (no confirmation for turning off)
        expect(mockSetCncSpindle).toHaveBeenCalled()
        expect(wrapper.find('.confirmation-dialog').exists()).toBe(false)
    })

    it('handles error from setCncSpindle gracefully', async () => {
        mockSetCncSpindle.mockRejectedValue(new Error('Spindle communication error'))

        const wrapper = createWrapper()
        const onButton = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('ON'))
        await onButton!.trigger('click')

        // Wait for microtask queue to flush (error caught in try/catch)
        await new Promise((resolve) => process.nextTick(resolve))

        // Should not crash
        expect(wrapper.find('.panel').exists()).toBe(true)
    })

    it('does not render coolant buttons when coolantEnabled is false', () => {
        mockCoolantEnabled.value = false
        const wrapper = createWrapper()
        expect(wrapper.text()).not.toContain('Flood ON')
        expect(wrapper.text()).not.toContain('Mist ON')
    })

    it('renders coolant flood ON/OFF buttons', () => {
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('Flood ON')
        expect(wrapper.text()).toContain('Flood OFF')
    })

    it('renders coolant mist ON/OFF buttons', () => {
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('Mist ON')
        expect(wrapper.text()).toContain('Mist OFF')
    })

    it('calls setCncCoolant with flood=true when Flood ON clicked', async () => {
        const wrapper = createWrapper()
        const floodOnBtn = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('Flood ON'))
        await floodOnBtn!.trigger('click')

        expect(mockSetCncCoolant).toHaveBeenCalledWith('ws://localhost:8080/websocket', {
            flood: true,
            mist: false,
        })
        expect(addEventSpy).toHaveBeenCalled()
    })

    it('calls setCncCoolant with flood=false when Flood OFF clicked', async () => {
        const wrapper = createWrapper()
        const floodOffBtn = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('Flood OFF'))
        await floodOffBtn!.trigger('click')

        expect(mockSetCncCoolant).toHaveBeenCalledWith('ws://localhost:8080/websocket', {
            flood: false,
            mist: false,
        })
        expect(addEventSpy).toHaveBeenCalled()
    })

    it('calls setCncCoolant with mist=true when Mist ON clicked', async () => {
        const wrapper = createWrapper()
        const mistOnBtn = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('Mist ON'))
        await mistOnBtn!.trigger('click')

        expect(mockSetCncCoolant).toHaveBeenCalledWith('ws://localhost:8080/websocket', {
            flood: false,
            mist: true,
        })
        expect(addEventSpy).toHaveBeenCalled()
    })

    it('calls setCncCoolant with mist=false when Mist OFF clicked', async () => {
        const wrapper = createWrapper()
        const mistOffBtn = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('Mist OFF'))
        await mistOffBtn!.trigger('click')

        expect(mockSetCncCoolant).toHaveBeenCalledWith('ws://localhost:8080/websocket', {
            flood: false,
            mist: false,
        })
        expect(addEventSpy).toHaveBeenCalled()
    })

    it('handles error from setCncCoolant gracefully', async () => {
        mockSetCncCoolant.mockRejectedValue(new Error('Coolant error'))

        const wrapper = createWrapper()
        const floodOnBtn = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('Flood ON'))
        await floodOnBtn!.trigger('click')

        // Wait for microtask queue
        await new Promise((resolve) => process.nextTick(resolve))

        // Should not crash
        expect(wrapper.find('.panel').exists()).toBe(true)
    })

    it('does not render spindle controls when spindleEnabled is false', () => {
        mockSpindleEnabled.value = false
        const wrapper = createWrapper()
        expect(wrapper.text()).not.toContain('Spindle Control')
        expect(wrapper.text()).toContain('Coolant Control')
    })

    it('renders with only spindle when coolant is disabled', () => {
        mockCoolantEnabled.value = false
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('Spindle Control')
        expect(wrapper.text()).not.toContain('Coolant Control')
    })
})
