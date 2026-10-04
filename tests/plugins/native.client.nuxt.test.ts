// native.client plugin: inside the Capacitor WebView only, paints the status bar to match the dark theme. The status-bar
// plugin is the boundary.
// Run: `vp test run tests/plugins/native.client.nuxt.test.ts`.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

const statusBar = vi.hoisted(() => ({
  setStyle: vi.fn<(o: { style: string }) => Promise<void>>(),
  setBackgroundColor: vi.fn<(o: { color: string }) => Promise<void>>(),
}))
vi.mock('@capacitor/status-bar', () => ({
  StatusBar: statusBar,
  Style: { Light: 'LIGHT', Dark: 'DARK' },
}))

const { default: plugin } = await import('~/plugins/native.client')
const run = () => (plugin as unknown as () => Promise<void>)()
const scope = window as unknown as { Capacitor?: unknown }

beforeEach(() => {
  vi.resetAllMocks()
  statusBar.setStyle.mockResolvedValue()
  statusBar.setBackgroundColor.mockResolvedValue()
})

afterEach(() => {
  delete scope.Capacitor
})

describe('outside the Capacitor WebView', () => {
  beforeEach(() => {
    // @capacitor/core defines window.Capacitor as soon as anything imports it (the Nuxt app does): take it away.
    delete scope.Capacitor
  })

  it('does nothing in a plain browser', async () => {
    await run()
    expect(statusBar.setBackgroundColor).not.toHaveBeenCalled()
    expect(statusBar.setStyle).not.toHaveBeenCalled()
  })

  it('does nothing where there is no window', async () => {
    vi.stubGlobal('window', undefined)
    await run()
    expect(statusBar.setBackgroundColor).not.toHaveBeenCalled()
  })
})

describe('inside the Capacitor WebView', () => {
  beforeEach(() => {
    scope.Capacitor = {}
  })

  it('uses the dark theme colour with light icons', async () => {
    await run()
    expect(statusBar.setBackgroundColor).toHaveBeenCalledExactlyOnceWith({ color: '#1a1410' })
    expect(statusBar.setStyle).toHaveBeenCalledExactlyOnceWith({ style: 'DARK' })
  })

  it('survives a status bar plugin that is not available', async () => {
    statusBar.setBackgroundColor.mockRejectedValue(new Error('not implemented'))
    await expect(run()).resolves.toBeUndefined()
    expect(statusBar.setStyle).not.toHaveBeenCalled()
  })
})
