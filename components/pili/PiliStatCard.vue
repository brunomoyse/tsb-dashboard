<template>
  <div class="min-w-0 p-3 rounded-xl bg-elevated border border-default flex flex-col gap-1">
    <span class="text-xs text-muted truncate">{{ label }}</span>
    <span
      class="font-mono tabular-nums font-bold whitespace-nowrap"
      :class="size === 'lg' ? 'text-lg' : 'text-base'"
      >{{ value }}</span
    >
  </div>
</template>

<script setup lang="ts">
const {
  label,
  value,
  size = 'md',
} = defineProps<{
  label: string
  value: string | number
  size?: 'md' | 'lg'
}>()
</script>
