// pages/coupons.vue: the list still renders what the extracted coupon logic computes (discount and period labels,
// status chips, the search filter). The logic itself is tested in tests/utils/coupons.test.ts.
// Run: `vp test run tests/pages/coupons.nuxt.test.ts`.
import type * as VueI18NModule from 'vue-i18n'
import { describe, expect, it, vi } from 'vite-plus/test'
import { ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { settle } from '../helpers/settle'

const gql = vi.hoisted(() => ({
  coupons: [
    {
      id: 'c-1',
      code: 'WELCOME10',
      discountType: 'PERCENTAGE',
      discountValue: '10',
      minOrderAmount: null,
      maxUses: 100,
      maxUsesPerUser: null,
      usedCount: 3,
      isActive: true,
      status: 'ACTIVE',
      validFrom: null,
      validUntil: '2026-10-31T12:00:00.000Z',
      createdAt: '2026-10-01T10:00:00.000Z',
    },
    {
      id: 'c-2',
      code: 'FIVEOFF',
      discountType: 'FIXED',
      discountValue: '5',
      minOrderAmount: '20.00',
      maxUses: null,
      maxUsesPerUser: 1,
      usedCount: 0,
      isActive: false,
      status: 'INACTIVE',
      validFrom: null,
      validUntil: null,
      createdAt: '2026-10-01T10:00:00.000Z',
    },
  ],
}))

mockNuxtImport('useGqlQuery', () => async () => ({
  data: ref({ coupons: gql.coupons }),
  pending: ref(false),
}))
mockNuxtImport('useGqlSubscription', () => () => ({ data: ref(null) }))
mockNuxtImport('useIsMobile', () => () => ref(true))
vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../helpers/i18n')
  return { ...(await importOriginal<typeof VueI18NModule>()), useI18n: fakeI18n }
})

describe('coupons page', () => {
  it('lists each coupon with its discount, status chip and validity', async () => {
    const Page = (await import('~/pages/coupons.vue')).default
    const wrapper = await mountSuspended(Page)
    await settle()

    const text = wrapper.text()
    expect(text).toContain('WELCOME10')
    expect(text).toContain('−10 %')
    expect(text).toContain('coupons.until{"date":"31/10/2026"}')
    expect(text).toContain('FIVEOFF')
    expect(text).toMatch(/−5,00\s*€/)
    expect(text).toContain('coupons.noEnd')
    expect(text).toContain('coupons.inactive')
  })
})
