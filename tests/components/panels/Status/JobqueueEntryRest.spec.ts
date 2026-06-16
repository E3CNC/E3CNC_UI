import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import JobqueueEntryRest from '@/components/panels/Status/JobqueueEntryRest.vue'
import type { ServerJobQueueStateJob } from '@/store/server/jobQueue/types'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string, options?: Record<string, any>) => {
            const translations: Record<string, string> = {
                'Panels.StatusPanel.JobqueueMoreFiles': `+${options?.count ?? 0} more files`,
            }
            return translations[key] ?? key
        },
    }),
}))

const vuetifyComponentsMock = vi.hoisted(() => ({
    VRow: { name: 'VRow', template: '<div :class="$attrs.class"><slot /></div>' },
    VCol: { name: 'VCol', props: ['cols'], template: '<div :class="$attrs.class"><slot /></div>' },
    VIcon: { name: 'VIcon', props: ['size', 'color', 'icon'], template: '<i :class="$attrs.class"><slot /></i>' },
}))

vi.mock('vuetify/components', () => vuetifyComponentsMock)

function makeJob(job_id: string, filename: string, overrides: Partial<ServerJobQueueStateJob> = {}): ServerJobQueueStateJob {
    return {
        job_id,
        filename,
        time_added: 1000,
        time_in_queue: 100,
        metadata: null,
        combinedIds: undefined,
        ...overrides,
    }
}

function makeJobWithMetadata(job_id: string, filename: string, metaOverrides: Record<string, any> = {}) {
    return makeJob(job_id, filename, {
        metadata: {
            filename,
            modified: new Date('2024-01-01'),
            permissions: 'rw',
            filament_total: 2000,
            filament_weight_total: 40,
            estimated_time: 1800,
            ...metaOverrides,
        } as any,
    })
}

describe('JobqueueEntryRest.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders headline with count', () => {
        const jobs = [
            makeJob('1', 'test1.gcode'),
            makeJob('2', 'test2.gcode'),
        ]
        const wrapper = mount(JobqueueEntryRest, {
            props: { jobs },
        })
        // Count = (0+1) + (0+1) = 2
        expect(wrapper.text()).toContain('+2 more files')
    })

    it('renders headline with combined count', () => {
        const jobs = [
            makeJob('1', 'test1.gcode', { combinedIds: ['a', 'b'] }),
            makeJob('2', 'test2.gcode'),
        ]
        const wrapper = mount(JobqueueEntryRest, {
            props: { jobs },
        })
        // Count = (2+1) + (0+1) = 4
        expect(wrapper.text()).toContain('+4 more files')
    })

    it('renders description with filament and print time', () => {
        const jobs = [
            makeJobWithMetadata('1', 'test1.gcode'),
        ]
        const wrapper = mount(JobqueueEntryRest, {
            props: { jobs },
        })
        expect(wrapper.text()).toContain('Filament:')
        expect(wrapper.text()).toContain('Print Time:')
    })

    it('computes sums correctly', () => {
        const jobs = [
            makeJobWithMetadata('1', 'test1.gcode', { filament_total: 1000, estimated_time: 600 }),
            makeJobWithMetadata('2', 'test2.gcode', { filament_total: 2000, estimated_time: 1200 }),
        ]
        const wrapper = mount(JobqueueEntryRest, {
            props: { jobs },
        })
        // filamentLength: 1000+2000 = 3000 -> "3.0 m" (>=1000)
        expect(wrapper.text()).toContain('3.0 m')
        // estimatedTime: 600+1200 = 1800 -> "30m" (since <3600)
        expect(wrapper.text()).toContain('30m')
    })

    it('shows -- when no filament or time data', () => {
        const jobs = [
            makeJob('1', 'test1.gcode'),
            makeJob('2', 'test2.gcode'),
        ]
        const wrapper = mount(JobqueueEntryRest, {
            props: { jobs },
        })
        expect(wrapper.text()).toContain('Filament: --')
        expect(wrapper.text()).toContain('Print Time: --')
    })

    it('renders file multiple icon', () => {
        const jobs = [makeJob('1', 'test.gcode')]
        const wrapper = mount(JobqueueEntryRest, {
            props: { jobs },
        })
        expect(wrapper.findComponent({ name: 'v-icon' }).exists()).toBe(true)
    })

    it('handles empty jobs array', () => {
        const wrapper = mount(JobqueueEntryRest, {
            props: { jobs: [] },
        })
        expect(wrapper.text()).toContain('+0 more files')
        expect(wrapper.text()).toContain('Filament: --')
        expect(wrapper.text()).toContain('Print Time: --')
    })
})
