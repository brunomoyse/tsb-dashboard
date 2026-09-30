<template>
  <span
    class="inline-flex items-center shrink-0 rounded-[5px] font-bold whitespace-nowrap"
    :class="[sizeClass, toneClass, mono || tone === 'outline' ? 'font-mono text-[11px] tracking-[0.05em]' : '']"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type PiliChipTone = 'warning' | 'danger' | 'success' | 'info' | 'neutral' | 'outline'

const props = withDefaults(defineProps<{
  tone?: PiliChipTone
  /** sm 20px, md 22px, lg 24px */
  size?: 'sm' | 'md' | 'lg'
  /** Mono uppercase label (EN RETARD, LIVRAISON) */
  mono?: boolean
}>(), {
  tone: 'neutral',
  size: 'md',
  mono: false,
})

// Solid colour with Encre text. Neutral is Ardoise with Brume text.
const TONES: Record<PiliChipTone, string> = {
  warning: 'bg-warning text-inverted',
  danger: 'bg-error text-inverted',
  success: 'bg-success text-inverted',
  info: 'bg-info text-inverted',
  neutral: 'bg-accented text-default',
  outline: 'border border-default text-muted',
}

const SIZES = {
  sm: 'h-5 px-[7px] text-[11px]',
  md: 'h-[22px] px-2 text-xs',
  lg: 'h-6 px-[9px] text-[13px]',
}

const toneClass = computed(() => TONES[props.tone])
const sizeClass = computed(() => SIZES[props.size])
</script>
