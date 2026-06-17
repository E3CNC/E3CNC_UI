<template>
    <v-menu :offset-y="true" :close-on-content-click="false" :title="$t('Panels.TemperaturePanel.SetupTemperatures')">
        <template #activator="{ props }">
            <v-btn :icon="mdiCog" rounded="0" v-bind="props" />
        </template>
        <v-list>
            <v-list-item class="minHeight36">
                <v-checkbox
                    :model-value="boolTempchart"
                    class="mt-0"
                    hide-details
                    :label="$t('Panels.TemperaturePanel.ShowChart')"
                    @update:model-value="toggleBoolTempchart" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox
                    :model-value="hideMcuHostSensors"
                    class="mt-0"
                    hide-details
                    :label="$t('Panels.TemperaturePanel.HideMcuHostSensors')"
                    @update:model-value="toggleHideMcuHostSensors" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox
                    :model-value="hideMonitors"
                    class="mt-0"
                    hide-details
                    :label="$t('Panels.TemperaturePanel.HideMonitors')"
                    @update:model-value="toggleHideMonitors" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox
                    :model-value="autoscaleTempchart"
                    class="mt-0"
                    hide-details
                    :label="$t('Panels.TemperaturePanel.AutoscaleChart')"
                    @update:model-value="toggleAutoscaleTempchart" />
            </v-list-item>
        </v-list>
    </v-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'
import { mdiCog } from '@mdi/js'

const store = useStore()

const boolTempchart = computed(() => store.state.gui.view.tempchart.boolTempchart ?? false)
function toggleBoolTempchart(val: boolean) {
    store.dispatch('gui/saveSetting', { name: 'view.tempchart.boolTempchart', value: val })
}

const autoscaleTempchart = computed(() => store.state.gui.view.tempchart.autoscale ?? false)
function toggleAutoscaleTempchart(val: boolean) {
    store.dispatch('gui/saveSetting', { name: 'view.tempchart.autoscale', value: val })
}

const hideMcuHostSensors = computed(() => store.state.gui.view.tempchart.hideMcuHostSensors ?? false)
function toggleHideMcuHostSensors(val: boolean) {
    store.dispatch('gui/saveSetting', { name: 'view.tempchart.hideMcuHostSensors', value: val })
}

const hideMonitors = computed(() => store.state.gui.view.tempchart.hideMonitors ?? false)
function toggleHideMonitors(val: boolean) {
    store.dispatch('gui/saveSetting', { name: 'view.tempchart.hideMonitors', value: val })
}
</script>
