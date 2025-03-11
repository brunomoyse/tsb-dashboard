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
            :headers="headers"
            :items="products"
            fixed-header
            items-per-page="8"
            :search="searchQuery"
        >
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
            <template v-slot:item.isActive="{ value }">
                <v-chip
                    :border="`${value ? 'success' : 'error'} thin opacity-25`"
                    :color="value ? 'success' : 'error'"
                    :text="value ? t('visible') : t('invisible')"
                    size="x-small"
                ></v-chip>
            </template>
            <template v-slot:item.actions="{ item }">
                <div class="d-flex ga-2 justify-end">
                    <v-icon color="medium-emphasis" icon="mdi-pencil" size="small" @click="openEditDialog(item)"></v-icon>
                    <v-icon color="medium-emphasis" icon="mdi-delete" size="small" @click="remove(item.id)"></v-icon>
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

const { t, locale } = useI18n()

// Use a store for categories
const categoryStore = useCategoriesStore()
const { $api } = useNuxtApp()

// Headers as a computed property to use translations
const headers = computed(() => [
    { title: t('code'), align: 'start', key: 'code' },
    {
        title: t('category'),
        align: 'start',
        key: 'category_id',
        value: (item: Product) => getCategory(item.categoryId)
    },
    { title: t('name'), align: 'start', key: 'name' },
    { title: t('priceEuro'), align: 'end', key: 'price' },
    { title: t('visibility'), align: 'end', key: 'isActive' },
    { title: t('availability'), align: 'end', key: 'isAvailable' },
    { title: t('actions'), align: 'end', key: 'actions' }
])

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
const getCategory = (categoryId: string) => {
    const cat = categories.value?.find((c) => c.id === categoryId)
    return cat ? cat.name : ''
}

// Track the selected product for editing
const selectedProduct = ref<Product | null>(null)

const openEditDialog = (product: Product) => {
    selectedProduct.value = product
}

// Handle the update from the dialog
const updateProduct = (updatedProduct: Product) => {
    if (!products.value) return
    const index = products.value.findIndex(p => p.id === updatedProduct.id)
    if (index !== -1) {
        products.value[index] = updatedProduct
    }
    selectedProduct.value = null
}

const remove = (id: number) => {
    // Implement deletion logic here
    console.log('Remove product with id:', id)
}
</script>
