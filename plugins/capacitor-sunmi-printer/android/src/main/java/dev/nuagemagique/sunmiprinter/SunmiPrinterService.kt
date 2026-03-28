package dev.nuagemagique.sunmiprinter

import android.content.Context
import android.graphics.BitmapFactory
import android.util.Base64
import android.util.Log
import com.sunmi.peripheral.printer.InnerPrinterCallback
import com.sunmi.peripheral.printer.InnerPrinterManager
import com.sunmi.peripheral.printer.SunmiPrinterService as SunmiAidlService
import com.sunmi.peripheral.printer.WoyouConsts

private const val TAG = "SunmiPrinterService"

/** Status codes returned by updatePrinterState() */
object PrinterStatus {
    const val NORMAL = 1
    const val PREPARING = 2
    const val ABNORMAL_COMM = 3
    const val OUT_OF_PAPER = 4
    const val OVERHEATING = 5
    const val COVER_OPEN = 6
    const val CUTTER_ABNORMAL = 7
    const val CUTTER_RECOVERED = 8
    const val NO_BLACK_MARKER = 9
    const val NO_PRINTER = 10
    const val FIRMWARE_UPDATE = 11
}

/** Barcode symbology string → Sunmi integer constant mapping */
private val BARCODE_SYMBOLOGY = mapOf(
    "UPC_A" to 0,
    "UPC_E" to 1,
    "EAN13" to 2,
    "EAN8" to 3,
    "CODE39" to 4,
    "ITF" to 5,
    "CODABAR" to 6,
    "CODE93" to 7,
    "CODE128" to 8
)

/**
 * Wrapper around the Sunmi built-in printer AIDL service.
 *
 * Manages service binding/unbinding and exposes high-level print operations.
 * The underlying AIDL service ([SunmiAidlService]) is provided by the device
 * firmware — no separate APK is needed on Sunmi hardware.
 */
class SunmiPrinterService(private val context: Context) {

    private var sunmiService: SunmiAidlService? = null
    var isBound = false
        private set

    private var onBindSuccess: (() -> Unit)? = null
    private var onBindError: ((String) -> Unit)? = null

    private val innerPrinterCallback = object : InnerPrinterCallback() {
        override fun onCalling(aidlService: SunmiAidlService) {
            sunmiService = aidlService
            isBound = true
            Log.d(TAG, "Printer service bound successfully")
            onBindSuccess?.invoke()
        }
    }

    // ─── Lifecycle ──────────────────────────────────────────────────────────

    fun bindService(onSuccess: () -> Unit, onError: (String) -> Unit) {
        onBindSuccess = onSuccess
        onBindError = onError
        try {
            val bound = InnerPrinterManager.getInstance().bindService(context, innerPrinterCallback)
            if (!bound) {
                onError("Sunmi printer service not available on this device")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to bind printer service", e)
            onError(e.message ?: "Unknown error binding printer service")
        }
    }

    fun unbindService() {
        try {
            InnerPrinterManager.getInstance().unBindService(context, innerPrinterCallback)
        } catch (e: Exception) {
            Log.w(TAG, "Error unbinding printer service", e)
        } finally {
            isBound = false
            sunmiService = null
        }
    }

    // ─── Status ─────────────────────────────────────────────────────────────

    fun getStatus(): Int = try {
        sunmiService?.updatePrinterState() ?: -1
    } catch (e: Exception) {
        Log.e(TAG, "getStatus failed", e)
        -1
    }

    fun statusText(code: Int): String = when (code) {
        PrinterStatus.NORMAL -> "Normal"
        PrinterStatus.PREPARING -> "Preparing"
        PrinterStatus.ABNORMAL_COMM -> "Abnormal communication"
        PrinterStatus.OUT_OF_PAPER -> "Out of paper"
        PrinterStatus.OVERHEATING -> "Overheating"
        PrinterStatus.COVER_OPEN -> "Cover open"
        PrinterStatus.CUTTER_ABNORMAL -> "Cutter abnormal"
        PrinterStatus.CUTTER_RECOVERED -> "Cutter recovered"
        PrinterStatus.NO_BLACK_MARKER -> "No black mark"
        PrinterStatus.NO_PRINTER -> "No printer detected"
        PrinterStatus.FIRMWARE_UPDATE -> "Firmware updating"
        -1 -> "Service not bound"
        else -> "Unknown ($code)"
    }

    fun getModel(): String = try {
        sunmiService?.printerModal ?: "Unknown"
    } catch (e: Exception) {
        Log.e(TAG, "getModel failed", e)
        "Unknown"
    }

    // ─── Formatting ─────────────────────────────────────────────────────────

    fun printerInit() {
        sunmiService?.printerInit(null)
    }

    fun setAlignment(alignment: Int) {
        // 0 = left, 1 = center, 2 = right
        sunmiService?.setAlignment(alignment, null)
    }

    fun setFontSize(size: Float) {
        sunmiService?.setFontSize(size, null)
    }

    fun setBold(enabled: Boolean) {
        val value = if (enabled) WoyouConsts.ENABLE else WoyouConsts.DISABLE
        sunmiService?.setPrinterStyle(WoyouConsts.ENABLE_BOLD, value)
    }

    // ─── Printing ───────────────────────────────────────────────────────────

    fun printText(text: String) {
        sunmiService?.printText(text, null)
    }

    fun printColumnsText(texts: Array<String>, widths: IntArray, aligns: IntArray) {
        sunmiService?.printColumnsText(texts, widths, aligns, null)
    }

    fun printQRCode(content: String, size: Int) {
        // modulesize 1–16, errorlevel 0=L 1=M 2=Q 3=H
        sunmiService?.printQRCode(content, size.coerceIn(1, 16), 1, null)
    }

    fun printImage(base64Data: String) {
        val bytes = Base64.decode(base64Data, Base64.DEFAULT)
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            ?: throw IllegalArgumentException("Could not decode base64 image data")
        sunmiService?.printBitmap(bitmap, null)
    }

    fun printBarcode(content: String, symbology: String) {
        val sym = BARCODE_SYMBOLOGY[symbology.uppercase()]
            ?: throw IllegalArgumentException("Unknown barcode symbology: $symbology")
        // height=162, width=2, textPosition=0 (no text below)
        sunmiService?.printBarCode(content, sym, 162, 2, 0, null)
    }

    fun lineWrap(lines: Int) {
        sunmiService?.lineWrap(lines, null)
    }

    // ─── Buffer mode ────────────────────────────────────────────────────────

    fun enterBuffer() {
        // true = clear any existing buffer before entering
        sunmiService?.enterPrinterBuffer(true)
    }

    fun exitBuffer(commit: Boolean) {
        if (commit) {
            sunmiService?.exitPrinterBufferWithCallback(true, null)
        } else {
            sunmiService?.exitPrinterBuffer(false)
        }
    }

    // ─── Guard helper ───────────────────────────────────────────────────────

    /** Throws if the printer service is not yet bound. */
    fun requireBound() {
        check(isBound && sunmiService != null) { "Printer service is not bound. Call bindService() first." }
    }
}
