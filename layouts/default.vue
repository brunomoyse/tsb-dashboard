<template>
    <v-app>
        <v-app-bar app>
            <!-- Fixed Language Switcher -->
            <v-menu offset-y>
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props">
                        <v-avatar size="32">
                            <span class="text-h5">{{ currentLocaleIcon }}</span>
                        </v-avatar>
                    </v-btn>
                </template>
                <v-list>
                    <v-list-item
                        v-for="lang in languages"
                        :key="lang.value"
                        @click="onLanguageChange(lang.value)"
                    >
                        <v-list-item-title>{{ lang.label }}</v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-menu>

            <v-spacer></v-spacer>

            <!-- Navigation Buttons -->
            <NuxtLinkLocale to="products">
                <v-btn color="black">{{ t('nav.products') }}</v-btn>
            </NuxtLinkLocale>

            <v-btn color="black" disabled>{{ t('nav.orders') }}</v-btn>
            <v-btn color="black" disabled>{{ t('nav.booking') }}</v-btn>
        </v-app-bar>
        <v-main>
            <nuxt-page />
        </v-main>
    </v-app>
</template>

<script setup lang="ts">
const { locale, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const languages = [
    { value: 'fr', label: '🇫🇷 Français' },
    { value: 'en', label: '🇬🇧 English' },
    { value: 'zh', label: '🇨🇳 中文' }
]

const currentLocaleIcon = computed(() =>
    languages.find(l => l.value === locale.value)?.label.split(' ')[0] || '🌐'
)

const onLanguageChange = (newLocale: string) => {
    const newPath = switchLocalePath(newLocale)
    if (newPath) {
        navigateTo(newPath)
    }
}

const goToProducts = () => navigateTo('/products')
</script>
