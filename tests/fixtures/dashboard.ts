// Builders for the shapes the dashboard reads from the API (`~/types`): orders, products, customers, the staff user.
// Every builder returns a complete, valid object; a test overrides only what it is about.
import type {
  Address,
  Customer,
  Order,
  OrderProduct,
  Product,
  ProductCategory,
  User,
} from '~/types'

export function makeCategory(overrides: Partial<ProductCategory> = {}): ProductCategory {
  return { id: 'cat-1', name: 'Sushi', order: 1, slug: 'sushi', translations: [], ...overrides }
}

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    categoryId: 'cat-1',
    code: null,
    id: 'p-1',
    isAvailable: true,
    isDiscountable: true,
    isHalal: false,
    isLunchOnly: false,
    isSpicy: false,
    isVegetarian: false,
    isVisible: true,
    pieceCount: null,
    price: '10.00',
    slug: 'salmon-nigiri',
    vatCategory: 'FOOD',
    name: 'Salmon nigiri',
    description: null,
    category: makeCategory(),
    choices: [],
    translations: [],
    ...overrides,
  } as Product
}

export function makeOrderItem(overrides: Partial<OrderProduct> = {}): OrderProduct {
  return {
    quantity: 1,
    unitPrice: '10.00',
    totalPrice: '10.00',
    product: makeProduct(),
    choice: null,
    ...overrides,
  }
}

export function makeAddress(overrides: Partial<Address> = {}): Address {
  return {
    id: 'addr-1',
    streetName: 'Rue Saint-Gilles',
    houseNumber: '12',
    boxNumber: null,
    municipalityName: 'Liège',
    postcode: '4000',
    distance: 1500,
    ...overrides,
  }
}

export function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return { id: 'u-1', firstName: 'Ada', lastName: 'Lovelace', phoneNumber: null, ...overrides }
}

export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    addressExtra: null,
    addressId: null,
    createdAt: '2026-10-04T12:00:00.000Z',
    deliveryFee: null,
    couponCode: null,
    discountAmount: '0.00',
    preferredReadyTime: null,
    estimatedReadyTime: null,
    id: 'o-1',
    isOnlinePayment: false,
    orderExtra: null,
    orderNote: null,
    paymentID: null,
    status: 'PENDING',
    totalPrice: '10.00',
    type: 'PICKUP',
    updatedAt: '2026-10-04T12:00:00.000Z',
    userId: 'u-1',
    isManualAddress: false,
    displayCustomerName: 'Ada Lovelace',
    displayAddress: '',
    address: null,
    customer: null,
    items: [makeOrderItem()],
    payment: null,
    ...overrides,
  }
}

// The staff member as `me` answers it.
export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u-1',
    email: 'chef@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    phoneNumber: null,
    isAdmin: true,
    address: null,
    ...overrides,
  }
}
