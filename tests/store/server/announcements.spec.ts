import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mutations } from '@/store/server/announcements/mutations'
import { actions } from '@/store/server/announcements/actions'
import { getters } from '@/store/server/announcements/getters'
import { getDefaultState } from '@/store/server/announcements/index'
import type { ServerAnnouncementsState } from '@/store/server/announcements/types'

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

describe('server announcements store', () => {
    let state: ServerAnnouncementsState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    describe('mutations', () => {
        it('reset restores defaults', () => {
            state.entries = [{ entry_id: '1', dismissed: false } as any]
            mutations.reset(state)
            expect(state.entries).toEqual([])
            expect(state.feeds).toEqual([])
        })

        it('setEntries replaces entries', () => {
            const entries = [{ entry_id: '1', title: 'Test' }]
            mutations.setEntries(state, entries)
            expect(state.entries).toEqual(entries)
        })

        it('setFeeds replaces feeds', () => {
            mutations.setFeeds(state, ['feed1', 'feed2'])
            expect(state.feeds).toEqual(['feed1', 'feed2'])
        })

        it('setDismissed marks entry as dismissed', () => {
            state.entries = [{ entry_id: '1', dismissed: false, date_dismissed: null, dismiss_wake: null } as any]
            mutations.setDismissed(state, { entry_id: '1', status: true })
            expect(state.entries[0].dismissed).toBe(true)
            expect(state.entries[0].date_dismissed).toBeInstanceOf(Date)
        })

        it('setDismissed marks entry as not dismissed', () => {
            state.entries = [
                {
                    entry_id: '1',
                    dismissed: true,
                    date_dismissed: new Date(),
                    dismiss_wake: new Date(),
                } as any,
            ]
            mutations.setDismissed(state, { entry_id: '1', status: false })
            expect(state.entries[0].dismissed).toBe(false)
            expect(state.entries[0].date_dismissed).toBeNull()
            expect(state.entries[0].dismiss_wake).toBeNull()
        })

        it('setDismissed does nothing for unknown entry', () => {
            mutations.setDismissed(state, { entry_id: 'unknown', status: true })
            expect(state.entries).toEqual([])
        })
    })

    describe('actions', () => {
        it('reset delegates to commit', () => {
            const commit = vi.fn()
            actions.reset({ commit } as any)
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('init emits announcements list request', () => {
            actions.init()
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.announcements.list',
                {},
                { action: 'server/announcements/getList' }
            )
        })

        it('getList processes entries and feeds', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const payload = {
                entries: [{ entry_id: '1', date: 1000000, date_dismissed: 0, dismiss_wake: 0, title: 'Test' }],
                feeds: ['feed1'],
            }
            await actions.getList({ commit, dispatch } as any, payload)
            expect(commit).toHaveBeenCalledWith('setEntries', expect.any(Array))
            expect((commit.mock.calls[0][1] as any[])[0].date).toBeInstanceOf(Date)
            expect(commit).toHaveBeenCalledWith('setFeeds', ['feed1'])
            expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'server/announcements/init', {
                root: true,
            })
        })

        it('getDismissed commits dismiss status', () => {
            const commit = vi.fn()
            actions.getDismissed({ commit } as any, { entry_id: '1' })
            expect(commit).toHaveBeenCalledWith('setDismissed', { entry_id: '1', status: true })
        })

        it('getWaked commits wake status', () => {
            const commit = vi.fn()
            actions.getWaked({ commit } as any, { entry_id: '1' })
            expect(commit).toHaveBeenCalledWith('setDismissed', { entry_id: '1', status: false })
        })

        it('close emits dismiss without wake_time', () => {
            actions.close({} as any, { entry_id: '1' })
            expect(mockSocket.emit).toHaveBeenCalledWith('server.announcements.dismiss', { entry_id: '1' })
        })

        it('dismiss emits dismiss with wake_time', () => {
            actions.dismiss({} as any, { entry_id: '1', time: 3600 })
            expect(mockSocket.emit).toHaveBeenCalledWith('server.announcements.dismiss', {
                entry_id: '1',
                wake_time: 3600,
            })
        })
    })

    describe('getters', () => {
        it('getAnnouncements filters out dismissed entries', () => {
            state.entries = [{ entry_id: '1', dismissed: false } as any, { entry_id: '2', dismissed: true } as any]
            const result = (getters as any).getAnnouncements(state)
            expect(result).toHaveLength(1)
            expect(result[0].entry_id).toBe('1')
        })
    })
})
