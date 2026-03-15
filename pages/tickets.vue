<template>
  <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">{{ t('tickets.title') }}</h1>
        <p class="text-sm text-muted">{{ t('tickets.description') }}</p>
      </div>
      <div class="flex gap-2">
        <UButton
          :label="t('tickets.resetDefaults')"
          icon="i-lucide-rotate-ccw"
          color="neutral"
          variant="outline"
          @click="resetToDefaults"
        />
        <UButton
          :label="t('common.save')"
          icon="i-lucide-save"
          :loading="saving"
          @click="saveTemplates"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Editor Panel -->
      <UPageCard>
        <UTabs :items="tabs" class="w-full">
          <template #delivery>
            <div class="space-y-2 pt-4">
              <div
                v-for="(key, index) in localTemplates.delivery.sectionOrder"
                :key="key"
                class="flex items-center gap-3 p-3 rounded-lg border border-default"
              >
                <!-- Reorder buttons -->
                <div class="flex flex-col gap-0.5">
                  <UButton
                    icon="i-lucide-chevron-up"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    :disabled="index === 0"
                    @click="moveSection('delivery', index, -1)"
                  />
                  <UButton
                    icon="i-lucide-chevron-down"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    :disabled="index === localTemplates.delivery.sectionOrder.length - 1"
                    @click="moveSection('delivery', index, 1)"
                  />
                </div>

                <!-- Toggle + label -->
                <USwitch
                  :model-value="localTemplates.delivery.sections[key]?.enabled ?? true"
                  @update:model-value="(val: boolean) => toggleSection('delivery', key, val)"
                />
                <span class="font-medium flex-1">{{ t(`tickets.sections.${key}`) }}</span>

                <!-- Custom text fields -->
                <UInput
                  v-if="key === 'header'"
                  :model-value="localTemplates.delivery.sections.header?.restaurantName ?? ''"
                  :placeholder="t('tickets.fields.restaurantName')"
                  size="sm"
                  class="w-48"
                  @update:model-value="(val: string | number) => updateSectionField({ ticketType: 'delivery', sectionKey: 'header', field: 'restaurantName', value: String(val) })"
                />
              </div>
            </div>
          </template>

          <template #kitchen>
            <div class="space-y-2 pt-4">
              <div
                v-for="(key, index) in localTemplates.kitchen.sectionOrder"
                :key="key"
                class="flex items-center gap-3 p-3 rounded-lg border border-default"
              >
                <!-- Reorder buttons -->
                <div class="flex flex-col gap-0.5">
                  <UButton
                    icon="i-lucide-chevron-up"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    :disabled="index === 0"
                    @click="moveSection('kitchen', index, -1)"
                  />
                  <UButton
                    icon="i-lucide-chevron-down"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    :disabled="index === localTemplates.kitchen.sectionOrder.length - 1"
                    @click="moveSection('kitchen', index, 1)"
                  />
                </div>

                <!-- Toggle + label -->
                <USwitch
                  :model-value="localTemplates.kitchen.sections[key]?.enabled ?? true"
                  @update:model-value="(val: boolean) => toggleSection('kitchen', key, val)"
                />
                <span class="font-medium flex-1">{{ t(`tickets.sections.${key}`) }}</span>

                <!-- Custom text fields -->
                <UInput
                  v-if="key === 'header'"
                  :model-value="localTemplates.kitchen.sections.header?.title ?? ''"
                  :placeholder="t('tickets.fields.headerTitle')"
                  size="sm"
                  class="w-48"
                  @update:model-value="(val: string | number) => updateSectionField({ ticketType: 'kitchen', sectionKey: 'header', field: 'title', value: String(val) })"
                />
              </div>
            </div>
          </template>
        </UTabs>
      </UPageCard>

      <!-- Preview Panel -->
      <UPageCard>
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-eye" class="size-5" />
          <h2 class="text-lg font-semibold">{{ t('tickets.preview') }}</h2>
        </div>
        <div class="bg-(--ui-bg-accented) rounded-lg p-4 overflow-x-auto">
          <pre class="text-xs font-mono leading-relaxed whitespace-pre">{{ previewText }}</pre>
        </div>
      </UPageCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { DEFAULT_TEMPLATES, buildDeliveryTicket, buildKitchenTicket, createTestOrder } from '~/utils/receiptFormatter'
import type { DeliverySectionKey, KitchenSectionKey, TicketTemplates } from '~/types'
import { generateReceiptPreview } from '~/utils/mockPrinter'
import { print } from 'graphql'
import { useGqlSubscription, useNuxtApp } from '#imports'
import { useI18n } from 'vue-i18n'
import gql from 'graphql-tag'

