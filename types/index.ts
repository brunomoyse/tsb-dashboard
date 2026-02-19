// types/index.ts
export interface Translation {
    language: string;
    name: string;
    description: string | null;
}

export interface Product {
    categoryId: string;
    code: string | null;
    id: string;
    isAvailable: boolean;
    isDiscountable: boolean;
    isHalal: boolean;
    isVegan: boolean;
    isVisible: boolean;
    pieceCount: number | null;
    price: string;
    slug: string;

    name: string;
    description: string | null;

    category: ProductCategory;

    translations: Translation[];
}

export interface ProductCategory {
    id: string;
    name: string;
    order: number;

    translations: Translation[];
}

export interface CreateProductInput {
    categoryId: string
    code: string | null
    isAvailable: boolean
    isDiscountable: boolean
    isHalal: boolean
    isVegan: boolean
    isVisible: boolean
    pieceCount: number | null
    price: string

    translations: TranslationInput[]

    image?: File;
}

export interface UpdateProductInput {
    categoryID?: string
    code?: string | null
    isAvailable?: boolean
    isDiscountable?: boolean
    isHalal?: boolean
    isVegan?: boolean
    isVisible?: boolean
    pieceCount?: number | null
    price?: string

    translations?: TranslationInput[]

    image?: File;
}

export interface UpdateProductRequest {
    id: string
    input: UpdateProductInput
}

export interface TranslationInput {
    description: string | null
    language: string
    name: string
}

export interface User {
    email: string;
    firstName: string;
    id: string;
    lastName: string;
    phoneNumber: string | null;

    address: Address | null;
}

export interface LoginResponse {
    user: User;
}

export type OrderStatus = OrderDeliveryStatus | OrderPickUpStatus;

export type OrderDeliveryStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'AWAITING_PICK_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'FAILED'
export type OrderPickUpStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'AWAITING_PICK_UP' | 'PICKED_UP' | 'CANCELLED' | 'FAILED'
export type OrderType = 'DELIVERY' | 'PICKUP';
export interface Order {
    addressExtra: string | null;
    addressId: string | null;
    createdAt: string;
    deliveryFee: string | null;
    discountAmount: string;
    preferredReadyTime: string | null;
    estimatedReadyTime: string | null;
    id: string;
    isOnlinePayment: boolean;
    orderExtra: { name: string | null; options: string[] | null }[] | null;
    orderNote: string | null;
    paymentID: string | null;
    status: OrderStatus;
    totalPrice: string;
    type: OrderType;
    updatedAt: string;
    userId: string;

    // Computed helper fields
    displayCustomerName: string;
    displayAddress: string;

    address: Address | null;
    items: OrderProduct[];
    payment: MolliePayment | null;
}

export interface OrderProduct {
    quantity: number;
    totalPrice: string;
    unitPrice: string;

    product: Product;
}

export interface MolliePayment {
    createdAt: string;
    id: string;
    links: object;
    orderId: string;
    paidAt: string | null;
    status: string;
}

export interface Address {
    id: string;
    streetName: string;
    houseNumber: string;
    boxNumber: string | null;
    municipalityName: string;
    postcode: string;
    distance: number;
}
