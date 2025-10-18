<template>
  <UDashboardGroup storage="local" storage-key="tsb-dashboard">
    <UDashboardSidebar
      collapsible
      :ui="{
        footer: 'border-t border-default',
        body: 'flex flex-col gap-4'
      }"
    >
      <template #header="{ collapsed }">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-utensils" class="size-5 text-primary shrink-0" />
          <span v-if="!collapsed" class="font-bold text-lg">TSB Dashboard</span>
        </div>
      </template>

      <template #default="{ collapsed }">
        <!-- Language Switcher -->
        <UDropdownMenu :items="languageItems">
          <UButton
            :label="collapsed ? undefined : currentLocaleLabel"
            :icon="currentLocaleIcon"
            color="neutral"
            variant="ghost"
            block
            :square="collapsed"
          />
        </UDropdownMenu>

        <!-- Navigation Menu -->
        <UNavigationMenu
          :collapsed="collapsed"
          :items="navigationItems"
          orientation="vertical"
          class="flex-1"
        />
      </template>

      <template #footer="{ collapsed }">
        <UButton
          :label="collapsed ? undefined : t('navigation.logout')"
          icon="i-lucide-log-out"
          color="neutral"
          variant="ghost"
          block
          :square="collapsed"
          @click="handleLogout"
        />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel>
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

const languages = [
  { value: 'fr', label: '🇫🇷 Français', icon: 'i-lucide-flag' },
  { value: 'en', label: '🇬🇧 English', icon: 'i-lucide-flag' },
  { value: 'zh', label: '🇨🇳 中文', icon: 'i-lucide-flag' }
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

const handleLogout = () => {
  // Add logout logic here
  console.log('Logout clicked')
}
</script>

<style>
html {
  font-size: 14px;
}
</style>
