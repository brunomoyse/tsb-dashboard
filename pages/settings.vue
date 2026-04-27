<template>
  <div class="p-3 sm:p-4 md:p-6 max-w-4xl mx-auto space-y-3 sm:space-y-4">
    <h1 class="text-lg sm:text-2xl font-bold">{{ t('settings.title') }}</h1>

    <!-- Online ordering toggle -->
    <div class="bg-default ring ring-default rounded-xl px-4 py-4 sm:px-5">
      <div class="flex items-center justify-between gap-4">
        <div class="min-w-0">
          <h2 class="text-base sm:text-lg font-semibold leading-tight">{{ t('settings.ordering.title') }}</h2>
          <p class="text-xs sm:text-sm text-muted mt-1 leading-snug">
            {{ t('settings.ordering.description') }}
          </p>
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
    </div>

    <!-- Preparation time -->
    <div class="bg-default ring ring-default rounded-xl px-4 py-4 sm:px-5">
      <div class="flex items-start gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-base sm:text-lg font-semibold leading-tight">{{ t('settings.preparation.title') }}</h2>
            <UBadge
              v-if="preparationDirty"
              :label="t('settings.unsaved')"
              color="warning"
              variant="subtle"
              size="sm"
            />
          </div>
          <p class="text-xs sm:text-sm text-muted mt-1 leading-snug">
            {{ t('settings.preparation.description') }}
          </p>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-center gap-3 sm:justify-start">
        <UButton
          icon="i-lucide-minus"
          variant="soft"
          color="neutral"
          size="lg"
          square
          :disabled="preparationMinutes <= 15"
          :aria-label="t('common.actions')"
          @click.prevent="adjustPreparation(-5)"
        />
        <div class="flex items-baseline gap-1.5 min-w-[120px] justify-center">
          <span class="text-3xl font-semibold tabular-nums leading-none">{{ preparationMinutes }}</span>
          <span class="text-sm text-muted">{{ t('settings.preparation.unit') }}</span>
        </div>
        <UButton
          icon="i-lucide-plus"
          variant="soft"
          color="neutral"
          size="lg"
          square
          :disabled="preparationMinutes >= 240"
          :aria-label="t('common.actions')"
          @click.prevent="adjustPreparation(5)"
        />
      </div>

      <UButton
        v-if="preparationDirty"
        :label="t('common.save')"
        icon="i-lucide-save"
        :loading="updatingPreparation"
        block
        class="mt-4"
        @click.prevent="savePreparation"
      />
    </div>

    <!-- Opening hours -->
    <SettingsSection
      v-model:open="openingHoursOpen"
      :title="t('settings.hours.title')"
      :description="t('settings.hours.description')"
      :dirty="openingHoursDirty"
    >
      <div class="space-y-4">
        <ScheduleEditor :hours="localHours" :days="days" @toggle-day="toggleDay" />
        <UButton
          v-if="openingHoursDirty"
          :label="t('common.save')"
          icon="i-lucide-save"
          :loading="updatingHours"
          block
          @click="saveOpeningHours"
        />
      </div>
    </SettingsSection>

    <!-- Ordering hours -->
    <SettingsSection
      v-model:open="orderingHoursOpen"
      :title="t('settings.orderingHours.title')"
      :description="t('settings.orderingHours.description')"
      :dirty="orderingHoursDirty"
    >
      <div class="space-y-4">
        <div class="flex items-center justify-between gap-4 py-1">
          <span class="text-sm leading-snug">{{ t('settings.orderingHours.customHoursSwitch') }}</span>
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
        <p
          v-else
          class="text-xs sm:text-sm text-muted italic"
        >
          {{ t('settings.orderingHours.fallbackNotice') }}
        </p>
        <UButton
          v-if="orderingHoursDirty"
          :label="t('common.save')"
          icon="i-lucide-save"
          :loading="updatingOrderingHours"
          block
          @click="saveOrderingHours"
        />
      </div>
    </SettingsSection>

    <!-- Schedule overrides -->
    <SettingsSection
      v-model:open="overridesOpen"
      :title="t('settings.overrides.title')"
      :description="t('settings.overrides.description')"
    >
      <template #actions>
        <UButton
          icon="i-lucide-plus"
          size="sm"
          square
          :aria-label="t('settings.overrides.addButton')"
          @click="openAddOverride"
        />
      </template>

      <!-- Empty state -->
      <div
        v-if="overrides.length === 0"
        class="py-8 flex flex-col items-center text-center gap-3"
      >
        <div class="size-12 rounded-full bg-elevated flex items-center justify-center">
          <UIcon name="i-lucide-calendar-off" class="size-6 text-muted" />
        </div>
        <p class="text-sm text-muted max-w-xs">{{ t('settings.overrides.empty') }}</p>
        <UButton
          :label="t('settings.overrides.addButton')"
          icon="i-lucide-plus"
          size="sm"
          variant="soft"
          @click="openAddOverride"
        />
      </div>

      <!-- Overrides list -->
      <ul v-else class="space-y-2">
        <li v-for="ov in overrides" :key="ov.date">
          <div
            role="button"
            tabindex="0"
            class="rounded-xl ring ring-default bg-elevated/50 p-3 sm:p-4 flex items-start gap-3 cursor-pointer transition-colors hover:bg-elevated active:bg-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            @click="openEditOverride(ov)"
            @keydown.enter.prevent="openEditOverride(ov)"
            @keydown.space.prevent="openEditOverride(ov)"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-medium text-sm">{{ formatOverrideDate(ov.date) }}</span>
                <UBadge
                  :label="ov.closed ? t('settings.overrides.labelClosed') : t('settings.overrides.labelSpecialHours')"
                  :color="ov.closed ? 'error' : 'warning'"
                  variant="subtle"
                  size="sm"
                />
              </div>
              <p v-if="ov.note" class="text-xs text-muted mt-1 line-clamp-2">{{ ov.note }}</p>
              <p
                v-if="!ov.closed && ov.schedule"
                class="text-xs text-muted mt-1 tabular-nums"
              >
                {{ ov.schedule.open }}–{{ ov.schedule.close }}<span v-if="ov.schedule.dinnerOpen && ov.schedule.dinnerClose"> · {{ ov.schedule.dinnerOpen }}–{{ ov.schedule.dinnerClose }}</span>
              </p>
            </div>
            <UDropdownMenu :items="overrideMenuItems(ov)" :content="{ align: 'end' }">
              <UButton
                icon="i-lucide-ellipsis-vertical"
                variant="ghost"
                color="neutral"
                size="sm"
                square
                :aria-label="t('common.actions')"
                @click.stop
              />
            </UDropdownMenu>
          </div>
        </li>
      </ul>
    </SettingsSection>

    <!-- Override editor: bottom sheet on mobile, side panel on desktop -->
    <USlideover
      v-model:open="modalOpen"
      :side="sheetSide"
      :ui="sheetUi"
      :title="editingDate ? t('settings.overrides.modalTitleEdit') : t('settings.overrides.modalTitleAdd')"
    >
      <template #body>
        <div class="space-y-5">
          <!-- Date -->
          <div>
            <label class="block text-sm font-medium mb-1.5">{{ t('settings.overrides.fieldDate') }}</label>
            <input
              v-model="form.date"
              type="date"
              :disabled="!!editingDate"
              class="border border-default rounded-lg px-3 py-2.5 text-base bg-default w-full disabled:opacity-60"
            >
          </div>

          <!-- Type segmented control -->
          <div>
            <label class="block text-sm font-medium mb-1.5">{{ t('settings.overrides.fieldType') }}</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="flex flex-col items-center justify-center rounded-xl border-2 transition-colors py-3 cursor-pointer min-h-[68px]"
                :class="form.closed
                  ? 'border-error bg-error/5 text-error'
                  : 'border-default bg-default text-default hover:bg-elevated'"
                @click.prevent="form.closed = true"
              >
                <UIcon name="i-lucide-x-circle" class="size-5 mb-1" />
                <span class="text-sm font-medium">{{ t('settings.overrides.typeClosed') }}</span>
              </button>
              <button
                type="button"
                class="flex flex-col items-center justify-center rounded-xl border-2 transition-colors py-3 cursor-pointer min-h-[68px]"
                :class="!form.closed
                  ? 'border-warning bg-warning/5 text-warning'
                  : 'border-default bg-default text-default hover:bg-elevated'"
                @click.prevent="form.closed = false"
              >
                <UIcon name="i-lucide-clock" class="size-5 mb-1" />
                <span class="text-sm font-medium">{{ t('settings.overrides.typeSpecial') }}</span>
              </button>
            </div>
          </div>

          <!-- Special hours -->
          <div v-if="!form.closed" class="space-y-3">
            <div>
              <label class="block text-xs uppercase tracking-wide text-muted mb-1.5">
                {{ t('settings.hours.lunch') }}
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model="form.schedule.open"
                  type="time"
                  class="flex-1 min-w-0 border border-default rounded-lg px-3 py-2.5 text-base bg-default tabular-nums"
                >
                <span class="text-muted">–</span>
                <input
                  v-model="form.schedule.close"
                  type="time"
                  class="flex-1 min-w-0 border border-default rounded-lg px-3 py-2.5 text-base bg-default tabular-nums"
                >
              </div>
            </div>
            <div>
              <label class="block text-xs uppercase tracking-wide text-muted mb-1.5">
                {{ t('settings.hours.dinner') }}
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model="form.schedule.dinnerOpen"
                  type="time"
                  class="flex-1 min-w-0 border border-default rounded-lg px-3 py-2.5 text-base bg-default tabular-nums"
                >
                <span class="text-muted">–</span>
                <input
                  v-model="form.schedule.dinnerClose"
                  type="time"
                  class="flex-1 min-w-0 border border-default rounded-lg px-3 py-2.5 text-base bg-default tabular-nums"
                >
              </div>
            </div>
          </div>

          <!-- Note -->
          <div>
            <label class="block text-sm font-medium mb-1.5">{{ t('settings.overrides.fieldNote') }}</label>
            <input
              v-model="form.note"
              type="text"
              :placeholder="t('settings.overrides.notePlaceholder')"
              class="border border-default rounded-lg px-3 py-2.5 text-base bg-default w-full"
            >
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 w-full">
          <UButton
            :label="t('settings.overrides.cancel')"
            variant="soft"
            color="neutral"
            class="flex-1 justify-center"
            @click.prevent="modalOpen = false"
          />
          <UButton
            :label="t('settings.overrides.save')"
            icon="i-lucide-save"
            :loading="savingOverride"
            class="flex-1 justify-center"
            @click.prevent="saveOverride"
          />
        </div>
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useGqlSubscription, useNuxtApp } from '#imports'
import type { DropdownMenuItem } from '@nuxt/ui'
import ScheduleEditor from '~/components/ScheduleEditor.vue'
import SettingsSection from '~/components/SettingsSection.vue'
import gql from 'graphql-tag'
import { onBeforeRouteLeave } from 'vue-router'
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

