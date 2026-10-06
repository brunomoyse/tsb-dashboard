// Settings logic: opening-hours maps and the input sent to the API, the preparation time bounds, the schedule override
// form and the inputs it produces, and the sequencing of "save every dirty section".
import { describe, expect, it, vi } from 'vite-plus/test'
import {
  DAYS,
  MAX_PREPARATION_MINUTES,
  MIN_PREPARATION_MINUTES,
  OVERRIDE_RANGE_CONFIRM_ABOVE,
  adjustPreparation,
  buildHoursInput,
  buildOverrideInputs,
  copyOpeningHours,
  defaultSchedule,
  emptyOverrideForm,
  hoursSummary,
  isValidPreparation,
  overrideDates,
  overrideDetail,
  overrideToForm,
  parseSchedule,
  saveDirtySteps,
  type OpeningHoursMap,
  type OverrideForm,
  type ScheduleOverride,
} from '~/utils/settings'
import { fakeT } from '../helpers/i18n'

const weekOf = (schedule: ReturnType<typeof defaultSchedule> | null): OpeningHoursMap =>
  Object.fromEntries(DAYS.map((d) => [d.key, schedule ? { ...schedule } : null]))

describe('opening hours', () => {
  it('lists the seven days, Monday first', () => {
    expect(DAYS.map((d) => d.key)).toEqual([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ])
  })

  it('gives a newly opened day lunch 11:00-14:00 and dinner 17:00-22:00', () => {
    expect(defaultSchedule()).toEqual({
      open: '11:00',
      close: '14:00',
      dinnerOpen: '17:00',
      dinnerClose: '22:00',
    })
    expect(defaultSchedule()).not.toBe(defaultSchedule())
  })

  describe('parseSchedule', () => {
    it('keeps a complete schedule as is', () => {
      const schedule = { open: '12:00', close: '15:00', dinnerOpen: '18:00', dinnerClose: '23:00' }
      expect(parseSchedule(schedule)).toEqual(schedule)
    })

    it.each([null, undefined])('keeps a closed day (%s) closed', (value) => {
      expect(parseSchedule(value)).toBeNull()
    })

    it('replaces each empty time with its default', () => {
      expect(parseSchedule({ open: '', close: '', dinnerOpen: '', dinnerClose: '' })).toEqual(
        defaultSchedule(),
      )
      expect(
        parseSchedule({ open: '10:30', close: '', dinnerOpen: '18:00', dinnerClose: '' }),
      ).toEqual({ open: '10:30', close: '14:00', dinnerOpen: '18:00', dinnerClose: '22:00' })
      // The API leaves the dinner times out of a lunch-only day.
      expect(parseSchedule({ open: '11:00', close: '15:00' } as never)).toEqual({
        open: '11:00',
        close: '15:00',
        dinnerOpen: '17:00',
        dinnerClose: '22:00',
      })
    })

    it('returns a new object', () => {
      const schedule = defaultSchedule()
      expect(parseSchedule(schedule)).not.toBe(schedule)
    })
  })

  describe('buildHoursInput', () => {
    it('sends every day, closed days as null', () => {
      const hours = weekOf(null)
      hours.monday = defaultSchedule()
      const input = buildHoursInput(hours)
      expect(Object.keys(input)).toEqual(DAYS.map((d) => d.key))
      expect(input.monday).toEqual(defaultSchedule())
      expect(input.tuesday).toBeNull()
      expect(input.sunday).toBeNull()
    })

    it('treats a day missing from the map as closed', () => {
      expect(buildHoursInput({}).friday).toBeNull()
    })

    it('leaves out empty dinner times (a lunch-only day)', () => {
      const hours = weekOf(null)
      hours.saturday = { open: '11:00', close: '15:00', dinnerOpen: '', dinnerClose: '' }
      expect(buildHoursInput(hours).saturday).toEqual({ open: '11:00', close: '15:00' })
      hours.saturday = { open: '11:00', close: '15:00', dinnerOpen: '17:00', dinnerClose: '' }
      expect(buildHoursInput(hours).saturday).toEqual({
        open: '11:00',
        close: '15:00',
        dinnerOpen: '17:00',
      })
      hours.saturday = { open: '11:00', close: '15:00', dinnerOpen: '', dinnerClose: '22:00' }
      expect(buildHoursInput(hours).saturday).toEqual({
        open: '11:00',
        close: '15:00',
        dinnerClose: '22:00',
      })
    })
  })

  it('copies the opening hours day by day, without sharing the objects', () => {
    const hours = weekOf(null)
    hours.monday = defaultSchedule()
    const copy = copyOpeningHours(hours)
    expect(copy).toEqual(hours)
    expect(copy.monday).not.toBe(hours.monday)
    copy.monday!.open = '09:00'
    expect(hours.monday.open).toBe('11:00')
    expect(copy.tuesday).toBeNull()
  })

  it('copies a missing day as closed', () => {
    expect(copyOpeningHours({}).monday).toBeNull()
  })
})

