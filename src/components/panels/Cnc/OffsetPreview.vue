<template>
    <panel
        v-if="klipperReadyForGui && showWorkCoords"
        :icon="mdiGrid"
        title="Offset Preview"
        :collapsible="true"
        card-class="offset-preview-panel">
        <template #buttons>
            <v-btn
                variant="text"
                size="small"
                :color="snapToGrid ? 'primary' : undefined"
                @click="snapToGrid = !snapToGrid">
                <v-icon>{{ mdiMagnet }}</v-icon>
            </v-btn>
            <v-menu offset-y>
                <template #activator="{ props }">
                    <v-btn variant="text" size="small" v-bind="props">
                        {{ gridStep }}mm
                        <v-icon end>{{ mdiChevronDown }}</v-icon>
                    </v-btn>
                </template>
                <v-list dense>
                    <v-list-item
                        v-for="step in gridStepOptions"
                        :key="step"
                        :active="step === gridStep"
                        @click="gridStep = step">
                        <v-list-item-title>{{ step }}mm</v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-menu>
        </template>
        <div class="offset-preview-container">
            <svg
                ref="svgEl"
                :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
                class="offset-preview-svg"
                preserveAspectRatio="xMidYMid meet"
                xmlns="http://www.w3.org/2000/svg"
                @mousemove="onSvgMouseMove"
                @mouseleave="onSvgMouseLeave"
                @click="onSvgClick">
                <!-- Machine bounds background -->
                <rect
                    :x="padding"
                    :y="padding"
                    :width="plotWidth"
                    :height="plotHeight"
                    fill="rgb(30, 30, 30)"
                    stroke="rgba(255,255,255,0.2)"
                    stroke-width="1" />

                <!-- Grid lines -->
                <line
                    v-for="gx in gridLinesX"
                    :key="'gx-' + gx"
                    :x1="toSvgX(gx)"
                    :y1="padding"
                    :x2="toSvgX(gx)"
                    :y2="padding + plotHeight"
                    stroke="rgba(255,255,255,0.06)"
                    stroke-width="0.5" />
                <line
                    v-for="gy in gridLinesY"
                    :key="'gy-' + gy"
                    :x1="padding"
                    :y1="toSvgY(gy)"
                    :x2="padding + plotWidth"
                    :y2="toSvgY(gy)"
                    stroke="rgba(255,255,255,0.06)"
                    stroke-width="0.5" />

                <!-- Offset work area rectangles (back to front, inactive first) -->
                <g
                    v-for="(entry, idx) in sortedOffsets"
                    :key="'wcs-' + entry.name"
                    v-show="isOffsetVisible(entry.name)"
                    class="offset-rect-group"
                    :class="{ 'offset-rect--active': entry.name === activeWcs }"
                    @click="onSelectWcs(entry.name)"
                    style="cursor: pointer">
                    <rect
                        :x="toSvgX(entry.clippedMinX)"
                        :y="toSvgY(entry.clippedMaxY)"
                        :width="Math.max(0, toSvgX(entry.clippedMaxX) - toSvgX(entry.clippedMinX))"
                        :height="Math.max(0, toSvgY(entry.clippedMinY) - toSvgY(entry.clippedMaxY))"
                        :fill="entry.color"
                        :stroke="entry.color"
                        :stroke-width="entry.name === activeWcs ? 2 : 1"
                        :stroke-dasharray="entry.name === activeWcs ? 'none' : '4 2'"
                        :opacity="entry.name === activeWcs ? 0.3 : 0.15" />
                    <!-- Origin crosshair for all offsets -->
                    <line
                        :x1="toSvgX(entry.offsetX) - 5"
                        :y1="toSvgY(entry.offsetY)"
                        :x2="toSvgX(entry.offsetX) + 5"
                        :y2="toSvgY(entry.offsetY)"
                        :stroke="entry.color"
                        :stroke-width="entry.name === activeWcs ? 1.5 : 1"
                        :opacity="entry.name === activeWcs ? 1 : 0.6" />
                    <line
                        :x1="toSvgX(entry.offsetX)"
                        :y1="toSvgY(entry.offsetY) - 5"
                        :x2="toSvgX(entry.offsetX)"
                        :y2="toSvgY(entry.offsetY) + 5"
                        :stroke="entry.color"
                        :stroke-width="entry.name === activeWcs ? 1.5 : 1"
                        :opacity="entry.name === activeWcs ? 1 : 0.6" />
                    <!-- Label at offset origin -->
                    <text
                        :x="toSvgX(entry.offsetX) + 7"
                        :y="toSvgY(entry.offsetY) - 6"
                        :fill="entry.color"
                        font-size="8"
                        font-family="monospace"
                        :font-weight="entry.name === activeWcs ? 'bold' : 'normal'"
                        :opacity="entry.name === activeWcs ? 1 : 0.7"
                        style="cursor: pointer"
                        @click.stop="openStockDialog(entry.name)">
                        {{ entry.name }}
                    </text>
                </g>

                <!-- Stock size rectangles (origin at bottom-left of stock) -->
                <g
                    v-for="entry in allOffsetEntries"
                    :key="'stock-' + entry.name"
                    v-show="isOffsetVisible(entry.name)"
                    style="pointer-events: none">
                    <rect
                        v-if="stockSizes[entry.name]"
                        :x="toSvgX(entry.offsetX)"
                        :y="toSvgY(entry.offsetY + stockSizes[entry.name].height)"
                        :width="Math.max(0, toSvgX(entry.offsetX + stockSizes[entry.name].width) - toSvgX(entry.offsetX))"
                        :height="Math.max(0, toSvgY(entry.offsetY) - toSvgY(entry.offsetY + stockSizes[entry.name].height))"
                        :fill="entry.color"
                        :stroke="entry.color"
                        stroke-width="1.5"
                        fill-opacity="0.08"
                        stroke-opacity="0.6" />
                    <text
                        v-if="stockSizes[entry.name]"
                        :x="toSvgX(entry.offsetX + stockSizes[entry.name].width / 2)"
                        :y="toSvgY(entry.offsetY + stockSizes[entry.name].height / 2) + 3"
                        text-anchor="middle"
                        :fill="entry.color"
                        font-size="7"
                        font-family="monospace"
                        opacity="0.7">
                        {{ stockSizes[entry.name].name || entry.name }}
                    </text>
                </g>

                <!-- Snap crosshair indicator -->
                <template v-if="snapToGrid && snapInfo">
                    <line
                        :x1="toSvgX(snapInfo.x) - 8"
                        :y1="toSvgY(snapInfo.y)"
                        :x2="toSvgX(snapInfo.x) + 8"
                        :y2="toSvgY(snapInfo.y)"
                        stroke="rgba(255,255,255,0.7)"
                        stroke-width="1"
                        stroke-dasharray="3 2" />
                    <line
                        :x1="toSvgX(snapInfo.x)"
                        :y1="toSvgY(snapInfo.y) - 8"
                        :x2="toSvgX(snapInfo.x)"
                        :y2="toSvgY(snapInfo.y) + 8"
                        stroke="rgba(255,255,255,0.7)"
                        stroke-width="1"
                        stroke-dasharray="3 2" />
                    <circle
                        :cx="toSvgX(snapInfo.x)"
                        :cy="toSvgY(snapInfo.y)"
                        r="3"
                        fill="none"
                        stroke="rgba(255,255,255,0.5)"
                        stroke-width="1" />
                </template>

                <!-- Tool position dot -->
                <circle
                    v-if="toolVisible"
                    :cx="toSvgX(toolX)"
                    :cy="toSvgY(toolY)"
                    r="4"
                    fill="#FF5252"
                    stroke="white"
                    stroke-width="1.5" />

                <!-- Axis labels -->
                <text
                    :x="padding + plotWidth / 2"
                    :y="svgHeight - 2"
                    text-anchor="middle"
                    fill="rgba(255,255,255,0.5)"
                    font-size="9"
                    font-family="monospace">X ({{ machineMaxX.toFixed(0) }}mm)</text>
                <text
                    :x="padding - 8"
                    :y="padding + plotHeight / 2"
                    text-anchor="middle"
                    fill="rgba(255,255,255,0.5)"
                    font-size="9"
                    font-family="monospace"
                    :transform="`rotate(-90, ${padding - 8}, ${padding + plotHeight / 2})`">Y ({{ machineMaxY.toFixed(0) }}mm)</text>
            </svg>

            <!-- Legend -->
            <div class="offset-preview-legend">
                <div
                    v-for="entry in visibleOffsets"
                    :key="'legend-' + entry.name"
                    class="offset-preview-legend__card"
                    :class="{ 'offset-preview-legend__card--active': entry.name === activeWcs }"
                    :style="{ borderColor: entry.color }"
                    @click="onSelectWcs(entry.name)"
                    style="cursor: pointer">
                    <div class="offset-preview-legend__card-header">
                        <span
                            class="offset-preview-legend__swatch"
                            :style="{ backgroundColor: entry.color }" />
                        <span class="offset-preview-legend__card-title">{{ entry.name }}</span>
                        <span class="offset-preview-legend__card-origin">
                            ({{ entry.offsetX.toFixed(1) }}, {{ entry.offsetY.toFixed(1) }})
                        </span>
                        <v-icon
                            size="x-small"
                            class="offset-preview-legend__card-eye"
                            :style="{ color: isOffsetVisible(entry.name) ? 'rgb(var(--v-theme-primary))' : undefined, opacity: isOffsetVisible(entry.name) ? 1 : 0.5 }"
                            @click.stop="toggleOffsetVisibility(entry.name)">
                            {{ isOffsetVisible(entry.name) ? mdiEye : mdiEyeOff }}
                        </v-icon>
                    </div>
                    <div
                        v-if="stockSizes[entry.name]"
                        class="offset-preview-legend__card-stock"
                        @click.stop="openStockDialog(entry.name)"
                        style="cursor: pointer">
                        <div class="offset-preview-legend__card-stock-name">
                            {{ stockSizes[entry.name].name || entry.name }}
                        </div>
                        <div class="offset-preview-legend__card-stock-dims">
                            <span>{{ stockSizes[entry.name].width }}W</span>
                            <span class="offset-preview-legend__card-sep">&times;</span>
                            <span>{{ stockSizes[entry.name].height }}H</span>
                            <template v-if="stockSizes[entry.name].depth">
                                <span class="offset-preview-legend__card-sep">&times;</span>
                                <span>{{ stockSizes[entry.name].depth }}D</span>
                            </template>
                        </div>
                    </div>
                </div>
                <div class="offset-preview-legend__item offset-preview-legend__item--tool">
                    <span class="offset-preview-legend__swatch offset-preview-legend__swatch--tool" />
                    <span class="offset-preview-legend__label">Tool</span>
                    <span class="offset-preview-legend__coords">
                        ({{ toolX.toFixed(1) }}, {{ toolY.toFixed(1) }})
                    </span>
                </div>
            </div>

            <!-- Cursor coordinate tooltip (teleported to body to avoid clipping) -->
            <Teleport to="body">
                <div
                    v-if="cursorInfo"
                    class="offset-preview-tooltip"
                    :style="{ left: tooltipLeft + 'px', top: tooltipTop + 'px' }">
                    X {{ cursorInfo.x.toFixed(1) }} &nbsp; Y {{ cursorInfo.y.toFixed(1) }}
                </div>
            </Teleport>
        </div>

        <!-- Stock size dialog -->
        <v-dialog v-model="stockDialogOpen" max-width="320">
            <v-card>
                <v-card-title class="text-subtitle-1">
                    Stock — {{ stockDialogWcs }}
                </v-card-title>
                <v-card-text>
                    <v-row dense>
                        <v-col cols="12">
                            <v-text-field
                                v-model="stockDialogName"
                                label="Name"
                                density="compact"
                                variant="outlined"
                                :placeholder="stockDialogWcs" />
                        </v-col>
                    </v-row>
                    <v-row dense>
                        <v-col cols="4">
                            <v-text-field
                                v-model.number="stockDialogWidth"
                                label="Width (mm)"
                                type="number"
                                density="compact"
                                variant="outlined"
                                :min="0"
                                :max="machineMaxX - machineMinX"
                                :error="stockDialogWidth > machineMaxX - machineMinX"
                                :hint="stockDialogWidth > machineMaxX - machineMinX ? `Max: ${machineMaxX - machineMinX}mm` : undefined"
                                persistent-hint />
                        </v-col>
                        <v-col cols="4">
                            <v-text-field
                                v-model.number="stockDialogHeight"
                                label="Height (mm)"
                                type="number"
                                density="compact"
                                variant="outlined"
                                :min="0"
                                :max="machineMaxY - machineMinY"
                                :error="stockDialogHeight > machineMaxY - machineMinY"
                                :hint="stockDialogHeight > machineMaxY - machineMinY ? `Max: ${machineMaxY - machineMinY}mm` : undefined"
                                persistent-hint />
                        </v-col>
                        <v-col cols="4">
                            <v-text-field
                                v-model.number="stockDialogDepth"
                                label="Depth (mm)"
                                type="number"
                                density="compact"
                                variant="outlined"
                                :min="0" />
                        </v-col>
                    </v-row>
                    <v-alert
                        v-if="stockDialogError"
                        type="error"
                        density="compact"
                        class="mt-2"
                        variant="tonal">
                        {{ stockDialogError }}
                    </v-alert>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" size="small" @click="stockDialogOpen = false">Cancel</v-btn>
                    <v-btn variant="text" size="small" color="primary" :disabled="!!stockDialogError" @click="saveStockDialog">Save</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </panel>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { useBase } from '@/composables/useBase'
