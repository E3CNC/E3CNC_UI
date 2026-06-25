import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// HostBashPanel imports @xterm/xterm, @xterm/addon-fit which require browser
// APIs (canvas). Mock them for the happy-dom test environment.
vi.mock('@xterm/xterm', () => ({
    Terminal: vi.fn(() => ({
        loadAddon: vi.fn(),
        open: vi.fn(),
        onKey: vi.fn(),
        writeln: vi.fn(),
        write: vi.fn(),
        clear: vi.fn(),
        dispose: vi.fn(),
        onResize: vi.fn(),
    })),
}))

vi.mock('@xterm/addon-fit', () => ({
    FitAddon: vi.fn(() => ({
        fit: vi.fn(),
    })),
}))

vi.mock('vue-toast-notification', () => ({
    useToast: () => ({
        error: vi.fn(),
    }),
}))

vi.mock('@/composables/useBase', () => ({
    useBase: () => ({
        socketIsConnected: { value: true },
        klipperState: { value: 'ready' },
    }),
}))

vi.mock('@/components/ui/Panel.vue', () => ({
    default: {
        name: 'Panel',
        props: ['icon', 'title', 'collapsible', 'cardClass', 'hideButtonsOnCollapse'],
        template: '<div class="panel-stub"><slot name="buttons" /><slot /></div>',
    },
}))

vi.mock('@/store/files/cncApi', () => ({
    execBash: vi.fn(),
}))

vi.mock('@/store/runtime', () => ({
    getSocket: () => ({ emit: vi.fn() }),
}))

vi.mock('@mdi/js', () => ({
    mdiBash: 'mdiBash',
    mdiCog: 'mdiCog',
    mdiTrashCan: 'mdiTrashCan',
}))

vi.mock('vuetify/components', () => ({
    VBtn: {
        name: 'VBtn',
        props: ['icon', 'rounded'],
        template: '<button class="v-btn-stub" @click="$emit(`click`, $event)"><slot /></button>',
    },
    VIcon: { name: 'VIcon', template: '<span class="v-icon-stub"><slot /></span>' },
    VMenu: { name: 'VMenu', template: '<div class="v-menu-stub"><slot name="activator" :props="{}" /><slot /></div>' },
    VList: { name: 'VList', template: '<div class="v-list-stub"><slot /></div>' },
    VListItem: { name: 'VListItem', template: '<div class="v-list-item-stub"><slot /></div>' },
    VTextField: {
        name: 'VTextField',
        props: ['modelValue', 'label', 'type', 'density', 'variant', 'hideDetails', 'min', 'max'],
        template: '<input class="v-text-field-stub" :value="modelValue" />',
    },
    VCardText: { name: 'VCardText', template: '<div class="v-card-text-stub"><slot /></div>' },
    VSpacer: { name: 'VSpacer', template: '<div class="v-spacer-stub" />' },
}))

import HostBashPanel from '@/components/panels/Cnc/HostBashPanel.vue'
import { createStore } from 'vuex'

describe('HostBashPanel.vue', () => {
    it('module can be imported', () => {
        expect(HostBashPanel).toBeDefined()
    })

    it('renders without crashing when connected', () => {
        const store = createStore({
            getters: { 'socket/getUrl': () => 'http://localhost:8080' },
            state: { gui: { console: { height: 300 } } },
        })
        const wrapper = mount(HostBashPanel, {
            global: {
                plugins: [store],
                mocks: { $t: (key: string) => key },
            },
        })
        expect(wrapper.exists()).toBe(true)
    })
})
