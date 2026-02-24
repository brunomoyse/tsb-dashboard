<template>
  <UDashboardGroup storage="cookie" storage-key="tsb-dashboard">
    <!-- Sidebar (tablet+ : collapsible) -->
    <UDashboardSidebar
      collapsible
      collapsed
      class="hidden md:flex"
      :ui="{
        footer: 'border-t border-default flex flex-col gap-4',
        body: 'flex flex-col gap-4',
        header: 'flex justify-center border-b border-default'
      }"
    >
      <template #header="{ collapsed }">
        <div class="flex items-center justify-center py-6 w-full">
          <img
            src="/tsb-logo-b.png"
            alt="TSB Logo"
            class="w-auto object-contain dark:hidden transition-all duration-300"
            :class="collapsed ? 'h-10' : 'h-16'"
          />
          <img
            src="/tsb-logo-w.png"
            alt="TSB Logo"
            class="w-auto object-contain hidden dark:block transition-all duration-300"
            :class="collapsed ? 'h-10' : 'h-16'"
          />
        </div>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="navigationItems"
          orientation="vertical"
          size="lg"
          class="flex-1"
          :ui="{
            link: collapsed ? 'py-8 px-0 text-base justify-center' : 'py-8 px-4 text-base w-full'
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

        <!-- Collapse Toggle -->
        <UDashboardSidebarCollapse />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel :ui="{ body: 'bg-(--ui-bg-accented)' }">
      <template #header>
        <UDashboardNavbar class="md:hidden">
          <!-- Mobile header: logo + menu -->
          <template #left>
            <div class="flex items-center gap-2 md:hidden">
              <img
                src="/tsb-logo-b.png"
                alt="TSB Logo"
                class="h-8 w-auto dark:hidden"
              />
              <img
                src="/tsb-logo-w.png"
                alt="TSB Logo"
                class="h-8 w-auto hidden dark:block"
              />
            </div>
          </template>
          <template #right>
            <div class="md:hidden flex items-center gap-1">
              <UDropdownMenu :items="mobileMenuItems">
                <UButton
                  icon="i-lucide-ellipsis-vertical"
                  color="neutral"
                  variant="ghost"
                  size="md"
                />
              </UDropdownMenu>
            </div>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="pb-20 md:pb-0">
          <slot />
        </div>
      </template>
    </UDashboardPanel>

    <!-- Bottom Navigation Bar (tablet/mobile only) -->
    <div class="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-(--ui-bg-elevated) border-t border-(--ui-border)">
      <nav class="flex justify-around items-center h-16">
        <NuxtLink
          v-for="item in bottomNavItems"
          :key="item.to"
          :to="item.to"
          class="relative flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-16 min-h-12 rounded-lg transition-colors"
          :class="item.active ? 'text-(--ui-primary)' : 'text-(--ui-text-muted)'"
        >
          <span class="relative">
            <UIcon :name="item.icon" class="size-6" />
            <span
              v-if="item.badge && item.badge > 0"
              class="absolute -top-1 -right-2 min-w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 animate-pulse"
            >
              {{ item.badge }}
            </span>
          </span>
          <span class="text-[11px] font-medium">{{ item.label }}</span>
        </NuxtLink>
      </nav>
    </div>
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '#ui/types'

const { locale, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const localePath = useLocalePath()
const route = useRoute()
const colorMode = useColorMode()
const ordersStore = useOrdersStore()

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
    active: route.path.includes('/orders'),
    badge: ordersStore.unacknowledgedPendingCount > 0
      ? { label: String(ordersStore.unacknowledgedPendingCount), color: 'error' as const }
      : undefined
  },
  {
    label: t('navigation.products'),
    icon: 'i-lucide-package',
    to: `/${locale.value}/products`,
    active: route.path.includes('/products')
  },
  {
    label: t('navigation.coupons'),
    icon: 'i-lucide-ticket',
    to: `/${locale.value}/coupons`,
    active: route.path.includes('/coupons')
  },
  {
    label: t('navigation.settings'),
    icon: 'i-lucide-settings',
    to: `/${locale.value}/settings`,
    active: route.path.includes('/settings')
  }
]])

const bottomNavItems = computed(() => [
  {
    label: t('navigation.orders'),
    icon: 'i-lucide-shopping-bag',
    to: `/${locale.value}/orders`,
    active: route.path.includes('/orders'),
    badge: ordersStore.unacknowledgedPendingCount
  },
  {
    label: t('navigation.products'),
    icon: 'i-lucide-package',
    to: `/${locale.value}/products`,
    active: route.path.includes('/products'),
    badge: 0
  },
  {
    label: t('navigation.coupons'),
    icon: 'i-lucide-ticket',
    to: `/${locale.value}/coupons`,
    active: route.path.includes('/coupons'),
    badge: 0
  },
  {
    label: t('navigation.settings'),
    icon: 'i-lucide-settings',
    to: `/${locale.value}/settings`,
    active: route.path.includes('/settings'),
    badge: 0
  }
])

const mobileMenuItems = computed(() => [
  languages.map(lang => ({
    label: lang.label,
    onClick: () => onLanguageChange(lang.value)
  })),
  [
    {
      label: colorMode.value === 'dark' ? t('theme.dark') : t('theme.light'),
      icon: colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun',
      onClick: toggleTheme
    },
    {
      label: t('navigation.logout'),
      icon: 'i-lucide-log-out',
      onClick: handleLogout
    }
  ]
])

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
      await navigateTo(localePath('/login'), { external: true })
    } else {
      console.error('Logout failed with status:', response.status)
      await navigateTo(localePath('/login'), { external: true })
    }
  } catch (error) {
    console.error('Logout error:', error)
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
