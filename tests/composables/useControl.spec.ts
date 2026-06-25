import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import { useControl } from '@/composables/useControl'

const emit = vi.fn()
let qglExists = true

vi.mock('@/composables/useSocket', () => ({
    useSocket: () => ({
        emit,
    }),
}))

describe('useControl', () => {
    let store: any

    beforeEach(() => {
        emit.mockClear()
        store = createStore({
            state: {
                socket: {
                    isConnected: true,
                    initializationList: [],
                    loadings: [],
                    port: 8080,
                    hostname: 'localhost',
                },
                printer: {
                    gcode_move: {
                        absolute_coordinates: true,
                    },
                    quad_gantry_level: {
                        applied: false,
                    },
                    z_tilt: {
                        applied: true,
                    },
                    toolhead: {
                        homed_axes: 'xz',
                    },
                    gcode: {
                        commands: {
                            _CLIENT_LINEAR_MOVE: {},
                            T0: {},
                            T2: {},
                        },
                    },
                },
                gui: {
                    control: {
                        enableXYHoming: true,
                        feedrateXY: 250,
                        feedrateZ: 100,
                        actionButton: 'qgl',
                    },
                },
                server: {},
            },
            getters: {
                'socket/getUrl': () => '//localhost:8080',
                'gui/getDefaultControlActionButton': () => 'homeAll',
                'printer/existsQGL': () => qglExists,
                'printer/existsZtilt': () => false,
                'printer/existsDeltaCalibrate': () => false,
                'printer/existsScrewsTilt': () => false,
                'printer/existsFirmwareRetraction': () => false,
                'printer/getMacros': () => ['M300'],
                'server/addEvent': vi.fn(),
            },
            actions: {
                'server/addEvent': vi.fn(),
            },
        })
    })

    function mountComposable() {
        let result: any
        const TestComponent = defineComponent({
            setup() {
                result = useControl()
                return () => h('div')
            },
        })

        mount(TestComponent, {
            global: { plugins: [store] },
        })

        return result
    }

    it('exposes control state computed values', () => {
        const control = mountComposable()
        expect(control.absolute_coordinates.value).toBe(true)
        expect(control.enableXYHoming.value).toBe(true)
        expect(control.feedrateXY.value).toBe(250)
        expect(control.feedrateZ.value).toBe(100)
        expect(control.existsQGL.value).toBe(true)
        expect(control.colorQuadGantryLevel.value).toBe('warning')
        expect(control.colorZTilt.value).toBe('primary')
        expect(control.homedAxes.value).toBe('xz')
        expect(control.xAxisHomed.value).toBe(true)
        expect(control.yAxisHomed.value).toBe(false)
        expect(control.zAxisHomed.value).toBe(true)
        expect(control.toolchangeMacros.value).toEqual(['T0', 'T2'])
        expect(control.existsClientLinearMoveMacro.value).toBe(true)
    })

    it('falls back to default action button when requested action is invalid', () => {
        store.state.gui.control.actionButton = 'ztilt'
        qglExists = false
        const control = mountComposable()
        expect(control.actionButton.value).toBe('homeAll')
    })

    it('sends homing and gcode commands through the socket', () => {
        const control = mountComposable()

        control.doHome()
        control.doHomeX()
        control.doHomeY()
        control.doHomeXY()
        control.doHomeZ()
        control.doQGL()
        control.doSend('M114')
        control.doSendMove('X10 Y5', 250)

        expect(emit).toHaveBeenCalledWith('printer.gcode.script', { script: 'G28' }, { loading: 'homeAll' })
        expect(emit).toHaveBeenCalledWith('printer.gcode.script', { script: 'G28 X' }, { loading: 'homeX' })
        expect(emit).toHaveBeenCalledWith('printer.gcode.script', { script: 'G28 Y' }, { loading: 'homeY' })
        expect(emit).toHaveBeenCalledWith('printer.gcode.script', { script: 'G28 X Y' }, { loading: 'homeXY' })
        expect(emit).toHaveBeenCalledWith('printer.gcode.script', { script: 'G28 Z' }, { loading: 'homeZ' })
        expect(emit).toHaveBeenCalledWith('printer.gcode.script', { script: 'QUAD_GANTRY_LEVEL' }, { loading: 'qgl' })
        expect(emit).toHaveBeenCalledWith('printer.gcode.script', { script: 'M114' })
        expect(emit).toHaveBeenCalledWith('printer.gcode.script', {
            script: '_CLIENT_LINEAR_MOVE X=10 Y=5 F=15000',
        })
    })

    it('handles z_tilt_ng variant in colorZTilt', () => {
        store.state.printer = {
            gcode_move: { absolute_coordinates: true },
            z_tilt_ng: { applied: false },
            toolhead: { homed_axes: '' },
            gcode: { commands: {} },
        }
        const control = mountComposable()
        expect(control.colorZTilt.value).toBe('warning')
    })

    it('falls back to gcode_macro parsing when gcode.commands is null', () => {
        store.state.printer = {
            gcode_move: { absolute_coordinates: true },
            quad_gantry_level: { applied: true },
            z_tilt: { applied: true },
            toolhead: { homed_axes: '' },
            'gcode_macro T1': {},
            'gcode_macro T2': {},
        }
        const control = mountComposable()
        expect(control.toolchangeMacros.value).toEqual(['T1', 'T2'])
    })

    it('actionButton falls back to default when ztilt selected but not available', () => {
        store.state.gui.control.actionButton = 'ztilt'
        qglExists = false
        const control = mountComposable()
        expect(control.actionButton.value).toBe('homeAll')
    })
})
