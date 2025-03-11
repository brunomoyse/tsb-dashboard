<template>
    <v-app>
        <v-app-bar app>
            <v-btn @click="goToProducts">{{ t('nav.products') }}</v-btn>
            <v-btn disabled>{{ t('nav.orders') }}</v-btn>
            <v-btn disabled>{{ t('nav.booking') }}</v-btn>
            <v-spacer></v-spacer>
            <v-select
                v-model="locale"
                :items="languages"
                item-title="label"
                item-value="value"
                hide-details
                dense
                solo
                flat
                style="max-width: 150px;"
            ></v-select>
        </v-app-bar>
        <v-main>
            <nuxt-page />
        </v-main>
    </v-app>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { locale, t } = useI18n()

// Define the available languages for the switcher.
const languages = [
    { label: 'Français', value: 'fr' },
    { label: 'English', value: 'en' },
    { label: '中文', value: 'zh' }
]

const goToProducts = () => {
    router.push('/products')
}
</script>
