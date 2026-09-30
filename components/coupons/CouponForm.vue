<template>
  <div class="space-y-4">
    <!-- Code -->
    <div>
      <label class="block text-sm font-medium mb-1">{{ t('coupons.code') }}</label>
      <UInput v-model="form.code" class="w-full" :ui="{ base: 'h-12 text-base md:h-8 md:text-sm bg-accented font-mono' }" :placeholder="t('coupons.code')" />
    </div>

    <!-- Discount Type -->
    <div>
      <label class="block text-sm font-medium mb-1">{{ t('coupons.type') }}</label>
      <USelectMenu
        v-model="form.discountType"
        :items="discountTypeOptions"
        value-key="value"
        class="w-full"
        :ui="{ base: 'h-12 text-base md:h-8 md:text-sm bg-accented' }"
      />
    </div>

    <!-- Discount Value -->
    <div>
      <label class="block text-sm font-medium mb-1">{{ t('coupons.value') }}</label>
      <UInput v-model="form.discountValue" class="w-full" :ui="{ base: 'h-12 text-base md:h-8 md:text-sm bg-accented font-mono tabular-nums' }" type="number" step="0.01" min="0" />
    </div>

    <!-- Min Order Amount -->
    <div>
      <label class="block text-sm font-medium mb-1">{{ t('coupons.minOrder') }}</label>
      <UInput v-model="form.minOrderAmount" class="w-full" :ui="{ base: 'h-12 text-base md:h-8 md:text-sm bg-accented font-mono tabular-nums' }" type="number" step="0.01" min="0" placeholder="0.00" />
    </div>

    <!-- Max Uses -->
    <div>
      <label class="block text-sm font-medium mb-1">{{ t('coupons.maxUses') }}</label>
      <UInput v-model="form.maxUses" class="w-full" :ui="{ base: 'h-12 text-base md:h-8 md:text-sm bg-accented font-mono tabular-nums' }" type="number" min="0" :placeholder="t('coupons.unlimited')" />
    </div>

    <!-- Max Uses Per User -->
    <div>
      <label class="block text-sm font-medium mb-1">{{ t('coupons.maxUsesPerUser') }}</label>
      <UInput v-model="form.maxUsesPerUser" class="w-full" :ui="{ base: 'h-12 text-base md:h-8 md:text-sm bg-accented font-mono tabular-nums' }" type="number" min="0" :placeholder="t('coupons.unlimited')" />
    </div>

    <!-- Active -->
    <div class="flex items-center justify-between gap-3 min-h-12">
      <span class="text-sm font-medium">{{ t('coupons.active') }}</span>
      <PiliSwitch v-model="form.isActive" size="md" :label="t('coupons.active')" />
    </div>

    <!-- Valid From -->
    <div>
      <label class="block text-sm font-medium mb-1">{{ t('coupons.validFrom') }}</label>
      <UInput v-model="form.validFrom" class="w-full" :ui="{ base: 'h-12 text-base md:h-8 md:text-sm bg-accented font-mono tabular-nums' }" type="datetime-local" />
    </div>

    <!-- Valid Until -->
    <div>
      <label class="block text-sm font-medium mb-1">{{ t('coupons.validUntil') }}</label>
      <UInput v-model="form.validUntil" class="w-full" :ui="{ base: 'h-12 text-base md:h-8 md:text-sm bg-accented font-mono tabular-nums' }" type="datetime-local" />
    </div>

    <!-- Validation error -->
    <p v-if="validationError" class="text-sm text-error">{{ validationError }}</p>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

export interface CouponFormState {
  code: string
  discountType: string
  discountValue: string
  minOrderAmount: string
  maxUses: string
  maxUsesPerUser: string
  isActive: boolean
  validFrom: string
  validUntil: string
}

const form = defineModel<CouponFormState>({ required: true })

defineProps<{
  discountTypeOptions: { label: string; value: string }[]
  validationError: string
}>()

const { t } = useI18n()
</script>
