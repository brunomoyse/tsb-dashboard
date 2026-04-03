<template>
  <div class="space-y-1">
    <div
      v-for="day in days"
      :key="day.key"
      class="py-3 border-b border-default last:border-0"
    >
      <!-- Row 1: Day name + toggle (+ closed label) -->
      <div class="flex items-center gap-3">
        <div class="w-20 sm:w-28 font-medium shrink-0 text-sm sm:text-base">{{ t(`settings.hours.${day.key}`) }}</div>
        <USwitch
          :model-value="!!hours[day.key]"
          size="lg"
          checked-icon="i-lucide-check"
          unchecked-icon="i-lucide-x"
          @update:model-value="(val: boolean) => emit('toggle-day', day.key, val)"
        />
        <span v-if="!hours[day.key]" class="text-sm text-muted italic">{{ t('settings.hours.closed') }}</span>

        <!-- Time inputs inline on desktop -->
        <template v-if="hours[day.key]">
          <div class="hidden sm:flex items-center gap-2 ml-auto">
            <input
              type="time"
              v-model="hours[day.key]!.open"
              class="border border-default rounded px-2 py-1 text-sm bg-default"
            />
            <span class="text-muted">–</span>
            <input
              type="time"
              v-model="hours[day.key]!.close"
              class="border border-default rounded px-2 py-1 text-sm bg-default"
            />
            <span class="text-muted mx-1">|</span>
            <input
              type="time"
              v-model="hours[day.key]!.dinnerOpen"
              class="border border-default rounded px-2 py-1 text-sm bg-default"
            />
            <span class="text-muted">–</span>
            <input
              type="time"
              v-model="hours[day.key]!.dinnerClose"
              class="border border-default rounded px-2 py-1 text-sm bg-default"
            />
          </div>
        </template>
      </div>

      <!-- Row 2: Time inputs on mobile — both ranges on one row -->
      <div v-if="hours[day.key]" class="sm:hidden mt-2 ml-8">
        <div class="flex items-center gap-1.5">
          <input
            type="time"
            v-model="hours[day.key]!.open"
            class="border border-default rounded-lg px-2 py-2 text-base bg-default flex-1 min-w-0"
          />
          <span class="text-muted text-xs">–</span>
          <input
            type="time"
            v-model="hours[day.key]!.close"
            class="border border-default rounded-lg px-2 py-2 text-base bg-default flex-1 min-w-0"
          />
          <span class="text-muted text-xs mx-0.5">|</span>
          <input
            type="time"
            v-model="hours[day.key]!.dinnerOpen"
            class="border border-default rounded-lg px-2 py-2 text-base bg-default flex-1 min-w-0"
          />
          <span class="text-muted text-xs">–</span>
          <input
            type="time"
            v-model="hours[day.key]!.dinnerClose"
            class="border border-default rounded-lg px-2 py-2 text-base bg-default flex-1 min-w-0"
          />
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
