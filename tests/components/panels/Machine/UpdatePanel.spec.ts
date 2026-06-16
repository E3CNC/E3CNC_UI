import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import UpdatePanel from '@/components/panels/Machine/UpdatePanel.vue'

const mockBaseValues = vi.hoisted(() => ({
    loadings: { value: [] as string[], __v_isRef: true },
    printer_state: { value: 'ready', __v_isRef: true },
}))

const mockSocket = vi.hoisted(() => ({
    emit: vi.fn(),
}))

vi.mock('@/composables/useBase', () => ({
    useBase: () => mockBaseValues,
}))

vi.mock('@/composables/useSocket', () => ({
    useSocket: () => mockSocket,
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}))

const vuetifyComponentsMock = vi.hoisted(() => ({
    VRow: { name: 'VRow', template: '<div :class="$attrs.class"><slot /></div>' },
    VCol: { name: 'VCol', template: '<div :class="$attrs.class"><slot /></div>' },
    VTooltip: { name: 'VTooltip', template: '<div><slot name="activator" /><slot /></div>' },
    VIcon: { name: 'VIcon', template: '<i class="v-icon"><slot /></i>' },
    VBtn: { name: 'VBtn', props: ['icon', 'rounded', 'ripple', 'color', 'loading', 'disabled'], template: '<button :class="$attrs.class" @click="$attrs.onClick || $attrs.click"><slot /></button>' },
    VCard: { name: 'VCard', template: '<div><slot /></div>' },
    VCardText: { name: 'VCardText', template: '<div><slot /></div>' },
    VDivider: { name: 'VDivider', template: '<hr />' },
    VAlert: { name: 'VAlert', props: ['variant', 'density', 'type', 'border'], template: '<div><slot /></div>' },
    VProgressCircular: { name: 'VProgressCircular', template: '<div><slot /></div>' },
    VAvatar: { name: 'VAvatar', template: '<div><slot /></div>' },
    VChip: { name: 'VChip', template: '<div><slot /></div>' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

vi.mock('@/components/ui/Panel.vue', () => ({
    default: {
        name: 'Panel',
        props: ['title', 'icon', 'cardClass', 'collapsible'],
        template: '<div :class="cardClass"><slot name="buttons" /><slot /></div>',
    },
}))

vi.mock('semver', () => ({
    default: { valid: vi.fn((v: string) => v), gt: vi.fn((a: string, b: string) => a > b) },
    valid: vi.fn((v: string) => v),
    gt: vi.fn((a: string, b: string) => a > b),
}))

vi.mock('@/components/panels/Machine/UpdatePanel/Entry.vue', () => ({
    default: {
        name: 'UpdatePanelEntry',
        props: ['repo'],
        template: '<div class="update-entry">{{ repo.name }}</div>',
    },
}))

vi.mock('@/components/panels/Machine/UpdatePanel/EntrySystem.vue', () => ({
    default: {
        name: 'UpdatePanelEntrySystem',
        template: '<div class="update-entry-system" />',
    },
}))

vi.mock('@/components/panels/Machine/UpdatePanel/EntryAll.vue', () => ({
    default: {
        name: 'UpdatePanelEntryAll',
        template: '<div class="update-entry-all" />',
    },
}))

const $t = (key: string) => key

function createStoreWithState(overrides: Record<string, any> = {}) {
    return createStore({
        state: {
            socket: { isConnected: true, initializationList: [], loadings: [] },
            server: {
                klippy_connected: true,
                klippy_state: 'ready',
                components: ['update_manager'],
                updateManager: {
                    busy: false,
                    github_rate_limit: null,
                    github_requests_remaining: null,
                    github_limit_reset_time: null,
                    git_repos: [],
                    web_repos: [],
                    system: {
                        package_count: 0,
                        package_list: [],
                    },
                },
                ...(overrides.server || {}),
            },
            printer: {
                print_stats: { state: 'standby' },
                idle_timeout: { state: 'Idle' },
                toolhead: { homed_axes: 'xyz' },
            },
            gui: {
                dashboard: {
                    nonExpandPanels: { mobile: [], tablet: [], desktop: [], widescreen: [] },
                    floatingPanels: {},
                },
                general: { printername: 'Test' },
                control: {},
                uiSettings: {},
                navigationSettings: { entries: [] },
            },
            files: {},
            instancesDB: 'moonraker',
            ...overrides,
        },
        getters: {
            'socket/getUrl': () => '//localhost:8080',
            'socket/getHostUrl': () => '//localhost:8080',
            'gui/getPanelExpand': () => () => true,
            'server/updateManager/getUpdateManagerList': () => [],
            ...(overrides.getters || {}),
        },
    })
}

describe('UpdatePanel.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockBaseValues.loadings.value = []
        mockBaseValues.printer_state.value = 'ready'
    })

    it('renders nothing when update_manager is not in components', () => {
        const store = createStoreWithState({
            server: {
                klippy_connected: true,
                klippy_state: 'ready',
                components: [],
            },
        })
        const wrapper = mount(UpdatePanel, {
            global: { plugins: [store], mocks: { $t } },
        })

        expect(wrapper.find('.machine-update-panel').exists()).toBe(false)
    })

    it('renders panel when update_manager is in components', () => {
        const store = createStoreWithState()
        const wrapper = mount(UpdatePanel, {
            global: { plugins: [store], mocks: { $t } },
        })

        expect(wrapper.find('.machine-update-panel').exists()).toBe(true)
    })

    it('shows init message when no modules have remote_version', () => {
        const store = createStoreWithState({
            getters: {
                'server/updateManager/getUpdateManagerList': () => [
                    { name: 'mainsail', type: 'git', data: { name: 'mainsail', remote_version: '?' } },
                ],
            },
        })
        const wrapper = mount(UpdatePanel, {
            global: { plugins: [store], mocks: { $t } },
        })

        expect(wrapper.text()).toContain('Machine.UpdatePanel.InitUpdateManager')
    })

    it('renders module entries when modules have remote_version', () => {
        const store = createStoreWithState({
            getters: {
                'server/updateManager/getUpdateManagerList': () => [
                    { name: 'mainsail', type: 'git', data: { name: 'mainsail', remote_version: 'v2.12.0' } },
                    { name: 'klipper', type: 'git', data: { name: 'klipper', remote_version: 'v0.12.0' } },
                ],
            },
        })
        const wrapper = mount(UpdatePanel, {
            global: { plugins: [store], mocks: { $t } },
        })

        const entries = wrapper.findAll('.update-entry')
        expect(entries).toHaveLength(2)
        expect(entries[0].text()).toBe('mainsail')
        expect(entries[1].text()).toBe('klipper')
    })

    it('renders system module when existsSystemModul is true', () => {
        const store = createStoreWithState({
            server: {
                klippy_connected: true,
                klippy_state: 'ready',
                components: ['update_manager'],
                updateManager: {
                    system: { package_count: 5, package_list: ['libc6', 'openssl'] },
                    git_repos: [],
                    web_repos: [],
                },
            },
            getters: {
                'server/updateManager/getUpdateManagerList': () => [
                    { name: 'mainsail', type: 'git', data: { name: 'mainsail', remote_version: 'v2.12.0' } },
                ],
            },
        })
        const wrapper = mount(UpdatePanel, {
            global: { plugins: [store], mocks: { $t } },
        })

        expect(wrapper.find('.update-entry-system').exists()).toBe(true)
    })

    it('renders update-all button when showUpdateAll is true', () => {
        const store = createStoreWithState({
            getters: {
                'server/updateManager/getUpdateManagerList': () => [
                    { name: 'mainsail', type: 'git', data: { name: 'mainsail', remote_version: 'v2.12.0', commits_behind: [{ sha: 'abc' }] } },
                    { name: 'klipper', type: 'git', data: { name: 'klipper', remote_version: 'v0.12.0', commits_behind: [{ sha: 'def' }] } },
                ],
            },
        })
        const wrapper = mount(UpdatePanel, {
            global: { plugins: [store], mocks: { $t } },
        })

        expect(wrapper.find('.update-entry-all').exists()).toBe(true)
    })

    it('does not render update-all when only one module has updates', () => {
        const store = createStoreWithState({
            getters: {
                'server/updateManager/getUpdateManagerList': () => [
                    { name: 'mainsail', type: 'git', data: { name: 'mainsail', remote_version: 'v2.12.0', commits_behind: [{ sha: 'abc' }] } },
                    { name: 'klipper', type: 'git', data: { name: 'klipper', remote_version: 'v0.12.0', commits_behind: [] } },
                ],
            },
        })
        const wrapper = mount(UpdatePanel, {
            global: { plugins: [store], mocks: { $t } },
        })

        expect(wrapper.find('.update-entry-all').exists()).toBe(false)
    })

    it('calls socket.emit when btnSync is clicked', async () => {
        const store = createStoreWithState({
            getters: {
                'server/updateManager/getUpdateManagerList': () => [
                    { name: 'mainsail', type: 'git', data: { name: 'mainsail', remote_version: 'v2.12.0' } },
                ],
            },
        })
        const wrapper = mount(UpdatePanel, {
            global: { plugins: [store], mocks: { $t } },
        })

        const btn = wrapper.find('button')
        await btn.trigger('click')

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'machine.update.status',
            { refresh: true },
            expect.objectContaining({
                action: 'server/updateManager/onUpdateStatus',
                loading: 'loadingBtnSyncUpdateManager',
            })
        )
    })

    it('shows loadings indicator on sync button when loading', () => {
        mockBaseValues.loadings.value = ['loadingBtnSyncUpdateManager']

        const store = createStoreWithState({
            getters: {
                'server/updateManager/getUpdateManagerList': () => [
                    { name: 'mainsail', type: 'git', data: { name: 'mainsail', remote_version: 'v2.12.0' } },
                ],
            },
        })
        const wrapper = mount(UpdatePanel, {
            global: { plugins: [store], mocks: { $t } },
        })

        const btn = wrapper.findComponent({ name: 'VBtn' })
        expect(btn.props('loading')).toBe(true)
    })

    it('disables sync button when printer is printing', () => {
        mockBaseValues.printer_state.value = 'printing'

        const store = createStoreWithState({
            getters: {
                'server/updateManager/getUpdateManagerList': () => [
                    { name: 'mainsail', type: 'git', data: { name: 'mainsail', remote_version: 'v2.12.0' } },
                ],
            },
        })
        const wrapper = mount(UpdatePanel, {
            global: { plugins: [store], mocks: { $t } },
        })

        const btn = wrapper.findComponent({ name: 'VBtn' })
        expect(btn.props('disabled')).toBe(true)
    })
})
