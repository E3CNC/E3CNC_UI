import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import SubPanel from '@/components/ui/SubPanel.vue'

vi.mock('vuetify/components', () => ({
    VBtn: {
        name: 'VBtn',
        props: { icon: Boolean, variant: String, size: String, ripple: Boolean },
        template: '<button class="v-btn" @click="$emit(\'click\')"><slot /></button>',
    },
    VIcon: {
        name: 'VIcon',
        props: { size: String },
        template: '<i class="v-icon"><slot /></i>',
    },
    VDivider: {
        name: 'VDivider',
        props: { class: String },
        template: '<hr class="v-divider" />',
    },
    VExpandTransition: {
        name: 'VExpandTransition',
        template: '<div><slot /></div>',
    },
}))

vi.mock('@/composables/useBase', () => ({
    useBase: () => ({
        viewport: { value: 'desktop' },
    }),
}))

function createStoreWithState(overrides: Record<string, any> = {}) {
    return createStore({
        state: {
            gui: {
                dashboard: {
                    nonExpandPanels: {},
                    floatingPanels: {},
                },
                general: { printername: 'Test' },
                control: {},
                uiSettings: {},
                navigationSettings: { entries: [] },
            },
            ...overrides,
        },
        getters: {
            'gui/getPanelExpand': () => (name: string, viewport: string) => {
                const nonExpand = overrides.gui?.dashboard?.nonExpandPanels ?? {}
                const list = nonExpand[viewport]
                return !(list && list.includes(name))
            },
            ...(overrides.getters || {}),
        },
    })
}

describe('SubPanel.vue', () => {
    const dispatchSpy = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        dispatchSpy.mockClear()
    })

    function createWrapper(options: Record<string, any> = {}) {
        const { props = {}, slots = {}, overrides = {}, customDispatch } = options
        const storeInstance = createStoreWithState(overrides)
        const originalDispatch = storeInstance.dispatch
        storeInstance.dispatch =
            customDispatch ??
            vi.fn((...args: any[]) => {
                dispatchSpy(...args)
                return originalDispatch.call(storeInstance, ...args)
            })

        return mount(SubPanel, {
            props: {
                title: 'Test Panel',
                subPanelClass: 'test-panel',
                ...props,
            },
            slots: {
                default: '<div class="slot-content">Content</div>',
                ...slots,
            },
            global: {
                plugins: [storeInstance],
            },
        })
    }

    it('renders the title', () => {
        const wrapper = createWrapper({ props: { title: 'My Panel' } })
        expect(wrapper.text()).toContain('My Panel')
    })

    it('renders slot content when expanded by default', () => {
        const wrapper = createWrapper()
        expect(wrapper.find('.slot-content').exists()).toBe(true)
        expect(wrapper.text()).toContain('Content')
    })

    it('dispatches saveExpandPanel with value=false when clicking to collapse', async () => {
        const dispatchMock = vi.fn()
        const wrapper = createWrapper({ customDispatch: dispatchMock })

        const btn = wrapper.find('button.v-btn')
        await btn.trigger('click')

        expect(dispatchMock).toHaveBeenCalledWith('gui/saveExpandPanel', {
            name: 'test-panel',
            value: false,
            viewport: 'desktop',
        })
    })

    it('dispatches saveExpandPanel with value=true when clicking to expand', async () => {
        const dispatchMock = vi.fn()
        const wrapper = createWrapper({
            customDispatch: dispatchMock,
            overrides: {
                gui: {
                    dashboard: {
                        nonExpandPanels: {
                            desktop: ['test-panel'],
                        },
                        floatingPanels: {},
                    },
                    general: { printername: 'Test' },
                    control: {},
                    uiSettings: {},
                    navigationSettings: { entries: [] },
                },
            },
        })

        const btn = wrapper.find('button.v-btn')
        await btn.trigger('click')

        expect(dispatchMock).toHaveBeenCalledWith('gui/saveExpandPanel', {
            name: 'test-panel',
            value: true,
            viewport: 'desktop',
        })
    })

    it('uses iconExpanded prop when expanded', () => {
        const wrapper = createWrapper({
            props: {
                iconExpanded: 'mdiChevronUp',
                iconCollapsed: 'mdiChevronDown',
            },
        })

        const icon = wrapper.find('.v-icon')
        expect(icon.text()).toBe('mdiChevronUp')
    })

    it('uses iconCollapsed prop when collapsed', () => {
        const wrapper = createWrapper({
            props: {
                iconExpanded: 'mdiChevronUp',
                iconCollapsed: 'mdiChevronDown',
            },
            overrides: {
                gui: {
                    dashboard: {
                        nonExpandPanels: {
                            desktop: ['test-panel'],
                        },
                        floatingPanels: {},
                    },
                    general: { printername: 'Test' },
                    control: {},
                    uiSettings: {},
                    navigationSettings: { entries: [] },
                },
            },
        })

        const icon = wrapper.find('.v-icon')
        expect(icon.text()).toBe('mdiChevronDown')
    })

    it('applies icon-rotate-n90 class when collapsed', () => {
        const wrapper = createWrapper({
            overrides: {
                gui: {
                    dashboard: {
                        nonExpandPanels: {
                            desktop: ['test-panel'],
                        },
                        floatingPanels: {},
                    },
                    general: { printername: 'Test' },
                    control: {},
                    uiSettings: {},
                    navigationSettings: { entries: [] },
                },
            },
        })

        const icon = wrapper.find('.v-icon')
        expect(icon.classes()).toContain('icon-rotate-n90')
    })

    it('does not apply icon-rotate-n90 class when expanded', () => {
        const wrapper = createWrapper()

        const icon = wrapper.find('.v-icon')
        expect(icon.classes()).not.toContain('icon-rotate-n90')
    })

    it('renders the v-divider', () => {
        const wrapper = createWrapper()
        expect(wrapper.find('.v-divider').exists()).toBe(true)
    })

    it('uses default mdiChevronDown icon when no icon props provided', () => {
        const wrapper = createWrapper()
        const icon = wrapper.find('.v-icon')
        expect(icon.text()).toBeTruthy()
        expect(icon.text().length).toBeGreaterThan(0)
    })
})
