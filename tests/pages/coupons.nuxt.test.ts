// pages/coupons.vue: the list still renders what the extracted coupon logic computes (discount and period labels,
// status chips, the search filter) and the create / update submit sends `buildCouponInput(form)` to the right mutation.
// The logic itself is tested in tests/utils/coupons.test.ts.
// Run: `vp test run tests/pages/coupons.nuxt.test.ts`.
import type * as VueI18NModule from 'vue-i18n'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { settle } from '../helpers/settle'

const gqlFetch = vi.hoisted(() => vi.fn())

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

mockNuxtImport('useNuxtApp', async (original) => {
  const { withGqlFetch } = await import('../helpers/gqlFetch')
  return () => withGqlFetch(original(), gqlFetch)
})
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

  describe('the create / update submit', () => {
    beforeEach(() => {
      gqlFetch.mockReset()
    })

    // The script-setup state of the page: the dialog is driven the way its buttons do (openCreateDialog /
    // openEditDialog, the form, handleSubmit).
    interface CouponsPageVm {
      form: Record<string, unknown>
      showDialog: boolean
      openCreateDialog: () => void
      openEditDialog: (coupon: unknown) => void
      handleSubmit: () => Promise<void>
    }

    const mountPage = async () => {
      const Page = (await import('~/pages/coupons.vue')).default
      const wrapper = await mountSuspended(Page)
      await settle()
      return { wrapper, vm: wrapper.vm as unknown as CouponsPageVm }
    }

    it('create: sends the built input to createCoupon and lists the new coupon first', async () => {
      const created = { ...gql.coupons[0]!, id: 'c-3', code: 'SUMMER15' }
      gqlFetch.mockResolvedValue({ createCoupon: created })
      const { wrapper, vm } = await mountPage()

      vm.openCreateDialog()
      Object.assign(vm.form, {
        code: ' summer15 ',
        discountType: 'PERCENTAGE',
        discountValue: '15',
        minOrderAmount: '20',
        maxUses: '50',
        maxUsesPerUser: '',
        isActive: true,
        // Brussels wall-clock time (CEST, UTC+2) -> UTC instants.
        validFrom: '2026-10-04T12:00',
        validUntil: '2026-12-01T12:00',
      })
      await vm.handleSubmit()
      await settle()

      expect(gqlFetch).toHaveBeenCalledOnce()
      const [query, options] = gqlFetch.mock.calls[0]!
      expect(query).toContain('createCoupon')
      expect(query).not.toContain('updateCoupon')
      expect(options).toEqual({
        variables: {
          input: {
            code: 'SUMMER15',
            discountType: 'PERCENTAGE',
            discountValue: '15',
            minOrderAmount: '20',
            maxUses: 50,
            maxUsesPerUser: null,
            isActive: true,
            validFrom: '2026-10-04T10:00:00.000Z',
            validUntil: '2026-12-01T11:00:00.000Z',
          },
        },
      })
      expect(vm.showDialog).toBe(false)
      expect(wrapper.text()).toContain('SUMMER15')
    })

    it('update: sends the id and the built input to updateCoupon and replaces the coupon in the list', async () => {
      const updated = { ...gql.coupons[0]!, code: 'WELCOME20', discountValue: '20' }
      gqlFetch.mockResolvedValue({ updateCoupon: updated })
      const { wrapper, vm } = await mountPage()

      vm.openEditDialog(gql.coupons[0])
      expect(vm.form).toMatchObject({ code: 'WELCOME10', discountValue: '10', maxUses: '100' })
      Object.assign(vm.form, { code: 'welcome20', discountValue: '20' })
      await vm.handleSubmit()
      await settle()

      expect(gqlFetch).toHaveBeenCalledOnce()
      const [query, options] = gqlFetch.mock.calls[0]!
      expect(query).toContain('updateCoupon')
      expect(query).not.toContain('createCoupon')
      expect(options).toEqual({
        variables: {
          id: 'c-1',
          input: {
            code: 'WELCOME20',
            discountType: 'PERCENTAGE',
            discountValue: '20',
            minOrderAmount: null,
            maxUses: 100,
            maxUsesPerUser: null,
            isActive: true,
            validFrom: null,
            validUntil: '2026-10-31T12:00:00.000Z',
          },
        },
      })
      expect(vm.showDialog).toBe(false)
      expect(wrapper.text()).toContain('WELCOME20')
      expect(wrapper.text()).not.toContain('WELCOME10')
    })

    it('does not call the API for an invalid form, and keeps the dialog open', async () => {
      const { vm } = await mountPage()
      vm.openCreateDialog()
      await vm.handleSubmit()
      expect(gqlFetch).not.toHaveBeenCalled()
      expect(vm.showDialog).toBe(true)
    })

    it('keeps the dialog open when the API refuses the save', async () => {
      gqlFetch.mockRejectedValue(new Error('boom'))
      const { vm } = await mountPage()
      vm.openCreateDialog()
      Object.assign(vm.form, { code: 'X', discountValue: '5' })
      await vm.handleSubmit()
      expect(gqlFetch).toHaveBeenCalledOnce()
      expect(vm.showDialog).toBe(true)
    })
  })
})
