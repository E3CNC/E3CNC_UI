import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import vLongpress from '@/directives/longpress'

function createTestComponent(handler: any = vi.fn(), arg?: string) {
    return {
        template: `<div v-longpress${arg ? ":'" + arg + "'" : ''}="handler"></div>`,
        directives: { longpress: vLongpress },
        data: () => ({ handler }),
    }
}

function triggerTouchstart(el: HTMLElement, x = 0, y = 0) {
    el.dispatchEvent(
        new TouchEvent('touchstart', {
            touches: [{ clientX: x, clientY: y, identifier: 0 } as Touch],
            bubbles: true,
        })
    )
}

function triggerTouchmove(el: HTMLElement, x = 0, y = 0) {
    el.dispatchEvent(
        new TouchEvent('touchmove', {
            touches: [{ clientX: x, clientY: y, identifier: 0 } as Touch],
            bubbles: true,
        })
    )
}

function triggerTouchend(el: HTMLElement) {
    el.dispatchEvent(new TouchEvent('touchend', { bubbles: true }))
}

function triggerTouchcancel(el: HTMLElement) {
    el.dispatchEvent(new TouchEvent('touchcancel', { bubbles: true }))
}

beforeEach(() => {
    vi.useFakeTimers()
})

describe('vLongpress', () => {
    it('calls handler after default 1000ms hold', () => {
        const handler = vi.fn()
        const wrapper = mount(createTestComponent(handler))
        triggerTouchstart(wrapper.element)
        vi.advanceTimersByTime(1000)
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it('calls handler after custom debounce time', () => {
        const handler = vi.fn()
        const wrapper = mount(createTestComponent(handler, '500'))
        triggerTouchstart(wrapper.element)
        vi.advanceTimersByTime(500)
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it('does not call handler before debounce time elapses', () => {
        const handler = vi.fn()
        const wrapper = mount(createTestComponent(handler))
        triggerTouchstart(wrapper.element)
        vi.advanceTimersByTime(999)
        expect(handler).not.toHaveBeenCalled()
    })

    it('cancels on touchend before timeout', () => {
        const handler = vi.fn()
        const wrapper = mount(createTestComponent(handler))
        triggerTouchstart(wrapper.element)
        triggerTouchend(wrapper.element)
        vi.advanceTimersByTime(1000)
        expect(handler).not.toHaveBeenCalled()
    })

    it('cancels on touchcancel', () => {
        const handler = vi.fn()
        const wrapper = mount(createTestComponent(handler))
        triggerTouchstart(wrapper.element)
        triggerTouchcancel(wrapper.element)
        vi.advanceTimersByTime(1000)
        expect(handler).not.toHaveBeenCalled()
    })

    it('cancels on touchmove beyond threshold', () => {
        const handler = vi.fn()
        const wrapper = mount(createTestComponent(handler))
        triggerTouchstart(wrapper.element, 0, 0)
        triggerTouchmove(wrapper.element, 20, 0)
        vi.advanceTimersByTime(1000)
        expect(handler).not.toHaveBeenCalled()
    })

    it('does not cancel on small touchmove within threshold', () => {
        const handler = vi.fn()
        const wrapper = mount(createTestComponent(handler))
        triggerTouchstart(wrapper.element, 0, 0)
        triggerTouchmove(wrapper.element, 5, 5)
        vi.advanceTimersByTime(1000)
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it('warns when binding value is not a function or handler object', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const wrapper = mount({
            template: '<div v-longpress="123"></div>',
            directives: { longpress: vLongpress },
        })
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[longpress:]'))
        warnSpy.mockRestore()
    })

    it('sets user-select: none on body during press', () => {
        const handler = vi.fn()
        const wrapper = mount(createTestComponent(handler))
        triggerTouchstart(wrapper.element)
        expect(document.body.style.userSelect).toBe('none')
    })

    it('cleans up on unmount', () => {
        const handler = vi.fn()
        const wrapper = mount(createTestComponent(handler))
        const el = wrapper.element
        const spy = vi.spyOn(el, 'removeEventListener')
        wrapper.unmount()
        expect(spy).toHaveBeenCalledWith('touchstart', expect.any(Function))
    })

    it('calls handler with args when binding is { handler, args } object', () => {
        const handler = vi.fn()
        const wrapper = mount({
            template: `<div v-longpress="{ handler, args: ['arg1', 42] }"></div>`,
            directives: { longpress: vLongpress },
            data: () => ({ handler }),
        })
        triggerTouchstart(wrapper.element)
        vi.advanceTimersByTime(1000)
        expect(handler).toHaveBeenCalledWith(
            expect.objectContaining({ preventDefault: expect.any(Function) }),
            'arg1',
            42
        )
    })

    it('handler receives longpress event with touch coordinates and preventDefault', () => {
        const handler = vi.fn()
        const wrapper = mount(createTestComponent(handler))
        triggerTouchstart(wrapper.element, 150, 200)
        vi.advanceTimersByTime(1000)
        expect(handler).toHaveBeenCalledWith(
            expect.objectContaining({
                clientX: 150,
                clientY: 200,
                preventDefault: expect.any(Function),
            })
        )
    })

    it('does not call handler when touchstart has no touches', () => {
        const handler = vi.fn()
        const wrapper = mount(createTestComponent(handler))
        wrapper.element.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }))
        vi.advanceTimersByTime(1000)
        expect(handler).not.toHaveBeenCalled()
    })

    it('cancels on document scroll during press', () => {
        const handler = vi.fn()
        const wrapper = mount(createTestComponent(handler))
        triggerTouchstart(wrapper.element)
        document.dispatchEvent(new Event('scroll'))
        vi.advanceTimersByTime(1000)
        expect(handler).not.toHaveBeenCalled()
    })

    it('prevents dragstart default during active longpress', () => {
        const handler = vi.fn()
        const wrapper = mount(createTestComponent(handler))
        triggerTouchstart(wrapper.element)
        const dragEvent = new Event('dragstart', { cancelable: true })
        const preventDefaultSpy = vi.spyOn(dragEvent, 'preventDefault')
        wrapper.element.dispatchEvent(dragEvent)
        expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('removes user-select:none from body after debounceTime + 200ms', () => {
        const handler = vi.fn()
        const wrapper = mount(createTestComponent(handler))
        triggerTouchstart(wrapper.element)
        expect(document.body.style.userSelect).toBe('none')
        vi.advanceTimersByTime(1200) // debounceTime (1000) + 200
        expect(document.body.style.userSelect).toBe('')
    })
})
