<template>
  <div class="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-8">
    <h1 class="text-xl sm:text-2xl font-bold">{{ t('settings.title') }}</h1>

    <!-- Ordering Toggle -->
    <UPageCard>
      <div class="flex items-center justify-between gap-4">
        <div class="min-w-0">
          <h2 class="text-base sm:text-lg font-semibold">{{ t('settings.ordering.title') }}</h2>
          <p class="text-sm text-muted">{{ t('settings.ordering.description') }}</p>
        </div>
        <USwitch
          v-model="orderingEnabled"
          size="lg"
          :loading="updatingOrdering"
          checked-icon="i-lucide-check"
          unchecked-icon="i-lucide-x"
          @update:model-value="toggleOrdering"
        />
      </div>
    </UPageCard>

    <!-- Opening Hours (collapsible on mobile) -->
    <UPageCard>
      <details open class="group">
        <summary class="flex items-center justify-between gap-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
          <div class="flex items-center gap-2 min-w-0">
            <UIcon name="i-lucide-chevron-right" class="size-5 shrink-0 transition-transform group-open:rotate-90 text-muted" />
            <div>
              <h2 class="text-base sm:text-lg font-semibold">{{ t('settings.hours.title') }}</h2>
              <p class="text-sm text-muted hidden sm:block">{{ t('settings.hours.description') }}</p>
            </div>
          </div>
          <UButton
            :label="t('common.save')"
            icon="i-lucide-save"
            size="sm"
            :loading="updatingHours"
            @click.prevent="saveOpeningHours"
          />
        </summary>

        <div class="mt-4">
          <ScheduleEditor :hours="localHours" :days="days" @toggle-day="toggleDay" />
        </div>
      </details>
    </UPageCard>

    <!-- Ordering Hours (collapsible on mobile) -->
    <UPageCard>
      <details class="group">
        <summary class="flex items-center justify-between gap-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
          <div class="flex items-center gap-2 min-w-0">
            <UIcon name="i-lucide-chevron-right" class="size-5 shrink-0 transition-transform group-open:rotate-90 text-muted" />
            <div>
              <h2 class="text-base sm:text-lg font-semibold">{{ t('settings.orderingHours.title') }}</h2>
              <p class="text-sm text-muted hidden sm:block">{{ t('settings.orderingHours.description') }}</p>
            </div>
          </div>
          <UButton
            :label="t('common.save')"
            icon="i-lucide-save"
            size="sm"
            :loading="updatingOrderingHours"
            @click.prevent="saveOrderingHours"
          />
        </summary>

        <div class="mt-4">
          <p v-if="!hasOrderingHours" class="text-sm text-muted italic mb-3">
            {{ t('settings.orderingHours.fallbackNotice') }}
          </p>
          <ScheduleEditor :hours="localOrderingHours" :days="days" @toggle-day="toggleOrderingDay" />
        </div>
      </details>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useGqlSubscription, useNuxtApp } from '#imports'
import ScheduleEditor from '~/components/ScheduleEditor.vue'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useI18n } from 'vue-i18n'

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
const updatingOrderingHours = ref(false)
const localHours: OpeningHoursMap = reactive({
  monday: null, tuesday: null, wednesday: null, thursday: null,
  friday: null, saturday: null, sunday: null,
})
const localOrderingHours: OpeningHoursMap = reactive({
  monday: null, tuesday: null, wednesday: null, thursday: null,
  friday: null, saturday: null, sunday: null,
})

const hasOrderingHours = computed(() =>
  days.some(d => localOrderingHours[d.key] !== null)
)

const GET_CONFIG = gql`
  query {
    restaurantConfig {
      orderingEnabled
      openingHours
      orderingHours
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

const UPDATE_ORDERING_HOURS = gql`
  mutation UpdateOrderingHours($hours: OpeningHoursInput!) {
    updateOrderingHours(hours: $hours) {
      orderingHours
    }
  }
`

const parseSchedule = (schedule: DaySchedule | null | undefined): DaySchedule | null => {
  if (!schedule) return null
  return {
    open: schedule.open || '11:00',
    close: schedule.close || '14:00',
    dinnerOpen: schedule.dinnerOpen || '17:00',
    dinnerClose: schedule.dinnerClose || '22:00',
  }
}

const loadConfig = async () => {
  const data = await $gqlFetch<{ restaurantConfig: { orderingEnabled: boolean; openingHours: OpeningHoursMap; orderingHours: OpeningHoursMap | null } }>(
    print(GET_CONFIG)
  )
  if (data) {
    orderingEnabled.value = data.restaurantConfig.orderingEnabled
    for (const day of days) {
      localHours[day.key] = parseSchedule(data.restaurantConfig.openingHours[day.key])
      localOrderingHours[day.key] = data.restaurantConfig.orderingHours
        ? parseSchedule(data.restaurantConfig.orderingHours[day.key])
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

const defaultSchedule = (): DaySchedule => ({ open: '11:00', close: '14:00', dinnerOpen: '17:00', dinnerClose: '22:00' })

const toggleDay = (dayKey: string, open: boolean) => {
  localHours[dayKey] = open ? defaultSchedule() : null
}

const toggleOrderingDay = (dayKey: string, open: boolean) => {
  localOrderingHours[dayKey] = open ? defaultSchedule() : null
}

const buildHoursInput = (hours: OpeningHoursMap) => {
  const input: Record<string, { open: string; close: string; dinnerOpen?: string; dinnerClose?: string } | null> = {}
  for (const day of days) {
    const schedule = hours[day.key]
    if (schedule) {
      input[day.key] = {
        open: schedule.open,
        close: schedule.close,
        ...(schedule.dinnerOpen ? { dinnerOpen: schedule.dinnerOpen } : {}),
        ...(schedule.dinnerClose ? { dinnerClose: schedule.dinnerClose } : {}),
      }
    } else {
      input[day.key] = null
    }
  }
  return input
}

const saveOpeningHours = async () => {
  updatingHours.value = true
  try {
    await $gqlFetch(print(UPDATE_HOURS), { variables: { hours: buildHoursInput(localHours) } })
  } finally {
    updatingHours.value = false
  }
}

const saveOrderingHours = async () => {
  updatingOrderingHours.value = true
  try {
    await $gqlFetch(print(UPDATE_ORDERING_HOURS), { variables: { hours: buildHoursInput(localOrderingHours) } })
  } finally {
    updatingOrderingHours.value = false
  }
}

const SUB_CONFIG_UPDATED = gql`
  subscription RestaurantConfigUpdated {
    restaurantConfigUpdated {
      orderingEnabled
      openingHours
      orderingHours
    }
  }
`

onMounted(() => {
  loadConfig()

  const { data: liveConfig } = useGqlSubscription<{ restaurantConfigUpdated: { orderingEnabled: boolean; openingHours: OpeningHoursMap; orderingHours: OpeningHoursMap | null } }>(
    print(SUB_CONFIG_UPDATED)
  )
  watch(liveConfig, (val) => {
    if (!val?.restaurantConfigUpdated) return
    const cfg = val.restaurantConfigUpdated
    orderingEnabled.value = cfg.orderingEnabled
    if (cfg.openingHours) {
      for (const day of days) {
        localHours[day.key] = parseSchedule(cfg.openingHours[day.key])
      }
    }
    for (const day of days) {
      localOrderingHours[day.key] = cfg.orderingHours
        ? parseSchedule(cfg.orderingHours[day.key])
        : null
    }
  })
})
</script>
