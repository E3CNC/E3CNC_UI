import { describe, it, expect, beforeEach, vi } from 'vitest'
import { actions } from '@/store/printer/actions'
import type { PrinterState } from '@/store/printer/types'

const mockSocket = vi.hoisted(() => ({
    emit: vi.fn(),
    emitAndWait: vi.fn(),
}))

vi.mock('@/store/runtime', () => ({
    getSocket: () => mockSocket,
}))

describe('printer actions', () => {
    let state: PrinterState

    beforeEach(() => {
        vi.clearAllMocks()
        state = {}
    })

    it('reset commits reset, tempHistory reset, and clears loadings', () => {
        const commit = vi.fn()
        actions.reset({ commit } as any)
        expect(commit).toHaveBeenCalledWith('reset')
        expect(commit).toHaveBeenCalledWith('tempHistory/reset')
        expect(commit).toHaveBeenCalledWith('socket/clearLoadings', null, { root: true })
    })

    it('init dispatches reset, adds init modules, and emits info requests', () => {
        const dispatch = vi.fn()
        actions.init({ dispatch } as any)
        expect(dispatch).toHaveBeenCalledWith('reset')
        expect(dispatch).toHaveBeenCalledWith('socket/addInitModule', 'printer/info', { root: true })
        expect(dispatch).toHaveBeenCalledWith('socket/addInitModule', 'printer/initSubscripts', { root: true })
        expect(dispatch).toHaveBeenCalledWith('socket/addInitModule', 'printer/initTempHistory', { root: true })
        expect(dispatch).toHaveBeenCalledWith('socket/addInitModule', 'server/gcode_store', { root: true })
        expect(dispatch).toHaveBeenCalledWith('initSubscripts')
        expect(mockSocket.emit).toHaveBeenCalledWith('printer.info', {}, { action: 'printer/getInfo' })
        expect(mockSocket.emit).toHaveBeenCalledWith('server.gcode_store', {}, { action: 'server/getGcodeStore' })
    })

    it('getInfo commits server data and printer data, removes init module', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        const payload = {
            state: 'ready',
            state_message: 'ok',
            app: 'Klipper',
            hostname: 'myprinter',
            software_version: 'v0.12.0',
            cpu_info: { cpu_count: 4 },
        }
        actions.getInfo({ commit, dispatch } as any, payload)
        expect(commit).toHaveBeenCalledWith('server/setData', { klippy_state: 'ready', klippy_message: 'ok' }, { root: true })
        expect(commit).toHaveBeenCalledWith('setData', {
            app_name: 'Klipper',
            hostname: 'myprinter',
            software_version: 'v0.12.0',
            cpu_info: { cpu_count: 4 },
        })
        expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'printer/info', { root: true })
    })

    it('getInfo handles null app field', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.getInfo({ commit, dispatch } as any, { state: 'ready', state_message: '', hostname: '', software_version: '', cpu_info: null })
        expect(commit).toHaveBeenCalledWith('setData', {
            app_name: null,
            hostname: '',
            software_version: '',
            cpu_info: null,
        })
    })

    it('initSubscripts fetches objects, subscribes, and requests temp history', async () => {
        mockSocket.emitAndWait
            .mockResolvedValueOnce({ objects: ['toolhead', 'extruder', 'menu', 'gcode_macro START_PRINT'] })
            .mockResolvedValueOnce({ status: { extruder: { temperature: 200 } } })

        const dispatch = vi.fn()
        await actions.initSubscripts({ dispatch } as any)

        expect(mockSocket.emitAndWait).toHaveBeenCalledWith('printer.objects.list')
        // 'menu' is in blocklist, others should be subscribed
        expect(mockSocket.emitAndWait).toHaveBeenCalledWith('printer.objects.subscribe', {
            objects: { toolhead: null, extruder: null, 'gcode_macro START_PRINT': null },
        }, {})
        expect(dispatch).toHaveBeenCalledWith('getData', { status: { extruder: { temperature: 200 } } })
        expect(mockSocket.emit).toHaveBeenCalledWith('server.temperature_store', { include_monitors: true }, { action: 'printer/tempHistory/init' })
        expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'printer/initSubscripts', { root: true })
    })

    it('initSubscripts handles empty subscribe list', async () => {
        mockSocket.emitAndWait.mockResolvedValueOnce({ objects: ['menu'] })
        const dispatch = vi.fn()
        await actions.initSubscripts({ dispatch } as any)
        // Should not call subscribe if no non-blocklisted objects
        expect(mockSocket.emitAndWait).toHaveBeenCalledTimes(1)
    })

    it('getData processes status payload without webhooks', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        const payload = { status: { extruder: { temperature: 200 } } }
        actions.getData({ commit, dispatch, state } as any, payload)
        expect(commit).toHaveBeenCalledWith('setData', { extruder: { temperature: 200 } })
    })

    it('getData handles webhooks and updates gcode viewer cache', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        const thisDispatch = vi.fn()
        const payload = {
            status: {
                webhooks: { state: 'ready', state_message: 'ok' },
                toolhead: { axis_maximum: [300, 300, 200], axis_minimum: [0, 0, -5] },
                configfile: { settings: { printer: { kinematics: 'corexy' } } },
                extruder: { temperature: 200 },
            },
        }
        actions.getData.call(
            { dispatch: thisDispatch },
            { commit, dispatch, state } as any,
            payload,
        )
        expect(thisDispatch).toHaveBeenCalledWith('server/getData', { klippy_state: 'ready', klippy_message: 'ok' }, { root: true })
        expect(dispatch).toHaveBeenCalledWith('gui/updateGcodeviewerCache', { kinematics: 'corexy' }, { root: true })
        expect(dispatch).toHaveBeenCalledWith('gui/updateGcodeviewerCache', { axis_maximum: [300, 300, 200] }, { root: true })
        expect(dispatch).toHaveBeenCalledWith('gui/updateGcodeviewerCache', { axis_minimum: [0, 0, -5] }, { root: true })
    })

    it('getData strips requestParams', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        const payload = { status: { extruder: { temperature: 200 }, requestParams: { path: 'gcodes' } } }
        actions.getData({ commit, dispatch, state } as any, payload)
        expect(commit).toHaveBeenCalledWith('setData', { extruder: { temperature: 200 } })
    })

    it('initGcodes fetches and commits gcode commands', async () => {
        mockSocket.emitAndWait.mockResolvedValue({ status: { gcode: { commands: { G28: {} } } } })
        const commit = vi.fn()
        await actions.initGcodes({ commit } as any)
        expect(mockSocket.emitAndWait).toHaveBeenCalledWith('printer.objects.query', { objects: { gcode: ['commands'] } }, {})
        expect(commit).toHaveBeenCalledWith('setData', { gcode: { commands: { G28: {} } } })
    })

    it('initExtruderCanExtrude queries extruder can_extrude and dispatches getData', async () => {
        mockSocket.emitAndWait.mockResolvedValue({ status: { extruder: { can_extrude: true } } })
        const dispatch = vi.fn()
        const stateWithExtruder = { extruder: { temperature: 200 }, extruder1: { temperature: 180 } }
        await actions.initExtruderCanExtrude({ dispatch, state: stateWithExtruder as any } as any)
        expect(mockSocket.emitAndWait).toHaveBeenCalledWith('printer.objects.query', {
            objects: { extruder: ['can_extrude'], extruder1: ['can_extrude'] },
        }, {})
        expect(dispatch).toHaveBeenCalledWith('getData', { extruder: { can_extrude: true } })
    })

    it('sendGcode dispatches addEvent and emits gcode script', () => {
        const dispatch = vi.fn()
        actions.sendGcode({ dispatch } as any, 'G28')
        expect(dispatch).toHaveBeenCalledWith('server/addEvent', { message: 'G28', type: 'command' }, { root: true })
        expect(mockSocket.emit).toHaveBeenCalledWith('printer.gcode.script', { script: 'G28' }, { loading: 'sendGcode' })
    })

    it('sendGcode emits emergency_stop for M112', () => {
        const dispatch = vi.fn()
        actions.sendGcode({ dispatch } as any, 'M112')
        expect(mockSocket.emit).toHaveBeenCalledWith('printer.emergency_stop', {}, { loading: 'sendGcode' })
    })

    it('getEndstopStatus commits payload', () => {
        const commit = vi.fn()
        actions.getEndstopStatus({ commit } as any, { endstops: { x: 'TRIGGERED' } })
        expect(commit).toHaveBeenCalledWith('setEndstopStatus', { endstops: { x: 'TRIGGERED' } })
    })

    it('removeBedMeshProfile commits payload', () => {
        const commit = vi.fn()
        actions.removeBedMeshProfile({ commit } as any, 'default')
        expect(commit).toHaveBeenCalledWith('removeBedMeshProfile', 'default')
    })
})
