import type { SunmiPrinterPlugin } from './definitions'
import { registerPlugin } from '@capacitor/core'

const SunmiPrinter = registerPlugin<SunmiPrinterPlugin>('SunmiPrinter', {
  web: () => import('./web').then(m => new m.SunmiPrinterWeb()),
})

export * from './definitions'
export { SunmiPrinter }
