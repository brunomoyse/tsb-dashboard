import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'dev.nuagemagique.tsb',
  appName: 'Tokyo Sushi Bar',
  webDir: '.output/public',
  server: {
    // Use https scheme on Android so cookies and fetch work correctly
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0b0d0e',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#0b0d0e',
      style: 'DARK',
    },
  },
  android: {
    minWebViewVersion: 60,
  },
}

export default config
