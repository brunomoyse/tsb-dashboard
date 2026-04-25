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

    <!-- Preparation Time -->
    <UPageCard>
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div class="min-w-0">
          <h2 class="text-base sm:text-lg font-semibold">{{ t('settings.preparation.title') }}</h2>
          <p class="text-sm text-muted">{{ t('settings.preparation.description') }}</p>
        </div>
        <div class="flex items-center gap-2">
          <input
            v-model.number="preparationMinutes"
            type="number"
            min="15"
            max="240"
            step="5"
            class="border border-default rounded px-3 py-1.5 text-sm bg-default w-24"
          />
          <span class="text-sm text-muted">{{ t('settings.preparation.label') }}</span>
          <UButton
            :label="t('common.save')"
            icon="i-lucide-save"
            size="sm"
            :loading="updatingPreparation"
            @click.prevent="savePreparation"
          />
        </div>
      </div>
    </UPageCard>

    <!-- Opening Hours -->
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

    <!-- Ordering Hours -->
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

        <div class="mt-4 space-y-4">
          <div class="flex items-center justify-between gap-4">
            <span class="text-sm">{{ t('settings.orderingHours.customHoursSwitch') }}</span>
            <USwitch
              :model-value="hasOrderingHours"
              size="md"
              checked-icon="i-lucide-check"
              unchecked-icon="i-lucide-x"
              @update:model-value="toggleCustomOrderingHours"
            />
          </div>
          <ScheduleEditor
            v-if="hasOrderingHours"
            :hours="localOrderingHours"
            :days="days"
            @toggle-day="toggleOrderingDay"
          />
        </div>
      </details>
    </UPageCard>

    <!-- Schedule Overrides (special days) -->
    <UPageCard>
      <details class="group">
        <summary class="flex items-center justify-between gap-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
          <div class="flex items-center gap-2 min-w-0">
            <UIcon name="i-lucide-chevron-right" class="size-5 shrink-0 transition-transform group-open:rotate-90 text-muted" />
            <div>
              <h2 class="text-base sm:text-lg font-semibold">{{ t('settings.overrides.title') }}</h2>
              <p class="text-sm text-muted hidden sm:block">{{ t('settings.overrides.description') }}</p>
            </div>
          </div>
          <UButton
            :label="t('settings.overrides.addButton')"
            icon="i-lucide-plus"
            size="sm"
            @click.prevent="openAddOverride"
          />
        </summary>

        <div class="mt-4">
          <p v-if="overrides.length === 0" class="text-sm text-muted italic">
            {{ t('settings.overrides.empty') }}
          </p>
          <ul v-else class="divide-y divide-default">
            <li
              v-for="ov in overrides"
              :key="ov.date"
              class="flex items-center gap-3 py-3"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-medium">{{ formatOverrideDate(ov.date) }}</span>
                  <UBadge
                    :label="ov.closed ? t('settings.overrides.labelClosed') : t('settings.overrides.labelSpecialHours')"
                    :color="ov.closed ? 'error' : 'warning'"
                    variant="subtle"
                    size="sm"
                  />
                </div>
                <p v-if="ov.note" class="text-xs text-muted mt-0.5">{{ ov.note }}</p>
                <p v-if="!ov.closed && ov.schedule" class="text-xs text-muted mt-0.5 tabular-nums">
                  {{ ov.schedule.open }}–{{ ov.schedule.close }}<span v-if="ov.schedule.dinnerOpen && ov.schedule.dinnerClose"> | {{ ov.schedule.dinnerOpen }}–{{ ov.schedule.dinnerClose }}</span>
                </p>
              </div>
              <UButton
                icon="i-lucide-pencil"
                size="sm"
                variant="soft"
                :aria-label="t('settings.overrides.editButton')"
                @click.prevent="openEditOverride(ov)"
              />
              <UButton
                icon="i-lucide-trash"
                size="sm"
                color="error"
                variant="soft"
                :aria-label="t('settings.overrides.deleteButton')"
                @click.prevent="deleteOverride(ov.date)"
              />
            </li>
          </ul>
        </div>
      </details>
    </UPageCard>

    <!-- Override modal -->
    <UModal v-model:open="modalOpen">
      <template #content>
        <div class="p-5 space-y-4 min-w-0 sm:min-w-[28rem]">
          <h3 class="text-lg font-semibold">
            {{ editingDate ? t('settings.overrides.modalTitleEdit') : t('settings.overrides.modalTitleAdd') }}
          </h3>

          <div>
            <label class="block text-sm font-medium mb-1">{{ t('settings.overrides.fieldDate') }}</label>
            <input
              v-model="form.date"
              type="date"
              :disabled="!!editingDate"
              class="border border-default rounded px-3 py-2 text-sm bg-default w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">{{ t('settings.overrides.fieldType') }}</label>
            <div class="flex gap-2">
              <UButton
                :label="t('settings.overrides.typeClosed')"
                :variant="form.closed ? 'solid' : 'soft'"
                :color="form.closed ? 'error' : 'neutral'"
                size="sm"
                @click.prevent="form.closed = true"
              />
              <UButton
                :label="t('settings.overrides.typeSpecial')"
                :variant="!form.closed ? 'solid' : 'soft'"
                :color="!form.closed ? 'warning' : 'neutral'"
                size="sm"
                @click.prevent="form.closed = false"
              />
            </div>
          </div>

          <div v-if="!form.closed" class="space-y-2">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm w-16 shrink-0">Lunch</span>
              <input v-model="form.schedule.open" type="time" class="border border-default rounded px-2 py-1 text-sm bg-default" />
              <span class="text-muted">–</span>
              <input v-model="form.schedule.close" type="time" class="border border-default rounded px-2 py-1 text-sm bg-default" />
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm w-16 shrink-0">Dinner</span>
              <input v-model="form.schedule.dinnerOpen" type="time" class="border border-default rounded px-2 py-1 text-sm bg-default" />
              <span class="text-muted">–</span>
              <input v-model="form.schedule.dinnerClose" type="time" class="border border-default rounded px-2 py-1 text-sm bg-default" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">{{ t('settings.overrides.fieldNote') }}</label>
            <input
              v-model="form.note"
              type="text"
              :placeholder="t('settings.overrides.notePlaceholder')"
              class="border border-default rounded px-3 py-2 text-sm bg-default w-full"
            />
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              :label="t('settings.overrides.cancel')"
              variant="soft"
              color="neutral"
              @click.prevent="modalOpen = false"
            />
            <UButton
              :label="t('settings.overrides.save')"
              icon="i-lucide-save"
              :loading="savingOverride"
              @click.prevent="saveOverride"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useGqlSubscription, useNuxtApp } from '#imports'
