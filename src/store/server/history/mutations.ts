import { getDefaultState } from './index'
import { MutationTree } from 'vuex'
import { ServerHistoryState } from '@/store/server/history/types'

export const mutations: MutationTree<ServerHistoryState> = {
    reset(state: ServerHistoryState) {
        Object.assign(state, getDefaultState())
    },

    resetJobs(state: ServerHistoryState) {
        state.jobs = []
    },

    setTotals(state: ServerHistoryState, payload: any) {
        state.job_totals = payload
    },

    setAuxiliaryTotals(state: ServerHistoryState, payload: any) {
        state.auxiliary_totals = payload
    },

    setHistoryNotes(state: ServerHistoryState, payload: any) {
        const job = state.jobs.find((job) => job.job_id === payload.job_id)
        if (job) job.note = payload.text
    },

    addJob(state: ServerHistoryState, payload: any) {
        const jobs = [...state.jobs]
        jobs.push(payload)

        state.jobs = jobs
    },

    updateJob(state: ServerHistoryState, payload: any) {
        const index = state.jobs.findIndex((job) => job.job_id === payload.job_id)
        if (index !== -1) state.jobs[index] = payload
    },

    destroyJob(state: ServerHistoryState, payload: any) {
        const index = state.jobs.findIndex((job) => job.job_id === payload)
        if (index !== -1) state.jobs.splice(index, 1)
    },

    setAllLoaded(state: ServerHistoryState) {
        state.all_loaded = true
    },
}
