<template>
  <div
    role="radiogroup"
    :aria-label="label"
    class="flex gap-2 overflow-x-auto px-4 scrollbar-hide"
  >
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      role="radio"
      :aria-checked="option.value === modelValue"
      class="shrink-0 h-10 px-4 rounded-[20px] border text-sm font-bold whitespace-nowrap transition-colors duration-150"
      :class="option.value === modelValue
        ? 'bg-inverted text-inverted border-inverted'
        : 'text-muted border-default'"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string | number | null">
export interface PiliChipRailOption<V> {
  value: V
  label: string
}

defineProps<{
  modelValue: T
  options: PiliChipRailOption<T>[]
  label?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
</script>
