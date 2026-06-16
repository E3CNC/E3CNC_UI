import { getDefaultState } from './index'
import { MutationTree } from 'vuex'
import { PrinterState } from '@/store/printer/types'

export const mutations: MutationTree<PrinterState> = {
    reset(state) {
        const defaultState = getDefaultState()

        for (const key of Object.keys(state)) {
            if (!(key in defaultState) && key !== 'tempHistory') {
                delete state[key]
            }
        }

        for (const [key, value] of Object.entries(defaultState)) {
            state[key] = value
        }
    },

    setData(state, payload) {
        Object.keys(payload).forEach((key) => {
            const value = payload[key]

            if (typeof value !== 'object' || value === null || !(key in state)) {
                state[key] = value
                return
            }

            if (typeof value === 'object') {
                Object.keys(value).forEach((subkey) => {
                    state[key][subkey] = value[subkey]
                })
            }
        })
    },

    clearCurrentFile(state) {
        state.current_file = {}
    },

    setEndstopStatus(state, payload) {
        delete payload.requestParams

        state.endstops = payload
    },

    removeBedMeshProfile(state, payload) {
        if (state.bed_mesh?.profiles && payload in state.bed_mesh.profiles) {
            delete state.bed_mesh.profiles[payload]
            if (state.bed_mesh.profile_name === payload) {
                state.bed_mesh.profile_name = ''
            }
        }
    },
}
