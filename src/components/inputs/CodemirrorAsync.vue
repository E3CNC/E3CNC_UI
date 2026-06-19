<template>
    <component :is="CodemirrorComp" :validation-errors="validationErrors" v-bind="$attrs" />
</template>

<script setup lang="ts">
import { shallowRef, onMounted } from 'vue'

const props = defineProps<{
    validationErrors?: { line: number; severity: 'error' | 'warning' }[]
}>()

const CodemirrorComp = shallowRef<unknown>(null)

onMounted(async () => {
    const mod = await import('@/components/inputs/Codemirror.vue')
    CodemirrorComp.value = mod.default
})
</script>
