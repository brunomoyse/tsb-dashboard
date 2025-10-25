# Epson Printer Setup Guide

This document provides instructions for setting up automatic Epson thermal receipt printing in the TSB Dashboard using the Epson ePOS SDK.

## Features

✨ **Zero Configuration** - Automatic printer discovery on your network
✨ **Intelligent Caching** - Remembers your printer for faster subsequent prints
✨ **Auto-Recovery** - Automatically rediscovers printer if connection fails
✨ **Hot-Reload Ready** - No restarts needed when printer IP changes

## Prerequisites

1. **Epson TM-series Thermal Printer** (e.g., TM-T88VI, TM-m30, TM-T20III)
2. Printer connected to the same network as the dashboard
3. Printer configured with static or DHCP reservation (recommended but not required)

## Quick Setup

### 1. Enable Printing

Add to your `.env` file:

```env
PRINTER_ENABLED=true
```

That's it! No IP address configuration needed.

### 2. Configure Printer

**Enable ePOS-Print service on your printer:**

1. Access printer web interface at `http://[PRINTER_IP]`
2. Navigate to Settings → Network → ePOS-Print
3. Enable "ePOS-Print Service"
4. Set port to `8008` (default)
5. Save and restart printer

### 3. Test It

Open your dashboard and run in browser console:

```javascript
// Test automatic discovery and printing
window.PrintHandler.testPrint()
```

The system will:
1. Automatically discover your printer on the network
2. Cache the printer info for future use
3. Print a test receipt

Done! 🎉

## How It Works

### Automatic Discovery

The first time you print, the system:

1. **Scans the network** for Epson printers (5 second scan)
2. **Finds your printer** via UDP broadcast
3. **Caches the connection** for instant subsequent prints
4. **Auto-recovers** if the printer IP changes or connection fails

No manual IP configuration required!

### Manual Discovery

You can manually discover printers at any time:

```javascript
// Find all Epson printers on your network
window.PrintHandler.discoverPrinters()
  .then(printers => {
    console.log('Found printers:', printers)
    // Example output:
    // [{
    //   ip: "192.168.1.100",
    //   deviceId: "local_printer",
    //   macAddress: "00:11:62:AB:CD:EF",
    //   port: 8008
    // }]
  })

// Custom scan timeout (e.g., 10 seconds for slower networks)
window.PrintHandler.discoverPrinters(10000)
```

## Supported Printers

The following Epson TM-series printers are supported:

- TM-T88VI
- TM-T88V
- TM-T70II
- TM-T20III
- TM-m30
- TM-P20
- TM-P60II
- TM-P80

## Receipt Format

The printed receipt includes:

- Restaurant name and header
- Order date and time
- Order number (first 8 characters of ID)
- Customer name and phone
- Order type (Delivery/Takeaway)
- Delivery address (if applicable)
- Estimated ready time
- Itemized list with quantities and prices
- Discount (if applicable)
- Delivery fee (if applicable)
- Total amount (emphasized)
- Payment method
- Order notes (if any)
- Thank you message

## Usage

### From Orders Page

1. Navigate to the Orders page
2. Click on an order to open details
3. Click the "Print" button
4. Receipt prints automatically

### From Console

```javascript
// Print test receipt
window.PrintHandler.testPrint()

// Print specific order
window.PrintHandler.print(JSON.stringify(order))
```

## Troubleshooting

### No Printers Found

**Error:** "No Epson printers found on network"

**Solutions:**
1. ✅ Verify printer is powered on
2. ✅ Check printer is connected to same network as dashboard
3. ✅ Ensure ePOS-Print service is enabled (see step 2 above)
4. ✅ Check firewall allows UDP broadcast on local network
5. ✅ Try manual discovery with longer timeout:
   ```javascript
   window.PrintHandler.discoverPrinters(10000) // 10 second scan
   ```

### Discovery Takes Too Long

**Problem:** Network scan is slow

**Solutions:**
1. Check network configuration (avoid network switches that block broadcasts)
2. Reduce network size or segment printers on separate VLAN
3. Set printer to static IP or DHCP reservation for faster discovery

### Print Fails After First Success

**Problem:** First print works, subsequent prints fail

**Cause:** Printer IP changed (DHCP reassignment)

**Solution:** The system automatically handles this! It will:
1. Detect the connection failure
2. Clear the cache
3. Rediscover the printer
4. Retry the print

**Prevention:** Set static IP or DHCP reservation for your printer

### SDK Not Loaded

**Error:** Console shows "Epson SDK not available"

