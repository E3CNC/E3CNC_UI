import { getDefaultState } from './index'
import { MutationTree } from 'vuex'
import type { ServerJobQueueState, ServerJobQueueStateJob } from '@/store/server/jobQueue/types'

export const mutations: MutationTree<ServerJobQueueState> = {
    reset(state: ServerJobQueueState) {
        Object.assign(state, getDefaultState())
    },

    setQueuedJobs(state: ServerJobQueueState, payload: ServerJobQueueStateJob[]) {
        state.queued_jobs = payload
    },

    setQueueState(state: ServerJobQueueState, payload: string) {
        state.queue_state = payload
    },
}
