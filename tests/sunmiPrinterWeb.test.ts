import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock @capacitor/core so WebPlugin can be instantiated in Node/Vitest
const WebPlugin = function WebPlugin() {} as unknown as { new (): object }
vi.mock('@capacitor/core', () => ({
  WebPlugin,
  registerPlugin: vi.fn(),
}))

// Import AFTER mock is registered
const { SunmiPrinterWeb } = await import('~/plugins/capacitor-sunmi-printer/src/web')

describe('SunmiPrinterWeb (browser stub)', () => {
  let printer: InstanceType<typeof SunmiPrinterWeb>

  beforeEach(() => {
    printer = new SunmiPrinterWeb()
  })

  it('bindService resolves without error', async () => {
    await expect(printer.bindService()).resolves.toBeUndefined()
  })

  it('unbindService resolves without error', async () => {
    await expect(printer.unbindService()).resolves.toBeUndefined()
  })

  it('getStatus returns status 0 and a statusText', async () => {
    const result = await printer.getStatus()
    expect(result.status).toBe(0)
    expect(typeof result.statusText).toBe('string')
    expect(result.statusText.length).toBeGreaterThan(0)
  })

  it('getModel returns "Web"', async () => {
    const result = await printer.getModel()
    expect(result.model).toBe('Web')
  })

  it('printerInit resolves without error', async () => {
    await expect(printer.printerInit()).resolves.toBeUndefined()
  })

  it('printText resolves without error', async () => {
    await expect(printer.printText({ text: 'Hello' })).resolves.toBeUndefined()
  })

  it('setAlignment resolves without error', async () => {
    await expect(printer.setAlignment({ alignment: 'center' })).resolves.toBeUndefined()
  })

  it('setFontSize resolves without error', async () => {
    await expect(printer.setFontSize({ size: 24 })).resolves.toBeUndefined()
  })

  it('setBold resolves without error', async () => {
    await expect(printer.setBold({ enabled: true })).resolves.toBeUndefined()
  })

  it('printColumnsText resolves without error', async () => {
    await expect(
      printer.printColumnsText({
        columns: [
          { text: '2x Saumon Maki', width: 24, align: 'left' },
          { text: '17,00€', width: 8, align: 'right' },
        ],
      })
    ).resolves.toBeUndefined()
  })

  it('printQRCode resolves without error', async () => {
    await expect(printer.printQRCode({ content: 'https://example.com', size: 6 })).resolves.toBeUndefined()
  })

  it('printImage resolves without error', async () => {
    await expect(printer.printImage({ base64: 'dGVzdA==' })).resolves.toBeUndefined()
  })

  it('printBarcode resolves without error', async () => {
    await expect(printer.printBarcode({ content: '123456789', symbology: 'CODE128' })).resolves.toBeUndefined()
  })

  it('lineWrap resolves without error', async () => {
    await expect(printer.lineWrap({ lines: 3 })).resolves.toBeUndefined()
  })

  it('enterBuffer resolves without error', async () => {
    await expect(printer.enterBuffer()).resolves.toBeUndefined()
  })

  it('exitBuffer resolves without error', async () => {
    await expect(printer.exitBuffer({ commit: true })).resolves.toBeUndefined()
  })

  it('exitBuffer with commit:false resolves without error', async () => {
    await expect(printer.exitBuffer({ commit: false })).resolves.toBeUndefined()
  })
})
