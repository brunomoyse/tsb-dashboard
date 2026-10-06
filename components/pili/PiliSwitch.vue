<template>
  <!-- Inside a row that is itself the button: a plain visual, the row carries the role. -->
  <span
    v-if="presentational"
    class="relative shrink-0 rounded-full transition-colors duration-200"
    :class="[dims.track, trackClass]"
    aria-hidden="true"
  >
    <span
      class="absolute top-[3px] rounded-full flex items-center justify-center transition-[left,background-color] duration-200"
      :class="[dims.knob, knobClass]"
      :style="{ left: knobLeft }"
    >
      <UIcon
        v-if="loading"
        name="i-lucide-loader-circle"
        class="size-3 animate-spin"
        :class="modelValue ? 'text-success' : 'text-inverted'"
      />
    </span>
  </span>
  <button
    v-else
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center shrink-0 min-h-11 disabled:opacity-60"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span
      class="relative rounded-full transition-colors duration-200"
      :class="[dims.track, trackClass]"
    >
      <span
        class="absolute top-[3px] rounded-full flex items-center justify-center transition-[left,background-color] duration-200"
        :class="[dims.knob, knobClass]"
        :style="{ left: knobLeft }"
      >
        <UIcon
          v-if="loading"
          name="i-lucide-loader-circle"
          class="size-3 animate-spin"
          :class="modelValue ? 'text-success' : 'text-inverted'"
        />
      </span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const {
  modelValue,
  size = 'sm',
  loading = false,
  disabled = false,
  label = undefined,
  presentational = false,
} = defineProps<{
  modelValue: boolean
  /** sm 40×24, md 44×26, lg 52×30 */
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  /** Accessible name when the switch stands alone */
  label?: string
  /** Render only the visual: the parent row is the control */
  presentational?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const DIMS = {
  sm: { track: 'w-10 h-6', knob: 'size-[18px]', on: 19 },
  md: { track: 'w-11 h-[26px]', knob: 'size-5', on: 21 },
  lg: { track: 'w-[52px] h-[30px]', knob: 'size-6', on: 25 },
}

const dims = computed(() => DIMS[size])
// On: green track with an Encre knob. Off: pressed track with a muted knob.
const trackClass = computed(() => (modelValue ? 'bg-success' : 'bg-(--pili-pressed)'))
const knobClass = computed(() => (modelValue ? 'bg-(--ui-bg)' : 'bg-(--ui-text-muted)'))
const knobLeft = computed(() => `${modelValue ? dims.value.on : 3}px`)
</script>
