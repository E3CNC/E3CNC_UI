import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mutations } from '@/store/gui/navigation/mutations'
import { actions } from '@/store/gui/navigation/actions'
import { getDefaultState } from '@/store/gui/navigation/index'
import type { GuiNavigationState } from '@/store/gui/navigation/types'

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

describe('gui navigation store', () => {
    let state: GuiNavigationState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    describe('mutations', () => {
        it('reset restores defaults', () => {
            state.entries = [{ type: 'route', title: 'Dashboard', visible: true, position: 0 }]
            mutations.reset(state)
            expect(state.entries).toEqual([])
        })

        it('updatePos updates existing entry position', () => {
            state.entries = [{ type: 'route', title: 'Dashboard', visible: true, position: 0 }]
            mutations.updatePos(state, { type: 'route', title: 'Dashboard', visible: true, position: 2 })
            expect(state.entries[0].position).toBe(2)
        })

        it('updatePos creates new entry if not found', () => {
            mutations.updatePos(state, { type: 'link', title: 'External', visible: true, position: 1 })
            expect(state.entries).toHaveLength(1)
            expect(state.entries[0].type).toBe('link')
            expect(state.entries[0].position).toBe(1)
        })

        it('changeVisibility toggles existing entry visibility', () => {
            state.entries = [{ type: 'route', title: 'Dashboard', visible: true, position: 0 }]
            mutations.changeVisibility(state, { type: 'route', title: 'Dashboard', visible: true, position: 0 })
            expect(state.entries[0].visible).toBe(false)
        })

        it('changeVisibility uses orgTitle when provided', () => {
            state.entries = [{ type: 'route', title: 'Original', visible: true, position: 0 }]
            mutations.changeVisibility(state, {
                type: 'route',
                orgTitle: 'Original',
                title: 'Changed',
                visible: true,
                position: 0,
            })
            expect(state.entries[0].visible).toBe(false)
        })

        it('changeVisibility creates new entry if not found', () => {
            mutations.changeVisibility(state, { type: 'route', title: 'New Page', visible: false, position: 0 })
            expect(state.entries[0].visible).toBe(true) // toggles from false
            expect(state.entries[0].title).toBe('New Page')
        })
    })

    describe('actions', () => {
        it('reset delegates to commit', () => {
            const commit = vi.fn()
            actions.reset({ commit } as any)
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('upload emits database post_item', () => {
            const stateMock = { entries: [{ type: 'route', title: 'Dashboard', visible: true, position: 0 }] }
            actions.upload({ state: stateMock as any } as any)
            expect(mockSocket.emit).toHaveBeenCalledWith('server.database.post_item', {
                namespace: 'mainsail',
                key: 'navigation.entries',
                value: stateMock.entries,
            })
        })

        it('updatePos commits position update', () => {
            const commit = vi.fn()
            actions.updatePos({ commit } as any, { type: 'route', title: 'Dashboard', visible: true, position: 2 })
            expect(commit).toHaveBeenCalledWith('updatePos', {
                type: 'route',
                title: 'Dashboard',
                visible: true,
                position: 2,
            })
        })

        it('changeVisibility commits and uploads', () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            actions.changeVisibility({ commit, dispatch } as any, {
                type: 'route',
                title: 'Dashboard',
                visible: true,
                position: 0,
            })
            expect(commit).toHaveBeenCalledWith('changeVisibility', {
                type: 'route',
                title: 'Dashboard',
                visible: true,
                position: 0,
            })
            expect(dispatch).toHaveBeenCalledWith('upload')
        })
    })
})
