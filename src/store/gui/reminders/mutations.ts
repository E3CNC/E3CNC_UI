import { MutationTree } from 'vuex'
import { GuiRemindersState } from '@/store/gui/reminders/types'
import { getDefaultState } from './index'

export const mutations: MutationTree<GuiRemindersState> = {
    reset(state: GuiRemindersState) {
        Object.assign(state, getDefaultState())
    },

    initStore(state: GuiRemindersState, payload: any) {
        state.reminders = payload.value
    },

    store(state: GuiRemindersState, payload: any) {
        state.reminders[payload.id] = payload.values
    },

    update(state: GuiRemindersState, payload: any) {
        if (payload.id in state.reminders) {
            const reminder = { ...state.reminders[payload.id] }
            Object.assign(reminder, payload)
            state.reminders[payload.id] = reminder
        }
    },

    delete(state: GuiRemindersState, payload: any) {
        if (payload in state.reminders) {
            delete state.reminders[payload]
        }
    },
}
