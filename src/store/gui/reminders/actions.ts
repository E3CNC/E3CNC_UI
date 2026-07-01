import { ActionContext, ActionTree } from 'vuex'
import { getSocket } from '@/store/runtime'
import { GuiRemindersState } from '@/store/gui/reminders/types'
import { RootState } from '@/store/types'
import { v4 as uuidv4 } from 'uuid'

export const actions: ActionTree<GuiRemindersState, RootState> = {
    reset({ commit }: ActionContext<GuiRemindersState, RootState>) {
        commit('reset')
    },

    init() {
        getSocket().emit('server.database.get_item', { namespace: 'reminders' }, { action: 'gui/reminders/initStore' })
    },

    async initStore({ commit, dispatch }: ActionContext<GuiRemindersState, RootState>, payload: any) {
        await commit('reset')
        await commit('initStore', payload)
        await dispatch('socket/removeInitModule', 'gui/reminders/init', { root: true })
    },

    upload(_context: ActionContext<GuiRemindersState, RootState>, payload: any) {
        getSocket().emit('server.database.post_item', { namespace: 'reminders', key: payload.id, value: payload.value })
    },

    store({ commit, dispatch, state }: ActionContext<GuiRemindersState, RootState>, payload: any) {
        const id = uuidv4()

        commit('store', { id, values: payload.values })
        dispatch('upload', {
            id,
            value: state.reminders[id],
        })
    },

    update({ commit, dispatch, state }: ActionContext<GuiRemindersState, RootState>, payload: any) {
        commit('update', payload)
        dispatch('upload', {
            id: payload.id,
            value: state.reminders[payload.id],
        })
    },

    delete({ commit }: ActionContext<GuiRemindersState, RootState>, payload: any) {
        commit('delete', payload)
        getSocket().emit('server.database.delete_item', { namespace: 'reminders', key: payload })
    },

    repeat({ dispatch, getters, state, rootState }: ActionContext<GuiRemindersState, RootState>, payload: any) {
        if (!(payload.id in state.reminders)) return
        const reminder = getters['getReminder'](payload.id)
        const new_start_time = rootState.server?.history?.job_totals.total_print_time || 0
        const snooze_epoch_time = Date.now()
        dispatch('update', {
            id: reminder.id,
            snooze_print_hours_timestamps: [...reminder.snooze_print_hours_timestamps, new_start_time],
            snooze_epoch_timestamps: [...reminder.snooze_epoch_timestamps, snooze_epoch_time],
        })
    },
}