describe('preparation time', () => {
  it('moves by the step', () => {
    expect(adjustPreparation(30, 5)).toBe(35)
    expect(adjustPreparation(30, -5)).toBe(25)
  })

  it('stops at 15 and 240 minutes', () => {
    expect(adjustPreparation(MIN_PREPARATION_MINUTES, -5)).toBe(15)
    expect(adjustPreparation(17, -5)).toBe(15)
    expect(adjustPreparation(MAX_PREPARATION_MINUTES, 5)).toBe(240)
    expect(adjustPreparation(238, 5)).toBe(240)
  })

  it('pulls an out-of-range value back into range', () => {
    expect(adjustPreparation(500, 0)).toBe(240)
    expect(adjustPreparation(0, 0)).toBe(15)
  })

  it('accepts 15 to 240 minutes, inclusive', () => {
    expect([14, 15, 30, 240, 241].map(isValidPreparation)).toEqual([false, true, true, true, false])
    expect(isValidPreparation(NaN)).toBe(false)
  })
})

describe('hoursSummary', () => {
  it('counts the open days with a plural-aware message', () => {
    const hours = weekOf(null)
    expect(hoursSummary(hours, fakeT)).toBe('settings.mobile.daysOpen{"count":0}#0')
    hours.monday = defaultSchedule()
    expect(hoursSummary(hours, fakeT)).toBe(
      'settings.mobile.daysOpen{"count":1}#1 · 11:00-14:00 · 17:00-22:00',
    )
  })

  it('shows the most common lunch and dinner ranges', () => {
    const hours = weekOf(null)
    hours.monday = { open: '11:30', close: '14:00', dinnerOpen: '17:30', dinnerClose: '22:00' }
    hours.tuesday = { open: '11:30', close: '14:00', dinnerOpen: '17:00', dinnerClose: '22:00' }
    hours.wednesday = { open: '12:00', close: '14:00', dinnerOpen: '17:30', dinnerClose: '22:00' }
    expect(hoursSummary(hours, fakeT)).toBe(
      'settings.mobile.daysOpen{"count":3}#3 · 11:30-14:00 · 17:30-22:00',
    )
  })

  it('leaves out a range nobody has', () => {
    const hours = weekOf(null)
    hours.monday = { open: '11:00', close: '14:00', dinnerOpen: '', dinnerClose: '' }
    expect(hoursSummary(hours, fakeT)).toBe('settings.mobile.daysOpen{"count":1}#1 · 11:00-14:00')
    hours.monday = { open: '', close: '', dinnerOpen: '17:00', dinnerClose: '22:00' }
    expect(hoursSummary(hours, fakeT)).toBe('settings.mobile.daysOpen{"count":1}#1 · 17:00-22:00')
  })
})

