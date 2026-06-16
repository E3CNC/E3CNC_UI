import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mutations } from '@/store/printer/tempHistory/mutations'
import { actions } from '@/store/printer/tempHistory/actions'
import { getters } from '@/store/printer/tempHistory/getters'
import { getDefaultState } from '@/store/printer/tempHistory/index'
import type { PrinterTempHistoryState, PrinterTempHistoryStateSerie } from '@/store/printer/tempHistory/types'

vi.mock('@/store/variables', () => ({
    colorArray: ['#F44336', '#8e379d', '#03DAC5', '#3F51B5', '#ffde03', '#009688', '#E91E63'],
    colorHeaterBed: '#2196F3',
    colorChamber: '#4CAF50',
    datasetInterval: 1000,
    datasetTypes: ['temperature', 'target', 'power', 'speed'],
    datasetTypesInPercents: ['power', 'speed'],
}))

const mockSocket = vi.hoisted(() => ({
    emit: vi.fn(),
    emitAndWait: vi.fn(),
}))

vi.mock('@/store/runtime', () => ({
    getSocket: () => mockSocket,
}))

const createSerie = (name: string, overrides: Partial<PrinterTempHistoryStateSerie> = {}): PrinterTempHistoryStateSerie => ({
    id: 1,
    color: '#FF0000',
    type: 'line',
    name,
    yAxisIndex: 0,
    encode: { x: 'date', y: name },
    animation: false,
    lineStyle: { color: '#FF0000', width: 2, opacity: 0.9 },
    showSymbol: false,
    emphasis: { lineStyle: { color: '#FF0000', width: 2, opacity: 0.9 } },
    ...overrides,
})

const createSourceEntry = (date: Date, values: Record<string, number | null> = {}) => ({
    date,
    ...values,
})

