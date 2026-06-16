import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mutations } from '@/store/server/timelapse/mutations'
import { actions } from '@/store/server/timelapse/actions'
import { getDefaultState } from '@/store/server/timelapse/index'
import type { ServerTimelapseState } from '@/store/server/timelapse/types'

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

describe('server timelapse store', () => {
    let state: ServerTimelapseState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    // ── MUTATION TESTS ─────────────────────────────────────────────────────────

    describe('mutations', () => {
        it('reset restores default state', () => {
            state.settings.enabled = false
            state.lastFrame.count = 99
            state.rendering.status = 'rendering'
            mutations.reset(state)
            expect(state.settings.enabled).toBe(true)
            expect(state.lastFrame.count).toBe(0)
            expect(state.rendering.status).toBe('')
        })

        it('merges settings and resets render state', () => {
            mutations.setSettings(state, { enabled: false, camera: 'cam1', ignored: true } as any)
            mutations.setLastFrame(state, { count: 3, file: 'frame.jpg' })
            mutations.setRenderStatus(state, { status: 'rendering', progress: 55 })
            mutations.resetSnackbar(state)

            expect(state.settings.enabled).toBe(false)
            expect(state.settings.camera).toBe('cam1')
            expect(state.lastFrame).toEqual({ count: 3, file: 'frame.jpg' })
            expect(state.rendering).toEqual({ status: '', progress: 0, filename: '' })
        })

        it('setSettings only updates existing keys', () => {
            mutations.setSettings(state, { enabled: false, camera: 'cam1' })
            // non-existing keys should not be added
            mutations.setSettings(state, { nonexistent_key: 'val' } as any)
            expect((state.settings as any).nonexistent_key).toBeUndefined()
            expect(state.settings.enabled).toBe(false)
        })

        it('setLastFrame sets count and file', () => {
            mutations.setLastFrame(state, { count: 10, file: 'test.jpg' })
            expect(state.lastFrame.count).toBe(10)
            expect(state.lastFrame.file).toBe('test.jpg')
        })

        it('setRenderStatus sets full rendering state', () => {
            mutations.setRenderStatus(state, { status: 'rendering', progress: 75, filename: 'output.mp4' })
            expect(state.rendering.status).toBe('rendering')
            expect(state.rendering.progress).toBe(75)
            expect(state.rendering.filename).toBe('output.mp4')
        })

        it('setRenderStatus defaults progress and filename when not provided', () => {
            mutations.setRenderStatus(state, { status: 'complete' })
            expect(state.rendering.status).toBe('complete')
            expect(state.rendering.progress).toBe(0)
            expect(state.rendering.filename).toBe('')
        })

        it('resetSnackbar clears rendering state', () => {
            state.rendering = { status: 'rendering', progress: 50, filename: 'out.mp4' }
            mutations.resetSnackbar(state)
            expect(state.rendering).toEqual({ status: '', progress: 0, filename: '' })
        })
    })

    // ── ACTION TESTS ───────────────────────────────────────────────────────────

    describe('actions', () => {
        it('reset delegates to commit', () => {
            const commit = vi.fn()
            actions.reset({ commit } as any)
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('init emits get_settings and lastframeinfo', () => {
            actions.init()
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'machine.timelapse.get_settings',
                {},
                { action: 'server/timelapse/initSettings' }
            )
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'machine.timelapse.lastframeinfo',
                {},
                { action: 'server/timelapse/initLastFrameinfo' }
            )
        })

        it('handles timelapse events and actions', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()

            await actions.initSettings({ commit, dispatch } as any, {
                requestParams: {},
                enabled: false,
                camera: 'cam1',
            })
            expect(commit).toHaveBeenCalledWith('setSettings', { enabled: false, camera: 'cam1' })
            expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'server/timelapse/init', { root: true })

            actions.getEvent({ commit } as any, { action: 'newframe', frame: '12', framefile: 'frame.jpg' })
            expect(commit).toHaveBeenCalledWith('setLastFrame', { count: 12, file: 'frame.jpg' })

            actions.getEvent({ commit } as any, { action: 'render', status: 'error', msg: 'boom' })
            expect(mockToast.error).toHaveBeenCalledWith('boom')
            expect(commit).toHaveBeenCalledWith('resetSnackbar')

            state.settings.camera = 'cam1'
            actions.updateCamSettings({ dispatch, state } as any, { oldName: 'cam1', newName: 'cam2' })
            expect(dispatch).toHaveBeenCalledWith('saveSetting', { camera: 'cam2' })

            actions.saveSetting(null as any, { enabled: true })
            expect(mockSocket.emit).toHaveBeenCalledWith('machine.timelapse.post_settings', { enabled: true }, { action: 'server/timelapse/initSettings' })
        })

        it('initLastFrameinfo commits last frame data', () => {
            const commit = vi.fn()
            actions.initLastFrameinfo({ commit } as any, {
                framecount: 42,
                lastframefile: 'last.jpg',
            })
            expect(commit).toHaveBeenCalledWith('setLastFrame', { count: 42, file: 'last.jpg' })
        })

        it('getEvent handles render success (non-error)', () => {
            const commit = vi.fn()
            actions.getEvent({ commit } as any, { action: 'render', status: 'rendering', progress: 50 })
            expect(commit).toHaveBeenCalledWith('setRenderStatus', { action: 'render', status: 'rendering', progress: 50 })
            expect(mockToast.error).not.toHaveBeenCalled()
        })

        it('getEvent handles unknown action via console.log', () => {
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
            const commit = vi.fn()
            actions.getEvent({ commit } as any, { action: 'unknown', data: 'test' })
            expect(consoleLogSpy).toHaveBeenCalledWith('unknown timelapse event', { action: 'unknown', data: 'test' })
            consoleLogSpy.mockRestore()
        })

        it('updateCamSettings does nothing when camera name does not match', () => {
            const dispatch = vi.fn()
            state.settings.camera = 'cam1'
            actions.updateCamSettings({ dispatch, state } as any, { oldName: 'otherCam', newName: 'newCam' })
            expect(dispatch).not.toHaveBeenCalled()
        })

        it('resetSnackbar commits resetSnackbar', () => {
            const commit = vi.fn()
            actions.resetSnackbar({ commit } as any)
            expect(commit).toHaveBeenCalledWith('resetSnackbar')
        })
    })
})
