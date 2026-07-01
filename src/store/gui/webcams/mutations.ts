import { getDefaultState } from './index'
import { MutationTree } from 'vuex'
import { GuiWebcamState } from '@/store/gui/webcams/types'

export const mutations: MutationTree<GuiWebcamState> = {
    reset(state: GuiWebcamState) {
        Object.assign(state, getDefaultState())
    },

    initStore(state: GuiWebcamState, payload: any) {
        state.webcams = payload
    },
}
