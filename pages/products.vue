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
import { useCategoriesStore, useGqlQuery, useNuxtApp } from '#imports'
import { useI18n } from 'vue-i18n'
import type {CreateProductInput, Product, ProductCategory, UpdateProductRequest} from '~/types'
import ProductDialog from '~/components/ProductDialog.vue'
import gql from "graphql-tag";
import { print } from "graphql";

const { $api } = useNuxtApp()
const config = useRuntimeConfig()
const graphqlUrl = config.public.graphqlHttp as string
const { t, availableLocales } = useI18n()
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
    mutation($input: CreateProductInput!) {
        createProduct(input: $input) {
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

const UPDATE_PRODUCT_MUTATION = gql`
    mutation($id: ID! $input: CreateProductInput!) {
        updateProduct(id: $id, input: $input) {
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

const handleCreate = async (newProductInput: CreateProductInput) => {
    let newProduct;
    const form = new FormData()
    const { image, ...productData } = newProductInput

    try {
        if (image instanceof File) {
            // 1.a) operations: the query and variables, with a null placeholder for the file
            const operations = {
                query: print(CREATE_PRODUCT_MUTATION),
                variables: {
                    input: {
                        ...productData,
                        image: null,
                    }
                }
            }
            form.append('operations', JSON.stringify(operations))

            // 1.b) map: tell server that file "0" goes into variables.data.image
            form.append('map', JSON.stringify({
                '0': ['variables.input.image']
            }))

            // 1.c) attach the actual file
            if (image instanceof File) {
                form.append('0', image, image.name)
            }

            // 2) POST to /graphql
            const res = await $api(graphqlUrl, {
                method: 'POST',
                body: form,
            });

            // Error handling
            if (res.errors?.length) {
                console.error('GraphQL errors:', res.errors)
                return
            }

            // Pull out the created product
            newProduct = res.data.createProduct
        } else {
            const { mutate: mutationCreateProduct } = useGqlMutation<{ createProduct: Product }>(CREATE_PRODUCT_MUTATION)
            const res : { createProduct: Product } = await mutationCreateProduct({
                input: productData
            })
            newProduct = res.createProduct
        }

        // Add the created product to the list of products
        if (dataProducts.value?.products) {
            dataProducts.value.products.unshift(newProduct)
        }

        // Close the dialog
        createDialog.value = false

    } catch (err) {
        console.error('handleCreate failed:', err)
    }
}


// Handle product updates (edit mode).
const handleUpdate = async (updateReq: UpdateProductRequest) => {
    let updated: Product
    const { id, input } = updateReq
    const { image, ...productData } = input as CreateProductInput
    const form = new FormData()

    try {
        if (image instanceof File) {
            // 1) build the multipart payload
            const operations = {
                query: print(UPDATE_PRODUCT_MUTATION),
                variables: {
                    id,
                    input: {
                        ...productData,
                        image: null,
                    },
                },
            }
            form.append('operations', JSON.stringify(operations))

            form.append('map', JSON.stringify({
                '0': ['variables.input.image'],
            }))

            form.append('0', image, image.name)

            // 2) fire it
            const res = await $api(graphqlUrl, {
                method: 'POST',
                body: form,
            })

            if (res.errors?.length) {
                console.error('GraphQL errors:', res.errors)
                return
            }

            updated = res.data.updateProduct

        } else {
            const { mutate: mutationUpdateProduct } = useGqlMutation<{ updateProduct: Product }>(UPDATE_PRODUCT_MUTATION)

            const { updateProduct } = await mutationUpdateProduct({
                id,
                input: productData,
            })
            updated = updateProduct
        }

        // 3) patch your local list in place
        if (dataProducts.value?.products) {
            const idx = dataProducts.value.products.findIndex(p => p.id === updated.id)
            if (idx !== -1) {
                dataProducts.value.products.splice(idx, 1, updated)
            }
        }

        // 4) clear selection / close dialog
        selectedProduct.value = null
    } catch (err) {
        console.error('handleUpdate failed:', err)
    }
}

</script>