import { useCncProfile } from '@/composables/useCncProfile'
import { useToast } from 'vue-toast-notification'
import Panel from '@/components/ui/Panel.vue'
import { mdiGrid, mdiChevronDown, mdiMagnet, mdiEye, mdiEyeOff } from '@mdi/js'
import { getCncWcs, selectCncWcs } from '@/store/files/cncApi'
import { getSocket } from '@/store/runtime'

const toast = useToast()
const { klipperReadyForGui } = useBase()
const { showWorkCoords } = useCncProfile()
const store = useStore()

const padding = 24
const svgWidth = 260
const machineAspectY = computed(() => {
    const rangeX = machineMaxX.value - machineMinX.value
    const rangeY = machineMaxY.value - machineMinY.value
    return rangeX > 0 ? rangeY / rangeX : 1
})
const plotWidth = svgWidth - padding - 10
const svgHeight = computed(() => Math.round(padding + 16 + plotWidth * machineAspectY.value))
const plotHeight = computed(() => svgHeight.value - padding - 16)
const gridStepOptions = [5, 10, 15, 20, 25, 30, 50, 100]
const gridStep = ref(Number(localStorage.getItem('cncPreviewGridStep')) || 10)
const snapToGrid = ref(localStorage.getItem('cncPreviewSnapToGrid') === 'true')
const hiddenOffsets = ref<Set<string>>(loadHiddenOffsets())
watch(gridStep, (v) => localStorage.setItem('cncPreviewGridStep', String(v)))
watch(snapToGrid, (v) => localStorage.setItem('cncPreviewSnapToGrid', String(v)))
watch(hiddenOffsets, (v) => {
    localStorage.setItem('cncPreviewHiddenOffsets', JSON.stringify([...v]))
}, { deep: true })

