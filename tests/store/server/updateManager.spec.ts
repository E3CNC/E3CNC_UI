import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mutations } from '@/store/server/updateManager/mutations'
import { actions } from '@/store/server/updateManager/actions'
import { getters } from '@/store/server/updateManager/getters'
import { getDefaultState } from '@/store/server/updateManager/index'
import type { ServerUpdateManagerState } from '@/store/server/updateManager/types'

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
    caseInsensitiveSort: (arr: any[], key: string) =>
        arr.sort((a: any, b: any) => (a[key] ?? '').localeCompare(b[key] ?? '')),
}))

describe('server updateManager store', () => {
    let state: ServerUpdateManagerState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    describe('mutations', () => {
        it('reset restores defaults', () => {
            state.busy = true
            mutations.reset(state)
            expect(state.busy).toBe(false)
            expect(state.git_repos).toEqual([])
            expect(state.updateResponse.complete).toBe(true)
        })

        it('resetRepos clears all repos and system', () => {
            state.git_repos = [{ name: 'repo1' } as any]
            state.web_repos = [{ name: 'repo2' } as any]
            state.system = { package_count: 5, package_list: ['a'] }
            mutations.resetRepos(state)
            expect(state.git_repos).toEqual([])
            expect(state.web_repos).toEqual([])
            expect(state.system.package_count).toBe(0)
            expect(state.system.package_list).toEqual([])
        })

        it('storeGitRepo pushes a new git repo', () => {
            mutations.storeGitRepo(state, { name: 'klipper', version: 'v1.0' })
            expect(state.git_repos).toHaveLength(1)
            expect(state.git_repos[0].name).toBe('klipper')
        })

        it('storeWebRepo pushes a new web repo', () => {
            mutations.storeWebRepo(state, { name: 'mainsail', version: 'v2.0' })
            expect(state.web_repos).toHaveLength(1)
            expect(state.web_repos[0].name).toBe('mainsail')
        })

        it('updateSystem updates package count and list', () => {
            mutations.updateSystem(state, { package_count: 3, package_list: ['pkg1', 'pkg2'] })
            expect(state.system.package_count).toBe(3)
            expect(state.system.package_list).toEqual(['pkg1', 'pkg2'])
        })

        it('addUpdateResponse updates application and complete status', () => {
            const now = Date.now()
            vi.setSystemTime(now)
            mutations.addUpdateResponse(state, {
                application: 'mainsail',
                complete: false,
                message: 'Downloading...',
            })
            expect(state.updateResponse.application).toBe('mainsail')
            expect(state.updateResponse.complete).toBe(false)
            expect(state.updateResponse.messages).toHaveLength(1)
            expect(state.updateResponse.messages[0].message).toBe('Downloading...')
            expect(mockSocket.emit).not.toHaveBeenCalled()
        })

        it('addUpdateResponse emits status refresh when complete', () => {
            mutations.addUpdateResponse(state, {
                application: 'mainsail',
                complete: true,
                message: 'Done',
            })
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'machine.update.status',
                { refresh: false },
                { action: 'server/updateManager/onUpdateStatus' }
            )
        })

        it('resetUpdateResponse clears update response', () => {
            state.updateResponse = {
                application: 'mainsail',
                complete: false,
                messages: [{ date: new Date(), message: 'test' }],
            }
            mutations.resetUpdateResponse(state)
            expect(state.updateResponse.complete).toBe(true)
            expect(state.updateResponse.messages).toEqual([])
        })
    })

    describe('actions', () => {
        it('reset delegates to commit', () => {
            const commit = vi.fn()
            actions.reset({ commit } as any)
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('init emits machine.update.status', () => {
            actions.init()
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'machine.update.status',
                {},
                { action: 'server/updateManager/onUpdateStatus' }
            )
        })

        it('onUpdateStatus stores git repos, web repos, and system', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const payload = {
                version_info: {
                    klipper: { configured_type: 'git_repo', name: 'klipper', version: 'v1.0' },
                    mainsail: { configured_type: 'web', name: 'mainsail', version: 'v2.0' },
                    system: { package_count: 2, package_list: ['pkg1'] },
                },
            }
            await actions.onUpdateStatus({ commit, dispatch } as any, payload)
            expect(commit).toHaveBeenCalledWith('resetRepos')
            expect(commit).toHaveBeenCalledWith('storeGitRepo', {
                configured_type: 'git_repo',
                name: 'klipper',
                version: 'v1.0',
            })
            expect(commit).toHaveBeenCalledWith('storeWebRepo', {
                configured_type: 'web',
                name: 'mainsail',
                version: 'v2.0',
            })
            expect(commit).toHaveBeenCalledWith('updateSystem', { package_count: 2, package_list: ['pkg1'] })
            expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'server/updateManager/init', {
                root: true,
            })
        })
    })

    describe('getters', () => {
        it('getUpdateManagerList returns sorted combined list', () => {
            state.git_repos = [
                { name: 'klipper', configured_type: 'git_repo', owner: '', version: 'v1.0', remote_version: 'v1.1' },
            ]
            state.web_repos = [
                { name: 'mainsail', configured_type: 'web', owner: '', version: 'v2.0', remote_version: 'v2.1' },
            ]
            const result = (getters as any).getUpdateManagerList(state)
            expect(result).toHaveLength(2)
            expect(result[0].name).toBe('klipper')
            expect(result[0].type).toBe('git')
            expect(result[1].name).toBe('mainsail')
            expect(result[1].type).toBe('web')
        })
    })
})
