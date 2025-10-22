<template>
  <UDashboardGroup storage="local" storage-key="tsb-dashboard">
    <UDashboardSidebar
      collapsible
      :ui="{
        footer: 'border-t border-default flex flex-col gap-4',
        body: 'flex flex-col gap-4',
        header: 'lg:flex lg:justify-center hidden border-b border-default'
      }"
    >
      <template #header="{ collapsed }">
        <div class="flex items-center justify-center py-6 w-full">
          <img
            src="/tsb-logo-b.png"
            alt="TSB Logo"
            class="h-16 w-auto dark:hidden"
          />
          <img
            src="/tsb-logo-w.png"
            alt="TSB Logo"
            class="h-16 w-auto hidden dark:block"
          />
        </div>
      </template>

      <template #default="{ collapsed }">
        <!-- Navigation Menu -->
        <UNavigationMenu
          :collapsed="collapsed"
          :items="navigationItems"
          orientation="vertical"
          size="lg"
          class="flex-1"
          :ui="{
            link: 'py-8 px-4 text-base w-full'
          }"
        />
      </template>

      <template #footer="{ collapsed }">
        <!-- Language Switcher -->
        <UDropdownMenu :items="languageItems">
          <UButton
            :label="collapsed ? undefined : currentLocaleLabel"
            :icon="currentLocaleIcon"
            color="neutral"
            variant="ghost"
            size="lg"
            block
            :square="collapsed"
          />
        </UDropdownMenu>

        <!-- Theme Toggle -->
        <UButton
          :label="collapsed ? undefined : (colorMode === 'dark' ? t('theme.dark') : t('theme.light'))"
          :icon="colorMode === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
          color="neutral"
          variant="ghost"
          size="lg"
          block
          :square="collapsed"
          @click="toggleTheme"
        />

        <!-- Logout Button -->
        <UButton
          :label="collapsed ? undefined : t('navigation.logout')"
          icon="i-lucide-log-out"
          color="neutral"
          variant="ghost"
          size="lg"
          block
          :square="collapsed"
          @click="handleLogout"
        />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar />
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '#ui/types'

const { locale, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const localePath = useLocalePath()
const route = useRoute()
const colorMode = useColorMode()

const languages = [
  { value: 'fr', label: 'Français', icon: 'i-lucide-flag' },
  { value: 'en', label: 'English', icon: 'i-lucide-flag' },
  { value: 'zh', label: '中文', icon: 'i-lucide-flag' }
]

const currentLocaleLabel = computed(() =>
  languages.find(l => l.value === locale.value)?.label || '🌐'
)

const currentLocaleIcon = computed(() => 'i-lucide-languages')

const languageItems = computed(() =>
  languages.map(lang => ({
    label: lang.label,
    onClick: () => onLanguageChange(lang.value)
  }))
)

const navigationItems = computed<NavigationMenuItem[][]>(() => [[
  {
    label: t('navigation.orders'),
    icon: 'i-lucide-shopping-bag',
    to: `/${locale.value}/orders`,
    active: route.path.includes('/orders')
  },
  {
    label: t('navigation.products'),
    icon: 'i-lucide-package',
    to: `/${locale.value}/products`,
    active: route.path.includes('/products')
  },
  {
    label: 'Live Tracking',
    icon: 'i-lucide-map-pin',
    to: `/${locale.value}/tracking`,
    active: route.path.includes('/tracking')
  }
]])

const onLanguageChange = (newLocale: 'fr' | 'en' | 'zh') => {
  const newPath = switchLocalePath(newLocale)
  if (newPath) {
    navigateTo(newPath)
  }
}

const handleLogout = async () => {
  const config = useRuntimeConfig()

  try {
    const response = await fetch(`${config.public.api}/logout`, {
      method: 'POST',
      credentials: 'include'
    })

    if (response.ok) {
      // Server successfully cleared cookies (200 OK)
      // Redirect to localized login page with full reload
      await navigateTo(localePath('/login'), { external: true })
    } else {
      console.error('Logout failed with status:', response.status)
      // Still redirect to login even if logout fails
      await navigateTo(localePath('/login'), { external: true })
    }
  } catch (error) {
    console.error('Logout error:', error)
    // Still redirect to login even if logout fails
    await navigateTo(localePath('/login'), { external: true })
  }
}

const toggleTheme = () => {
  colorMode.value = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<style>
html {
  font-size: 14px;
}
</style>
