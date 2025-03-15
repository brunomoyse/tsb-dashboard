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
    // Generated on fetch
    name?: string;
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

export interface RefreshTokenResponse {
    accessToken: string,
    user: User,
}
