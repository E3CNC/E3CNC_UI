import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mutations } from '@/store/gui/maintenance/mutations'
import { actions } from '@/store/gui/maintenance/actions'
import { getters } from '@/store/gui/maintenance/getters'
import { getDefaultState } from '@/store/gui/maintenance/index'
import type { GuiMaintenanceState } from '@/store/gui/maintenance/types'

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
    themeDir: '.theme',
}))

const defaultReminder = {
    type: null,
    filament: { bool: false, value: null },
    printtime: { bool: false, value: null },
    date: { bool: false, value: null },
}

const makeEntry = (overrides: Partial<any> = {}) => ({
    name: 'Test',
    note: '',
    perform_note: null,
    start_time: 1000,
    end_time: null,
    start_filament: 0,
    end_filament: null,
    start_printtime: 0,
    end_printtime: null,
    last_entry: null,
    reminder: { ...defaultReminder },
    ...overrides,
})

describe('gui maintenance store', () => {
    let state: GuiMaintenanceState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    describe('mutations', () => {
        it('reset restores defaults', () => {
            state.entries['e1'] = makeEntry()
            mutations.reset(state)
            expect(state.entries).toEqual({})
        })

        it('initStore replaces entries', () => {
            const entries = { e1: makeEntry() }
            mutations.initStore(state, entries)
            expect(state.entries).toEqual(entries)
        })

        it('store adds an entry', () => {
            mutations.store(state, {
                id: 'e1',
                values: makeEntry(),
            })
            expect(state.entries['e1'].name).toBe('Test')
        })

        it('update modifies existing entry', () => {
            state.entries['e1'] = makeEntry()
            mutations.update(state, { id: 'e1', entry: { name: 'New' } })
            expect(state.entries['e1'].name).toBe('New')
        })

        it('update does nothing for unknown id', () => {
            mutations.update(state, { id: 'unknown', entry: { name: 'New' } })
            expect(state.entries).toEqual({})
        })

        it('delete removes an entry', () => {
            state.entries['e1'] = makeEntry()
            mutations.delete(state, 'e1')
            expect(state.entries).toEqual({})
        })

        it('delete does nothing for unknown id', () => {
            state.entries['e1'] = makeEntry()
            mutations.delete(state, 'unknown')
            expect(state.entries).toHaveProperty('e1')
        })
    })

    describe('actions', () => {
        it('reset delegates to commit', () => {
            const commit = vi.fn()
            actions.reset({ commit } as any)
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('init emits database get_item', () => {
            actions.init()
            expect(mockSocket.emit).toHaveBeenCalledWith('server.database.get_item', { namespace: 'maintenance' }, { action: 'gui/maintenance/initStore' })
        })

        it('initStore resets and loads entries', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const payload = { value: { e1: makeEntry() } }
            await actions.initStore({ commit, dispatch } as any, payload)
            expect(commit).toHaveBeenCalledWith('reset')
            expect(commit).toHaveBeenCalledWith('initStore', { e1: makeEntry() })
            expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'gui/maintenance/init', { root: true })
        })

        it('initStore strips MAINTENANCE_INIT entry', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const payload = { value: { init: { name: 'MAINTENANCE_INIT' }, e1: makeEntry() } }
            await actions.initStore({ commit, dispatch } as any, payload)
            expect(commit).toHaveBeenCalledWith('initStore', { e1: makeEntry() })
        })

        it('upload emits database post_item', () => {
            actions.upload({} as any, { id: 'e1', value: makeEntry() })
            expect(mockSocket.emit).toHaveBeenCalledWith('server.database.post_item', {
                namespace: 'maintenance',
                key: 'e1',
                value: makeEntry(),
            })
        })

        it('store creates entry with uuid', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const stateMock = { entries: { 'mocked-uuid': makeEntry() } }
            await actions.store({ commit, dispatch, state: stateMock as any } as any, {
                entry: makeEntry(),
            })
            expect(commit).toHaveBeenCalledWith('store', { id: 'mocked-uuid', values: makeEntry() })
            expect(dispatch).toHaveBeenCalledWith('upload', { id: 'mocked-uuid', value: stateMock.entries['mocked-uuid'] })
        })

        it('update commits and uploads', () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            actions.update({ commit, dispatch } as any, { id: 'e1', name: 'New', note: 'updated' })
            expect(commit).toHaveBeenCalledWith('update', { id: 'e1', entry: { name: 'New', note: 'updated' } })
            expect(dispatch).toHaveBeenCalledWith('upload', { id: 'e1', value: { name: 'New', note: 'updated' } })
        })

        it('delete commits and emits delete_item', () => {
            const commit = vi.fn()
            actions.delete({ commit } as any, 'e1')
            expect(commit).toHaveBeenCalledWith('delete', 'e1')
            expect(mockSocket.emit).toHaveBeenCalledWith('server.database.delete_item', { namespace: 'maintenance', key: 'e1' })
        })

        it('perform updates entry with end stats and creates repeat entry', () => {
            const dispatch = vi.fn()
            const stateMock = {
                entries: {
                    e1: makeEntry({ reminder: { ...defaultReminder, type: 'repeat' } }),
                },
            }
            actions.perform({ dispatch, state: stateMock as any, rootState: { server: { history: { job_totals: { total_filament_used: 100, total_print_time: 3600 } } } } } as any, { id: 'e1', note: 'done' })
            expect(dispatch).toHaveBeenCalledWith('update', expect.objectContaining({ end_filament: 100, end_printtime: 3600, perform_note: 'done' }))
            expect(dispatch).toHaveBeenCalledWith('store', expect.objectContaining({
                entry: expect.objectContaining({ name: 'Test', start_filament: 100, start_printtime: 3600 }),
            }))
        })

        it('perform does nothing for non-existent entry', () => {
            const dispatch = vi.fn()
            actions.perform({ dispatch, state: { entries: {} } as any, rootState: {} } as any, { id: 'nonexistent', note: 'done' })
            expect(dispatch).not.toHaveBeenCalled()
        })
    })

    describe('getters', () => {
        it('getEntries returns all entries with ids', () => {
            state.entries = {
                e1: makeEntry({ name: 'Lube' }),
                e2: makeEntry({ name: 'Clean' }),
            }
            const result = (getters as any).getEntries(state)
            expect(result).toHaveLength(2)
            expect(result[0].id).toBe('e1')
            expect(result[1].id).toBe('e2')
        })

        it('getOverdueEntries returns entries with overdue filament reminder', () => {
            state.entries = {
                e1: makeEntry({
                    name: 'Filament',
                    start_filament: 0,
                    reminder: { ...defaultReminder, type: 'one-time', filament: { bool: true, value: 10 } },
                }),
            }
            const rootState = { server: { history: { job_totals: { total_filament_used: 15000 } } } }
            const result = (getters as any).getOverdueEntries(state, { getEntries: (getters as any).getEntries(state) }, rootState)
            expect(result).toHaveLength(1)
            expect(result[0].name).toBe('Filament')
        })

        it('getOverdueEntries returns entries with overdue printtime reminder', () => {
            state.entries = {
                e1: makeEntry({
                    name: 'Printtime',
                    start_printtime: 0,
                    reminder: { ...defaultReminder, type: 'one-time', printtime: { bool: true, value: 2 } },
                }),
            }
            const rootState = { server: { history: { job_totals: { total_print_time: 10800 } } } }
            const result = (getters as any).getOverdueEntries(state, { getEntries: (getters as any).getEntries(state) }, rootState)
            expect(result).toHaveLength(1)
            expect(result[0].name).toBe('Printtime')
        })

        it('getOverdueEntries returns entries with overdue date reminder', () => {
            state.entries = {
                e1: makeEntry({
                    name: 'Date',
                    start_time: 0,
                    reminder: { ...defaultReminder, type: 'one-time', date: { bool: true, value: 1 } },
                }),
            }
            // current time is now, so 0 + 1*86400 = 86400 which should be < current time
            const rootState = { server: { history: { job_totals: {} } } }
            const result = (getters as any).getOverdueEntries(state, { getEntries: (getters as any).getEntries(state) }, rootState)
            expect(result).toHaveLength(1)
            expect(result[0].name).toBe('Date')
        })

        it('getOverdueEntries filters out entries without reminder or with end_time', () => {
            state.entries = {
                e1: makeEntry({ name: 'No reminder', reminder: null as any }),
                e2: makeEntry({ name: 'Completed', end_time: 5000 }),
                e3: makeEntry({
                    name: 'Not overdue',
                    reminder: { ...defaultReminder, type: 'one-time', date: { bool: true, value: 365 } },
                    start_time: new Date().getTime() / 1000,
                }),
            }
            const rootState = { server: { history: { job_totals: {} } } }
            const result = (getters as any).getOverdueEntries(state, { getEntries: (getters as any).getEntries(state) }, rootState)
            expect(result).toEqual([])
        })
    })
})
