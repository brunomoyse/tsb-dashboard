import { defineNuxtPlugin, navigateTo } from '#imports'
import { Capacitor } from '@capacitor/core'

export default defineNuxtPlugin(async () => {
    if (!Capacitor.isNativePlatform()) return

    // StatusBar: dark icons on white background
    try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        await StatusBar.setStyle({ style: Style.Light })
        await StatusBar.setBackgroundColor({ color: '#FFFFFF' })
        await StatusBar.setOverlaysWebView({ overlay: false })
    } catch { /* StatusBar not available on web */ }

    // Hide splash screen once app is ready
    try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide()
    } catch { /* SplashScreen not available on web */ }

    // Deep-link listener: route any same-origin auth callback back into the SPA.
    // With androidScheme: 'https' and an in-WebView login, this usually doesn't
    // Fire — it's defensive for future IdP / Browser.open flows that may land
    // Back on the app via a deep link.
    try {
        const { App } = await import('@capacitor/app')
        App.addListener('appUrlOpen', ({ url }) => {
            try {
                const parsed = new URL(url)
                if (parsed.pathname.includes('/auth/callback')) {
                    navigateTo(`${parsed.pathname}${parsed.search}`)
                }
            } catch { /* Ignore malformed URLs */ }
        })
    } catch { /* @capacitor/app not available */ }
})
