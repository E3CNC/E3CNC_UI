import { GetterTree } from 'vuex'
import { SocketState } from '@/store/socket/types'
import { RootState } from '@/store/types'

export const getters: GetterTree<SocketState, RootState> = {
    getUrl: (state: SocketState) => {
        const port = state.port !== 80 ? ':' + state.port : ''
        let path = '/' + state.path.replace(/^\/|\/$/g, '')

        // remove last / in path
        if (path.endsWith('/')) path = path.slice(0, -1)

        return `//${state.hostname}${port}${path}`
    },

    getHostUrl: (state: SocketState) => {
        const protocol = state.protocol === 'wss' ? 'https' : 'http'

        return `${protocol}://${state.hostname}/`
    },

    getWebsocketUrl: (state: SocketState, getters: any) => {
        return state.protocol + ':' + getters['getUrl'] + '/websocket'
    },
}
