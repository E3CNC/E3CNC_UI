import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import MdiPanel from '@/components/panels/Cnc/MdiPanel.vue'

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
        props: { cols: [String, Number] },
        template: '<div class="v-col" :class="`cols-${cols}`"><slot /></div>',
    },
    VBtn: {
        name: 'VBtn',
        props: { icon: Boolean, variant: String, size: String },
        template: '<button class="v-btn" @click="$emit(\'click\', $event)"><slot /></button>',
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

// Mock ConsoleTextarea child
vi.mock('@/components/inputs/ConsoleTextarea.vue', () => ({
    default: {
        name: 'ConsoleTextarea',
        template: '<textarea class="console-textarea" placeholder="Enter G-code..."></textarea>',
    },
}))

// Mock composables — use ref() for Vue auto-unwrap
const mockKlipperReadyForGui = ref(true)
const mockDoSend = vi.fn()
const mockShowWorkCoords = ref(true)

vi.mock('@/composables/useBase', () => ({
    useBase: () => ({
        klipperReadyForGui: mockKlipperReadyForGui,
    }),
}))

vi.mock('@/composables/useControl', () => ({
    useControl: () => ({
        doSend: mockDoSend,
    }),
}))

vi.mock('@/composables/useCncProfile', () => ({
    useCncProfile: () => ({
        showWorkCoords: mockShowWorkCoords,
    }),
}))

describe('MdiPanel.vue', () => {
    beforeEach(() => {
        mockKlipperReadyForGui.value = true
        mockShowWorkCoords.value = true
        mockDoSend.mockReset()
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    function createWrapper(): VueWrapper {
        return mount(MdiPanel, {
            global: {},
        })
    }

    it('renders when klipperReadyForGui is true', () => {
        const wrapper = createWrapper()
        expect(wrapper.find('.panel').exists()).toBe(true)
        expect(wrapper.find('.panel-title').text()).toContain('MDI')
    })

    it('does not render when klipperReadyForGui is false', () => {
        mockKlipperReadyForGui.value = false
        const wrapper = createWrapper()
        expect(wrapper.find('.panel').exists()).toBe(false)
    })

    it('renders ConsoleTextarea component', () => {
        const wrapper = createWrapper()
        expect(wrapper.find('.console-textarea').exists()).toBe(true)
    })

    it('renders Quick Commands section', () => {
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('Quick Commands')
    })

    it('renders all four quick command buttons', () => {
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('G20')
        expect(wrapper.text()).toContain('G21')
        expect(wrapper.text()).toContain('G90')
        expect(wrapper.text()).toContain('G91')
    })

    it('calls doSend with correct command when a quick command is clicked', async () => {
        const wrapper = createWrapper()

        // Find and click the G90 button
        const g90Button = wrapper.findAll('.v-btn').find((btn) => btn.text().trim() === 'G90 abs')
        expect(g90Button).toBeDefined()
        await g90Button!.trigger('click')

        expect(mockDoSend).toHaveBeenCalledWith('G90')
    })

    it('calls doSend with G20 when G20 mm button is clicked', async () => {
        const wrapper = createWrapper()
        const g20Button = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('G20'))
        await g20Button!.trigger('click')
        expect(mockDoSend).toHaveBeenCalledWith('G20')
    })

    it('calls doSend with G21 when G21 inch button is clicked', async () => {
        const wrapper = createWrapper()
        const g21Button = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('G21'))
        await g21Button!.trigger('click')
        expect(mockDoSend).toHaveBeenCalledWith('G21')
    })

    it('calls doSend with G91 when G91 rel button is clicked', async () => {
        const wrapper = createWrapper()
        const g91Button = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('G91'))
        await g91Button!.trigger('click')
        expect(mockDoSend).toHaveBeenCalledWith('G91')
    })

    it('renders Work Coordinate Systems section when showWorkCoords is true', () => {
        mockShowWorkCoords.value = true
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('Work Coordinate Systems')
    })

    it('does not render Work Coordinate Systems when showWorkCoords is false', () => {
        mockShowWorkCoords.value = false
        const wrapper = createWrapper()
        expect(wrapper.text()).not.toContain('Work Coordinate Systems')
    })

    it('renders all six WCS buttons (G54-G59) when showWorkCoords is true', () => {
        mockShowWorkCoords.value = true
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('G54')
        expect(wrapper.text()).toContain('G55')
        expect(wrapper.text()).toContain('G56')
        expect(wrapper.text()).toContain('G57')
        expect(wrapper.text()).toContain('G58')
        expect(wrapper.text()).toContain('G59')
    })

    it('calls doSend with WCS command when a WCS button is clicked', async () => {
        const wrapper = createWrapper()
        const g54Button = wrapper.findAll('.v-btn').find((btn) => btn.text().trim() === 'G54')
        await g54Button!.trigger('click')
        expect(mockDoSend).toHaveBeenCalledWith('G54')
    })

    it('calls doSend with G59 when G59 button is clicked', async () => {
        const wrapper = createWrapper()
        const g59Button = wrapper.findAll('.v-btn').find((btn) => btn.text().trim() === 'G59')
        await g59Button!.trigger('click')
        expect(mockDoSend).toHaveBeenCalledWith('G59')
    })

    it('renders the VDivider between ConsoleTextarea and Quick Commands', () => {
        const wrapper = createWrapper()
        expect(wrapper.find('.v-divider').exists()).toBe(true)
    })
})