// Section open state
const openingHoursOpen = ref(true)
const orderingHoursOpen = ref(false)
const overridesOpen = ref(false)

/*
 * Per-section dirty state. The `syncing` flag suppresses the deep watchers
 * below while applying server data, so loading config doesn't flag the form dirty.
 */
const preparationDirty = ref(false)
const openingHoursDirty = ref(false)
const orderingHoursDirty = ref(false)
const isAnyDirty = computed(() => preparationDirty.value || openingHoursDirty.value || orderingHoursDirty.value)
let syncing = false

const resetDirty = () => {
  preparationDirty.value = false
  openingHoursDirty.value = false
  orderingHoursDirty.value = false
}

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

// Mobile detection for slideover side
const isMobile = ref(false)
const sheetSide = computed<'right' | 'bottom'>(() => isMobile.value ? 'bottom' : 'right')
const sheetUi = computed(() =>
  isMobile.value
    ? { content: 'max-h-[92dvh] rounded-t-2xl' }
    : { content: 'max-w-md' }
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
    syncing = true
    orderingEnabled.value = data.restaurantConfig.orderingEnabled
    preparationMinutes.value = data.restaurantConfig.preparationMinutes
    for (const day of days) {
      localHours[day.key] = parseSchedule(data.restaurantConfig.openingHours[day.key])
      localOrderingHours[day.key] = data.restaurantConfig.orderingHours
        ? parseSchedule(data.restaurantConfig.orderingHours[day.key])
        : null
    }
    await nextTick()
    syncing = false
    resetDirty()
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
  openingHoursDirty.value = true
}