function loadHiddenOffsets(): Set<string> {
    try {
        const raw = localStorage.getItem('cncPreviewHiddenOffsets')
        if (raw) return new Set(JSON.parse(raw))
    } catch { /* ignore */ }
    return new Set()
}

function isOffsetVisible(name: string): boolean {
    return !hiddenOffsets.value.has(name)
}

function toggleOffsetVisibility(name: string) {
    const next = new Set(hiddenOffsets.value)
    if (next.has(name)) {
        next.delete(name)
    } else {
        next.add(name)
    }
    hiddenOffsets.value = next
}

interface StockSize {
    name: string
    width: number
    height: number
    depth: number
}

const stockSizes = ref<Record<string, StockSize>>({})
const stockDialogOpen = ref(false)
const stockDialogWcs = ref('')
const stockDialogName = ref('')
const stockDialogWidth = ref(0)
const stockDialogHeight = ref(0)
const stockDialogDepth = ref(0)

function loadStockSizes() {
    try {
        const raw = localStorage.getItem('cncPreviewStockSizes')
        if (raw) stockSizes.value = JSON.parse(raw)
    } catch { /* ignore */ }
}

function saveStockSizes() {
    localStorage.setItem('cncPreviewStockSizes', JSON.stringify(stockSizes.value))
}

