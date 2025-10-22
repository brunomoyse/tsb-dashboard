<template>
  <UModal
    v-model:open="isOpen"
    :title="t('products.syncModal.title')"
    description=" "
    :ui="{ content: 'sm:max-w-4xl' }"
  >
    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary" />
        <span class="ml-3 text-muted">{{ t('products.syncModal.loading') }}</span>
      </div>

      <div v-else-if="previewData" class="space-y-6">
        <!-- No Changes Message -->
        <div v-if="!hasChanges" class="text-center py-8">
          <UIcon name="i-lucide-check-circle" class="size-16 mx-auto mb-4 text-success" />
          <p class="text-lg text-muted">{{ t('products.syncModal.noChanges') }}</p>
        </div>

        <!-- Tabs for different change types -->
        <UTabs v-else v-model="selectedTab" :items="tabItems" class="w-full">
          <!-- Products to Create -->
          <template #toCreate>
            <div class="space-y-3 mt-4">
              <div v-if="previewData.toCreate?.length === 0" class="text-center py-8 text-muted">
                {{ t('products.syncModal.emptyCreate') }}
              </div>
              <UCard
                v-for="(item, idx) in previewData.toCreate"
                :key="`create-${idx}`"
                class="border-l-4 border-l-success"
              >
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <p class="text-sm font-medium text-muted">{{ t('common.name') }}</p>
                    <p class="font-semibold">{{ item.name }}</p>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-muted">{{ t('products.category') }}</p>
                    <p>{{ item.category }}</p>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-muted">{{ t('common.price') }}</p>
                    <p>{{ formatPrice(item.price) }}</p>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-muted">{{ t('common.availability') }}</p>
                    <UBadge :color="item.isAvailable ? 'success' : 'error'" variant="soft">
                      {{ item.isAvailable ? t('common.available') : t('common.unavailable') }}
                    </UBadge>
                  </div>
                  <div class="col-span-2" v-if="item.description">
                    <p class="text-sm font-medium text-muted">{{ t('common.description') }}</p>
                    <p class="text-sm">{{ item.description }}</p>
                  </div>
                </div>
              </UCard>
            </div>
          </template>

          <!-- Products to Update -->
          <template #toUpdate>
            <div class="space-y-3 mt-4">
              <div v-if="previewData.toUpdate?.length === 0" class="text-center py-8 text-muted">
                {{ t('products.syncModal.emptyUpdate') }}
              </div>
              <UCard
                v-for="(item, idx) in previewData.toUpdate"
                :key="`update-${idx}`"
                class="border-l-4 border-l-warning"
              >
                <div class="space-y-4">
                  <div>
                    <p class="font-semibold text-lg">{{ item.name }}</p>
                  </div>

                  <!-- Price Comparison -->
                  <div v-if="item.currentPrice !== item.newPrice" class="grid grid-cols-2 gap-4">
                    <div>
                      <p class="text-sm font-medium text-muted">{{ t('products.syncModal.current') }} {{ t('common.price') }}</p>
                      <p class="line-through text-error">{{ formatPrice(item.currentPrice) }}</p>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-muted">{{ t('products.syncModal.new') }} {{ t('common.price') }}</p>
                      <p class="font-semibold text-success">{{ formatPrice(item.newPrice) }}</p>
                    </div>
                  </div>

                  <!-- Description Comparison -->
                  <div v-if="item.currentDescription !== item.newDescription" class="grid grid-cols-2 gap-4">
                    <div>
                      <p class="text-sm font-medium text-muted">{{ t('products.syncModal.current') }} {{ t('common.description') }}</p>
                      <p class="text-sm line-through text-error">{{ item.currentDescription || '-' }}</p>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-muted">{{ t('products.syncModal.new') }} {{ t('common.description') }}</p>
                      <p class="text-sm font-semibold text-success">{{ item.newDescription || '-' }}</p>
                    </div>
                  </div>

                  <!-- Availability Comparison -->
                  <div v-if="item.currentAvailability !== item.newAvailability" class="grid grid-cols-2 gap-4">
                    <div>
                      <p class="text-sm font-medium text-muted">{{ t('products.syncModal.current') }} {{ t('common.availability') }}</p>
                      <UBadge :color="item.currentAvailability ? 'success' : 'error'" variant="soft">
                        {{ item.currentAvailability ? t('common.available') : t('common.unavailable') }}
                      </UBadge>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-muted">{{ t('products.syncModal.new') }} {{ t('common.availability') }}</p>
                      <UBadge :color="item.newAvailability ? 'success' : 'error'" variant="soft">
                        {{ item.newAvailability ? t('common.available') : t('common.unavailable') }}
                      </UBadge>
                    </div>
                  </div>
                </div>
              </UCard>
            </div>
          </template>

          <!-- Products to Delete -->
          <template #toDelete>
            <div class="space-y-3 mt-4">
              <div v-if="previewData.toDelete?.length === 0" class="text-center py-8 text-muted">
                {{ t('products.syncModal.emptyDelete') }}
              </div>
              <UCard
                v-for="(item, idx) in previewData.toDelete"
                :key="`delete-${idx}`"
                class="border-l-4 border-l-error"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-semibold">{{ item.name }}</p>
                    <p v-if="item.reason" class="text-sm text-muted">{{ item.reason }}</p>
                  </div>
                  <UIcon name="i-lucide-trash-2" class="size-6 text-error" />
                </div>
              </UCard>
            </div>
          </template>
        </UTabs>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          @click="handleClose"
          :disabled="syncing"
        >
          {{ t('common.cancel') }}
        </UButton>
        <UButton
          :disabled="!hasChanges || syncing"
          :loading="syncing"
          @click="handleConfirm"
        >
          <UIcon v-if="!syncing" name="i-lucide-refresh-cw" class="mr-2" />
          {{ syncing ? t('products.syncModal.syncing') : t('products.syncModal.confirmSync') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SyncPreviewData } from '~/types'

interface Props {
  open: boolean
  previewData?: SyncPreviewData | null
  loading?: boolean
  syncing?: boolean
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'confirm'): void
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  previewData: null,
  loading: false,
  syncing: false
})

const emit = defineEmits<Emits>()

const { t } = useI18n()
const selectedTab = ref(0)

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const hasChanges = computed(() => {
  if (!props.previewData) return false
  return (
    (props.previewData.toCreate?.length ?? 0) > 0 ||
    (props.previewData.toUpdate?.length ?? 0) > 0 ||
    (props.previewData.toDelete?.length ?? 0) > 0
  )
})

const tabItems = computed(() => [
  {
    key: 'toCreate',
    label: `${t('products.syncModal.toCreate')} (${props.previewData?.toCreate?.length ?? 0})`,
    slot: 'toCreate'
  },
  {
    key: 'toUpdate',
    label: `${t('products.syncModal.toUpdate')} (${props.previewData?.toUpdate?.length ?? 0})`,
    slot: 'toUpdate'
  },
  {
    key: 'toDelete',
    label: `${t('products.syncModal.toDelete')} (${props.previewData?.toDelete?.length ?? 0})`,
    slot: 'toDelete'
  }
])

const formatPrice = (price?: number) => {
  if (price === undefined || price === null) return '-'
  return new Intl.NumberFormat('fr-BE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: 'currency',
    currency: 'EUR'
  }).format(price)
}

const handleClose = () => {
  emit('update:open', false)
}

const handleConfirm = () => {
  emit('confirm')
}

// Reset to first tab when modal opens
watch(() => props.open, (newVal) => {
  if (newVal) {
    selectedTab.value = 0
  }
})
</script>
