<template>
  <div class="divide-y divide-default">
    <div
      v-for="day in days"
      :key="day.key"
      class="py-3 first:pt-0 last:pb-0"
    >
      <!-- Header row: day name + toggle (+ inline times on desktop) -->
      <div class="flex items-center gap-3">
        <div class="font-medium text-sm sm:text-base flex-1 sm:flex-none sm:w-28 min-w-0 truncate">
          {{ t(`settings.hours.${day.key}`) }}
        </div>
        <USwitch
          :model-value="!!hours[day.key]"
          size="lg"
          checked-icon="i-lucide-check"
          unchecked-icon="i-lucide-x"
          @update:model-value="(val: boolean) => emit('toggle-day', day.key, val)"
        />
        <span v-if="!hours[day.key]" class="text-xs sm:text-sm text-muted italic">
          {{ t('settings.hours.closed') }}
        </span>

        <!-- Desktop inline times -->
        <div v-if="hours[day.key]" class="hidden sm:flex items-center gap-2 ml-auto tabular-nums">
          <input
            v-model="hours[day.key]!.open"
            type="time"
            class="border border-default rounded px-2 py-1 text-sm bg-default"
          >
          <span class="text-muted">–</span>
          <input
            v-model="hours[day.key]!.close"
            type="time"
            class="border border-default rounded px-2 py-1 text-sm bg-default"
          >
          <span class="text-muted mx-1">|</span>
          <input
            v-model="hours[day.key]!.dinnerOpen"
            type="time"
            class="border border-default rounded px-2 py-1 text-sm bg-default"
          >
          <span class="text-muted">–</span>
          <input
            v-model="hours[day.key]!.dinnerClose"
            type="time"
            class="border border-default rounded px-2 py-1 text-sm bg-default"
          >
        </div>
      </div>

      <!-- Mobile: stacked Lunch / Dinner rows -->
      <div v-if="hours[day.key]" class="sm:hidden mt-3 space-y-2">
        <div class="flex items-center gap-2">
          <span class="w-10 text-xs uppercase tracking-wide text-muted shrink-0">
            {{ t('settings.hours.lunch') }}
          </span>
          <input
            v-model="hours[day.key]!.open"
            type="time"
            class="flex-1 min-w-0 border border-default rounded-lg px-3 py-2.5 text-base bg-default tabular-nums"
          >
          <span class="text-muted text-sm">–</span>
          <input
            v-model="hours[day.key]!.close"
            type="time"
            class="flex-1 min-w-0 border border-default rounded-lg px-3 py-2.5 text-base bg-default tabular-nums"
          >
        </div>
        <div class="flex items-center gap-2">
          <span class="w-10 text-xs uppercase tracking-wide text-muted shrink-0">
            {{ t('settings.hours.dinner') }}
          </span>
          <input
            v-model="hours[day.key]!.dinnerOpen"
            type="time"
            class="flex-1 min-w-0 border border-default rounded-lg px-3 py-2.5 text-base bg-default tabular-nums"
          >
          <span class="text-muted text-sm">–</span>
          <input
            v-model="hours[day.key]!.dinnerClose"
            type="time"
            class="flex-1 min-w-0 border border-default rounded-lg px-3 py-2.5 text-base bg-default tabular-nums"
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
</script>
