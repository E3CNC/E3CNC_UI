import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import NotificationMenuEntry from '@/components/notifications/NotificationMenuEntry.vue'
import type { GuiNotificationStateEntry } from '@/store/gui/notifications/types'

// ── Mock vuetify components (only those used directly by NotificationMenuEntry) ──
vi.mock('vuetify/components', () => ({
    VAlert: {
        name: 'VAlert',
        props: { variant: null, color: null, border: null },
        template: '<div class="v-alert" :data-color="color"><slot /></div>',
    },
    VRow: {
        name: 'VRow',
        props: { align: null },
        template: '<div class="v-row"><slot /></div>',
    },
    VCol: {
        name: 'VCol',
        props: { cols: null, class: null },
        template: '<div class="v-col"><slot /></div>',
    },
    VBtn: {
        name: 'VBtn',
        props: { icon: null, variant: null, color: null, size: null, retainFocusOnClick: null, disabled: null },
        template: '<button :disabled="disabled" class="v-btn" @click="$emit(\'click\', $event)"><slot /></button>',
    },
    VIcon: {
        name: 'VIcon',
        props: { size: null, icon: null },
        template: '<i class="v-icon"><slot /></i>',
    },
    VDivider: {
        name: 'VDivider',
        template: '<hr class="v-divider" />',
    },
    VSpacer: {
        name: 'VSpacer',
        template: '<span class="v-spacer" />',
    },
    VExpandTransition: {
        name: 'VExpandTransition',
        template: '<div class="v-expand-transition"><slot /></div>',
    },
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}))

vi.mock('vuetify', () => ({
    useDisplay: () => ({
        width: { value: 1920 },
        height: { value: 1080 },
        mobile: { value: false },
        name: { value: 'xl' },
        xs: { value: false },
        sm: { value: false },
        md: { value: false },
        lg: { value: false },
        xl: { value: true },
        xxl: { value: false },
        smAndUp: { value: true },
        smAndDown: { value: false },
        mdAndUp: { value: true },
        mdAndDown: { value: false },
        lgAndUp: { value: true },
        lgAndDown: { value: false },
        xlAndUp: { value: true },
        xlAndDown: { value: false },
    }),
}))

// ── Helpers ──
function makeEntry(overrides: Partial<GuiNotificationStateEntry> = {}): GuiNotificationStateEntry {
    return {
        id: 'test/1',
        priority: 'normal',
        title: 'Test Notification',
        description: 'This is a test notification description.',
        date: new Date('2024-01-15T10:30:00'),
        dismissed: false,
        ...overrides,
    }
}

function createStoreWithState(overrides: Record<string, any> = {}) {
    return createStore({
        state: {
            gui: {
                maintenance: { entries: [] },
                ...(overrides.gui || {}),
            },
        },
        getters: {
            'gui/maintenance/getEntries': () => [],
            ...(overrides.getters || {}),
        },
    })
}

function mountOptions(store: ReturnType<typeof createStore>) {
    return {
        global: {
            plugins: [store],
            mocks: { $t: (key: string) => key },
            stubs: {
                'history-list-panel-detail-maintenance': {
                    name: 'HistoryListPanelDetailMaintenance',
                    props: { modelValue: null, item: null },
                    template: '<div class="maintenance-detail" v-if="modelValue">Maintenance detail</div>',
                },
            },
        },
    }
}

