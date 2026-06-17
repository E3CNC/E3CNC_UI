import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createStore } from 'vuex'
import { ref, nextTick } from 'vue'
import CncStatusPanel from '@/components/panels/Cnc/CncStatusPanel.vue'

// Mock Vuetify components used by this panel
vi.mock('vuetify/components', () => ({
    VContainer: { name: 'VContainer', template: '<div class="v-container"><slot /></div>' },
    VRow: { name: 'VRow', template: '<div class="v-row"><slot /></div>' },
    VCol: {
        name: 'VCol',
        props: { cols: String },
        template: '<div class="v-col" :class="`cols-${cols}`"><slot /></div>',
    },
    VChip: {
        name: 'VChip',
        props: { size: String, label: Boolean, color: String, variant: String, loading: Boolean },
        template: '<span class="v-chip" :class="[color, variant]"><slot /></span>',
    },
    VBtn: {
        name: 'VBtn',
        props: { icon: Boolean, variant: String, size: String },
        template: '<button class="v-btn" @click="$emit(\'click\')"><slot /></button>',
    },
}))

// Mock Panel child — MUST render title text for assertions
vi.mock('@/components/ui/Panel.vue', () => ({
    default: {
        name: 'Panel',
        props: { icon: String, title: [String, Object], collapsible: Boolean, cardClass: String },
        template: '<div class="panel" :class="cardClass"><slot /><span class="panel-title">{{ title }}</span></div>',
    },
}))

// Mock composables — use ref() so Vue template auto-unwrap works
const mockKlipperReadyForGui = ref(true)
const mockPrinterState = ref('standby')
const mockAbsoluteCoordinates = ref(true)
const mockHomedAxes = ref('xyz')
const mockShowMachineHealth = ref(true)

vi.mock('@/composables/useBase', () => ({
    useBase: () => ({
        klipperReadyForGui: mockKlipperReadyForGui,
        printer_state: mockPrinterState,
    }),
}))

vi.mock('@/composables/useControl', () => ({
    useControl: () => ({
        absolute_coordinates: mockAbsoluteCoordinates,
        homedAxes: mockHomedAxes,
    }),
}))

vi.mock('@/composables/useCncProfile', () => ({
    useCncProfile: () => ({
        showMachineHealth: mockShowMachineHealth,
    }),
}))

// Mock cncMetadata functions
const mockLoadCncMetadata = vi.fn()
const mockBuildCncMetadataViewModel = vi.fn()

vi.mock('@/store/files/cncMetadata', () => ({
    loadCncMetadata: (...args: unknown[]) => mockLoadCncMetadata(...args),
    buildCncMetadataViewModel: (...args: unknown[]) => mockBuildCncMetadataViewModel(...args),
}))