**Solutions:**
1. Check internet connection (SDK loads from CDN)
2. Verify browser console for script loading errors
3. Check if `https://cdn.jsdelivr.net/npm/epson-epos-sdk@2.27.0/epos-2.27.0.js` is accessible
4. Clear browser cache and reload
5. Check corporate firewall allows CDN access

### Multiple Printers on Network

**Problem:** Multiple Epson printers found, using wrong one

**Current Behavior:** System uses the first printer discovered

**Solutions:**
1. **Preferred:** Use only one printer per network segment
2. **Alternative:** Temporarily disable other printers during setup
3. **Advanced:** Modify `plugins/printer.client.ts` to filter by MAC address or device ID

**Future Enhancement:** We can add printer selection if needed

## Advanced Configuration

### Custom Receipt Layout

Edit `utils/receiptFormatter.ts` to customize receipt content:

```typescript
// Add custom sections
const addCustomSection = (cmd: EpsonPrinterCommands): void => {
  cmd.addText('Visit us at tokyosushibar.be\n')
  cmd.addText('Follow us @tokyosushi\n')
}
```

### Multiple Printer Support

To support multiple printers (e.g., kitchen printer + receipt printer):

1. Modify discovery logic in `plugins/printer.client.ts`
2. Filter printers by location or device ID
3. Create separate print functions for each printer type

Example:
```typescript
const kitchenPrinters = printers.filter(p => p.deviceId.includes('kitchen'))
const receiptPrinters = printers.filter(p => p.deviceId.includes('receipt'))
```

### Customize Discovery Timeout

Edit `plugins/printer.client.ts`:

```typescript
// Change default timeout from 5000ms to 10000ms
const printers = await discoverPrinters(10000)
```

### Disable Printing Temporarily

Set in `.env`:
```env
PRINTER_ENABLED=false
```

Useful for:
- Development/testing without printer
- Temporary printer maintenance
- Demo environments

## Network Requirements

### Firewall Configuration

**Required Ports:**
- **UDP Broadcast**: For printer discovery
- **TCP 8008**: For ePOS-Print communication

**Firewall Rules:**
- Allow outbound UDP broadcast from dashboard
- Allow inbound TCP connections to printer port 8008
- Allow bidirectional traffic between dashboard and printer IP

### Network Topology

**Supported:**
- ✅ Same subnet (e.g., 192.168.1.0/24)
- ✅ Simple network switches
- ✅ Wireless networks (may be slower)

**May Require Configuration:**
- ⚠️ VLANs (need broadcast forwarding)
- ⚠️ Complex routing (need mDNS/Bonjour)
- ⚠️ VPN connections (discovery may fail)

## Security Notes

- Ensure printer is on a secure network
- Consider using HTTPS for dashboard access
- Set strong passwords on printer web interface
- Restrict access to printer management interface
- Keep printer firmware updated
- Discovery uses UDP broadcast (local network only)

## Performance

### First Print
- Discovery: ~1-5 seconds
- Print: ~1-2 seconds
- **Total: ~2-7 seconds**

### Subsequent Prints
- Discovery: 0 seconds (cached)
- Print: ~1-2 seconds
- **Total: ~1-2 seconds**

### Cache Behavior
- Cache persists for entire session
- Cleared on page reload
- Auto-cleared if connection fails

## Additional Resources

- [Epson ePOS-Print API Documentation](https://download.epson-biz.com/modules/pos/index.php?page=single_soft&cid=6678)
- [Epson ePOS SDK JavaScript](https://download.epson-biz.com/modules/pos/index.php?page=single_soft&cid=7125)
- [TM Printer Utilities](https://epson.com/tm-utility)

## Support

### Implementation Issues

Check:
- Browser console for error messages
- Network connectivity
- Printer ePOS-Print service status
- Environment variable configuration

### Hardware Issues

Contact:
- Epson support
- Consult printer manual
- Visit Epson developer portal

## FAQ

**Q: Do I need to configure the printer IP?**
A: No! The system automatically discovers your printer.

**Q: What happens if my printer IP changes?**
A: The system automatically rediscovers it on the next print.

**Q: Can I use multiple printers?**
A: Currently, the system uses the first discovered printer. Contact us if you need multi-printer support.

**Q: Does this work offline?**
A: You need internet for the initial SDK load, but printing works offline after that.

**Q: How do I know which printer will be used?**
A: Check browser console during first print. It logs the discovered printer IP.

**Q: Can I force a specific printer?**
A: Advanced users can modify the plugin to filter by MAC address or device ID.