// The page the session ended on, kept across the login in sessionStorage: only same-site paths that are not the auth
// flow are honoured, and the path is read once. Needs a browser environment (sessionStorage, window.location).
// Run: `vp test run tests/utils/authReturn.nuxt.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  consumeReturnTo,
  rememberCurrentPage,
  rememberReturnTo,
  sanitizeReturnTo,
} from '~/utils/authReturn'

const KEY = 'oidc_return_to'

const goTo = (path: string) => {
  window.history.replaceState({}, '', path)
}

beforeEach(() => {
  sessionStorage.clear()
  goTo('/')
})

describe('sanitizeReturnTo', () => {
  it.each([
    '/fr/products',
    '/fr/orders/o-1',
    '/nl/coupons?status=active',
    '/fr/orders#late',
    '/',
    '/authors',
    '/fr/authors/1',
  ])('accepts the same-site path %s', (path) => {
    expect(sanitizeReturnTo(path)).toBe(path)
  })

  it.each([
    ['nothing', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['a relative path', 'fr/products'],
    ['an absolute URL', 'https://evil.example/fr/orders'],
    ['a protocol-relative URL', '//evil.example/orders'],
    ['a backslash read as a slash', '/\\evil.example'],
    ['a tab inside the URL', '/\t/evil.example'],
    ['a line break', '/fr/orders\nSet-Cookie: x=1'],
    ['a null character', '/fr/orders\u0000'],
    ['the login page', '/fr/auth/login'],
    ['the login page with its query', '/fr/auth/login?session=expired'],
    ['the callback page', '/nl/auth/callback?code=abc'],
    ['an auth page without a language', '/auth/login'],
    ['the auth root', '/fr/auth'],
  ])('refuses %s', (_name, path) => {
    expect(sanitizeReturnTo(path)).toBeNull()
  })
})

describe('rememberReturnTo / consumeReturnTo', () => {
  it('hands the remembered page back once', () => {
    rememberReturnTo('/fr/products')
    expect(consumeReturnTo()).toBe('/fr/products')
    expect(consumeReturnTo()).toBeNull()
    expect(sessionStorage.getItem(KEY)).toBeNull()
  })

  it('keeps the latest page when remembered twice', () => {
    rememberReturnTo('/fr/products')
    rememberReturnTo('/fr/coupons')
    expect(consumeReturnTo()).toBe('/fr/coupons')
  })

  it('does not remember a path it would refuse to honour', () => {
    rememberReturnTo('/fr/products')
    rememberReturnTo('/fr/auth/login')
    expect(consumeReturnTo()).toBe('/fr/products')
  })

  it('refuses a stored value that is not a safe path (storage written by something else)', () => {
    sessionStorage.setItem(KEY, 'https://evil.example')
    expect(consumeReturnTo()).toBeNull()
    expect(sessionStorage.getItem(KEY)).toBeNull()
  })

  it('is null when there is nothing remembered', () => {
    expect(consumeReturnTo()).toBeNull()
  })

  it('ignores a storage that refuses to write (private mode)', () => {
    vi.stubGlobal('sessionStorage', {
      setItem: () => {
        throw new DOMException('denied', 'SecurityError')
      },
    })
    expect(() => {
      rememberReturnTo('/fr/products')
    }).not.toThrow()
  })

  it('is null when the storage cannot be read', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new DOMException('denied', 'SecurityError')
      },
    })
    expect(consumeReturnTo()).toBeNull()
  })
})

describe('rememberCurrentPage', () => {
  it('remembers the path, query and hash of the page the browser is on', () => {
    goTo('/fr/orders?status=late#o-1')
    rememberCurrentPage()
    expect(consumeReturnTo()).toBe('/fr/orders?status=late#o-1')
  })

  it('does not remember the login page itself', () => {
    goTo('/fr/auth/login?session=expired')
    rememberCurrentPage()
    expect(consumeReturnTo()).toBeNull()
  })

  it('does nothing where there is no window', () => {
    vi.stubGlobal('window', undefined)
    expect(() => {
      rememberCurrentPage()
    }).not.toThrow()
  })
})
