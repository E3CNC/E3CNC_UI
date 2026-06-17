import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mutations } from '@/store/gui/webcams/mutations'
import { actions } from '@/store/gui/webcams/actions'
import { getters } from '@/store/gui/webcams/getters'
import { getDefaultState } from '@/store/gui/webcams/index'
import type { GuiWebcamState } from '@/store/gui/webcams/types'

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

describe('gui webcams store', () => {
    let state: GuiWebcamState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    describe('mutations', () => {
        it('reset restores defaults', () => {
            state.webcams = [
                {
                    name: 'cam1',
                    service: 'mjpegstreamer',
                    enabled: true,
                    icon: '',
                    target_fps: 15,
                    stream_url: '',
                    snapshot_url: '',
                    flip_horizontal: false,
                    flip_vertical: false,
                    rotation: 0,
                },
            ]
            mutations.reset(state)
            expect(state.webcams).toEqual([])
        })

        it('initStore replaces webcams', () => {
            const webcams = [
                {
                    name: 'cam1',
                    service: 'mjpegstreamer',
                    enabled: true,
                    icon: '',
                    target_fps: 15,
                    stream_url: '',
                    snapshot_url: '',
                    flip_horizontal: false,
                    flip_vertical: false,
                    rotation: 0,
                },
            ]
            mutations.initStore(state, webcams)
            expect(state.webcams).toEqual(webcams)
        })
    })

    describe('actions', () => {
        it('reset delegates to commit', () => {
            const commit = vi.fn()
            actions.reset({ commit } as any)
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('init emits webcams list request', () => {
            actions.init()
            expect(mockSocket.emit).toHaveBeenCalledWith('server.webcams.list', {}, { action: 'gui/webcams/initStore' })
        })

        it('initStore resets and loads webcams', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const webcams = [
                {
                    name: 'cam1',
                    service: 'mjpegstreamer',
                    enabled: true,
                    icon: '',
                    target_fps: 15,
                    stream_url: '',
                    snapshot_url: '',
                    flip_horizontal: false,
                    flip_vertical: false,
                    rotation: 0,
                },
            ]
            await actions.initStore({ commit, dispatch } as any, { webcams })
            expect(commit).toHaveBeenCalledWith('reset')
            expect(commit).toHaveBeenCalledWith('initStore', webcams)
            expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'gui/webcam/init', { root: true })
        })

        it('store emits webcam post_item', () => {
            const webcam = {
                name: 'cam1',
                service: 'mjpegstreamer',
                enabled: true,
                icon: '',
                target_fps: 15,
                stream_url: '',
                snapshot_url: '',
                flip_horizontal: false,
                flip_vertical: false,
                rotation: 0,
            }
            actions.store({} as any, webcam)
            expect(mockSocket.emit).toHaveBeenCalledWith('server.webcams.post_item', webcam)
        })

        it('update emits post_item and dispatches delete for renamed webcam', () => {
            const dispatch = vi.fn()
            const rootState = { server: { components: [] } }
            const webcam = {
                name: 'newcam',
                service: 'mjpegstreamer',
                enabled: true,
                icon: '',
                target_fps: 15,
                stream_url: '',
                snapshot_url: '',
                flip_horizontal: false,
                flip_vertical: false,
                rotation: 0,
            }
            actions.update({ dispatch, rootState: rootState as any } as any, { webcam, oldWebcamName: 'oldcam' })
            expect(mockSocket.emit).toHaveBeenCalledWith('server.webcams.post_item', webcam)
            expect(dispatch).toHaveBeenCalledWith('delete', 'oldcam')
        })

        it('delete emits delete_item', () => {
            actions.delete({} as any, 'cam1')
            expect(mockSocket.emit).toHaveBeenCalledWith('server.webcams.delete_item', { name: 'cam1' })
        })

        it('update dispatches timelapse updateCamSettings when timelapse component active', () => {
            const dispatch = vi.fn()
            const rootState = { server: { components: ['timelapse'] } }
            const webcam = {
                name: 'newcam',
                service: 'mjpegstreamer',
                enabled: true,
                icon: '',
                target_fps: 15,
                stream_url: '',
                snapshot_url: '',
                flip_horizontal: false,
                flip_vertical: false,
                rotation: 0,
            }
            actions.update({ dispatch, rootState: rootState as any } as any, { webcam, oldWebcamName: 'oldcam' })
            expect(dispatch).toHaveBeenCalledWith(
                'server/timelapse/updateCamSettings',
                { newName: 'newcam', oldName: 'oldcam' },
                { root: true }
            )
        })

        it('update does not dispatch timelapse updateCamSettings when timelapse not active', () => {
            const dispatch = vi.fn()
            const rootState = { server: { components: [] } }
            const webcam = {
                name: 'newcam',
                service: 'mjpegstreamer',
                enabled: true,
                icon: '',
                target_fps: 15,
                stream_url: '',
                snapshot_url: '',
                flip_horizontal: false,
                flip_vertical: false,
                rotation: 0,
            }
            actions.update({ dispatch, rootState: rootState as any } as any, { webcam, oldWebcamName: 'oldcam' })
            expect(dispatch).not.toHaveBeenCalledWith(
                'server/timelapse/updateCamSettings',
                expect.anything(),
                expect.anything()
            )
        })

        it('update does not dispatch delete when name unchanged', () => {
            const dispatch = vi.fn()
            const rootState = { server: { components: [] } }
            const webcam = {
                name: 'cam1',
                service: 'mjpegstreamer',
                enabled: true,
                icon: '',
                target_fps: 15,
                stream_url: '',
                snapshot_url: '',
                flip_horizontal: false,
                flip_vertical: false,
                rotation: 0,
            }
            actions.update({ dispatch, rootState: rootState as any } as any, { webcam, oldWebcamName: 'cam1' })
            expect(dispatch).not.toHaveBeenCalledWith('delete', expect.anything())
        })
    })

    describe('getters', () => {
        it('getWebcams returns only enabled webcams', () => {
            state.webcams = [
                {
                    name: 'cam1',
                    service: 'mjpegstreamer',
                    enabled: true,
                    icon: '',
                    target_fps: 15,
                    stream_url: '',
                    snapshot_url: '',
                    flip_horizontal: false,
                    flip_vertical: false,
                    rotation: 0,
                },
                {
                    name: 'cam2',
                    service: 'mjpegstreamer',
                    enabled: false,
                    icon: '',
                    target_fps: 15,
                    stream_url: '',
                    snapshot_url: '',
                    flip_horizontal: false,
                    flip_vertical: false,
                    rotation: 0,
                },
            ]
            const result = (getters as any).getWebcams(state)
            expect(result).toHaveLength(1)
            expect(result[0].name).toBe('cam1')
        })

        it('getWebcams returns empty array when no webcams enabled', () => {
            state.webcams = [
                {
                    name: 'cam1',
                    service: 'mjpegstreamer',
                    enabled: false,
                    icon: '',
                    target_fps: 15,
                    stream_url: '',
                    snapshot_url: '',
                    flip_horizontal: false,
                    flip_vertical: false,
                    rotation: 0,
                },
            ]
            const result = (getters as any).getWebcams(state)
            expect(result).toEqual([])
        })

        it('getWebcam finds a webcam by name', () => {
            state.webcams = [
                {
                    name: 'cam1',
                    service: 'mjpegstreamer',
                    enabled: true,
                    icon: '',
                    target_fps: 15,
                    stream_url: '',
                    snapshot_url: '',
                    flip_horizontal: false,
                    flip_vertical: false,
                    rotation: 0,
                },
            ]
            const webcams = (getters as any).getWebcams(state)
            const result = (getters as any).getWebcam(state, { getWebcams: webcams })('cam1')
            expect(result.name).toBe('cam1')
        })

        it('getWebcam returns undefined for unknown name', () => {
            const result = (getters as any).getWebcam(state, { getWebcams: [] })('unknown')
            expect(result).toBeUndefined()
        })
    })
})
