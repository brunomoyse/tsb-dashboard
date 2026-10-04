// useIsMobile: one shared "is the viewport below md (768px)" flag for the whole app, driven by a single matchMedia
// listener. The browser's matchMedia is the boundary.
// Run: `vp test run tests/composables/useIsMobile.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick } from 'vue'
import { setFlags } from '../support/flags'

type ChangeListener = (event: { matches: boolean }) => void

let changeListeners: ChangeListener[]
const matchMedia = vi.fn()

/** A fresh copy of the module (the flag and the "listener bound" state are module state). */
async function load() {
  vi.resetModules()
  return (await import('~/composables/useIsMobile')).useIsMobile
}

const viewport = (matches: boolean) => {
  matchMedia.mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: (_type: string, listener: ChangeListener) => {
      changeListeners.push(listener)
    },
  }))
  vi.stubGlobal('window', { matchMedia })
}

beforeEach(() => {
  changeListeners = []
  matchMedia.mockReset()
})

describe('useIsMobile', () => {
  it('asks the browser whether the viewport is narrower than the md breakpoint (767px and below)', async () => {
    viewport(true)
    const useIsMobile = await load()
    useIsMobile()
    expect(matchMedia).toHaveBeenCalledExactlyOnceWith('(max-width: 767px)')
  })

  it('is true on a phone-sized viewport at setup time', async () => {
    viewport(true)
    const useIsMobile = await load()
    expect(useIsMobile().value).toBe(true)
  })

  it('is false on a desktop-sized viewport', async () => {
    viewport(false)
    const useIsMobile = await load()
    expect(useIsMobile().value).toBe(false)
  })

  it('follows the viewport when it crosses the breakpoint (rotation, window resize)', async () => {
    viewport(false)
    const useIsMobile = await load()
    const isMobile = useIsMobile()

    changeListeners[0]!({ matches: true })
    await nextTick()
    expect(isMobile.value).toBe(true)

    changeListeners[0]!({ matches: false })
    await nextTick()
    expect(isMobile.value).toBe(false)
  })

  it('shares ONE flag and ONE listener between all callers', async () => {
    viewport(false)
    const useIsMobile = await load()
    const first = useIsMobile()
    const second = useIsMobile()

    expect(second).toBe(first)
    expect(matchMedia).toHaveBeenCalledOnce()
    expect(changeListeners).toHaveLength(1)
  })

  it('is false, without touching the browser, when not running in it', async () => {
    setFlags({ server: true })
    viewport(true)
    const useIsMobile = await load()
    expect(useIsMobile().value).toBe(false)
    expect(matchMedia).not.toHaveBeenCalled()
  })
})