function openStockDialog(wcsName: string) {
    stockDialogWcs.value = wcsName
    const existing = stockSizes.value[wcsName]
    stockDialogName.value = existing?.name ?? wcsName
    stockDialogWidth.value = existing?.width ?? 0
    stockDialogHeight.value = existing?.height ?? 0
    stockDialogDepth.value = existing?.depth ?? 0
    stockDialogOpen.value = true
}

function saveStockDialog() {
    if (stockDialogError.value) return
    const name = stockDialogName.value.trim() || stockDialogWcs.value
    const w = stockDialogWidth.value
    const h = stockDialogHeight.value
    const d = stockDialogDepth.value
    if (w > 0 && h > 0) {
        stockSizes.value[stockDialogWcs.value] = { name, width: w, height: h, depth: d }
    } else {
        delete stockSizes.value[stockDialogWcs.value]
    }
    saveStockSizes()
    stockDialogOpen.value = false
}

const stockDialogError = computed(() => {
    const w = stockDialogWidth.value
    const h = stockDialogHeight.value
    const machineW = machineMaxX.value - machineMinX.value
    const machineH = machineMaxY.value - machineMinY.value
    if (w > machineW) return `Width (${w}mm) exceeds machine (${machineW}mm)`
    if (h > machineH) return `Height (${h}mm) exceeds machine (${machineH}mm)`
    return ''
})

