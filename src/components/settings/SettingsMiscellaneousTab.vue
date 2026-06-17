<template>
    <div>
        <settings-miscellaneous-tab-light-groups
            v-if="page === 'groups'"
            :type="pageType"
            :name="pageName"
            @close="openPage" />
        <settings-miscellaneous-tab-light-presets
            v-else-if="page === 'presets'"
            :type="pageType"
            :name="pageName"
            @close="openPage" />
        <settings-miscellaneous-tab-list v-else @open-page="openPage" />
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SettingsMiscellaneousTabList from '@/components/settings/Miscellaneous/SettingsMiscellaneousTabList.vue'
import SettingsMiscellaneousTabLightGroups from '@/components/settings/Miscellaneous/SettingsMiscellaneousTabLightGroups.vue'
import SettingsMiscellaneousTabLightPresets from '@/components/settings/Miscellaneous/SettingsMiscellaneousTabLightPresets.vue'
import { useMiscellaneous } from '@/composables/useMiscellaneous'

useMiscellaneous()
const route = useRoute()
const router = useRouter()

const page = ref('')
const pageType = ref('')
const pageName = ref('')
const miscPageQueryKey = 'miscPage'
const miscTypeQueryKey = 'miscType'
const miscNameQueryKey = 'miscName'

function getMiscellaneousStateFromQuery(): { page: string; type: string; name: string } | null {
    const pageValue = Array.isArray(route.query[miscPageQueryKey])
        ? route.query[miscPageQueryKey][0]
        : route.query[miscPageQueryKey]
    const typeValue = Array.isArray(route.query[miscTypeQueryKey])
        ? route.query[miscTypeQueryKey][0]
        : route.query[miscTypeQueryKey]
    const nameValue = Array.isArray(route.query[miscNameQueryKey])
        ? route.query[miscNameQueryKey][0]
        : route.query[miscNameQueryKey]

    if (pageValue !== 'groups' && pageValue !== 'presets') return null
    if (typeof typeValue !== 'string' || typeof nameValue !== 'string') return null

    return {
        page: pageValue,
        type: typeValue,
        name: nameValue,
    }
}

async function updateMiscellaneousQuery(payload: { page: string; type: string; name: string }): Promise<void> {
    const currentQueryState = getMiscellaneousStateFromQuery()
    const nextQuery = { ...route.query }

    if (payload.page && payload.type && payload.name) {
        nextQuery[miscPageQueryKey] = payload.page
        nextQuery[miscTypeQueryKey] = payload.type
        nextQuery[miscNameQueryKey] = payload.name
    } else {
        delete nextQuery[miscPageQueryKey]
        delete nextQuery[miscTypeQueryKey]
        delete nextQuery[miscNameQueryKey]
    }

    const isSameState =
        (currentQueryState?.page ?? '') === payload.page &&
        (currentQueryState?.type ?? '') === payload.type &&
        (currentQueryState?.name ?? '') === payload.name

    if (isSameState) return

    await router.replace({ path: route.path, query: nextQuery, hash: route.hash })
}

function openPage(payload: { page: string; type: string; name: string } = { page: '', type: '', name: '' }) {
    page.value = payload.page
    pageType.value = payload.type
    pageName.value = payload.name
}

watch(
    () => [route.query[miscPageQueryKey], route.query[miscTypeQueryKey], route.query[miscNameQueryKey]],
    () => {
        const queryState = getMiscellaneousStateFromQuery()

        if (queryState) {
            if (
                page.value !== queryState.page ||
                pageType.value !== queryState.type ||
                pageName.value !== queryState.name
            ) {
                openPage(queryState)
            }
            return
        }

        if (page.value || pageType.value || pageName.value) openPage()
    },
    { immediate: true }
)

watch([page, pageType, pageName], async () => {
    await updateMiscellaneousQuery({
        page: page.value,
        type: pageType.value,
        name: pageName.value,
    })
})
</script>
