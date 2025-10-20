import type { Address } from '~/types';

/**
 * Formats an address object into a string.
 * @param address - The address object to format.
 * @returns A formatted address string, or an empty string if the address is null.
 */
export function formatAddress(address: Address | null): string {
    if (!address) return '';
    const { streetName, houseNumber, boxNumber, postcode, municipalityName } = address;
    let formatted = `${streetName} ${houseNumber}`;
    if (boxNumber) {
        formatted += ` / ${boxNumber}`;
    }
    formatted += `, ${postcode} – ${municipalityName}`;
    return formatted;
}

export function getStreetAndDistance(address: Address | null): string {
    if (!address) return '';
    const { streetName, houseNumber, distance } = address;
    const km = distance / 1000;
    const formattedKm = km.toLocaleString('fr-BE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
    return `${streetName} ${houseNumber} (${formattedKm} km)`;
}

export const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat("fr-BE", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(dateString));

export const formatTimeOnly = (dateString: string) => {
    try {
        const date = new Date(dateString);

        // Validate date before formatting
        if (isNaN(date.getTime())) {
            console.error('Invalid date string:', dateString);
            return '--:--';
        }

        return new Intl.DateTimeFormat("fr-BE", {
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    } catch (e) {
        console.error('Date formatting error:', e);
        return '--:--';
    }
};

export const belPriceFormat = new Intl.NumberFormat('fr-BE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: "currency",
    currency: "EUR",
})

export const formatPrice = (price: number | string): string => {
    return belPriceFormat.format(Number(price));
}

/**
 * Pads a number to 2 digits.
 */
function pad2(n: number): string {
    return n.toString().padStart(2, '0');
}

/**
 * Formats a Date as an RFC3339 string with local timezone offset.
 *
 * @param date - the Date to format
 * @returns yyyy-MM-ddTHH:mm:ss±HH:MM
 */
function formatRFC3339Local(date: Date): string {
    const year   = date.getFullYear();
    const month  = pad2(date.getMonth() + 1);
    const day    = pad2(date.getDate());
    const hour   = pad2(date.getHours());
    const minute = pad2(date.getMinutes());
    const second = pad2(date.getSeconds());

    // timezone offset in minutes: positive if behind UTC
    const tzOffsetMin = -date.getTimezoneOffset();
    const sign = tzOffsetMin >= 0 ? '+' : '-';
    const absOffset = Math.abs(tzOffsetMin);
    const offHour = pad2(Math.floor(absOffset / 60));
    const offMin  = pad2(absOffset % 60);

    return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${offHour}:${offMin}`;
}

/**
 * Converts an "HH:mm" time string into a full RFC3339 timestamp
 * using today's date.
 *
 * @param timeStr - time in "HH:mm" format
 * @returns RFC3339 timestamp string
 */
export function timeToRFC3339(timeStr: string): string {
    const [h, m] = timeStr.split(':').map(Number);
    const now = new Date();
    now.setHours(h, m, 0, 0);
    return formatRFC3339Local(now);
}

