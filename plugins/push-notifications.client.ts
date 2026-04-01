// Register for push notifications after auth is confirmed (Capacitor only)
import { Capacitor } from '@capacitor/core'

export default defineNuxtPlugin(async () => {
    if (!Capacitor.isNativePlatform()) return

    const { useAuthStore } = await import('~/stores/auth')
    const authStore = useAuthStore()

    // Only register if user is authenticated
    if (!authStore.user) return

    const { usePushNotifications } = await import('~/composables/usePushNotifications')
    const { register } = usePushNotifications()
    await register()
})
