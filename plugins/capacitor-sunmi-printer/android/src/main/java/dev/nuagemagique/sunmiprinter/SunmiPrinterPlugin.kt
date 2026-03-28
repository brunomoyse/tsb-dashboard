package dev.nuagemagique.sunmiprinter

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "SunmiPrinter")
class SunmiPrinterPlugin : Plugin() {

    private lateinit var printerService: SunmiPrinterService

    override fun load() {
        printerService = SunmiPrinterService(activity.applicationContext)
    }

    // ─── Lifecycle ──────────────────────────────────────────────────────────

    @PluginMethod
    fun bindService(call: PluginCall) {
        printerService.bindService(
            onSuccess = { call.resolve() },
            onError = { msg -> call.reject(msg) }
        )
    }

    @PluginMethod
    fun unbindService(call: PluginCall) {
        printerService.unbindService()
        call.resolve()
    }

    // ─── Status ─────────────────────────────────────────────────────────────

    @PluginMethod
    fun getStatus(call: PluginCall) {
        val code = printerService.getStatus()
        val ret = JSObject()
        ret.put("status", code)
        ret.put("statusText", printerService.statusText(code))
        call.resolve(ret)
    }

    @PluginMethod
    fun getModel(call: PluginCall) {
        val ret = JSObject()
        ret.put("model", printerService.getModel())
        call.resolve(ret)
    }

    // ─── Formatting ─────────────────────────────────────────────────────────

    @PluginMethod
    fun printerInit(call: PluginCall) {
        try {
            printerService.requireBound()
            printerService.printerInit()
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message)
        }
    }

    @PluginMethod
    fun setAlignment(call: PluginCall) {
        try {
            printerService.requireBound()
            val alignStr = call.getString("alignment") ?: return call.reject("alignment is required")
            val alignInt = when (alignStr) {
                "left" -> 0
                "center" -> 1
                "right" -> 2
                else -> return call.reject("Invalid alignment: $alignStr. Use 'left', 'center', or 'right'")
            }
            printerService.setAlignment(alignInt)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message)
        }
    }

    @PluginMethod
    fun setFontSize(call: PluginCall) {
        try {
            printerService.requireBound()
            val size = call.getFloat("size") ?: return call.reject("size is required")
            printerService.setFontSize(size)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message)
        }
    }

    @PluginMethod
    fun setBold(call: PluginCall) {
        try {
            printerService.requireBound()
            val enabled = call.getBoolean("enabled") ?: return call.reject("enabled is required")
            printerService.setBold(enabled)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message)
        }
    }

    // ─── Printing ───────────────────────────────────────────────────────────

    @PluginMethod
    fun printText(call: PluginCall) {
        try {
            printerService.requireBound()
            val text = call.getString("text") ?: return call.reject("text is required")
            printerService.printText(text)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message)
        }
    }

    @PluginMethod
    fun printColumnsText(call: PluginCall) {
        try {
            printerService.requireBound()
            val columns = call.getArray("columns")
                ?: return call.reject("columns is required")

            val count = columns.length()
            val texts = Array(count) { "" }
            val widths = IntArray(count)
            val aligns = IntArray(count)

            for (i in 0 until count) {
                val col = columns.getJSONObject(i)
                texts[i] = col.optString("text", "")
                widths[i] = col.optInt("width", 1)
                aligns[i] = when (col.optString("align", "left")) {
                    "center" -> 1
                    "right" -> 2
                    else -> 0
                }
            }

            printerService.printColumnsText(texts, widths, aligns)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message)
        }
    }

    @PluginMethod
    fun printQRCode(call: PluginCall) {
        try {
            printerService.requireBound()
            val content = call.getString("content") ?: return call.reject("content is required")
            val size = call.getInt("size") ?: 8
            printerService.printQRCode(content, size)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message)
        }
    }

    @PluginMethod
    fun printImage(call: PluginCall) {
        try {
            printerService.requireBound()
            val base64 = call.getString("base64") ?: return call.reject("base64 is required")
            printerService.printImage(base64)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message)
        }
    }

    @PluginMethod
    fun printBarcode(call: PluginCall) {
        try {
            printerService.requireBound()
            val content = call.getString("content") ?: return call.reject("content is required")
            val symbology = call.getString("symbology") ?: return call.reject("symbology is required")
            printerService.printBarcode(content, symbology)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message)
        }
    }

    @PluginMethod
    fun lineWrap(call: PluginCall) {
        try {
            printerService.requireBound()
            val lines = call.getInt("lines") ?: return call.reject("lines is required")
            printerService.lineWrap(lines)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message)
        }
    }

    // ─── Buffer mode ────────────────────────────────────────────────────────

    @PluginMethod
    fun enterBuffer(call: PluginCall) {
        try {
            printerService.requireBound()
            printerService.enterBuffer()
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message)
        }
    }

    @PluginMethod
    fun exitBuffer(call: PluginCall) {
        try {
            printerService.requireBound()
            val commit = call.getBoolean("commit") ?: true
            printerService.exitBuffer(commit)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message)
        }
    }
}
