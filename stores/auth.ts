import type { User } from '@/types'
import { defineStore } from 'pinia'
import { useRuntimeConfig } from '#imports'

export const useAuthStore = defineStore("auth", {
    state: () => ({
        user: null as User | null,
        accessValid: false
    }),
    actions: {
        setUser(user: User) {
            this.user = user;
            this.accessValid = true;
        },
        clearUser() {
            this.user = null
            this.accessValid = false
        },
        setAccessValid(valid: boolean) {
            this.accessValid = valid
            if (import.meta.client) {
                if (valid) {
                    localStorage.setItem('token_expires', (Date.now() + 14*60*1000).toString());
                } else {
                    localStorage.removeItem('token_expires');
                }
            }
        },
        async logout() {
            try {
                const config = useRuntimeConfig()
                const apiUrl = config.public.api as string

                await $fetch(`${apiUrl}/logout`, {
                    method: 'POST',
                    credentials: 'include'
                })
            } catch (error) {
                if (import.meta.dev) console.error('Logout error:', error)
            } finally {
                this.clearUser()
                if (import.meta.client) {
                    localStorage.removeItem('token_expires')
                }
            }
        }
    },
    persist: true,
});
