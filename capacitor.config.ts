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
      backgroundColor: '#1a1410',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#1a1410',
      style: 'DARK',
    },
  },
  android: {
    minWebViewVersion: 60,
  },
}

export default config
