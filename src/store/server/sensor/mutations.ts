import { getDefaultState } from './index'
import { MutationTree } from 'vuex'
import { ServerSensorState } from '@/store/server/sensor/types'

export const mutations: MutationTree<ServerSensorState> = {
    reset(state: ServerSensorState) {
        Object.assign(state, getDefaultState())
    },

    setSensors(state: ServerSensorState, payload: any) {
        state.sensors = payload
    },

    updateSensor(state: ServerSensorState, payload: any) {
        if (!(payload.key in state.sensors)) return

        state.sensors[payload.key].values = payload.value
    },
}
