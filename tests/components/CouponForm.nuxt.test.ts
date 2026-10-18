// components/coupons/CouponForm.vue: the "app only" switch drives `form.appOnly`, the flag the backend uses to refuse a
// code on the website (only the iOS/Android app can redeem it). Run: `vp test run tests/components/CouponForm.nuxt.test.ts`.
import type * as VueI18NModule from 'vue-i18n'
import { describe, expect, it, vi } from 'vite-plus/test'
import { reactive } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CouponForm from '~/components/coupons/CouponForm.vue'
import { defaultCouponForm } from '~/utils/coupons'

vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../helpers/i18n')
  return { ...(await importOriginal<typeof VueI18NModule>()), useI18n: fakeI18n }
})

// The page passes its form object and the inputs write into it (v-model on its fields).
const mountForm = async (appOnly: boolean) => {
  const form = reactive({ ...defaultCouponForm(), appOnly })
  const wrapper = await mountSuspended(CouponForm, {
    props: { modelValue: form, discountTypeOptions: [], validationError: '' },
  })
  return {
    form,
    wrapper,
    toggle: () => wrapper.get('[role="switch"][aria-label="coupons.appOnly"]'),
  }
}

describe('coupon form: app only', () => {
  it('shows the switch with its explanation, off for a new coupon', async () => {
    const { wrapper, toggle } = await mountForm(false)
    expect(wrapper.text()).toContain('coupons.appOnly')
    expect(wrapper.text()).toContain('coupons.appOnlyHint')
    expect(toggle().attributes('aria-checked')).toBe('false')
  })

  it('turns the flag on and off in the form model', async () => {
    const { form, toggle } = await mountForm(false)
    await toggle().trigger('click')
    expect(form.appOnly).toBe(true)
    expect(toggle().attributes('aria-checked')).toBe('true')
    await toggle().trigger('click')
    expect(form.appOnly).toBe(false)
    expect(toggle().attributes('aria-checked')).toBe('false')
  })

  it('leaves the active switch alone', async () => {
    const { form, toggle } = await mountForm(false)
    await toggle().trigger('click')
    expect(form.isActive).toBe(true)
  })
})
