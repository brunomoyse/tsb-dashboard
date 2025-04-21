<template>
    <v-container class="pa-4" fluid>
        <v-alert type="error" v-if="errorMessage" class="mb-4" @click="errorMessage = ''">
            {{ errorMessage }}
        </v-alert>

        <v-row align="center" justify="center">
            <v-col cols="12" sm="8" md="4">
                <v-card>
                    <v-card-title>
                        Login
                    </v-card-title>
                    <v-card-text>
                        <v-form ref="form" v-model="valid" @submit.prevent="onSubmit">
                            <v-text-field
                                autocomplete="email"
                                name="email"
                                label="Email"
                                v-model="email"
                                :rules="[rules.required]"
                                required
                            ></v-text-field>
                            <v-text-field
                                autocomplete="current-password"
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
import { useNuxtApp, useLocalePath, navigateTo } from '#imports'
import type {LoginResponse, User} from "~/types";
import {useAuthStore} from '@/stores/auth'
import gql from 'graphql-tag'
import { print } from 'graphql'

definePageMeta({
    public: true,
    layout: false
})

const { $api } = useNuxtApp()
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

const email = ref('')
const password = ref('')
const valid = ref(false)

const rules = {
    required: (value: unknown) => !!value || 'This field is required.'
}

// Regular email/password login
const errorMessage = ref('')

const login = async (): Promise<boolean> => {
    errorMessage.value = ''
    try {
        await $api<LoginResponse>('/login', {
            method: 'POST',
            body: { email: email.value, password: password.value },
        });
        return true
    } catch (error: any) {
        errorMessage.value = 'Invalid email or password'
        return false
    }
}

const loginSuccess = async () => {
    if (import.meta.client) {
        const { data: dataUser } = await useGqlQuery<{ me: User }>(print(ME))
        if (dataUser.value) authStore.setUser(dataUser.value.me)
    }
    navigateTo(localePath('orders'))
}

const onSubmit = async () => {
    if (!valid.value) return

    const success = await login();
    if (!success) return // don't redirect if login failed

    await loginSuccess()
    navigateTo(localePath('orders'));
}
</script>
