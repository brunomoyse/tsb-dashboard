<template>
    <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div class="w-full max-w-sm">
            <Card>
                <CardHeader>
                    <CardTitle>Login</CardTitle>
                </CardHeader>
                <CardContent>
                    <form class="space-y-4" @submit="onSubmit">
                        <!-- Email -->
                        <FormField
                            name="email"
                            :validate-on-blur="!isFieldDirty('email')"
                            v-slot="{ field: componentField, errorMessage: emailError }"
                        >
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        placeholder="you@example.com"
                                        autocomplete="email"
                                        v-bind="componentField"
                                    />
                                </FormControl>
                                <FormMessage>{{ emailError }}</FormMessage>
                            </FormItem>
                        </FormField>

                        <!-- Password -->
                        <FormField
                            name="password"
                            :validate-on-blur="!isFieldDirty('password')"
                            v-slot="{ field: componentField, errorMessage: passwordError }"
                        >
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        autocomplete="current-password"
                                        v-bind="componentField"
                                    />
                                </FormControl>
                                <FormMessage>{{ passwordError }}</FormMessage>
                            </FormItem>
                        </FormField>
                        <Button type="submit" class="w-full" :disabled="isSubmitting">
                            {{ isSubmitting ? 'Signing in...' : 'Sign in' }}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useNuxtApp, useLocalePath, navigateTo } from '#imports'
import { useAuthStore } from '@/stores/auth'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import gql from 'graphql-tag'
import { print } from 'graphql'

// Page meta
definePageMeta({ public: true, layout: false })

// Validation schema
const loginSchema = toTypedSchema(
    z.object({
        email: z.string().email('Must be a valid email'),
        password: z.string().min(1, 'Password is required'),
    })
)

const { handleSubmit, isSubmitting, isFieldDirty } = useForm({ validationSchema: loginSchema })

// GraphQL and API
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

// Submit handler
const onSubmit = handleSubmit(async (values) => {
    try {
        await $api('/login', {
            method: 'POST',
            body: values,
        })
        // fetch user
        const data = await $gqlFetch<{ me: any }>(print(ME))
        if (data) authStore.setUser(data.me)
        navigateTo(localePath('orders'))
    } catch (err: any) {
        console.error(err)
    }
})
</script>