const offsetNames = ['G54', 'G55', 'G56', 'G57', 'G58', 'G59']
const offsetColors = ['#42A5F5', '#66BB6A', '#FFA726', '#AB47BC', '#EF5350', '#26C6DA']

const wcsOffsets = ref<Record<string, { X: number; Y: number }>>({})
const activeWcs = ref('G54')

const machineMinX = computed(() => {
    const min = store.state.printer?.toolhead?.axis_minimum
    return Array.isArray(min) ? min[0] ?? 0 : 0
})
const machineMinY = computed(() => {
    const min = store.state.printer?.toolhead?.axis_minimum
    return Array.isArray(min) ? min[1] ?? 0 : 0
})
const machineMaxX = computed(() => {
    const max = store.state.printer?.toolhead?.axis_maximum
    return Array.isArray(max) ? max[0] ?? 165 : 165
})
const machineMaxY = computed(() => {
    const max = store.state.printer?.toolhead?.axis_maximum
    return Array.isArray(max) ? max[1] ?? 300 : 300
})

const toolX = computed(() => {
    const pos = store.state.printer?.toolhead?.position
    return Array.isArray(pos) ? pos[0] ?? 0 : 0
})
const toolY = computed(() => {
    const pos = store.state.printer?.toolhead?.position
    return Array.isArray(pos) ? pos[1] ?? 0 : 0
})
const toolVisible = computed(() => {
    const homed = store.state.printer?.toolhead?.homed_axes ?? ''
    return homed.includes('x') && homed.includes('y')
})

const gridLinesX = computed(() => {
    const lines: number[] = []
    const step = gridStep.value
    const start = Math.ceil(machineMinX.value / step) * step
    for (let x = start; x < machineMaxX.value; x += step) {
        lines.push(x)
    }
    return lines
})

