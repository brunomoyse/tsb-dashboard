<template>
  <NuxtLink
    v-if="visible"
    :to="localePath('/assistant')"
    role="alert"
    class="mx-4 mt-3 md:mx-0 md:mt-0 px-4 py-3 rounded-[14px] bg-error text-inverted flex items-center gap-3"
  >
    <UIcon name="i-lucide-message-circle-warning" class="size-5 shrink-0" />
    <span class="flex-1 min-w-0 text-sm font-bold leading-snug">{{
      t('assistant.banner.text')
    }}</span>
    <span class="text-sm font-bold underline shrink-0">{{ t('assistant.banner.action') }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
import { showAssistantBanner } from '~/utils/assistant'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { connection } = useAssistantStatus()

const visible = computed(() => showAssistantBanner(connection.value, route.path))
</script>
