<template>
  <div class="p-6 max-w-4xl mx-auto space-y-8">
    <h1 class="text-2xl font-bold">{{ t('settings.title') }}</h1>

    <!-- Ordering Toggle -->
    <UPageCard>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold">{{ t('settings.ordering.title') }}</h2>
          <p class="text-sm text-muted">{{ t('settings.ordering.description') }}</p>
        </div>
        <USwitch
          v-model="orderingEnabled"
          :loading="updatingOrdering"
          @update:model-value="toggleOrdering"
        />
      </div>
    </UPageCard>

    <!-- Opening Hours -->
    <UPageCard>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold">{{ t('settings.hours.title') }}</h2>
            <p class="text-sm text-muted">{{ t('settings.hours.description') }}</p>
          </div>
          <UButton
            :label="t('common.save')"
            icon="i-lucide-save"
            :loading="updatingHours"
            @click="saveOpeningHours"
          />
        </div>

        <div class="space-y-3">
          <div
            v-for="day in days"
            :key="day.key"
            class="flex items-center gap-4 py-2 border-b border-default last:border-0"
          >
            <!-- Day name -->
            <div class="w-28 font-medium">{{ t(`settings.hours.${day.key}`) }}</div>

            <!-- Open/closed toggle -->
            <USwitch
              :model-value="!!localHours[day.key]"
              @update:model-value="(val: boolean) => toggleDay(day.key, val)"
            />

            <!-- Time inputs (lunch) -->
            <template v-if="localHours[day.key]">
              <div class="flex items-center gap-2">
                <input
                  type="time"
                  v-model="localHours[day.key]!.open"
                  class="border border-default rounded px-2 py-1 text-sm bg-default"
                />
                <span class="text-muted">-</span>
                <input
                  type="time"
                  v-model="localHours[day.key]!.close"
                  class="border border-default rounded px-2 py-1 text-sm bg-default"
                />
              </div>

              <!-- Dinner period -->
              <div class="flex items-center gap-2">
                <input
                  type="time"
                  v-model="localHours[day.key]!.dinnerOpen"
                  class="border border-default rounded px-2 py-1 text-sm bg-default"
                />
                <span class="text-muted">-</span>
                <input
                  type="time"
                  v-model="localHours[day.key]!.dinnerClose"
                  class="border border-default rounded px-2 py-1 text-sm bg-default"
                />
              </div>
            </template>

            <span v-else class="text-sm text-muted italic">{{ t('settings.hours.closed') }}</span>
          </div>
        </div>
      </div>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNuxtApp, useGqlSubscription } from '#imports'
import gql from 'graphql-tag'
import { print } from 'graphql'

const { t } = useI18n()
const { $gqlFetch } = useNuxtApp()

interface DaySchedule {
  open: string
  close: string
  dinnerOpen: string
  dinnerClose: string
}

type OpeningHoursMap = Record<string, DaySchedule | null>

const days = [
  { key: 'monday' },
  { key: 'tuesday' },
  { key: 'wednesday' },
  { key: 'thursday' },
  { key: 'friday' },
  { key: 'saturday' },
  { key: 'sunday' },
]

const orderingEnabled = ref(true)
const updatingOrdering = ref(false)
const updatingHours = ref(false)
const localHours: OpeningHoursMap = reactive({
  monday: null,
  tuesday: null,
  wednesday: null,
  thursday: null,
  friday: null,
  saturday: null,
  sunday: null,
})

const GET_CONFIG = gql`
  query {
    restaurantConfig {
      orderingEnabled
      openingHours
    }
  }
`

const UPDATE_ORDERING = gql`
  mutation UpdateOrderingEnabled($enabled: Boolean!) {
    updateOrderingEnabled(enabled: $enabled) {
      orderingEnabled
    }
  }
`

const UPDATE_HOURS = gql`
  mutation UpdateOpeningHours($hours: OpeningHoursInput!) {
    updateOpeningHours(hours: $hours) {
      openingHours
    }
  }
`

const loadConfig = async () => {
  const data = await $gqlFetch<{ restaurantConfig: { orderingEnabled: boolean; openingHours: OpeningHoursMap } }>(
    print(GET_CONFIG)
  )
  if (data) {
    orderingEnabled.value = data.restaurantConfig.orderingEnabled
    const hours = data.restaurantConfig.openingHours
    for (const day of days) {
      const schedule = hours[day.key]
      localHours[day.key] = schedule
        ? {
            open: schedule.open || '11:00',
            close: schedule.close || '14:00',
            dinnerOpen: schedule.dinnerOpen || '17:00',
            dinnerClose: schedule.dinnerClose || '22:00',
          }
        : null
    }
  }
}

const toggleOrdering = async (enabled: boolean) => {
  updatingOrdering.value = true
  try {
    await $gqlFetch(print(UPDATE_ORDERING), { variables: { enabled } })
    orderingEnabled.value = enabled
  } finally {
    updatingOrdering.value = false
  }
}

const toggleDay = (dayKey: string, open: boolean) => {
  if (open) {
    localHours[dayKey] = { open: '11:00', close: '14:00', dinnerOpen: '17:00', dinnerClose: '22:00' }
  } else {
    localHours[dayKey] = null
  }
}

const saveOpeningHours = async () => {
  updatingHours.value = true
  try {
    const hoursInput: Record<string, { open: string; close: string; dinnerOpen?: string; dinnerClose?: string } | null> = {}
    for (const day of days) {
      const schedule = localHours[day.key]
      if (schedule) {
        hoursInput[day.key] = {
          open: schedule.open,
          close: schedule.close,
          ...(schedule.dinnerOpen ? { dinnerOpen: schedule.dinnerOpen } : {}),
          ...(schedule.dinnerClose ? { dinnerClose: schedule.dinnerClose } : {}),
        }
      } else {
        hoursInput[day.key] = null
      }
    }
    await $gqlFetch(print(UPDATE_HOURS), { variables: { hours: hoursInput } })
  } finally {
    updatingHours.value = false
  }
}

const SUB_CONFIG_UPDATED = gql`
  subscription RestaurantConfigUpdated {
    restaurantConfigUpdated {
      orderingEnabled
      openingHours
    }
  }
`

onMounted(() => {
  loadConfig()

  const { data: liveConfig } = useGqlSubscription<{ restaurantConfigUpdated: { orderingEnabled: boolean; openingHours: OpeningHoursMap } }>(
    print(SUB_CONFIG_UPDATED)
  )
  watch(liveConfig, (val) => {
    if (!val?.restaurantConfigUpdated) return
    const cfg = val.restaurantConfigUpdated
    orderingEnabled.value = cfg.orderingEnabled
    if (cfg.openingHours) {
      for (const day of days) {
        const schedule = cfg.openingHours[day.key]
        localHours[day.key] = schedule
          ? { open: schedule.open || '11:00', close: schedule.close || '14:00', dinnerOpen: schedule.dinnerOpen || '17:00', dinnerClose: schedule.dinnerClose || '22:00' }
          : null
      }
    }
  })
})
</script>