describe('schedule overrides', () => {
  const override = (changes: Partial<ScheduleOverride> = {}): ScheduleOverride => ({
    date: '2026-12-25T00:00:00Z',
    closed: true,
    schedule: null,
    note: null,
    updatedAt: '2026-10-04T10:00:00Z',
    ...changes,
  })

  describe('overrideDetail', () => {
    it('is empty for a closed day without a note', () => {
      expect(overrideDetail(override())).toBe('')
    })

    it('shows the note of a closed day', () => {
      expect(overrideDetail(override({ note: 'Noël' }))).toBe('Noël')
    })

    it('shows the lunch and dinner hours of an open day, then the note', () => {
      const ov = override({
        closed: false,
        schedule: { open: '11:00', close: '14:00', dinnerOpen: '17:00', dinnerClose: '21:00' },
        note: 'Menu spécial',
      })
      expect(overrideDetail(ov)).toBe('11:00-14:00 · 17:00-21:00 · Menu spécial')
    })

    it('shows the lunch hours only when there are no complete dinner hours', () => {
      const lunch = { open: '11:00', close: '14:00' }
      expect(overrideDetail(override({ closed: false, schedule: lunch }))).toBe('11:00-14:00')
      expect(
        overrideDetail(
          override({
            closed: false,
            schedule: { ...lunch, dinnerOpen: '17:00', dinnerClose: null },
          }),
        ),
      ).toBe('11:00-14:00')
    })

    it('ignores the schedule of a day marked closed', () => {
      expect(
        overrideDetail(override({ closed: true, schedule: { open: '11:00', close: '14:00' } })),
      ).toBe('')
    })

    it('shows nothing for an open day without a schedule', () => {
      expect(overrideDetail(override({ closed: false }))).toBe('')
    })
  })

  describe('forms', () => {
    it('starts closed, for no range, with the default hours', () => {
      expect(emptyOverrideForm()).toEqual({
        date: '',
        dateEnd: '',
        closed: true,
        note: '',
        schedule: defaultSchedule(),
      })
    })

    it('is seeded from an override: the calendar date, the note and the hours', () => {
      const form = overrideToForm(
        override({
          date: '2026-12-31T00:00:00Z',
          closed: false,
          note: 'Réveillon',
          schedule: { open: '12:00', close: '15:00', dinnerOpen: '18:00', dinnerClose: '23:30' },
        }),
      )
      expect(form).toEqual({
        date: '2026-12-31',
        dateEnd: '',
        closed: false,
        note: 'Réveillon',
        schedule: { open: '12:00', close: '15:00', dinnerOpen: '18:00', dinnerClose: '23:30' },
      })
    })

    it('is seeded with the default hours when the override has none, and the default dinner when it has no dinner', () => {
      expect(overrideToForm(override()).schedule).toEqual(defaultSchedule())
      expect(overrideToForm(override()).note).toBe('')
      expect(
        overrideToForm(
          override({
            closed: false,
            schedule: { open: '10:00', close: '13:00', dinnerOpen: null },
          }),
        ).schedule,
      ).toEqual({ open: '10:00', close: '13:00', dinnerOpen: '17:00', dinnerClose: '22:00' })
    })
  })

  describe('overrideDates', () => {
    const form = (changes: Partial<OverrideForm>): OverrideForm => ({
      ...emptyOverrideForm(),
      ...changes,
    })

    it('is the one edited day when editing, even with an end date', () => {
      expect(
        overrideDates(form({ date: '2026-12-24', dateEnd: '2026-12-26' }), '2026-12-24T00:00:00Z'),
      ).toEqual(['2026-12-24'])
    })

    it('is the inclusive range when adding', () => {
      expect(overrideDates(form({ date: '2026-12-24', dateEnd: '2026-12-26' }), null)).toEqual([
        '2026-12-24',
        '2026-12-25',
        '2026-12-26',
      ])
    })

    it('is the start only for an empty end, or an end before the start', () => {
      expect(overrideDates(form({ date: '2026-12-24' }), null)).toEqual(['2026-12-24'])
      expect(overrideDates(form({ date: '2026-12-24', dateEnd: '2026-12-20' }), null)).toEqual([
        '2026-12-24',
      ])
    })

    it('asks for a confirmation above 7 days', () => {
      expect(OVERRIDE_RANGE_CONFIRM_ABOVE).toBe(7)
      expect(overrideDates(form({ date: '2026-12-01', dateEnd: '2026-12-07' }), null)).toHaveLength(
        7,
      )
      expect(overrideDates(form({ date: '2026-12-01', dateEnd: '2026-12-08' }), null)).toHaveLength(
        8,
      )
    })
  })

  describe('buildOverrideInputs', () => {
    it('sends a closed day without a schedule, with the date as UTC midnight', () => {
      expect(
        buildOverrideInputs({ ...emptyOverrideForm(), date: '2026-12-25', note: 'Noël' }, [
          '2026-12-25',
        ]),
      ).toEqual([{ closed: true, note: 'Noël', date: '2026-12-25T00:00:00Z' }])
    })

    it('sends an empty note as null', () => {
      expect(buildOverrideInputs(emptyOverrideForm(), ['2026-12-25'])[0]!.note).toBeNull()
    })

    it('sends an open day with its hours, one input per day of the range', () => {
      const form: OverrideForm = {
        ...emptyOverrideForm(),
        closed: false,
        schedule: { open: '12:00', close: '15:00', dinnerOpen: '18:00', dinnerClose: '23:00' },
      }
      expect(buildOverrideInputs(form, ['2026-12-24', '2026-12-25'])).toEqual([
        {
          closed: false,
          note: null,
          schedule: { open: '12:00', close: '15:00', dinnerOpen: '18:00', dinnerClose: '23:00' },
          date: '2026-12-24T00:00:00Z',
        },
        {
          closed: false,
          note: null,
          schedule: { open: '12:00', close: '15:00', dinnerOpen: '18:00', dinnerClose: '23:00' },
          date: '2026-12-25T00:00:00Z',
        },
      ])
    })

    it('leaves out empty dinner times', () => {
      const form: OverrideForm = {
        ...emptyOverrideForm(),
        closed: false,
        schedule: { open: '12:00', close: '15:00', dinnerOpen: '', dinnerClose: '' },
      }
      expect(buildOverrideInputs(form, ['2026-12-24'])[0]!.schedule).toEqual({
        open: '12:00',
        close: '15:00',
      })
    })

    it('sends nothing for no day', () => {
      expect(buildOverrideInputs(emptyOverrideForm(), [])).toEqual([])
    })
  })
})

