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
            expect(
                (getters as any).getEstimatedTimeETAFormat(
                    {} as PrinterState,
                    { getEstimatedTimeETA: eta },
                    {} as any,
                    { 'gui/getHours12Format': false }
                )
            ).toBe('--')
        })

        it('formats time in 24-hour mode', () => {
            vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 0))
            const eta = new Date(2024, 0, 1, 16, 5, 0).getTime()
            expect(
                (getters as any).getEstimatedTimeETAFormat(
                    {} as PrinterState,
                    { getEstimatedTimeETA: eta },
                    {} as any,
                    { 'gui/getHours12Format': false }
                )
            ).toBe('16:05')
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

    describe('existsDeltaCalibrate', () => {
        it('returns true when delta_calibrate exists in config', () => {
            state.configfile = { settings: { delta_calibrate: {} } } as any
            expect((getters as any).existsDeltaCalibrate(state)).toBe(true)
        })

        it('returns false when no configfile settings', () => {
            expect((getters as any).existsDeltaCalibrate(state)).toBe(false)
        })
    })

    describe('existsFirmwareRetraction', () => {
        it('returns true when firmware_retraction exists in config', () => {
            state.configfile = { settings: { firmware_retraction: {} } } as any
            expect((getters as any).existsFirmwareRetraction(state)).toBe(true)
        })

        it('returns false when no configfile settings', () => {
            expect((getters as any).existsFirmwareRetraction(state)).toBe(false)
        })
    })

    describe('getPrintCurrentLayer', () => {
        it('returns current_layer from print_stats.info', () => {
            state.print_stats = { info: { current_layer: 5 }, print_duration: 100 } as any
            expect((getters as any).getPrintCurrentLayer(state, { getPrintMaxLayers: 50 })).toBe(5)
        })

        it('calculates from gcode position when print_duration > 0', () => {
            state.print_stats = { print_duration: 100 } as any
            state.current_file = { first_layer_height: 0.2, layer_height: 0.1 } as any
            state.gcode_move = { gcode_position: [0, 0, 0.5] } as any
            expect((getters as any).getPrintCurrentLayer(state, { getPrintMaxLayers: 50 })).toBe(4)
        })

        it('caps at max layers', () => {
            state.print_stats = { print_duration: 100 } as any
            state.current_file = { first_layer_height: 0.2, layer_height: 0.1 } as any
            state.gcode_move = { gcode_position: [0, 0, 100] } as any
            expect((getters as any).getPrintCurrentLayer(state, { getPrintMaxLayers: 5 })).toBe(5)
        })

        it('returns 0 when no data available', () => {
            expect((getters as any).getPrintCurrentLayer(state, { getPrintMaxLayers: 0 })).toBe(0)
        })
    })

    describe('getAvailableHeaters', () => {
        it('returns available heaters list', () => {
            state.heaters = { available_heaters: ['extruder', 'heater_bed'] } as any
            expect((getters as any).getAvailableHeaters(state)).toEqual(['extruder', 'heater_bed'])
        })

        it('returns empty array when no heaters', () => {
            expect((getters as any).getAvailableHeaters(state)).toEqual([])
        })
    })

    describe('getAvailableSensors', () => {
        it('returns available sensors list', () => {
            state.heaters = { available_sensors: ['extruder', 'temperature_sensor chamber'] } as any
            expect((getters as any).getAvailableSensors(state)).toEqual(['extruder', 'temperature_sensor chamber'])
        })
    })

    describe('getAvailableMonitors', () => {
        it('returns available monitors list', () => {
            state.heaters = { available_monitors: ['monitor1'] } as any
            expect((getters as any).getAvailableMonitors(state)).toEqual(['monitor1'])
        })
    })

    describe('getFilamentSensors', () => {
        it('returns filament sensor objects from state', () => {
            state['filament_switch_sensor my_sensor'] = {
                enabled: true,
                filament_detected: true,
                Diameter: 1.75,
            } as any
            const result = (getters as any).getFilamentSensors(state)
            expect(result).toHaveLength(1)
            expect(result[0].name).toBe('my_sensor')
            expect(result[0].filament_detected).toBe(true)
        })

        it('returns empty when no sensors', () => {
            expect((getters as any).getFilamentSensors(state)).toEqual([])
        })
    })

    describe('getPrinterObject', () => {
        it('returns state object by name', () => {
            state.extruder = { temperature: 200 } as any
            expect((getters as any).getPrinterObject(state)('extruder')).toEqual({ temperature: 200 })
        })

        it('returns null when object not found', () => {
            expect((getters as any).getPrinterObject(state)('nonexistent')).toBeNull()
        })
    })

    describe('getPrinterConfigObjects', () => {
        it('returns matching config settings', () => {
            state.configfile = {
                settings: {
                    extruder: { heater_pin: 'PA0' },
                    'gcode_macro START_PRINT': { gcode_filename: 'start.gcode' },
                    heater_bed: { heater_pin: 'PB0' },
                },
            } as any
            const result = (getters as any).getPrinterConfigObjects(state)(['extruder', 'heater_bed'])
            expect(result).toEqual({
                extruder: { heater_pin: 'PA0' },
                heater_bed: { heater_pin: 'PB0' },
            })
        })

        it('returns empty object when no settings', () => {
            state.configfile = { settings: null } as any
            expect((getters as any).getPrinterConfigObjects(state)(['extruder'])).toEqual({})
        })
    })

    describe('getExtruderSteppers', () => {
        it('returns extruder stepper objects from settings', () => {
            state.configfile = {
                settings: {
                    'extruder_stepper my_stepper': { extruder: 'extruder' },
                },
            } as any
            const result = (getters as any).getExtruderSteppers(state)
            expect(result).toHaveLength(1)
            expect(result[0].key).toBe('extruder_stepper my_stepper')
            expect(result[0].name).toBe('my_stepper')
        })

        it('returns empty when no settings', () => {
            expect((getters as any).getExtruderSteppers(state)).toEqual([])
        })
    })

    describe('getExtrudePossible', () => {
        it('returns can_extrude from current extruder', () => {
            state.toolhead = { extruder: 'extruder' } as any
            state.extruder = { can_extrude: true } as any
            expect((getters as any).getExtrudePossible(state)).toBe(true)
        })

        it('defaults to false', () => {
            expect((getters as any).getExtrudePossible(state)).toBe(false)
        })
    })

    describe('getMaxTemp', () => {
        it('finds and returns the highest max_temp + 10', () => {
            state.heaters = { available_sensors: ['extruder', 'heater_bed'] } as any
            state.configfile = {
                settings: {
                    extruder: { max_temp: 300 },
                    heater_bed: { max_temp: 120 },
                },
            } as any
            expect((getters as any).getMaxTemp(state)).toBe(310)
        })

        it('ignores max_temp >= 10000', () => {
            state.heaters = { available_sensors: ['extruder'] } as any
            state.configfile = { settings: { extruder: { max_temp: 99999 } } } as any
            expect((getters as any).getMaxTemp(state)).toBe(300)
        })

        it('returns default 300 when no heaters', () => {
            expect((getters as any).getMaxTemp(state)).toBe(300)
        })
    })

    describe('checkNecessaryConfig', () => {
        it('returns missing modules', () => {
            state.configfile = { config: {} } as any
            const result = (getters as any).checkNecessaryConfig(state, { checkConfig: () => false })
            expect(result.length).toBeGreaterThan(0)
        })

        it('returns empty when all present', () => {
            state.configfile = { config: {} } as any
            const result = (getters as any).checkNecessaryConfig(state, { checkConfig: () => true })
            expect(result).toEqual([])
        })
    })

    describe('getEstimatedTimeFile', () => {
        it('calculates estimated time from print percent', () => {
            state.print_stats = { print_duration: 100 } as any
            const result = (getters as any).getEstimatedTimeFile(state, { getPrintPercent: 0.5 })
            expect(parseInt(result)).toBe(100)
        })

        it('returns 0 when print_duration is 0', () => {
            state.print_stats = { print_duration: 0 } as any
            expect((getters as any).getEstimatedTimeFile(state, { getPrintPercent: 0 })).toBe(0)
        })
    })

    describe('getEstimatedTimeFilament', () => {
        it('calculates from filament usage ratio', () => {
            state.print_stats = { print_duration: 100, filament_used: 500 } as any
            state.current_file = { filament_total: 2000 } as any
            const result = (getters as any).getEstimatedTimeFilament(state)
            expect(parseInt(result)).toBe(300)
        })

        it('returns 0 when conditions not met', () => {
            expect((getters as any).getEstimatedTimeFilament(state)).toBe(0)
        })
    })

    describe('getEstimatedTimeSlicer', () => {
        it('calculates from slicer estimated_time', () => {
            state.print_stats = { print_duration: 100 } as any
            state.current_file = { estimated_time: 500 } as any
            const result = (getters as any).getEstimatedTimeSlicer(state)
            expect(parseInt(result)).toBe(400)
        })

        it('returns 0 when conditions not met', () => {
            expect((getters as any).getEstimatedTimeSlicer(state)).toBe(0)
        })
    })

    describe('getEstimatedTimeAvg', () => {
        it('returns average of file and filament estimates', () => {
            const moduleGetters = {
                getEstimatedTimeFile: '200',
                getEstimatedTimeFilament: '400',
            }
            const rootState = { gui: { general: { calcEstimateTime: ['file', 'filament'] } } }
            expect((getters as any).getEstimatedTimeAvg(state, moduleGetters, rootState)).toBe(300)
        })

        it('returns 0 when no calc methods active', () => {
            const rootState = { gui: { general: { calcEstimateTime: [] } } }
            expect(
                (getters as any).getEstimatedTimeAvg(
                    state,
                    { getEstimatedTimeFile: 0, getEstimatedTimeFilament: 0 },
                    rootState
                )
            ).toBe(0)
        })
    })

    describe('getEstimatedTimeETA', () => {
        it('calculates future ETA timestamp', () => {
            const now = Date.now()
            const moduleGetters = {
                getEstimatedTimeFile: '3600',
                getEstimatedTimeFilament: '0',
                getEstimatedTimeSlicer: '0',
            }
            const rootState = { gui: { general: { calcEtaTime: ['file'] } } }
            const result = (getters as any).getEstimatedTimeETA(state, moduleGetters, rootState)
            expect(result).toBeGreaterThan(now)
        })

        it('returns 0 when no calc methods active', () => {
            const rootState = { gui: { general: { calcEtaTime: [] } } }
            expect(
                (getters as any).getEstimatedTimeETA(
                    state,
                    { getEstimatedTimeFile: 0, getEstimatedTimeFilament: 0, getEstimatedTimeSlicer: 0 },
                    rootState
                )
            ).toBe(0)
        })
    })

    describe('getEstimatedTimeETAFormat', () => {
        it('formats time in 12-hour mode with AM/PM', () => {
            vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 0))
            const eta = new Date(2024, 0, 1, 14, 30, 0).getTime()
            expect(
                (getters as any).getEstimatedTimeETAFormat(
                    {} as PrinterState,
                    { getEstimatedTimeETA: eta },
                    {} as any,
                    { 'gui/getHours12Format': true }
                )
            ).toBe('02:30 PM')
        })

        it('shows +1 when ETA is next day', () => {
            vi.setSystemTime(new Date(2024, 0, 1, 23, 0, 0))
            const eta = new Date(2024, 0, 2, 1, 0, 0).getTime()
            expect(
                (getters as any).getEstimatedTimeETAFormat(
                    {} as PrinterState,
                    { getEstimatedTimeETA: eta },
                    {} as any,
                    { 'gui/getHours12Format': false }
                )
            ).toBe('01:00 +1')
        })

        it('returns -- when ETA is not in the future', () => {
            vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 0))
            const eta = new Date(2024, 0, 1, 9, 0, 0).getTime()
            expect(
                (getters as any).getEstimatedTimeETAFormat(
                    {} as PrinterState,
                    { getEstimatedTimeETA: eta },
                    {} as any,
                    { 'gui/getHours12Format': false }
                )
            ).toBe('--')
        })
    })
})
