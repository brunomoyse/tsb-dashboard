<template>
    <v-container>
        <!-- Toolbar header for Products -->
        <v-card class="mb-4" flat>
            <v-toolbar flat>
                <v-text-field
                    v-model="searchQuery"
                    prepend-inner-icon="mdi-magnify"
                    clearable
                    dense
                    hide-details
                    :placeholder="t('products.search')"
                ></v-text-field>

                <v-spacer></v-spacer>

                <v-btn color="primary" class="ml-4" @click="openCreateDialog">
                    <v-icon left>mdi-plus</v-icon>
                    {{ t('products.add') }}
                </v-btn>
            </v-toolbar>
        </v-card>

        <v-data-table
            v-if="products.length > 0"
            :headers="headers"
            :items="products"
            fixed-header
            items-per-page="10"
            :search="searchQuery"
            :items-per-page-text="t('common.itemsPerPage')"
            :items-per-page-options="[
              {value: 5, title: '5'},
              {value: 10, title: '10'},
              {value: -1, title: '$vuetify.dataFooter.itemsPerPageAll'}
            ]"
        >
            <template v-slot:item.category="{ value }">
                {{ value.name }}
            </template>
            <template v-slot:item.price="{ value }">
                {{ belPriceFormat.format(value) }}
            </template>
            <template v-slot:item.isAvailable="{ value }">
                <v-chip
                    :border="`${value ? 'success' : 'error'} thin opacity-25`"
                    :color="value ? 'success' : 'error'"
                    :text="value ? t('common.available') : t('common.unavailable')"
                    size="x-small"
                ></v-chip>
            </template>
            <template v-slot:item.isVisible="{ value }">
                <v-chip
                    :border="`${value ? 'success' : 'error'} thin opacity-25`"
                    :color="value ? 'success' : 'error'"
                    :text="value ? t('common.visible') : t('common.invisible')"
                    size="x-small"
                ></v-chip>
            </template>
            <template v-slot:item.translationsStatus="{ item }">
                <div class="d-flex">
                    <v-chip
                        v-for="lang in availableLocales"
                        :key="lang"
                        :color="hasTranslation(item, lang) ? 'green darken-2' : 'red darken-2'"
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
                    <!-- Edit product -->
                    <v-icon
                        color="medium-emphasis"
                        icon="mdi-pencil"
                        size="small"
                        @click="openEditDialog(item)"
                    ></v-icon>
                </div>
            </template>
        </v-data-table>

        <!-- Create Product Dialog -->
        <ProductDialog
            v-if="createDialog"
            mode="create"
            @create="handleCreate"
            @close="createDialog = false"
        />

        <!-- Edit Product Dialog -->
        <ProductDialog
            v-if="selectedProduct"
            :product="selectedProduct"
            mode="edit"
            @update="handleUpdate"
            @close="selectedProduct = null"
        />
    </v-container>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useCategoriesStore, useGqlQuery, useGqlMutation } from '#imports'
import { useI18n } from 'vue-i18n'
import type { Product, ProductCategory } from '~/types'
import ProductDialog from '~/components/ProductDialog.vue'
import gql from "graphql-tag";
import { print } from "graphql";

const { t, locale, availableLocales } = useI18n()

// Categories store and API instance.
const categoryStore = useCategoriesStore()

// Define table headers.
const headers = [
    { title: t('common.code'), align: 'start', key: 'code', value: 'code' },
    { title: t('products.category'), align: 'start', key: 'category', value: 'category' },
    { title: t('common.name'), align: 'start', key: 'name', value: 'name' },
    { title: t('common.price'), align: 'end', key: 'price', value: 'price' },
    { title: t('common.visibility'), align: 'start', key: 'isVisible', value: 'isVisible', width: '100px' },
    { title: t('common.availability'), align: 'start', key: 'isAvailable', value: 'isAvailable', width: '100px' },
    { title: t('products.translations'), align: 'start', key: 'translationsStatus', value: 'translationsStatus', width: '160px', sortable: false },
    { title: t('common.actions'), align: 'end', key: 'actions', value: 'actions', sortable: false }
] as const

