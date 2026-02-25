import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Tests for the send() logic in useEpsonPrinter.
 *
 * Since the composable depends on window.epson (browser SDK), we test
 * the send/onreceive/onerror/timeout pattern directly by extracting
 * the same logic used in the composable.
 */

// Replicate the send function from the composable to test in isolation
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

describe('send()', () => {
  let mockPrinter: {
    send: ReturnType<typeof vi.fn>
    onreceive?: (res: { success: boolean; code: string; status: number }) => void
    onerror?: (err: { status: number }) => void
  }

  beforeEach(() => {
    vi.useFakeTimers()
    mockPrinter = {
      send: vi.fn()
    }
  })

  it('resolves when onreceive reports success', async () => {
    // Make send() trigger onreceive immediately
    mockPrinter.send.mockImplementation(() => {
      mockPrinter.onreceive!({ success: true, code: 'SUCCESS', status: 0 })
    })

    await expect(send(mockPrinter)).resolves.toBeUndefined()
    expect(mockPrinter.send).toHaveBeenCalledOnce()
  })

  it('rejects when onreceive reports failure', async () => {
    mockPrinter.send.mockImplementation(() => {
      mockPrinter.onreceive!({ success: false, code: 'EPTR_COVER_OPEN', status: 0 })
    })

    await expect(send(mockPrinter)).rejects.toThrow('Print job failed: EPTR_COVER_OPEN')
  })

  it('rejects when onerror fires (communication error)', async () => {
    mockPrinter.send.mockImplementation(() => {
      mockPrinter.onerror!({ status: 255 })
    })

    await expect(send(mockPrinter)).rejects.toThrow('Printer communication error (status: 255)')
  })

  it('rejects with timeout when printer does not respond', async () => {
    // Send() does nothing — no callback fires
    mockPrinter.send.mockImplementation(() => {})

    const promise = send(mockPrinter, 5000)

    // Advance timers past timeout
    vi.advanceTimersByTime(5001)

    await expect(promise).rejects.toThrow('Print job timed out')
  })

  it('ignores late onreceive after timeout', async () => {
    mockPrinter.send.mockImplementation(() => {})

    const promise = send(mockPrinter, 100)

    // Trigger timeout
    vi.advanceTimersByTime(101)

    await expect(promise).rejects.toThrow('Print job timed out')

    // Late onreceive should not cause unhandled rejection
    expect(() => {
      mockPrinter.onreceive!({ success: true, code: 'SUCCESS', status: 0 })
    }).not.toThrow()
  })

  it('ignores late onerror after successful print', async () => {
    mockPrinter.send.mockImplementation(() => {
      mockPrinter.onreceive!({ success: true, code: 'SUCCESS', status: 0 })
    })

    await expect(send(mockPrinter)).resolves.toBeUndefined()

    // Late onerror should not cause issues
    expect(() => {
      mockPrinter.onerror!({ status: 99 })
    }).not.toThrow()
  })

  it('uses default 30s timeout', async () => {
    mockPrinter.send.mockImplementation(() => {})

    const promise = send(mockPrinter)

    // 29 seconds — not yet timed out
    vi.advanceTimersByTime(29000)

    // Still pending — verify by checking if the late resolve works
    mockPrinter.onreceive!({ success: true, code: 'SUCCESS', status: 0 })
    await expect(promise).resolves.toBeUndefined()
  })

  it('calls printer.send() exactly once', async () => {
    mockPrinter.send.mockImplementation(() => {
      mockPrinter.onreceive!({ success: true, code: 'SUCCESS', status: 0 })
    })

    await send(mockPrinter)
    expect(mockPrinter.send).toHaveBeenCalledTimes(1)
  })
})

// Test the command wrapper mapping (addTextStyle, addTextFont, addTextAlign)
describe('command wrapper mapping', () => {
  it('maps addTextStyle options to SDK parameter order (reverse, ul, em, color)', () => {
    const sdkPrinter = {
      addTextStyle: vi.fn(),
      COLOR_1: 1
    }

    // Replicate the wrapper logic from the composable
    const addTextStyle = (options: { bold?: boolean; underline?: boolean; reverse?: boolean }) => {
      sdkPrinter.addTextStyle(
        options.reverse ?? false,
        options.underline ?? false,
        options.bold ?? false,
        sdkPrinter.COLOR_1
      )
    }

    addTextStyle({ bold: true })
    expect(sdkPrinter.addTextStyle).toHaveBeenCalledWith(false, false, true, 1)

    addTextStyle({ underline: true, reverse: true })
    expect(sdkPrinter.addTextStyle).toHaveBeenCalledWith(true, true, false, 1)

    addTextStyle({})
    expect(sdkPrinter.addTextStyle).toHaveBeenCalledWith(false, false, false, 1)
  })

  it('maps font names to SDK constants', () => {
    const sdkPrinter = {
      addTextFont: vi.fn(),
      FONT_A: 0,
      FONT_B: 1
    }

    const addTextFont = (font: 'A' | 'B') => {
      sdkPrinter.addTextFont(font === 'A' ? sdkPrinter.FONT_A : sdkPrinter.FONT_B)
    }

    addTextFont('A')
    expect(sdkPrinter.addTextFont).toHaveBeenCalledWith(0)

    addTextFont('B')
    expect(sdkPrinter.addTextFont).toHaveBeenCalledWith(1)
  })

  it('maps align strings to SDK constants', () => {
    const sdkPrinter = {
      addTextAlign: vi.fn(),
      ALIGN_LEFT: 0,
      ALIGN_CENTER: 1,
      ALIGN_RIGHT: 2
    }

    const alignMap: Record<string, number> = {
      left: sdkPrinter.ALIGN_LEFT,
      center: sdkPrinter.ALIGN_CENTER,
      right: sdkPrinter.ALIGN_RIGHT
    }

    const addTextAlign = (align: 'left' | 'center' | 'right') => {
      sdkPrinter.addTextAlign(alignMap[align])
    }

    addTextAlign('left')
    expect(sdkPrinter.addTextAlign).toHaveBeenCalledWith(0)

    addTextAlign('center')
    expect(sdkPrinter.addTextAlign).toHaveBeenCalledWith(1)

    addTextAlign('right')
    expect(sdkPrinter.addTextAlign).toHaveBeenCalledWith(2)
  })
})
