// useHaptics: tactile feedback in the Android app; a silent no-op in a browser. @capacitor/haptics is the boundary.
// Run: `vp test run tests/composables/useHaptics.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useHaptics } from '~/composables/useHaptics'

const platform = vi.hoisted(() => ({ isCapacitor: false }))
const haptics = vi.hoisted(() => ({
  impact: vi.fn<(options: { style: string }) => Promise<void>>(),
  notification: vi.fn<(options: { type: string }) => Promise<void>>(),
  selectionChanged: vi.fn<() => Promise<void>>(),
}))

vi.mock('~/composables/usePlatform', () => ({ usePlatform: () => platform }))
vi.mock('@capacitor/haptics', () => ({
  Haptics: haptics,
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}))

beforeEach(() => {
  vi.resetAllMocks()
  haptics.impact.mockResolvedValue()
  haptics.notification.mockResolvedValue()
  haptics.selectionChanged.mockResolvedValue()
})

describe('in a browser', () => {
  beforeEach(() => {
    platform.isCapacitor = false
  })

  it('does nothing and loads nothing', async () => {
    const { impact, notification, selection } = useHaptics()
    await impact('Heavy')
    await notification('Error')
    await selection()
    expect(haptics.impact).not.toHaveBeenCalled()
    expect(haptics.notification).not.toHaveBeenCalled()
    expect(haptics.selectionChanged).not.toHaveBeenCalled()
  })
})

describe('in the Android app', () => {
  beforeEach(() => {
    platform.isCapacitor = true
  })

  it('impact defaults to a light tap and maps each style to the plugin constant', async () => {
    const { impact } = useHaptics()
    await impact()
    await impact('Medium')
    await impact('Heavy')
    expect(haptics.impact.mock.calls).toEqual([
      [{ style: 'LIGHT' }],
      [{ style: 'MEDIUM' }],
      [{ style: 'HEAVY' }],
    ])
  })

  it('notification defaults to success and maps each type', async () => {
    const { notification } = useHaptics()
    await notification()
    await notification('Warning')
    await notification('Error')
    expect(haptics.notification.mock.calls).toEqual([
      [{ type: 'SUCCESS' }],
      [{ type: 'WARNING' }],
      [{ type: 'ERROR' }],
    ])
  })

  it('selection fires the selection-changed tick', async () => {
    await useHaptics().selection()
    expect(haptics.selectionChanged).toHaveBeenCalledOnce()
  })

  it('swallows a plugin failure (a missing vibrator must never break the screen)', async () => {
    haptics.impact.mockRejectedValue(new Error('no vibrator'))
    haptics.notification.mockRejectedValue(new Error('no vibrator'))
    haptics.selectionChanged.mockRejectedValue(new Error('no vibrator'))
    const { impact, notification, selection } = useHaptics()
    await expect(impact()).resolves.toBeUndefined()
    await expect(notification()).resolves.toBeUndefined()
    await expect(selection()).resolves.toBeUndefined()
    expect(haptics.impact).toHaveBeenCalledOnce()
  })
})
