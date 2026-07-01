import { getDefaultState } from './index'
import { MutationTree } from 'vuex'
import { GuiConsoleState } from '@/store/gui/console/types'

export const mutations: MutationTree<GuiConsoleState> = {
    reset(state: GuiConsoleState) {
        Object.assign(state, getDefaultState())
    },

    clear(state: GuiConsoleState, payload: any) {
        state.cleared_since = payload.cleared_since
    },

    filterStore(state: GuiConsoleState, payload: any) {
        state.consolefilters[payload.id] = payload.values
    },

    filterUpdate(state: GuiConsoleState, payload: any) {
        if (!(payload.id in state.consolefilters)) return

        const preset = { ...state.consolefilters[payload.id] }
        Object.assign(preset, payload.values)

        state.consolefilters[payload.id] = preset
    },

    filterDelete(state: GuiConsoleState, payload: any) {
        if (!(payload in state.consolefilters)) return

        delete state.consolefilters[payload]
    },
}
