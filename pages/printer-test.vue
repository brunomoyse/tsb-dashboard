<template>
  <div class="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-bold">Sunmi Printer Test</h1>
      <p class="text-sm text-muted mt-1">Test the built-in thermal printer on the Sunmi V3H device.</p>
    </div>

    <!-- Status card -->
    <UPageCard>
      <div class="space-y-4">
        <h2 class="text-lg font-semibold">Printer Status</h2>

        <div class="flex items-center gap-3">
          <span class="text-sm text-muted w-20">Platform</span>
          <UBadge :color="isNative() ? 'success' : 'neutral'" variant="soft">
            {{ isNative() ? 'Sunmi (native)' : 'Web (browser)' }}
          </UBadge>
        </div>

        <div class="flex items-center gap-3">
          <span class="text-sm text-muted w-20">Service</span>
          <UBadge :color="isBound ? 'success' : 'neutral'" variant="soft">
            {{ isBound ? 'Bound' : 'Not bound' }}
          </UBadge>
        </div>

        <div v-if="status !== null" class="flex items-center gap-3">
          <span class="text-sm text-muted w-20">Status</span>
          <UBadge :color="statusBadgeColor" variant="soft">
            {{ statusText || `Code ${status}` }}
          </UBadge>
        </div>

        <div v-if="model" class="flex items-center gap-3">
          <span class="text-sm text-muted w-20">Model</span>
          <span class="text-sm font-mono">{{ model }}</span>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap gap-2 pt-2">
          <UButton
            v-if="!isBound"
            icon="i-lucide-plug"
            :loading="binding"
            @click="handleBind"
          >
            Bind Service
          </UButton>
          <UButton
            v-else
            color="neutral"
            variant="soft"
            icon="i-lucide-plug-2"
            @click="handleUnbind"
          >
            Unbind
          </UButton>
          <UButton
            v-if="isBound"
            color="neutral"
            variant="ghost"
            icon="i-lucide-refresh-cw"
            :loading="refreshing"
            @click="handleRefresh"
          >
            Refresh Status
          </UButton>
        </div>
      </div>
    </UPageCard>

    <!-- Test print card -->
    <UPageCard>
      <div class="space-y-4">
        <h2 class="text-lg font-semibold">Test Print</h2>
        <p class="text-sm text-muted">
          Prints a sample receipt with restaurant header, items, and footer.
        </p>

        <div v-if="lastPrintResult" class="flex items-center gap-2 text-sm">
          <UIcon
            :name="lastPrintResult === 'ok' ? 'i-lucide-check-circle' : 'i-lucide-alert-circle'"
            :class="lastPrintResult === 'ok' ? 'text-green-500' : 'text-red-500'"
            class="size-4 shrink-0"
          />
          <span>{{ lastPrintResult === 'ok' ? 'Print successful' : `Error: ${lastPrintResult}` }}</span>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            icon="i-lucide-printer"
            :loading="printing"
            :disabled="!isBound && isNative()"
            @click="handleTestPrint"
          >
            Print Test Receipt
          </UButton>
        </div>
      </div>
    </UPageCard>

    <!-- Sample receipt preview -->
    <UPageCard>
      <div class="space-y-3">
        <h2 class="text-lg font-semibold">Receipt Preview</h2>
        <p class="text-sm text-muted">What the receipt will look like (approximate).</p>
        <pre class="text-xs font-mono bg-(--ui-bg-muted) rounded-lg p-4 overflow-x-auto whitespace-pre leading-relaxed">{{ receiptPreview }}</pre>
      </div>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Order } from '~/types'

const { isBound, status, statusText, bind, unbind, refreshStatus, printReceipt, isNative } = useSunmiPrinter()

const binding = ref(false)
const refreshing = ref(false)
const printing = ref(false)
const model = ref<string>('')
const lastPrintResult = ref<string | null>(null)

const statusBadgeColor = computed(() => {
  if (status.value === 1) return 'success'
  if (status.value === 4) return 'warning' // Out of paper
  if (status.value === null || status.value === -1) return 'neutral'
  return 'error'
})

const handleBind = async () => {
  binding.value = true
  try {
    await bind()
    if (isNative()) {
      const { SunmiPrinter } = await import('~/plugins/capacitor-sunmi-printer/src/index')
      const result = await SunmiPrinter.getModel()
      model.value = result.model
    }
  } catch (e) {
    if (import.meta.dev) console.error('[PrinterTest] bind failed', e)
  } finally {
    binding.value = false
  }
}

const handleUnbind = async () => {
  await unbind()
  model.value = ''
  lastPrintResult.value = null
}

