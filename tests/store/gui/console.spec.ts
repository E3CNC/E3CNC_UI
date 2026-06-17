import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mutations } from '@/store/gui/console/mutations'
import { actions } from '@/store/gui/console/actions'
import { getters } from '@/store/gui/console/getters'
import { getDefaultState } from '@/store/gui/console/index'
import type { GuiConsoleState } from '@/store/gui/console/types'

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

vi.mock('uuid', () => ({
    v4: () => 'mocked-uuid',
}))

vi.mock('@/store/variables', () => ({
    timelapseConsoleFilters: ['HYPERLAPSE', 'TIMELAPSE'],
}))

vi.mock('@/plugins/helpers', () => ({
    caseInsensitiveSort: (arr: any[], key: string) =>
        arr.sort((a: any, b: any) => (a[key] ?? '').localeCompare(b[key] ?? '')),
}))

describe('gui console store', () => {
    let state: GuiConsoleState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    describe('mutations', () => {
        it('reset restores defaults', () => {
            state.hideWaitTemperatures = false
            mutations.reset(state)
            expect(state.hideWaitTemperatures).toBe(true)
            expect(state.consolefilters).toEqual({})
        })

        it('clear sets cleared_since', () => {
            mutations.clear(state, { cleared_since: 12345 })
            expect(state.cleared_since).toBe(12345)
        })

        it('filterStore stores a filter', () => {
            mutations.filterStore(state, { id: 'uuid1', values: { name: 'My filter', regex: 'ok', bool: true } })
            expect(state.consolefilters['uuid1']).toEqual({ name: 'My filter', regex: 'ok', bool: true })
        })

        it('filterUpdate updates an existing filter', () => {
            state.consolefilters['uuid1'] = { name: 'Old', regex: 'old', bool: true }
            mutations.filterUpdate(state, { id: 'uuid1', values: { name: 'New' } })
            expect(state.consolefilters['uuid1'].name).toBe('New')
            expect(state.consolefilters['uuid1'].regex).toBe('old')
        })

        it('filterUpdate does nothing for unknown id', () => {
            mutations.filterUpdate(state, { id: 'unknown', values: { name: 'New' } })
            expect(state.consolefilters).toEqual({})
        })

        it('filterDelete removes a filter', () => {
            state.consolefilters['uuid1'] = { name: 'Test', regex: 'test', bool: true }
            mutations.filterDelete(state, 'uuid1')
            expect(state.consolefilters).toEqual({})
        })

        it('filterDelete does nothing for unknown id', () => {
            mutations.filterDelete(state, 'unknown')
            expect(state.consolefilters).toEqual({})
        })
    })

    describe('actions', () => {
        it('reset delegates to commit', () => {
            const commit = vi.fn()
            actions.reset({ commit } as any)
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('clear emits cleared_since and commits clear to sub-modules', () => {
            const commit = vi.fn()
            actions.clear({ commit } as any)
            expect(mockSocket.emit).toHaveBeenCalledWith('server.database.post_item', {
                namespace: 'mainsail',
                key: 'console.cleared_since',
                value: expect.any(Number),
            })
            expect(commit).toHaveBeenCalledWith('clear', { cleared_since: expect.any(Number) })
            expect(commit).toHaveBeenCalledWith('server/clearGcodeStore', {}, { root: true })
            expect(commit).toHaveBeenCalledWith('server/setConsoleClearedThisSession', {}, { root: true })
        })

        it('saveSetting dispatches to gui/saveSetting', () => {
            const dispatch = vi.fn()
            actions.saveSetting({ dispatch } as any, { name: 'hideWaitTemperatures', value: false })
            expect(dispatch).toHaveBeenCalledWith(
                'gui/saveSetting',
                { name: 'console.hideWaitTemperatures', value: false },
                { root: true }
            )
        })

        it('filterUpload emits database post_item', () => {
            actions.filterUpload({} as any, { id: 'uuid1', value: { name: 'Test', regex: 'test', bool: true } })
            expect(mockSocket.emit).toHaveBeenCalledWith('server.database.post_item', {
                namespace: 'mainsail',
                key: 'console.consolefilters.uuid1',
                value: { name: 'Test', regex: 'test', bool: true },
            })
        })

        it('filterStore commits and uploads', () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const stateMock = { consolefilters: { 'mocked-uuid': { name: 'Test', regex: 'test', bool: true } } }
            actions.filterStore({ commit, dispatch, state: stateMock as any } as any, {
                values: { name: 'Test', regex: 'test', bool: true },
            })
            expect(commit).toHaveBeenCalledWith('filterStore', {
                id: 'mocked-uuid',
                values: { name: 'Test', regex: 'test', bool: true },
            })
            expect(dispatch).toHaveBeenCalledWith('filterUpload', {
                id: 'mocked-uuid',
                value: stateMock.consolefilters['mocked-uuid'],
            })
        })

        it('filterUpdate commits and uploads updated filter', () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const stateMock = { consolefilters: { uuid1: { name: 'Test', regex: 'test', bool: true } } }
            actions.filterUpdate({ commit, dispatch, state: stateMock as any } as any, {
                id: 'uuid1',
                values: { name: 'Updated' },
            })
            expect(commit).toHaveBeenCalledWith('filterUpdate', { id: 'uuid1', values: { name: 'Updated' } })
            expect(dispatch).toHaveBeenCalledWith('filterUpload', {
                id: 'uuid1',
                value: stateMock.consolefilters['uuid1'],
            })
        })

        it('filterDelete commits and emits delete', () => {
            const commit = vi.fn()
            actions.filterDelete({ commit } as any, 'uuid1')
            expect(commit).toHaveBeenCalledWith('filterDelete', 'uuid1')
            expect(mockSocket.emit).toHaveBeenCalledWith('server.database.delete_item', {
                namespace: 'mainsail',
                key: 'console.consolefilters.uuid1',
            })
        })
    })

    describe('getters', () => {
        it('getConsolefilters returns sorted filter list', () => {
            state.consolefilters = {
                uuid2: { name: 'Z filter', regex: 'z', bool: true },
                uuid1: { name: 'A filter', regex: 'a', bool: true },
            }
            const result = (getters as any).getConsolefilters(state)
            expect(result).toHaveLength(2)
            expect(result[0].name).toBe('A filter')
            expect(result[1].name).toBe('Z filter')
        })

        it('getConsolefilterRules returns rules from filters and built-ins', () => {
            const rootState = {
                gui: {
                    console: {
                        hideWaitTemperatures: true,
                        hideTlCommands: true,
                    },
                },
            }
            state.consolefilters = {
                uuid1: { name: 'Custom', regex: 'error', bool: true },
            }
            const result = (getters as any).getConsolefilterRules(state, {}, rootState)
            expect(result).toContain('^(?:ok\\s+)?(B|C|T\\d*):')
            expect(result).toContain('HYPERLAPSE')
            expect(result).toContain('TIMELAPSE')
            expect(result).toContain('error')
        })

        it('getConsolefilterRules skips disabled filters', () => {
            const rootState = { gui: { console: { hideWaitTemperatures: false, hideTlCommands: false } } }
            state.consolefilters = {
                uuid1: { name: 'Custom', regex: 'error', bool: false },
            }
            const result = (getters as any).getConsolefilterRules(state, {}, rootState)
            expect(result).toEqual([])
        })

        it('getConsoleClearedSince returns cleared_since', () => {
            state.cleared_since = 12345
            expect((getters as any).getConsoleClearedSince(state)).toBe(12345)
        })
    })
})
