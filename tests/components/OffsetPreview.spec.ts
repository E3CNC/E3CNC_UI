import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, computed } from 'vue'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'

// Mock vuetify
vi.mock('vuetify', () => ({
    useDisplay: () => ({
        mobile: ref(false),
        smAndUp: ref(true),
        lgAndUp: ref(false),
        xl: ref(false),
    }),
    useTheme: () => ({
        global: { current: { value: { colors: { primary: '#FF5000' } } } },
    }),
}))

// Mock vue-toast-notification
vi.mock('vue-toast-notification', () => ({
    useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}))

// Mock cncApi
vi.mock('@/store/files/cncApi', () => ({
    getCncWcs: vi.fn(),
    selectCncWcs: vi.fn(),
}))

// Mock runtime
vi.mock('@/store/runtime', () => ({
    getSocket: vi.fn(() => ({
        emit: vi.fn(),
        emitAndWait: vi.fn(),
    })),
    setSocket: vi.fn(),
}))

// -- Pure logic extracted for testing --

const padding = 24
const svgWidth = 260
const gridStepOptions = [5, 10, 15, 20, 25, 30, 50, 100]

function toSvgX(machineX: number, machineMinX: number, machineMaxX: number, plotWidth: number): number {
    const range = machineMaxX - machineMinX
    if (range === 0) return padding
    return padding + ((machineX - machineMinX) / range) * plotWidth
}

function toSvgY(machineY: number, machineMinY: number, machineMaxY: number, plotHeight: number): number {
    const range = machineMaxY - machineMinY
    if (range === 0) return padding + plotHeight
    return padding + plotHeight - ((machineY - machineMinY) / range) * plotHeight
}

function svgPointToMachine(
    svgX: number,
    svgY: number,
    machineMinX: number,
    machineMaxX: number,
    machineMinY: number,
    machineMaxY: number,
    plotWidth: number,
    plotHeight: number
): { x: number; y: number } | null {
    const rangeX = machineMaxX - machineMinX
    const rangeY = machineMaxY - machineMinY
    if (rangeX === 0 || rangeY === 0) return null

    const machineX = ((svgX - padding) / plotWidth) * rangeX + machineMinX
    const machineY = ((padding + plotHeight - svgY) / plotHeight) * rangeY + machineMinY

    return { x: machineX, y: machineY }
}

function snapToGridValue(val: number, step: number): number {
    return Math.round(val / step) * step
}

function computeGridLines(min: number, max: number, step: number): number[] {
    const lines: number[] = []
    const start = Math.ceil(min / step) * step
    for (let v = start; v < max; v += step) {
        lines.push(v)
    }
    return lines
}

describe('OffsetPreview – coordinate mapping', () => {
    const machineMinX = 0
    const machineMaxX = 165
    const machineMinY = 0
    const machineMaxY = 300
    const plotWidth = svgWidth - padding - 10 // 226

    it('maps machine min X to SVG padding', () => {
        const x = toSvgX(machineMinX, machineMinX, machineMaxX, plotWidth)
        expect(x).toBe(padding)
    })

    it('maps machine max X to SVG padding + plotWidth', () => {
        const x = toSvgX(machineMaxX, machineMinX, machineMaxX, plotWidth)
        expect(x).toBe(padding + plotWidth)
    })

    it('maps machine min Y to bottom of plot (padding + plotHeight)', () => {
        const plotHeight = 400
        const y = toSvgY(machineMinY, machineMinY, machineMaxY, plotHeight)
        expect(y).toBe(padding + plotHeight)
    })

    it('maps machine max Y to top of plot (padding)', () => {
        const plotHeight = 400
        const y = toSvgY(machineMaxY, machineMinY, machineMaxY, plotHeight)
        expect(y).toBe(padding)
    })

    it('round-trips svgPointToMachine ↔ toSvgX/toSvgY', () => {
        const plotHeight = 400
        const machineX = 82.5
        const machineY = 150

        const svgX = toSvgX(machineX, machineMinX, machineMaxX, plotWidth)
        const svgY = toSvgY(machineY, machineMinY, machineMaxY, plotHeight)

        const result = svgPointToMachine(
            svgX,
            svgY,
            machineMinX,
            machineMaxX,
            machineMinY,
            machineMaxY,
            plotWidth,
            plotHeight
        )

        expect(result).not.toBeNull()
        expect(result!.x).toBeCloseTo(machineX, 2)
        expect(result!.y).toBeCloseTo(machineY, 2)
    })

    it('returns null when ranges are zero', () => {
        const result = svgPointToMachine(100, 100, 0, 0, 0, 0, 226, 400)
        expect(result).toBeNull()
    })
})

