<template>
    <Sheet :open="open" @openChange="openChanged" class="mb-32">
        <SheetContent side="bottom" class="w-full max-w-none max-h-full p-0">
            <TooltipProvider>
                <SheetHeader>
                    <SheetTitle class="sr-only">Order Management</SheetTitle>
                    <SheetDescription class="sr-only">
                        Manage estimated time and status for this order
                    </SheetDescription>
                </SheetHeader>

                <!-- summary + print -->
                <div class="px-4 flex flex-col sm:flex-row justify-between items-center">
                    <div class="font-bold truncate mb-2 sm:mb-0">{{ summary }}</div>
                    <Tooltip content="Print">
                        <Button size="sm" variant="outline" @click="onPrint">
                            <PrinterIcon class="w-4 h-4" />
                        </Button>
                    </Tooltip>
                </div>

                <div class="px-4 pb-4 space-y-6">
                    <!-- Time Slider -->
                    <div>
                        <div class="text-xs text-gray-500 flex flex-col sm:flex-row sm:justify-between">
                            <span>{{ t('orders.preferredTime') }}: {{ preferredTime }}</span>
                            <span v-if="currentTime">{{ t('orders.currentEstimate') }}: {{ currentTime }}</span>
                            <span>+{{ deltaNumber }}m</span>
                            <span>{{ t('orders.newEstimate') }}: {{ newTime }}</span>
                        </div>
                        <Slider
                            :key="defaultSlider[0]"
                            v-model="sliderValue"
                            :min="0"
                            :max="120"
                            :step="5"
                            thumbLabel
                            class="mt-2"
                        />
                    </div>

                    <!-- Status Selection -->
                    <div>
                        <div class="text-xs text-gray-500 mb-2">
                            {{ t('orders.updateStatus') }}
                        </div>
                        <div class="flex flex-col items-start gap-2 px-4">
                            <Button
                                v-for="status in statuses"
                                :key="status"
                                size="sm"
                                :variant="selectedStatus === status ? 'default' : 'secondary'"
                                @click="selectedStatus === status ? selectedStatus = null : selectedStatus = status"
                                :class="[
                                  'flex items-center justify-center',
                                  'flex-shrink-0',
                                  'px-3',
                                  selectedStatus === status ? 'ring-2 ring-offset-2 ring-primary' : ''
                                ]"
                            >
                                <Icon :name="getStatusIcon(status)" class="w-4 h-4 mr-1" />
                                <span class="text-sm whitespace-nowrap">
                                  {{ t(`orders.status.${status.toLowerCase()}`) }}
                                </span>
                            </Button>
                        </div>
                    </div>

                    <!-- Save All Button -->
                    <div class="flex justify-center">
                        <Button
                            size="sm"
                            variant="default"
                            @click="onSaveAll"
                            :disabled="!hasChanges"
                        >
                            {{ t('common.save') }}
                        </Button>
                    </div>
                </div>
            </TooltipProvider>
        </SheetContent>
    </Sheet>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip'
import { PrinterIcon } from 'lucide-vue-next'
import Icon from '~/components/Icon.vue'
import {
    getAllowedStatuses,
    formatOrderSummary,
    formatTimeOnly,
    getStatusIcon,
} from '~/utils/orders'
import type {OrderStatus, UpdateOrderInput} from '~/types'

const emit = defineEmits<{
    (e: 'update:open', open: boolean): void
    (e: 'save-changes', payload: UpdateOrderInput): void
    (e: 'print'): void
}>()

const props = defineProps<{ order: Record<string, any>; open: boolean }>()
const { t } = useI18n()

// state
const sliderValue = ref<number[]>([0])
const selectedStatus = ref<OrderStatus | null>(props.order?.status ?? null)

// default slider based on existing estimate
const defaultSlider = computed<number[]>(() => (props.order?.estimatedReadyTime ? [30] : [0]))

// reset on open, use defaultSlider
watch(
    () => props.open,
    async (val) => {
        if (val) {
            sliderValue.value = defaultSlider.value
            selectedStatus.value = props.order?.status ?? null
            await nextTick()
        }
    }
)

const deltaNumber = computed(() => sliderValue.value[0])

// derived
const statuses = computed(() =>
    props.order ? getAllowedStatuses(props.order.status, props.order.type) : []
)
const preferredTime = computed(() =>
    props.order?.preferredReadyTime
        ? formatTimeOnly(props.order.preferredReadyTime)
        : t('orders.asap')
)
const currentTime = computed(() =>
    props.order?.estimatedReadyTime
        ? formatTimeOnly(props.order.estimatedReadyTime)
        : null
)
const summary = computed(() => (props.order ? formatOrderSummary(props.order) : ''))
const newTime = computed(() => {
    const base = props.order?.estimatedReadyTime
        ? new Date(props.order.estimatedReadyTime)
        : new Date()
    return formatTimeOnly(
        new Date(base.getTime() + deltaNumber.value * 60_000).toISOString()
    )
})

const hasChanges = computed(
    () =>
        deltaNumber.value !== 0 ||
        (selectedStatus.value != null && selectedStatus.value !== props.order.status)
)

function openChanged(val: boolean) {
    emit('update:open', val)
}

function onSaveAll() {
    if (!props.order) return
    emit('save-changes', { status: selectedStatus.value as OrderStatus, estimatedReadyTime: newTime.value })
}

function onPrint() {
    emit('print')
}
</script>
