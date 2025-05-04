<template>
    <Dialog :open="open" @openChange="onClose">
        <DialogContent class="max-w-xs p-4 space-y-4">
            <div class="text-lg font-semibold">{{ t('orders.confirmCancelTitle') }}</div>
            <div class="text-sm text-gray-600">{{ t('orders.confirmCancelMessage') }}</div>
            <div class="text-xs text-red-600" v-if="order?.isOnlinePayment">
                {{ t('orders.refundNotice') }}
            </div>
            <div class="text-xs text-gray-500" v-if="delay && delay > 0">
                {{ t('orders.waitMessage', { seconds: delay }) }}
            </div>
            <div class="flex justify-end space-x-2">
                <Button variant="ghost" size="sm" @click="onClose">{{ t('orders.back') }}</Button>
                <Button variant="destructive" size="sm" @click="onConfirm" :disabled="delay && delay > 0">{{ t('orders.confirm') }}</Button>
            </div>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useI18n } from 'vue-i18n'
const props = defineProps({ open: Boolean, order: Object, delay: Number })
const emit = defineEmits(['openChange', 'confirm'])
const { t } = useI18n()
const onClose = () => emit('openChange', false)
const onConfirm = () => emit('confirm')
</script>
