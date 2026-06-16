import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getters } from '@/store/server/jobQueue/getters'
import { mutations } from '@/store/server/jobQueue/mutations'
import { actions } from '@/store/server/jobQueue/actions'
import { getDefaultState } from '@/store/server/jobQueue/index'
import type { ServerJobQueueState } from '@/store/server/jobQueue/types'

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

describe('server job queue store', () => {
    let state: ServerJobQueueState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    // ── GETTER TESTS ───────────────────────────────────────────────────────────

    describe('getters', () => {
        it('groups queued jobs and fetches missing metadata', () => {
            state.queued_jobs = [
                { job_id: '1', filename: 'test.gcode', time_added: 1, time_in_queue: 10 },
                { job_id: '2', filename: 'test.gcode', time_added: 2, time_in_queue: 11 },
                { job_id: '3', filename: 'other.gcode', time_added: 3, time_in_queue: 12 },
            ]

            const files = {
                'gcodes/test.gcode': { metadataPulled: false },
                'gcodes/other.gcode': { metadataPulled: true },
            }

            const jobs = (getters as any).getJobs(state, {}, {}, {
                'files/getFile': (path: string) => files[path as keyof typeof files] ?? null,
            })

            expect(jobs).toHaveLength(2)
            expect(jobs[0].combinedIds).toEqual(['2'])
            expect(jobs[0].metadata).toEqual({ metadataPulled: false })
            expect(mockSocket.emit).toHaveBeenCalledWith('server.files.metadata', { filename: 'test.gcode' }, { action: 'files/getMetadata' })
            expect((getters as any).getJobsCount(state)).toBe(3)
        })

        it('getJobs does not re-fetch metadata when already pulled', () => {
            state.queued_jobs = [
                { job_id: '1', filename: 'known.gcode', time_added: 1, time_in_queue: 5 },
            ]

            const jobs = (getters as any).getJobs(state, {}, {}, {
                'files/getFile': () => ({ metadataPulled: true }),
            })

            expect(jobs).toHaveLength(1)
            expect(mockSocket.emit).not.toHaveBeenCalledWith('server.files.metadata', expect.anything(), expect.anything())
        })

        it('getJobs returns empty array when no queued jobs', () => {
            const jobs = (getters as any).getJobs(state, {}, {}, {
                'files/getFile': () => null,
            })
            expect(jobs).toEqual([])
        })

        it('getJobsCount returns 0 for empty queue', () => {
            expect((getters as any).getJobsCount(state)).toBe(0)
        })
    })

    // ── MUTATION TESTS ─────────────────────────────────────────────────────────

    describe('mutations', () => {
        it('reset restores defaults', () => {
            state.queued_jobs = [{ job_id: '1', filename: 'a.gcode', time_added: 1, time_in_queue: 1 }]
            state.queue_state = 'paused'
            mutations.reset(state)
            expect(state.queued_jobs).toEqual([])
            expect(state.queue_state).toBe('')
        })

        it('updates queue mutations and actions', () => {
            mutations.setQueuedJobs(state, [{ job_id: '1', filename: 'a.gcode', time_added: 1, time_in_queue: 1 }])
            mutations.setQueueState(state, 'paused')
            expect(state.queue_state).toBe('paused')

            const commit = vi.fn()
            const dispatch = vi.fn()

            actions.sendNewQueueList(null as any, {
                jobs: [
                    { job_id: '1', filename: 'a.gcode', time_added: 1, time_in_queue: 1, combinedIds: ['x'] },
                    { job_id: '2', filename: 'b.gcode', time_added: 2, time_in_queue: 2 },
                ],
                printStart: true,
            })

            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.job_queue.post_job',
                {
                    filenames: ['a.gcode', 'a.gcode', 'b.gcode'],
                    reset: true,
                },
                { action: 'server/jobQueue/start' }
            )

            actions.changeCount(
                { dispatch, getters: { getJobs: [{ job_id: '1', filename: 'a.gcode', time_added: 1, time_in_queue: 1 }] } } as any,
                { job_id: '1', count: 3 }
            )
            expect(dispatch).toHaveBeenCalledWith('sendNewQueueList', {
                jobs: [{ job_id: '1', filename: 'a.gcode', time_added: 1, time_in_queue: 1, combinedIds: ['1', '1'] }],
            })

            actions.clearQueue()
            expect(mockSocket.emit).toHaveBeenCalledWith('server.job_queue.delete_job', { all: true })
            expect(commit).toBeDefined()
        })
    })

    // ── ACTION TESTS ───────────────────────────────────────────────────────────

    describe('actions', () => {
        it('reset delegates to commit', () => {
            const commit = vi.fn()
            actions.reset({ commit } as any)
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('init emits queue status request', () => {
            actions.init()
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.job_queue.status',
                {},
                { action: 'server/jobQueue/getStatus' }
            )
        })

        it('getEvent commits updated_queue and queue_state', () => {
            const commit = vi.fn()
            const jobs = [{ job_id: '1', filename: 'a.gcode', time_added: 1, time_in_queue: 1 }]
            actions.getEvent({ commit } as any, {
                updated_queue: jobs,
                queue_state: 'paused',
            })
            expect(commit).toHaveBeenCalledWith('setQueuedJobs', jobs)
            expect(commit).toHaveBeenCalledWith('setQueueState', 'paused')
        })

        it('getEvent handles partial payload', () => {
            const commit = vi.fn()
            actions.getEvent({ commit } as any, { queue_state: 'printing' })
            expect(commit).not.toHaveBeenCalledWith('setQueuedJobs', expect.anything())
            expect(commit).toHaveBeenCalledWith('setQueueState', 'printing')
        })

        it('getEvent handles null updated_queue', () => {
            const commit = vi.fn()
            actions.getEvent({ commit } as any, { updated_queue: null, queue_state: '' })
            expect(commit).not.toHaveBeenCalledWith('setQueuedJobs', expect.anything())
        })

        it('getStatus commits jobs and state, removes init module', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const jobs = [{ job_id: '1', filename: 'a.gcode', time_added: 1, time_in_queue: 1 }]
            await actions.getStatus({ commit, dispatch } as any, {
                queued_jobs: jobs,
                queue_state: 'ready',
            })
            expect(commit).toHaveBeenCalledWith('setQueuedJobs', jobs)
            expect(commit).toHaveBeenCalledWith('setQueueState', 'ready')
            expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'server/jobQueue/init', { root: true })
        })

        it('addToQueue emits post_job with filenames', () => {
            actions.addToQueue(null as any, ['a.gcode', 'b.gcode'])
            expect(mockSocket.emit).toHaveBeenCalledWith('server.job_queue.post_job', {
                filenames: ['a.gcode', 'b.gcode'],
            })
        })

        it('changeCount returns early for unknown job_id', () => {
            const dispatch = vi.fn()
            actions.changeCount(
                { dispatch, getters: { getJobs: [] } } as any,
                { job_id: 'unknown', count: 3 }
            )
            expect(dispatch).not.toHaveBeenCalled()
        })

        it('changePosition dispatches sendNewQueueList with reordered jobs', () => {
            const dispatch = vi.fn()
            const jobs = [
                { job_id: '1', filename: 'a.gcode', time_added: 1, time_in_queue: 1, combinedIds: [] },
                { job_id: '2', filename: 'b.gcode', time_added: 2, time_in_queue: 2, combinedIds: [] },
                { job_id: '3', filename: 'c.gcode', time_added: 3, time_in_queue: 3, combinedIds: [] },
            ]
            actions.changePosition(
                { dispatch, getters: { getJobs: jobs } } as any,
                { oldIndex: 2, newIndex: 0 }
            )
            expect(dispatch).toHaveBeenCalledWith('sendNewQueueList', {
                jobs: [
                    { job_id: '3', filename: 'c.gcode', time_added: 3, time_in_queue: 3, combinedIds: [] },
                    { job_id: '1', filename: 'a.gcode', time_added: 1, time_in_queue: 1, combinedIds: [] },
                    { job_id: '2', filename: 'b.gcode', time_added: 2, time_in_queue: 2, combinedIds: [] },
                ],
            })
        })

        it('startByJobId moves job to front and starts queue', () => {
            const dispatch = vi.fn()
            const jobs = [
                { job_id: '1', filename: 'a.gcode', time_added: 1, time_in_queue: 1, combinedIds: [] },
                { job_id: '2', filename: 'b.gcode', time_added: 2, time_in_queue: 2, combinedIds: [] },
            ]
            actions.startByJobId(
                { dispatch, getters: { getJobs: jobs } } as any,
                '2'
            )
            expect(dispatch).toHaveBeenCalledWith('sendNewQueueList', {
                jobs: [
                    { job_id: '2', filename: 'b.gcode', time_added: 2, time_in_queue: 2, combinedIds: [] },
                    { job_id: '1', filename: 'a.gcode', time_added: 1, time_in_queue: 1, combinedIds: [] },
                ],
                printStart: true,
            })
        })

        it('startByJobId returns early for unknown job_id', () => {
            const dispatch = vi.fn()
            actions.startByJobId(
                { dispatch, getters: { getJobs: [] } } as any,
                'unknown'
            )
            expect(dispatch).not.toHaveBeenCalled()
        })

        it('deleteFromQueue emits delete_job with job_ids', () => {
            actions.deleteFromQueue(null as any, ['1', '2'])
            expect(mockSocket.emit).toHaveBeenCalledWith('server.job_queue.delete_job', { job_ids: ['1', '2'] })
        })

        it('start emits job_queue.start', () => {
            actions.start()
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.job_queue.start',
                {},
                { loading: 'startJobqueue' }
            )
        })

        it('pause emits job_queue.pause', () => {
            actions.pause()
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.job_queue.pause',
                {},
                { loading: 'pauseJobqueue' }
            )
        })

        it('sendNewQueueList without printStart does not set action option', () => {
            actions.sendNewQueueList(null as any, {
                jobs: [{ job_id: '1', filename: 'a.gcode', time_added: 1, time_in_queue: 1 }],
            })
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.job_queue.post_job',
                { filenames: ['a.gcode'], reset: true },
                {}
            )
        })

        it('sendNewQueueList handles jobs without combinedIds property', () => {
            actions.sendNewQueueList(null as any, {
                jobs: [{ job_id: '1', filename: 'a.gcode', time_added: 1, time_in_queue: 1 } as any],
            })
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.job_queue.post_job',
                { filenames: ['a.gcode'], reset: true },
                {}
            )
        })
    })
})
