import { MutationTree } from 'vuex'
import { RootState } from './types'

export const mutations: MutationTree<RootState> = {
    setNaviDrawer(state: RootState, payload: any) {
        state.naviDrawer = payload
        localStorage.setItem('naviDrawer', payload)
    },

    setInstancesDB(state: RootState, payload: any) {
        state.instancesDB = payload
    },

    setConfigInstances(state: RootState, payload: any) {
        state.configInstances = payload
    },
}
