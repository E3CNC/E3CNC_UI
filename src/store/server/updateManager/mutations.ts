import { getDefaultState } from './index'
import { MutationTree } from 'vuex'
import { getSocket } from '@/store/runtime'
import { ServerUpdateManagerState } from '@/store/server/updateManager/types'

export const mutations: MutationTree<ServerUpdateManagerState> = {
    reset(state: ServerUpdateManagerState) {
        Object.assign(state, getDefaultState())
    },

    resetRepos(state: ServerUpdateManagerState) {
        state.git_repos = []
        state.web_repos = []
        state.system = {
            package_count: 0,
            package_list: [],
        }
    },

    storeGitRepo(state: ServerUpdateManagerState, payload: any) {
        const newGitRepos = [...state.git_repos]
        newGitRepos.push({ ...payload })

        state.git_repos = newGitRepos
    },

    storeWebRepo(state: ServerUpdateManagerState, payload: any) {
        const newWebRepos = [...state.web_repos]
        newWebRepos.push({ ...payload })

        state.web_repos = newWebRepos
    },

    updateSystem(state: ServerUpdateManagerState, payload: any) {
        const newSystem = { ...state.system }
        newSystem.package_count = payload.package_count
        newSystem.package_list = payload.package_list

        state.system = newSystem
    },

    addUpdateResponse(state: ServerUpdateManagerState, payload: any) {
        if (state.updateResponse.application !== payload.application)
            state.updateResponse.application = payload.application

        if (state.updateResponse.complete !== payload.complete) state.updateResponse.complete = payload.complete

        if ('complete' in payload && payload.complete)
            getSocket().emit(
                'machine.update.status',
                { refresh: false },
                { action: 'server/updateManager/onUpdateStatus' }
            )

        state.updateResponse.messages.push({
            date: new Date(),
            message: payload.message,
        })
    },

    resetUpdateResponse(state: ServerUpdateManagerState) {
        state.updateResponse = {
            application: '',
            complete: true,
            messages: [],
        }
    },
}
