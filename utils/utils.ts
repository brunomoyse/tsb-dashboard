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

export const formatDate = (dateString: string, locale = 'fr-BE') =>
    new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : locale === 'nl' ? 'nl-BE' : locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(dateString));

export const formatTimeOnly = (dateString: string, locale = 'fr-BE') => {
    try {
        const date = new Date(dateString);

        // Validate date before formatting
        if (isNaN(date.getTime())) {
            if (import.meta.dev) console.error('Invalid date string:', dateString)
            return '--:--'
        }

        return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : locale === 'nl' ? 'nl-BE' : locale, {
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    } catch (e) {
        if (import.meta.dev) console.error('Date formatting error:', e)
        return '--:--'
    }
};

export const belPriceFormat = new Intl.NumberFormat('fr-BE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: "currency",
    currency: "EUR",
})

export const formatPrice = (price: number | string): string =>
    belPriceFormat.format(Number(price));

/**
 * Pads a number to 2 digits.
 */
const pad2 = (n: number): string =>
    n.toString().padStart(2, '0');

// The en-CA locale renders dates as YYYY-MM-DD, which is what we want for ISO date keys.
const brusselsDateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
    year: 'numeric', month: '2-digit', day: '2-digit',
});

/**
 * Returns the calendar date in Europe/Brussels as YYYY-MM-DD.
 * Independent of the runtime timezone — never rely on `toISOString().slice(0,10)`
 * for "today" because that yields the UTC date.
 */
export const brusselsDateISO = (date: Date = new Date()): string =>
    brusselsDateFormatter.format(date);

/**
 * Adds `days` to a YYYY-MM-DD date string using calendar arithmetic
 * (DST-safe, timezone-independent).
 */
export const shiftBrusselsDate = (iso: string, days: number): string => {
    const [y, m, d] = iso.split('-').map(Number);
    const t = Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) + days * 86_400_000;
    const out = new Date(t);
    return `${out.getUTCFullYear()}-${pad2(out.getUTCMonth() + 1)}-${pad2(out.getUTCDate())}`;
};

// Renders the wall-clock components of an instant as seen in Europe/Brussels,
// used to derive the zone's UTC offset at that instant (DST-aware).
const brusselsPartsFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Brussels',
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
});

/** Europe/Brussels offset from UTC, in milliseconds, at the given instant. */
const brusselsOffsetMs = (date: Date): number => {
    const map: Record<string, number> = {};
    for (const p of brusselsPartsFormatter.formatToParts(date)) {
        if (p.type !== 'literal') map[p.type] = Number(p.value);
    }
    const asUTC = Date.UTC(
        map.year ?? 1970, (map.month ?? 1) - 1, map.day ?? 1,
        map.hour ?? 0, map.minute ?? 0, map.second ?? 0,
    );
    return asUTC - date.getTime();
};

/**
 * Interprets a `<input type="datetime-local">` value ("YYYY-MM-DDTHH:mm") as a
 * Europe/Brussels wall-clock time and returns the corresponding UTC instant as
 * an ISO string. Independent of the browser's timezone — never use
 * `new Date(local).toISOString()`, which interprets the value in the runtime TZ.
 * Returns null for empty/invalid input.
 */
export const brusselsDateTimeLocalToISO = (local: string | null | undefined): string | null => {
    if (!local) return null;
    const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return null;
    const [, y, mo, d, h, mi] = m.map(Number) as number[];
    // Treat the wall-clock components as if they were UTC, then subtract the
    // Brussels offset at that instant to recover the true UTC instant.
    const asUTC = Date.UTC(y!, mo! - 1, d!, h!, mi!);
    const offset = brusselsOffsetMs(new Date(asUTC));
    return new Date(asUTC - offset).toISOString();
};

/**
 * Inverse of {@link brusselsDateTimeLocalToISO}: renders a UTC ISO instant as a
 * Europe/Brussels wall-clock "YYYY-MM-DDTHH:mm" string suitable for seeding a
 * `<input type="datetime-local">`, so an open→save round-trip doesn't shift the
 * time. Returns '' for empty/invalid input.
 */
export const isoToBrusselsDateTimeLocal = (iso: string | null | undefined): string => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const map: Record<string, string> = {};
    for (const p of brusselsPartsFormatter.formatToParts(date)) {
        if (p.type !== 'literal') map[p.type] = p.value;
    }
    return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
};

/**
 * Formats a Date as an RFC3339 string with local timezone offset.
 *
 * @param date - the Date to format
 * @returns yyyy-MM-ddTHH:mm:ss±HH:MM
 */
const formatRFC3339Local = (date: Date): string => {
    const year   = date.getFullYear();
    const month  = pad2(date.getMonth() + 1);
    const day    = pad2(date.getDate());
    const hour   = pad2(date.getHours());
    const minute = pad2(date.getMinutes());
    const second = pad2(date.getSeconds());

    // Timezone offset in minutes: positive if behind UTC
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
export const timeToRFC3339 = (timeStr: string): string => {
    const parts = timeStr.split(':').map(Number);
    const now = new Date();
    now.setHours(parts[0] ?? 0, parts[1] ?? 0, 0, 0);
    return formatRFC3339Local(now);
}

