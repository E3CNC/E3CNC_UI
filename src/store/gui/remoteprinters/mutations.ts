import { getDefaultState } from './index'
import { MutationTree } from 'vuex'
import { GuiRemoteprintersState } from '@/store/gui/remoteprinters/types'

export const mutations: MutationTree<GuiRemoteprintersState> = {
    reset(state: GuiRemoteprintersState) {
        Object.assign(state, getDefaultState())
    },

    store(state: GuiRemoteprintersState, payload: any) {
        state.printers[payload.id] = payload.values
    },

    update(state: GuiRemoteprintersState, payload: any) {
        if (payload.id in state.printers) {
            const preset = { ...state.printers[payload.id] }
            Object.assign(preset, payload.values)

            state.printers[payload.id] = preset
        }
    },

    delete(state: GuiRemoteprintersState, payload: any) {
        if (payload in state.printers) {
            delete state.printers[payload]
        }
    },
}
