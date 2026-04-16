export type PrintAlignment = 'left' | 'center' | 'right'

export interface PrintColumn {
  text: string
  width: number
  align: PrintAlignment
}

export interface SunmiPrinterPlugin {
  /** Bind to the Sunmi built-in printer service. Must be called before any print operation. */
  bindService(): Promise<void>

  /** Unbind from the printer service. Call when the app goes to background. */
  unbindService(): Promise<void>

  /** Returns the current printer status code and a human-readable description. */
  getStatus(): Promise<{ status: number; statusText: string }>

  /** Returns the device/printer model string. */
  getModel(): Promise<{ model: string }>

  /** Reset printer formatting (alignment, font size, bold) to defaults. */
  printerInit(): Promise<void>

  /** Print a text string. Supports \n for newlines. */
  printText(options: { text: string }): Promise<void>

  /** Set text alignment for subsequent print commands. */
  setAlignment(options: { alignment: PrintAlignment }): Promise<void>

  /** Set font size in sp (e.g. 24 = normal, 32 = large). */
  setFontSize(options: { size: number }): Promise<void>

  /** Enable or disable bold text. */
  setBold(options: { enabled: boolean }): Promise<void>

  /** Print a row of columns. Widths are proportional (must sum ≤ 8 for 58mm). */
  printColumnsText(options: { columns: PrintColumn[] }): Promise<void>

  /** Print a QR code. size is the module size in dots (1–16). */
  printQRCode(options: { content: string; size: number }): Promise<void>

  /** Print a base64-encoded bitmap image. */
  printImage(options: { base64: string }): Promise<void>

  /**
   * Print a 1D barcode.
   * symbology: 'UPC_A' | 'UPC_E' | 'EAN13' | 'EAN8' | 'CODE39' | 'ITF' | 'CODABAR' | 'CODE93' | 'CODE128'
   */
  printBarcode(options: { content: string; symbology: string }): Promise<void>

  /** Feed n blank lines. */
  lineWrap(options: { lines: number }): Promise<void>

  /**
   * Cut the paper. On devices without an auto-cutter, falls back to feeding
   * a few extra lines so the user can tear along the serrated edge.
   */
  cutPaper(): Promise<void>

  /** Enter transaction buffer mode. All subsequent commands are queued. */
  enterBuffer(): Promise<void>

  /** Exit transaction buffer mode. If commit=true, flush and print buffered commands. */
  exitBuffer(options: { commit: boolean }): Promise<void>
}
