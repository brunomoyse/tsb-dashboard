<template>
  <nav
    class="fixed bottom-0 inset-x-0 z-40 grid grid-cols-4 bg-elevated border-t border-default h-[calc(72px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
    :aria-label="t('navigation.menu')"
  >
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.key"
      :to="tab.to"
      :aria-current="tab.active ? 'page' : undefined"
      class="relative flex flex-col items-center justify-center gap-1"
      :class="tab.active ? 'text-default' : 'text-muted'"
    >
      <span
        class="relative w-[60px] h-8 rounded-2xl flex items-center justify-center"
        :class="tab.active ? 'bg-inverted text-inverted' : ''"
      >
        <UIcon :name="tab.icon" class="size-[22px]" />
        <span
          v-if="tab.badge"
          class="absolute -top-1 right-0.5 min-w-5 h-5 px-[5px] rounded-[10px] bg-warning text-inverted font-mono tabular-nums text-[11px] font-bold flex items-center justify-center"
          >{{ tab.badge }}</span
        >
      </span>
      <span class="text-xs" :class="tab.active ? 'font-bold' : 'font-medium'">{{ tab.label }}</span>
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const ordersStore = useOrdersStore()

// Pages reached from the Plus tab keep it active.
const MORE_SECTIONS = ['/more', '/customers', '/coupons', '/settings', '/assistant']

const tabs = computed(() => {
  const path = route.path
  return [
    {
      key: 'orders',
      label: t('navigation.orders'),
      icon: 'i-lucide-list',
      to: localePath('/orders'),
      active: path.includes('/orders'),
      badge: ordersStore.unacknowledgedPendingCount || 0,
    },
    {
      key: 'products',
      label: t('navigation.products'),
      icon: 'i-lucide-package',
      to: localePath('/products'),
      active: path.includes('/products'),
      badge: 0,
    },
    {
      key: 'history',
      label: t('navigation.orderHistory'),
      icon: 'i-lucide-clock',
      to: localePath('/order-history'),
      active: path.includes('/order-history'),
      badge: 0,
    },
    {
      key: 'more',
      label: t('navigation.more'),
      icon: 'i-lucide-ellipsis',
      to: localePath('/more'),
      active: MORE_SECTIONS.some((section) => path.includes(section)),
      badge: 0,
    },
  ]
})
</script>
