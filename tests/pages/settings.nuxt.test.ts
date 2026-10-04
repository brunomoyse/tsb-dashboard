// pages/settings.vue: the page loads the restaurant config and shows what the extracted settings logic computes
// (the open-days summary, the preparation time). The logic itself is tested in tests/utils/settings.test.ts.
// Run: `vp test run tests/pages/settings.nuxt.test.ts`.
import type * as VueI18NModule from 'vue-i18n'
import { describe, expect, it, vi } from 'vite-plus/test'
import { ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { settle } from '../helpers/settle'

const gqlFetch = vi.hoisted(() => vi.fn())

mockNuxtImport('useNuxtApp', async (original) => {
  const { withGqlFetch } = await import('../helpers/gqlFetch')
  return () => withGqlFetch(original(), gqlFetch)
})
mockNuxtImport('useGqlSubscription', () => () => ({ data: ref(null) }))
mockNuxtImport('useIsMobile', () => () => ref(true))
mockNuxtImport('useTabBar', () => () => ({ hide: vi.fn(), show: vi.fn() }))
vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../helpers/i18n')
  return { ...(await importOriginal<typeof VueI18NModule>()), useI18n: fakeI18n }
})

const day = { open: '11:30', close: '14:00', dinnerOpen: '17:30', dinnerClose: '22:00' }

describe('settings page', () => {
  it('loads the config: opening-hours summary and preparation time', async () => {
    gqlFetch.mockImplementation(async (query: string) =>
      query.includes('restaurantConfig')
        ? {
            restaurantConfig: {
              orderingEnabled: true,
              openingHours: {
                monday: day,
                tuesday: day,
                wednesday: day,
                thursday: null,
                friday: day,
                saturday: day,
                sunday: null,
              },
              orderingHours: null,
              preparationMinutes: 45,
            },
          }
        : { scheduleOverrides: [] },
    )
    const Page = (await import('~/pages/settings.vue')).default
    const wrapper = await mountSuspended(Page)
    await settle()
    await settle()

    const text = wrapper.text()
    expect(text).toContain('settings.mobile.daysOpen{"count":5}#5 · 11:30-14:00 · 17:30-22:00')
    expect(text).toContain('45')
  })
})
