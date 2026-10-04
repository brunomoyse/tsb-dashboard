// useLocaleSwitch: the language switcher shared by the desktop sidebar and the mobile "Plus" page.
// Navigation and the localised path of the current route are the boundaries.
// Run: `vp test run tests/composables/useLocaleSwitch.nuxt.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const navigateTo = vi.hoisted(() => vi.fn())
const switchLocalePath = vi.hoisted(() => vi.fn<(locale: string) => string>())
mockNuxtImport('navigateTo', () => navigateTo)
mockNuxtImport('useSwitchLocalePath', () => () => switchLocalePath)

const { APP_LANGUAGES, useLocaleSwitch } = await import('~/composables/useLocaleSwitch')

beforeEach(() => {
  vi.resetAllMocks()
})

describe('languages', () => {
  it('offers French, English, Dutch and Chinese, with the label and the short code to show', () => {
    expect(useLocaleSwitch().languages).toBe(APP_LANGUAGES)
    expect(APP_LANGUAGES).toEqual([
      { value: 'fr', label: 'Français', short: 'FR' },
      { value: 'en', label: 'English', short: 'EN' },
      { value: 'nl', label: 'Nederlands', short: 'NL' },
      { value: 'zh', label: '中文', short: '中文' },
    ])
  })
})

describe('onLanguageChange', () => {
  it('goes to the same page in the chosen language', () => {
    switchLocalePath.mockReturnValue('/nl/orders')
    useLocaleSwitch().onLanguageChange('nl')
    expect(switchLocalePath).toHaveBeenCalledExactlyOnceWith('nl')
    expect(navigateTo).toHaveBeenCalledExactlyOnceWith('/nl/orders')
  })

  it('stays where it is when the current page has no version in that language', () => {
    switchLocalePath.mockReturnValue('')
    useLocaleSwitch().onLanguageChange('zh')
    expect(navigateTo).not.toHaveBeenCalled()
  })
})