const handleRefresh = async () => {
  refreshing.value = true
  try {
    await refreshStatus()
  } finally {
    refreshing.value = false
  }
}

const handleTestPrint = async () => {
  printing.value = true
  lastPrintResult.value = null
  try {
    await printReceipt(sampleOrder)
    lastPrintResult.value = 'ok'
  } catch (e: any) {
    lastPrintResult.value = e?.message ?? 'Unknown error'
  } finally {
    printing.value = false
  }
}

// ─── Sample order ────────────────────────────────────────────────────────────

const sampleOrder: Order = {
  id: 'abc12345-0000-0000-0000-000000000000',
  type: 'PICKUP',
  status: 'PREPARING',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  userId: 'user-1',
  addressId: null,
  addressExtra: null,
  deliveryFee: null,
  couponCode: null,
  discountAmount: '0',
  preferredReadyTime: null,
  estimatedReadyTime: null,
  isOnlinePayment: true,
  isManualAddress: false,
  orderNote: 'Sans wasabi',
  orderExtra: [{ name: 'Sauce soja', options: ['x2'] }],
  paymentID: null,
  totalPrice: '27.50',
  displayCustomerName: 'Jean Dupont',
  displayAddress: '',
  address: null,
  payment: null,
  customer: {
    id: 'customer-1',
    firstName: 'Jean',
    lastName: 'Dupont',
    phoneNumber: '+32 477 00 00 00',
  },
  items: [
    {
      quantity: 2,
      unitPrice: '8.00',
      totalPrice: '16.00',
      choice: null,
      product: {
        id: 'prod-1',
        name: 'Saumon Maki (8 pcs)',
        code: 'SM8',
        slug: 'saumon-maki',
        price: '8.00',
        categoryId: 'cat-1',
        isAvailable: true,
        isDiscountable: true,
        isHalal: false,
        isSpicy: false,
        isVegetarian: false,
        isVisible: true,
        pieceCount: 8,
        description: null,
        category: { id: 'cat-1', name: 'Makis', order: 1, translations: [] },
        choices: [],
        translations: [],
      },
    },
    {
      quantity: 1,
      unitPrice: '6.50',
      totalPrice: '6.50',
      choice: null,
      product: {
        id: 'prod-2',
        name: 'Gyoza Poulet (6 pcs)',
        code: 'GP6',
        slug: 'gyoza-poulet',
        price: '6.50',
        categoryId: 'cat-2',
        isAvailable: true,
        isDiscountable: true,
        isHalal: false,
        isSpicy: false,
        isVegetarian: false,
        isVisible: true,
        pieceCount: 6,
        description: null,
        category: { id: 'cat-2', name: 'Entrées', order: 2, translations: [] },
        choices: [],
        translations: [],
      },
    },
    {
      quantity: 1,
      unitPrice: '5.00',
      totalPrice: '5.00',
      choice: null,
      product: {
        id: 'prod-3',
        name: 'Edamame',
        code: 'ED',
        slug: 'edamame',
        price: '5.00',
        categoryId: 'cat-2',
        isAvailable: true,
        isDiscountable: true,
        isHalal: false,
        isSpicy: false,
        isVegetarian: true,
        isVisible: true,
        pieceCount: null,
        description: null,
        category: { id: 'cat-2', name: 'Entrées', order: 2, translations: [] },
        choices: [],
        translations: [],
      },
    },
  ],
}

// ─── ASCII receipt preview ────────────────────────────────────────────────────

const receiptPreview = computed(() => {
  const sep = '-'.repeat(32)
  const thick = '='.repeat(32)
  const orderId = sampleOrder.id.substring(0, 8).toUpperCase()
  const d = new Date(sampleOrder.createdAt)
  const dt = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`

  const lines: string[] = [
    '     TOKYO SUSHI BAR',
    thick,
    dt,
    `Cmd #${orderId}  RETRAIT`,
    sep,
    `Client: Jean Dupont`,
    `Tel: +32 477 00 00 00`,
    sep,
    ...sampleOrder.items.map(item =>
      `${item.quantity}x ${item.product.name}`.padEnd(25) + `${item.totalPrice}€`.padStart(7)
    ),
    sep,
    'TOTAL'.padEnd(25) + '27,50€'.padStart(7),
    sep,
    `Paiement: En ligne`,
    sep,
    `+ Sauce soja: x2`,
    sep,
    `Note: Sans wasabi`,
    thick,
    '     Merci et à bientôt!',
    thick,
    '',
    '',
    '',
  ]
  return lines.join('\n')
})
</script>
