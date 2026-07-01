import { getDefaultState } from './index'
import { MutationTree } from 'vuex'
import { GuiGcodehistoryState } from '@/store/gui/gcodehistory/types'

export const mutations: MutationTree<GuiGcodehistoryState> = {
    reset(state: GuiGcodehistoryState) {
        Object.assign(state, getDefaultState())
    },

    updateHistory(state: GuiGcodehistoryState, payload: any) {
        state.entries = payload
    },
}
