<template>
    <v-container class="pa-4" fluid>
        <v-row align="center" justify="center">
            <v-col cols="12" sm="8" md="4">
                <v-card>
                    <v-card-title>
                        Login
                    </v-card-title>
                    <v-card-text>
                        <v-form ref="form" v-model="valid" @submit.prevent="onSubmit">
                            <v-text-field
                                name="email"
                                label="Email"
                                v-model="email"
                                :rules="[rules.required]"
                                required
                            ></v-text-field>
                            <v-text-field
                                name="password"
                                label="Password"
                                type="password"
                                v-model="password"
                                :rules="[rules.required]"
                                required
                            ></v-text-field>
                            <v-card-actions>
                                <v-btn type="submit" :disabled="!valid" color="primary">
                                    Submit
                                </v-btn>
                            </v-card-actions>
                        </v-form>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useNuxtApp, useCookie, useLocalePath, navigateTo } from '#imports'
const localePath = useLocalePath()

interface LoginResponse {
    accessToken: string
}

definePageMeta({
    layout: false
})

const { $api } = useNuxtApp()

const email = ref('')
const password = ref('')
const valid = ref(false)

const rules = {
    required: (value: unknown) => !!value || 'This field is required.'
}

const onSubmit = async () => {
    if (!valid.value) return

    try {
        const response = await $api<LoginResponse>('/login', {
            method: 'POST',
            body: {
                email: email.value,
                password: password.value
            }
        })

        if (!response.accessToken) {
            console.error('Login failed')
            return
        }

        // Store the token in a cookie named "access_token"
        const accessTokenCookie = useCookie('access_token')
        accessTokenCookie.value = response.accessToken

        // navigateTo(localePath('orders'))
        navigateTo(localePath('orders', 'zh'))
    } catch (error) {
        console.error('Error during login', error)
    }
}
</script>
