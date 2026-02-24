/**
 * Mock Printer for Receipt Preview
 *
 * Simulates Epson printer commands and generates a text preview
 * without requiring a physical printer connection.
 */

import type { EpsonPrinterCommands } from '~/composables/useEpsonPrinter'

export class MockPrinter implements EpsonPrinterCommands {
  private output: string[] = []
  private currentAlign: 'left' | 'center' | 'right' = 'left'
  private currentSize: { width: number; height: number } = { width: 1, height: 1 }
  private currentBold = false
  private lineWidth = 48 // Standard 80mm thermal printer width in characters

  addTextAlign(align: 'left' | 'center' | 'right'): void {
    this.currentAlign = align
  }

  addTextSize(width: number, height: number): void {
    this.currentSize = { width, height }
  }

  addTextStyle(options: { bold?: boolean; underline?: boolean; reverse?: boolean }): void {
    this.currentBold = options.bold ?? false
  }

  addTextFont(_font: 'A' | 'B'): void {
    // No visual difference in text preview
  }

  addText(text: string): void {
    const lines = text.split('\n')

    lines.forEach((line, index) => {
      if (line === '') {
        if (index < lines.length - 1) {
          this.output.push('')
        }
        return
      }

      // Adjust line width based on text size
      const effectiveWidth = Math.floor(this.lineWidth / this.currentSize.width)

      // Apply alignment
      let formattedLine = line
      if (this.currentAlign === 'center') {
        const padding = Math.max(0, Math.floor((effectiveWidth - line.length) / 2))
        formattedLine = ' '.repeat(padding) + line
      } else if (this.currentAlign === 'right') {
        const padding = Math.max(0, effectiveWidth - line.length)
        formattedLine = ' '.repeat(padding) + line
      }

      // Apply text size styling
      const markers: string[] = []
      if (this.currentSize.width > 1 || this.currentSize.height > 1) {
        markers.push(`${this.currentSize.width}x${this.currentSize.height}`)
      }
      if (this.currentBold) {
        markers.push('B')
      }
      if (markers.length > 0) {
        formattedLine = `[${markers.join(',')}] ${formattedLine}`
      }

      this.output.push(formattedLine)
    })
  }

  addFeedLine(lines: number): void {
    for (let i = 0; i < lines; i++) {
      this.output.push('')
    }
  }

  addCut(): void {
    this.output.push('')
    this.output.push('\u2500'.repeat(this.lineWidth))
    this.output.push('\u2702 CUT HERE \u2702'.padStart(this.lineWidth / 2 + 7))
    this.output.push('\u2500'.repeat(this.lineWidth))
  }

  getOutput(): string {
    return this.output.join('\n')
  }

  reset(): void {
    this.output = []
    this.currentAlign = 'left'
    this.currentSize = { width: 1, height: 1 }
    this.currentBold = false
  }
}

/**
 * Generate a text preview of a receipt
 */
export const generateReceiptPreview = (
  buildReceipt: (cmd: EpsonPrinterCommands) => void
): string => {
  const mockPrinter = new MockPrinter()
  buildReceipt(mockPrinter)
  return mockPrinter.getOutput()
}