const { t } = useI18n()
const { $gqlFetch } = useNuxtApp()
const toast = useToast()

const saving = ref(false)
const activeTab = ref(0)

const tabs = [
  { label: t('tickets.delivery'), slot: 'delivery' as const },
  { label: t('tickets.kitchen'), slot: 'kitchen' as const },
]

// Deep-clone default templates for local editing state
const cloneTemplates = (src: TicketTemplates): TicketTemplates => JSON.parse(JSON.stringify(src))

const localTemplates: TicketTemplates = reactive(cloneTemplates(DEFAULT_TEMPLATES))

// --- Preview ---

const previewText = computed(() => {
  const testOrder = createTestOrder()
  const builder = activeTab.value === 0
    ? buildDeliveryTicket(testOrder, localTemplates)
    : buildKitchenTicket(testOrder, localTemplates)
  return generateReceiptPreview(builder)
})

// --- Section operations ---

const toggleSection = (ticketType: 'delivery' | 'kitchen', key: string, enabled: boolean) => {
  const sections = localTemplates[ticketType].sections as Record<string, { enabled: boolean }>
  if (sections[key]) {
    sections[key].enabled = enabled
  }
}

const moveSection = (ticketType: 'delivery' | 'kitchen', index: number, direction: -1 | 1) => {
  const order = localTemplates[ticketType].sectionOrder as string[]
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= order.length) return
  const temp = order[index]
  order[index] = order[newIndex]
  order[newIndex] = temp
}

const updateSectionField = (opts: { ticketType: 'delivery' | 'kitchen'; sectionKey: string; field: string; value: string }) => {
  const sections = localTemplates[opts.ticketType].sections as Record<string, Record<string, unknown>>
  if (sections[opts.sectionKey]) {
    sections[opts.sectionKey][opts.field] = opts.value
  }
}

// --- GraphQL ---

const GET_CONFIG = gql`
  query {
    restaurantConfig {
      ticketTemplates
    }
  }
`

const UPDATE_TEMPLATES = gql`
  mutation UpdateTicketTemplates($templates: JSON!) {
    updateTicketTemplates(templates: $templates) {
      ticketTemplates
    }
  }
`

const SUB_CONFIG_UPDATED = gql`
  subscription RestaurantConfigUpdated {
    restaurantConfigUpdated {
      ticketTemplates
    }
  }
`

const applyTemplates = (raw: TicketTemplates | null) => {
  if (!raw) return
  const src = raw.delivery ? raw : DEFAULT_TEMPLATES
  // Delivery
  if (src.delivery?.sectionOrder) {
    localTemplates.delivery.sectionOrder = [...src.delivery.sectionOrder] as DeliverySectionKey[]
  }
  if (src.delivery?.sections) {
    for (const key of Object.keys(src.delivery.sections) as DeliverySectionKey[]) {
      localTemplates.delivery.sections[key] = { ...src.delivery.sections[key] }
    }
  }
  // Kitchen
  if (src.kitchen?.sectionOrder) {
    localTemplates.kitchen.sectionOrder = [...src.kitchen.sectionOrder] as KitchenSectionKey[]
  }
  if (src.kitchen?.sections) {
    for (const key of Object.keys(src.kitchen.sections) as KitchenSectionKey[]) {
      localTemplates.kitchen.sections[key] = { ...src.kitchen.sections[key] }
    }
  }
}

const loadConfig = async () => {
  const data = await $gqlFetch<{ restaurantConfig: { ticketTemplates: TicketTemplates } }>(
    print(GET_CONFIG)
  )
  if (data?.restaurantConfig?.ticketTemplates) {
    applyTemplates(data.restaurantConfig.ticketTemplates)
  }
}

const saveTemplates = async () => {
  saving.value = true
  try {
    await $gqlFetch(print(UPDATE_TEMPLATES), {
      variables: { templates: JSON.parse(JSON.stringify(localTemplates)) }
    })
    toast.add({ title: t('tickets.saved'), color: 'success' })
  } catch {
    toast.add({ title: t('tickets.saveFailed'), color: 'error' })
  } finally {
    saving.value = false
  }
}

const resetToDefaults = () => {
  if (!confirm(t('tickets.resetConfirm'))) return
  applyTemplates(DEFAULT_TEMPLATES)
}

onMounted(() => {
  loadConfig()

  const { data: liveConfig } = useGqlSubscription<{ restaurantConfigUpdated: { ticketTemplates: TicketTemplates } }>(
    print(SUB_CONFIG_UPDATED)
  )
  watch(liveConfig, (val) => {
    if (val?.restaurantConfigUpdated?.ticketTemplates) {
      applyTemplates(val.restaurantConfigUpdated.ticketTemplates)
    }
  })
})
</script>