describe('CncStatusPanel.vue', () => {
    let store: ReturnType<typeof createStore>

    beforeEach(() => {
        mockKlipperReadyForGui.value = true
        mockPrinterState.value = 'standby'
        mockAbsoluteCoordinates.value = true
        mockHomedAxes.value = 'xyz'
        mockShowMachineHealth.value = true
        mockLoadCncMetadata.mockReset()
        mockBuildCncMetadataViewModel.mockReset()

        store = createStore({
            state: {
                printer: {
                    print_stats: { filename: '' },
                    gcode_move: { speed_factor: 1, speed: 6000 },
                    toolhead: { max_velocity: 500 },
                    system_stats: { sysload: 0.42, memavail: 512000 },
                },
            },
            getters: {
                'socket/getUrl': () => 'ws://localhost:8080/websocket',
            },
        })
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    function createWrapper(): VueWrapper {
        return mount(CncStatusPanel, {
            global: {
                plugins: [store],
            },
        })
    }

    it('renders when klipperReadyForGui is true', () => {
        const wrapper = createWrapper()
        expect(wrapper.find('.panel').exists()).toBe(true)
        expect(wrapper.find('.panel-title').text()).toContain('CNC Status')
    })

    it('does not render when klipperReadyForGui is false', () => {
        mockKlipperReadyForGui.value = false
        const wrapper = createWrapper()
        expect(wrapper.find('.panel').exists()).toBe(false)
    })

    it('shows status chip with correct color for standby state', () => {
        mockPrinterState.value = 'standby'
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('STANDBY')
        const chip = wrapper.findAll('.v-chip')[0]
        expect(chip.classes()).toContain('primary')
    })

    it('shows status chip with success color for printing state', () => {
        mockPrinterState.value = 'printing'
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('PRINTING')
        const chip = wrapper.findAll('.v-chip')[0]
        expect(chip.classes()).toContain('success')
    })

    it('shows status chip with warning color for paused state', () => {
        mockPrinterState.value = 'paused'
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('PAUSED')
        const chip = wrapper.findAll('.v-chip')[0]
        expect(chip.classes()).toContain('warning')
    })

    it('shows status chip with info color for complete state', () => {
        mockPrinterState.value = 'complete'
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('COMPLETE')
        const chip = wrapper.findAll('.v-chip')[0]
        expect(chip.classes()).toContain('info')
    })

    it('shows status chip with error color for error/shutdown states', () => {
        mockPrinterState.value = 'error'
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('ERROR')
        const chip = wrapper.findAll('.v-chip')[0]
        expect(chip.classes()).toContain('error')

        mockPrinterState.value = 'shutdown'
        const wrapper2 = createWrapper()
        const chip2 = wrapper2.findAll('.v-chip')[0]
        expect(chip2.classes()).toContain('error')
    })

    it('shows coordinate mode label (Absolute)', () => {
        mockAbsoluteCoordinates.value = true
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('Absolute (G90)')
    })

    it('shows coordinate mode label (Relative)', () => {
        mockAbsoluteCoordinates.value = false
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('Relative (G91)')
    })

    it('shows homed axes label', () => {
        mockHomedAxes.value = 'xyz'
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('Homed: XYZ')
    })

    it('shows homed none when no axes homed', () => {
        mockHomedAxes.value = ''
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('Homed: none')
    })

    it('shows Active File from store', () => {
        store.state.printer.print_stats.filename = 'test.gcode'
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('test.gcode')
    })

    it('shows "No active file" when filename is empty', () => {
        store.state.printer.print_stats.filename = ''
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('No active file')
    })

    it('shows Feed Override from store', () => {
        store.state.printer.gcode_move.speed_factor = 1.5
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('150%')
    })

    it('shows Requested Feed from store', () => {
        store.state.printer.gcode_move.speed = 6000
        const wrapper = createWrapper()
        // 6000 / 60 = 100.0 mm/s
        expect(wrapper.text()).toContain('100.0 mm/s')
    })

    it('shows Max Velocity from store', () => {
        store.state.printer.toolhead.max_velocity = 300
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('300.0 mm/s')
    })

    it('shows Host Load from store', () => {
        store.state.printer.system_stats.sysload = 1.23456
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('1.23')
    })

    it('shows Free RAM from store', () => {
        store.state.printer.system_stats.memavail = 1048576
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('1024 MB')
    })

    it('shows CNC Metadata section when showMachineHealth is true and metadata is loaded', async () => {
        const mockViewModel = {
            camTool: 'Fusion 360',
            workEnvelope: 'X -100 → 100 · Y -100 → 100 · Z -50 → 50',
            tool: 'T1 · End Mill · 6 mm',
            spindle: '12000 RPM',
            feeds: 'Plunge 500 · Cut 1000 · Rapid 5000 mm/min',
            plungeFeed: '500 mm/min',
            cutFeed: '1000 mm/min',
            rapidFeed: '5000 mm/min',
            fields: [
                { label: 'Work Envelope', value: 'X -100 → 100' },
                { label: 'Tool', value: 'T1 · End Mill · 6 mm' },
                { label: 'Spindle', value: '12000 RPM' },
                { label: 'Feeds', value: 'Plunge 500 · Cut 1000 · Rapid 5000 mm/min' },
            ],
        }

        mockLoadCncMetadata.mockResolvedValue({ schema_version: 1, cam_tool: 'Fusion 360' })
        mockBuildCncMetadataViewModel.mockReturnValue(mockViewModel)

        // Set a filename so metadata is loaded
        store.state.printer.print_stats.filename = 'test.gcode'
        const wrapper = createWrapper()

        // Wait for async onMounted + loadCncMetadata
        await nextTick()
        await nextTick()
        await nextTick()

        expect(mockLoadCncMetadata).toHaveBeenCalled()
        expect(mockBuildCncMetadataViewModel).toHaveBeenCalled()

        const text = wrapper.text()
        expect(text).toContain('CNC Metadata')
        expect(text).toContain('Fusion 360')
        expect(text).toContain('12000 RPM')
    })

    it('does not show CNC Metadata section when showMachineHealth is false', async () => {
        mockShowMachineHealth.value = false
        mockLoadCncMetadata.mockResolvedValue({ schema_version: 1 })
        mockBuildCncMetadataViewModel.mockReturnValue({
            camTool: 'Fusion 360',
            workEnvelope: '--',
            tool: '--',
            spindle: '--',
            feeds: '--',
            plungeFeed: '--',
            cutFeed: '--',
            rapidFeed: '--',
            fields: [],
        })

        store.state.printer.print_stats.filename = 'test.gcode'
        const wrapper = createWrapper()
        await nextTick()
        await nextTick()
        await nextTick()

        expect(wrapper.text()).not.toContain('CNC Metadata')
    })

    it('calls loadCncMetadata on mount when filename is present', async () => {
        store.state.printer.print_stats.filename = 'test.gcode'
        mockLoadCncMetadata.mockResolvedValue({ schema_version: 1 })
        mockBuildCncMetadataViewModel.mockReturnValue({
            camTool: '--',
            workEnvelope: '--',
            tool: '--',
            spindle: '--',
            feeds: '--',
            plungeFeed: '--',
            cutFeed: '--',
            rapidFeed: '--',
            fields: [],
        })

        createWrapper()
        await nextTick()
        await nextTick()
        await nextTick()

        expect(mockLoadCncMetadata).toHaveBeenCalledWith('ws://localhost:8080/websocket', 'test.gcode')
    })

    it('does not call loadCncMetadata on mount when filename is empty', async () => {
        store.state.printer.print_stats.filename = ''
        createWrapper()
        await nextTick()
        await nextTick()

        expect(mockLoadCncMetadata).not.toHaveBeenCalled()
    })

    it('reloads metadata when activeGcodeFilename changes', async () => {
        store.state.printer.print_stats.filename = ''
        mockLoadCncMetadata.mockResolvedValue({ schema_version: 1 })
        mockBuildCncMetadataViewModel.mockReturnValue({
            camTool: '--',
            workEnvelope: '--',
            tool: '--',
            spindle: '--',
            feeds: '--',
            plungeFeed: '--',
            cutFeed: '--',
            rapidFeed: '--',
            fields: [],
        })

        createWrapper()
        await nextTick()
        await nextTick()

        expect(mockLoadCncMetadata).not.toHaveBeenCalled()

        // Now set a filename
        store.state.printer.print_stats.filename = 'new.gcode'
        await nextTick()
        await nextTick()
        await nextTick()

        expect(mockLoadCncMetadata).toHaveBeenCalledWith('ws://localhost:8080/websocket', 'new.gcode')
    })

    it('renders feed override with default value (100%) when speed_factor is missing', () => {
        store.state.printer.gcode_move = {}
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('100%')
    })

    it('renders requested feed with default (0.0) when speed is missing', () => {
        store.state.printer.gcode_move = {}
        const wrapper = createWrapper()
        expect(wrapper.text()).toContain('0.0 mm/s')
    })
})
