import {defineStore} from "pinia";
import type {ProductCategory} from "@/types";

export const useCategoriesStore = defineStore("categories", {
    state: () => ({
        categories: [] as ProductCategory[],
    }),
    actions: {
        getCategories() {
            return this.categories;
        },
        setCategories(categories: ProductCategory[]) {
            this.categories = categories;
        },
    },
    persist: true,
});
