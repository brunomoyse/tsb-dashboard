import { MockPrinter, generateReceiptPreview } from '~/utils/mockPrinter'
import { beforeEach, describe, expect, it } from 'vitest'

describe('MockPrinter', () => {
  let printer: MockPrinter

  beforeEach(() => {
    printer = new MockPrinter()
  })

  describe('addText', () => {
    it('outputs plain text left-aligned by default', () => {
      printer.addText('Hello\n')
      expect(printer.getOutput()).toBe('Hello')
    })

    it('handles multi-line text in a single call', () => {
      printer.addText('Line 1\nLine 2\n')
      expect(printer.getOutput()).toBe('Line 1\nLine 2')
    })

    it('does not add trailing empty line for text ending with newline', () => {
      printer.addText('Hello\n')
      const lines = printer.getOutput().split('\n')
      expect(lines).toEqual(['Hello'])
    })
  })

  describe('addTextAlign', () => {
    it('centers text within effective width', () => {
      printer.addTextAlign('center')
      printer.addText('HELLO\n')
      const line = printer.getOutput()
      // 48 chars wide, "HELLO" is 5 chars, padding = floor((48 - 5) / 2) = 21
      expect(line).toBe(`${' '.repeat(21)}HELLO`)
    })

    it('right-aligns text', () => {
      printer.addTextAlign('right')
      printer.addText('END\n')
      const line = printer.getOutput()
      // 48 - 3 = 45 spaces padding
      expect(line).toBe(`${' '.repeat(45)}END`)
    })

    it('left-aligns text with no padding', () => {
      printer.addTextAlign('left')
      printer.addText('START\n')
      expect(printer.getOutput()).toBe('START')
    })
  })

  describe('addTextSize', () => {
    it('adds size marker for non-default sizes', () => {
      printer.addTextSize(2, 2)
      printer.addText('BIG\n')
      expect(printer.getOutput()).toContain('[2x2]')
      expect(printer.getOutput()).toContain('BIG')
    })

    it('adds no marker for default 1x1 size', () => {
      printer.addTextSize(1, 1)
      printer.addText('Normal\n')
      expect(printer.getOutput()).toBe('Normal')
    })

    it('adjusts effective width for centering with larger size', () => {
      printer.addTextAlign('center')
      printer.addTextSize(2, 1)
      printer.addText('HI\n')
      // Effective width = floor(48 / 2) = 24, "HI" is 2 chars, padding = floor((24 - 2) / 2) = 11
      const line = printer.getOutput()
      expect(line).toBe(`[2x1] ${' '.repeat(11)}HI`)
    })
  })

  describe('addTextStyle', () => {
    it('adds bold marker when bold is true', () => {
      printer.addTextStyle({ bold: true })
      printer.addText('Bold text\n')
      expect(printer.getOutput()).toContain('[B]')
      expect(printer.getOutput()).toContain('Bold text')
    })

    it('no marker when bold is false', () => {
      printer.addTextStyle({ bold: false })
      printer.addText('Normal\n')
      expect(printer.getOutput()).toBe('Normal')
    })

    it('combines size and bold markers', () => {
      printer.addTextSize(2, 1)
      printer.addTextStyle({ bold: true })
      printer.addText('HEADER\n')
      expect(printer.getOutput()).toContain('[2x1,B]')
    })

    it('resets bold when called with bold: false', () => {
      printer.addTextStyle({ bold: true })
      printer.addText('Bold\n')
      printer.addTextStyle({ bold: false })
      printer.addText('Normal\n')
      const lines = printer.getOutput().split('\n')
      expect(lines[0]).toContain('[B]')
      expect(lines[1]).toBe('Normal')
    })
  })

  describe('addTextFont', () => {
    it('does not crash and produces no visible marker', () => {
      printer.addTextFont('A')
      printer.addText('Font A\n')
      printer.addTextFont('B')
      printer.addText('Font B\n')
      const lines = printer.getOutput().split('\n')
      expect(lines[0]).toBe('Font A')
      expect(lines[1]).toBe('Font B')
    })
  })

  describe('addFeedLine', () => {
    it('adds empty lines', () => {
      printer.addText('Before\n')
      printer.addFeedLine(3)
      printer.addText('After\n')
      const lines = printer.getOutput().split('\n')
      expect(lines).toEqual(['Before', '', '', '', 'After'])
    })

    it('adds zero lines when called with 0', () => {
      printer.addText('A\n')
      printer.addFeedLine(0)
      printer.addText('B\n')
      const lines = printer.getOutput().split('\n')
      expect(lines).toEqual(['A', 'B'])
    })
  })

  describe('addCut', () => {
    it('outputs cut marker with separator lines', () => {
      printer.addCut()
      const output = printer.getOutput()
      expect(output).toContain('CUT HERE')
      expect(output).toContain('\u2500'.repeat(48))
    })
  })

  describe('reset', () => {
    it('clears all state', () => {
      printer.addTextAlign('center')
      printer.addTextSize(2, 2)
      printer.addTextStyle({ bold: true })
      printer.addText('Some text\n')
      printer.reset()
      printer.addText('Fresh\n')
      expect(printer.getOutput()).toBe('Fresh')
    })
  })
})

describe('generateReceiptPreview', () => {
  it('executes build function and returns string output', () => {
    const output = generateReceiptPreview((cmd) => {
      cmd.addText('Test receipt\n')
      cmd.addCut()
    })
    expect(output).toContain('Test receipt')
    expect(output).toContain('CUT HERE')
  })
})