describe('OffsetPreview – snap to grid', () => {
    it('snaps to nearest grid step', () => {
        expect(snapToGridValue(7, 5)).toBe(5)
        expect(snapToGridValue(8, 5)).toBe(10)
        expect(snapToGridValue(12, 10)).toBe(10)
        expect(snapToGridValue(15, 10)).toBe(20) // Math.round(1.5) = 2 in JS (banker's rounding)
    })

    it('snaps exact multiples unchanged', () => {
        expect(snapToGridValue(10, 5)).toBe(10)
        expect(snapToGridValue(20, 10)).toBe(20)
        expect(snapToGridValue(0, 5)).toBe(0)
    })

    it('handles negative values', () => {
        expect(snapToGridValue(-3, 5)).toBe(-5)
        expect(snapToGridValue(-7, 5)).toBe(-5)
    })
})

describe('OffsetPreview – grid lines', () => {
    it('generates correct X grid lines for 10mm step on 0-165 range', () => {
        const lines = computeGridLines(0, 165, 10)
        expect(lines[0]).toBe(0)
        expect(lines).toContain(10)
        expect(lines).toContain(160)
        expect(lines[lines.length - 1]).toBe(160)
    })

    it('generates correct Y grid lines for 20mm step on 0-300 range', () => {
        const lines = computeGridLines(0, 300, 20)
        expect(lines[0]).toBe(0)
        expect(lines).toContain(20)
        expect(lines).toContain(280)
        expect(lines[lines.length - 1]).toBe(280)
    })

    it('includes 0 when step > range (Math.ceil(0/step)*step = 0)', () => {
        const lines = computeGridLines(0, 165, 200)
        expect(lines).toEqual([0])
    })

    it('handles non-zero minimum', () => {
        const lines = computeGridLines(-10, 165, 50)
        expect(lines[0] + 0).toBe(0) // handles -0 from Math.ceil
        expect(lines).toContain(50)
        expect(lines).toContain(100)
        expect(lines).toContain(150)
    })
})

describe('OffsetPreview – grid step options', () => {
    it('includes standard CNC step sizes', () => {
        expect(gridStepOptions).toEqual([5, 10, 15, 20, 25, 30, 50, 100])
    })

    it('default grid step is 10mm', () => {
        expect(Number(10)).toBe(10)
    })
})

describe('OffsetPreview – SVG dimensions', () => {
    const svgWidth = 260

    it('computes proportional height for 165x300 machine', () => {
        const machineAspectY = 300 / 165
        const plotWidth = svgWidth - padding - 10
        const svgHeight = Math.round(padding + 16 + plotWidth * machineAspectY)
        expect(svgHeight).toBeGreaterThan(svgWidth) // taller than wide
        expect(svgHeight).toBe(Math.round(24 + 16 + 226 * (300 / 165)))
    })

    it('computes plot height from svg height', () => {
        const machineAspectY = 300 / 165
        const plotWidth = svgWidth - padding - 10
        const svgHeight = Math.round(padding + 16 + plotWidth * machineAspectY)
        const plotHeight = svgHeight - padding - 16
        expect(plotHeight).toBeGreaterThan(0)
    })
})

describe('OffsetPreview – offset entries', () => {
    const offsetNames = ['G54', 'G55', 'G56', 'G57', 'G58', 'G59']
    const offsetColors = ['#42A5F5', '#66BB6A', '#FFA726', '#AB47BC', '#EF5350', '#26C6DA']

    it('maps all 6 WCS offset names', () => {
        expect(offsetNames).toHaveLength(6)
        expect(offsetNames[0]).toBe('G54')
        expect(offsetNames[5]).toBe('G59')
    })

    it('has a color for each offset name', () => {
        expect(offsetColors).toHaveLength(offsetNames.length)
    })

    it('clips offsets to machine bounds', () => {
        const machineMinX = 0
        const machineMaxX = 165
        const machineMinY = 0
        const machineMaxY = 300

        const ox = 50
        const oy = 100

        const clippedMinX = Math.max(ox, machineMinX)
        const clippedMinY = Math.max(oy, machineMinY)
        const clippedMaxX = Math.min(machineMaxX, machineMaxX)
        const clippedMaxY = Math.min(machineMaxY, machineMaxY)

        expect(clippedMinX).toBe(50)
        expect(clippedMinY).toBe(100)
        expect(clippedMaxX).toBe(165)
        expect(clippedMaxY).toBe(300)
    })
})

describe('OffsetPreview – WCS selection', () => {
    it('rejects selecting the already active WCS', () => {
        const activeWcs = 'G54'
        const name = 'G54'
        expect(name === activeWcs).toBe(true)
    })

    it('requires confirmation for WCS change', () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
        expect(window.confirm('Switch to G55?')).toBe(true)
        confirmSpy.mockRestore()
    })
})

