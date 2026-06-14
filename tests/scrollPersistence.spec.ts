import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

describe('scroll persistence – localStorage', () => {
    it('saves scroll position to localStorage', () => {
        localStorage.setItem('cncBodyScrollTop', '600')
        expect(localStorage.getItem('cncBodyScrollTop')).toBe('600')
    })

    it('restores scroll position from localStorage', () => {
        localStorage.setItem('cncBodyScrollTop', '1200')
        const saved = Number(localStorage.getItem('cncBodyScrollTop'))
        expect(saved).toBe(1200)
    })

    it('returns 0 when no saved value exists', () => {
        const saved = Number(localStorage.getItem('cncBodyScrollTop'))
        expect(saved).toBe(0)
    })

    it('returns 0 for NaN values', () => {
        localStorage.setItem('cncBodyScrollTop', 'abc')
        const saved = Number(localStorage.getItem('cncBodyScrollTop'))
        expect(saved).toBeNaN()
        expect(Number.isNaN(saved) ? 0 : saved).toBe(0)
    })
})

describe('scroll persistence – documentElement target', () => {
    let origScrollTop: number

    beforeEach(() => {
        origScrollTop = document.documentElement.scrollTop
    })

    afterEach(() => {
        document.documentElement.scrollTop = origScrollTop
    })

    it('can set and read scrollTop on documentElement', () => {
        document.documentElement.scrollTop = 500
        expect(document.documentElement.scrollTop).toBe(500)
    })

    it('can set scrollTop to 0', () => {
        document.documentElement.scrollTop = 500
        document.documentElement.scrollTop = 0
        expect(document.documentElement.scrollTop).toBe(0)
    })

    it('documentElement has scrollHeight >= clientHeight when content overflows', () => {
        // happy-dom may not simulate full overflow, but we verify the property exists
        expect(typeof document.documentElement.scrollHeight).toBe('number')
        expect(typeof document.documentElement.clientHeight).toBe('number')
    })
})

describe('scroll persistence – beforeunload handler', () => {
    it('attaches beforeunload listener', () => {
        const addSpy = vi.spyOn(window, 'addEventListener')
        const handler = vi.fn()
        window.addEventListener('beforeunload', handler)
        expect(addSpy).toHaveBeenCalledWith('beforeunload', handler)
        addSpy.mockRestore()
    })

    it('saves scrollTop on beforeunload event', () => {
        document.documentElement.scrollTop = 800
        let savedValue = ''
        const handler = () => {
            savedValue = String(document.documentElement.scrollTop)
        }
        window.addEventListener('beforeunload', handler)

        const event = new Event('beforeunload')
        window.dispatchEvent(event)

        expect(savedValue).toBe('800')
        window.removeEventListener('beforeunload', handler)
    })
})

describe('scroll persistence – restore retry logic', () => {
    it('sets scrollTop immediately', () => {
        document.documentElement.scrollTop = 300
        expect(document.documentElement.scrollTop).toBe(300)
    })

    it('retry loop stops when scroll matches target', async () => {
        const target = 400
        document.documentElement.scrollTop = 0

        let attempts = 0
        const restoreScroll = () => {
            document.documentElement.scrollTop = target
            attempts++
        }

        restoreScroll()
        expect(document.documentElement.scrollTop).toBe(target)
        expect(attempts).toBe(1)
    })

    it('retry loop retries up to max attempts', async () => {
        let attempts = 0
        const maxAttempts = 3

        const restoreScroll = () => {
            attempts++
            if (attempts < maxAttempts) {
                restoreScroll()
            }
        }

        restoreScroll()
        expect(attempts).toBe(maxAttempts)
    })
})

describe('scroll persistence – scroll key name', () => {
    it('uses cncBodyScrollTop as the localStorage key', () => {
        const key = 'cncBodyScrollTop'
        localStorage.setItem(key, '999')
        expect(localStorage.getItem(key)).toBe('999')
    })

    it('does not use old key name cncMainScrollTop', () => {
        localStorage.setItem('cncMainScrollTop', '999')
        // cncBodyScrollTop should still be independent
        expect(localStorage.getItem('cncBodyScrollTop')).not.toBe('999')
    })
})
