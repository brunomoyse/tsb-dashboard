declare global {
  interface Window {
    epson?: {
      ePOSDevice: new () => EpsonDevice
    }
  }
}

interface EpsonDevice {
  DEVICE_TYPE_PRINTER: string

  connect(ip: string, port: number, callback: (result: string) => void): void
  disconnect(): void

  createDevice(
    deviceId: string,
    deviceType: string,
    options: { crypto: boolean; buffer: boolean },
    callback: (device: EpsonPrinter | null, errorCode: string) => void
  ): void

  discovery(options?: {
    portNumber?: number
    broadcast?: string
    interval?: number
    timeout?: number
  }): void

  onreceive?: (device: DiscoveredDevice) => void
  ondiscovery?: () => void
  ondiscoveryerror?: (error: string) => void
  stopDiscovery(): void
}

interface EpsonPrinter {
  ALIGN_LEFT: number
  ALIGN_CENTER: number
  ALIGN_RIGHT: number
  CUT_FEED: number

  addTextAlign(align: number): void
  addTextSize(width: number, height: number): void
  addText(text: string): void
  addCut(type: number): void
  send(callback: (success: boolean) => void): void
}

interface DiscoveredDevice {
  deviceid: string
  ipaddress: string
  macaddress: string
  deviceType: string
  port: number
}

export {}