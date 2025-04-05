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

export const belPriceFormat = new Intl.NumberFormat('fr-BE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: "currency",
    currency: "EUR",
})