import ScheduleEditor from '~/components/ScheduleEditor.vue'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const { $gqlFetch } = useNuxtApp()

interface DaySchedule {
  open: string
  close: string
  dinnerOpen: string
  dinnerClose: string
}

type OpeningHoursMap = Record<string, DaySchedule | null>

interface ScheduleOverride {
  date: string
  closed: boolean
  schedule: { open: string; close: string; dinnerOpen?: string | null; dinnerClose?: string | null } | null
  note: string | null
  updatedAt: string
}

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
const preparationMinutes = ref(30)
const updatingOrdering = ref(false)
const updatingHours = ref(false)
const updatingOrderingHours = ref(false)
const updatingPreparation = ref(false)
const localHours: OpeningHoursMap = reactive({
  monday: null, tuesday: null, wednesday: null, thursday: null,
  friday: null, saturday: null, sunday: null,
})
const localOrderingHours: OpeningHoursMap = reactive({
  monday: null, tuesday: null, wednesday: null, thursday: null,
  friday: null, saturday: null, sunday: null,
})
const overrides = ref<ScheduleOverride[]>([])

const hasOrderingHours = computed(() =>
  days.some(d => localOrderingHours[d.key] !== null)
)

const GET_CONFIG = gql`
  query {
    restaurantConfig {
      orderingEnabled
      openingHours
      orderingHours
      preparationMinutes
    }
  }
`

const GET_OVERRIDES = gql`
  query ScheduleOverrides($from: DateTime!, $to: DateTime!) {
    scheduleOverrides(from: $from, to: $to) {
      date
      closed
      schedule { open close dinnerOpen dinnerClose }
      note
      updatedAt
    }
  }
`

const UPDATE_ORDERING = gql`
  mutation UpdateOrderingEnabled($enabled: Boolean!) {
    updateOrderingEnabled(enabled: $enabled) { orderingEnabled }
  }
`

const UPDATE_HOURS = gql`
  mutation UpdateOpeningHours($hours: OpeningHoursInput!) {
    updateOpeningHours(hours: $hours) { openingHours }
  }
`

const UPDATE_ORDERING_HOURS = gql`
  mutation UpdateOrderingHours($hours: OpeningHoursInput!) {
    updateOrderingHours(hours: $hours) { orderingHours }
  }
`

const UPDATE_PREPARATION = gql`
  mutation UpdatePreparationMinutes($minutes: Int!) {
    updatePreparationMinutes(minutes: $minutes) { preparationMinutes }
  }
`

const UPSERT_OVERRIDE = gql`
  mutation UpsertScheduleOverride($input: ScheduleOverrideInput!) {
    upsertScheduleOverride(input: $input) {
      date closed schedule { open close dinnerOpen dinnerClose } note updatedAt
    }
  }
`

