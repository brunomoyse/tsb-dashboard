<template>
    <v-container class="pa-0">
        <!-- Toolbar / Search -->
        <v-toolbar density="compact" class="elevation-2 mb-4">
            <v-text-field
                v-model="searchQuery"
                :label="t('orders.search')"
                prepend-inner-icon="mdi-magnify"
                single-line
                hide-details
                density="compact"
            ></v-text-field>
            <v-btn icon>
                <v-icon>mdi-filter-variant</v-icon>
            </v-btn>
        </v-toolbar>

        <!-- Order List with Transition Group -->
        <transition-group v-if="ordersStore.orders.length" name="order" tag="div">
            <div
                v-for="order in ordersStore.orders"
                :key="order.id"
                class="order-item"
                @touchstart="touchStart($event, order)"
                @touchend="touchEnd($event, order)"
            >
                <v-card
                    class="ma-2 rounded-lg"
                    elevation="2"
                    :style="cardStyle(order)"
                    @click="openBottomSheet(order)"
                >
                    <v-card-text class="d-flex align-center">
                        <!-- Status Indicator -->
                        <v-icon
                            large
                            :color="getStatusColor(order.status)"
                            class="mr-3"
                        >
                            {{ getStatusIcon(order.status) }}
                        </v-icon>

                        <!-- Order Info -->
                        <div class="flex-grow-1">
                            <div class="d-flex justify-space-between">
                                <div>
                                    <div class="text-body-1 font-weight-bold">
                                        {{ order.type === 'DELIVERY' ? getStreetAndDistance(order.address) : t('orders.pickup') }}
                                    </div>
                                    <div class="text-caption text-medium-emphasis">
                                        {{ t('orders.createdAt') }}: {{ formatDate(order.createdAt) }}
                                        <span v-if="order.preferredReadyTime" class="ml-2 font-weight-bold text-red">
                                            <span class="text-black">• </span>{{ t('orders.preferredTime') }}: {{ formatTimeOnly(order.preferredReadyTime) }}
                                        </span>
                                        <span v-if="order.estimatedReadyTime">
                                             <span class="text-black"> • </span>{{ t('orders.estimatedTime') }}: {{ formatTimeOnly(order.estimatedReadyTime) }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <v-divider class="my-2" />

                            <div class="d-flex justify-space-between align-center">
                                <div>
                                    <div class="d-flex align-center gap-2">
                                        <template v-if="order.isOnlinePayment">
                                            <v-icon small class="mr-1">mdi-credit-card-outline</v-icon>
                                            {{ t('orders.paymentMethod.online') }}
                                        </template>
                                        <template v-else>
                                            <v-icon small class="mr-1">mdi-cash-multiple</v-icon>
                                            {{ t('orders.paymentMethod.cash') }}
                                        </template>
                                    </div>
                                    <div class="d-flex align-center gap-2 mt-1">
                                        <template v-if="order.type === 'DELIVERY'">
                                            <v-icon small class="mr-1">mdi-moped-outline</v-icon>
                                            {{ t(`orders.deliveryOption.${order.type?.toLowerCase()}`) }}
                                        </template>
                                        <template v-else>
                                            <v-icon small class="mr-1">mdi-shopping-outline</v-icon>
                                            {{ t(`orders.deliveryOption.${order.type?.toLowerCase()}`) }}
                                        </template>
                                    </div>
                                </div>
                                <div class="d-flex gap-2">
                                    <!-- Payment Status Chip -->
                                    <v-chip
                                        :color="getPaymentStatusColor(order.payment?.status)"
                                        size="small"
                                    >
                                        {{ t(`orders.payment.status.${order.payment?.status ? order.payment.status.toLowerCase() : 'notPaid'}`) }}
                                    </v-chip>
                                    <!-- Order Status Chip -->
                                    <v-chip
                                        :color="getStatusColor(order.status)"
                                        size="small"
                                    >
                                        {{ t(`orders.status.${order.status?.toLowerCase()}`) }}
                                    </v-chip>
                                </div>
                            </div>
                        </div>
                    </v-card-text>
                </v-card>
            </div>
        </transition-group>

        <!-- Empty State -->
        <v-card v-else class="ma-4 text-center pa-6">
            <v-icon size="64" class="mb-2">mdi-package-variant-closed</v-icon>
            <div class="text-h6">{{ t('orders.noOrders') }}</div>
        </v-card>

        <!-- Bottom Sheet for Order Management -->
        <v-bottom-sheet v-model="showBottomSheet" inset>
            <v-card class="rounded-t-xl pa-4">
                <v-card-title class="d-flex justify-space-between align-center">
                    <div>
                        <span class="text-h6">{{ t('orders.orderManagement') }}</span>
                        <div class="text-caption">
                            {{ selectedOrder ? formatOrderSummary(selectedOrder) : '' }}
                        </div>
                    </div>
                    <div class="d-flex align-center gap-2">
                        <v-btn icon @click="reprintOrder">
                            <v-tooltip activator="parent" location="top">{{ t('orders.reprint') }}</v-tooltip>
                            <v-icon>mdi-printer</v-icon>
                        </v-btn>
                        <v-btn icon @click="showBottomSheet = false">
                            <v-icon>mdi-close</v-icon>
                        </v-btn>
                    </div>
                </v-card-title>

                <v-divider class="my-2"></v-divider>

                <v-card-text class="pt-2">
                    <!-- Time Management Section -->
                    <div class="mb-6">
                        <div class="text-caption text-medium-emphasis mb-2">
                            {{ t('orders.preferredTime') }}:
                            {{ selectedOrder?.preferredReadyTime ? formatTimeOnly(selectedOrder.preferredReadyTime) : t('orders.asap') }}
                        </div>

                        <!-- Current Estimate -->
                        <div v-if="hasExistingEstimate" class="text-caption text-medium-emphasis mb-1">
                            {{ t('orders.currentEstimate') }}:
                            <span class="font-weight-bold">
                            {{ currentEstimatedTime }}
                        </span>
                        </div>

                        <v-slider
                            v-model="sliderDeltaMinutes"
                            :min="0"
                            :max="120"
                            :step="5"
                            thumb-label="always"
                            :thumb-size="24"
                            thumb-color="primary"
                            track-color="grey-lighten-2"
                            :ticks="sliderTicks"
                            tick-size="4"
                            class="mt-8"
                        >
                            <template v-slot:thumb-label="{ modelValue }">
                                +{{ modelValue }}&#160;{{ t('orders.minutes') }}
                            </template>
                        </v-slider>

                        <!-- New Estimate Display -->
                        <div class="d-flex justify-space-between text-caption text-medium-emphasis">
                        <span>
                            {{ t('orders.newEstimate') }}:
                            <span class="font-weight-bold text-primary">
                                {{ newEstimatedTime }}
                            </span>
                        </span>
                            <v-btn
                                color="primary"
                                variant="tonal"
                                @click="saveEstimatedTime"
                                :disabled="!hasTimeChanged"
                                size="small"
                            >
                                {{ t('orders.updateTime') }}
                            </v-btn>
                        </div>
                    </div>

                    <!-- Status Update Section -->
                    <div class="text-caption text-medium-emphasis mb-2">
                        {{ t('orders.updateStatus') }}
                    </div>
                    <v-row class="justify-center" align="stretch" dense>
                        <v-col
                            v-for="status in availableStatuses"
                            :key="status"
                            cols="6"
                            sm="4"
                            class="d-flex"
                        >
                            <v-btn
                                block
                                large
                                variant="tonal"
                                :color="getStatusColor(status)"
                                class="mx-auto my-2"
                                @click="handleStatusButton(status)"
                                style="min-height: 56px;"
                            >
                                <v-icon left class="mr-1">{{ getStatusIcon(status) }}</v-icon>
                                <span class="text-subtitle-2">
                                    {{ t(`orders.status.${status.toLowerCase()}`) }}
                                </span>
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-card-text>
            </v-card>
        </v-bottom-sheet>

        <!-- Confirmation Dialog for Cancellation -->
        <v-dialog v-model="showCancelDialog" persistent max-width="400">
            <v-card>
                <v-card-title class="headline">
                    {{ t('orders.confirmCancelTitle') }}
                </v-card-title>
                <v-card-text>
                    <div>{{ t('orders.confirmCancelMessage') }}</div>
                    <div v-if="selectedOrder" class="mt-2 grey--text text-caption">
                        {{ formatDate(selectedOrder.createdAt) }} -
                        {{ formatOrderSummary(selectedOrder) }}
                    </div>
                    <div v-if="selectedOrder?.isOnlinePayment" class="mt-2 red--text">
                        {{ t('orders.refundNotice') }}
                    </div>
                    <div class="mt-2" v-if="confirmDisabled">
                        {{ t('orders.waitMessage', { seconds: cancelDelay }) }}
                    </div>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn text @click="cancelCancellation">
                        {{ t('orders.back') }}
                    </v-btn>
                    <v-btn color="red" @click="confirmCancellation" :disabled="confirmDisabled">
                        {{ t('orders.confirm') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {formatDate, getStreetAndDistance, formatAddress, formatTimeOnly, timeToRFC3339} from '~/utils/utils'
import type { Order, OrderStatus, OrderType } from '~/types'
import gql from "graphql-tag"
import { print } from 'graphql'

const { t } = useI18n()
const ordersStore = useOrdersStore()
const estimatedReadyTime = ref<string | null>(null)
const sliderMinutes = ref<number>(30)

const sliderTicks = computed(() => {
    const ticks: Record<number, string> = {}
    for (let i = 15; i <= 90; i += 15) {
        ticks[i] = `${i} min`
    }
    return ticks
})

const hasTimeChanged = computed(() => {
    return sliderDeltaMinutes.value !== 0;
});

watch(sliderMinutes, () => {
    updateEstimatedTimeFromSlider()
})

const ORDERS_QUERY = gql`
    query {
        orders {
            id
            createdAt
            updatedAt
            status
            type
            isOnlinePayment
            discountAmount
            deliveryFee
            totalPrice
            preferredReadyTime
            estimatedReadyTime
            addressExtra
            orderNote
            orderExtra

            address {
                id
                streetName
                houseNumber
                municipalityName
                postcode
                distance
            }
            customer {
                id
                firstName
                lastName
            }
            payment {
                status
            }
            items {
                unitPrice
                quantity
                totalPrice
                product {
                    id
                    code
                    name
                    category {
                        id
                        name
                    }
                }
            }
        }
    }
`

const UPDATE_ORDER_MUTATION = gql`
    mutation ($id: ID!, $input: UpdateOrderInput!) {
        updateOrder(id: $id, input: $input) {
            id
            status
            estimatedReadyTime
        }
    }
`

const { mutate: mutationUpdateOrder } = useGqlMutation<{ updateOrder: Order }>(UPDATE_ORDER_MUTATION)

// State
const searchQuery = ref('')
const selectedOrder = ref<Order | null>(null)
const showBottomSheet = ref(false)
const touchStartX = ref(0)
const sliderDeltaMinutes = ref<number>(30);
const baseEstimatedTime = ref<Date | null>(null);

// For cancellation confirmation dialog
const showCancelDialog = ref(false)
const cancelDelay = ref(5)
const confirmDisabled = computed(() => cancelDelay.value > 0)
let cancelTimer: number | undefined = undefined

// Define allowed transitions based on current status and delivery option
const getAllowedStatuses = (current: OrderStatus, deliveryOption: OrderType): OrderStatus[] => {
    let allowed: OrderStatus[] = []
    switch (current) {
        case 'PENDING':
            allowed = ['CONFIRMED', 'PREPARING']
            break
        case 'CONFIRMED':
            allowed = ['PREPARING']
            break
        case 'PREPARING':
            allowed = ['AWAITING_PICK_UP']
            break
        case 'AWAITING_PICK_UP':
            if (deliveryOption === 'DELIVERY') {
                allowed = ['OUT_FOR_DELIVERY']
            } else if (deliveryOption === 'PICKUP') {
                allowed = ['PICKED_UP', 'FAILED']
            }
            break
        case 'OUT_FOR_DELIVERY':
            allowed = ['DELIVERED', 'FAILED']
            break
        default:
            allowed = []
            break
    }
    // "CANCELLED" can be chosen from any state except if already cancelled.
    if (current !== 'CANCELLED') {
        allowed.push('CANCELLED')
    }
    return allowed
}

const availableStatuses = computed(() => {
    if (!selectedOrder.value) return []
    return getAllowedStatuses(selectedOrder.value.status, selectedOrder.value.type)
})

// Status icon mapping
const statusIcons: Record<string, string> = {
    PENDING: 'mdi-clock-outline',
    CONFIRMED: 'mdi-check-circle-outline',
    PREPARING: 'mdi-chef-hat',
    AWAITING_PICK_UP: 'mdi-timer-sand',
    OUT_FOR_DELIVERY: 'mdi-moped',
    DELIVERED: 'mdi-package-variant-closed-check',
    PICKED_UP: 'mdi-check-decagram',
    FAILED: 'mdi-alert-circle-outline',
    CANCELLED: 'mdi-cancel'
}

const getStatusIcon = (status: OrderStatus): string => statusIcons[status] || 'mdi-help-circle'

// Status color mapping
const getStatusColor = (status: OrderStatus): string => {
    const colors: Record<string, string> = {
        PENDING: 'orange',
        CONFIRMED: 'blue',
        PREPARING: 'cyan',
        AWAITING_PICK_UP: 'orange',
        OUT_FOR_DELIVERY: 'purple',
        DELIVERED: 'green',
        PICKED_UP: 'green',
        FAILED: 'red',
        CANCELLED: 'red'
    }
    return colors[status] || 'primary'
}

const getPaymentStatusColor = (status: string | undefined) => {
    if (!status) return 'red'
    const colors: Record<string, string> = {
        open: 'orange',
        cancelled: 'gray',
        pending: 'gray',
        expired: 'gray',
        failed: 'red',
        paid: 'green',
    }
    return colors[status.toLowerCase()] || 'grey'
}

const { data: dataOrders } = await useGqlQuery<{ orders: Order[] }>(
    ORDERS_QUERY,
    {},
    { immediate: true },
)

// Populate the Pinia store with orders fetched from the server
if (dataOrders.value?.orders) {
    ordersStore.setOrders(dataOrders.value?.orders)
}

// Touch events for swipe to change status
const touchStart = (e: TouchEvent, order: Order) => {
    touchStartX.value = e.touches[0].clientX
}
const touchEnd = (e: TouchEvent, order: Order) => {
    const touchEndX = e.changedTouches[0].clientX
    const deltaX = touchEndX - touchStartX.value
    if (Math.abs(deltaX) > 50) {
        // For swipe, simulate moving one step in allowed statuses if possible
        const allowed = getAllowedStatuses(order.status as OrderStatus, order.type)
        if (allowed.length) {
            const currentIndex = allowed.indexOf(order.status)
            const newStatus = deltaX > 0
                ? allowed[Math.max(currentIndex - 1, 0)]
                : allowed[Math.min(currentIndex + 1, allowed.length - 1)]
            handleStatusButton(newStatus)
            vibrate()
        }
    }
}

// Component methods
const openBottomSheet = (order: Order) => {
    selectedOrder.value = order;


    try {
        if (order.estimatedReadyTime) {
            sliderDeltaMinutes.value = 0;
            // Parse existing ISO datetime string directly
            const estimatedDate = new Date(order.estimatedReadyTime);

            // Validate the parsed date
            if (isNaN(estimatedDate.getTime())) {
                throw new Error('Invalid date format');
            }

            // Use the actual parsed date as base
            baseEstimatedTime.value = estimatedDate;
        } else {
            sliderDeltaMinutes.value = 30;
            // If no estimate exists, use current time + 30 minutes as base
            baseEstimatedTime.value = new Date();
        }
    } catch (e) {
        console.error('Error initializing time:', e);
        // Fallback to current time if parsing fails
        baseEstimatedTime.value = new Date();
    }

    showBottomSheet.value = true;
};

const updateEstimatedTimeFromSlider = () => {
    try {
        const now = new Date();

        // Ensure sliderMinutes is a valid number between 15-90
        const validMinutes = Math.max(15, Math.min(90, Number(sliderMinutes.value) || 30));

        // Calculate target time
        const targetTime = new Date(now.getTime() + validMinutes * 60000);

        // Validate target time
        if (isNaN(targetTime.getTime())) {
            throw new Error('Calculated invalid target time');
        }

        // Update estimated time
        estimatedReadyTime.value = formatTimeOnly(targetTime.toISOString());
    } catch (e) {
        console.error('Time calculation error:', e);
        estimatedReadyTime.value = '--:--';
        sliderMinutes.value = 30;
    }
};

const saveEstimatedTime = async () => {
    if (!selectedOrder.value || !baseEstimatedTime.value) return;

    // Calculate new time based on delta
    const newTime = new Date(baseEstimatedTime.value.getTime() + sliderDeltaMinutes.value * 60000);

    await updateOrder(
        undefined,
        timeToRFC3339(formatTimeOnly(newTime.toISOString()))
    );
};


const hasExistingEstimate = computed(() => !!selectedOrder.value?.estimatedReadyTime);

const currentEstimatedTime = computed(() => {
    if (!selectedOrder.value?.estimatedReadyTime) return '';
    return formatTimeOnly(selectedOrder.value.estimatedReadyTime);
});

const newEstimatedTime = computed(() => {
    if (!baseEstimatedTime.value) return '';
    const newTime = new Date(baseEstimatedTime.value.getTime() + sliderDeltaMinutes.value * 60000);
    return formatTimeOnly(newTime.toISOString());
});

const handleStatusButton = (newStatus: OrderStatus) => {
    if (newStatus === 'CANCELLED') {
        openCancelDialog()
    } else {
        updateOrder(newStatus)
    }
}

const updateOrder = async (newStatus?: OrderStatus, estimatedReadyTime?: string) => {
    if (!selectedOrder.value) return

    let status = newStatus;
    try {
        const res = await mutationUpdateOrder({
            id: selectedOrder.value.id,
            input: {
                status,
                estimatedReadyTime,
            }
        })

        ordersStore.updateOrder(res.updateOrder)
        showBottomSheet.value = false
    } catch (error) {
        console.error('Update failed:', error)
    }
}

const reprintOrder = () => {
    if (selectedOrder.value) printReceipt(selectedOrder.value)
}

const formatOrderSummary = (order: Order) => {
    return order.type === 'DELIVERY'
        ? `${t('orders.delivery')}: ${formatAddress(order.address)}`
        : t('orders.pickup')
}

const printReceipt = (order: Order) => {
    const encodedItems: string = JSON.stringify(order.items);
    if (typeof window !== 'undefined' && 'PrintHandler' in window) {
        (window as any).PrintHandler.print(encodedItems);
    } else {
        console.error('🖨️ PrintHandler not available');
    }
}

const notificationSound = () => {
    if (typeof window !== 'undefined' && 'SoundHandler' in window) {
        (window as any).SoundHandler.playNotificationSound()
    } else {
        console.error('SoundHandler not available');
    }
}

// Cancellation confirmation dialog
const openCancelDialog = () => {
    cancelDelay.value = 5
    showCancelDialog.value = true
    cancelTimer = window.setInterval(() => {
        if (cancelDelay.value > 0) {
            cancelDelay.value -= 1
        } else {
            clearInterval(cancelTimer)
            cancelTimer = undefined
        }
    }, 1000)
}

const confirmCancellation = async () => {
    await updateOrder('CANCELLED')
    showCancelDialog.value = false
}

const cancelCancellation = () => {
    showCancelDialog.value = false
    if (cancelTimer) {
        clearInterval(cancelTimer)
        cancelTimer = undefined
    }
}

const vibrate = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(50)
    }
}

const cardStyle = (order: Order) => {
    if (order.status === 'PENDING') {
        return {
            transform: 'scale(1.02)',
            transition: 'transform 0.2s',
            border: '3px solid #ff0000',
            boxShadow: '0 0 15px rgba(255, 0, 0, 0.5)'
        }
    } else {
        return {
            transform: order.id === selectedOrder.value?.id ? 'scale(0.98)' : 'none',
            transition: 'transform 0.2s'
        }
    }
}

onMounted(() => {
    // ORDER UPDATED
    const { data: orderUpdated, stop: stopUpdated } = useGqlSubscription<{
        orderUpdated: Partial<Order>
    }>(
        print(gql`
            subscription {
                orderUpdated {
                    id
                    status
                    estimatedReadyTime
                }
            }
        `),
        {}
    )

    watch(orderUpdated, (val) => {
        if (val?.orderUpdated && dataOrders.value?.orders) {
            const updatedOrder = val.orderUpdated
            const orderIndex = dataOrders.value.orders.findIndex(order => order.id === updatedOrder.id)
            if (orderIndex !== -1) {
                dataOrders.value.orders[orderIndex] = {
                    ...dataOrders.value.orders[orderIndex],
                    ...updatedOrder,
                }
            }
        }
    })

    // ORDER CREATED
    const { data: orderCreated, stop: stopCreated } = useGqlSubscription<{
        orderCreated: Order
    }>(
        print(gql`
            subscription {
                orderCreated {
                    id
                    createdAt
                    updatedAt
                    status
                    type
                    isOnlinePayment
                    discountAmount
                    deliveryFee
                    totalPrice
                    preferredReadyTime
                    estimatedReadyTime
                    addressExtra
                    orderNote
                    orderExtra

                    address {
                        streetName
                        municipalityName
                        postcode
                    }
                    customer {
                        id
                        firstName
                        lastName
                    }
                    payment {
                        status
                    }
                    items {
                        unitPrice
                        quantity
                        totalPrice
                        product {
                            id
                            name
                            category {
                                id
                                name
                            }
                        }
                    }
                }
            }
        `),
        {}
    )

    watch(orderCreated, (val) => {
        if (val?.orderCreated) {
            ordersStore.addOrder(val.orderCreated)
            notificationSound()
        }
    })
})
</script>

<style scoped>
.order-item {
    touch-action: pan-y;
    user-select: none;
}

.fab {
    position: fixed;
    z-index: 999;
}

.v-btn {
    text-transform: none;
}

.order-enter-active, .order-leave-active {
    transition: all 0.5s ease;
}
.order-enter-from {
    opacity: 0;
    transform: translateY(-10px);
}
.order-enter-to {
    opacity: 1;
    transform: translateY(0);
}

.time-input {
    max-width: 120px;
}
</style>
