import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getters } from '@/store/editor/getters'
import { mutations } from '@/store/editor/mutations'
import { actions } from '@/store/editor/actions'
import { getDefaultState } from '@/store/editor/index'
import type { EditorState } from '@/store/editor/types'
import { sha256 } from 'js-sha256'

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

vi.mock('@/plugins/helpers', () => ({
    escapePath: (value: string) => value,
    formatFilesize: (value: number) => `FS:${value}`,
    windowBeforeUnloadFunction: vi.fn(),
}))

vi.mock('@/plugins/i18n', () => ({
    default: {
        global: {
            t: (key: string, params?: Record<string, unknown>) => {
                const map: Record<string, string> = {
                    'Editor.SuccessfullySaved': `Saved ${(params as any)?.filename}`,
                    'Editor.FailedSave': `Failed to save ${(params as any)?.filename}`,
                }
                return map[key] ?? key
            },
        },
    },
}))

vi.mock('axios', () => ({
    default: {
        CancelToken: {
            source: () => ({ token: 'mock-token', cancel: vi.fn() }),
        },
        get: vi.fn().mockResolvedValue({ data: { text: () => Promise.resolve('file content') } }),
        post: vi.fn().mockResolvedValue({ data: { item: { path: 'config/printer.cfg' } } }),
    },
}))

const axios = await import('axios')

