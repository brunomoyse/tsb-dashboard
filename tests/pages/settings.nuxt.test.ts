// pages/settings.vue: the page loads the restaurant config and shows what the extracted settings logic computes
// (the open-days summary, the preparation time), and the mobile save bar saves the dirty sections one after the other.
// The logic itself is tested in tests/utils/settings.test.ts.
// Run: `vp test run tests/pages/settings.nuxt.test.ts`.
import type * as VueI18NModule from 'vue-i18n'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick, ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { settle } from '../helpers/settle'

const gqlFetch = vi.hoisted(() => vi.fn())

mockNuxtImport('useNuxtApp', async (original) => {
  const { withGqlFetch } = await import('../helpers/gqlFetch')
  return () => withGqlFetch(original(), gqlFetch)
})
mockNuxtImport('useGqlSubscription', () => () => ({ data: ref<unknown>(null) }))
mockNuxtImport('useIsMobile', () => () => ref(true))
mockNuxtImport('useTabBar', () => () => ({ hide: vi.fn(), show: vi.fn() }))
vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../helpers/i18n')
  return { ...(await importOriginal<typeof VueI18NModule>()), useI18n: fakeI18n }
})

const configAnswer = (query: string) =>
  query.includes('restaurantConfig')
    ? {
        restaurantConfig: {
          orderingEnabled: true,
          openingHours: {
            monday: day,
            tuesday: day,
            wednesday: day,
            thursday: null,
            friday: day,
            saturday: day,
            sunday: null,
          },
          orderingHours: null,
          preparationMinutes: 45,
        },
      }
    : { scheduleOverrides: [] }

const day = { open: '11:30', close: '14:00', dinnerOpen: '17:30', dinnerClose: '22:00' }

describe('settings page', () => {
  it('loads the config: opening-hours summary and preparation time', async () => {
    gqlFetch.mockImplementation((query: string) =>
      Promise.resolve(
        query.includes('restaurantConfig')
          ? {
              restaurantConfig: {
                orderingEnabled: true,
                openingHours: {
                  monday: day,
                  tuesday: day,
                  wednesday: day,
                  thursday: null,
                  friday: day,
                  saturday: day,
                  sunday: null,
                },
                orderingHours: null,
                preparationMinutes: 45,
              },
            }
          : { scheduleOverrides: [] },
      ),
    )
    const Page = (await import('~/pages/settings.vue')).default
    const wrapper = await mountSuspended(Page)
    await settle()
    await settle()

    const text = wrapper.text()
    expect(text).toContain('settings.mobile.daysOpen{"count":5}#5 · 11:30-14:00 · 17:30-22:00')
    expect(text).toContain('45')
  })

  describe('the mobile save bar (saveAll)', () => {
    interface SettingsPageVm {
      preparationMinutes: number
      savingAll: boolean
      saveAll: () => Promise<void>
      preparationDirty: boolean
      openingHoursDirty: boolean
      orderingHoursDirty: boolean
      toggleDay: (key: string, open: boolean) => void
      toggleOrderingDay: (key: string, open: boolean) => void
    }

    beforeEach(() => {
      gqlFetch.mockReset()
    })

    const mountDirtyPage = async () => {
      gqlFetch.mockImplementation((query: string) => Promise.resolve(configAnswer(query)))
      const Page = (await import('~/pages/settings.vue')).default
      const wrapper = await mountSuspended(Page)
      await settle()
      await settle()
      const vm = wrapper.vm as unknown as SettingsPageVm
      vm.preparationMinutes = 50
      vm.toggleDay('thursday', true)
      vm.toggleOrderingDay('monday', true)
      await nextTick()
      gqlFetch.mockClear()
      const saveButton = () => wrapper.findAll('button').find((b) => b.text() === 'common.save')
      return { wrapper, vm, saveButton }
    }

    const operations = () =>
      gqlFetch.mock.calls.map(([query]) => /(?:mutation|query)\s+(\w+)/u.exec(query as string)?.[1])

    it('shows the save bar while a section is dirty, and saves preparation, opening hours and ordering hours in that order', async () => {
      const { vm, saveButton } = await mountDirtyPage()
      expect(vm.preparationDirty && vm.openingHoursDirty && vm.orderingHoursDirty).toBe(true)
      const button = saveButton()
      expect(button).toBeDefined()

      gqlFetch.mockResolvedValue({})
      await button!.trigger('click')
      await settle()

      expect(operations()).toEqual([
        'UpdatePreparationMinutes',
        'UpdateOpeningHours',
        'UpdateOrderingHours',
      ])
      expect(gqlFetch.mock.calls[0]![1]).toEqual({ variables: { minutes: 50 } })
      const [, openingOptions] = gqlFetch.mock.calls[1]!
      expect(openingOptions.variables.hours.thursday).toBeTruthy()
      expect(openingOptions.variables.hours.sunday).toBeNull()
      const [, orderingOptions] = gqlFetch.mock.calls[2]!
      expect(orderingOptions.variables.hours.monday).toBeTruthy()
      expect(orderingOptions.variables.hours.tuesday).toBeNull()
      expect(vm.preparationDirty || vm.openingHoursDirty || vm.orderingHoursDirty).toBe(false)
      expect(vm.savingAll).toBe(false)
    })

    it('stops at the first failure: the sections after it are not sent and stay dirty', async () => {
      const { vm } = await mountDirtyPage()
      gqlFetch.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('boom'))

      // saveAll rethrows the failure (called directly: as a click handler it would be an unhandled rejection).
      await expect(vm.saveAll()).rejects.toThrow('boom')

      expect(operations()).toEqual(['UpdatePreparationMinutes', 'UpdateOpeningHours'])
      expect(vm.preparationDirty).toBe(false)
      expect(vm.openingHoursDirty).toBe(true)
      expect(vm.orderingHoursDirty).toBe(true)
      expect(vm.savingAll).toBe(false)
    })
  })
})
