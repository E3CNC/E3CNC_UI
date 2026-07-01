import { getDefaultState } from './index'
import { MutationTree } from 'vuex'
import { PrinterTempHistoryState, PrinterTempHistoryStateSerie } from '@/store/printer/tempHistory/types'

export const mutations: MutationTree<PrinterTempHistoryState> = {
    reset(state: PrinterTempHistoryState) {
        Object.assign(state, getDefaultState())
    },

    setInitSource(state: PrinterTempHistoryState, payload: any) {
        state.source = payload
    },

    setInitSeries(state: PrinterTempHistoryState, payload: any) {
        state.series = payload
    },

    addToSource(state: PrinterTempHistoryState, payload: any) {
        const newSource = [...state.source]
        newSource.push(payload.data)
        while (newSource.length > payload.maxHistory) newSource.splice(0, 1)

        state.source = newSource
    },

    // function for debugging tempchart update interval (browser sleep)
    saveLastDate(state: PrinterTempHistoryState, payload: any) {
        state.timeLastUpdate = payload
    },

    setUpdateSourceInterval(state: PrinterTempHistoryState, payload: any) {
        state.updateSourceInterval = payload
    },

    setColor(state: PrinterTempHistoryState, payload: any) {
        state.series
            .filter((serie: PrinterTempHistoryStateSerie) => {
                return payload.name === serie.name || serie.name.startsWith(payload.name + '-')
            })
            .forEach((serie: PrinterTempHistoryStateSerie) => {
                serie.color = payload.value
                serie.lineStyle.color = payload.value
                serie.emphasis.lineStyle.color = payload.value

                if (serie.name.endsWith('-target')) {
                    const areaStyle = serie.areaStyle
                    if (areaStyle) areaStyle.color = payload.value

                    const areaStyle2 = serie.emphasis?.areaStyle
                    if (areaStyle2) areaStyle2.color = payload.value
                }
            })
    },
}
