<template>
  <!-- Mobile: day rows with a presentational switch and a MIDI / SOIR time grid -->
  <div v-if="isMobile">
    <div
      v-for="day in days"
      :key="day.key"
      class="py-3 border-t border-default flex flex-col gap-2.5"
    >
      <button
        type="button"
        role="switch"
        :aria-checked="!!hours[day.key]"
        class="flex items-center gap-3 min-h-11 text-left cursor-pointer"
        @click="emit('toggle-day', day.key, !hours[day.key])"
      >
        <span class="flex-1 text-[15px] font-bold">{{ t(`settings.hours.${day.key}`) }}</span>
        <span v-if="!hours[day.key]" class="text-[13px] text-muted">{{ t('settings.hours.closed') }}</span>
        <PiliSwitch :model-value="!!hours[day.key]" size="md" presentational />
      </button>
      <div
        v-if="hours[day.key]"
        class="grid grid-cols-[44px_1fr_1fr] gap-1.5 items-center"
      >
        <span class="font-mono text-[11px] font-bold tracking-[0.06em] text-muted uppercase">{{ t('settings.hours.lunch') }}</span>
        <input v-model="hours[day.key]!.open" type="time" class="time-input">
        <input v-model="hours[day.key]!.close" type="time" class="time-input">
        <span class="font-mono text-[11px] font-bold tracking-[0.06em] text-muted uppercase">{{ t('settings.hours.dinner') }}</span>
        <input v-model="hours[day.key]!.dinnerOpen" type="time" class="time-input">
        <input v-model="hours[day.key]!.dinnerClose" type="time" class="time-input">
      </div>
    </div>
  </div>
  <div v-else class="divide-y divide-default">
    <div
      v-for="day in days"
      :key="day.key"
      class="py-3 first:pt-0 last:pb-0"
    >
      <!-- Header row: day name + toggle (+ inline times on desktop) -->
      <div class="flex items-center gap-3">
        <div class="font-medium text-sm sm:text-base sm:w-28 min-w-0 truncate">
          {{ t(`settings.hours.${day.key}`) }}
        </div>
        <USwitch
          :model-value="!!hours[day.key]"
          size="lg"
          color="success"
          checked-icon="i-lucide-check"
          unchecked-icon="i-lucide-x"
          @update:model-value="(val: boolean) => emit('toggle-day', day.key, val)"
        />
        <span v-if="!hours[day.key]" class="text-xs sm:text-sm text-muted italic">
          {{ t('settings.hours.closed') }}
        </span>

        <!-- Desktop inline times -->
        <div v-if="hours[day.key]" class="flex items-center gap-2 ml-auto tabular-nums">
          <input
            v-model="hours[day.key]!.open"
            type="time"
            class="border border-default rounded px-2 py-1 text-sm bg-accented font-mono tabular-nums"
          >
          <span class="text-muted">–</span>
          <input
            v-model="hours[day.key]!.close"
            type="time"
            class="border border-default rounded px-2 py-1 text-sm bg-accented font-mono tabular-nums"
          >
          <span class="text-muted mx-1">|</span>
          <input
            v-model="hours[day.key]!.dinnerOpen"
            type="time"
            class="border border-default rounded px-2 py-1 text-sm bg-accented font-mono tabular-nums"
          >
          <span class="text-muted">–</span>
          <input
            v-model="hours[day.key]!.dinnerClose"
            type="time"
            class="border border-default rounded px-2 py-1 text-sm bg-accented font-mono tabular-nums"
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface DaySchedule {
  open: string
  close: string
  dinnerOpen: string
  dinnerClose: string
}

type OpeningHoursMap = Record<string, DaySchedule | null>

const { hours, days } = defineProps<{
  hours: OpeningHoursMap
  days: { key: string }[]
}>()

const emit = defineEmits<{
  'toggle-day': [dayKey: string, open: boolean]
}>()

const { t } = useI18n()
const isMobile = useIsMobile()
</script>

<style scoped>
.time-input {
  height: 44px;
  min-width: 0;
  border-radius: 10px;
  background: var(--ui-bg-accented);
  text-align: center;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}
</style>
