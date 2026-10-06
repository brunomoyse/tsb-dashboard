import type { Translate } from '~/utils/translate'
import { hasText } from '~/utils/guards'
import { overrideDateKey, overrideDateRange, overrideDateToGql } from '~/utils/scheduleOverride'

/*
 * Pure logic of pages/settings.vue: opening-hours maps and their API input, the preparation time bounds, the schedule
 * override form and the inputs it produces, and the "save every dirty section" sequencing.
 */

export interface DaySchedule {
  open: string
  close: string
  dinnerOpen: string
  dinnerClose: string
}

/** A week of schedules keyed by day name; null = closed that day. */
export type OpeningHoursMap = Record<string, DaySchedule | null>

export interface ScheduleOverride {
  date: string
  closed: boolean
  schedule: {
    open: string
    close: string
    dinnerOpen?: string | null
    dinnerClose?: string | null
  } | null
  note: string | null
  updatedAt: string
}

export const DAYS = [
  { key: 'monday' },
  { key: 'tuesday' },
  { key: 'wednesday' },
  { key: 'thursday' },
  { key: 'friday' },
  { key: 'saturday' },
  { key: 'sunday' },
]

/** What a newly opened day gets. */
export const defaultSchedule = (): DaySchedule => ({
  open: '11:00',
  close: '14:00',
  dinnerOpen: '17:00',
  dinnerClose: '22:00',
})

/** A schedule from the API with its empty times replaced by the defaults; null (closed) stays null. */
export const parseSchedule = (schedule: DaySchedule | null | undefined): DaySchedule | null => {
  if (!schedule) return null
  const defaults = defaultSchedule()
  return {
    open: schedule.open || defaults.open,
    close: schedule.close || defaults.close,
    dinnerOpen: schedule.dinnerOpen || defaults.dinnerOpen,
    dinnerClose: schedule.dinnerClose || defaults.dinnerClose,
  }
}

