<template>
  <USlideover
    :open="open"
    side="bottom"
    :title="title"
    :description="description || title"
    :dismissible="dismissible"
    :ui="{
      overlay: 'bg-black/70',
      content: [
        'bg-elevated border-t border-default rounded-t-[20px] divide-y-0 ring-0 sm:ring-0 shadow-none sm:shadow-none',
        full
          ? 'h-[calc(100dvh-env(safe-area-inset-top)-12px)]'
          : 'max-h-[calc(100dvh-env(safe-area-inset-top)-12px)]',
      ].join(' '),
    }"
    @update:open="emit('update:open', $event)"
  >
    <template #content>
      <div class="flex flex-col min-h-0 flex-1">
        <div class="shrink-0 flex flex-col gap-3.5 px-4 pt-2.5">
          <span class="self-center w-10 h-1 rounded-sm bg-(--pili-pressed)" aria-hidden="true" />
          <div v-if="!hideTitle" class="flex items-start gap-3">
            <h3 class="flex-1 min-w-0 text-xl font-bold leading-tight">{{ title }}</h3>
            <slot name="header-action" />
          </div>
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto px-4 pt-3.5 pb-5 flex flex-col gap-3.5">
          <slot />
        </div>
        <div
          v-if="$slots.footer"
          class="shrink-0 px-4 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] border-t border-default"
        >
          <slot name="footer" />
        </div>
        <div v-else class="shrink-0 h-[env(safe-area-inset-bottom)]" />
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean
    title: string
    description?: string
    /** Take the full height of the screen (forms, customer detail) */
    full?: boolean
    /** Keep the title for screen readers only */
    hideTitle?: boolean
    dismissible?: boolean
  }>(),
  {
    description: undefined,
    full: false,
    hideTitle: false,
    dismissible: true,
  },
)

const emit = defineEmits<{ 'update:open': [value: boolean] }>()
</script>
