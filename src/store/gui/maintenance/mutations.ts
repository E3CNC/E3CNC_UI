import { MutationTree } from 'vuex'
import { GuiMaintenanceState } from '@/store/gui/maintenance/types'
import { getDefaultState } from './index'

export const mutations: MutationTree<GuiMaintenanceState> = {
    reset(state: GuiMaintenanceState) {
        Object.assign(state, getDefaultState())
    },

    initStore(state: GuiMaintenanceState, payload: any) {
        state.entries = payload
    },

    store(state: GuiMaintenanceState, payload: any) {
        state.entries[payload.id] = payload.values
    },

    update(state: GuiMaintenanceState, payload: any) {
        if (!(payload.id in state.entries)) return

        const entry = { ...state.entries[payload.id] }
        Object.assign(entry, payload.entry)
        state.entries[payload.id] = entry
    },

    delete(state: GuiMaintenanceState, payload: any) {
        if (payload in state.entries) {
            delete state.entries[payload]
        }
    },
}
