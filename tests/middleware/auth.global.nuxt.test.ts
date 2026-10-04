// Global route middleware: protects every page except those whose route meta says `public: true`. The OIDC client
// (Zitadel) and the navigation are the boundaries, mocked; the middleware's own decisions are what is asserted.
// Run: `vp test run tests/middleware/auth.global.nuxt.test.ts`.
import type * as NuxtAppModule from 'nuxt/app'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { RouteLocationNormalized } from 'vue-router'
import { useLocalePath } from '#imports'
import { setFlags } from '../support/flags'

const oidc = vi.hoisted(() => ({
  isAuthenticated: vi.fn<() => Promise<boolean>>(),
  silentRenew: vi.fn<() => Promise<unknown>>(),
}))
const navigateTo = vi.hoisted(() => vi.fn((to: string) => ({ redirectedTo: to })))

vi.mock('~/composables/useOidc', () => ({ useOidc: () => oidc }))
vi.mock('nuxt/app', async (importOriginal) => ({
  ...(await importOriginal<typeof NuxtAppModule>()),
  navigateTo,
}))

const { default: authMiddleware } = await import('~/middleware/auth.global')

const run = (path: string, meta: Record<string, unknown> = {}) =>
  (authMiddleware as unknown as (to: RouteLocationNormalized) => Promise<unknown>)({
    path,
    fullPath: path,
    meta,
  } as unknown as RouteLocationNormalized)

beforeEach(() => {
  vi.resetAllMocks()
  navigateTo.mockImplementation((to: string) => ({ redirectedTo: to }))
  oidc.isAuthenticated.mockResolvedValue(false)
  oidc.silentRenew.mockResolvedValue(null)
})

describe('public pages (meta.public === true)', () => {
  it('are never checked: the login and callback pages must load without a session', async () => {
    expect(await run('/fr/auth/login', { public: true })).toBeUndefined()
    expect(oidc.isAuthenticated).not.toHaveBeenCalled()
    expect(oidc.silentRenew).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it.each([
    ['public false', { public: false }],
    ['no meta.public', {}],
    ['a truthy but not boolean value', { public: 'true' }],
  ])('are not what %s means: the page is protected', async (_label, meta) => {
    await run('/fr/orders', meta)
    expect(oidc.isAuthenticated).toHaveBeenCalledOnce()
  })
})

describe('protected pages in the browser', () => {
  it('let a signed-in staff member through without renewing anything', async () => {
    oidc.isAuthenticated.mockResolvedValue(true)
    expect(await run('/fr/orders')).toBeUndefined()
    expect(oidc.silentRenew).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('renew an expired session silently and let the staff member through', async () => {
    oidc.silentRenew.mockResolvedValue({ access_token: 'new' })
    expect(await run('/fr/orders')).toBeUndefined()
    expect(oidc.silentRenew).toHaveBeenCalledOnce()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it("send a visitor without a session to the dashboard's own login page (not to Zitadel)", async () => {
    const result = await run('/fr/orders')
    expect(result).toEqual({ redirectedTo: useLocalePath()('auth-login') })
    expect(useLocalePath()('auth-login')).toMatch(/\/auth\/login$/u)
    expect(navigateTo).toHaveBeenCalledExactlyOnceWith(useLocalePath()('auth-login'))
  })

  it('check the session first and renew only if it is not valid, in that order', async () => {
    await run('/fr/orders')
    expect(oidc.isAuthenticated.mock.invocationCallOrder[0]).toBeLessThan(
      oidc.silentRenew.mock.invocationCallOrder[0]!,
    )
  })
})

describe('during SSR', () => {
  it('lets the request through: the session lives in the browser and is checked on hydration', async () => {
    setFlags({ server: true })
    expect(await run('/fr/orders')).toBeUndefined()
    expect(oidc.isAuthenticated).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
  })
})
