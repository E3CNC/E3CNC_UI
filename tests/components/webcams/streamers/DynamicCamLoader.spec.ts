import { describe, it, expect } from 'vitest'
import { getDynamicCamImport } from '@/components/webcams/streamers/DynamicCamLoader'

const ALL_STREAMER_TYPES = [
    'Hlsstreamer',
    'HtmlIframe',
    'HtmlVideo',
    'JanusStreamer',
    'JMuxerStream',
    'Mjpegstreamer',
    'MjpegstreamerAdaptive',
    'Uv4lMjpeg',
    'WebrtcCameraStreamer',
    'WebrtcMediaMTX',
    'WebrtcGo2rtc',
] as const

describe('getDynamicCamImport', () => {
    // -----------------------------------------------------------------------
    // 1. Returns a function for each known streamer type
    // -----------------------------------------------------------------------
    it.each(ALL_STREAMER_TYPES)('returns a function for "%s"', (type) => {
        const result = getDynamicCamImport(type)
        expect(result).toBeDefined()
        expect(typeof result).toBe('function')
    })

    // -----------------------------------------------------------------------
    // 2. Each returned function is callable (typeof === 'function')
    // -----------------------------------------------------------------------
    it.each(ALL_STREAMER_TYPES)('returned value for "%s" is callable as a function', async (type) => {
        const loader = getDynamicCamImport(type)
        // Verify the returned value is a function by checking typeof
        expect(typeof loader).toBe('function')
        // Calling the function returns a Promise (dynamic import). Catch the
        // rejection so unhandled CSS/vue imports don't pollute the test output.
        const importPromise = loader!()
        expect(importPromise).toBeInstanceOf(Promise)
        await importPromise.catch(() => {
            // expected — happy-dom cannot resolve .vue/.css imports
        })
    })

    // -----------------------------------------------------------------------
    // 3. Returns undefined for unknown type (no default case in the switch)
    // -----------------------------------------------------------------------
    it('returns undefined for an unknown streamer type', () => {
        const result = getDynamicCamImport('unknown' as any)
        expect(result).toBeUndefined()
    })

    // -----------------------------------------------------------------------
    // 4. Returns undefined for each possible invalid value
    // -----------------------------------------------------------------------
    it.each(['', 'FakeStreamer', 'Webrtc', 'mjpegstreamer', 'hls'])(
        'returns undefined for invalid type "%s"',
        (type) => {
            const result = getDynamicCamImport(type as any)
            expect(result).toBeUndefined()
        }
    )

    // -----------------------------------------------------------------------
    // 5. All returned functions are distinct (different import paths)
    // -----------------------------------------------------------------------
    it('returns a unique function for each streamer type', () => {
        const results = ALL_STREAMER_TYPES.map((t) => getDynamicCamImport(t))
        // Stringify each function to get its import path; all should be unique
        const toStrings = results.map((fn) => fn!.toString())
        const unique = new Set(toStrings)
        expect(unique.size).toBe(ALL_STREAMER_TYPES.length)
    })
})