describe('printer tempHistory store', () => {
    let state: PrinterTempHistoryState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    describe('mutations', () => {
        it('reset restores defaults', () => {
            state.source = [{ date: new Date() }]
            state.series = [{ id: 1, name: 'extruder-temperature' } as any]
            mutations.reset(state)
            expect(state.source).toEqual([])
            expect(state.series).toEqual([])
            expect(state.timeLastUpdate).toBeNull()
            expect(state.updateSourceInterval).toBeNull()
        })

        it('setInitSource sets the source array', () => {
            const source = [{ date: new Date(), 'extruder-temperature': 200 }]
            mutations.setInitSource(state, source)
            expect(state.source).toEqual(source)
        })

        it('setInitSeries sets the series array', () => {
            const series = [{ id: 1, name: 'extruder-temperature' } as any]
            mutations.setInitSeries(state, series)
            expect(state.series).toEqual(series)
        })

        it('addToSource appends data and enforces maxHistory', () => {
            const source = [
                { date: new Date(1000) },
                { date: new Date(2000) },
            ]
            state.source = source
            mutations.addToSource(state, {
                data: { date: new Date(3000) },
                maxHistory: 2,
            })
            expect(state.source).toHaveLength(2)
            expect(state.source[0].date).toEqual(new Date(2000))
            expect(state.source[1].date).toEqual(new Date(3000))
        })

        it('saveLastDate saves the timestamp', () => {
            mutations.saveLastDate(state, 12345)
            expect(state.timeLastUpdate).toBe(12345)
        })

        it('setUpdateSourceInterval saves the interval id', () => {
            const interval = setInterval(() => { }, 1000)
            mutations.setUpdateSourceInterval(state, interval)
            expect(state.updateSourceInterval).toBe(interval)
            clearInterval(interval)
        })

        it('setColor updates color on matching series', () => {
            state.series = [
                createSerie('extruder-temperature', { id: 1 }),
                createSerie('extruder-target', { id: 2, areaStyle: { color: '#FF0000', opacity: 0.1 }, emphasis: { lineStyle: { color: '#FF0000', width: 2, opacity: 0.9 }, areaStyle: { color: '#FF0000', opacity: 0.1 } } }),
                createSerie('heater_bed-temperature', { id: 3 }),
            ]
            mutations.setColor(state, { name: 'extruder', value: '#00FF00' })
            // extruder-temperature should be updated
            expect(state.series[0].color).toBe('#00FF00')
            expect(state.series[0].lineStyle.color).toBe('#00FF00')
            // extruder-target should also be updated
            expect(state.series[1].color).toBe('#00FF00')
            expect(state.series[1].lineStyle.color).toBe('#00FF00')
            expect(state.series[1].areaStyle?.color).toBe('#00FF00')
            // heater_bed-temperature should NOT be updated
            expect(state.series[2].color).toBe('#FF0000')
        })

        it('setColor handles missing areaStyle gracefully', () => {
            state.series = [
                createSerie('extruder-target', { id: 1 }),
            ]
            mutations.setColor(state, { name: 'extruder', value: '#00FF00' })
            expect(state.series[0].color).toBe('#00FF00')
        })
    })

    describe('actions', () => {
        it('reset clears interval and commits reset', () => {
            const interval = setInterval(() => { }, 1000)
            state.updateSourceInterval = interval as any
            const commit = vi.fn()
            actions.reset({ commit, state } as any)
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('init dispatches reset, builds source/series, and sets update interval', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const rootGetters = {
                'printer/getAvailableHeaters': ['extruder', 'heater_bed'],
                'printer/getAvailableSensors': ['extruder', 'temperature_sensor chamber'],
                'printer/getAvailableMonitors': [],
                'printer/tempHistory/getTemperatureStoreSize': 5,
                'gui/getDatasetValue': vi.fn(() => null),
            }
            await (actions as any).init({ commit, rootGetters, dispatch, state }, {
                extruder: {
                    temperatures: [200, 210, 220],
                    targets: [0, 180, 180],
                    powers: [0, 0.5, 0.5],
                },
                'temperature_sensor chamber': { temperatures: [25, 26, 27] },
            })
            expect(dispatch).toHaveBeenCalledWith('reset')
            expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'printer/initTempHistory', { root: true })
            expect(commit).toHaveBeenNthCalledWith(1, 'setInitSource', expect.any(Array))
            expect(commit).toHaveBeenNthCalledWith(2, 'setInitSeries', expect.any(Array))
            expect(commit).toHaveBeenNthCalledWith(3, 'setUpdateSourceInterval', expect.anything())
        })

        it('init handles empty payload gracefully', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const rootGetters = {
                'printer/getAvailableHeaters': [],
                'printer/getAvailableSensors': [],
                'printer/getAvailableMonitors': [],
                'printer/tempHistory/getTemperatureStoreSize': 5,
            }
            await (actions as any).init({ commit, rootGetters, dispatch, state }, undefined)
            expect(dispatch).toHaveBeenCalledWith('reset')
            expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'printer/initTempHistory', { root: true })
            // Should not call setInitSource when payload is undefined
            expect(commit).not.toHaveBeenCalledWith('setInitSource', expect.anything())
        })

        it('init filters out sensors starting with underscore', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const rootGetters = {
                'printer/getAvailableHeaters': [],
                'printer/getAvailableSensors': ['extruder', 'temperature_sensor _internal'],
                'printer/getAvailableMonitors': [],
                'printer/tempHistory/getTemperatureStoreSize': 5,
                'gui/getDatasetValue': vi.fn(() => null),
            }
            await (actions as any).init({ commit, rootGetters, dispatch, state }, {
                extruder: { temperatures: [200], targets: [0], powers: [0] },
                'temperature_sensor _internal': { temperatures: [30] },
            })
            expect(commit).toHaveBeenCalledWith('setInitSource', expect.any(Array))
        })

        it('setColor commits the payload', () => {
            const commit = vi.fn()
            actions.setColor({ commit } as any, { name: 'extruder', value: '#00FF00' })
            expect(commit).toHaveBeenCalledWith('setColor', { name: 'extruder', value: '#00FF00' })
        })
    })

    describe('getters', () => {
        describe('getSeries', () => {
            it('finds a series by name', () => {
                state.series = [createSerie('extruder-temperature', { id: 1 })]
                const result = (getters as any).getSeries(state)('extruder-temperature')
                expect(result).toBeDefined()
                expect(result.id).toBe(1)
            })

            it('returns undefined when not found', () => {
                const result = (getters as any).getSeries(state)('nonexistent')
                expect(result).toBeUndefined()
            })
        })

        describe('getDatasetColor', () => {
            it('returns color from matching series', () => {
                state.series = [createSerie('extruder-temperature', { id: 1, color: '#00FF00', lineStyle: { color: '#00FF00', width: 2, opacity: 0.9 } })]
                const result = (getters as any).getDatasetColor(state, { getSeries: (getters as any).getSeries(state) })('extruder')
                expect(result).toBe('#00FF00')
            })

            it('returns null when series not found', () => {
                const result = (getters as any).getDatasetColor(state, { getSeries: (getters as any).getSeries(state) })('nonexistent')
                expect(result).toBeNull()
            })
        })

        describe('getSerieNames', () => {
            it('returns attribute names for a given sensor', () => {
                state.series = [
                    createSerie('extruder-temperature', { id: 1 }),
                    createSerie('extruder-target', { id: 2 }),
                    createSerie('extruder-power', { id: 3 }),
                    createSerie('heater_bed-temperature', { id: 4 }),
                ]
                const result = (getters as any).getSerieNames(state)('extruder')
                expect(result).toEqual(['temperature', 'target', 'power'])
            })

            it('returns empty array when no matches', () => {
                expect((getters as any).getSerieNames(state)('nonexistent')).toEqual([])
            })
        })

        describe('getBoolDisplayPwmAxis', () => {
            it('returns true when a power/speed legend is selected', () => {
                const result = (getters as any).getBoolDisplayPwmAxis(state, { getSelectedLegends: { 'extruder-power': true, 'extruder-temperature': true } })
                expect(result).toBe(true)
            })

            it('returns false when no power/speed legends selected', () => {
                const result = (getters as any).getBoolDisplayPwmAxis(state, { getSelectedLegends: { 'extruder-temperature': true } })
                expect(result).toBe(false)
            })
        })

        describe('getAvg', () => {
            it('calculates average over the last minute for non-temperature series', () => {
                const now = Date.now()
                state.source = [
                    createSourceEntry(new Date(now - 30000), { 'extruder-target': 180 }),
                    createSourceEntry(new Date(now - 10000), { 'extruder-target': 200 }),
                ]
                const result = (getters as any).getAvg(state)('extruder', 'target')
                expect(result).toBe(190)
            })

            it('returns 0 when no source data within time range', () => {
                expect((getters as any).getAvg(state)('extruder', 'temperature')).toBe(0)
            })

            it('multiplies by 100 for percent datasets (power, speed)', () => {
                const now = Date.now()
                state.source = [
                    createSourceEntry(new Date(now - 10000), { 'extruder-power': 0.5 }),
                ]
                const result = (getters as any).getAvg(state)('extruder', 'power')
                expect(result).toBe(50)
            })
        })

        describe('getAvgPower', () => {
            it('delegates to getAvg with "power" type', () => {
                const mockGetAvg = vi.fn(() => 42)
                const result = (getters as any).getAvgPower(state, { getAvg: mockGetAvg })('extruder')
                expect(mockGetAvg).toHaveBeenCalledWith('extruder', 'power')
                expect(result).toBe(42)
            })
        })

        describe('getAvgSpeed', () => {
            it('delegates to getAvg with "speed" type', () => {
                const mockGetAvg = vi.fn(() => 75)
                const result = (getters as any).getAvgSpeed(state, { getAvg: mockGetAvg })('extruder')
                expect(mockGetAvg).toHaveBeenCalledWith('extruder', 'speed')
                expect(result).toBe(75)
            })
        })

        describe('getTemperatureStoreSize', () => {
            it('returns config value when available', () => {
                const rootGetters = { 'server/getConfig': vi.fn(() => 2400) }
                const result = (getters as any).getTemperatureStoreSize(state, {}, {}, rootGetters)
                expect(result).toBe(2400)
            })

            it('defaults to 1200', () => {
                const rootGetters = { 'server/getConfig': vi.fn(() => undefined) }
                const result = (getters as any).getTemperatureStoreSize(state, {}, {}, rootGetters)
                expect(result).toBe(1200)
            })
        })

        describe('getHostMcuSensors', () => {
            it('filters sensors to temperature_mcu and temperature_host types', () => {
                const rootState = {
                    printer: {
                        configfile: {
                            settings: {
                                'temperature_sensor mcu_temp': { sensor_type: 'temperature_mcu' },
                                'temperature_sensor host_temp': { sensor_type: 'temperature_host' },
                                'temperature_sensor other': { sensor_type: 'something_else' },
                            },
                        },
                        heaters: {
                            available_heaters: [],
                            available_sensors: ['temperature_sensor mcu_temp', 'temperature_sensor host_temp', 'temperature_sensor other'],
                        },
                    },
                }
                const result = (getters as any).getHostMcuSensors(state, {}, rootState)
                expect(result).toEqual(['temperature_sensor mcu_temp', 'temperature_sensor host_temp'])
            })

            it('excludes heaters', () => {
                const rootState = {
                    printer: {
                        configfile: { settings: { extruder: { sensor_type: 'temperature_mcu' } } },
                        heaters: { available_heaters: ['extruder'], available_sensors: ['extruder'] },
                    },
                }
                const result = (getters as any).getHostMcuSensors(state, {}, rootState)
                expect(result).toEqual([])
            })

            it('excludes temperature_fan', () => {
                const rootState = {
                    printer: {
                        configfile: { settings: { 'temperature_fan fan1': { sensor_type: 'temperature_mcu' } } },
                        heaters: { available_heaters: [], available_sensors: ['temperature_fan fan1'] },
                    },
                }
                const result = (getters as any).getHostMcuSensors(state, {}, rootState)
                expect(result).toEqual([])
            })
        })

        describe('getSelectedLegends', () => {
            it('returns defaults for series without view settings', () => {
                state.series = [createSerie('extruder-temperature', { id: 1 })]
                const rootState = {
                    printer: { heaters: { available_sensors: ['extruder'], available_monitors: [] } },
                    gui: { view: { tempchart: { datasetSettings: {} } } },
                }
                const result = (getters as any).getSelectedLegends(state, {}, rootState, {})
                expect(result['extruder-temperature']).toBe(true)
            })

            it('defaults power/speed series to hidden', () => {
                state.series = [createSerie('extruder-power', { id: 1 })]
                const rootState = {
                    printer: { heaters: { available_sensors: ['extruder'], available_monitors: [] } },
                    gui: { view: { tempchart: { datasetSettings: {} } } },
                }
                const result = (getters as any).getSelectedLegends(state, {}, rootState, {})
                expect(result['extruder-power']).toBe(false)
            })

            it('respects view settings for series visibility', () => {
                state.series = [createSerie('extruder-temperature', { id: 1 })]
                const rootState = {
                    printer: { heaters: { available_sensors: ['extruder'], available_monitors: [] } },
                    gui: {
                        view: {
                            tempchart: {
                                datasetSettings: { extruder: { temperature: false } },
                                hideMcuHostSensors: false,
                                hideMonitors: false,
                            },
                        },
                    },
                }
                const result = (getters as any).getSelectedLegends(state, {}, rootState, {})
                expect(result['extruder-temperature']).toBe(false)
            })

            it('hides MCU/Host sensors when option is set', () => {
                state.series = [createSerie('temperature_sensor mcu_temp-temperature', { id: 1 })]
                const rootState = {
                    printer: {
                        configfile: { settings: { 'temperature_sensor mcu_temp': { sensor_type: 'temperature_mcu' } } },
                        heaters: { available_heaters: [], available_sensors: ['temperature_sensor mcu_temp'], available_monitors: [] },
                    },
                    gui: {
                        view: {
                            tempchart: {
                                datasetSettings: {},
                                hideMcuHostSensors: true,
                                hideMonitors: false,
                            },
                        },
                    },
                }
                const mockGetters = {
                    getHostMcuSensors: ['temperature_sensor mcu_temp'],
                }
                const result = (getters as any).getSelectedLegends(state, mockGetters, rootState, {})
                expect(result['temperature_sensor mcu_temp-temperature']).toBe(false)
            })

            it('hides monitors when option is set', () => {
                state.series = [createSerie('monitor1-temperature', { id: 1 })]
                const rootState = {
                    printer: {
                        configfile: { settings: {} },
                        heaters: { available_heaters: [], available_sensors: [], available_monitors: ['monitor1'] },
                    },
                    gui: {
                        view: {
                            tempchart: {
                                datasetSettings: {},
                                hideMcuHostSensors: false,
                                hideMonitors: true,
                            },
                        },
                    },
                }
                const result = (getters as any).getSelectedLegends(state, {}, rootState, {})
                expect(result['monitor1-temperature']).toBe(false)
            })
        })
    })
})