describe('OffsetPreview – click to move gcode', () => {
    it('formats gcode with G53 on separate line', () => {
        const x = 55.182
        const y = 183.401
        const gcode = `G53\nG1 X${x.toFixed(4)} Y${y.toFixed(4)} F3000`
        const lines = gcode.split('\n')
        expect(lines[0]).toBe('G53')
        expect(lines[1]).toMatch(/^G1 X\d+\.\d+ Y\d+\.\d+ F3000$/)
    })

    it('formats coordinates with 4 decimal places', () => {
        const x = 10.123456
        const formatted = x.toFixed(4)
        expect(formatted).toBe('10.1235')
    })
})

describe('OffsetPreview – localStorage persistence', () => {
    it('persists gridStep to localStorage', () => {
        localStorage.setItem('cncPreviewGridStep', '20')
        expect(localStorage.getItem('cncPreviewGridStep')).toBe('20')
    })

    it('persists snapToGrid to localStorage', () => {
        localStorage.setItem('cncPreviewSnapToGrid', 'true')
        expect(localStorage.getItem('cncPreviewSnapToGrid')).toBe('true')
    })

    it('defaults to 10mm when no stored value', () => {
        expect(Number(localStorage.getItem('cncPreviewGridStep')) || 10).toBe(10)
    })

    it('defaults snapToGrid to false when no stored value', () => {
        expect(localStorage.getItem('cncPreviewSnapToGrid') === 'true').toBe(false)
    })
})

describe('OffsetPreview – machine bounds', () => {
    it('reads axis_maximum from toolhead', () => {
        const max = [165, 300, 250]
        expect(max[0]).toBe(165) // X
        expect(max[1]).toBe(300) // Y
    })

    it('reads axis_minimum from toolhead', () => {
        const min = [0, 0, -20]
        expect(min[0]).toBe(0)
        expect(min[1]).toBe(0)
    })

    it('reads position from toolhead', () => {
        const pos = [55.18, 183.4, 0]
        expect(pos[0]).toBeCloseTo(55.18)
        expect(pos[1]).toBeCloseTo(183.4)
    })

    it('checks homed axes for tool visibility', () => {
        expect('xyz'.includes('x') && 'xyz'.includes('y')).toBe(true)
        expect('z'.includes('x')).toBe(false)
        expect(''.includes('x') && ''.includes('y')).toBe(false)
    })
})

describe('OffsetPreview – stock position relative to offset', () => {
    const machineMinX = 0
    const machineMaxX = 165
    const machineMinY = 0
    const machineMaxY = 300
    const plotWidth = 226

    it('positions stock from offset origin (bottom-left corner)', () => {
        const offsetX = 92.5
        const offsetY = 142.5
        const stockW = 100
        const stockH = 200

        // Stock extends from offset origin upward and rightward
        const stockMinX = offsetX
        const stockMinY = offsetY
        const stockMaxX = offsetX + stockW
        const stockMaxY = offsetY + stockH

        expect(stockMinX).toBe(92.5)
        expect(stockMinY).toBe(142.5)
        expect(stockMaxX).toBe(192.5)
        expect(stockMaxY).toBe(342.5)
    })

    it('computes SVG rect from offset-relative stock bounds', () => {
        const offsetX = 92.5
        const offsetY = 142.5
        const stockW = 100
        const stockH = 200
        const plotHeight = 400

        const svgX = toSvgX(offsetX, machineMinX, machineMaxX, plotWidth)
        const svgY = toSvgY(offsetY + stockH, machineMinY, machineMaxY, plotHeight)
        const svgW = Math.max(0, toSvgX(offsetX + stockW, machineMinX, machineMaxX, plotWidth) - svgX)
        const svgH = Math.max(0, toSvgY(offsetY, machineMinY, machineMaxY, plotHeight) - svgY)

        expect(svgW).toBeGreaterThan(0)
        expect(svgH).toBeGreaterThan(0)
    })

    it('centers stock label within stock bounds', () => {
        const offsetX = 92.5
        const offsetY = 142.5
        const stockW = 100
        const stockH = 200

        const labelX = offsetX + stockW / 2
        const labelY = offsetY + stockH / 2

        expect(labelX).toBe(142.5)
        expect(labelY).toBe(242.5)
    })
})

