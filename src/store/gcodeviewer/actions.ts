import { ActionContext, ActionTree } from 'vuex'
import { GcodeviewerState } from '@/store/gcodeviewer/types'
import { RootState } from '@/store/types'

export const actions: ActionTree<GcodeviewerState, RootState> = {
    reset({ commit }: ActionContext<GcodeviewerState, RootState>) {
        commit('reset')
    },

    setViewerBackup({ commit }: ActionContext<GcodeviewerState, RootState>, backup: any) {
        commit('setViewerBackup', backup)
    },

    setCanvasBackup({ commit }: ActionContext<GcodeviewerState, RootState>, backup: any) {
        commit('setCanvasBackup', backup)
    },

    setLoadedFileBackup({ commit }: ActionContext<GcodeviewerState, RootState>, backup: any) {
        commit('setLoadedFileBackup', backup)
    },
}
