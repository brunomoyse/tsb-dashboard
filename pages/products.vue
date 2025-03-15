<template>
    <v-container>
        <!-- Search input -->
        <v-text-field
            v-model="searchQuery"
            class="mb-4"
            clearable
            :label="t('searchProducts')"
        ></v-text-field>
        <v-data-table
            v-if="products"
            :headers="headers"
            :items="products"
            fixed-header
            items-per-page="8"
            :search="searchQuery"
        >
            <template v-slot:item.categoryId="{ value }">
                {{ getCategoryName(value) }}
            </template>
            <template v-slot:item.price="{ value }">
                {{ belPriceFormat.format(value) }}
            </template>
            <template v-slot:item.isAvailable="{ value }">
                <v-chip
                    :border="`${value ? 'success' : 'error'} thin opacity-25`"
                    :color="value ? 'success' : 'error'"
                    :text="value ? t('available') : t('unavailable')"
                    size="x-small"
                ></v-chip>
            </template>
            <template v-slot:item.isVisible="{ value }">
                <v-chip
                    :border="`${value ? 'success' : 'error'} thin opacity-25`"
                    :color="value ? 'success' : 'error'"
                    :text="value ? t('visible') : t('invisible')"
                    size="x-small"
                ></v-chip>
            </template>
            <template v-slot:item.translationsStatus="{ item }">
                <div class="d-flex">
                    <v-chip
                        v-for="lang in availableLocales"
                        :key="lang"
                        :color="hasTranslation(item, lang) ? 'green' : 'red'"
                        class="ma-1"
                        small
                        text-color="white"
                        style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;"
                    >
                        {{ getFlagEmoji(lang) }}
                    </v-chip>
                </div>
            </template>
            <template v-slot:item.actions="{ item }">
                <div class="d-flex ga-2 justify-end">
                    <v-icon color="medium-emphasis" icon="mdi-pencil" size="small" @click="openEditDialog(item)"></v-icon>
                    <!--
                    <v-icon color="medium-emphasis" icon="mdi-delete" size="small" @click="remove(item.id)"></v-icon>
                    -->
                </div>
            </template>
        </v-data-table>
        <!-- Edit Product Dialog -->
        <EditProductDialog
            v-if="selectedProduct"
            :product="selectedProduct"
            @update="updateProduct"
            @close="selectedProduct = null"
        />
    </v-container>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useAsyncData, useCategoriesStore, useNuxtApp } from '#imports'
import { useI18n } from 'vue-i18n'
import type { Product, ProductCategory } from '~/types'
import EditProductDialog from '~/components/EditProductDialog.vue'

const { t, locale, availableLocales } = useI18n()

// Use a store for categories
const categoryStore = useCategoriesStore()
const { $api } = useNuxtApp()

// Headers as a computed property to use translations
const headers = [
    { title: t('code'), align: 'start', key: 'code' },
    { title: t('category'), align: 'start', key: 'categoryId' },
    { title: t('name'), align: 'start', key: 'name' },
    { title: t('priceEuro'), align: 'end', key: 'price' },
    { title: t('visibility'), align: 'start', key: 'isVisible', width: '100px' },
    { title: t('availability'), align: 'start', key: 'isAvailable', width: '100px' },
    { title: t('translations'), align: 'start', key: 'translationsStatus', width: '160px', sortable: false  },
    { title: t('actions'), align: 'end', key: 'actions', sortable: false },
];

// Helper: Check if translation exists and has a filled name.
const hasTranslation = (product: Product, lang: string) => {
    const translation = product.translations.find(t => t.locale === lang)
    return translation && translation.name && translation.name.trim() !== ''
}

// Helper: Return the flag emoji for each language.
const getFlagEmoji = (lang: string) => {
    switch(lang) {
        case 'fr': return '🇫🇷'
        case 'en': return '🇬🇧'
        case 'zh': return '🇨🇳'
        default: return ''
    }
}

const belPriceFormat = new Intl.NumberFormat('fr-BE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const searchQuery = ref('')

// Fetch products
const { data: products } = await useAsyncData<Product[]>('products', () =>
        $api('/admin/products'),
    {
        transform: (data: Product[]) => {
            return data.map(product => {
                const translation = product.translations.find(t => t.locale === locale.value)
                return {
                    ...product,
                    name: translation ? translation.name : product.name
                }
            })
        }
    }
)

// Fetch categories
const { data: categoriesData } = await useAsyncData<ProductCategory[]>('categories', () =>
    $api('/categories', {
        headers: {
            'Accept-Language': locale.value
        }
    })
)

// Save categories in store if available
if (categoriesData.value) {
    categoryStore.setCategories(categoriesData.value)
}

// Local copy of categories (reactive)
const categories = computed(() => categoryStore.getCategories())

// Helper to get category name by id
const getCategoryName = (categoryId: string) => {
    const cat = categories.value?.find((c) => c.id === categoryId)
    return cat ? cat.name : ''
}

// Track the selected product for editing
const selectedProduct = ref<Product | null>(null)

const openEditDialog = (product: Product) => {
    selectedProduct.value = product
}

// Handle the update from the dialog
const updateProduct = async (updatedProduct: Product) => {
    try {
        const res = await $api(`/admin/products/${updatedProduct.id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedProduct),
        });
        if (!res?.id || !products.value) {
            console.error('Failed to update product:', updatedProduct);
            return;
        }
        // Replace the product in the local array.
        products.value = products.value.map(p =>
            p.id === updatedProduct.id ? res : p
        );
        selectedProduct.value = null;
    } catch (error) {
        console.error('Failed to update product:', error);
    }
};

const remove = (id: string) => {
    // Implement deletion logic here
    console.log('Remove product with id:', id)
}
</script>
