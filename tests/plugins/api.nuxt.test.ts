// $api plugin: the REST client of the dashboard (ofetch with the API base URL), with the Accept-Language header, the
// OIDC bearer token in the browser, the visitor's cookies on the server, and one silent renewal + retry after a 401.
// $fetch.create (the HTTP layer), the OIDC client and navigation are the boundaries; the runtime config and the
// localised paths are real.
// Run: `vp test run tests/plugins/api.nuxt.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createFetch } from 'ofetch'
import { useRuntimeConfig } from '#imports'
import { consumeReturnTo } from '~/utils/authReturn'
import { SilentRenewUnavailableError } from '~/utils/silentRenewError'
import { setFlags } from '../support/flags'

interface CreateOptions {
  baseURL: string
  credentials: string
  headers: Record<string, string>
  onRequest: (context: { options: { headers: Headers } }) => Promise<void>
}

const oidc = vi.hoisted(() => ({
  getAccessToken: vi.fn<() => Promise<string | null>>(),
  silentRenew: vi.fn<() => Promise<unknown>>(),
}))
const baseApi = vi.hoisted(() => vi.fn())
const created = vi.hoisted(() => ({ options: null as unknown }))
const $fetchMock = vi.hoisted(() => {
  const fetchMock = vi.fn() as ReturnType<typeof vi.fn> & { create: ReturnType<typeof vi.fn> }
  fetchMock.create = vi.fn()
  return fetchMock
})
const navigateTo = vi.hoisted(() => vi.fn())
const useRequestEvent = vi.hoisted(() => vi.fn())
// The visitor's language cookie (read through useCookie), the boundary to the browser's cookie jar.
const languageCookie = vi.hoisted(() => ({ value: undefined as string | undefined }))

vi.mock('~/composables/useOidc', () => ({ useOidc: () => oidc }))
mockNuxtImport('$fetch', () => $fetchMock)
mockNuxtImport('navigateTo', () => navigateTo)
mockNuxtImport('useRequestEvent', () => useRequestEvent)
mockNuxtImport('useCookie', () => () => ({
  get value() {
    return languageCookie.value
  },
}))

const { default: apiPlugin } = await import('~/plugins/api')

type Api = <T>(request: string, options?: Record<string, unknown>) => Promise<T>

const install = (): Api =>
  (apiPlugin as unknown as (app: unknown) => { provide: { api: Api } })({}).provide.api
const createOptions = () => created.options as CreateOptions

/** What ofetch throws for an HTTP error status. */
const httpError = (status: number) =>
  Object.assign(new Error(`${status} error`), { name: 'FetchError', status })

const setLanguageCookie = (value: string | null) => {
  languageCookie.value = value ?? undefined
}

/** Runs the request hook of the created client and returns the headers it left. */
async function requestHeaders(): Promise<Headers> {
  const headers = new Headers()
  await createOptions().onRequest({ options: { headers } })
  return headers
}

const LOGIN_EXPIRED = expect.stringMatching(/^\/[a-z]{2}\/auth\/login\?session=expired$/u)

beforeEach(() => {
  sessionStorage.clear()
  vi.resetAllMocks()
  $fetchMock.create.mockImplementation((options: unknown) => {
    created.options = options
    return baseApi
  })
  setLanguageCookie(null)
  oidc.getAccessToken.mockResolvedValue('token-1')
  oidc.silentRenew.mockResolvedValue({ access_token: 'token-2' })
})

describe('the client', () => {
  it('is created for the API base URL, with JSON headers and no cookies (the session is a Bearer token)', () => {
    install()
    expect(createOptions()).toMatchObject({
      baseURL: useRuntimeConfig().public.api,
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Language': 'fr',
      },
    })
  })

  it('announces the language of the i18n cookie when there is one', () => {
    setLanguageCookie('zh')
    install()
    expect(createOptions().headers['Accept-Language']).toBe('zh')
  })

  it('is exposed as nuxtApp.$api: the provided function is the one that reaches the client', async () => {
    const provided = (apiPlugin as unknown as (app: unknown) => { provide: { api: Api } })({})
    expect(Object.keys(provided.provide)).toEqual(['api'])
    baseApi.mockResolvedValue({ ok: true })
    await expect(provided.provide.api('/me', { method: 'GET' })).resolves.toEqual({ ok: true })
    expect(baseApi).toHaveBeenCalledExactlyOnceWith('/me', { method: 'GET' })
  })
})

describe('every request in the browser', () => {
  it('carries the OIDC Bearer token', async () => {
    install()
    expect((await requestHeaders()).get('Authorization')).toBe('Bearer token-1')
  })

  it('sends no Authorization header without a session', async () => {
    oidc.getAccessToken.mockResolvedValue(null)
    install()
    expect((await requestHeaders()).has('Authorization')).toBe(false)
  })
})

