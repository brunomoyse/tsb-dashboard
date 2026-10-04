// useZitadelApi: the login calls to tsb-service's auth proxy (OTP session, TOTP, finalize). The proxy adds the Zitadel
// service-account PAT; the dashboard never talks to Zitadel directly. $fetch is the boundary.
// Run: `vp test run tests/composables/useZitadelApi.nuxt.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useRuntimeConfig } from '#imports'
import { useZitadelApi } from '~/composables/useZitadelApi'

const $fetchMock = vi.hoisted(() => vi.fn())
mockNuxtImport('$fetch', () => $fetchMock)

const base = () => useRuntimeConfig().public.api

const goTo = (path: string) => {
  window.history.replaceState({}, '', path)
}

beforeEach(() => {
  vi.resetAllMocks()
  goTo('/fr/auth/login')
})

describe('requestOtpLogin', () => {
  it('asks the proxy for a code by email, in the language of the page', async () => {
    goTo('/nl/auth/login')
    $fetchMock.mockResolvedValue({ sessionId: 's-1', sessionToken: 't-1' })

    await expect(useZitadelApi().requestOtpLogin('chef@example.com')).resolves.toEqual({
      sessionId: 's-1',
      sessionToken: 't-1',
    })

    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(`${base()}/auth/session/otp/request`, {
      method: 'POST',
      body: { loginName: 'chef@example.com', lang: 'nl' },
    })
  })

  it('defaults the language to French on a path without one', async () => {
    goTo('/')
    $fetchMock.mockResolvedValue({})
    await useZitadelApi().requestOtpLogin('chef@example.com')
    expect($fetchMock.mock.calls[0]?.[1].body.lang).toBe('fr')
  })

  it('defaults the language to French where there is no window', async () => {
    $fetchMock.mockResolvedValue({})
    const { requestOtpLogin } = useZitadelApi()
    vi.stubGlobal('window', undefined)
    await requestOtpLogin('chef@example.com')
    expect($fetchMock.mock.calls[0]?.[1].body.lang).toBe('fr')
  })

  it('surfaces a proxy error as it is', async () => {
    const error = Object.assign(new Error('404'), { status: 404 })
    $fetchMock.mockRejectedValue(error)
    await expect(useZitadelApi().requestOtpLogin('nobody@example.com')).rejects.toBe(error)
  })
})

describe('verifyOtpLogin', () => {
  it('sends the session and the 6-digit code, and reports whether a TOTP is still required', async () => {
    $fetchMock.mockResolvedValue({ sessionId: 's-1', sessionToken: 't-2', requiresTotp: true })

    await expect(useZitadelApi().verifyOtpLogin('s-1', 't-1', '123456')).resolves.toEqual({
      sessionId: 's-1',
      sessionToken: 't-2',
      requiresTotp: true,
    })

    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(`${base()}/auth/session/otp/verify`, {
      method: 'POST',
      body: { sessionId: 's-1', sessionToken: 't-1', code: '123456' },
    })
  })
})

describe('verifyTotpLogin', () => {
  it('adds the authenticator-app check to the session', async () => {
    $fetchMock.mockResolvedValue({ sessionId: 's-1', sessionToken: 't-3' })

    await expect(useZitadelApi().verifyTotpLogin('s-1', 't-2', '654321')).resolves.toEqual({
      sessionId: 's-1',
      sessionToken: 't-3',
    })

    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(`${base()}/auth/session/totp/verify`, {
      method: 'POST',
      body: { sessionId: 's-1', sessionToken: 't-2', code: '654321' },
    })
  })
})

describe('resendOtpLogin', () => {
  it('re-issues a code for the pending session, in the language of the page', async () => {
    goTo('/zh/auth/login')
    $fetchMock.mockResolvedValue({ success: true })

    await expect(useZitadelApi().resendOtpLogin('s-1', 't-1')).resolves.toEqual({ success: true })

    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(`${base()}/auth/session/otp/resend`, {
      method: 'POST',
      body: { sessionId: 's-1', sessionToken: 't-1', lang: 'zh' },
    })
  })
})

describe('finalizeOidcAuth', () => {
  it('turns the authenticated session into the callback URL of the auth request', async () => {
    $fetchMock.mockResolvedValue({ callbackUrl: 'https://auth.test/callback?code=c' })

    await expect(useZitadelApi().finalizeOidcAuth('V2_1', 's-1', 't-3')).resolves.toEqual({
      callbackUrl: 'https://auth.test/callback?code=c',
    })

    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(`${base()}/auth/finalize`, {
      method: 'POST',
      body: { authRequestId: 'V2_1', sessionId: 's-1', sessionToken: 't-3' },
    })
  })

  it('surfaces a refusal', async () => {
    $fetchMock.mockRejectedValue(new Error('400'))
    await expect(useZitadelApi().finalizeOidcAuth('V2_1', 's-1', 't-3')).rejects.toThrow('400')
  })
})
