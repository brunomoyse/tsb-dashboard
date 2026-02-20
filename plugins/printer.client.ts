/**
 * TSB Dashboard Printer Plugin
 *
 * Integrates the generic Epson printer service with TSB-specific receipt formatting.
 * Uses automatic printer discovery - no manual IP configuration needed.
 */

import type { Order } from '~/types'
import { buildOrderReceipt, buildKitchenTicket, createTestOrder } from '~/utils/receiptFormatter'
import { generateReceiptPreview } from '~/utils/mockPrinter'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const { print, discoverPrinters } = useEpsonPrinter()

  // Cache discovered printer info
  let cachedPrinter: {
    ip: string
    deviceId: string
    port: number
  } | null = null

  /**
   * Get printer configuration via auto-discovery
   * Uses cached printer if available, otherwise discovers new printer
   */
  const getPrinterConfig = async (): Promise<{
    ip: string
    deviceId: string
    port: number
  }> => {
    // Return cached printer if available
    if (cachedPrinter) {
      return cachedPrinter
    }

    if (import.meta.dev) console.log('Discovering printers on network...')

    // Discover printers on network
    const printers = await discoverPrinters(5000)

    if (printers.length === 0) {
      throw new Error('No Epson printers found on network. Please check:\n' +
        '1. Printer is powered on and connected to network\n' +
        '2. ePOS-Print service is enabled on printer\n' +
        '3. Printer and dashboard are on same network')
    }

    // Use first discovered printer
    const printer = printers[0]
    if (import.meta.dev) console.log('Using printer:', printer.ip)

    // Cache for subsequent prints
    cachedPrinter = {
      ip: printer.ip,
      deviceId: printer.deviceId,
      port: printer.port
    }

    return cachedPrinter
  }

  /**
   * Print a complete receipt for an order (CLIENT COPY)
   */
  const printReceipt = async (orderJson: string): Promise<void> => {
    // Check if printing is enabled
    if (!config.public.printer.enabled) {
      console.warn('⚠️ Printer is disabled in configuration')
      return
    }

    try {
      const order: Order = JSON.parse(orderJson)

      // Get printer via auto-discovery
      let printerConfig = await getPrinterConfig()

      try {
        // Attempt to print with current config
        await print(printerConfig, buildOrderReceipt(order))
      } catch (printError) {
        console.warn('⚠️ Print failed, clearing cache and retrying discovery...')

        // Clear cache and retry with fresh discovery
        cachedPrinter = null
        printerConfig = await getPrinterConfig()

        // Retry print
        await print(printerConfig, buildOrderReceipt(order))
      }
    } catch (error) {
      console.error('❌ Failed to print receipt:', error)
      throw error
    }
  }

  /**
   * Print a kitchen ticket for an order (KITCHEN COPY)
   */
  const printKitchenTicket = async (orderJson: string): Promise<void> => {
    // Check if printing is enabled
    if (!config.public.printer.enabled) {
      console.warn('⚠️ Printer is disabled in configuration')
      return
    }

    try {
      const order: Order = JSON.parse(orderJson)

      // Get printer via auto-discovery
      let printerConfig = await getPrinterConfig()

      try {
        // Attempt to print with current config
        await print(printerConfig, buildKitchenTicket(order))
      } catch (printError) {
        console.warn('⚠️ Print failed, clearing cache and retrying discovery...')

        // Clear cache and retry with fresh discovery
        cachedPrinter = null
        printerConfig = await getPrinterConfig()

        // Retry print
        await print(printerConfig, buildKitchenTicket(order))
      }
    } catch (error) {
      console.error('❌ Failed to print kitchen ticket:', error)
      throw error
    }
  }

  /**
   * Print both client receipt and kitchen ticket
   */
  const printBoth = async (orderJson: string): Promise<void> => {
    await printKitchenTicket(orderJson)
    // Small delay between prints
    await new Promise(resolve => setTimeout(resolve, 500))
    await printReceipt(orderJson)
  }

  /**
   * Test print with dummy order
   */
  const testPrint = async (): Promise<void> => {
    const testOrder = createTestOrder()
    await printReceipt(JSON.stringify(testOrder))
  }

  /**
   * Generate preview of client receipt (without printing)
   */
  const previewReceipt = (orderJson: string): string => {
    const order: Order = JSON.parse(orderJson)
    return generateReceiptPreview(buildOrderReceipt(order))
  }

  /**
   * Generate preview of kitchen ticket (without printing)
   */
  const previewKitchen = (orderJson: string): string => {
    const order: Order = JSON.parse(orderJson)
    return generateReceiptPreview(buildKitchenTicket(order))
  }

  return {
    provide: {
      printer: {
        print: printReceipt,
        printKitchen: printKitchenTicket,
        printBoth: printBoth,
        testPrint: testPrint,
        discoverPrinters: discoverPrinters,
        previewReceipt: previewReceipt,
        previewKitchen: previewKitchen
      }
    }
  }
})