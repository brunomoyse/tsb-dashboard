// types/index.ts
export interface Translation {
    name: string;
    description: string;
}

export interface Product {
    id: string;
    price: number;
    code: string;
    slug: string;
    pieceCount: number;
    isHalal: boolean;
    isVegan: boolean;
    isAvailable: boolean;
    categoryId: string;
    discountable: boolean;
    translations: Translation[];
}

export interface ProductCategory {
    id: string;
    order: number;
    translations: Translation[];
}

export interface CartItem {
    product: Product;
    quantity: number;
}

export interface User {
    id: string;
    email: string;
    name: string;
    address: string;
    phoneNumber: string;
}

export interface Order {
    id: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
    paymentMethod: string;
    molliePaymentId: string;
    molliePaymentUrl: string;
    status: string;
    products: CartItem[];
}

export interface RefreshTokenResponse {
    accessToken: string,
    user: User,
}
