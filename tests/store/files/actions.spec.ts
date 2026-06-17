import { describe, it, expect, beforeEach, vi } from 'vitest'
import { actions } from '@/store/files/actions'
import { getDefaultState } from '@/store/files/index'
import type { FileState } from '@/store/files/types'

const mockSocket = vi.hoisted(() => ({
    emit: vi.fn(),
    emitBatch: vi.fn(),
}))
const mockToast = vi.hoisted(() => ({
    error: vi.fn(),
    success: vi.fn(),
}))

vi.mock('@/store/runtime', () => ({
    getSocket: () => mockSocket,
    $toast: mockToast,
}))

vi.mock('@/plugins/i18n', () => ({
    default: {
        global: {
            t: (key: string, params?: Record<string, unknown>) => {
                const map: Record<string, string> = {
                    'Files.ScanMetaSuccess': `Scanned ${(params as any)?.filename}`,
                    'Files.SuccessfullyRenamed': `Renamed ${(params as any)?.filename}`,
                    'Files.SuccessfullyMoved': `Moved ${(params as any)?.filename}`,
                    'Files.SuccessfullyCreated': `Created ${(params as any)?.filename}`,
                    'Files.SuccessfullyDeleted': `Deleted ${(params as any)?.filename}`,
                    'FullscreenUpload.CannotUploadFile': 'Upload failed',
                }
                return map[key] ?? key
            },
        },
    },
}))

vi.mock('@/store/variables', () => ({
    hiddenDirectories: ['sys'],
    validGcodeExtensions: ['.gcode', '.nc'],
}))

vi.mock('axios', () => ({
    default: {
        CancelToken: { source: () => ({ token: 'token', cancel: vi.fn() }) },
        post: vi.fn().mockResolvedValue({ data: { item: { path: 'gcodes/test.gcode' } } }),
    },
}))

