import {defineStore} from "pinia";
import type {User} from "@/types";
import {useRuntimeConfig} from "#imports";

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
            if (valid) {
                localStorage.setItem('token_expires', (Date.now() + 14*60*1000).toString());
            } else {
                localStorage.removeItem('token_expires');
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
                console.error('Logout error:', error)
            } finally {
                this.clearUser()
                localStorage.removeItem('token_expires')
            }
        }
    },
    persist: true,
});
