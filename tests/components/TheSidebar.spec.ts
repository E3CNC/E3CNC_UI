import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import { ref } from 'vue'
import TheSidebar from '@/components/TheSidebar.vue'

// Mutable refs for composable mocks — declared at module scope so vi.mock
// hoisting still captures them by reference when the factory runs at load time.
const mockIsMobile = ref(false)
const mockVisibleNaviPoints = ref<any[]>([])
const mockSidebarLogo = ref<string | null>(null)
const mockSidebarBgImage = ref('')
const mockThemeObj = ref({})
const mockMdAndDown = ref(false)

// Mock Vuetify 3 components
const vuetifyComponentsMock = vi.hoisted(() => ({
    VNavigationDrawer: {
        name: 'VNavigationDrawer',
        props: { modelValue: Boolean, miniVariant: Boolean, width: [String, Number], temporary: Boolean },
        template: '<div class="v-navigation-drawer" :style="$attrs.style"><slot name="append" /><slot /></div>',
    },
    VList: { name: 'VList', template: '<div class="v-list"><slot /></div>' },
    VListItem: {
        name: 'VListItem',
        props: { router: Boolean, to: [String, Object], ripple: [Boolean, Object] },
        template: '<a class="v-list-item"><slot name="prepend" /><slot /></a>',
    },
    VImg: { name: 'VImg', props: { src: String, cover: Boolean }, template: '<img class="v-img" :src="src" />' },
    VIcon: { name: 'VIcon', props: { icon: String }, template: '<i><slot /></i>' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

vi.mock('vuetify', () => ({
    useDisplay: () => ({ mdAndDown: mockMdAndDown }),
    useTheme: () => ({ global: { current: { value: { dark: true } } } }),
}))

vi.mock('@/composables/useNavigation', () => ({
    useNavigation: () => ({
        isMobile: mockIsMobile,
        visibleNaviPoints: mockVisibleNaviPoints,
    }),
}))

vi.mock('@/composables/useTheme', () => ({
    useTheme: () => ({
        sidebarLogo: mockSidebarLogo,
        sidebarBgImage: mockSidebarBgImage,
        themeObj: mockThemeObj,
    }),
}))

vi.mock('overlayscrollbars-vue', () => ({
    OverlayScrollbarsComponent: {
        name: 'OverlayScrollbarsComponent',
        template: '<div class="os-scrollbar"><slot /></div>',
    },
}))

vi.mock('@/components/ui/MainsailLogo.vue', () => ({
    default: { name: 'MainsailLogo', template: '<div class="mock-mainsail-logo" />' },
}))

vi.mock('@/components/ui/SidebarItem.vue', () => ({
    default: {
        name: 'SidebarItem',
        props: { item: Object },
        template: '<div class="mock-sidebar-item" />',
    },
}))

vi.mock('@/components/dialogs/AboutDialog.vue', () => ({
    default: { name: 'AboutDialog', template: '<div class="mock-about-dialog" />' },
}))

function createStoreWithState(overrides: Record<string, any> = {}) {
    return createStore({
        state: {
            gui: {
                general: { printername: 'TestPrinter' },
                uiSettings: { navigationStyle: 'iconsAndText', logo: '#ffffff' },
            },
            printer: { hostname: 'mainsail-host' },
            naviDrawer: true,
            ...overrides,
        },
        getters: {
            'files/getCustomSidebarBackground': () => null,
            ...((overrides as any).getters || {}),
        },
    })
}

describe('TheSidebar.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Reset all mutable refs
        mockIsMobile.value = false
        mockVisibleNaviPoints.value = []
        mockSidebarLogo.value = null
        mockSidebarBgImage.value = ''
        mockThemeObj.value = {}
        mockMdAndDown.value = false
    })

    it('renders nav drawer with printer name', () => {
        mockIsMobile.value = true
        const store = createStoreWithState()
        const wrapper = mount(TheSidebar, {
            global: { plugins: [store], stubs: ['router-link', 'router-view'] },
        })

        expect(wrapper.find('.v-navigation-drawer').exists()).toBe(true)
        expect(wrapper.text()).toContain('TestPrinter')
    })

    it('shows nav items when visibleNaviPoints has entries', () => {
        mockVisibleNaviPoints.value = [
            {
                type: 'route' as const,
                title: 'Dashboard',
                icon: 'mdi-view-dashboard',
                to: '/',
                position: 0,
                visible: true,
            },
            {
                type: 'route' as const,
                title: 'Console',
                icon: 'mdi-console',
                to: '/console',
                position: 1,
                visible: true,
            },
        ]
        const store = createStoreWithState()
        const wrapper = mount(TheSidebar, {
            global: { plugins: [store], stubs: ['router-link', 'router-view'] },
        })

        const items = wrapper.findAll('.mock-sidebar-item')
        expect(items).toHaveLength(2)
    })

    it('shows about-dialog in append slot', () => {
        const store = createStoreWithState()
        const wrapper = mount(TheSidebar, {
            global: { plugins: [store], stubs: ['router-link', 'router-view'] },
        })

        expect(wrapper.find('.mock-about-dialog').exists()).toBe(true)
    })

    it('toggles naviDrawer via store dispatch', async () => {
        const store = createStoreWithState()
        const dispatchSpy = vi.spyOn(store, 'dispatch')
        const wrapper = mount(TheSidebar, {
            global: { plugins: [store], stubs: ['router-link', 'router-view'] },
        })

        const navDrawer = wrapper.findComponent({ name: 'VNavigationDrawer' })
        await navDrawer.vm.$emit('update:modelValue', false)

        expect(dispatchSpy).toHaveBeenCalledWith('setNaviDrawer', false)
    })

    it('shows logo image when sidebarLogo is set', () => {
        mockIsMobile.value = true
        mockSidebarLogo.value = '/custom/logo.svg'
        const store = createStoreWithState()
        const wrapper = mount(TheSidebar, {
            global: { plugins: [store], stubs: ['router-link', 'router-view'] },
        })

        const logoImg = wrapper.find('img.nav-logo')
        expect(logoImg.exists()).toBe(true)
        expect(logoImg.attributes('src')).toBe('/custom/logo.svg')

        expect(wrapper.find('.mock-mainsail-logo').exists()).toBe(false)
    })

    it('shows MainsailLogo fallback when no sidebarLogo', () => {
        mockIsMobile.value = true
        mockSidebarLogo.value = null
        const store = createStoreWithState()
        const wrapper = mount(TheSidebar, {
            global: { plugins: [store], stubs: ['router-link', 'router-view'] },
        })

        expect(wrapper.find('.mock-mainsail-logo').exists()).toBe(true)
        expect(wrapper.find('img.nav-logo').exists()).toBe(false)
    })

    it('uses iconsOnly class when navigationStyle is iconsOnly', () => {
        mockIsMobile.value = true
        const store = createStoreWithState({
            gui: {
                general: { printername: 'TestPrinter' },
                uiSettings: { navigationStyle: 'iconsOnly', logo: '#ffffff' },
            },
            printer: { hostname: 'mainsail-host' },
            naviDrawer: true,
        })
        const wrapper = mount(TheSidebar, {
            global: { plugins: [store], stubs: ['router-link', 'router-view'] },
        })

        const listItem = wrapper.find('.v-list-item.sidebar-logo')
        expect(listItem.classes()).toContain('pa-0')
        expect(listItem.classes()).toContain('justify-center')

        expect(wrapper.text()).not.toContain('TestPrinter')
    })

    it('boolNaviTemp is true on mdAndDown non-mobile screens', () => {
        mockMdAndDown.value = true
        // isMobile defaults to false
        const store = createStoreWithState()
        const wrapper = mount(TheSidebar, {
            global: { plugins: [store], stubs: ['router-link', 'router-view'] },
        })

        const navDrawer = wrapper.find('.v-navigation-drawer')
        expect(navDrawer.attributes('style')).toContain('padding-bottom: 48px')
    })
})
