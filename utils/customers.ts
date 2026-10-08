import type { CustomerStats } from '~/types'
import { parseCents } from '~/utils/money'

/*
 * Sorting of the customers list. The whole list is loaded at once and paginated in the page, so the sort has to run
 * on the full list before pagination (a table header sort would only reorder the visible page).
 */

export type CustomerSortKey = 'totalOrders' | 'totalAmount' | 'averageOrder'
export type SortDirection = 'asc' | 'desc'
export interface CustomerSort {
  key: CustomerSortKey
  direction: SortDirection
}

// Amounts arrive as decimal strings ("12.50"): compare them as integer cents, an unreadable one counts as 0.
const sortValue = (customer: CustomerStats, key: CustomerSortKey): number => {
  if (key === 'totalOrders') return customer.totalOrders
  return parseCents(key === 'totalAmount' ? customer.totalAmount : customer.averageOrderAmount) ?? 0
}

/** A sorted copy of `customers`; ties and a null sort keep the server's order. */
export function sortCustomers(
  customers: readonly CustomerStats[],
  sort: CustomerSort | null,
): CustomerStats[] {
  if (sort === null) return [...customers]
  const sign = sort.direction === 'asc' ? 1 : -1
  return customers
    .map((customer, index) => ({ customer, index, value: sortValue(customer, sort.key) }))
    .sort((a, b) => (a.value - b.value) * sign || a.index - b.index)
    .map(({ customer }) => customer)
}

/**
 * The sort after a click on a column header: a new column starts with the largest values first, a second click flips
 * to the smallest first, a third click goes back to the server's order.
 */
export function nextCustomerSort(
  current: CustomerSort | null,
  key: CustomerSortKey,
): CustomerSort | null {
  if (current?.key !== key) return { key, direction: 'desc' }
  if (current.direction === 'desc') return { key, direction: 'asc' }
  return null
}