describe('NotificationMenuEntry.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ── Basic rendering ──

    it('renders the notification title', () => {
        const store = createStoreWithState()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ title: 'Custom Title' }) },
            ...mountOptions(store),
        })

        expect(wrapper.text()).toContain('Custom Title')
    })

    it('renders the notification description', () => {
        const store = createStoreWithState()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ description: 'Custom description' }) },
            ...mountOptions(store),
        })

        expect(wrapper.text()).toContain('Custom description')
    })

    // ── URL / link rendering ──

    it('renders a link when entry has a url property', () => {
        const store = createStoreWithState()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ url: 'https://example.com/news' }) },
            ...mountOptions(store),
        })

        const html = wrapper.html()
        expect(html).toContain('href="https://example.com/news"')
        expect(html).toContain('target="_blank"')
    })

    it('renders title as plain text when no url', () => {
        const store = createStoreWithState()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({}) },
            ...mountOptions(store),
        })

        expect(wrapper.text()).toContain('Test Notification')
    })

    // ── Priority / alert color ──

    it('uses error color for critical priority', () => {
        const store = createStoreWithState()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ priority: 'critical' }) },
            ...mountOptions(store),
        })

        const alert = wrapper.findComponent({ name: 'VAlert' })
        expect(alert.attributes('data-color')).toBe('error')
    })

    it('uses warning color for high priority', () => {
        const store = createStoreWithState()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ priority: 'high' }) },
            ...mountOptions(store),
        })

        const alert = wrapper.findComponent({ name: 'VAlert' })
        expect(alert.attributes('data-color')).toBe('warning')
    })

    it('uses info color for normal priority', () => {
        const store = createStoreWithState()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ priority: 'normal' }) },
            ...mountOptions(store),
        })

        const alert = wrapper.findComponent({ name: 'VAlert' })
        expect(alert.attributes('data-color')).toBe('info')
    })

    // ── Close button (x) behavior ──

    it('renders close/remind buttons for non-critical entries', () => {
        const store = createStoreWithState()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ priority: 'normal', id: 'announcement/test1' }) },
            ...mountOptions(store),
        })

        const buttons = wrapper.findAll('button.v-btn')
        expect(buttons.length).toBeGreaterThanOrEqual(2)
    })

    it('does not render close/remind section for critical entries', () => {
        const store = createStoreWithState()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ priority: 'critical' }) },
            ...mountOptions(store),
        })

        const buttons = wrapper.findAll('button.v-btn')
        expect(buttons.length).toBe(0)
    })

    it('clicking close button dispatches close for announcement type', async () => {
        const store = createStoreWithState()
        store.dispatch = vi.fn()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ id: 'announcement/test1', priority: 'normal' }) },
            ...mountOptions(store),
        })

        const button = wrapper.find('button.v-btn')
        await button.trigger('click')

        expect(store.dispatch).toHaveBeenCalledWith('gui/notifications/close', { id: 'announcement/test1' })
    })

    it('clicking close button dispatches dismiss for non-announcement entries', async () => {
        const store = createStoreWithState()
        store.dispatch = vi.fn()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ id: 'other/test1', priority: 'normal' }) },
            ...mountOptions(store),
        })

        const button = wrapper.find('button.v-btn')
        await button.trigger('click')

        expect(store.dispatch).toHaveBeenCalledWith('gui/notifications/dismiss', {
            id: 'other/test1',
            type: 'reboot',
            time: null,
        })
    })

    // ── Entry type and reminders ──

    it('identifies announcement entries and shows time-based reminders', async () => {
        const store = createStoreWithState()
        store.dispatch = vi.fn()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ id: 'announcement/123', priority: 'normal' }) },
            ...mountOptions(store),
        })

        // Click bell-off (last v-btn) to reveal reminders
        const buttons = wrapper.findAll('button.v-btn')
        const bellOffBtn = buttons[buttons.length - 1]
        await bellOffBtn.trigger('click')
        await wrapper.vm.$nextTick()

        expect(wrapper.text()).toContain('App.Notifications.OneHourShort')
        expect(wrapper.text()).toContain('App.Notifications.OneDayShort')
        expect(wrapper.text()).toContain('App.Notifications.OneWeekShort')
    })

    it('identifies maintenance entries and shows details button', () => {
        const store = createStoreWithState()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ id: 'maintenance/1' }) },
            ...mountOptions(store),
        })

        expect(wrapper.text()).toContain('App.Notifications.ShowDetails')
    })

    it('generic entries show NextReboot and Never reminders', async () => {
        const store = createStoreWithState()
        store.dispatch = vi.fn()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ id: 'other/1', priority: 'normal' }) },
            ...mountOptions(store),
        })

        // Click bell-off to expand
        const buttons = wrapper.findAll('button.v-btn')
        const bellOffBtn = buttons[buttons.length - 1]
        await bellOffBtn.trigger('click')
        await wrapper.vm.$nextTick()

        expect(wrapper.text()).toContain('App.Notifications.NextReboot')
        expect(wrapper.text()).toContain('App.Notifications.Never')
    })

    // ── Reminder actions ──

    it('dispatches dismiss with type=time when time-based reminder clicked', async () => {
        const store = createStoreWithState()
        store.dispatch = vi.fn()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ id: 'announcement/1', priority: 'normal' }) },
            ...mountOptions(store),
        })

        // Click bell-off to reveal reminders
        const buttons = wrapper.findAll('button.v-btn')
        const bellOffBtn = buttons[buttons.length - 1]
        await bellOffBtn.trigger('click')
        await wrapper.vm.$nextTick()

        // Find and click the one-hour reminder button
        const allBtns = wrapper.findAll('button.v-btn')
        const hourBtn = allBtns.find((btn) => btn.text().includes('App.Notifications.OneHourShort'))
        expect(hourBtn).toBeDefined()
        await hourBtn!.trigger('click')

        expect(store.dispatch).toHaveBeenCalledWith('gui/notifications/dismiss', {
            id: 'announcement/1',
            type: 'time',
            time: 3600,
        })
    })

    it('dispatches dismiss with type=time for one-day reminder', async () => {
        const store = createStoreWithState()
        store.dispatch = vi.fn()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ id: 'announcement/1', priority: 'normal' }) },
            ...mountOptions(store),
        })

        const buttons = wrapper.findAll('button.v-btn')
        await buttons[buttons.length - 1].trigger('click')
        await wrapper.vm.$nextTick()

        const allBtns = wrapper.findAll('button.v-btn')
        const dayBtn = allBtns.find((btn) => btn.text().includes('App.Notifications.OneDayShort'))
        expect(dayBtn).toBeDefined()
        await dayBtn!.trigger('click')

        expect(store.dispatch).toHaveBeenCalledWith('gui/notifications/dismiss', {
            id: 'announcement/1',
            type: 'time',
            time: 86400,
        })
    })

    it('dispatches dismiss with type=time for one-week reminder', async () => {
        const store = createStoreWithState()
        store.dispatch = vi.fn()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ id: 'announcement/1', priority: 'normal' }) },
            ...mountOptions(store),
        })

        const buttons = wrapper.findAll('button.v-btn')
        await buttons[buttons.length - 1].trigger('click')
        await wrapper.vm.$nextTick()

        const allBtns = wrapper.findAll('button.v-btn')
        const weekBtn = allBtns.find((btn) => btn.text().includes('App.Notifications.OneWeekShort'))
        expect(weekBtn).toBeDefined()
        await weekBtn!.trigger('click')

        expect(store.dispatch).toHaveBeenCalledWith('gui/notifications/dismiss', {
            id: 'announcement/1',
            type: 'time',
            time: 604800,
        })
    })

    it('dispatches close when "Never" reminder is clicked', async () => {
        const store = createStoreWithState()
        store.dispatch = vi.fn()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ id: 'other/1', priority: 'normal' }) },
            ...mountOptions(store),
        })

        // Click bell-off to expand
        const buttons = wrapper.findAll('button.v-btn')
        const bellOffBtn = buttons[buttons.length - 1]
        await bellOffBtn.trigger('click')
        await wrapper.vm.$nextTick()

        // Click the "Never" button
        const allBtns = wrapper.findAll('button.v-btn')
        const neverBtn = allBtns.find((btn) => btn.text().includes('App.Notifications.Never'))
        expect(neverBtn).toBeDefined()
        await neverBtn!.trigger('click')

        expect(store.dispatch).toHaveBeenCalledWith('gui/notifications/close', { id: 'other/1' })
    })

    it('dispatches dismiss with type=reboot when "Next Reboot" is clicked', async () => {
        const store = createStoreWithState()
        store.dispatch = vi.fn()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ id: 'other/1', priority: 'normal' }) },
            ...mountOptions(store),
        })

        // Click bell-off to expand
        const buttons = wrapper.findAll('button.v-btn')
        const bellOffBtn = buttons[buttons.length - 1]
        await bellOffBtn.trigger('click')
        await wrapper.vm.$nextTick()

        // Click "Next Reboot"
        const allBtns = wrapper.findAll('button.v-btn')
        const rebootBtn = allBtns.find((btn) => btn.text().includes('App.Notifications.NextReboot'))
        expect(rebootBtn).toBeDefined()
        await rebootBtn!.trigger('click')

        expect(store.dispatch).toHaveBeenCalledWith('gui/notifications/dismiss', {
            id: 'other/1',
            type: 'reboot',
            time: null,
        })
    })

    // ── Watcher ──

    it('collapses expand when parentState becomes false', async () => {
        const store = createStoreWithState()
        store.dispatch = vi.fn()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ id: 'other/1', priority: 'normal' }), parentState: true },
            ...mountOptions(store),
        })

        // Click bell-off to set expand = true
        const buttons = wrapper.findAll('button.v-btn')
        const bellOffBtn = buttons[buttons.length - 1]
        await bellOffBtn.trigger('click')
        await wrapper.vm.$nextTick()

        // After bell-off click, expand is true. Now set parentState to false.
        // The watcher should reset expand to false, which triggers close().
        await wrapper.setProps({ parentState: false })
        await wrapper.vm.$nextTick()

        // When expand is reset to false, the watcher runs close()
        expect(store.dispatch).toHaveBeenCalledWith('gui/notifications/close', { id: 'other/1' })
    })

    // ── Maintenance detail dialog ──

    it('handles entry ID without a slash (no entryType)', () => {
        const store = createStoreWithState()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ id: 'noslashentry' }) },
            ...mountOptions(store),
        })

        // Without a slash, entryType returns ''
        // The default reminders should be shown
        expect(wrapper.text()).toContain('Test Notification')
        expect(wrapper.text()).toContain('This is a test notification description.')
    })

    it('shows maintenance entry reminders when maintenance ID not found in store', () => {
        const store = createStoreWithState()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ id: 'maintenance/nonexistent' }) },
            ...mountOptions(store),
        })

        // Should still show the Show Details button even if entry not in store
        expect(wrapper.text()).toContain('App.Notifications.ShowDetails')
    })

    it('shows maintenance detail dialog when Show Details is clicked', async () => {
        const store = createStoreWithState({
            gui: {
                maintenance: {
                    entries: [
                        {
                            id: '1',
                            name: 'Maintenance Task',
                            description: 'Do something',
                            recurrence: 0,
                            reminder: null,
                        },
                    ],
                },
            },
        })
        store.dispatch = vi.fn()
        const wrapper = mount(NotificationMenuEntry, {
            props: { entry: makeEntry({ id: 'maintenance/1' }) },
            ...mountOptions(store),
        })

        // Find and click the Show Details button
        const showDetailsBtn = wrapper
            .findAll('button.v-btn')
            .find((btn) => btn.text().includes('App.Notifications.ShowDetails'))
        expect(showDetailsBtn).toBeDefined()
        await showDetailsBtn!.trigger('click')

        await wrapper.vm.$nextTick()

        // The maintenance detail should be visible (stub renders when modelValue is true)
        expect(wrapper.find('.maintenance-detail').exists()).toBe(true)
    })
})
