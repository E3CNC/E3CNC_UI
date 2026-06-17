import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ViewerPage from '@/pages/Viewer.vue'

vi.mock('@/composables/useBase', () => ({
    useBase: () => ({
        socketIsConnected: { value: true, __v_isRef: true },
        hostUrl: { value: new URL('http://localhost:8080'), __v_isRef: true },
        apiUrl: { value: 'http://localhost:8080', __v_isRef: true },
    }),
}))

vi.mock('@/components/gcodeviewer/Viewer.vue', () => ({
    default: {
        name: 'Viewer',
        template: '<div class="gcode-viewer-mock">Viewer</div>',
    },
}))

describe('Viewer.vue', () => {
    it('renders without crashing', () => {
        const wrapper = mount(ViewerPage)
        expect(wrapper.exists()).toBe(true)
    })

    it('renders the viewer component', () => {
        const wrapper = mount(ViewerPage)
        expect(wrapper.find('.gcode-viewer-mock').exists()).toBe(true)
    })
})
