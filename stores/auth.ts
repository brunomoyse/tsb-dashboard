import type { User } from '@/types'
import { defineStore } from 'pinia'

export const useAuthStore = defineStore("auth", {
    state: () => ({
        user: null as User | null,
    }),

    actions: {
        setUser(user: User) {
            this.user = user
        },
        updateUser(user: Partial<User>) {
            if (this.user) {
                Object.assign(this.user, user)
            } else {
                this.user = user
            }
        },
        clearUser() {
            this.user = null
        },
        async logout() {
            try {
                const { useOidc } = await import('~/composables/useOidc')
                const { signOut } = useOidc()
                await signOut()
            } catch (error) {
                if (import.meta.dev) console.error('Logout error:', error)
            } finally {
                this.user = null
            }
        }
    },
    persist: true,
});
