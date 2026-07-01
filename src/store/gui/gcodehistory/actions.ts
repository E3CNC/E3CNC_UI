import { ActionContext, ActionTree } from 'vuex'
import { RootState } from '@/store/types'
import { GuiGcodehistoryState } from '@/store/gui/gcodehistory/types'
import { getSocket } from '@/store/runtime'
import { maxGcodeHistory } from '@/store/variables'

export const actions: ActionTree<GuiGcodehistoryState, RootState> = {
    reset({ commit }: ActionContext<GuiGcodehistoryState, RootState>) {
        commit('reset')
    },

    upload({ state }: ActionContext<GuiGcodehistoryState, RootState>) {
        getSocket().emit('server.database.post_item', {
            namespace: 'mainsail',
            key: 'gcodehistory.entries',
            value: state.entries,
        })
    },

    async addToHistory({ commit, dispatch, state }: ActionContext<GuiGcodehistoryState, RootState>, payload: any) {
        const newHistory = [...state.entries]
        newHistory.push(payload)

        while (newHistory.length > maxGcodeHistory) newHistory.splice(0, 1)

        await commit('updateHistory', newHistory)
        await dispatch('upload')
    },
}