// Helper: Check if a translation is complete.
const hasTranslation = (product: Product, lang: string) => {
    const translation = product.translations.find(t => t.language === lang)
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
    maximumFractionDigits: 2,
    style: "currency",
    currency: "EUR",
})

const searchQuery = ref('')

const PRODUCTS_QUERY = gql`
    query {
        products {
            id
            price
            code
            slug
            pieceCount
            isVisible
            isAvailable
            isHalal
            isVegan

            name
            description

            category {
                id
                name
            }
            translations {
                language
                name
                description
            }
        }
    }
`

const PRODUCT_CATEGORIES_QUERY = gql`
    query {
        productCategories {
            id
            name
        }
    }
`

const CREATE_PRODUCT_MUTATION = gql`
    mutation($data: CreateProductInput!) {
        createProduct(input: $data) {
            id
            price
            code
            slug
            pieceCount
            isVisible
            isAvailable
            isHalal
            isVegan

            name
            description

            category {
                id
                name
            }
            translations {
                language
                name
                description
            }
        }
    }
`

const { mutate: mutationCreateProduct } = useGqlMutation<{ createProduct: Product }>(CREATE_PRODUCT_MUTATION)

// Fetch products
const { data: dataProducts } = await useGqlQuery<{ products: Product[] }>(print(PRODUCTS_QUERY), {}, { immediate: true, cache: true})
const products = computed(() => dataProducts.value?.products ?? [])

// Fetch categories.
const { data: dataCategories } = await useGqlQuery<{ productCategories: ProductCategory[] }>(
    print(PRODUCT_CATEGORIES_QUERY),
    {},
    { immediate: true }
)

// Save categories in the store.
if (dataCategories.value?.productCategories) {
    categoryStore.setCategories(dataCategories.value?.productCategories)
}
const categories = computed(() => categoryStore.getCategories(locale.value))

// Helper: Get category name by ID.
const getCategoryName = (categoryId: string) => {
    const cat = categories.value?.find(c => c.id === categoryId)
    return cat ? cat.name : ''
}

// State for dialogs.
const selectedProduct = ref<Product | null>(null)
const createDialog = ref(false)

// Open the edit dialog.
const openEditDialog = (product: Product) => {
    selectedProduct.value = product
}

// Open the create dialog.
const openCreateDialog = () => {
    createDialog.value = true
}

// Handle product updates (edit mode).
const handleUpdate = async (updatedProduct: Product) => {
    try {
        // Create a FormData object.
        const formData = new FormData();

        // Destructure to separate the image file from the rest of the product data.
        const { image, ...productData } = updatedProduct;

        // Append the product data as a JSON string to a field called "data".
        formData.append("data", JSON.stringify(productData));

        // Append the image file if it exists and is indeed a File instance.
        if (image instanceof File) {
            formData.append("image", image);
        }

        // Send the PUT request with the FormData as body.
        const res = await $api(`/admin/products/${updatedProduct.id}`, {
            method: 'PUT',
            body: formData,
        });

        if (!res?.id || !products.value) {
            console.error('Failed to update product:', updatedProduct);
            return;
        }
        // Update the product in your local state.
        products.value = products.value.map(p =>
            p.id === updatedProduct.id ? res : p
        );
        selectedProduct.value = null;
    } catch (error) {
        console.error('Failed to update product:', error);
    }
};

// Handle new product creation.
const handleCreate = async (newProduct: Product) => {
    try {
        // Create a FormData object.
        const formData = new FormData();

        // Destructure to separate the image file from the rest of the product data.
        const { image, ...productData } = newProduct;

        // Append the product data as a JSON string to a field called "data".
        formData.append("data", JSON.stringify(productData));

        // Append the image file if it exists.
        if (image) {
            formData.append("image", image);
        }

        const res : { createProduct: Product } = await mutationCreateProduct({
            input: formData
        })

        const productCreated = res.createProduct

        if (!productCreated?.id) {
            console.error('Failed to create product:', newProduct);
            return;
        }
        // Prepend the new product to the computed products
        products.value = [productCreated, ...products.value]

        createDialog.value = false;
    } catch (error) {
        console.error('Failed to create product:', error);
    }
};

</script>