describe('editor store', () => {
    let state: EditorState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    describe('getters', () => {
        it('returns the configured klipper restart method', () => {
            expect((getters as any).getKlipperRestartMethod(state, {}, { gui: { editor: { klipperRestartMethod: 'RESTART' } } })).toBe('RESTART')
            expect((getters as any).getKlipperRestartMethod(state, {}, { gui: {} })).toBe('FIRMWARE_RESTART')
        })
    })

    describe('mutations', () => {
        it('openFile sets file data and calculates hash', () => {
            mutations.openFile(state, {
                filename: 'printer.cfg',
                fileroot: 'config',
                filepath: '',
                file: 'line1\r\nline2',
            })
            expect(state.loadedHash).toBe(sha256('line1\nline2'))
            expect(state.bool).toBe(true)
            expect(state.filename).toBe('printer.cfg')
            expect(state.fileroot).toBe('config')
            expect(state.filepath).toBe('')
            expect(state.sourcecode).toBe('line1\r\nline2')
            expect(state.changed).toBe(false)
        })

        it('updateSourcecode detects changes via hash', () => {
            mutations.openFile(state, {
                filename: 'printer.cfg', fileroot: 'config', filepath: '', file: 'original',
            })
            mutations.updateSourcecode(state, 'modified')
            expect(state.changed).toBe(true)
            expect(state.sourcecode).toBe('modified')

            // restoring original should clear changed flag
            mutations.updateSourcecode(state, 'original')
            expect(state.changed).toBe(false)
        })

        it('updateLoadedHash updates hash and clears changed', () => {
            mutations.openFile(state, {
                filename: 'printer.cfg', fileroot: 'config', filepath: '', file: 'line1',
            })
            const originalHash = state.loadedHash

            mutations.updateLoadedHash(state, 'line1\r\nline2\n')
            expect(state.loadedHash).toBe(sha256('line1\nline2\n'))
            expect(state.changed).toBe(false)
            expect(state.loadedHash).not.toBe(originalHash)
        })

        it('hideEditor sets bool to false', () => {
            state.bool = true
            mutations.hideEditor(state)
            expect(state.bool).toBe(false)
        })

        it('showEditor sets bool to true', () => {
            state.bool = false
            mutations.showEditor(state)
            expect(state.bool).toBe(true)
        })

        it('reset restores default state', () => {
            state.filename = 'test.cfg'
            state.bool = true
            state.changed = true

            mutations.reset(state)
            const defaults = getDefaultState()
            expect(state.filename).toBe(defaults.filename)
            expect(state.bool).toBe(defaults.bool)
            expect(state.changed).toBe(defaults.changed)
            expect(state.sourcecode).toBe(defaults.sourcecode)
            expect(state.loaderBool).toBe(defaults.loaderBool)
            expect(state.cancelToken).toBe(defaults.cancelToken)
        })

        it('setFilename sets the filename', () => {
            mutations.setFilename(state, 'new-file.cfg')
            expect(state.filename).toBe('new-file.cfg')
        })

        it('setPermissions sets the permissions', () => {
            mutations.setPermissions(state, 'rw')
            expect(state.permissions).toBe('rw')
        })

        it('updateCancelTokenSource sets cancelToken', () => {
            const source = { token: 'abc', cancel: vi.fn() }
            mutations.updateCancelTokenSource(state, source as any)
            expect(state.cancelToken).toBe(source)
        })

        it('updateLoaderState sets loaderBool', () => {
            mutations.updateLoaderState(state, true)
            expect(state.loaderBool).toBe(true)

            mutations.updateLoaderState(state, false)
            expect(state.loaderBool).toBe(false)
        })

        it('updateLoader sets loaderProgress', () => {
            const payload = { direction: 'uploading', loaded: 100, total: 500, speed: 'FS:10' }
            mutations.updateLoader(state, payload)
            expect(state.loaderProgress).toEqual(payload)
        })
    })

    describe('actions', () => {
        let commit: ReturnType<typeof vi.fn>
        let dispatch: ReturnType<typeof vi.fn>

        beforeEach(() => {
            commit = vi.fn()
            dispatch = vi.fn()
        })

        it('reset commits reset', () => {
            actions.reset({ commit } as any)
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('updateSourcecode commits updateSourcecode', () => {
            actions.updateSourcecode({ commit } as any, 'new code')
            expect(commit).toHaveBeenCalledWith('updateSourcecode', 'new code')
        })

        it('close commits reset and removes beforeunload listener', () => {
            const removeSpy = vi.spyOn(window, 'removeEventListener')
            actions.close({ commit } as any)
            expect(commit).toHaveBeenCalledWith('reset')
            expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
        })

        it('downloadProgress commits updateLoader with formatted speed', () => {
            actions.downloadProgress(
                { commit } as any,
                {
                    direction: 'downloading',
                    filesize: 200,
                    progressEvent: { loaded: 50, total: 100, rate: 10 },
                }
            )
            expect(commit).toHaveBeenCalledWith('updateLoader', {
                direction: 'downloading',
                speed: 'FS:10',
                loaded: 50,
                total: 200,
            })
        })

        it('clearLoader commits loader state reset', () => {
            actions.clearLoader({ commit } as any)
            expect(commit).toHaveBeenCalledWith('updateLoaderState', false)
            expect(commit).toHaveBeenCalledWith('updateLoader', {
                direction: 'downloading',
                loaded: 0,
                total: 0,
                speed: '',
            })
        })

        it('cancelLoad cancels and clears', () => {
            const cancel = vi.fn()
            state.cancelToken = { cancel } as any
            actions.cancelLoad({ state, commit, dispatch } as any)
            expect(cancel).toHaveBeenCalledWith('User canceled upload/download')
            expect(commit).toHaveBeenCalledWith('updateCancelTokenSource', null)
            expect(dispatch).toHaveBeenCalledWith('clearLoader')
        })

        it('cancelLoad does nothing if no cancelToken', () => {
            actions.cancelLoad({ state, commit, dispatch } as any)
            expect(commit).not.toHaveBeenCalled()
            expect(dispatch).not.toHaveBeenCalled()
        })

        it('openFile fetches file content and commits openFile', async () => {
            const rootGetters = { 'socket/getUrl': 'http://localhost:7125' }
            const actionState = { ...getDefaultState(), cancelToken: null }

            await (actions.openFile as any)(
                { state: actionState, commit, dispatch, rootGetters },
                { root: 'config', path: '', filename: 'printer.cfg', permissions: 'rw', size: 1024 }
            )
            await new Promise(resolve => setTimeout(resolve, 0))

            expect(axios.default.get).toHaveBeenCalledWith(
                expect.stringContaining('http://localhost:7125/server/files/config/printer.cfg?'),
                expect.objectContaining({
                    cancelToken: 'mock-token',
                    responseType: 'blob',
                })
            )

            expect(commit).toHaveBeenCalledWith('updateCancelTokenSource', expect.any(Object))
            expect(commit).toHaveBeenCalledWith('updateLoaderState', true)
            expect(commit).toHaveBeenCalledWith('setFilename', 'printer.cfg')
            expect(commit).toHaveBeenCalledWith('setPermissions', 'rw')
        })

        it('saveFile uploads file and emits klipper restart when restartServiceName is klipper', async () => {
            const rootGetters = { 'socket/getUrl': 'http://localhost:7125' }
            const localGetters = { getKlipperRestartMethod: 'FIRMWARE_RESTART' }
            const actionState = {
                ...getDefaultState(),
                filename: 'printer.cfg',
                fileroot: 'config',
                filepath: '',
                cancelToken: null,
            }

            await (actions.saveFile as any)(
                { state: actionState, commit, getters: localGetters, rootGetters, dispatch },
                { content: 'new content', restartServiceName: 'klipper' }
            )
            await new Promise(resolve => setTimeout(resolve, 0))

            expect(axios.default.post).toHaveBeenCalledWith(
                'http://localhost:7125/server/files/upload',
                expect.any(FormData),
                expect.objectContaining({ cancelToken: 'mock-token' })
            )

            expect(mockSocket.emit).toHaveBeenCalledWith('printer.gcode.script', { script: 'FIRMWARE_RESTART' })
            expect(mockToast.success).toHaveBeenCalledWith('Saved config/printer.cfg')
            expect(commit).toHaveBeenCalledWith('updateLoadedHash', 'new content')
            expect(dispatch).toHaveBeenCalledWith('close')
        })

        it('saveFile emits server.restart when restartServiceName is moonraker', async () => {
            const rootGetters = { 'socket/getUrl': 'http://localhost:7125' }
            const actionState = {
                ...getDefaultState(),
                filename: 'moonraker.conf',
                fileroot: 'config',
                filepath: '',
                cancelToken: null,
            }

            await (actions.saveFile as any)(
                { state: actionState, commit, getters: {}, rootGetters, dispatch },
                { content: 'config', restartServiceName: 'moonraker' }
            )
            await new Promise(resolve => setTimeout(resolve, 0))

            expect(mockSocket.emit).toHaveBeenCalledWith('server.restart', {})
        })

        it('saveFile emits machine.services.restart for custom service names', async () => {
            const rootGetters = { 'socket/getUrl': 'http://localhost:7125' }
            const actionState = {
                ...getDefaultState(),
                filename: 'custom.service',
                fileroot: 'config',
                filepath: '',
                cancelToken: null,
            }

            await (actions.saveFile as any)(
                { state: actionState, commit, getters: {}, rootGetters, dispatch },
                { content: 'data', restartServiceName: 'my-service' }
            )
            await new Promise(resolve => setTimeout(resolve, 0))

            expect(mockSocket.emit).toHaveBeenCalledWith('machine.services.restart', { service: 'my-service' })
        })

        it('saveFile does not emit any restart when restartServiceName is null', async () => {
            const rootGetters = { 'socket/getUrl': 'http://localhost:7125' }
            const actionState = {
                ...getDefaultState(),
                filename: 'notes.txt',
                fileroot: 'config',
                filepath: '',
                cancelToken: null,
            }

            await (actions.saveFile as any)(
                { state: actionState, commit, getters: {}, rootGetters, dispatch },
                { content: 'data', restartServiceName: null }
            )
            await new Promise(resolve => setTimeout(resolve, 0))

            expect(mockSocket.emit).not.toHaveBeenCalled()
            expect(mockToast.success).toHaveBeenCalled()
        })

        it('saveFile handles error and calls toast error', async () => {
            vi.mocked(axios.default.post).mockRejectedValueOnce({
                response: { data: { error: 'save failed' } },
            })

            const rootGetters = { 'socket/getUrl': 'http://localhost:7125' }
            const actionState = {
                ...getDefaultState(),
                filename: 'fail.cfg',
                fileroot: 'config',
                filepath: '',
                cancelToken: null,
            }

            await (actions.saveFile as any)(
                { state: actionState, commit, getters: {}, rootGetters, dispatch },
                { content: 'data', restartServiceName: null }
            )
            await new Promise(resolve => setTimeout(resolve, 0))

            expect(mockToast.error).toHaveBeenCalled()
        })

        it('openFile cancels existing load if cancelToken exists', async () => {
            const cancelFn = vi.fn()
            const rootGetters = { 'socket/getUrl': 'http://localhost:7125' }
            const actionState = {
                ...getDefaultState(),
                cancelToken: { cancel: cancelFn } as any,
            }

            const mockDispatch = vi.fn((actionName: string) => {
                if (actionName === 'cancelLoad') {
                    actions.cancelLoad({ state: actionState, commit, dispatch: mockDispatch } as any)
                }
            })

            await (actions.openFile as any)(
                { state: actionState, commit, dispatch: mockDispatch, rootGetters },
                { root: 'config', path: '', filename: 'test.cfg', permissions: 'rw', size: 1024 }
            )
            await new Promise(resolve => setTimeout(resolve, 0))

            expect(cancelFn).toHaveBeenCalledWith('User canceled upload/download')
        })
    })
})