/** The OpeningHoursInput sent to the API: every day present, a closed day as null, empty dinner times left out. */
export const buildHoursInput = (hours: OpeningHoursMap) => {
  const input: Record<
    string,
    { open: string; close: string; dinnerOpen?: string; dinnerClose?: string } | null
  > = {}
  for (const day of DAYS) {
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

/** The ordering hours "like the opening hours": a copy of each open day, null for a closed one. */
export const copyOpeningHours = (hours: OpeningHoursMap): OpeningHoursMap => {
  const copy: OpeningHoursMap = {}
  for (const day of DAYS) {
    copy[day.key] = hours[day.key] ? { ...hours[day.key]! } : null
  }
  return copy
}

export const MIN_PREPARATION_MINUTES = 15
export const MAX_PREPARATION_MINUTES = 240

/** The preparation time after a +/- step, kept within 15 to 240 minutes. */
export const adjustPreparation = (current: number, delta: number): number =>
  Math.min(MAX_PREPARATION_MINUTES, Math.max(MIN_PREPARATION_MINUTES, current + delta))

export const isValidPreparation = (minutes: number): boolean =>
  minutes >= MIN_PREPARATION_MINUTES && minutes <= MAX_PREPARATION_MINUTES

/** "6 jours ouverts · 11:30-14:00 · 17:30-22:00": open-day count + most common lunch / dinner ranges. */
export const hoursSummary = (hours: OpeningHoursMap, t: Translate): string => {
  const open = DAYS.map((d) => hours[d.key]).filter((h): h is DaySchedule => Boolean(h))
  const mostCommon = (values: string[]) => {
    const counts = new Map<string, number>()
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  }
  const parts = [t('settings.mobile.daysOpen', { count: open.length }, open.length)]
  const lunch = mostCommon(open.filter((h) => h.open && h.close).map((h) => `${h.open}-${h.close}`))
  const dinner = mostCommon(
    open
      .filter((h) => h.dinnerOpen && h.dinnerClose)
      .map((h) => `${h.dinnerOpen}-${h.dinnerClose}`),
  )
  if (hasText(lunch)) parts.push(lunch)
  if (hasText(dinner)) parts.push(dinner)
  return parts.join(' · ')
}

// ─── Schedule overrides ─────────────────────────────────────────────────────────

/** Note and/or hours line of an override row. */
export const overrideDetail = (ov: ScheduleOverride): string => {
  const parts: string[] = []
  if (!ov.closed && ov.schedule) {
    parts.push(
      hasText(ov.schedule.dinnerOpen) && hasText(ov.schedule.dinnerClose)
        ? `${ov.schedule.open}-${ov.schedule.close} · ${ov.schedule.dinnerOpen}-${ov.schedule.dinnerClose}`
        : `${ov.schedule.open}-${ov.schedule.close}`,
    )
  }
  if (hasText(ov.note)) parts.push(ov.note)
  return parts.join(' · ')
}

/** The override sheet's model. */
export interface OverrideForm {
  /** First calendar day, "YYYY-MM-DD". */
  date: string
  /** Last calendar day of a range, "" for a single day. */
  dateEnd: string
  closed: boolean
  note: string
  schedule: DaySchedule
}

export const emptyOverrideForm = (): OverrideForm => ({
  date: '',
  dateEnd: '',
  closed: true,
  note: '',
  schedule: defaultSchedule(),
})

/** Seeds the sheet from an existing override (editing one day: no range). */
export const overrideToForm = (ov: ScheduleOverride): OverrideForm => {
  const defaults = defaultSchedule()
  return {
    ...emptyOverrideForm(),
    date: overrideDateKey(ov.date),
    closed: ov.closed,
    note: ov.note ?? '',
    schedule: ov.schedule
      ? {
          open: ov.schedule.open,
          close: ov.schedule.close,
          dinnerOpen: ov.schedule.dinnerOpen ?? defaults.dinnerOpen,
          dinnerClose: ov.schedule.dinnerClose ?? defaults.dinnerClose,
        }
      : defaults,
  }
}

/** Above this many days, saving a range asks for a confirmation. */
export const OVERRIDE_RANGE_CONFIRM_ABOVE = 7

/** The days a save covers: the edited day alone, or the whole range (an end before the start gives the start only). */
export const overrideDates = (form: OverrideForm, editingDate: string | null): string[] =>
  hasText(editingDate) ? [form.date] : overrideDateRange(form.date, form.dateEnd)

/**
 * One ScheduleOverrideInput per day: a closed day carries no schedule, an open one its hours (empty dinner times left
 * out), and every day is sent as UTC midnight of its calendar date.
 */
export interface ScheduleOverrideInput {
  date: string
  closed: boolean
  note: string | null
  schedule?: { open: string; close: string; dinnerOpen?: string; dinnerClose?: string }
}

export const buildOverrideInputs = (form: OverrideForm, dates: string[]): ScheduleOverrideInput[] =>
  dates.map((date) => ({
    closed: form.closed,
    note: form.note || null,
    ...(form.closed
      ? {}
      : {
          schedule: {
            open: form.schedule.open,
            close: form.schedule.close,
            ...(form.schedule.dinnerOpen ? { dinnerOpen: form.schedule.dinnerOpen } : {}),
            ...(form.schedule.dinnerClose ? { dinnerClose: form.schedule.dinnerClose } : {}),
          },
        }),
    date: overrideDateToGql(date),
  }))

// ─── Saving ─────────────────────────────────────────────────────────────────────

export interface SaveStep {
  isDirty: () => boolean
  save: () => Promise<void>
}

/**
 * Saves the dirty sections one after the other, in order (each step reads its dirty flag when its turn comes). The
 * first failure stops the sequence and is rethrown: the sections after it stay dirty.
 */
export const saveDirtySteps = async (steps: SaveStep[]): Promise<void> => {
  for (const step of steps) {
    if (step.isDirty()) await step.save()
  }
}
