// Customers list sorting: runs on the full list before pagination, amounts compared as cents.
import type { CustomerStats } from '~/types'
import { describe, expect, it } from 'vite-plus/test'
import { nextCustomerSort, sortCustomers } from '~/utils/customers'

const customer = (
  userId: string,
  totalOrders: number,
  totalAmount: string,
  averageOrderAmount: string,
): CustomerStats => ({
  userId,
  firstName: userId,
  lastName: '',
  email: `${userId}@example.com`,
  phoneNumber: null,
  registeredAt: '2026-01-01T00:00:00Z',
  totalOrders,
  totalAmount,
  averageOrderAmount,
  firstOrderDate: '2026-01-01T00:00:00Z',
  lastOrderDate: '2026-01-01T00:00:00Z',
  preferredOrderType: 'PICKUP',
  deliveryCount: 0,
  pickupCount: totalOrders,
})

// Server order: a, b, c, d. "9.50" vs "10.00" would sort wrong as strings.
const list = [
  customer('a', 3, '9.50', '3.17'),
  customer('b', 10, '120.00', '12.00'),
  customer('c', 1, '45.00', '45.00'),
  customer('d', 3, '10.00', 'oops'),
]
const ids = (customers: CustomerStats[]) => customers.map((c) => c.userId)

describe('sortCustomers', () => {
  it('keeps the server order without a sort, as a copy', () => {
    const sorted = sortCustomers(list, null)
    expect(ids(sorted)).toEqual(['a', 'b', 'c', 'd'])
    expect(sorted).not.toBe(list)
  })

  it('sorts by number of orders, ties keeping the server order', () => {
    expect(ids(sortCustomers(list, { key: 'totalOrders', direction: 'desc' }))).toEqual([
      'b',
      'a',
      'd',
      'c',
    ])
    expect(ids(sortCustomers(list, { key: 'totalOrders', direction: 'asc' }))).toEqual([
      'c',
      'a',
      'd',
      'b',
    ])
  })

  it('sorts the total spent as amounts, not as text', () => {
    expect(ids(sortCustomers(list, { key: 'totalAmount', direction: 'desc' }))).toEqual([
      'b',
      'c',
      'd',
      'a',
    ])
  })

  it('sorts by average order, an unreadable amount counting as zero', () => {
    expect(ids(sortCustomers(list, { key: 'averageOrder', direction: 'desc' }))).toEqual([
      'c',
      'b',
      'a',
      'd',
    ])
  })

  it('does not reorder the list it was given', () => {
    sortCustomers(list, { key: 'totalAmount', direction: 'asc' })
    expect(ids(list)).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('nextCustomerSort', () => {
  it('starts a column with the largest first, then the smallest, then no sort', () => {
    const first = nextCustomerSort(null, 'totalAmount')
    expect(first).toEqual({ key: 'totalAmount', direction: 'desc' })
    const second = nextCustomerSort(first, 'totalAmount')
    expect(second).toEqual({ key: 'totalAmount', direction: 'asc' })
    expect(nextCustomerSort(second, 'totalAmount')).toBeNull()
  })

  it('switching column starts the new one with the largest first', () => {
    expect(nextCustomerSort({ key: 'totalAmount', direction: 'asc' }, 'totalOrders')).toEqual({
      key: 'totalOrders',
      direction: 'desc',
    })
  })
})
