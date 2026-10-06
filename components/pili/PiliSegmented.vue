<template>
  <div
    role="radiogroup"
    :aria-label="label"
    class="grid gap-1 p-1"
    :class="[
      surface === 'ardoise' ? 'bg-accented' : 'bg-elevated',
      hasCounts ? 'rounded-[14px]' : 'rounded-xl',
    ]"
    :style="{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }"
  >
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      role="radio"
      :aria-checked="option.value === modelValue"
      class="flex flex-col items-center justify-center gap-0.5 min-w-0 transition-colors duration-150"
      :class="[
        hasCounts ? 'rounded-[10px]' : 'rounded-[9px]',
        option.value === modelValue
          ? 'bg-inverted text-inverted'
          : muted
            ? 'text-muted'
            : 'text-default',
        mono ? 'font-mono tabular-nums text-[15px] font-bold' : '',
      ]"
      :style="{ height: `${height}px` }"
      @click="select(option.value)"
    >
      <span
        v-if="option.count !== undefined"
        class="font-mono tabular-nums text-lg font-bold leading-none"
        :class="option.value !== modelValue && option.countTone === 'warning' ? 'text-warning' : ''"
        >{{ option.count }}</span
      >
      <span
        class="font-bold truncate max-w-full px-1"
        :class="option.count !== undefined ? 'text-xs' : mono ? '' : 'text-sm'"
        >{{ option.label }}</span
      >
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string | number">
import { computed } from 'vue'

export interface PiliSegmentedOption<V> {
  value: V
  label: string
  /** Figure shown above the label (order tabs) */
  count?: number
  /** Colour of the count while the option is not selected */
  countTone?: 'warning'
}

const {
  modelValue,
  options,
  height = 44,
  surface = 'graphite',
  muted = false,
  mono = false,
  deselectable = false,
  label = undefined,
} = defineProps<{
  modelValue: T | null
  options: PiliSegmentedOption<T>[]
  /** Button height in px: 56 with counts, 48 for time deltas, 44 otherwise */
  height?: number
  /** Track colour: Graphite on the page, Ardoise inside a card */
  surface?: 'graphite' | 'ardoise'
  /** Unselected labels in muted text instead of Brume */
  muted?: boolean
  /** Labels are figures (+15, +30) */
  mono?: boolean
  /** Tapping the selected option clears the selection */
  deselectable?: boolean
  label?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: T | null] }>()

const hasCounts = computed(() => options.some((o) => o.count !== undefined))

const select = (value: T) => {
  if (value === modelValue) {
    if (deselectable) emit('update:modelValue', null)
    return
  }
  emit('update:modelValue', value)
}
</script>
