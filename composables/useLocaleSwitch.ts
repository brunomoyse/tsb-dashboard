import { navigateTo, useSwitchLocalePath } from '#imports'

export type AppLocale = 'fr' | 'en' | 'nl' | 'zh'

export const APP_LANGUAGES: { value: AppLocale; label: string; short: string }[] = [
  { value: 'fr', label: 'Français', short: 'FR' },
  { value: 'en', label: 'English', short: 'EN' },
  { value: 'nl', label: 'Nederlands', short: 'NL' },
  { value: 'zh', label: '中文', short: '中文' },
]

/** Language switcher shared by the desktop sidebar and the mobile Plus page. */
export function useLocaleSwitch() {
  const switchLocalePath = useSwitchLocalePath()

  const onLanguageChange = (newLocale: AppLocale) => {
    const newPath = switchLocalePath(newLocale)
    if (newPath) {
      navigateTo(newPath)
    }
  }

  return { languages: APP_LANGUAGES, onLanguageChange }
}
