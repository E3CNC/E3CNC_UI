import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mutations } from '@/store/server/sensor/mutations'
import { actions } from '@/store/server/sensor/actions'
import { getters } from '@/store/server/sensor/getters'
import { getDefaultState } from '@/store/server/sensor/index'
import type { ServerSensorState } from '@/store/server/sensor/types'

const mockSocket = vi.hoisted(() => ({
    emit: vi.fn(),
}))
const mockToast = vi.hoisted(() => ({
    error: vi.fn(),
    success: vi.fn(),
}))

vi.mock('@/store/runtime', () => ({
    getSocket: () => mockSocket,
    $toast: mockToast,
}))

describe('server sensor store', () => {
    let state: ServerSensorState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    describe('mutations', () => {
        it('reset restores defaults', () => {
            state.sensors = { temp1: { friendly_name: 'temp1', id: 't1', type: 'temperature', values: {} } }
            mutations.reset(state)
            expect(state.sensors).toEqual({})
        })

        it('setSensors replaces sensors', () => {
            const sensors = {
                temp1: { friendly_name: 'temp1', id: 't1', type: 'temperature', values: { value: 25 } },
            }
            mutations.setSensors(state, sensors)
            expect(state.sensors).toEqual(sensors)
        })

        it('updateSensor updates values of existing sensor', () => {
            state.sensors = { temp1: { friendly_name: 'temp1', id: 't1', type: 'temperature', values: { value: 25 } } }
            mutations.updateSensor(state, { key: 'temp1', value: { value: 30 } })
            expect(state.sensors.temp1.values).toEqual({ value: 30 })
        })

        it('updateSensor does nothing for unknown sensor', () => {
            state.sensors = {}
            mutations.updateSensor(state, { key: 'unknown', value: { value: 10 } })
            expect(state.sensors).toEqual({})
        })
    })

    describe('actions', () => {
        it('reset delegates to commit', () => {
            const commit = vi.fn()
            actions.reset({ commit } as any)
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('init emits sensors list request', () => {
            actions.init()
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.sensors.list',
                {},
                { action: 'server/sensor/getSensors' }
            )
        })

        it('getSensors commits sensors and removes init module', () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const payload = {
                sensors: { temp1: { friendly_name: 'temp1', id: 't1', type: 'temperature', values: {} } },
            }
            actions.getSensors({ commit, dispatch } as any, payload)
            expect(commit).toHaveBeenCalledWith('setSensors', payload.sensors)
            expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'server/sensor/init', { root: true })
        })

        it('updateSensors commits each sensor update', () => {
            const commit = vi.fn()
            const payload = { temp1: { value: 30 }, temp2: { value: 25 } }
            actions.updateSensors({ commit } as any, payload)
            expect(commit).toHaveBeenCalledWith('updateSensor', { key: 'temp1', value: { value: 30 } })
            expect(commit).toHaveBeenCalledWith('updateSensor', { key: 'temp2', value: { value: 25 } })
        })
    })

    describe('getters', () => {
        it('getSensors returns keys of sensors object', () => {
            state.sensors = {
                temp1: { friendly_name: 'temp1', id: 't1', type: 'temperature', values: {} },
                temp2: { friendly_name: 'temp2', id: 't2', type: 'temperature', values: {} },
            }
            const result = (getters as any).getSensors(state)
            expect(result).toEqual(['temp1', 'temp2'])
        })

        it('getSensors returns empty array when no sensors', () => {
            const result = (getters as any).getSensors(state)
            expect(result).toEqual([])
        })
    })
})
