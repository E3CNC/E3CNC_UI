import { WebSocketClient } from '@/plugins/webSocketClient'

 
 

// Augment Vue 3 component instance for $socket access
declare module 'vue' {
    interface ComponentInternalInstance {
        $socket: WebSocketClient
    }
    interface ComponentCustomProperties {
        $socket: WebSocketClient
    }
}

export {}
