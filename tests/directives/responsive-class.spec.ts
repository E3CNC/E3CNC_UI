import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { vResponsiveClass } from '@/directives/responsive-class'

describe('vResponsiveClass', () => {
    let observeCallback: Function

    beforeEach(() => {
        vi.useFakeTimers()
        observeCallback = vi.fn()

        const MockObserver = vi.fn((cb: Function) => {
            observeCallback = cb
            return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }
        })
        vi.stubGlobal('ResizeObserver', MockObserver as any)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('adds class when breakpoint function returns true', () => {
        const wrapper = mount({
            template: `<div v-responsive-class="breakpoints"></div>`,
            directives: { responsiveClass: vResponsiveClass },
            data: () => ({
                breakpoints: {
                    wide: (cr: DOMRectReadOnly) => cr.width >= 400,
                },
            }),
        })

        observeCallback([{ contentRect: { width: 500, height: 200 } as DOMRectReadOnly }])
        vi.advanceTimersByTime(50)

        expect(wrapper.classes()).toContain('wide')
    })

    it('removes class when breakpoint no longer matches', () => {
        const wrapper = mount({
            template: `<div v-responsive-class="breakpoints"></div>`,
            directives: { responsiveClass: vResponsiveClass },
            data: () => ({
                breakpoints: {
                    wide: (cr: DOMRectReadOnly) => cr.width >= 400,
                },
            }),
        })

        observeCallback([{ contentRect: { width: 500, height: 200 } as DOMRectReadOnly }])
        vi.advanceTimersByTime(50)
        expect(wrapper.classes()).toContain('wide')

        observeCallback([{ contentRect: { width: 100, height: 200 } as DOMRectReadOnly }])
        vi.advanceTimersByTime(50)
        expect(wrapper.classes()).not.toContain('wide')
    })

    it('cleanup disconnects observer on unmount', () => {
        const disconnect = vi.fn()
        vi.stubGlobal('ResizeObserver', vi.fn(() => ({ observe: vi.fn(), disconnect })))

        const wrapper = mount({
            template: '<div v-responsive-class="{ wide: () => true }"></div>',
            directives: { responsiveClass: vResponsiveClass },
        })
        wrapper.unmount()
        expect(disconnect).toHaveBeenCalled()
    })

    it('handles multiple breakpoints simultaneously', () => {
        const wrapper = mount({
            template: `<div v-responsive-class="breakpoints"></div>`,
            directives: { responsiveClass: vResponsiveClass },
            data: () => ({
                breakpoints: {
                    wide: (cr: DOMRectReadOnly) => cr.width >= 400,
                    tall: (cr: DOMRectReadOnly) => cr.height >= 300,
                    small: (cr: DOMRectReadOnly) => cr.width < 200,
                },
            }),
        })

        observeCallback([{ contentRect: { width: 500, height: 100 } as DOMRectReadOnly }])
        vi.advanceTimersByTime(50)
        expect(wrapper.classes()).toContain('wide')
        expect(wrapper.classes()).not.toContain('tall')
        expect(wrapper.classes()).not.toContain('small')

        observeCallback([{ contentRect: { width: 150, height: 400 } as DOMRectReadOnly }])
        vi.advanceTimersByTime(50)
        expect(wrapper.classes()).not.toContain('wide')
        expect(wrapper.classes()).toContain('tall')
        expect(wrapper.classes()).toContain('small')
    })

    it('does not error with empty breakpoints object', () => {
        const wrapper = mount({
            template: `<div v-responsive-class="breakpoints"></div>`,
            directives: { responsiveClass: vResponsiveClass },
            data: () => ({ breakpoints: {} }),
        })
        expect(() => {
            observeCallback([{ contentRect: { width: 500, height: 200 } as DOMRectReadOnly }])
            vi.advanceTimersByTime(50)
        }).not.toThrow()
    })
})