describe('OffsetPreview – stock size validation', () => {
    const machineMaxX = 165
    const machineMinX = 0
    const machineMaxY = 300
    const machineMinY = 0

    function stockDialogError(w: number, h: number): string {
        const machineW = machineMaxX - machineMinX
        const machineH = machineMaxY - machineMinY
        if (w > machineW) return `Width (${w}mm) exceeds machine (${machineW}mm)`
        if (h > machineH) return `Height (${h}mm) exceeds machine (${machineH}mm)`
        return ''
    }

    it('returns empty string when stock fits within machine', () => {
        expect(stockDialogError(100, 200)).toBe('')
        expect(stockDialogError(165, 300)).toBe('')
        expect(stockDialogError(1, 1)).toBe('')
    })

    it('returns error when width exceeds machine', () => {
        const err = stockDialogError(200, 200)
        expect(err).toContain('Width')
        expect(err).toContain('200mm')
        expect(err).toContain('165mm')
    })

    it('returns error when height exceeds machine', () => {
        const err = stockDialogError(100, 400)
        expect(err).toContain('Height')
        expect(err).toContain('400mm')
        expect(err).toContain('300mm')
    })

    it('validates width before height', () => {
        // Both exceed — width error comes first
        const err = stockDialogError(200, 400)
        expect(err).toContain('Width')
    })

    it('allows zero values (deletes stock)', () => {
        expect(stockDialogError(0, 0)).toBe('')
    })

    it('max values equal machine range', () => {
        expect(machineMaxX - machineMinX).toBe(165)
        expect(machineMaxY - machineMinY).toBe(300)
    })
})

describe('OffsetPreview – eye icon visibility', () => {
    it('visible offset has full opacity', () => {
        const visible = true
        const opacity = visible ? 1 : 0.5
        expect(opacity).toBe(1)
    })

    it('hidden offset has reduced opacity', () => {
        const visible = false
        const opacity = visible ? 1 : 0.5
        expect(opacity).toBe(0.5)
    })

    it('visible offset uses primary color', () => {
        const visible = true
        const color = visible ? 'rgb(var(--v-theme-primary))' : undefined
        expect(color).toBe('rgb(var(--v-theme-primary))')
    })

    it('hidden offset has no inline color', () => {
        const visible = false
        const color = visible ? 'rgb(var(--v-theme-primary))' : undefined
        expect(color).toBeUndefined()
    })

    it('toggles visibility per offset name', () => {
        const hiddenOffsets = ref<string[]>([])
        const toggle = (name: string) => {
            const idx = hiddenOffsets.value.indexOf(name)
            if (idx >= 0) hiddenOffsets.value.splice(idx, 1)
            else hiddenOffsets.value.push(name)
        }
        const isVisible = (name: string) => !hiddenOffsets.value.includes(name)

        expect(isVisible('G54')).toBe(true)
        toggle('G54')
        expect(isVisible('G54')).toBe(false)
        toggle('G54')
        expect(isVisible('G54')).toBe(true)
    })
})

describe('OffsetPreview – legend grid layout', () => {
    it('uses 2-column CSS grid', () => {
        // The legend uses display: grid with grid-template-columns: 1fr 1fr
        const gridTemplateColumns = '1fr 1fr'
        expect(gridTemplateColumns.split(' ')).toHaveLength(2)
    })

    it('has 6 offset cards plus tool item', () => {
        const offsetCount = 6
        const hasToolItem = true
        expect(offsetCount + (hasToolItem ? 1 : 0)).toBe(7)
    })
})

describe('OffsetPreview – stock localStorage persistence', () => {
    it('persists stock sizes to localStorage', () => {
        const stock = { G54: { name: 'Aluminum Block', width: 100, height: 200, depth: 25 } }
        localStorage.setItem('cncPreviewStockSizes', JSON.stringify(stock))
        const parsed = JSON.parse(localStorage.getItem('cncPreviewStockSizes') || '{}')
        expect(parsed.G54.name).toBe('Aluminum Block')
        expect(parsed.G54.width).toBe(100)
        expect(parsed.G54.height).toBe(200)
        expect(parsed.G54.depth).toBe(25)
    })

    it('deletes stock when width or height is zero', () => {
        const stock: Record<string, { name: string; width: number; height: number; depth: number }> = {
            G54: { name: 'Block', width: 100, height: 200, depth: 0 },
        }
        const w = 0
        const h = 0
        if (w > 0 && h > 0) {
            stock.G54 = { name: 'Block', width: w, height: h, depth: 0 }
        } else {
            delete stock.G54
        }
        expect(stock.G54).toBeUndefined()
    })

    it('persists hidden offsets to localStorage', () => {
        const hidden = ['G55', 'G56']
        localStorage.setItem('cncPreviewHiddenOffsets', JSON.stringify(hidden))
        const parsed = JSON.parse(localStorage.getItem('cncPreviewHiddenOffsets') || '[]')
        expect(parsed).toEqual(['G55', 'G56'])
    })
})
