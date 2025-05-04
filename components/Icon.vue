<template>
    <component :is="iconComponent" v-bind="attrs" />
</template>

<script setup lang="ts">
import { defineProps, useAttrs, computed } from 'vue'
import * as Icons from 'lucide-vue-next'

const props = defineProps({
    name: { type: String, default: 'HelpCircle' }
})
const attrs = useAttrs()
const iconComponent = computed(() => Icons[props.name] || Icons.HelpCircle)
</script>
