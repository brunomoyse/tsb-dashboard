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
import { ref } from 'vue'
import { useNuxtApp, useLocalePath, navigateTo } from '#imports'
import type { LoginResponse, User } from "~/types"
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'
import { useAuthStore } from '@/stores/auth'
import gql from 'graphql-tag'
import { print } from 'graphql'

definePageMeta({
    public: true,
    layout: false
})

const { $api, $gqlFetch } = useNuxtApp()
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

const loginSuccess = async () => {
    if (import.meta.client) {
        const data = await $gqlFetch<{ me: User }>(print(ME))
        if (data) authStore.setUser(data.me)
    }
    navigateTo(localePath('orders'))
}

const onSubmit = async (event: FormSubmitEvent<{ email: string; password: string }>) => {
    const { email, password } = event.data

    const success = await login(email, password)
    if (!success) return

    await loginSuccess()
    navigateTo(localePath('orders'))
}
</script>