const toggleOrderingDay = (dayKey: string, open: boolean) => {
  localOrderingHours[dayKey] = open ? defaultSchedule() : null
  orderingHoursDirty.value = true
}

const toggleCustomOrderingHours = (enabled: boolean) => {
  for (const day of days) {
    localOrderingHours[day.key] = enabled
      ? (localHours[day.key] ? { ...localHours[day.key]! } : null)
      : null
  }
  orderingHoursDirty.value = true
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
    openingHoursDirty.value = false
  } finally {
    updatingHours.value = false
  }
}

const saveOrderingHours = async () => {
  updatingOrderingHours.value = true
  try {
    await $gqlFetch(print(UPDATE_ORDERING_HOURS), { variables: { hours: buildHoursInput(localOrderingHours) } })
    orderingHoursDirty.value = false
  } finally {
    updatingOrderingHours.value = false
  }
}

const adjustPreparation = (delta: number) => {
  const next = Math.min(240, Math.max(15, preparationMinutes.value + delta))
  if (next !== preparationMinutes.value) {
    preparationMinutes.value = next
  }
}

const savePreparation = async () => {
  if (preparationMinutes.value < 15 || preparationMinutes.value > 240) return
  updatingPreparation.value = true
  try {
    await $gqlFetch(print(UPDATE_PREPARATION), { variables: { minutes: preparationMinutes.value } })
    preparationDirty.value = false
  } finally {
    updatingPreparation.value = false
  }
}

