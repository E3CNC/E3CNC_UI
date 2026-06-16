import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getters } from '@/store/server/getters'
import { mutations } from '@/store/server/mutations'
import { actions } from '@/store/server/actions'
import { getDefaultState } from '@/store/server/index'
import type { ServerState } from '@/store/server/types'

const mockSocket = vi.hoisted(() => ({
    emit: vi.fn(),
    emitAndWait: vi.fn(),
}))
const mockToast = vi.hoisted(() => ({
    error: vi.fn(),
    success: vi.fn(),
}))
const mockRouter = vi.hoisted(() => ({
    currentRoute: {
        path: '/printer',
    },
}))

vi.mock('@/store/runtime', () => ({
    getSocket: () => mockSocket,
    $toast: mockToast,
}))

vi.mock('@/plugins/router', () => ({
    default: mockRouter,
}))

vi.mock('@/plugins/helpers', () => ({
    camelize: (value: string) => value.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()),
    formatConsoleMessage: (message: string) => `fmt:${message}`,
    formatFilesize: (bytes: number) => `FS:${bytes}`,
}))

vi.mock('@/store/variables', () => ({
    initableServerComponents: ['power', 'sensor'],
    maxEventHistory: 2,
}))

describe('server store', () => {
    let state: ServerState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    it('formats console events and inserts the helper tip banner', () => {
        state.events = [
            {
                date: new Date('2024-01-01T00:00:00Z'),
                message: 'ok',
                formatMessage: 'fmt:ok',
                type: 'command',
            },
        ]

        const result = (getters as any).getConsoleEvents(state)(false)

        expect(result).toHaveLength(2)
        expect(result[0].message).toContain('Type <a class="command text--blue">HELP</a>')
        expect(result[1].formatMessage).toBe('fmt:ok')
    })

    it('derives host stats, network interfaces, and throttled flags', () => {
        state.system_info = {
            available_services: [],
            cpu_info: {
                bits: '64',
                cpu_count: 2,
                cpu_desc: 'ARM Cortex',
                serial_number: '1',
                hardware_desc: 'board',
                memory_units: 'KB',
                model: 'test',
                processor: 'RPi',
                total_memory: 2,
            },
            distribution: {
                codename: 'noble',
                id: 'ubuntu',
                like: 'debian',
                name: 'Ubuntu',
                version: '24.04',
                version_parts: {
                    build_number: '1',
                    major: '24',
                    minor: '04',
                },
                release_info: {
                    name: 'Ubuntu',
                    version_id: '24.04',
                    id: 'ubuntu',
                },
            },
            sd_info: {
                capacity: '',
                manufacturer: '',
                manufacturer_date: '',
                manufacturer_id: '',
                oem_id: '',
                product_name: '',
                product_revision: '',
                serial_number: '',
                total_bytes: 0,
            },
            service_state: {},
            python: {
                version: ['3'],
                version_string: '3.11.2 (main)',
            },
            network: {
                eth0: {
                    mac_address: 'aa:bb',
                    ip_addresses: [],
                },
            },
            system_uptime: 10,
            instance_ids: {
                moonraker: 'm',
                klipper: 'k',
            },
        }
        state.cpu_temp = 44
        state.system_cpu_usage = { cpu: 12.6 }
        state.network_stats = {
            lo: { bandwidth: 1, rx_bytes: 1, tx_bytes: 1 },
            eth0: { bandwidth: 100, rx_bytes: 10, tx_bytes: 20 },
            can0: { bandwidth: 50, rx_bytes: 5, tx_bytes: 6 },
            wlan0: { bandwidth: 25, rx_bytes: 3, tx_bytes: 4 },
        }
        state.throttled_state = {
            bits: 3,
            flags: ['?', 'under-voltage'],
        }

        const hostStats = (getters as any).getHostStats(
            state,
            {},
            {
                printer: {
                    app_name: 'Klipper',
                    software_version: 'v1-2-3-4-5',
                    system_stats: {
                        sysload: 1.8,
                        memavail: 1,
                    },
                },
            },
            {
                'printer/getHostTempSensor': null,
            }
        )

        expect(hostStats.version).toBe('Klipper v1-2-3-4')
        expect(hostStats.pythonVersion).toBe('3.11.2 ')
        expect(hostStats.loadPercent).toBe(90)
        expect(hostStats.loadProgressColor).toBe('warning')
        expect(hostStats.memoryFormat).toBe('FS:1024 / FS:2048')
        expect(hostStats.memUsage).toBe(50)
        expect(hostStats.tempSensor.temperature).toBe('44')

        expect((getters as any).getCpuUsage(state)).toBe(13)
        expect((getters as any).getThrottledStateFlags(state)).toEqual(['Undervoltage'])
        expect((getters as any).getNetworkInterfaces(state)).toEqual({
            eth0: {
                bandwidth: 100,
                rx_bytes: 10,
                tx_bytes: 20,
                details: {
                    mac_address: 'aa:bb',
                    ip_addresses: [],
                },
            },
            can0: {
                bandwidth: 50,
                rx_bytes: 5,
                tx_bytes: 6,
            },
        })
    })

    it('applies mutations for gcode store and events', () => {
        mutations.setData(state, { klippy_state: 'ready', websocket_count: 2 } as any)
        expect(state.klippy_state).toBe('ready')
        expect(state.websocket_count).toBe(2)

        mutations.setGcodeStore(state, [
            { time: 1, type: 'response', message: '// debug: drop me' },
            { time: 2, type: 'command', message: 'G28' },
            { time: 3, type: 'response', message: 'ok' },
        ] as any)
        expect(state.events).toHaveLength(2)
        expect(state.events[0].type).toBe('command')
        expect(state.events[1].type).toBe('response')

        mutations.addEvent(state, {
            date: new Date('2024-01-01T00:00:00Z'),
            message: 'M117 Hi',
            formatMessage: 'fmt:M117 Hi',
            type: 'autocomplete',
        })
        mutations.addEvent(state, {
            date: new Date('2024-01-01T00:00:01Z'),
            message: 'M117 Hi',
            formatMessage: 'fmt:M117 Hi',
            type: 'command',
        })

        expect(state.events.at(-1)?.type).toBe('command')
        expect(state.events).toHaveLength(2)

        mutations.addFailedInitComponent(state, 'power')
        mutations.addFailedInitComponent(state, 'power')
        mutations.removeComponent(state, 'power')
        expect(state.failed_init_components).toEqual(['power'])
        expect(state.components).toEqual([])
    })

    it('filters and routes server actions', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()

        actions.addEvent({ commit, rootGetters: { 'gui/console/getConsolefilterRules': [] } } as any, {
            message: '!! boom',
            type: 'response',
        })
        expect(commit).toHaveBeenCalledWith(
            'addEvent',
            expect.objectContaining({
                message: '!! boom',
                type: 'response',
            })
        )
        expect(mockToast.error).toHaveBeenCalled()

        actions.getGcodeStore(
            { commit, dispatch, rootGetters: { 'gui/console/getConsolefilterRules': ['skip'], 'gui/console/getConsoleClearedSince': 2000 } } as any,
            {
                gcode_store: [
                    { time: 1, type: 'response', message: 'old' },
                    { time: 3, type: 'response', message: 'skip me' },
                    { time: 4, type: 'response', message: 'keep me' },
                ],
            }
        )

        expect(commit).toHaveBeenCalledWith('clearGcodeStore')
        expect(commit).toHaveBeenCalledWith('setGcodeStore', [
            { time: 4, type: 'response', message: 'keep me' },
        ])
        expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'server/gcode_store', { root: true })
    })

    it('addEvent catches invalid regex filters and logs error', () => {
        const consoleSpy = vi.spyOn(window.console, 'error').mockImplementation(() => {})
        const commit = vi.fn()
        actions.addEvent({ commit, rootGetters: { 'gui/console/getConsolefilterRules': ['[invalid'] } } as any, {
            message: 'test message',
            type: 'response',
        })
        expect(consoleSpy).toHaveBeenCalledWith("Custom console filter '[invalid' doesn't work!")
        expect(commit).toHaveBeenCalled()
        consoleSpy.mockRestore()
    })

    it('getGcodeStore passes when cleared_since is falsy', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.getGcodeStore(
            { commit, dispatch, rootGetters: { 'gui/console/getConsolefilterRules': [], 'gui/console/getConsoleClearedSince': 0 } } as any,
            {
                gcode_store: [
                    { time: 1, type: 'response', message: 'hello' },
                    { time: 2, type: 'response', message: 'world' },
                ],
            }
        )
        expect(commit).toHaveBeenCalledWith('setGcodeStore', [
            { time: 1, type: 'response', message: 'hello' },
            { time: 2, type: 'response', message: 'world' },
        ])
    })

    it('getGcodeStore catches invalid regex filters', () => {
        const consoleSpy = vi.spyOn(window.console, 'error').mockImplementation(() => {})
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.getGcodeStore(
            { commit, dispatch, rootGetters: { 'gui/console/getConsolefilterRules': ['[bad'], 'gui/console/getConsoleClearedSince': 0 } } as any,
            {
                gcode_store: [
                    { time: 1, type: 'response', message: 'test' },
                ],
            }
        )
        expect(consoleSpy).toHaveBeenCalledWith("Custom console filter '[bad' doesn't work")
        consoleSpy.mockRestore()
    })

    it('initServerInfo deletes plugins and failed_plugins keys from payload', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        const payload: any = {
            components: ['power'],
            registered_directories: ['gcodes'],
            plugins: { somePlugin: {} },
            failed_plugins: ['broken'],
        }
        actions.initServerInfo({ dispatch, commit } as any, payload)
        expect(payload).not.toHaveProperty('plugins')
        expect(payload).not.toHaveProperty('failed_plugins')
        expect(commit).toHaveBeenCalledWith('setData', expect.not.objectContaining({ plugins: expect.anything() }))
    })

    it('initServerInfo handles empty components and registered_directories', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.initServerInfo({ dispatch, commit } as any, {
            components: [],
            registered_directories: [],
            klippy_state: 'ready',
        })
        expect(dispatch).not.toHaveBeenCalledWith('socket/addInitModule', expect.stringContaining('server/'), expect.anything())
        expect(dispatch).not.toHaveBeenCalledWith('files/initRootDirs', expect.anything(), expect.anything())
        expect(commit).toHaveBeenCalledWith('setData', {
            components: [],
            registered_directories: [],
            klippy_state: 'ready',
        })
        expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'server/info', { root: true })
    })

    it('getGcodeStore filters events by date when cleared_since is set', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        const now = Date.now()
        actions.getGcodeStore(
            { commit, dispatch, rootGetters: { 'gui/console/getConsolefilterRules': [], 'gui/console/getConsoleClearedSince': now } } as any,
            {
                gcode_store: [
                    { time: Math.floor(now / 1000) + 100, type: 'response', message: 'future event' },
                    { type: 'response', message: 'old date event', date: new Date(now - 100000).toISOString() },
                ],
            }
        )
        expect(commit).toHaveBeenCalledWith('setGcodeStore', expect.arrayContaining([
            expect.objectContaining({ message: 'future event' }),
        ]))
    })

    it('init handles non-Error exception', async () => {
        mockSocket.emitAndWait.mockRejectedValue('string error')
        const commit = vi.fn()
        const dispatch = vi.fn()
        const rootState = { packageVersion: 'v2.14.0' }
        const store = { dispatch }
        const consoleSpy = vi.spyOn(window.console, 'error').mockImplementation(() => {})

        await actions.init.bind(store)({ commit, dispatch, rootState } as any)

        expect(consoleSpy).toHaveBeenCalledWith('Error while identifying client: string error')
        expect(dispatch).not.toHaveBeenCalledWith('socket/setConnectionFailed', expect.anything())
        consoleSpy.mockRestore()
    })
})
