import type { PrintAlignment, PrintColumn, SunmiPrinterPlugin } from './definitions'
import { WebPlugin } from '@capacitor/core'

/**
 * Web stub for SunmiPrinter.
 * All methods are no-ops in the browser — on the Sunmi device the native
 * Android implementation is used instead.
 */
export class SunmiPrinterWeb extends WebPlugin implements SunmiPrinterPlugin {
  bindService(): Promise<void> {
    if (import.meta.env.DEV) console.info('[SunmiPrinter] bindService() — web stub')
    return Promise.resolve()
  }

  unbindService(): Promise<void> {
    if (import.meta.env.DEV) console.info('[SunmiPrinter] unbindService() — web stub')
    return Promise.resolve()
  }

  getStatus(): Promise<{ status: number; statusText: string }> {
    if (import.meta.env.DEV) console.info('[SunmiPrinter] getStatus() — web stub')
    return Promise.resolve({ status: 0, statusText: 'Web (no printer)' })
  }

  getModel(): Promise<{ model: string }> {
    if (import.meta.env.DEV) console.info('[SunmiPrinter] getModel() — web stub')
    return Promise.resolve({ model: 'Web' })
  }

  printerInit(): Promise<void> {
    if (import.meta.env.DEV) console.info('[SunmiPrinter] printerInit() — web stub')
    return Promise.resolve()
  }

  printText(options: { text: string }): Promise<void> {
    if (import.meta.env.DEV) console.info('[SunmiPrinter] printText():', options.text)
    return Promise.resolve()
  }

  setAlignment(options: { alignment: PrintAlignment }): Promise<void> {
    if (import.meta.env.DEV) console.info('[SunmiPrinter] setAlignment():', options.alignment)
    return Promise.resolve()
  }

  setFontSize(options: { size: number }): Promise<void> {
    if (import.meta.env.DEV) console.info('[SunmiPrinter] setFontSize():', options.size)
    return Promise.resolve()
  }

  setBold(options: { enabled: boolean }): Promise<void> {
    if (import.meta.env.DEV) console.info('[SunmiPrinter] setBold():', options.enabled)
    return Promise.resolve()
  }

  printColumnsText(options: { columns: PrintColumn[] }): Promise<void> {
    if (import.meta.env.DEV) console.info('[SunmiPrinter] printColumnsText():', options.columns)
    return Promise.resolve()
  }

  printQRCode(options: { content: string; size: number }): Promise<void> {
    if (import.meta.env.DEV) console.info('[SunmiPrinter] printQRCode():', options.content, 'size:', options.size)
    return Promise.resolve()
  }

  printImage(options: { base64: string }): Promise<void> {
    if (import.meta.env.DEV) console.info('[SunmiPrinter] printImage() — base64 length:', options.base64.length)
    return Promise.resolve()
  }

  printBarcode(options: { content: string; symbology: string }): Promise<void> {
    if (import.meta.env.DEV) console.info('[SunmiPrinter] printBarcode():', options.content, options.symbology)
    return Promise.resolve()
  }

  lineWrap(options: { lines: number }): Promise<void> {
    if (import.meta.env.DEV) console.info('[SunmiPrinter] lineWrap():', options.lines)
    return Promise.resolve()
  }

  enterBuffer(): Promise<void> {
    if (import.meta.env.DEV) console.info('[SunmiPrinter] enterBuffer() — web stub')
    return Promise.resolve()
  }

  exitBuffer(options: { commit: boolean }): Promise<void> {
    if (import.meta.env.DEV) console.info('[SunmiPrinter] exitBuffer() commit:', options.commit)
    return Promise.resolve()
  }
}