watch(preparationMinutes, (val, old) => {
  if (!syncing && val !== old) preparationDirty.value = true
})

// Watch deep into localHours / localOrderingHours so per-day time edits flag dirty
watch(localHours, () => { if (!syncing) openingHoursDirty.value = true }, { deep: true })
watch(localOrderingHours, () => { if (!syncing) orderingHoursDirty.value = true }, { deep: true })

onBeforeRouteLeave(() => {
  if (isAnyDirty.value) {
    return window.confirm(t('settings.leaveConfirm'))
  }
})

// Override sheet state
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
    form.schedule.dinnerOpen = ov.schedule.dinnerOpen ?? '17:00'
    form.schedule.dinnerClose = ov.schedule.dinnerClose ?? '22:00'
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

const overrideMenuItems = (ov: ScheduleOverride): DropdownMenuItem[][] => [
  [
    {
      label: t('settings.overrides.editButton'),
      icon: 'i-lucide-pencil',
      onSelect: () => openEditOverride(ov),
    },
    {
      label: t('settings.overrides.deleteButton'),
      icon: 'i-lucide-trash',
      color: 'error',
      onSelect: () => deleteOverride(ov.date),
    },
  ],
]

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

// Subscribe in setup so onScopeDispose ties to the component scope; in onMounted it leaks the WebSocket.
const { data: liveConfig } = useGqlSubscription<{ restaurantConfigUpdated: { orderingEnabled: boolean; openingHours: OpeningHoursMap; orderingHours: OpeningHoursMap | null; preparationMinutes: number } }>(
  print(SUB_CONFIG_UPDATED)
)
watch(liveConfig, async (val) => {
  if (!val?.restaurantConfigUpdated) return
  const cfg = val.restaurantConfigUpdated
  syncing = true
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
  await nextTick()
  syncing = false
  resetDirty()
})

const { data: liveOverrides } = useGqlSubscription<{ scheduleOverridesUpdated: ScheduleOverride[] }>(
  print(SUB_OVERRIDES_UPDATED)
)
watch(liveOverrides, (val) => {
  if (val?.scheduleOverridesUpdated) {
    overrides.value = val.scheduleOverridesUpdated
  }
})

onMounted(() => {
  loadConfig()
  loadOverrides()

  const mql = window.matchMedia('(max-width: 767px)')
  isMobile.value = mql.matches
  mql.addEventListener('change', (e) => { isMobile.value = e.matches })
})
</script>
