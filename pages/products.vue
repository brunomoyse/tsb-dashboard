<template>
    <v-container>
        <!-- Search input -->
        <v-text-field
            v-model="searchQuery"
            class="mb-4"
            clearable
            label="Search Products"
        ></v-text-field>
        <v-data-table
            :headers="headers"
            :items="products"
            fixed-header
            items-per-page="15"
            :search="searchQuery"
        >
            <template v-slot:item.price="{ value }">
                <!-- Format price to x,xx coma separated -->
                {{ value.toFixed(2).replace('.', ',') }}
            </template>
            <template v-slot:item.isActive="{ value }">
                <v-chip
                    :border="`${value ? 'success' : 'error'} thin opacity-25`"
                    :color="value ? 'success' : 'error'"
                    :text="value ? 'ACTIVE' : 'INACTIVE'"
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
import {useAsyncData, useNuxtApp} from "#imports";
import type {Product} from "~/types";
import EditProductDialog from '~/components/EditProductDialog.vue'


const {$api} = useNuxtApp()

const headers = [
    {title: 'Code', align: 'start', key: 'code'},
    {title: 'Category', align: 'end', key: 'category_id', value: (item: Product) => getCategory(item.category_id)},
    {title: 'Name', align: 'end', key: 'name'},
    {title: 'Price(€)', align: 'end', key: 'price'},
    {title: 'Available', align: 'end', key: 'isActive'},
    {title: 'Actions', align: 'end', key: 'actions'},
]

const searchQuery = ref('')

const {data: products} = await useAsyncData<Product[]>('products', () =>
    $api('/products')
)

const categories = ref([])

const getCategory = (categoryId: string) => {
    const category = categories.value?.find((cat) => cat.id === categoryId)
    return category ? category.name : ''
}
// Track the selected product for editing
const selectedProduct = ref<Product | null>(null)

const openEditDialog = (product: Product) => {
    selectedProduct.value = product
}

// Handle the update from the dialog
const updateProduct = (updatedProduct: Product) => {
    // You could call an API endpoint to save changes here
    // For now, we'll just update the local products array
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
