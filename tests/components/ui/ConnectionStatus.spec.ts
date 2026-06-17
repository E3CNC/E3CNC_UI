import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ConnectionStatus from '@/components/ui/ConnectionStatus.vue'

/**
 * ConnectionStatus.vue — SVG-based connection status component
 *
 * Props: moonraker (Boolean), klipper (Boolean)
 * Helper functions: getOnSurface() reads --v-theme-on-surface CSS var,
 *   muteColor() dims RGB values to 45%.
 *
 * In the happy-dom test environment getComputedStyle returns empty,
 * so getOnSurface() → '' → surface falls back to '200,200,200'.
 * muteColor('') → fallback '115,115,115' (can't parse empty).
 */

describe('ConnectionStatus.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ── Text label tests ────────────────────────────────────────

    it('renders Mainsail, Moonraker and Klipper text labels', () => {
        const wrapper = mount(ConnectionStatus, {
            props: { moonraker: true, klipper: true },
        })
        expect(wrapper.text()).toContain('Mainsail')
        expect(wrapper.text()).toContain('Moonraker')
        expect(wrapper.text()).toContain('Klipper')
    })

    // ── Connection-state icon visibility tests ──────────────────

    it('shows success icon on both connectors when moonraker=true AND klipper=true', () => {
        const wrapper = mount(ConnectionStatus, {
            props: { moonraker: true, klipper: true },
        })

        // Mainsail→Moonraker connector: success1 (check-mark path)
        expect(wrapper.find('#success1').exists()).toBe(true)
        // Moonraker→Klipper connector: success (check-mark path)
        expect(wrapper.find('#success').exists()).toBe(true)

        // No warning or unknown icons when everything is connected
        expect(wrapper.find('#alert1').exists()).toBe(false)
        expect(wrapper.find('#alert').exists()).toBe(false)
        expect(wrapper.find('#unknown').exists()).toBe(false)
    })

    it('shows success on first connector and warning on second when moonraker=true but klipper=false', () => {
        const wrapper = mount(ConnectionStatus, {
            props: { moonraker: true, klipper: false },
        })

        // Mainsail→Moonraker is connected → success
        expect(wrapper.find('#success1').exists()).toBe(true)
        // Moonraker→Klipper is broken → warning (alert icon)
        expect(wrapper.find('#alert').exists()).toBe(true)

        // No other icons should be visible
        expect(wrapper.find('#alert1').exists()).toBe(false)
        expect(wrapper.find('#success').exists()).toBe(false)
        expect(wrapper.find('#unknown').exists()).toBe(false)
    })

    it('shows warning on first connector and unknown on second when moonraker=false', () => {
        const wrapper = mount(ConnectionStatus, {
            props: { moonraker: false, klipper: false },
        })

        // Mainsail→Moonraker is down → warning (alert1 icon via v-else)
        expect(wrapper.find('#alert1').exists()).toBe(true)
        // Moonraker status unknown → unknown (question-mark icon via v-else)
        expect(wrapper.find('#unknown').exists()).toBe(true)

        // No success or alert icons should be visible
        expect(wrapper.find('#success1').exists()).toBe(false)
        expect(wrapper.find('#success').exists()).toBe(false)
        expect(wrapper.find('#alert').exists()).toBe(false)
    })

    // ── Pure function: muteColor ────────────────────────────────

    it('muteColor correctly dims RGB values to 45% through rendered output', () => {
        // Set a known CSS var so getOnSurface() returns a parseable value
        const origValue = document.documentElement.style.getPropertyValue('--v-theme-on-surface')
        document.documentElement.style.setProperty('--v-theme-on-surface', '100 150 200')

        const wrapper = mount(ConnectionStatus, {
            props: { moonraker: true, klipper: true },
        })

        // Moonraker→Klipper arrows use `colorMuted` (always muted).
        // Expected: 100*0.45=45, 150*0.45=67.5→68, 200*0.45=90 → "rgb(45,68,90)"
        const mrKlipper = wrapper.find('#Moonraker_Klipper')
        const arrowLeft = mrKlipper.find('#arrow_left path')
        const arrowRight = mrKlipper.find('#arrow_right path')

        expect(arrowLeft.attributes('style')).toContain('rgb(45,68,90)')
        expect(arrowRight.attributes('style')).toContain('rgb(45,68,90)')

        // Mainsail icon paths use `colorMainsail` (=surface, not muted)
        // getOnSurface returns space-separated values → style is "rgb(100 150 200)"
        const mainsailIcon = wrapper.find('#Mainsail_icon path')
        expect(mainsailIcon.attributes('style')).toContain('rgb(100 150 200)')

        // Clean up
        document.documentElement.style.removeProperty('--v-theme-on-surface')
        if (origValue) {
            document.documentElement.style.setProperty('--v-theme-on-surface', origValue)
        }
    })

    // ── Pure function: getOnSurface fallback ────────────────────

    it('getOnSurface fallback returns default color when CSS var is not set', () => {
        // Ensure no CSS var is set (happy-dom default)
        document.documentElement.style.removeProperty('--v-theme-on-surface')

        const wrapper = mount(ConnectionStatus, {
            props: { moonraker: true, klipper: true },
        })

        // Mainsail text uses colorMainsail which defaults to '200,200,200'
        const mainsailText = wrapper.find('#Mainsail_text text')
        expect(mainsailText.attributes('style')).toContain('rgb(200,200,200)')

        // Mainsail icon paths also use colorMainsail
        const mainsailPaths = wrapper.find('#Mainsail_icon').findAll('path')
        for (const path of mainsailPaths) {
            expect(path.attributes('style')).toContain('rgb(200,200,200)')
        }
    })
})
