<template>
    <Card
        class="flex items-center p-2 py-4 active:scale-95 transition-transform"
        :class="borderClass"
        @click="$emit('click')"
    >
        <div class="p-2">
            <Icon :name="iconName" class="w-6 h-6" />
        </div>
        <div class="flex-1 text-sm">
            <div class="font-semibold truncate text-center">{{ title }}</div>
            <div class="text-gray-500 truncate">{{ subtitle }}</div>
        </div>
        <div class="flex flex-col items-center text-xs space-y-1 ml-2">
            <Badge>{{ paymentLabel }}</Badge>
            <Badge>{{ statusLabel }}</Badge>
        </div>
    </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Icon from '~/components/Icon.vue'
import { useI18n } from 'vue-i18n'
import { formatDate, getStreetAndDistance } from '~/utils/utils'
import { getStatusIcon } from '~/utils/orders'

const props = defineProps({ order: Object })

const { t } = useI18n()
const iconName = computed(() => getStatusIcon(props.order?.status))
const borderClass = computed(() => props.order?.status === 'PENDING' ? 'border-2 border-red-500' : '')
const title = computed(() =>
    props.order?.type === 'DELIVERY'
        ? getStreetAndDistance(props.order?.address)
        : t('orders.pickup')
)
const subtitle = computed(() => formatDate(props.order?.createdAt))
const paymentLabel = computed(() => t(`orders.payment.status.${props.order?.payment?.status || 'notPaid'}`))
const statusLabel = computed(() => t(`orders.status.${props.order?.status.toLowerCase()}`))
</script>
