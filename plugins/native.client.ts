// plugins/native.client.ts — Native Android app polish (Capacitor only)
import { defineNuxtPlugin } from '#imports'

export default defineNuxtPlugin(async () => {
  // Only run inside Capacitor WebView
  if (typeof window === 'undefined' || !(window as unknown as { Capacitor?: unknown }).Capacitor) return

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')

    // Dark status bar matching app theme
    await StatusBar.setBackgroundColor({ color: '#1a1410' })
    await StatusBar.setStyle({ style: Style.Dark })
  } catch {
    // StatusBar plugin may not be available
  }
})
