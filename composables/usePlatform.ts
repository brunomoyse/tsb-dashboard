import { Capacitor } from '@capacitor/core'

export function usePlatform() {
    const isCapacitor = Capacitor.isNativePlatform()
    const platform = Capacitor.getPlatform()
    return {
        isCapacitor,
        isWeb: !isCapacitor,
        isAndroid: isCapacitor && platform === 'android',
    }
}
