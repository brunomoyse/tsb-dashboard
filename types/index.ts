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

export interface Order {
    id: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
    status: string;
    paymentStatus: OrderStatus;
    paymentMode: 'ONLINE' | 'CASH';
    deliveryOption: string;
    molliePaymentId: string;
    molliePaymentUrl: string;
    products: OrderProductLine[];
    address: string;
}

export type OrderStatus = OrderDeliveryStatus | OrderPickUpStatus;

export type OrderDeliveryStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'AWAITING_PICK_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'FAILED'
export type OrderPickUpStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'AWAITING_PICK_UP' | 'PICKED_UP' | 'CANCELLED' | 'FAILED'


export interface OrderProductLine {
    product: {
        id: string;
        categoryName: string;
        code: string;
        name: string;
    };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
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
    name: string;
    address: string;
    phoneNumber: string;
}

export interface LoginResponse {
    user: User;
}

