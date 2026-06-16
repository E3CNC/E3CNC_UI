import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { getters } from '@/store/printer/getters'
import type { PrinterState } from '@/store/printer/types'

vi.mock('@/store/variables', () => ({
    checkKlipperConfigModules: [
        { configName: 'pause_resume', requiredObjects: ['pause_resume'], notifyName: 'Pause Macro' },
        { configName: 'display_status', requiredObjects: ['display_status'], notifyName: 'Display Status' },
    ],
}))

vi.mock('@/plugins/helpers', () => ({
    caseInsensitiveSort: (arr: any[], key: string) =>
        arr.sort((a: any, b: any) => (a[key] ?? '').toString().localeCompare((b[key] ?? '').toString())),
    formatFrequency: (freq: number) => `${freq} MHz`,
    getMacroParams: (settings: Record<string, any>) => {
        const params: Record<string, any> = {}
        for (const [k, v] of Object.entries(settings)) {
            if (k.startsWith('gcode_')) params[k] = { type: 'string', default: v }
        }
        return Object.keys(params).length ? params : null
    },
}))

describe('printer getters', () => {
    let state: PrinterState

    beforeEach(() => {
        state = {} as PrinterState
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe('getPrintPercent', () => {
        it('defaults to file-relative', () => {
            const rootState = { gui: { general: { calcPrintProgress: undefined } } }
            const moduleGetters = { getPrintPercentByFilepositionRelative: 0.5 }
            expect((getters as any).getPrintPercent(state, moduleGetters, rootState)).toBe(0.5)
        })

        it('returns file-absolute', () => {
            const rootState = { gui: { general: { calcPrintProgress: 'file-absolute' } } }
            const moduleGetters = { getPrintPercentByFilepositionAbsolute: 0.75 }
            expect((getters as any).getPrintPercent(state, moduleGetters, rootState)).toBe(0.75)
        })

        it('returns slicer', () => {
            const rootState = { gui: { general: { calcPrintProgress: 'slicer' } } }
            const moduleGetters = { getPrintPercentBySlicer: 0.3 }
            expect((getters as any).getPrintPercent(state, moduleGetters, rootState)).toBe(0.3)
        })

        it('returns filament', () => {
            const rootState = { gui: { general: { calcPrintProgress: 'filament' } } }
            const moduleGetters = { getPrintPercentByFilament: 0.9 }
            expect((getters as any).getPrintPercent(state, moduleGetters, rootState)).toBe(0.9)
        })
    })

    describe('getPrintPercentByFilepositionRelative', () => {
        it('returns 0 when before gcode start', () => {
            state.current_file = { filename: 'test.gcode', gcode_start_byte: 100, gcode_end_byte: 1000 } as any
            state.print_stats = { filename: 'test.gcode' } as any
            state.virtual_sdcard = { file_position: 50, progress: 0 } as any
            expect((getters as any).getPrintPercentByFilepositionRelative(state)).toBe(0)
        })

        it('returns 1 when past gcode end', () => {
            state.current_file = { filename: 'test.gcode', gcode_start_byte: 100, gcode_end_byte: 1000 } as any
            state.print_stats = { filename: 'test.gcode' } as any
            state.virtual_sdcard = { file_position: 2000, progress: 0 } as any
            expect((getters as any).getPrintPercentByFilepositionRelative(state)).toBe(1)
        })

        it('returns calculated progress within range', () => {
            state.current_file = { filename: 'test.gcode', gcode_start_byte: 100, gcode_end_byte: 1100 } as any
            state.print_stats = { filename: 'test.gcode' } as any
            state.virtual_sdcard = { file_position: 600, progress: 0 } as any
            expect((getters as any).getPrintPercentByFilepositionRelative(state)).toBe(0.5)
        })

        it('falls back to virtual_sdcard.progress when conditions not met', () => {
            state.virtual_sdcard = { progress: 0.33 } as any
            expect((getters as any).getPrintPercentByFilepositionRelative(state)).toBe(0.33)
        })
    })

    describe('getPrintPercentByFilepositionAbsolute', () => {
        it('returns virtual_sdcard.progress', () => {
            state.virtual_sdcard = { progress: 0.42 } as any
            expect((getters as any).getPrintPercentByFilepositionAbsolute(state)).toBe(0.42)
        })

        it('defaults to 0', () => {
            expect((getters as any).getPrintPercentByFilepositionAbsolute(state)).toBe(0)
        })
    })

    describe('getPrintPercentBySlicer', () => {
        it('returns display_status.progress', () => {
            state.display_status = { progress: 0.66 } as any
            expect((getters as any).getPrintPercentBySlicer(state)).toBe(0.66)
        })

        it('defaults to 0', () => {
            expect((getters as any).getPrintPercentBySlicer(state)).toBe(0)
        })
    })

    describe('getPrintPercentByFilament', () => {
        it('calculates from filament_used / filament_total', () => {
            state.print_stats = { filament_used: 500 } as any
            state.current_file = { filament_total: 2000 } as any
            expect((getters as any).getPrintPercentByFilament(state)).toBe(0.25)
        })

        it('caps at 1 when over 100%', () => {
            state.print_stats = { filament_used: 3000 } as any
            state.current_file = { filament_total: 2000 } as any
            expect((getters as any).getPrintPercentByFilament(state)).toBe(1)
        })

        it('returns 0 when filament_total is 0', () => {
            state.print_stats = { filament_used: 0 } as any
            state.current_file = { filament_total: 0 } as any
            expect((getters as any).getPrintPercentByFilament(state)).toBe(0)
        })

        it('falls back to virtual_sdcard.progress when missing data', () => {
            state.virtual_sdcard = { progress: 0.5 } as any
            expect((getters as any).getPrintPercentByFilament(state)).toBe(0.5)
        })
    })

    describe('getPrintMaxLayers', () => {
        it('returns total_layer from print_stats.info', () => {
            state.print_stats = { info: { total_layer: 50 } } as any
            expect((getters as any).getPrintMaxLayers(state)).toBe(50)
        })

        it('returns layer_count from current_file', () => {
            state.current_file = { layer_count: 30 } as any
            expect((getters as any).getPrintMaxLayers(state)).toBe(30)
        })

        it('calculates from object_height, layer_height, first_layer_height', () => {
            state.current_file = { first_layer_height: 0.2, layer_height: 0.1, object_height: 5.2 } as any
            expect((getters as any).getPrintMaxLayers(state)).toBe(51)
        })

        it('returns 0 when no data available', () => {
            expect((getters as any).getPrintMaxLayers(state)).toBe(0)
        })
    })

    describe('getPartFanSpeed', () => {
        it('returns fan.speed when fan exists', () => {
            state.fan = { speed: 0.75 } as any
            expect((getters as any).getPartFanSpeed(state)).toBe(0.75)
        })

        it('returns 0 when no fan', () => {
            expect((getters as any).getPartFanSpeed(state)).toBe(0)
        })
    })

    describe('getMacros and getMacro', () => {
        it('returns parsed macros from state', () => {
            state['gcode_macro START_PRINT'] = { variables: { BED_TEMP: 60 } }
            state.configfile = {
                config: {},
                settings: { 'gcode_macro start_print': { gcode_filename: 'start_print.gcode' } },
            } as any
            state.gcode = { commands: { START_PRINT: { help: 'Start print' } } } as any

            const result = (getters as any).getMacros(state)
            expect(result).toHaveLength(1)
            expect(result[0].name).toBe('START_PRINT')
            expect(result[0].description).toBe('Start print')
        })

        it('filters macros starting with underscore', () => {
            state['gcode_macro _hidden'] = { variables: {} }
            state.configfile = { config: {}, settings: {} } as any
            expect((getters as any).getMacros(state)).toEqual([])
        })

        it('getMacro finds a specific macro by name', () => {
            state['gcode_macro START_PRINT'] = { variables: {} }
            state.configfile = { config: {}, settings: { 'gcode_macro start_print': {} } } as any
            const moduleGetters = { getMacros: (getters as any).getMacros(state) }
            const result = (getters as any).getMacro(state, moduleGetters)('START_PRINT')
            expect(result.name).toBe('START_PRINT')
        })
    })

    describe('getPrinterObjects', () => {
        it('filters and maps supported objects', () => {
            state.extruder = { temperature: 200 }
            state.toolhead = { position: [0, 0, 0] }
            state.configfile = {
                config: { extruder: {}, toolhead: {} },
                settings: { extruder: { heater_pin: 'PA0' } },
            } as any
            const result = (getters as any).getPrinterObjects(state)(['extruder'])
            expect(result).toHaveLength(1)
            expect(result[0].name).toBe('extruder')
            expect(result[0].type).toBe('extruder')
            expect(result[0].settings).toEqual({ heater_pin: 'PA0' })
        })

        it('handles object names with spaces', () => {
            state['gcode_macro START_PRINT'] = { variables: {} }
            state.configfile = { config: {}, settings: {} } as any
            const result = (getters as any).getPrinterObjects(state)(['gcode_macro'])
            expect(result[0].name).toBe('START_PRINT')
            expect(result[0].type).toBe('gcode_macro')
        })
    })

    describe('existPrinterConfig and checkConfig', () => {
        it('existPrinterConfig returns true when configfile has config', () => {
            state.configfile = { config: { extruder: {} } } as any
            const result = (getters as any).existPrinterConfig(state)
            expect(result).toBe(true)
        })

        it('existPrinterConfig returns false when no configfile', () => {
            expect((getters as any).existPrinterConfig(state)).toBe(false)
        })

        it('checkConfig returns true when config module exists', () => {
            state.configfile = { config: { pause_resume: {} } } as any
            const result = (getters as any).checkConfig(state)('pause_resume')
            expect(result).toBe(true)
        })

        it('checkConfig returns false when config module missing', () => {
            state.configfile = { config: {} } as any
            const result = (getters as any).checkConfig(state)('pause_resume')
            expect(result).toBe(false)
        })
    })

    describe('getEstimatedTimeETAFormat', () => {
        it('returns "--" when eta is not in the future', () => {
            vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 0))
            const eta = new Date(2024, 0, 1, 10, 0, 0).getTime()
            expect((getters as any).getEstimatedTimeETAFormat(
                {} as PrinterState,
                { getEstimatedTimeETA: eta },
                {} as any,
                { 'gui/getHours12Format': false },
            )).toBe('--')
        })

        it('formats time in 24-hour mode', () => {
            vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 0))
            const eta = new Date(2024, 0, 1, 16, 5, 0).getTime()
            expect((getters as any).getEstimatedTimeETAFormat(
                {} as PrinterState,
                { getEstimatedTimeETA: eta },
                {} as any,
                { 'gui/getHours12Format': false },
            )).toBe('16:05')
        })
    })

    describe('getExtruders', () => {
        it('returns extruder objects from state', () => {
            state.extruder = { temperature: 200 } as any
            state.configfile = {
                settings: {
                    extruder: {
                        filament_diameter: 1.75,
                        min_extrude_temp: 170,
                        nozzle_diameter: 0.4,
                        max_extrude_only_distance: 50,
                    },
                },
            } as any
            const result = (getters as any).getExtruders(state)
            expect(result).toHaveLength(1)
            expect(result[0].key).toBe('extruder')
            expect(result[0].filamentDiameter).toBe(1.75)
            expect(result[0].nozzleDiameter).toBe(0.4)
        })
    })

    describe('getKinematics', () => {
        it('returns kinematics from configfile settings', () => {
            state.configfile = { settings: { printer: { kinematics: 'corexy' } } } as any
            expect((getters as any).getKinematics(state)).toBe('corexy')
        })

        it('returns false when no configfile', () => {
            expect((getters as any).getKinematics(state)).toBe(false)
        })

        it('returns none when no kinematics in config', () => {
            state.configfile = { settings: { printer: {} } } as any
            expect((getters as any).getKinematics(state)).toBe('none')
        })
    })

    describe('existsQGL', () => {
        it('returns true when quad_gantry_level exists in config', () => {
            state.configfile = { settings: { quad_gantry_level: {} } } as any
            expect((getters as any).existsQGL(state)).toBe(true)
        })

        it('returns false when no configfile settings', () => {
            expect((getters as any).existsQGL(state)).toBe(false)
        })
    })
})
