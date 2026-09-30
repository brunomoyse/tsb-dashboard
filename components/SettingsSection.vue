<template>
  <!-- Mobile: 64px accordion header with a summary line and a mono +/- chevron -->
  <div v-if="isMobile" class="bg-elevated border border-default rounded-[14px] overflow-hidden">
    <button
      type="button"
      class="w-full min-h-16 px-4 py-3 flex items-center gap-3 text-left cursor-pointer"
      :aria-expanded="open"
      :aria-controls="bodyId"
      @click="emit('update:open', !open)"
    >
      <span class="flex-1 min-w-0 flex flex-col gap-1">
        <span class="flex items-center gap-2 flex-wrap text-base font-bold">
          {{ title }}
          <PiliChip v-if="dirty" tone="warning" size="sm">{{ t('settings.unsaved') }}</PiliChip>
        </span>
        <span v-if="summary || description" class="text-[13px] leading-snug text-muted font-normal">
          {{ summary || description }}
        </span>
      </span>
      <span class="font-mono text-[18px] leading-none text-muted shrink-0" aria-hidden="true">{{ open ? '−' : '+' }}</span>
    </button>
    <div v-show="open" :id="bodyId" class="px-4 pb-2">
      <slot />
    </div>
  </div>
  <div v-else class="bg-elevated border border-default rounded-[14px]">
    <button
      type="button"
      class="w-full flex items-center gap-3 px-4 py-4 sm:px-5 text-left min-h-[56px] cursor-pointer"
      :aria-expanded="open"
      :aria-controls="bodyId"
      @click="emit('update:open', !open)"
    >
      <UIcon
        name="i-lucide-chevron-right"
        class="size-5 shrink-0 text-muted transition-transform duration-200"
        :class="{ 'rotate-90': open }"
      />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <h2 class="text-base sm:text-lg font-semibold leading-tight">{{ title }}</h2>
          <UBadge
            v-if="dirty"
            :label="t('settings.unsaved')"
            color="warning"
            variant="solid"
            size="sm"
            class="rounded-[5px] text-[11px] font-bold"
          />
        </div>
        <p
          v-if="description"
          class="text-xs sm:text-sm text-muted mt-1 leading-snug"
        >
          {{ description }}
        </p>
      </div>
      <div
        v-if="$slots.actions"
        class="shrink-0"
        @click.stop
      >
        <slot name="actions" />
      </div>
    </button>
    <div
      v-show="open"
      :id="bodyId"
      class="px-4 sm:px-5 pb-4 sm:pb-5 pt-1"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useId } from 'vue'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { open, title, description, dirty, summary } = defineProps<{
  open: boolean
  title: string
  description?: string
  dirty?: boolean
  /** Mobile only: one-line summary under the title */
  summary?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()
const isMobile = useIsMobile()
const bodyId = `settings-section-${useId()}`
</script>
