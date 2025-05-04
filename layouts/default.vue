<!-- src/layouts/default.vue -->
<template>
    <div class="min-h-screen flex flex-col bg-gray-50">
        <!-- App Bar -->
        <header class="sticky top-0 z-50 flex items-center bg-white shadow px-4 h-12">
            <!-- Language Switcher -->
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" class="p-0">
                        <Avatar class="h-8 w-8">
                            <AvatarFallback>{{ currentLocaleIcon }}</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom" class="w-32">
                    <DropdownMenuGroup>
                        <DropdownMenuItem
                            v-for="lang in languages"
                            :key="lang.value"
                            @click="onLanguageChange(lang.value as 'fr' | 'en' | 'zh')"
                        >
                            {{ lang.label }}
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>

            <div class="flex-1" />

            <!-- Navigation Links -->
            <NuxtLinkLocale
                to="products"
                class="mx-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
                {{ t('navigation.products') }}
            </NuxtLinkLocale>
            <NuxtLinkLocale
                to="orders"
                class="mx-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
                {{ t('navigation.orders') }}
            </NuxtLinkLocale>
        </header>

        <!-- Page Content -->
        <main class="flex-1 overflow-auto">
            <NuxtPage />
        </main>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useLocalePath } from '#imports'
import { computed } from 'vue'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const { locale, t } = useI18n()
const localePath = useLocalePath()

const languages = [
    { value: 'fr', label: '🇫🇷 Français' },
    { value: 'en', label: '🇬🇧 English' },
    { value: 'zh', label: '🇨🇳 中文' }
]

const currentLocaleIcon = computed(() => {
    const lang = languages.find(l => l.value === locale.value)
    return lang ? lang.label.split(' ')[0] : '🌐'
})

const onLanguageChange = (newLocale: 'fr' | 'en' | 'zh') => {
    const newPath = localePath(newLocale)
    if (newPath) navigateTo(newPath)
}
</script>
