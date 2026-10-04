// pages/auth/login.vue: the page is wired to the login state machine (tests/composables/useLoginFlow.nuxt.test.ts):
// submitting the email asks the proxy for a code and shows the code step; a wrong code shows the error.
// Run: `vp test run tests/pages/auth/login.nuxt.test.ts`.
import type * as VueI18NModule from 'vue-i18n'
import { describe, expect, it, vi } from 'vite-plus/test'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { settle } from '../../helpers/settle'

const zitadel = vi.hoisted(() => ({
  requestOtpLogin: vi.fn(),
  verifyOtpLogin: vi.fn(),
  verifyTotpLogin: vi.fn(),
  resendOtpLogin: vi.fn(),
  finalizeOidcAuth: vi.fn(),
}))
const route = vi.hoisted(() => ({
  query: { authRequestID: 'auth-req-1' } as Record<string, unknown>,
}))

vi.mock('~/composables/useZitadelApi', () => ({ useZitadelApi: () => zitadel }))
mockNuxtImport('useRoute', () => () => route)
vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../../helpers/i18n')
  return { ...(await importOriginal<typeof VueI18NModule>()), useI18n: fakeI18n }
})

describe('login page', () => {
  it('asks for a code, then shows the code step; a wrong code shows the error', async () => {
    zitadel.requestOtpLogin.mockResolvedValue({ sessionId: 's-1', sessionToken: 'tok-1' })
    zitadel.verifyOtpLogin.mockRejectedValue(
      Object.assign(new Error('401'), { response: { status: 401 } }),
    )
    const Page = (await import('~/pages/auth/login.vue')).default
    const wrapper = await mountSuspended(Page)
    await settle()
    expect(wrapper.find('#email').exists()).toBe(true)

    await wrapper.get('#email').setValue('chef@example.com')
    await wrapper.get('form').trigger('submit')
    await settle()
    expect(zitadel.requestOtpLogin).toHaveBeenCalledExactlyOnceWith('chef@example.com')
    expect(wrapper.find('#otp-code').exists()).toBe(true)
    expect(wrapper.text()).toContain('login.codeSent{"email":"chef@example.com"}')

    await wrapper.get('#otp-code').setValue('123456')
    await wrapper.get('form').trigger('submit')
    await settle()
    expect(zitadel.verifyOtpLogin).toHaveBeenCalledWith('s-1', 'tok-1', '123456')
    expect(wrapper.get('[role="alert"]').text()).toContain('login.invalidCode')
  })
})
