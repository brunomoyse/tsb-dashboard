<template>
  <!-- Sub-header of the pages reached from the Plus tab (mobile only) -->
  <div class="sticky top-0 z-30 h-[60px] px-2 bg-default flex items-center gap-1">
    <NuxtLink
      :to="localePath(backTo)"
      :aria-label="t('common.back')"
      class="size-12 rounded-xl flex items-center justify-center shrink-0"
    >
      <UIcon name="i-lucide-chevron-left" class="size-[26px]" />
    </NuxtLink>
    <h1 class="flex-1 min-w-0 text-xl font-bold truncate">{{ title }}</h1>
    <div v-if="$slots.default" class="mr-2 shrink-0">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const { title, backTo = '/more' } = defineProps<{
  title: string
  backTo?: string
}>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>