const DELETE_OVERRIDE = gql`
  mutation DeleteScheduleOverride($date: DateTime!) {
    deleteScheduleOverride(date: $date)
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
  const data = await $gqlFetch<{ restaurantConfig: { orderingEnabled: boolean; openingHours: OpeningHoursMap; orderingHours: OpeningHoursMap | null; preparationMinutes: number } }>(
    print(GET_CONFIG)
  )
  if (data) {
    orderingEnabled.value = data.restaurantConfig.orderingEnabled
    preparationMinutes.value = data.restaurantConfig.preparationMinutes
    for (const day of days) {
      localHours[day.key] = parseSchedule(data.restaurantConfig.openingHours[day.key])
      localOrderingHours[day.key] = data.restaurantConfig.orderingHours
        ? parseSchedule(data.restaurantConfig.orderingHours[day.key])
        : null
    }
  }
}

const loadOverrides = async () => {
  const from = new Date().toISOString()
  const to = new Date(Date.now() + 366 * 24 * 60 * 60 * 1000).toISOString()
  const data = await $gqlFetch<{ scheduleOverrides: ScheduleOverride[] }>(
    print(GET_OVERRIDES), { variables: { from, to } }
  )
  if (data) {
    overrides.value = data.scheduleOverrides
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

const toggleCustomOrderingHours = (enabled: boolean) => {
  for (const day of days) {
    localOrderingHours[day.key] = enabled
      ? (localHours[day.key] ? { ...localHours[day.key]! } : null)
      : null
  }
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

const savePreparation = async () => {
  if (preparationMinutes.value < 15 || preparationMinutes.value > 240) return
  updatingPreparation.value = true
  try {
    await $gqlFetch(print(UPDATE_PREPARATION), { variables: { minutes: preparationMinutes.value } })
  } finally {
    updatingPreparation.value = false
  }
}

// Override modal state
const modalOpen = ref(false)
const editingDate = ref<string | null>(null)
const savingOverride = ref(false)
const form = reactive({
  date: '',
  closed: true,
  note: '',
  schedule: { open: '11:00', close: '14:00', dinnerOpen: '17:00', dinnerClose: '22:00' },
})

const resetForm = () => {
  form.date = ''
  form.closed = true
  form.note = ''
  form.schedule.open = '11:00'
  form.schedule.close = '14:00'
  form.schedule.dinnerOpen = '17:00'
  form.schedule.dinnerClose = '22:00'
  editingDate.value = null
}

const openAddOverride = () => {
  resetForm()
  // Default to tomorrow
  const d = new Date()
  d.setDate(d.getDate() + 1)
  form.date = d.toISOString().slice(0, 10)
  modalOpen.value = true
}

const openEditOverride = (ov: ScheduleOverride) => {
  resetForm()
  editingDate.value = ov.date
  form.date = ov.date.slice(0, 10)
  form.closed = ov.closed
  form.note = ov.note ?? ''
  if (ov.schedule) {
    form.schedule.open = ov.schedule.open
    form.schedule.close = ov.schedule.close
    form.schedule.dinnerOpen = ov.schedule.dinnerOpen ?? ''
    form.schedule.dinnerClose = ov.schedule.dinnerClose ?? ''
  }
  modalOpen.value = true
}

const saveOverride = async () => {
  if (!form.date) return
  savingOverride.value = true
  try {
    const input: Record<string, unknown> = {
      date: new Date(`${form.date}T00:00:00`).toISOString(),
      closed: form.closed,
      note: form.note || null,
    }
    if (!form.closed) {
      input.schedule = {
        open: form.schedule.open,
        close: form.schedule.close,
        ...(form.schedule.dinnerOpen ? { dinnerOpen: form.schedule.dinnerOpen } : {}),
        ...(form.schedule.dinnerClose ? { dinnerClose: form.schedule.dinnerClose } : {}),
      }
    }
    await $gqlFetch(print(UPSERT_OVERRIDE), { variables: { input } })
    modalOpen.value = false
    await loadOverrides()
  } finally {
    savingOverride.value = false
  }
}

const deleteOverride = async (date: string) => {
  if (!confirm(t('settings.overrides.confirmDelete'))) return
  await $gqlFetch(print(DELETE_OVERRIDE), { variables: { date } })
  await loadOverrides()
}

const formatOverrideDate = (iso: string) => {
  const d = new Date(iso)
  return new Intl.DateTimeFormat(locale.value, {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).format(d)
}

const SUB_CONFIG_UPDATED = gql`
  subscription RestaurantConfigUpdated {
    restaurantConfigUpdated {
      orderingEnabled
      openingHours
      orderingHours
      preparationMinutes
    }
  }
`

const SUB_OVERRIDES_UPDATED = gql`
  subscription ScheduleOverridesUpdated {
    scheduleOverridesUpdated {
      date closed schedule { open close dinnerOpen dinnerClose } note updatedAt
    }
  }
`

onMounted(() => {
  loadConfig()
  loadOverrides()

  const { data: liveConfig } = useGqlSubscription<{ restaurantConfigUpdated: { orderingEnabled: boolean; openingHours: OpeningHoursMap; orderingHours: OpeningHoursMap | null; preparationMinutes: number } }>(
    print(SUB_CONFIG_UPDATED)
  )
  watch(liveConfig, (val) => {
    if (!val?.restaurantConfigUpdated) return
    const cfg = val.restaurantConfigUpdated
    orderingEnabled.value = cfg.orderingEnabled
    preparationMinutes.value = cfg.preparationMinutes
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

  const { data: liveOverrides } = useGqlSubscription<{ scheduleOverridesUpdated: ScheduleOverride[] }>(
    print(SUB_OVERRIDES_UPDATED)
  )
  watch(liveOverrides, (val) => {
    if (val?.scheduleOverridesUpdated) {
      overrides.value = val.scheduleOverridesUpdated
    }
  })
})
</script>
