import { Capacitor } from '@capacitor/core'
import { defineNuxtPlugin } from '#imports'

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
})