describe('saveDirtySteps', () => {
  it('saves the dirty sections in order and skips the clean ones', async () => {
    const calls: string[] = []
    const step = (name: string, dirty: boolean) => ({
      isDirty: () => dirty,
      save: () => {
        calls.push(name)
        return Promise.resolve()
      },
    })
    await saveDirtySteps([step('prep', true), step('hours', false), step('ordering', true)])
    expect(calls).toEqual(['prep', 'ordering'])
  })

  it('waits for a section to finish before starting the next one', async () => {
    const events: string[] = []
    let finishFirst: () => void = () => {}
    const first = {
      isDirty: () => true,
      save: () =>
        new Promise<void>((resolve) => {
          events.push('first starts')
          finishFirst = () => {
            events.push('first ends')
            resolve()
          }
        }),
    }
    const second = {
      isDirty: () => true,
      save: () => {
        events.push('second starts')
        return Promise.resolve()
      },
    }
    const done = saveDirtySteps([first, second])
    await Promise.resolve()
    expect(events).toEqual(['first starts'])
    finishFirst()
    await done
    expect(events).toEqual(['first starts', 'first ends', 'second starts'])
  })

  it('reads the dirty flag when the step comes up, not before', async () => {
    let hoursDirty = true
    const hours = vi.fn(async () => {})
    await saveDirtySteps([
      {
        isDirty: () => true,
        save: () => {
          hoursDirty = false // e.g. a live update reset the flag while the first section saved
          return Promise.resolve()
        },
      },
      { isDirty: () => hoursDirty, save: hours },
    ])
    expect(hours).not.toHaveBeenCalled()
  })

  it('stops at the first failure and rethrows it: the later sections are not saved', async () => {
    const later = vi.fn(async () => {})
    await expect(
      saveDirtySteps([
        {
          isDirty: () => true,
          save: () => Promise.reject(new Error('offline')),
        },
        { isDirty: () => true, save: later },
      ]),
    ).rejects.toThrow('offline')
    expect(later).not.toHaveBeenCalled()
  })

  it('does nothing when nothing is dirty', async () => {
    await expect(saveDirtySteps([])).resolves.toBeUndefined()
  })
})
