<template>
    <div class="flex-1 overflow-y-auto">
        <template v-if="orders.length">
            <div v-for="order in orders" :key="order.id" class="p-2">
                <OrderCard :order="order" @click="onSelect(order)" />
            </div>
        </template>
        <div v-else class="flex flex-col items-center justify-center p-8 text-gray-400">
            <PackageIcon class="w-16 h-16 mb-4" />
            <div class="text-lg">No orders</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useOrdersStore } from '~/stores/orders'
import OrderCard from '~/components/orders/OrderCard.vue'
import { PackageIcon } from 'lucide-vue-next'
import type { Order } from '@/types'

const ordersStore = useOrdersStore()
const orders = computed(() => ordersStore.orders)
const emit = defineEmits(['select'])
const onSelect = (order: Order) => emit('select', order)
</script>
