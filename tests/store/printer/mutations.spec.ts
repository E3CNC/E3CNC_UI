import { describe, it, expect, beforeEach } from 'vitest'
import { mutations } from '@/store/printer/mutations'
import { getDefaultState } from '@/store/printer/index'
import type { PrinterState } from '@/store/printer/types'

describe('printer mutations', () => {
    let state: PrinterState

    beforeEach(() => {
        state = getDefaultState()
    })

    it('reset removes non-default keys while preserving tempHistory', () => {
        state.extruder = { temperature: 200 }
        state.tempHistory = {} as any
        mutations.reset(state)
        expect(state.extruder).toBeUndefined()
        expect(state).toHaveProperty('tempHistory')
    })

    it('setData sets primitive values directly', () => {
        mutations.setData(state, { app_name: 'Klipper', software_version: 'v0.12.0' })
        expect(state.app_name).toBe('Klipper')
        expect(state.software_version).toBe('v0.12.0')
    })

    it('setData deeply merges nested objects when key exists', () => {
        state.print_stats = { state: 'printing', filename: 'test.gcode' }
        mutations.setData(state, { print_stats: { state: 'paused' } })
        expect(state.print_stats.state).toBe('paused')
        expect(state.print_stats.filename).toBe('test.gcode')
    })

    it('setData replaces object entirely when key does not exist in state', () => {
        mutations.setData(state, { extruder: { temperature: 200, target: 0 } })
        expect(state.extruder).toEqual({ temperature: 200, target: 0 })
    })

    it('setData handles null value', () => {
        mutations.setData(state, { app_name: null })
        expect(state.app_name).toBeNull()
    })

    it('clearCurrentFile resets current_file to empty object', () => {
        state.current_file = { filename: 'test.gcode' } as any
        mutations.clearCurrentFile(state)
        expect(state.current_file).toEqual({})
    })

    it('setEndstopStatus stores endstops after removing requestParams', () => {
        const payload = { endstops: { x: 'TRIGGERED' }, requestParams: {} }
        mutations.setEndstopStatus(state, payload)
        expect(state.endstops).toEqual({ endstops: { x: 'TRIGGERED' } })
    })

    it('removeBedMeshProfile deletes the named profile', () => {
        state.bed_mesh = {
            profile_name: 'default',
            profiles: {
                default: { points: [[0, 0, 0]] },
                other: { points: [[1, 1, 0]] },
            },
        } as any
        mutations.removeBedMeshProfile(state, 'default')
        expect(state.bed_mesh.profiles.default).toBeUndefined()
        expect(state.bed_mesh.profiles.other).toBeDefined()
        expect(state.bed_mesh.profile_name).toBe('')
    })

    it('removeBedMeshProfile does nothing when profile does not exist', () => {
        state.bed_mesh = {
            profile_name: 'default',
            profiles: { default: { points: [[0, 0, 0]] } },
        } as any
        mutations.removeBedMeshProfile(state, 'nonexistent')
        expect(state.bed_mesh.profiles.default).toBeDefined()
        expect(state.bed_mesh.profile_name).toBe('default')
    })

    it('removeBedMeshProfile handles missing bed_mesh state', () => {
        mutations.removeBedMeshProfile(state, 'default')
        expect(state.bed_mesh).toBeUndefined()
    })
})
