import { GetterTree } from 'vuex'
import { EditorState } from '@/store/editor/types'
import { RootState } from '@/store/types'

export const getters: GetterTree<EditorState, RootState> = {
    getKlipperRestartMethod: (state: EditorState, getters: any, rootState: RootState) => {
        return rootState.gui?.editor?.klipperRestartMethod ?? 'FIRMWARE_RESTART'
    },
}
