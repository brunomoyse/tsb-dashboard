<template>
  <div class="min-h-screen flex items-center justify-center bg-muted/50 p-4">
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :fields="fields"
        title="TSB Dashboard"
        description="Enter your credentials to access your account."
        icon="i-lucide-utensils"
        :submit="{ label: 'Login', block: true, size: 'lg' }"
        @submit="onSubmit"
      >
        <template v-if="errorMessage" #validation>
          <UAlert
            color="error"
            variant="soft"
            :title="errorMessage"
            icon="i-lucide-alert-circle"
          />
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import type { LoginResponse, User } from '~/types'
import { navigateTo, useLocalePath, useNuxtApp } from '#imports'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'

definePageMeta({
    public: true,
    layout: false
})

const { $api, $gqlFetch } = useNuxtApp()
const { t } = useI18n()
const localePath = useLocalePath()
const authStore = useAuthStore()

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

const fields: AuthFormField[] = [
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: 'Enter your email',
    icon: 'i-lucide-mail',
    required: true
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    icon: 'i-lucide-lock',
    required: true
  }
]

const errorMessage = ref('')

const login = async (email: string, password: string): Promise<boolean> => {
    errorMessage.value = ''
    try {
        await $api<LoginResponse>('/login', {
            method: 'POST',
            body: { email, password },
        })
        return true
    } catch (error: any) {
        errorMessage.value = 'Invalid email or password'
        return false
    }
}

const loginSuccess = async (): Promise<boolean> => {
    if (import.meta.client) {
        const data = await $gqlFetch<{ me: User }>(print(ME))
        if (data) {
            if (!data.me.isAdmin) {
                await authStore.logout()
                return false
            }
            authStore.setUser(data.me)
        }
    }
    return true
}

const onSubmit = async (event: FormSubmitEvent<{ email: string; password: string }>) => {
    const { email, password } = event.data

    const success = await login(email, password)
    if (!success) return

    const isAdmin = await loginSuccess()
    if (!isAdmin) {
        errorMessage.value = t('login.accessDenied')
        return
    }
    navigateTo(localePath('orders'))
}
</script>
