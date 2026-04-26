<template>
  <div class="bg-default ring ring-default rounded-xl">
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
            variant="subtle"
            size="sm"
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
const { open, title, description, dirty } = defineProps<{
  open: boolean
  title: string
  description?: string
  dirty?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()
const bodyId = `settings-section-${useId()}`
</script>