describe('every request during SSR', () => {
  beforeEach(() => {
    setFlags({ server: true })
  })

  it("forwards the visitor's cookies with their language, and never looks for an OIDC token", async () => {
    setLanguageCookie('en')
    useRequestEvent.mockReturnValue({ node: { req: { headers: { cookie: 'a=b' } } } })
    install()
    const headers = await requestHeaders()
    expect(headers.get('cookie')).toBe('a=b')
    expect(headers.get('Accept-Language')).toBe('en')
    expect(headers.has('Authorization')).toBe(false)
    expect(oidc.getAccessToken).not.toHaveBeenCalled()
  })

  it('falls back to French for the forwarded language', async () => {
    useRequestEvent.mockReturnValue({ node: { req: { headers: { cookie: 'a=b' } } } })
    install()
    expect((await requestHeaders()).get('Accept-Language')).toBe('fr')
  })

  it('adds nothing when the request carries no cookie, or when there is no request event', async () => {
    install()
    useRequestEvent.mockReturnValue({ node: { req: { headers: {} } } })
    let headers = await requestHeaders()
    expect([...headers.keys()]).toEqual([])
    useRequestEvent.mockReturnValue(undefined)
    headers = await requestHeaders()
    expect([...headers.keys()]).toEqual([])
  })

  it('does not renew on a 401: it is thrown as it is', async () => {
    const error = httpError(401)
    baseApi.mockRejectedValue(error)
    await expect(install()('/me')).rejects.toBe(error)
    expect(oidc.silentRenew).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
  })
})

describe('a request that fails', () => {
  it('rethrows a non-401 error untouched, without renewing', async () => {
    const error = httpError(500)
    baseApi.mockRejectedValue(error)
    await expect(install()('/orders')).rejects.toBe(error)
    expect(oidc.silentRenew).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it.each([
    ['a network failure without status', new TypeError('Failed to fetch')],
    ['a thrown string', 'boom'],
    ['null', null],
  ])('rethrows %s', async (_label, error) => {
    baseApi.mockRejectedValue(error)
    await expect(install()('/orders')).rejects.toBe(error)
    expect(oidc.silentRenew).not.toHaveBeenCalled()
  })

  it('on a 401 renews the session once and replays the same request', async () => {
    baseApi.mockRejectedValueOnce(httpError(401)).mockResolvedValueOnce({ orders: [] })

    await expect(install()('/orders', { method: 'POST', body: { a: 1 } })).resolves.toEqual({
      orders: [],
    })

    expect(oidc.silentRenew).toHaveBeenCalledOnce()
    expect(baseApi).toHaveBeenCalledTimes(2)
    expect(baseApi.mock.calls[1]).toEqual(['/orders', { method: 'POST', body: { a: 1 } }])
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('sends the staff member to the login page, flagged as expired, when the session cannot be renewed', async () => {
    const error = httpError(401)
    baseApi.mockRejectedValue(error)
    oidc.silentRenew.mockResolvedValue(null)

    await expect(install()('/orders')).rejects.toBe(error)

    expect(navigateTo).toHaveBeenCalledExactlyOnceWith(LOGIN_EXPIRED)
    expect(baseApi).toHaveBeenCalledOnce()
  })

  it('remembers the page the staff member was on, to come back to after logging in again', async () => {
    window.history.replaceState({}, '', '/fr/coupons')
    baseApi.mockRejectedValue(httpError(401))
    oidc.silentRenew.mockResolvedValue(null)
    await expect(install()('/orders')).rejects.toBeDefined()
    expect(consumeReturnTo()).toBe('/fr/coupons')
  })

  it('does not renew twice: a 401 on the replay is thrown as it is', async () => {
    const replay = httpError(401)
    baseApi.mockRejectedValueOnce(httpError(401)).mockRejectedValueOnce(replay)
    await expect(install()('/orders')).rejects.toBe(replay)
    expect(oidc.silentRenew).toHaveBeenCalledOnce()
  })

  it('keeps the session and fails only this request when Zitadel cannot be reached (no login redirect)', async () => {
    const error = httpError(401)
    baseApi.mockRejectedValue(error)
    oidc.silentRenew.mockRejectedValue(new SilentRenewUnavailableError())

    await expect(install()('/orders')).rejects.toBe(error)

    expect(navigateTo).not.toHaveBeenCalled()
    expect(baseApi).toHaveBeenCalledOnce()
  })

  it('surfaces the failure of the renewal itself', async () => {
    baseApi.mockRejectedValue(httpError(401))
    oidc.silentRenew.mockRejectedValue(new Error('iframe blocked'))
    await expect(install()('/orders')).rejects.toThrow('iframe blocked')
  })
})

describe('through the real ofetch (what is actually sent)', () => {
  /** The headers of the request that reaches the transport, for a client built by the plugin. */
  async function send(options: Record<string, unknown>) {
    let sent: Record<string, string> = {}
    const transport = (_url: unknown, init: { headers: HeadersInit }) => {
      sent = Object.fromEntries(new Headers(init.headers))
      return Promise.resolve(
        new Response('{}', { headers: { 'content-type': 'application/json' } }),
      )
    }
    $fetchMock.create.mockImplementation((defaults: unknown) =>
      createFetch({ fetch: transport as typeof fetch }).create(defaults as never),
    )
    await install()('/graphql', options)
    return sent
  }

  it('sends a JSON body as JSON, with the bearer token and the language', async () => {
    const sent = await send({ method: 'POST', body: { query: '{ me { id } }' } })
    expect(sent).toMatchObject({
      'content-type': 'application/json',
      accept: 'application/json',
      authorization: 'Bearer token-1',
      'accept-language': 'fr',
    })
  })

  it('leaves the Content-Type of a multipart upload to the runtime, which adds the boundary (product images)', async () => {
    const form = new FormData()
    form.append('operations', '{"query":"mutation { x }"}')
    form.append('0', new Blob(['png-bytes']), 'photo.png')

    const sent = await send({ method: 'POST', body: form })

    // A fixed `application/json` here makes the server read the multipart body as JSON: no image can be uploaded.
    expect(sent['content-type']).toBeUndefined()
    expect(sent.authorization).toBe('Bearer token-1')
  })
})
