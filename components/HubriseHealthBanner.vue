<script setup lang="ts">
// Persistent HubRise health banner mounted in layouts/default.vue.
// Renders only when the integration is degraded or down — OK state
// is invisible to avoid UI clutter.
//
// Severity → color mapping:
//   - down     → red (operator action required, ordering may be disabled)
//   - degraded → amber (transient failures, watch closely)
//   - ok       → hidden
//   - unknown  → hidden (tsb-service unreachable, already covered by auth redirect)

import { useHubriseHealth } from '~/composables/useHubriseHealth'

const { status, snapshot } = useHubriseHealth()

const label = computed(() => {
  if (status.value === 'down') {
    const failed = snapshot.value?.orders_failed_count ?? 0
    const stuck = snapshot.value?.orders_stuck_pending_count ?? 0
    return `HubRise service down — ${failed} failed, ${stuck} stuck`
  }
  if (status.value === 'degraded') {
    const reasons = snapshot.value?.reasons ?? []
    return `HubRise degraded — ${reasons[0] ?? 'check settings'}`
  }
  return ''
})
</script>

<template>
  <div
    v-if="status === 'down' || status === 'degraded'"
    class="px-4 py-2 text-sm flex items-center gap-2 font-medium"
    :class="status === 'down'
      ? 'bg-red-600 text-white'
      : 'bg-amber-500 text-black'"
    role="alert"
    aria-live="polite"
  >
    <UIcon name="i-lucide-alert-triangle" class="size-4 shrink-0" />
    <span>{{ label }}</span>
    <NuxtLink
      to="/settings"
      class="ml-auto underline opacity-90 hover:opacity-100"
    >
      Details
    </NuxtLink>
  </div>
</template>
