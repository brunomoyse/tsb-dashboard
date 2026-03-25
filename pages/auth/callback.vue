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
import type { User } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { definePageMeta, navigateTo, onMounted, ref, useLocalePath, useNuxtApp } from '#imports'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useI18n } from 'vue-i18n'
import { useOidc } from '~/composables/useOidc'

definePageMeta({
  public: true,
  layout: false
})

const { handleCallback } = useOidc()
const authStore = useAuthStore()
const localePath = useLocalePath()
const { $gqlFetch } = useNuxtApp()
const { t } = useI18n()
const error = ref(false)
const errorMessage = ref('')

const ME = gql`
    query {
        me {
            id
            email
            firstName
            lastName
            phoneNumber
            isAdmin
            address {
                id
                streetName
                houseNumber
                municipalityName
                postcode
                distance
            }
        }
    }
`

onMounted(async () => {
    try {
        await handleCallback()

        // Fetch user profile from our API
        const data = await $gqlFetch<{ me: User }>(print(ME))
        if (data) {
            // Check if user has admin role — if not, logout with error
            if (!data.me.isAdmin) {
                authStore.clearUser()
                error.value = true
                errorMessage.value = t('login.accessDenied')
                return
            }
            authStore.setUser(data.me)
        }

        // Redirect to dashboard home (orders page)
        navigateTo(localePath('orders'))
    } catch (e) {
        if (import.meta.dev) console.error('OIDC callback error:', e)
        error.value = true
        errorMessage.value = t('login.callbackError')
    }
})
</script>
