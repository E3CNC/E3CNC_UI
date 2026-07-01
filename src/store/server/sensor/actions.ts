import { ActionContext, ActionTree } from 'vuex'
import { getSocket } from '@/store/runtime'
import { ServerSensorState } from '@/store/server/sensor/types'
import { RootState } from '@/store/types'

export const actions: ActionTree<ServerSensorState, RootState> = {
    reset({ commit }: ActionContext<ServerSensorState, RootState>) {
        commit('reset')
    },

    init() {
        getSocket().emit('server.sensors.list', {}, { action: 'server/sensor/getSensors' })
    },

    getSensors({ commit, dispatch }: ActionContext<ServerSensorState, RootState>, payload: any) {
        commit('setSensors', payload.sensors)

        dispatch('socket/removeInitModule', 'server/sensor/init', { root: true })
    },

    updateSensors({ commit }: ActionContext<ServerSensorState, RootState>, payload: any) {
        Object.keys(payload).forEach((key) => {
            commit('updateSensor', { key, value: payload[key] })
        })
    },
}
