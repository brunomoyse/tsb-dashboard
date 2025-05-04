<template>
    <div class="min-h-screen flex flex-col bg-gray-50">
        <OrdersList @select="onSelect" />
        <OrderSheet
            v-if="selectedOrder"
            v-model:open="showSheet"
            :order="selectedOrder"
            @save-changes="onSaveChanges"
            @print="onPrint"
        />
        <CancelDialog
            v-if="selectedOrder"
            :open="showCancel"
            :order="selectedOrder"
            :delay="cancelDelay"
            @confirm="onConfirmCancel"
            @close="onCloseCancel"
        />
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import OrdersList from '~/components/orders/OrdersList.vue'
import OrderSheet from '~/components/orders/OrderSheet.vue'
import CancelDialog from '~/components/orders/CancelDialog.vue'
import { useOrdersStore } from '~/stores/orders'
import gql from 'graphql-tag'
import { print } from 'graphql'
import {timeToRFC3339, useGqlQuery} from '#imports'
import type {Order, OrderStatus, Product, UpdateOrderInput} from '@/types'

const ordersStore = useOrdersStore()
const selectedOrder = ref<Order|null>(null)
const showSheet = ref(false)
const showCancel = ref(false)
const cancelDelay = ref(3)
let cancelTimer: number | undefined = undefined

// Initial fetch of orders
const ORDERS_QUERY = gql`
  query {
    orders {
      id
      createdAt
      status
      type
      isOnlinePayment
      preferredReadyTime
      estimatedReadyTime
      address {
        streetName
        houseNumber
        municipalityName
        postcode
        distance
      }
      payment { status }
      items {
        unitPrice
        quantity
        totalPrice
        product { id name category { id name } }
      }
    }
  }
`

const UPDATE_ORDER_MUTATION = gql`
  mutation($id: ID!, $input: UpdateOrderInput!) {
    updateOrder(id: $id, input: $input) {
      id
      status
      estimatedReadyTime
    }
  }
`

const { data: dataOrders } = await useGqlQuery<{ orders: Order[] }>(
    print(ORDERS_QUERY),
    {},
    { immediate: true, cache: true }
)
if (dataOrders.value?.orders) {
    ordersStore.setOrders(dataOrders.value.orders)
}

const onSelect = (order: Order) => {
    selectedOrder.value = order
    resetCancelDelay()
    showSheet.value = true
}

const onSaveChanges = async (input: UpdateOrderInput) => {
    if (input.status === 'CANCELLED') {
        showCancel.value = true
    } else {
        const { mutate: mutationUpdateOrder } = useGqlMutation<{ updateOrder: Order }>(UPDATE_ORDER_MUTATION)

        const { updateOrder: updatedOrder } = await mutationUpdateOrder({
            id: selectedOrder.value?.id,
            input: {
                ...input,
                estimatedReadyTime: input.estimatedReadyTime
                    ? timeToRFC3339(input.estimatedReadyTime)
                    : undefined,
            },
        })

        ordersStore.updateOrder(updatedOrder)
        showSheet.value = false
    }
}

const onPrint = () => {
    if (!selectedOrder.value) return
    const encoded = JSON.stringify(selectedOrder.value.items)
    const fn = () => {
        if (typeof window !== 'undefined' && 'PrintHandler' in window) {
            (window as any).PrintHandler.print(encoded)
        } else {
            console.error('PrintHandler not available')
        }
    }
    fn()
}

const onCloseCancel = () => {
    showCancel.value = false
    resetCancelDelay()
}

const onConfirmCancel = () => {
    ordersStore.updateOrder({ id: selectedOrder.value?.id, status: 'CANCELLED' })
    showCancel.value = false
    showSheet.value = false
    resetCancelDelay()
}

const resetCancelDelay = () => {
    cancelDelay.value = 5
    if (cancelTimer) clearInterval(cancelTimer)
    cancelTimer = window.setInterval(() => {
        if (cancelDelay.value > 0) {
            cancelDelay.value -= 1
        } else {
            clearInterval(cancelTimer)
            cancelTimer = undefined
        }
    }, 1000)
}
</script>
