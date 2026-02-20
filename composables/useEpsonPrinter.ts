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
  addFeedLine(lines: number): void
  addCut(): void
}

export const useEpsonPrinter = () => {
  /**
   * Wait for Epson SDK to be loaded from CDN
   */
  const waitForSdk = (): Promise<void> => {
    return new Promise((resolve) => {
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
        console.warn('⚠️ Epson SDK not loaded after 10 seconds')
        resolve()
      }, 10000)
    })
  }

  /**
   * Check if SDK is available
   */
  const isSdkAvailable = (): boolean => {
    return typeof window !== 'undefined' && !!window.epson
  }

  /**
   * Connect to Epson printer
   */
  const connect = async (config: PrinterConfig): Promise<any> => {
    await waitForSdk()

    if (!isSdkAvailable()) {
      throw new Error('Epson SDK not available')
    }

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
  const createPrinter = async (ePosDev: any, deviceId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
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
  }

  /**
   * Send print job to printer
   */
  const send = async (printer: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      printer.send((success: boolean) => {
        if (success) {
          resolve()
        } else {
          reject(new Error('Print job failed'))
        }
      })
    })
  }

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
  const discoverPrinters = async (timeout: number = 5000): Promise<Array<{
    ip: string
    deviceId: string
    macAddress: string
    port: number
  }>> => {
    await waitForSdk()

    if (!isSdkAvailable()) {
      throw new Error('Epson SDK not available')
    }

    const ePosDev = new window.epson!.ePOSDevice()
    const discoveredPrinters: Array<{
      ip: string
      deviceId: string
      macAddress: string
      port: number
    }> = []

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
        console.error('❌ Discovery error:', error)
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
      console.error('❌ Print error:', error)
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