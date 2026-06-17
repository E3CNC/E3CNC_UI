import { describe, it, expect, beforeEach, vi } from 'vitest'
import { actions } from '@/store/socket/actions'
import { getDefaultState } from '@/store/socket/index'
import type { SocketState } from '@/store/socket/types'

const mockSocketInstance = vi.hoisted(() => ({
    close: vi.fn(),
    setUrl: vi.fn(),
    connect: vi.fn(),
}))

const mockSocket = vi.hoisted(() => ({
    getSocket: () => mockSocketInstance,
}))

vi.mock('@/store/runtime', () => mockSocket)

describe('socket actions', () => {
    let state: SocketState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    it('reset clears connection and loading state', () => {
        const commit = vi.fn()
        actions.reset({ commit } as any)
        expect(commit).toHaveBeenCalledWith('setDisconnected')
        expect(commit).toHaveBeenCalledWith('clearLoadings')
        expect(commit).toHaveBeenCalledWith('reset')
    })

    it('setData delegates to commit', () => {
        const commit = vi.fn()
        actions.setData({ commit } as any, { hostname: 'newhost' })
        expect(commit).toHaveBeenCalledWith('setData', { hostname: 'newhost' })
    })

    it('setSocket commits data and connects', async () => {
        const commit = vi.fn()
        state.protocol = 'ws'
        await actions.setSocket({ commit, state } as any, {
            hostname: 'myprinter',
            port: 7125,
            path: '/mainsail',
        })
        expect(commit).toHaveBeenCalledWith('setData', {
            hostname: 'myprinter',
            port: 7125,
            path: '/mainsail',
        })
        expect(mockSocketInstance.close).toHaveBeenCalled()
        expect(mockSocketInstance.setUrl).toHaveBeenCalledWith('ws://myprinter:7125/mainsail/websocket')
        expect(mockSocketInstance.connect).toHaveBeenCalled()
    })

    it('onOpen sets connected and dispatches server init', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.onOpen({ commit, dispatch, rootState: {} as any } as any)
        expect(commit).toHaveBeenCalledWith('setConnected')
        expect(dispatch).toHaveBeenCalledWith('server/init', null, { root: true })
    })

    it('onClose sets disconnected', () => {
        const commit = vi.fn()
        actions.onClose({ commit } as any)
        expect(commit).toHaveBeenCalledWith('setDisconnected')
    })

    describe('onMessage', () => {
        it('handles notify_status_update', () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            ;(actions.onMessage as any)(
                { commit, dispatch },
                { method: 'notify_status_update', params: [{ extruder: { temperature: 200 } }] }
            )
            expect(dispatch).toHaveBeenCalledWith('printer/getData', { extruder: { temperature: 200 } }, { root: true })
        })

        it('handles notify_gcode_response', () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            ;(actions.onMessage as any)({ commit, dispatch }, { method: 'notify_gcode_response', params: ['ok'] })
            expect(dispatch).toHaveBeenCalledWith('server/addEvent', { result: 'ok', send: false }, { root: true })
        })

        it('handles notify_klippy_ready', () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            ;(actions.onMessage as any)({ commit, dispatch }, { method: 'notify_klippy_ready' })
            expect(commit).toHaveBeenCalledWith('server/setKlippyConnected', null, { root: true })
            expect(dispatch).toHaveBeenCalledWith('server/stopKlippyConnectedInterval', null, { root: true })
            expect(dispatch).toHaveBeenCalledWith('server/stopKlippyStateInterval', null, { root: true })
            expect(dispatch).toHaveBeenCalledWith('printer/init', null, { root: true })
        })

        it('handles notify_klippy_disconnected', () => {
            const dispatch = vi.fn()
            ;(actions.onMessage as any)({ dispatch } as any, { method: 'notify_klippy_disconnected' })
            expect(dispatch).toHaveBeenCalledWith('server/setKlippyDisconnected', null, { root: true })
        })

        it('handles notify_klippy_shutdown', () => {
            const dispatch = vi.fn()
            ;(actions.onMessage as any)({ dispatch } as any, { method: 'notify_klippy_shutdown' })
            expect(dispatch).toHaveBeenCalledWith('server/setKlippyShutdown', null, { root: true })
        })

        it('handles notify_proc_stat_update', () => {
            const dispatch = vi.fn()
            ;(actions.onMessage as any)({ dispatch } as any, {
                method: 'notify_proc_stat_update',
                params: [{ cpu: 12 }],
            })
            expect(dispatch).toHaveBeenCalledWith('server/updateProcStats', { cpu: 12 }, { root: true })
        })

        it('handles notify_cpu_throttled', () => {
            const commit = vi.fn()
            ;(actions.onMessage as any)({ commit } as any, { method: 'notify_cpu_throttled', params: [{ bits: 1 }] })
            expect(commit).toHaveBeenCalledWith('server/setThrottledState', { bits: 1 }, { root: true })
        })

        it('handles notify_filelist_changed', () => {
            const dispatch = vi.fn()
            ;(actions.onMessage as any)({ dispatch } as any, {
                method: 'notify_filelist_changed',
                params: [{ action: 'create_file' }],
            })
            expect(dispatch).toHaveBeenCalledWith('files/filelist_changed', { action: 'create_file' }, { root: true })
        })

        it('handles notify_metadata_update', () => {
            const commit = vi.fn()
            ;(actions.onMessage as any)({ commit } as any, {
                method: 'notify_metadata_update',
                params: [{ filename: 'test.gcode' }],
            })
            expect(commit).toHaveBeenCalledWith('files/setMetadata', { filename: 'test.gcode' }, { root: true })
        })

        it('handles notify_power_changed', () => {
            const commit = vi.fn()
            ;(actions.onMessage as any)({ commit } as any, {
                method: 'notify_power_changed',
                params: [{ device: 'psu' }],
            })
            expect(commit).toHaveBeenCalledWith('server/power/setStatus', { device: 'psu' }, { root: true })
        })

        it('handles notify_update_response', () => {
            const commit = vi.fn()
            ;(actions.onMessage as any)({ commit } as any, {
                method: 'notify_update_response',
                params: [{ message: 'updating' }],
            })
            expect(commit).toHaveBeenCalledWith(
                'server/updateManager/addUpdateResponse',
                { message: 'updating' },
                { root: true }
            )
        })

        it('handles notify_update_refreshed', () => {
            const dispatch = vi.fn()
            ;(actions.onMessage as any)({ dispatch } as any, {
                method: 'notify_update_refreshed',
                params: [{ version_info: {} }],
            })
            expect(dispatch).toHaveBeenCalledWith(
                'server/updateManager/onUpdateStatus',
                { version_info: {} },
                { root: true }
            )
        })

        it('handles notify_history_changed', () => {
            const dispatch = vi.fn()
            ;(actions.onMessage as any)({ dispatch } as any, {
                method: 'notify_history_changed',
                params: [{ action: 'added' }],
            })
            expect(dispatch).toHaveBeenCalledWith('server/history/getChanged', { action: 'added' }, { root: true })
        })

        it('handles notify_service_state_changed', () => {
            const dispatch = vi.fn()
            ;(actions.onMessage as any)({ dispatch } as any, {
                method: 'notify_service_state_changed',
                params: [{ service: 'klipper' }],
            })
            expect(dispatch).toHaveBeenCalledWith('server/serviceStateChanged', { service: 'klipper' }, { root: true })
        })

        it('handles notify_timelapse_event', () => {
            const dispatch = vi.fn()
            ;(actions.onMessage as any)({ dispatch } as any, {
                method: 'notify_timelapse_event',
                params: [{ action: 'newframe' }],
            })
            expect(dispatch).toHaveBeenCalledWith('server/timelapse/getEvent', { action: 'newframe' }, { root: true })
        })

        it('handles notify_job_queue_changed', () => {
            const dispatch = vi.fn()
            ;(actions.onMessage as any)({ dispatch } as any, {
                method: 'notify_job_queue_changed',
                params: [{ action: 'changed' }],
            })
            expect(dispatch).toHaveBeenCalledWith('server/jobQueue/getEvent', { action: 'changed' }, { root: true })
        })

        it('handles notify_announcement_update', () => {
            const dispatch = vi.fn()
            ;(actions.onMessage as any)({ dispatch } as any, {
                method: 'notify_announcement_update',
                params: [{ entries: [] }],
            })
            expect(dispatch).toHaveBeenCalledWith('server/announcements/getList', { entries: [] }, { root: true })
        })

        it('handles notify_sensor_update', () => {
            const dispatch = vi.fn()
            ;(actions.onMessage as any)({ dispatch } as any, {
                method: 'notify_sensor_update',
                params: [{ sensor: { temperature: 25 } }],
            })
            expect(dispatch).toHaveBeenCalledWith(
                'server/sensor/updateSensors',
                { sensor: { temperature: 25 } },
                { root: true }
            )
        })

        it('handles notify_webcams_changed', () => {
            const dispatch = vi.fn()
            ;(actions.onMessage as any)({ dispatch } as any, {
                method: 'notify_webcams_changed',
                params: [{ webcams: [] }],
            })
            expect(dispatch).toHaveBeenCalledWith('gui/webcams/initStore', { webcams: [] }, { root: true })
        })

        it('handles default case with console.debug', () => {
            const spy = vi.spyOn(window.console, 'debug').mockImplementation(() => {})
            ;(actions.onMessage as any)({}, { method: 'unknown_method', params: [] })
            expect(spy).toHaveBeenCalled()
            spy.mockRestore()
        })
    })

    it('addLoading delegates to commit', () => {
        const commit = vi.fn()
        actions.addLoading({ commit } as any, 'homeAll')
        expect(commit).toHaveBeenCalledWith('addLoading', 'homeAll')
    })

    it('removeLoading delegates to commit', () => {
        const commit = vi.fn()
        actions.removeLoading({ commit } as any, 'homeAll')
        expect(commit).toHaveBeenCalledWith('removeLoading', 'homeAll')
    })

    it('clearLoadings delegates to commit', () => {
        const commit = vi.fn()
        actions.clearLoadings({ commit } as any)
        expect(commit).toHaveBeenCalledWith('clearLoadings')
    })

    it('addInitModule delegates to commit', () => {
        const commit = vi.fn()
        actions.addInitModule({ commit } as any, 'server')
        expect(commit).toHaveBeenCalledWith('addInitModule', 'server')
    })

    it('removeInitModule delegates to commit', () => {
        const commit = vi.fn()
        actions.removeInitModule({ commit } as any, 'server/gcode_store')
        expect(commit).toHaveBeenCalledWith('removeInitModule', 'server/gcode_store')
    })

    it('removeInitComponent delegates to commit', () => {
        const commit = vi.fn()
        actions.removeInitComponent({ commit } as any, 'server/')
        expect(commit).toHaveBeenCalledWith('removeInitComponent', 'server/')
    })

    it('setConnectionFailed commits disconnected with message', () => {
        const commit = vi.fn()
        actions.setConnectionFailed({ commit } as any, 'Connection refused')
        expect(commit).toHaveBeenCalledWith('setDisconnected', 'Connection refused')
    })
})
