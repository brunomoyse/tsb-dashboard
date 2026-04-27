<template>
  <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-(--ui-bg) focus:border focus:border-(--ui-border) focus:rounded-lg focus:text-sm focus:font-medium">
    Skip to content
  </a>
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

      <template #default="{ collapsed: isCollapsed }">
        <UNavigationMenu
          :collapsed="isCollapsed && !isMobile"
          :items="navigationItems"
          orientation="vertical"
          size="lg"
          class="flex-1"
          :ui="{
            link: (isCollapsed && !isMobile) ? 'py-8 px-0 text-base justify-center' : 'py-8 px-4 text-base w-full'
          }"
        />
      </template>

      <template #footer="{ collapsed: isCollapsed }">
        <!-- Language Switcher -->
        <UDropdownMenu :items="languageItems">
          <UButton
            :label="(isCollapsed && !isMobile) ? undefined : currentLocaleLabel"
            :icon="currentLocaleIcon"
            color="neutral"
            variant="ghost"
            size="lg"
            block
            :square="isCollapsed && !isMobile"
          />
        </UDropdownMenu>

        <!-- Theme Toggle -->
        <UButton
          :label="(isCollapsed && !isMobile) ? undefined : (colorMode.value === 'dark' ? t('theme.dark') : t('theme.light'))"
          :icon="colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
          color="neutral"
          variant="ghost"
          size="lg"
          block
          :square="isCollapsed && !isMobile"
          @click="toggleTheme"
        />

        <!-- Logout Button -->
        <div class="h-px bg-(--ui-border)" />
        <UButton
          :label="(isCollapsed && !isMobile) ? undefined : t('navigation.logout')"
          icon="i-lucide-log-out"
          color="error"
          variant="ghost"
          size="lg"
          block
          :square="isCollapsed && !isMobile"
          @click="handleLogout"
        />

        <!-- Collapse Toggle -->
        <UDashboardSidebarCollapse />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel :ui="{ body: 'bg-(--ui-bg-accented)' }">
      <template #header>
        <UDashboardNavbar class="md:hidden pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
          <!-- Mobile header: hamburger + logo -->
          <template #left>
            <div class="flex items-center gap-2">
              <UButton
                icon="i-lucide-menu"
                color="neutral"
                variant="ghost"
                size="md"
                :aria-label="t('navigation.menu')"
                @click="drawerOpen = true"
              />
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
        </UDashboardNavbar>
      </template>

      <template #body>
        <div id="main-content">
          <slot />
        </div>
      </template>
    </UDashboardPanel>

    <!-- Mobile Navigation Drawer -->
    <USlideover
      v-model:open="drawerOpen"
      side="left"
      :title="t('navigation.menu')"
      :ui="{
        content: 'max-w-xs',
        header: 'border-b border-default',
        body: 'p-0',
        footer: 'border-t border-default flex flex-col gap-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]'
      }"
    >
      <template #header>
        <div class="flex items-center justify-center py-2 w-full">
          <img
            src="/tsb-logo-b.png"
            alt="TSB Logo"
            class="h-12 w-auto dark:hidden"
          />
          <img
            src="/tsb-logo-w.png"
            alt="TSB Logo"
            class="h-12 w-auto hidden dark:block"
          />
        </div>
      </template>

      <template #body>
        <UNavigationMenu
          :items="navigationItems"
          orientation="vertical"
          size="lg"
          class="flex-1"
          :ui="{ link: 'py-4 px-4 text-base w-full' }"
        />
      </template>

      <template #footer>
        <UDropdownMenu :items="languageItems">
          <UButton
            :label="currentLocaleLabel"
            :icon="currentLocaleIcon"
            color="neutral"
            variant="ghost"
            size="lg"
            block
          />
        </UDropdownMenu>

        <UButton
          :label="colorMode.value === 'dark' ? t('theme.dark') : t('theme.light')"
          :icon="colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
          color="neutral"
          variant="ghost"
          size="lg"
          block
          @click="toggleTheme"
        />

        <div class="h-px bg-(--ui-border)" />

        <UButton
          :label="t('navigation.logout')"
          icon="i-lucide-log-out"
          color="error"
          variant="ghost"
          size="lg"
          block
          @click="handleLogout"
        />
      </template>
    </USlideover>
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '#ui/types'

const { locale, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const route = useRoute()
const colorMode = useColorMode()
const ordersStore = useOrdersStore()

const drawerOpen = ref(false)

// Auto-close drawer on navigation
watch(() => route.fullPath, () => {
  drawerOpen.value = false
})

const isMobile = ref(false)
onMounted(() => {
  const mql = window.matchMedia('(max-width: 767px)')
  isMobile.value = mql.matches
  mql.addEventListener('change', (e) => { isMobile.value = e.matches })
})

type AppLocale = 'fr' | 'en' | 'nl' | 'zh'
const languages: { value: AppLocale; label: string }[] = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'zh', label: '中文' }
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
    label: t('navigation.products'),
    icon: 'i-lucide-package',
    to: `/${locale.value}/products`,
    active: route.path.includes('/products')
  },
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
    label: t('navigation.orderHistory'),
    icon: 'i-lucide-history',
    to: `/${locale.value}/order-history`,
    active: route.path.includes('/order-history')
  },
  {
    label: t('navigation.customers'),
    icon: 'i-lucide-users',
    to: `/${locale.value}/customers`,
    active: route.path.includes('/customers')
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

const onLanguageChange = (newLocale: 'fr' | 'en' | 'nl' | 'zh') => {
  const newPath = switchLocalePath(newLocale)
  if (newPath) {
    navigateTo(newPath)
  }
}

const handleLogout = async () => {
  const authStore = useAuthStore()
  await authStore.logout()
}

const toggleTheme = () => {
  colorMode.value = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<style>
html {
  font-size: 16px;
}
</style>
