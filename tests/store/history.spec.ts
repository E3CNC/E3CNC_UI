import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getters } from '@/store/server/history/getters'
import { mutations } from '@/store/server/history/mutations'
import { actions } from '@/store/server/history/actions'
import { getDefaultState } from '@/store/server/history/index'
import type { ServerHistoryState } from '@/store/server/history/types'

const mockSocket = {
    emit: vi.fn(),
}

vi.mock('@/store/runtime', () => ({
    getSocket: () => mockSocket,
    $toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

describe('server history store', () => {
    let state: ServerHistoryState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    // ── GETTER TESTS ───────────────────────────────────────────────────────────

    describe('getters', () => {
        it('computes totals and filtered job lists', () => {
            state.jobs = [
                {
                    job_id: '1',
                    exists: true,
                    end_time: 0,
                    filament_used: 4,
                    filename: 'one.gcode',
                    metadata: { uuid: 'uuid-1', size: 100, modified: 10 },
                    print_duration: 10,
                    status: 'completed',
                    start_time: 0,
                    total_duration: 10,
                },
                {
                    job_id: '2',
                    exists: true,
                    end_time: 0,
                    filament_used: 6,
                    filename: 'two.gcode',
                    metadata: { uuid: 'uuid-2', size: 200, modified: 20 },
                    print_duration: 30,
                    status: 'failed',
                    start_time: 0,
                    total_duration: 30,
                },
            ]

            expect((getters as any).getTotalPrintTime(state)).toBe(40)
            expect((getters as any).getTotalCompletedPrintTime(state)).toBe(10)
            expect((getters as any).getTotalFilamentUsed(state)).toBe(10)
            expect((getters as any).getTotalJobsCount(state)).toBe(2)
            expect((getters as any).getTotalCompletedJobsCount(state)).toBe(1)
            expect(
                (getters as any).getAvgPrintTime(state, {
                    getTotalCompletedPrintTime: 10,
                    getTotalCompletedJobsCount: 1,
                })
            ).toBe(10)
            expect((getters as any).getPrintJobById(state)('1')?.filename).toBe('one.gcode')
            expect((getters as any).getPrintStatusByFilename(state)('one.gcode', 10_000)).toBe('completed')
            expect(
                (getters as any).getPrintJobsForGcodes(state)('one.gcode', 10_000, 100, 'uuid-1', null)
            ).toHaveLength(1)
            expect(
                (getters as any).getFilteredJobList(
                    state,
                    {},
                    { gui: { view: { history: { hidePrintStatus: ['failed'] } } } }
                )
            ).toHaveLength(1)
        })

        it('getLongestPrintTime returns the longest print duration', () => {
            state.jobs = [
                { job_id: '1', print_duration: 10, status: 'completed' } as any,
                { job_id: '2', print_duration: 50, status: 'completed' } as any,
                { job_id: '3', print_duration: 20, status: 'failed' } as any,
            ]
            expect((getters as any).getLongestPrintTime(state)).toBe(50)
        })

        it('getLongestPrintTime returns 0 for empty jobs', () => {
            expect((getters as any).getLongestPrintTime(state)).toBe(0)
        })

        it('getPrintStatus returns status by job id', () => {
            state.jobs = [{ job_id: '1', status: 'completed' } as any, { job_id: '2', status: 'failed' } as any]
            expect((getters as any).getPrintStatus(state)('1')).toBe('completed')
            expect((getters as any).getPrintStatus(state)('2')).toBe('failed')
            expect((getters as any).getPrintStatus(state)('unknown')).toBe('')
        })

        it('getPrintStatus returns empty for empty jobs', () => {
            expect((getters as any).getPrintStatus(state)('1')).toBe('')
        })

        it('getPrintJobById returns undefined for empty jobs', () => {
            expect((getters as any).getPrintJobById(state)('1')).toBeUndefined()
        })

        it('getPrintJobsForGcodes returns empty for empty jobs', () => {
            expect((getters as any).getPrintJobsForGcodes(state)('x.gcode', 0, 0, null, null)).toEqual([])
        })

        it('getPrintJobsForGcodes matches by metadata when no uuid', () => {
            state.jobs = [
                { job_id: '1', metadata: { size: 100, modified: 10 }, filename: 'a.gcode' } as any,
                { job_id: '2', metadata: { size: 200, modified: 20 }, filename: 'b.gcode' } as any,
            ]
            // metadata.size === 100, metadata.modified * 1000 === 10000
            const result = (getters as any).getPrintJobsForGcodes(state)('a.gcode', 10_000, 100, null, null)
            expect(result).toHaveLength(1)
            expect(result[0].job_id).toBe('1')
        })

        it('getPrintJobsForGcodes filters by job_id when uuid lookup fails', () => {
            state.jobs = [{ job_id: '1', metadata: { size: 100, modified: 10 }, filename: 'a.gcode' } as any]
            // non-matching metadata
            const result = (getters as any).getPrintJobsForGcodes(state)('different.gcode', 0, 999, null, 'nonexistent')
            expect(result).toEqual([])
        })

        it('getPrintStatusByFilename returns empty string when no jobs', () => {
            expect((getters as any).getPrintStatusByFilename(state)('x.gcode', 0)).toBe('')
        })

        it('getAvgPrintTime returns 0 when no completed jobs', () => {
            expect(
                (getters as any).getAvgPrintTime(state, {
                    getTotalCompletedPrintTime: 0,
                    getTotalCompletedJobsCount: 0,
                })
            ).toBe(0)
        })
    })

    // ── MUTATION TESTS ─────────────────────────────────────────────────────────

    describe('mutations', () => {
        it('reset restores default state', () => {
            state.jobs = [{ job_id: '1' } as any]
            state.all_loaded = true
            mutations.reset(state)
            expect(state.jobs).toEqual([])
            expect(state.all_loaded).toBe(false)
            expect(state.job_totals.total_jobs).toBe(0)
        })

        it('updates history state with mutations', () => {
            mutations.setTotals(state, { total_jobs: 1 })
            mutations.setAuxiliaryTotals(state, [{ field: 'temp', maximum: 1, provider: 'test', total: 1 } as any])
            mutations.addJob(state, {
                job_id: '1',
                exists: true,
                end_time: 0,
                filament_used: 1,
                filename: 'one.gcode',
                metadata: {},
                print_duration: 1,
                status: 'completed',
                start_time: 0,
                total_duration: 1,
            })
            mutations.setHistoryNotes(state, { job_id: '1', text: 'note' })
            mutations.updateJob(state, {
                job_id: '1',
                exists: true,
                end_time: 0,
                filament_used: 2,
                filename: 'one.gcode',
                metadata: {},
                print_duration: 2,
                status: 'failed',
                start_time: 0,
                total_duration: 2,
            })
            mutations.setAllLoaded(state)
            mutations.destroyJob(state, '1')
            mutations.resetJobs(state)

            expect(state.job_totals.total_jobs).toBe(1)
            expect(state.auxiliary_totals).toHaveLength(1)
            expect(state.all_loaded).toBe(true)
            expect(state.jobs).toEqual([])
        })

        it('updateJob does nothing for unknown job', () => {
            mutations.addJob(state, { job_id: '1' } as any)
            mutations.updateJob(state, { job_id: 'unknown' } as any)
            expect(state.jobs).toHaveLength(1)
            expect(state.jobs[0].job_id).toBe('1')
        })

        it('destroyJob does nothing for unknown job', () => {
            mutations.addJob(state, { job_id: '1' } as any)
            mutations.destroyJob(state, 'unknown')
            expect(state.jobs).toHaveLength(1)
        })

        it('setHistoryNotes does nothing for unknown job', () => {
            mutations.setHistoryNotes(state, { job_id: 'unknown', text: 'test' })
            expect(state.jobs).toEqual([])
        })
    })

    // ── ACTION TESTS ───────────────────────────────────────────────────────────

    describe('actions', () => {
        it('reset delegates to commit', () => {
            const commit = vi.fn()
            actions.reset({ commit } as any)
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('init emits history list and totals requests', () => {
            actions.init()
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.history.list',
                { start: 0, limit: 50, max: 100 },
                { action: 'server/history/getHistory' }
            )
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.history.totals',
                {},
                { action: 'server/history/getTotals' }
            )
        })

        it('getTotals commits job totals', () => {
            const commit = vi.fn()
            actions.getTotals({ commit } as any, {
                job_totals: { total_jobs: 5 },
                auxiliary_totals: [{ field: 'temp', maximum: 100, provider: 'sensor', total: 50 }],
            })
            expect(commit).toHaveBeenCalledWith('setTotals', { total_jobs: 5 })
            expect(commit).toHaveBeenCalledWith('setAuxiliaryTotals', [
                { field: 'temp', maximum: 100, provider: 'sensor', total: 50 },
            ])
        })

        it('getTotals skips auxiliary_totals when empty', () => {
            const commit = vi.fn()
            actions.getTotals({ commit } as any, { job_totals: { total_jobs: 1 } })
            expect(commit).toHaveBeenCalledWith('setTotals', { total_jobs: 1 })
            expect(commit).not.toHaveBeenCalledWith('setAuxiliaryTotals', expect.anything())
        })

        it('loads history and stores notes', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()

            await actions.getHistory({ commit, dispatch, state, rootState: { server: { dbNamespaces: [] } } } as any, {
                jobs: [
                    {
                        job_id: '1',
                        exists: true,
                        end_time: 0,
                        filament_used: 1,
                        filename: 'one.gcode',
                        metadata: {},
                        print_duration: 1,
                        status: 'completed',
                        start_time: 0,
                        total_duration: 1,
                    },
                ],
                requestParams: { start: 0, limit: 50, max: 100 },
            })

            expect(commit).toHaveBeenCalledWith('resetJobs')
            expect(commit).toHaveBeenCalledWith('addJob', expect.any(Object))
            expect(commit).toHaveBeenCalledWith('setAllLoaded')
            expect(dispatch).toHaveBeenCalledWith('socket/removeLoading', { name: 'historyLoadAll' }, { root: true })
            expect(dispatch).toHaveBeenCalledWith('loadHistoryNotes')

            await actions.saveHistoryNote({ commit } as any, { job_id: '1', note: 'saved' })
            expect(mockSocket.emit).toHaveBeenCalledWith('server.database.post_item', {
                namespace: 'history_notes',
                key: '1',
                value: { text: 'saved' },
            })
            expect(commit).toHaveBeenCalledWith('setHistoryNotes', { job_id: '1', text: 'saved' })
        })

        it('getHistory paginates when more data available', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            // Generate 50 jobs to trigger pagination
            const jobs = Array.from({ length: 50 }, (_, i) => ({
                job_id: `${i}`,
                exists: true,
                end_time: 0,
                filament_used: 1,
                filename: `${i}.gcode`,
                metadata: {},
                print_duration: 1,
                status: 'completed',
                start_time: 0,
                total_duration: 1,
            }))

            await actions.getHistory({ commit, dispatch, state, rootState: { server: { dbNamespaces: [] } } } as any, {
                jobs,
                requestParams: { start: 0, limit: 50, max: 100 },
            })

            // Should emit a follow-up request since jobs.length === limit and max > start + limit
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.history.list',
                { start: 50, limit: 50, max: 100 },
                { action: 'server/history/getHistory' }
            )
            expect(dispatch).not.toHaveBeenCalledWith('loadHistoryNotes')
        })

        it('getHistory does not paginate when start+limit >= max', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const jobs = Array.from(
                { length: 50 },
                (_, i) =>
                    ({
                        job_id: `${i}`,
                        exists: true,
                        end_time: 0,
                        filament_used: 1,
                        filename: `${i}.gcode`,
                        metadata: {},
                        print_duration: 1,
                        status: 'completed',
                        start_time: 0,
                        total_duration: 1,
                    }) as any
            )

            await actions.getHistory({ commit, dispatch, state, rootState: { server: { dbNamespaces: [] } } } as any, {
                jobs,
                requestParams: { start: 0, limit: 50, max: 50 },
            })

            // With start=0, limit=50, max=50 → max > start + limit is false (50 > 50 is false)
            // So it should NOT paginate, and should setAllLoaded + loadHistoryNotes
            expect(dispatch).toHaveBeenCalledWith('loadHistoryNotes')
        })

        it('getHistory does not reset jobs when start > 0', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            state.jobs = [{ job_id: 'existing', filename: 'existing.gcode' } as any]

            await actions.getHistory({ commit, dispatch, state, rootState: { server: { dbNamespaces: [] } } } as any, {
                jobs: [{ job_id: 'new', filename: 'new.gcode' } as any],
                requestParams: { start: 50, limit: 50 },
            })

            expect(commit).not.toHaveBeenCalledWith('resetJobs')
            expect(commit).toHaveBeenCalledWith('addJob', expect.objectContaining({ job_id: 'new' }))
        })

        it('loadHistoryNotes fetches notes when namespace exists', () => {
            const dispatch = vi.fn()
            actions.loadHistoryNotes({ dispatch, rootState: { server: { dbNamespaces: ['history_notes'] } } } as any)
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.database.get_item',
                { namespace: 'history_notes' },
                { action: 'server/history/initHistoryNotes' }
            )
        })

        it('loadHistoryNotes removes init module when namespace missing', () => {
            const dispatch = vi.fn()
            actions.loadHistoryNotes({ dispatch, rootState: { server: { dbNamespaces: [] } } } as any)
            expect(mockSocket.emit).not.toHaveBeenCalled()
            expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'server/history/init', { root: true })
        })

        it('initHistoryNotes processes notes and removes init module', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            await actions.initHistoryNotes({ commit, dispatch } as any, {
                value: { '1': { text: 'note1' }, '2': { text: 'note2' } },
            })
            expect(commit).toHaveBeenCalledWith('setHistoryNotes', { job_id: '1', text: 'note1' })
            expect(commit).toHaveBeenCalledWith('setHistoryNotes', { job_id: '2', text: 'note2' })
            expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'server/history/init', { root: true })
        })

        it('getChanged handles added action', () => {
            const commit = vi.fn()
            const job = { job_id: '1', filename: 'new.gcode' } as any
            actions.getChanged({ commit } as any, { action: 'added', job })
            expect(commit).toHaveBeenCalledWith('addJob', job)
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.history.totals',
                {},
                { action: 'server/history/getTotals' }
            )
        })

        it('getChanged handles finished action', () => {
            const commit = vi.fn()
            const job = { job_id: '1', filename: 'updated.gcode' } as any
            actions.getChanged({ commit } as any, { action: 'finished', job })
            expect(commit).toHaveBeenCalledWith('updateJob', job)
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.history.totals',
                {},
                { action: 'server/history/getTotals' }
            )
        })

        it('getDeletedJobs deletes each job', () => {
            const commit = vi.fn()
            actions.getDeletedJobs({ commit } as any, { deleted_jobs: ['1', '2'] })
            expect(commit).toHaveBeenCalledWith('destroyJob', '1')
            expect(commit).toHaveBeenCalledWith('destroyJob', '2')
        })

        it('getDeletedJobs handles missing deleted_jobs', () => {
            const commit = vi.fn()
            actions.getDeletedJobs({ commit } as any, {})
            expect(commit).not.toHaveBeenCalled()
        })

        it('getHistory without requestParams skips resetJobs and uses defaults', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            await actions.getHistory({ commit, dispatch, state, rootState: { server: { dbNamespaces: [] } } } as any, {
                jobs: [
                    {
                        job_id: '1',
                        filename: 'a.gcode',
                        metadata: {},
                        print_duration: 1,
                        status: 'completed',
                        start_time: 0,
                        end_time: 1,
                        total_duration: 1,
                        exists: true,
                        filament_used: 1,
                    } as any,
                ],
            })
            expect(commit).not.toHaveBeenCalledWith('resetJobs')
            expect(commit).toHaveBeenCalledWith('addJob', expect.any(Object))
            expect(dispatch).toHaveBeenCalledWith('loadHistoryNotes')
        })

        it('getHistory with requestParams missing start/limit/max uses defaults', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            await actions.getHistory({ commit, dispatch, state, rootState: { server: { dbNamespaces: [] } } } as any, {
                jobs: [
                    {
                        job_id: '1',
                        filename: 'a.gcode',
                        metadata: {},
                        print_duration: 1,
                        status: 'completed',
                        start_time: 0,
                        end_time: 1,
                        total_duration: 1,
                        exists: true,
                        filament_used: 1,
                    } as any,
                ],
                requestParams: {},
            })
            expect(commit).toHaveBeenCalledWith('resetJobs')
            expect(dispatch).toHaveBeenCalledWith('loadHistoryNotes')
        })

        it('getHistory with requestParams.start non-zero skips resetJobs', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            await actions.getHistory({ commit, dispatch, state, rootState: { server: { dbNamespaces: [] } } } as any, {
                jobs: [],
                requestParams: { start: 50, limit: 50 },
            })
            expect(commit).not.toHaveBeenCalledWith('resetJobs')
            expect(dispatch).toHaveBeenCalledWith('loadHistoryNotes')
        })

        it('getHistory does not setAllLoaded when jobs.length equals limit', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const jobs = Array.from({ length: 50 }, (_, i) => ({
                job_id: `${i}`,
                filename: `${i}.gcode`,
                metadata: {},
                print_duration: 1,
                status: 'completed',
                start_time: 0,
                end_time: 1,
                total_duration: 1,
                exists: true,
                filament_used: 1,
            }))

            await actions.getHistory({ commit, dispatch, state, rootState: { server: { dbNamespaces: [] } } } as any, {
                jobs,
                requestParams: { start: 50, limit: 50 },
            })
            expect(commit).not.toHaveBeenCalledWith('setAllLoaded')
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.history.list',
                { start: 100, limit: 50, max: null },
                { action: 'server/history/getHistory' }
            )
        })

        it('getHistory paginates when max is null and limit > 0', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const jobs = Array.from({ length: 50 }, (_, i) => ({
                job_id: `${i}`,
                filename: `${i}.gcode`,
                metadata: {},
                print_duration: 1,
                status: 'completed',
                start_time: 0,
                end_time: 1,
                total_duration: 1,
                exists: true,
                filament_used: 1,
            }))

            await actions.getHistory({ commit, dispatch, state, rootState: { server: { dbNamespaces: [] } } } as any, {
                jobs,
                requestParams: { start: 0, limit: 50 },
            })
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.history.list',
                { start: 50, limit: 50, max: null },
                { action: 'server/history/getHistory' }
            )
        })
    })
})
