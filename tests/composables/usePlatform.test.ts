// usePlatform: which shell the dashboard runs in (the Capacitor Android app or a browser). Capacitor is the boundary.
// Run: `vp test run tests/composables/usePlatform.test.ts`.
import { describe, expect, it, vi } from 'vite-plus/test'
import { usePlatform } from '~/composables/usePlatform'

const capacitor = vi.hoisted(() => ({
  isNativePlatform: vi.fn<() => boolean>(),
  getPlatform: vi.fn<() => string>(),
}))
vi.mock('@capacitor/core', () => ({ Capacitor: capacitor }))

describe('usePlatform', () => {
  it('is the web in a browser', () => {
    capacitor.isNativePlatform.mockReturnValue(false)
    capacitor.getPlatform.mockReturnValue('web')
    expect(usePlatform()).toEqual({ isCapacitor: false, isWeb: true, isAndroid: false })
  })

  it('is Capacitor and Android in the Android app', () => {
    capacitor.isNativePlatform.mockReturnValue(true)
    capacitor.getPlatform.mockReturnValue('android')
    expect(usePlatform()).toEqual({ isCapacitor: true, isWeb: false, isAndroid: true })
  })

  it('is Capacitor but not Android on iOS', () => {
    capacitor.isNativePlatform.mockReturnValue(true)
    capacitor.getPlatform.mockReturnValue('ios')
    expect(usePlatform()).toEqual({ isCapacitor: true, isWeb: false, isAndroid: false })
  })

  it('is never Android outside a native shell, whatever the platform string says', () => {
    capacitor.isNativePlatform.mockReturnValue(false)
    capacitor.getPlatform.mockReturnValue('android')
    expect(usePlatform().isAndroid).toBe(false)
  })

  it('reads the platform at call time', () => {
    capacitor.isNativePlatform.mockReturnValue(false)
    capacitor.getPlatform.mockReturnValue('web')
    const first = usePlatform()
    capacitor.isNativePlatform.mockReturnValue(true)
    capacitor.getPlatform.mockReturnValue('android')
    expect(first.isCapacitor).toBe(false)
    expect(usePlatform().isCapacitor).toBe(true)
  })
})
