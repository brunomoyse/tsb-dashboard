/**
 * Generic Epson ePOS SDK Composable
 *
 * Provides base functionality for Epson thermal printers using ePOS SDK.
 * This is SDK-specific logic and not tied to any particular business domain.
 */

export interface PrinterConfig {
  ip: string
  port?: number
  deviceId: string
  timeout?: number
}

export interface EpsonPrinterCommands {
  addTextAlign(align: 'left' | 'center' | 'right'): void
  addTextSize(width: number, height: number): void
  addText(text: string): void
  addTextStyle(options: { bold?: boolean; underline?: boolean; reverse?: boolean }): void
  addTextFont(font: 'A' | 'B'): void
  addFeedLine(lines: number): void
  addCut(): void
}

export const useEpsonPrinter = () => {
  /**
   * Wait for Epson SDK to be loaded from CDN
   */
  const waitForSdk = (): Promise<void> =>
    new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.epson) {
        resolve()
        return
      }

      const checkInterval = setInterval(() => {
        if (window.epson) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval)
        if (import.meta.dev) console.warn('Epson SDK not loaded after 10 seconds')
        resolve()
      }, 10000)
    })

  /**
   * Check if SDK is available
   */
  const isSdkAvailable = (): boolean =>
    typeof window !== 'undefined' && Boolean(window.epson)

  /**
   * Connect to Epson printer
   */
  const connect = async (config: PrinterConfig): Promise<any> => {
    await waitForSdk()

    if (!isSdkAvailable()) {
      throw new Error('Epson SDK not available')
    }

    // eslint-disable-next-line new-cap
    const ePosDev = new window.epson!.ePOSDevice()
    const port = config.port || 8008

    return new Promise((resolve, reject) => {
      ePosDev.connect(config.ip, port, (data: any) => {
        if (data === 'OK' || data === 'SSL_CONNECT_OK') {
          resolve(ePosDev)
        } else {
          reject(new Error(`Printer connection failed: ${data}`))
        }
      })
    })
  }

  /**
   * Create printer device object
   */
  const createPrinter = (ePosDev: any, deviceId: string): Promise<any> =>
    new Promise((resolve, reject) => {
      ePosDev.createDevice(
        deviceId,
        ePosDev.DEVICE_TYPE_PRINTER,
        { crypto: false, buffer: false },
        (deviceObj: any, errorCode: string) => {
          if (deviceObj) {
            resolve(deviceObj)
          } else {
            reject(new Error(`Failed to create printer object: ${errorCode}`))
          }
        }
      )
    })

  /**
   * Send print job to printer
   */
  const send = (printer: any, timeout = 30000): Promise<void> =>
    new Promise((resolve, reject) => {
      let settled = false

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true
          reject(new Error('Print job timed out'))
        }
      }, timeout)

      printer.onreceive = (res: { success: boolean; code: string; status: number }) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (res.success) {
          resolve()
        } else {
          reject(new Error(`Print job failed: ${res.code}`))
        }
      }

      printer.onerror = (err: { status: number }) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(new Error(`Printer communication error (status: ${err.status})`))
      }

      printer.send()
    })

  /**
   * Disconnect from printer
   */
  const disconnect = (ePosDev: any): void => {
    if (ePosDev) {
      ePosDev.disconnect()
    }
  }

  /**
   * Discover Epson printers on the network
   * @param timeout - Discovery timeout in milliseconds (default: 5000)
   * @returns Array of discovered printers with their IP addresses
   */
  const discoverPrinters = async (timeout = 5000): Promise<{
    ip: string
    deviceId: string
    macAddress: string
    port: number
  }[]> => {
    await waitForSdk()

    if (!isSdkAvailable()) {
      throw new Error('Epson SDK not available')
    }

    // eslint-disable-next-line new-cap
    const ePosDev = new window.epson!.ePOSDevice()
    const discoveredPrinters: {
      ip: string
      deviceId: string
      macAddress: string
      port: number
    }[] = []

    return new Promise((resolve, reject) => {
      // Set up discovery callbacks
      ePosDev.onreceive = (device: any) => {
        if (import.meta.dev) console.log('Discovered printer:', device)
        discoveredPrinters.push({
          ip: device.ipaddress,
          deviceId: device.deviceid,
          macAddress: device.macaddress,
          port: device.port || 8008
        })
      }

      ePosDev.ondiscovery = () => {
        if (import.meta.dev) console.log('Discovery completed')
        ePosDev.stopDiscovery()
        resolve(discoveredPrinters)
      }

      ePosDev.ondiscoveryerror = (error: string) => {
        if (import.meta.dev) console.error('Discovery error:', error)
        ePosDev.stopDiscovery()
        reject(new Error(`Discovery failed: ${error}`))
      }

      // Start discovery
      ePosDev.discovery({
        portNumber: 8008,
        interval: 1000
      })

      // Set timeout
      setTimeout(() => {
        ePosDev.stopDiscovery()
        resolve(discoveredPrinters)
      }, timeout)
    })
  }

  /**
   * Main print function - executes print commands
   */
  const print = async (
    config: PrinterConfig,
    buildCommands: (commands: EpsonPrinterCommands) => void
  ): Promise<void> => {
    let ePosDev: any = null

    try {
      // Connect to printer
      ePosDev = await connect(config)

      // Create printer object
      const printer = await createPrinter(ePosDev, config.deviceId)

      // Create command wrapper
      const commands: EpsonPrinterCommands = {
        addTextAlign: (align: 'left' | 'center' | 'right') => {
          const alignMap = {
            left: printer.ALIGN_LEFT,
            center: printer.ALIGN_CENTER,
            right: printer.ALIGN_RIGHT
          }
          printer.addTextAlign(alignMap[align])
        },
        addTextSize: (width: number, height: number) => {
          printer.addTextSize(width, height)
        },
        addText: (text: string) => {
          printer.addText(text)
        },
        addTextStyle: (options: { bold?: boolean; underline?: boolean; reverse?: boolean }) => {
          printer.addTextStyle(
            options.reverse ?? false,
            options.underline ?? false,
            options.bold ?? false,
            printer.COLOR_1
          )
        },
        addTextFont: (font: 'A' | 'B') => {
          printer.addTextFont(font === 'A' ? printer.FONT_A : printer.FONT_B)
        },
        addFeedLine: (lines: number) => {
          printer.addFeedLine(lines)
        },
        addCut: () => {
          printer.addCut(printer.CUT_FEED)
        }
      }

      // Execute user-provided commands
      buildCommands(commands)

      // Send to printer
      await send(printer)

      if (import.meta.dev) console.log('Print job completed successfully')
    } catch (error) {
      if (import.meta.dev) console.error('Print error:', error)
      throw error
    } finally {
      // Always disconnect
      if (ePosDev) {
        disconnect(ePosDev)
      }
    }
  }

  return {
    print,
    discoverPrinters,
    isSdkAvailable,
    waitForSdk
  }
}
