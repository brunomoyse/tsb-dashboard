import gql from 'graphql-tag'
import { print } from 'graphql'
import { usePlatform } from '~/composables/usePlatform'

const REGISTER_DEVICE_TOKEN = print(gql`
    mutation ($deviceToken: String!, $platform: String!) {
        registerDeviceToken(deviceToken: $deviceToken, platform: $platform)
    }
`)

const UNREGISTER_DEVICE_TOKEN = print(gql`
    mutation ($deviceToken: String!) {
        unregisterDeviceToken(deviceToken: $deviceToken)
    }
`)

const STORAGE_KEY = 'push_device_token'

export function usePushNotifications() {
    const { isCapacitor } = usePlatform()
    const { $gqlFetch } = useNuxtApp()

    async function register() {
        if (!isCapacitor) return

        const { PushNotifications } = await import('@capacitor/push-notifications')

        // Check current permission status
        const permStatus = await PushNotifications.checkPermissions()
        if (permStatus.receive === 'denied') return

        // Request permission if not yet granted
        if (permStatus.receive !== 'granted') {
            const result = await PushNotifications.requestPermissions()
            if (result.receive !== 'granted') return
        }

        // Listen for registration success
        await PushNotifications.addListener('registration', async (token) => {
            const previousToken = localStorage.getItem(STORAGE_KEY)
            if (previousToken === token.value) return

            try {
                await $gqlFetch(REGISTER_DEVICE_TOKEN, {
                    variables: { deviceToken: token.value, platform: 'android' },
                })
                localStorage.setItem(STORAGE_KEY, token.value)
            } catch {
                // Token registration failure is non-critical
            }
        })

        // Listen for registration errors
        await PushNotifications.addListener('registrationError', () => {
            // Non-critical — app still works via WebSocket subscriptions
        })

        // Handle notification tap (app was backgrounded/closed)
        await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            const router = useNuxtApp().$router
            const localePath = useNuxtApp().$localePath as (path: string) => string
            router.push(localePath('/orders'))

            // If the notification has order-specific data, we could use it later
            void notification
        })

        // Register with FCM
        await PushNotifications.register()
    }

    async function unregister() {
        if (!isCapacitor) return

        const storedToken = localStorage.getItem(STORAGE_KEY)
        if (storedToken) {
            try {
                await $gqlFetch(UNREGISTER_DEVICE_TOKEN, {
                    variables: { deviceToken: storedToken },
                })
            } catch {
                // Best-effort cleanup
            }
            localStorage.removeItem(STORAGE_KEY)
        }

        try {
            const { PushNotifications } = await import('@capacitor/push-notifications')
            await PushNotifications.removeAllListeners()
        } catch {
            // Plugin may not be available
        }
    }

    return { register, unregister }
}
