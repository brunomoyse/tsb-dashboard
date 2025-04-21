import {defineStore} from "pinia";
import type {ProductCategory} from "@/types";

export const useCategoriesStore = defineStore("categories", {
    state: () => ({
        categories: [] as ProductCategory[],
    }),
    actions: {
        getCategories(locale: string) {
            const collator = new Intl.Collator('zh-Hans-CN', { sensitivity: 'base' });
            this.categories.sort((a, b) => {
                if (locale === 'zh') {
                    return collator.compare(a.translations?.find(t => t.language === locale)?.name || '', b.translations?.find(t => t.language === locale)?.name || '');
                }
                // Otherwise, do a regular string comparison
                return a.name.localeCompare(b.name);
            });

            return this.categories;
        },
        setCategories(categories: ProductCategory[]) {
            this.categories = categories;
        },
    },
    persist: true,
});
