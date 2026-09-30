<template>
  <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-(--ui-bg) focus:border focus:border-(--ui-border) focus:rounded-lg focus:text-sm focus:font-medium">
    Skip to content
  </a>
  <UDashboardGroup storage="cookie" storage-key="tsb-dashboard">
    <!-- Sidebar (tablet+ : collapsible) -->
    <UDashboardSidebar
      collapsible
      collapsed
      class="hidden md:flex bg-elevated border-r border-default"
      :ui="{
        footer: 'border-t border-default flex flex-col gap-4',
        body: 'flex flex-col gap-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        header: 'flex justify-center border-b border-default'
      }"
    >
      <template #header="{ collapsed }">
        <div class="flex items-center justify-center py-6 w-full">
          <img
            :src="collapsed ? '/pili-mark.svg' : '/pili-wordmark.svg'"
            alt="Pili"
            class="w-auto object-contain"
            :class="collapsed ? 'h-8' : 'h-7'"
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
            link: (isCollapsed && !isMobile) ? 'py-3 px-0 text-base justify-center' : 'py-3 px-4 text-base w-full'
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


        <!-- Logout Button -->
        <div class="h-px bg-(--ui-border)" />
        <UButton
          :label="(isCollapsed && !isMobile) ? undefined : t('navigation.logout')"
          icon="i-lucide-log-out"
          color="neutral"
          variant="ghost"
          size="lg"
          block
          :square="isCollapsed && !isMobile"
          :ui="{ leadingIcon: 'text-error' }"
          @click="handleLogout"
        />

        <!-- Collapse Toggle -->
        <UDashboardSidebarCollapse />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel :ui="{ body: 'bg-default' }">
      <template #header>
        <UDashboardNavbar :toggle="false" class="md:hidden pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
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
                src="/pili-wordmark.svg"
                alt="Pili"
                class="h-7 w-auto"
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
            src="/pili-wordmark.svg"
            alt="Pili"
            class="h-8 w-auto"
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


        <div class="h-px bg-(--ui-border)" />

        <UButton
          :label="t('navigation.logout')"
          icon="i-lucide-log-out"
          color="neutral"
          variant="ghost"
          size="lg"
          block
          :ui="{ leadingIcon: 'text-error' }"
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

// Pili: the active item is a Brume fill with Encre text and icon, never Volt.
const navItemUi = (active: boolean) => active
  ? {
      link: 'text-inverted hover:text-inverted before:bg-inverted hover:before:bg-inverted',
      linkLeadingIcon: 'text-inverted group-hover:text-inverted'
    }
  : {
      link: 'text-muted hover:before:bg-accented',
      linkLeadingIcon: 'text-muted'
    }

const navigationItems = computed<NavigationMenuItem[][]>(() => {
  const item = (label: string, icon: string, path: string): NavigationMenuItem => {
    const active = route.path.includes(`/${path}`)
    return { label, icon, to: `/${locale.value}/${path}`, active, ui: navItemUi(active) }
  }
  return [[
    item(t('navigation.products'), 'i-lucide-package', 'products'),
    {
      ...item(t('navigation.orders'), 'i-lucide-shopping-bag', 'orders'),
      // Unacknowledged orders are waiting, not an error: amber, in mono.
      badge: ordersStore.unacknowledgedPendingCount > 0
        ? { label: String(ordersStore.unacknowledgedPendingCount), color: 'warning' as const, variant: 'solid' as const, class: 'font-mono tabular-nums font-bold' }
        : undefined
    },
    item(t('navigation.orderHistory'), 'i-lucide-history', 'order-history'),
    item(t('navigation.customers'), 'i-lucide-users', 'customers'),
    item(t('navigation.coupons'), 'i-lucide-ticket', 'coupons'),
    item(t('navigation.settings'), 'i-lucide-settings', 'settings')
  ]]
})

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

</script>

<style>
html {
  font-size: 16px;
}
</style>
