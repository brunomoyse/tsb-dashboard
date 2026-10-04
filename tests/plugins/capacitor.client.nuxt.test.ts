// capacitor.client plugin: in the Android app only, styles the status bar, hides the splash screen and routes a deep
// link to the auth callback back into the SPA. Each native plugin is optional (a failure never blocks the next step).
// The @capacitor/* plugins and navigation are the boundaries.
// Run: `vp test run tests/plugins/capacitor.client.nuxt.test.ts`.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { settle } from '../helpers/settle'

const native = vi.hoisted(() => ({ isNativePlatform: vi.fn<() => boolean>() }))
const statusBar = vi.hoisted(() => ({
  setStyle: vi.fn<(o: { style: string }) => Promise<void>>(),
  setBackgroundColor: vi.fn<(o: { color: string }) => Promise<void>>(),
  setOverlaysWebView: vi.fn<(o: { overlay: boolean }) => Promise<void>>(),
}))
const splash = vi.hoisted(() => ({ hide: vi.fn<() => Promise<void>>() }))
const app = vi.hoisted(() => ({
  addListener: vi.fn<(event: string, listener: (e: { url: string }) => void) => Promise<void>>(),
}))
const navigateTo = vi.hoisted(() => vi.fn())

vi.mock('@capacitor/core', () => ({ Capacitor: native }))
vi.mock('@capacitor/status-bar', () => ({
  StatusBar: statusBar,
  Style: { Light: 'LIGHT', Dark: 'DARK' },
}))
vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: splash }))
vi.mock('@capacitor/app', () => ({ App: app }))
mockNuxtImport('navigateTo', () => navigateTo)

const { default: plugin } = await import('~/plugins/capacitor.client')
const run = () => (plugin as unknown as () => Promise<void>)()

let deepLink: (event: { url: string }) => void = () => {}

beforeEach(() => {
  vi.resetAllMocks()
  native.isNativePlatform.mockReturnValue(true)
  statusBar.setStyle.mockResolvedValue()
  statusBar.setBackgroundColor.mockResolvedValue()
  statusBar.setOverlaysWebView.mockResolvedValue()
  splash.hide.mockResolvedValue()
  app.addListener.mockImplementation((_event, listener) => {
    deepLink = listener
    return Promise.resolve()
  })
})

describe('in a browser', () => {
  it('does nothing', async () => {
    native.isNativePlatform.mockReturnValue(false)
    await run()
    expect(statusBar.setStyle).not.toHaveBeenCalled()
    expect(splash.hide).not.toHaveBeenCalled()
    expect(app.addListener).not.toHaveBeenCalled()
  })
})

describe('in the Android app', () => {
  it('shows light icons on a status bar in the dark app colour that does not overlay the WebView', async () => {
    await run()
    expect(statusBar.setStyle).toHaveBeenCalledExactlyOnceWith({ style: 'DARK' })
    expect(statusBar.setBackgroundColor).toHaveBeenCalledExactlyOnceWith({ color: '#0b0d0e' })
    expect(statusBar.setOverlaysWebView).toHaveBeenCalledExactlyOnceWith({ overlay: false })
  })

  it('paints the status bar with the colour of the app background, which is the dark one', async () => {
    const css = readFileSync(resolve(import.meta.dirname, '../../assets/css/main.css'), 'utf8')
    expect(css).toMatch(/--ui-bg:\s*#0b0d0e/u)
    await run()
    expect(statusBar.setBackgroundColor).toHaveBeenCalledExactlyOnceWith({ color: '#0b0d0e' })
  })

  it('hides the splash screen once the app is ready', async () => {
    await run()
    expect(splash.hide).toHaveBeenCalledOnce()
  })

  it('carries on to the splash screen and the deep links when the status bar plugin fails', async () => {
    statusBar.setStyle.mockRejectedValue(new Error('not implemented'))
    await run()
    expect(statusBar.setBackgroundColor).not.toHaveBeenCalled()
    expect(splash.hide).toHaveBeenCalledOnce()
    expect(app.addListener).toHaveBeenCalledOnce()
  })

  it('carries on to the deep links when the splash screen plugin fails', async () => {
    splash.hide.mockRejectedValue(new Error('not implemented'))
    await run()
    expect(app.addListener).toHaveBeenCalledOnce()
  })

  it('survives a missing app plugin', async () => {
    app.addListener.mockRejectedValue(new Error('not implemented'))
    await expect(run()).resolves.toBeUndefined()
  })

  describe('deep links (appUrlOpen)', () => {
    beforeEach(async () => {
      await run()
      expect(app.addListener).toHaveBeenCalledWith('appUrlOpen', expect.any(Function))
    })

    it('routes an auth callback link back into the SPA, keeping path and query', async () => {
      deepLink({ url: 'https://dash.example/fr/auth/callback?code=c1&state=s1' })
      await settle()
      expect(navigateTo).toHaveBeenCalledExactlyOnceWith('/fr/auth/callback?code=c1&state=s1')
    })

    it('routes a callback link without a query', async () => {
      deepLink({ url: 'https://dash.example/nl/auth/callback' })
      expect(navigateTo).toHaveBeenCalledExactlyOnceWith('/nl/auth/callback')
    })

    it('ignores every other link', async () => {
      deepLink({ url: 'https://dash.example/fr/orders' })
      expect(navigateTo).not.toHaveBeenCalled()
    })

    it('ignores a malformed link', async () => {
      expect(() => {
        deepLink({ url: 'not a url' })
      }).not.toThrow()
      expect(navigateTo).not.toHaveBeenCalled()
    })
  })
})
