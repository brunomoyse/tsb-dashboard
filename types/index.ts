// types/index.ts
export interface Translation {
    locale: string;
    name: string | null;
    description: string | null;
}

export interface Product {
    id: string;
    price: number;
    code: string | null;
    pieceCount: number | null;
    isHalal: boolean;
    isVegan: boolean;
    isVisible: boolean;
    isAvailable: boolean;
    categoryId: string;
    isDiscountable: boolean;
    translations: Translation[];
    slug: string | null;
    // Generated on fetch
    name?: string;
    // Temporary file upload
    image?: File;
}

export interface ProductCategory {
    id: string;
    name: string;
    order: number;
    translations: Translation[];
}

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    address: Address | null;
    phoneNumber: string | null;
}

export interface LoginResponse {
    user: User;
}

export type OrderStatus = OrderDeliveryStatus | OrderPickUpStatus;

export type OrderDeliveryStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'AWAITING_PICK_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'FAILED'
export type OrderPickUpStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'AWAITING_PICK_UP' | 'PICKED_UP' | 'CANCELLED' | 'FAILED'
export type OrderType = 'DELIVERY' | 'PICKUP';

export interface Order {
    id: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
    orderStatus: OrderStatus;
    orderType: OrderType;
    isOnlinePayment: boolean;
    paymentID: string | null;
    discountAmount: string;
    deliveryFee: string | null;
    totalPrice: string;
    estimatedReadyTime: string | null;
    addressId: string | null;
    addressExtra: string | null;
    orderNote: string | null;
    orderExtra: {
        name: string | null
        options: string[] | null
    }[] | null;
}

export interface OrderProduct {
    product: {
        id: string;
        code: string | null;
        categoryName: string
        name: string;
    };
    quantity: number;
    unitPrice: string;
    totalPrice: string;
}

export interface MolliePayment {
    id: string;
    paymentUrl: string;
    orderId: string;
    status: string;
    createdAt: string;
    paidAt: string | null;
}

export interface OrderResponse {
    order: Order;
    products: OrderProduct[];
    payment: MolliePayment | null;
    address: Address | null;
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
