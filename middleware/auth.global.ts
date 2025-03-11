import { defineNuxtRouteMiddleware, navigateTo, useCookie, useRuntimeConfig, useLocalePath } from '#imports'

export default defineNuxtRouteMiddleware(async (to) => {
    // Exclude the login page from authentication check to avoid infinite redirection
    const localePath = useLocalePath()

    if (to.path === localePath('login')) return

    const token = getAccessToken()
    if (!token) {
        return navigateTo(localePath('login'))
    }

    if (import.meta.server) {
        // Dynamically import jsonwebtoken only on the server side
        const { default: jwt } = await import('jsonwebtoken')
        const config = useRuntimeConfig()
        const jwtSecret = config.jwtSecret as string

        try {
            jwt.verify(token, jwtSecret)
        } catch (error) {
            return navigateTo(localePath('login'))        }
    }
})

const getAccessToken = (): string | null => {
    const token = useCookie('access_token').value
    return token || null
}