describe('files actions', () => {
    let state: FileState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    it('reset commits reset', () => {
        const commit = vi.fn()
        actions.reset({ commit } as any)
        expect(commit).toHaveBeenCalledWith('reset')
    })

    it('initRootDirs creates root dirs and emits get_directory', () => {
        const stateMock = { filetree: [] }
        const commit = vi.fn()
        actions.initRootDirs({ state: stateMock, commit } as any, ['gcodes', 'config'])
        expect(commit).toHaveBeenCalledWith('createRootDir', { name: 'gcodes', permissions: 'r' })
        expect(commit).toHaveBeenCalledWith('createRootDir', { name: 'config', permissions: 'r' })
        expect(mockSocket.emit).toHaveBeenCalledWith(
            'server.files.get_directory',
            { path: 'gcodes' },
            { action: 'files/getDirectory' }
        )
        expect(mockSocket.emit).toHaveBeenCalledWith(
            'server.files.get_directory',
            { path: 'config' },
            { action: 'files/getDirectory' }
        )
    })

    it('scanMetadata emits metascan for gcodes', () => {
        const commit = vi.fn()
        actions.scanMetadata({ commit } as any, { filename: 'gcodes/test.gcode' })
        expect(commit).toHaveBeenCalledWith('setMetadataRequested', { filename: 'test.gcode' })
        expect(mockSocket.emit).toHaveBeenCalledWith(
            'server.files.metascan',
            { filename: 'test.gcode' },
            { action: 'files/getScanMetadata' }
        )
    })

    it('getScanMetadata dispatches getMetadata and shows toast', () => {
        const dispatch = vi.fn()
        actions.getScanMetadata({ dispatch } as any, { filename: 'gcodes/test.gcode' })
        expect(dispatch).toHaveBeenCalledWith('getMetadata', { filename: 'gcodes/test.gcode' })
        expect(mockToast.success).toHaveBeenCalled()
    })

    it('requestMetadata batches up to 100 items', () => {
        const commit = vi.fn()
        const filenames = Array.from({ length: 150 }, (_, i) => ({ filename: `gcodes/test${i}.gcode` }))
        actions.requestMetadata({ commit } as any, filenames)
        expect(commit).toHaveBeenCalledTimes(150)
        expect(mockSocket.emitBatch).toHaveBeenCalledTimes(2)
    })

    it('getMetadata updates current file in printer store if match', () => {
        const commit = vi.fn()
        const rootState = { printer: { print_stats: { filename: 'gcodes/test.gcode' } } }
        actions.getMetadata({ commit, rootState } as any, { filename: 'gcodes/test.gcode', size: 100 })
        expect(commit).toHaveBeenCalledWith('printer/clearCurrentFile', null, { root: true })
        expect(commit).toHaveBeenCalledWith(
            'printer/setData',
            { current_file: { filename: 'gcodes/test.gcode', size: 100 } },
            { root: true }
        )
        expect(commit).toHaveBeenCalledWith('setMetadata', { filename: 'gcodes/test.gcode', size: 100 })
    })

    it('getMetadataCurrentFile commits to printer store', () => {
        const commit = vi.fn()
        actions.getMetadataCurrentFile({ commit } as any, { filename: 'test.gcode' })
        expect(commit).toHaveBeenCalledWith('printer/clearCurrentFile', null, { root: true })
        expect(commit).toHaveBeenCalledWith(
            'printer/setData',
            { current_file: { filename: 'test.gcode' } },
            { root: true }
        )
    })

    it('getMove shows error toast on error', () => {
        actions.getMove({} as any, { error: { message: 'File not found' } })
        expect(mockToast.error).toHaveBeenCalledWith('File not found')
    })

    it('getMove shows success toast on rename', () => {
        actions.getMove({} as any, {
            requestParams: { source: 'gcodes/old.gcode', dest: 'gcodes/new.gcode' },
        })
        expect(mockToast.success).toHaveBeenCalledWith('Renamed new.gcode')
    })

    it('getMove shows success toast on move to different dir', () => {
        actions.getMove({} as any, {
            requestParams: { source: 'gcodes/test.gcode', dest: 'gcodes/subdir/test.gcode' },
        })
        expect(mockToast.success).toHaveBeenCalledWith('Moved test.gcode')
    })

    it('getCreateDir shows error on failure', () => {
        actions.getCreateDir({} as any, { error: { message: 'Permission denied' } })
        expect(mockToast.error).toHaveBeenCalledWith('Permission denied')
    })

    it('getDeleteDir shows error on failure', () => {
        actions.getDeleteDir({} as any, { error: { message: 'Not empty' } })
        expect(mockToast.error).toHaveBeenCalledWith('Not empty')
    })

    it('getDeleteFile shows success for non-timelapse jpg', () => {
        actions.getDeleteFile({} as any, {
            item: { path: 'test.gcode', root: 'gcodes' },
        })
        expect(mockToast.success).toHaveBeenCalled()
    })

    it('uploadSetShow commits value', () => {
        const commit = vi.fn()
        actions.uploadSetShow({ commit } as any, true)
        expect(commit).toHaveBeenCalledWith('uploadSetShow', true)
    })

    it('uploadIncrementCurrentNumber increments from state', () => {
        const stateMock = { upload: { currentNumber: 3 } }
        const commit = vi.fn()
        actions.uploadIncrementCurrentNumber({ state: stateMock, commit } as any)
        expect(commit).toHaveBeenCalledWith('uploadSetCurrentNumber', 4)
    })

    it('rolloverLog shows toasts and re-fetches directory', async () => {
        vi.useFakeTimers()
        actions.rolloverLog({} as any, {
            rolled_over: ['moonraker.log'],
            failed: {},
        })
        expect(mockToast.success).toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(500)
        expect(mockSocket.emit).toHaveBeenCalledWith(
            'server.files.get_directory',
            { path: 'logs' },
            { action: 'files/getDirectory' }
        )
        vi.useRealTimers()
    })
})