const gridLinesY = computed(() => {
    const lines: number[] = []
    const step = gridStep.value
    const start = Math.ceil(machineMinY.value / step) * step
    for (let y = start; y < machineMaxY.value; y += step) {
        lines.push(y)
    }
    return lines
})

interface OffsetEntry {
    name: string
    color: string
    offsetX: number
    offsetY: number
    clippedMinX: number
    clippedMinY: number
    clippedMaxX: number
    clippedMaxY: number
}

const allOffsetEntries = computed<OffsetEntry[]>(() => {
    return offsetNames.map((name, idx) => {
        const off = wcsOffsets.value[name] ?? { X: 0, Y: 0 }
        const ox = off.X ?? 0
        const oy = off.Y ?? 0
        return {
            name,
            color: offsetColors[idx],
            offsetX: ox,
            offsetY: oy,
            clippedMinX: Math.max(ox, machineMinX.value),
            clippedMinY: Math.max(oy, machineMinY.value),
            clippedMaxX: Math.min(machineMaxX.value, machineMaxX.value),
            clippedMaxY: Math.min(machineMaxY.value, machineMaxY.value),
        }
    })
})

const sortedOffsets = computed(() => {
    return [...allOffsetEntries.value].sort((a, b) => {
        if (a.name === activeWcs.value) return 1
        if (b.name === activeWcs.value) return -1
        return 0
    })
})

const visibleOffsets = computed(() => {
    return allOffsetEntries.value.filter((e) => {
        const off = wcsOffsets.value[e.name]
        return off && (off.X !== 0 || off.Y !== 0)
    })
})

function toSvgX(machineX: number): number {
    const range = machineMaxX.value - machineMinX.value
    if (range === 0) return padding
    return padding + ((machineX - machineMinX.value) / range) * plotWidth
}

function toSvgY(machineY: number): number {
    const range = machineMaxY.value - machineMinY.value
    const h = plotHeight.value
    if (range === 0) return padding + h
    return padding + h - ((machineY - machineMinY.value) / range) * h
}

async function refreshWcs() {
    try {
        const raw = await getCncWcs(store.getters['socket/getUrl'])
        const data = raw?.result ?? raw
        const active = typeof data?.active === 'string' ? data.active : 'G54'
        activeWcs.value = active
        if (data?.offsets && typeof data.offsets === 'object') {
            const mapped: Record<string, { X: number; Y: number }> = {}
            for (const [key, val] of Object.entries(data.offsets)) {
                const v = val as Record<string, number>
                mapped[key] = { X: v.X ?? 0, Y: v.Y ?? 0 }
            }
            wcsOffsets.value = mapped
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load WCS'
        toast.error(message)
    }
}

async function onSelectWcs(name: string) {
    if (name === activeWcs.value) return
    if (!window.confirm(`Switch to ${name}?`)) return
    try {
        await selectCncWcs(store.getters['socket/getUrl'], { wcs: name })
        activeWcs.value = name
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to change WCS'
        toast.error(message)
    }
}

const svgEl = ref<SVGSVGElement | null>(null)
const cursorInfo = ref<{ x: number; y: number } | null>(null)
const tooltipLeft = ref(0)
const tooltipTop = ref(0)

function svgPointToMachine(svgX: number, svgY: number): { x: number; y: number } | null {
    const rangeX = machineMaxX.value - machineMinX.value
    const rangeY = machineMaxY.value - machineMinY.value
    if (rangeX === 0 || rangeY === 0) return null

    const h = plotHeight.value
    const machineX = ((svgX - padding) / plotWidth) * rangeX + machineMinX.value
    const machineY = ((padding + h - svgY) / h) * rangeY + machineMinY.value

    return { x: machineX, y: machineY }
}

function snapToGridValue(val: number): number {
    const step = gridStep.value
    return Math.round(val / step) * step
}

const snapInfo = ref<{ x: number; y: number } | null>(null)

function onSvgMouseMove(e: MouseEvent) {
    const svg = svgEl.value
    if (!svg) return

    const rect = svg.getBoundingClientRect()
    const scaleX = svgWidth / rect.width
    const scaleY = svgHeight.value / rect.height

    const svgX = (e.clientX - rect.left) * scaleX
    const svgY = (e.clientY - rect.top) * scaleY

    const coords = svgPointToMachine(svgX, svgY)
    if (!coords) return

    let clampedX = Math.max(machineMinX.value, Math.min(machineMaxX.value, coords.x))
    let clampedY = Math.max(machineMinY.value, Math.min(machineMaxY.value, coords.y))

    if (snapToGrid.value) {
        clampedX = snapToGridValue(clampedX)
        clampedY = snapToGridValue(clampedY)
        snapInfo.value = { x: clampedX, y: clampedY }
    } else {
        snapInfo.value = null
    }

    cursorInfo.value = { x: clampedX, y: clampedY }

    tooltipLeft.value = e.clientX + 12
    tooltipTop.value = e.clientY - 10
}

function onSvgMouseLeave() {
    cursorInfo.value = null
    snapInfo.value = null
}

function onSvgClick(e: MouseEvent) {
    const info = cursorInfo.value
    if (!info) return

    const gcode = `G53\nG1 X${info.x.toFixed(4)} Y${info.y.toFixed(4)} F3000`
    getSocket().emit('printer.gcode.script', { script: gcode })
}

onMounted(() => {
    loadStockSizes()
    void refreshWcs()
})
</script>

<style scoped>
.offset-preview-container {
    padding: 4px 8px 8px;
}

.offset-preview-svg {
    width: 100%;
    height: auto;
    display: block;
}

.offset-rect-group:hover rect {
    filter: brightness(1.3);
}

.offset-preview-legend {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    margin-top: 6px;
}

.offset-preview-legend__item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    opacity: 0.7;
    transition: opacity 0.15s;
}

