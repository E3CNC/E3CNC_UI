import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import PrinterSelector from '@/components/ui/PrinterSelector.vue'

const mockRouterPush = vi.hoisted(() => vi.fn())

vi.mock('vuetify/components', () => ({
    VMenu: {
        name: 'VMenu',
        props: { bottom: Boolean, offsetX: Boolean },
        template: '<div class="v-menu"><slot name="activator" :props="{}" /><slot /></div>',
    },
    VIcon: {
        name: 'VIcon',
        props: { icon: String },
        template: '<i class="v-icon"><slot /></i>',
    },
    VList: {
        name: 'VList',
        props: { density: String },
        template: '<div class="v-list"><slot /></div>',
    },
    VListItem: {
        name: 'VListItem',
        props: { link: Boolean, disabled: Boolean, title: String, subtitle: String, lines: String },
        template:
            '<div class="v-list-item" :class="{ disabled }" :data-title="title" :data-subtitle="subtitle"><slot name="title" /><slot name="subtitle" /><slot name="append" /></div>',
    },
    VListItemTitle: {
        name: 'VListItemTitle',
        template: '<div class="v-list-item-title"><slot /></div>',
    },
    VListItemSubtitle: {
        name: 'VListItemSubtitle',
        template: '<div class="v-list-item-subtitle"><slot /></div>',
    },
}))

vi.mock('@/composables/useBase', () => ({
    useBase: () => ({
        instancesDB: 'moonraker',
    }),
}))

vi.mock('vue-router', () => ({
    useRoute: () => ({
        fullPath: '/dashboard',
    }),
    useRouter: () => ({
        push: mockRouterPush,
    }),
}))

vi.mock('@/plugins/router', () => ({
    default: {
        push: mockRouterPush,
    },
}))

function createStoreWithPrinters(printers: any[] = []) {
    const getters: Record<string, any> = {
        'farm/countPrinters': () => printers.length,
        'farm/getPrinters': () => printers,
    }

    printers.forEach((p) => {
        getters[`farm/${p._namespace}/getPrinterName`] = () => (p._namespace === 'machine1' ? 'Machine 1' : 'Machine 2')
        getters[`farm/${p._namespace}/getStatus`] = () => (p.socket.isConnected ? 'Connected' : 'Disconnected')
    })

    return createStore({
        state: {
            socket: { isConnected: false, hostname: 'localhost', port: 80 },
            server: {},
            printer: {},
            gui: {},
            instancesDB: 'moonraker',
        },
        getters,
    })
}

function createPrinter(namespace: string, isConnected: boolean) {
    return {
        _namespace: namespace,
        socket: {
            hostname: `${namespace}.local`,
            port: 80,
            path: '',
            protocol: 'ws',
            isConnected,
            isConnecting: false,
            reconnects: 0,
            maxReconnects: 10,
            reconnectInterval: 5000,
            instance: null,
            webPort: 80,
            wsData: [],
        },
        server: {
            klippy_connected: isConnected,
        },
        data: {
            gui: {
                general: {
                    printername: namespace === 'machine1' ? 'Machine 1' : 'Machine 2',
                },
            },
        },
        settings: {},
        databases: [],
        current_file: {} as any,
        theme_files: [],
    }
}

describe('PrinterSelector.vue', () => {
    let store: ReturnType<typeof createStoreWithPrinters>

    beforeEach(() => {
        vi.clearAllMocks()
        mockRouterPush.mockClear()
    })

    it('renders menu activator icon', () => {
        store = createStoreWithPrinters([createPrinter('machine1', true)])
        const wrapper = mount(PrinterSelector, {
            global: { plugins: [store] },
        })

        const icon = wrapper.find('.v-icon')
        expect(icon.exists()).toBe(true)
        expect(icon.text()).toBeTruthy()
    })

    it('renders printer list items when printers exist', () => {
        store = createStoreWithPrinters([createPrinter('machine1', true), createPrinter('machine2', false)])
        const wrapper = mount(PrinterSelector, {
            global: { plugins: [store] },
        })

        const items = wrapper.findAll('.v-list-item')
        expect(items).toHaveLength(2)
    })

    it('renders no list items when no printers', () => {
        store = createStoreWithPrinters([])
        const wrapper = mount(PrinterSelector, {
            global: { plugins: [store] },
        })

        const items = wrapper.findAll('.v-list-item')
        expect(items).toHaveLength(0)
    })

    it('shows printer name and subtitle for each printer', () => {
        store = createStoreWithPrinters([createPrinter('machine1', true)])
        const wrapper = mount(PrinterSelector, {
            global: { plugins: [store] },
        })

        const item = wrapper.find('.v-list-item')
        expect(item.attributes('data-title')).toBe('Machine 1')
        expect(item.attributes('data-subtitle')).toBe('Connected')
    })

    it('disables disconnected printers', () => {
        store = createStoreWithPrinters([createPrinter('machine1', true), createPrinter('machine2', false)])
        const wrapper = mount(PrinterSelector, {
            global: { plugins: [store] },
        })

        const items = wrapper.findAll('.v-list-item')
        // First item (machine1) should not be disabled
        expect(items[0].classes()).not.toContain('disabled')
        // Second item (machine2) should be disabled
        expect(items[1].classes()).toContain('disabled')
    })

    it('dispatches changePrinter when clicking a connected printer', async () => {
        const dispatchMock = vi.fn()
        store = createStoreWithPrinters([createPrinter('machine1', true)])
        store.dispatch = dispatchMock

        const wrapper = mount(PrinterSelector, {
            global: { plugins: [store] },
        })

        const item = wrapper.find('.v-list-item')
        await item.trigger('click')

        expect(dispatchMock).toHaveBeenCalledWith('changePrinter', {
            printer: 'machine1',
        })
    })

    it('does not dispatch changePrinter when clicking a disconnected printer', async () => {
        const dispatchMock = vi.fn()
        store = createStoreWithPrinters([createPrinter('machine2', false)])
        store.dispatch = dispatchMock

        const wrapper = mount(PrinterSelector, {
            global: { plugins: [store] },
        })

        const item = wrapper.find('.v-list-item')
        await item.trigger('click')

        expect(dispatchMock).not.toHaveBeenCalled()
    })

    it('dispatches changePrinter only for the clicked printer', async () => {
        const dispatchMock = vi.fn()
        store = createStoreWithPrinters([createPrinter('machine1', true), createPrinter('machine2', true)])
        store.dispatch = dispatchMock

        const wrapper = mount(PrinterSelector, {
            global: { plugins: [store] },
        })

        const items = wrapper.findAll('.v-list-item')
        await items[1].trigger('click')

        expect(dispatchMock).toHaveBeenCalledWith('changePrinter', {
            printer: 'machine2',
        })
        expect(dispatchMock).toHaveBeenCalledTimes(1)
    })

    it('has the v-menu wrapper', () => {
        store = createStoreWithPrinters([createPrinter('machine1', true)])
        const wrapper = mount(PrinterSelector, {
            global: { plugins: [store] },
        })

        expect(wrapper.find('.v-menu').exists()).toBe(true)
        expect(wrapper.find('.v-list').exists()).toBe(true)
    })
})
