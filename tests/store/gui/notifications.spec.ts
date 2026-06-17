import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mutations } from '@/store/gui/notifications/mutations'
import { actions } from '@/store/gui/notifications/actions'
import { getDefaultState } from '@/store/gui/notifications/index'
import type { GuiNotificationState } from '@/store/gui/notifications/types'

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

describe('gui notifications store', () => {
    let state: GuiNotificationState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    describe('mutations', () => {
        it('reset restores defaults', () => {
            state.dismiss = [{ id: 'n1', category: 'update', type: 'ever', date: 1000 }]
            mutations.reset(state)
            expect(state.dismiss).toEqual([])
        })

        it('addDismiss adds a dismiss entry', () => {
            const entry = { id: 'e1', category: 'update', type: 'ever', date: 1000 }
            mutations.addDismiss(state, entry)
            expect(state.dismiss).toHaveLength(1)
            expect(state.dismiss[0]).toEqual(entry)
        })

        it('removeDismiss removes matching entry and everything after it', () => {
            state.dismiss = [
                { id: 'e1', category: 'update', type: 'ever', date: 1000 },
                { id: 'e2', category: 'warning', type: 'time', date: 2000 },
            ]
            mutations.removeDismiss(state, { id: 'e1', category: 'update', type: 'ever' })
            expect(state.dismiss).toHaveLength(0)
        })

        it('removeDismiss does nothing if no match', () => {
            state.dismiss = [{ id: 'e1', category: 'update', type: 'ever', date: 1000 }]
            mutations.removeDismiss(state, { id: 'e1', category: 'warning', type: 'ever' })
            expect(state.dismiss).toHaveLength(1)
        })
    })

    describe('actions', () => {
        it('reset delegates to commit', () => {
            const commit = vi.fn()
            actions.reset({ commit } as any)
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('upload emits database post_item', () => {
            const stateMock = { dismiss: [{ id: 'e1', category: 'update', type: 'ever', date: 1000 }] }
            actions.upload({ state: stateMock as any } as any)
            expect(mockSocket.emit).toHaveBeenCalledWith('server.database.post_item', {
                namespace: 'mainsail',
                key: 'notifications.dismiss',
                value: stateMock.dismiss,
            })
        })

        it('close dispatches announcement close for announcement category', () => {
            const dispatch = vi.fn()
            actions.close({ dispatch } as any, { id: 'announcement/entry1' })
            expect(dispatch).toHaveBeenCalledWith('server/announcements/close', { entry_id: 'entry1' }, { root: true })
        })

        it('close stores dismiss for non-announcement', () => {
            const dispatch = vi.fn()
            actions.close({ dispatch } as any, { id: 'update/v1.0' })
            expect(dispatch).toHaveBeenCalledWith('storeDismiss', {
                entry_id: 'v1.0',
                category: 'update',
                type: 'ever',
                time: null,
            })
        })

        it('close returns early if no slash in id', () => {
            const dispatch = vi.fn()
            actions.close({ dispatch } as any, { id: 'no-slash' })
            expect(dispatch).not.toHaveBeenCalled()
        })

        it('dismiss dispatches announcement dismiss for announcement category', () => {
            const dispatch = vi.fn()
            actions.dismiss({ dispatch } as any, { id: 'announcement/entry1', time: 3600, type: 'time' })
            expect(dispatch).toHaveBeenCalledWith(
                'server/announcements/dismiss',
                { entry_id: 'entry1', time: 3600 },
                { root: true }
            )
        })

        it('dismiss stores dismiss for non-announcement', () => {
            const dispatch = vi.fn()
            actions.dismiss({ dispatch } as any, { id: 'update/v1.0', time: 3600, type: 'time' })
            expect(dispatch).toHaveBeenCalledWith('storeDismiss', {
                entry_id: 'v1.0',
                category: 'update',
                type: 'time',
                time: 3600,
            })
        })

        it('storeDismiss adds a dismiss entry and uploads', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const stateMock = { dismiss: [] }
            const now = Date.now()
            vi.setSystemTime(now)
            await actions.storeDismiss({ commit, dispatch, state: stateMock as any } as any, {
                entry_id: 'e1',
                category: 'update',
                type: 'ever',
                time: null,
            })
            expect(commit).toHaveBeenCalledWith('addDismiss', {
                id: 'e1',
                category: 'update',
                type: 'ever',
                date: now,
            })
            expect(dispatch).toHaveBeenCalledWith('upload')
        })

        it('storeDismiss removes existing duplicate before adding', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const stateMock = {
                dismiss: [{ id: 'e1', category: 'update', type: 'ever', date: 1000 }],
            }
            await actions.storeDismiss({ commit, dispatch, state: stateMock as any } as any, {
                entry_id: 'e1',
                category: 'update',
                type: 'ever',
                time: null,
            })
            expect(commit).toHaveBeenCalledWith('removeDismiss', {
                id: 'e1',
                category: 'update',
                type: 'ever',
                date: expect.any(Number),
            })
            expect(commit).toHaveBeenCalledWith('addDismiss', expect.objectContaining({ id: 'e1' }))
        })
    })
})
