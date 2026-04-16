<template>
  <div class="flex justify-center items-center min-h-[50vh]">
    <div class="text-center">
      <div v-if="error" class="text-red-600">
        <p class="text-lg font-medium">{{ errorMessage }}</p>
        <NuxtLinkLocale to="/auth/login" class="text-red-500 underline mt-2 inline-block">
          {{ t('login.submit') }}
        </NuxtLinkLocale>
      </div>
      <div v-else class="animate-pulse">
        <p class="text-(--ui-text-muted)">{{ t('login.authenticating') }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { definePageMeta, onMounted, ref, useRuntimeConfig } from '#imports'
import { useI18n } from 'vue-i18n'
import { useOidc } from '~/composables/useOidc'
import { useAuthCallback } from '~/composables/useAuthCallback'

definePageMeta({
  public: true,
  layout: false
})

const config = useRuntimeConfig()
const isCapacitor = config.public.appBuild === 'capacitor'

const { handleCallback, exchangeCodeForTokens } = useOidc()
const { processCallback } = useAuthCallback()
const { t } = useI18n()
const error = ref(false)
const errorMessage = ref('')

onMounted(async () => {
    try {
        if (isCapacitor) {
            // Capacitor: extract code from the URL and exchange via backend proxy.
            // (oidc-client-ts's signinRedirectCallback validates a state cookie
            // that doesn't survive the Session API + authorize-proxy round-trip.)
            const url = new URL(window.location.href)
            const code = url.searchParams.get('code')
            if (!code) throw new Error('No authorization code in callback URL')
            await exchangeCodeForTokens(code)
        } else {
            await handleCallback()
        }

        const outcome = await processCallback()
        if (!outcome.ok) {
            error.value = true
            errorMessage.value = outcome.reason === 'not_admin'
                ? t('login.accessDenied')
                : t('login.callbackError')
        }
    } catch (e: any) {
        if (import.meta.dev) console.error('OIDC callback error:', e)
        error.value = true
        const status = e?.response?.status || e?.statusCode
        if (status === 429) {
            errorMessage.value = t('login.tooManyRequests')
        } else {
            errorMessage.value = t('login.callbackError')
        }
    }
})
</script>