.offset-preview-legend__item:hover {
    opacity: 1;
}

.offset-preview-legend__swatch {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    flex-shrink: 0;
}

.offset-preview-legend__swatch--tool {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background-color: #FF5252;
    border: 1px solid white;
}

.offset-preview-legend__label {
    color: rgba(255, 255, 255, 0.85);
}

.offset-preview-legend__coords {
    color: rgba(255, 255, 255, 0.45);
    font-family: monospace;
    font-size: 10px;
}

.offset-preview-legend__card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid;
    border-radius: 4px;
    padding: 6px 8px;
    min-width: 0;
    width: 100%;
    opacity: 0.7;
    transition: opacity 0.15s;
}

.offset-preview-legend__card:hover {
    opacity: 1;
}

.offset-preview-legend__card--active {
    opacity: 1;
}

.offset-preview-legend__card-header {
    display: flex;
    align-items: center;
    gap: 5px;
}

.offset-preview-legend__card-eye {
    margin-left: auto;
    transition: opacity 0.15s;
}

.offset-preview-legend__card:hover .offset-preview-legend__card-eye {
    opacity: 1;
}

.offset-preview-legend__card-title {
    color: rgba(255, 255, 255, 0.9);
    font-weight: 600;
    font-size: 11px;
}

.offset-preview-legend__card-origin {
    color: rgba(255, 255, 255, 0.4);
    font-family: monospace;
    font-size: 10px;
}

.offset-preview-legend__card-stock {
    margin-top: 4px;
    padding-top: 4px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.offset-preview-legend__card-stock-name {
    color: rgba(255, 255, 255, 0.6);
    font-size: 10px;
    margin-bottom: 2px;
}

.offset-preview-legend__card-stock-dims {
    display: flex;
    align-items: center;
    gap: 2px;
    color: rgba(255, 255, 255, 0.45);
    font-family: monospace;
    font-size: 10px;
}

.offset-preview-legend__card-sep {
    opacity: 0.4;
}

.offset-preview-tooltip {
    position: fixed;
    background: rgba(0, 0, 0, 0.85);
    color: rgba(255, 255, 255, 0.9);
    font-family: monospace;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 3px;
    pointer-events: none;
    white-space: nowrap;
    z-index: 10000;
}
</style>
