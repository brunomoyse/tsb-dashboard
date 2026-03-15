/**
 * TSB Dashboard Printer Plugin
 *
 * Integrates the generic Epson printer service with TSB-specific receipt formatting.
 * Uses automatic printer discovery - no manual IP configuration needed.
 */

import type { Order, TicketTemplates } from '~/types'
import {
  buildDeliveryTicket,
  buildKitchenTicket,
  createTestOrder,
} from '~/utils/receiptFormatter'
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
    const [printer] = printers
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
   * Print a delivery ticket for an order (DELIVERY COPY)
   */
  const printDeliveryTicket = async (orderJson: string, templates?: TicketTemplates): Promise<void> => {
    // Check if printing is enabled
    if (!config.public.printer.enabled) {
      if (import.meta.dev) console.warn('⚠️ Printer is disabled in configuration')
      return
    }

    try {
      const order: Order = JSON.parse(orderJson)

      // Get printer via auto-discovery
      let printerConfig = await getPrinterConfig()

      try {
        // Attempt to print with current config
        await print(printerConfig, buildDeliveryTicket(order, templates))
      } catch {
        if (import.meta.dev) console.warn('⚠️ Print failed, clearing cache and retrying discovery...')

        // Clear cache and retry with fresh discovery
        cachedPrinter = null
        printerConfig = await getPrinterConfig()

        // Retry print
        await print(printerConfig, buildDeliveryTicket(order, templates))
      }
    } catch (error) {
      if (import.meta.dev) console.error('❌ Failed to print delivery ticket:', error)
      throw error
    }
  }

  /**
   * Print a kitchen ticket for an order (KITCHEN COPY)
   */
  const printKitchenTicket = async (orderJson: string, templates?: TicketTemplates): Promise<void> => {
    // Check if printing is enabled
    if (!config.public.printer.enabled) {
      if (import.meta.dev) console.warn('⚠️ Printer is disabled in configuration')
      return
    }

    try {
      const order: Order = JSON.parse(orderJson)

      // Get printer via auto-discovery
      let printerConfig = await getPrinterConfig()

      try {
        // Attempt to print with current config
        await print(printerConfig, buildKitchenTicket(order, templates))
      } catch {
        if (import.meta.dev) console.warn('⚠️ Print failed, clearing cache and retrying discovery...')

        // Clear cache and retry with fresh discovery
        cachedPrinter = null
        printerConfig = await getPrinterConfig()

        // Retry print
        await print(printerConfig, buildKitchenTicket(order, templates))
      }
    } catch (error) {
      if (import.meta.dev) console.error('❌ Failed to print kitchen ticket:', error)
      throw error
    }
  }

  /**
   * Print both kitchen ticket and delivery ticket
   */
  const printBoth = async (orderJson: string, templates?: TicketTemplates): Promise<void> => {
    await printKitchenTicket(orderJson, templates)
    // Small delay between prints
    // eslint-disable-next-line no-promise-executor-return
    await new Promise(resolve => setTimeout(resolve, 500))
    await printDeliveryTicket(orderJson, templates)
  }

  /**
   * Test print with dummy order
   */
  const testPrint = async (templates?: TicketTemplates): Promise<void> => {
    const testOrder = createTestOrder()
    await printDeliveryTicket(JSON.stringify(testOrder), templates)
  }

  /**
   * Generate preview of delivery ticket (without printing)
   */
  const previewDelivery = (orderJson: string, templates?: TicketTemplates): string => {
    const order: Order = JSON.parse(orderJson)
    return generateReceiptPreview(buildDeliveryTicket(order, templates))
  }

  /**
   * Generate preview of kitchen ticket (without printing)
   */
  const previewKitchen = (orderJson: string, templates?: TicketTemplates): string => {
    const order: Order = JSON.parse(orderJson)
    return generateReceiptPreview(buildKitchenTicket(order, templates))
  }

  return {
    provide: {
      printer: {
        printDelivery: printDeliveryTicket,
        printKitchen: printKitchenTicket,
        printBoth: printBoth,
        testPrint: testPrint,
        discoverPrinters: discoverPrinters,
        previewDelivery: previewDelivery,
        previewKitchen: previewKitchen
      }
    }
  }
})
