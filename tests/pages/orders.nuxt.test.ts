// pages/orders.vue: the board still renders what the extracted order logic computes (columns, mobile cards, late banner,
// payment chips). The logic itself is tested in tests/utils/orders.test.ts; this proves the page is wired to it.
// Run: `vp test run tests/pages/orders.nuxt.test.ts`.
import type * as VueI18NModule from 'vue-i18n'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { makeOrder, makeOrderItem } from '../fixtures/dashboard'
import { settle } from '../helpers/settle'

const gql = vi.hoisted(() => ({ orders: [] as unknown[] }))

mockNuxtImport(
  'useGqlQuery',
  () => () =>
    Promise.resolve({
      data: ref({ orders: gql.orders }),
      pending: ref(false),
    }),
)
mockNuxtImport('useGqlSubscription', () => () => ({ data: ref<unknown>(null) }))
mockNuxtImport('useOrderingStatus', () => () => ({
  enabled: ref(true),
  updating: ref(false),
  setEnabled: vi.fn(),
}))
mockNuxtImport('useIsMobile', () => () => ref(false))
vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../helpers/i18n')
  return { ...(await importOriginal<typeof VueI18NModule>()), useI18n: fakeI18n }
})

const NOW = new Date('2026-10-04T12:00:00.000Z')
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString()

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  gql.orders = [
    makeOrder({
      id: 'o-new',
      status: 'PENDING',
      displayCustomerName: 'Fresh Customer',
      createdAt: ago(3),
      items: [makeOrderItem({ totalPrice: '12.50' })],
      totalPrice: '12.50',
    }),
    makeOrder({
      id: 'o-late',
      status: 'PREPARING',
      displayCustomerName: 'Late Customer',
      createdAt: ago(200),
    }),
    makeOrder({
      id: 'o-ready',
      status: 'AWAITING_PICK_UP',
      displayCustomerName: 'Ready Customer',
      createdAt: ago(30),
    }),
  ]
})

afterEach(() => {
  vi.useRealTimers()
})

describe('orders page', () => {
  it('puts every order in its kanban column and counts the late ones', async () => {
    const Page = (await import('~/pages/orders.vue')).default
    const wrapper = await mountSuspended(Page)
    await settle()

    const column = (key: string) => wrapper.get(`[data-column-key="${key}"]`).text()
    expect(column('NEW')).toContain('Fresh Customer')
    expect(column('NEW')).toContain('12,50')
    expect(column('PREPARING')).toContain('Late Customer')
    expect(column('AWAITING_PICK_UP')).toContain('Ready Customer')
    expect(column('OUT_FOR_DELIVERY')).not.toContain('Customer')
    // The 200-minute-old active order raises the stale banner, with the count of late orders.
    const banners = wrapper.findAll('div.bg-warning.text-inverted, button.bg-warning.text-inverted')
    expect(banners.length).toBeGreaterThan(0)
    expect(banners[0]!.find('.font-mono').text()).toBe('1')
  })

  it('shows no stale banner when no active order has waited for more than 2 hours', async () => {
    gql.orders = [makeOrder({ id: 'o-1', status: 'PENDING', createdAt: ago(119) })]
    const Page = (await import('~/pages/orders.vue')).default
    const wrapper = await mountSuspended(Page)
    await settle()
    expect(
      wrapper.findAll('div.bg-warning.text-inverted, button.bg-warning.text-inverted'),
    ).toHaveLength(0)
  })

  it('shows the elapsed time of a card and the cash "to collect" chip', async () => {
    const Page = (await import('~/pages/orders.vue')).default
    const wrapper = await mountSuspended(Page)
    await settle()

    const fresh = wrapper.get('[data-column-key="NEW"]').text()
    expect(fresh).toContain('orders.timeSince.minutes')
    expect(fresh).toContain('orders.toCollect')
  })
})
