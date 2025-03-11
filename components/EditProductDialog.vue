<template>
    <v-dialog v-model="dialog" max-width="600px">
        <v-card>
            <v-card-title>Edit Product</v-card-title>
            <v-card-text>
                <!-- Product Fields -->
                <v-text-field
                    v-model="editedProduct.code"
                    label="Product Code"
                ></v-text-field>
                <v-text-field
                    v-model="editedProduct.slug"
                    label="Slug"
                ></v-text-field>
                <v-text-field
                    v-model="editedProduct.price"
                    label="Price"
                    type="number"
                ></v-text-field>
                <v-text-field
                    v-model="editedProduct.pieceCount"
                    label="Piece Count"
                    type="number"
                ></v-text-field>
                <!-- v-select for Category -->
                <v-select
                    v-model="editedProduct.categoryId"
                    :items="categories"
                    item-text="name"
                    item-value="id"
                    label="Category"
                ></v-select>
                <v-checkbox
                    v-model="editedProduct.isHalal"
                    label="Halal"
                ></v-checkbox>
                <v-checkbox
                    v-model="editedProduct.isVegan"
                    label="Vegan"
                ></v-checkbox>
                <v-checkbox
                    v-model="editedProduct.isAvailable"
                    label="Available"
                ></v-checkbox>
                <v-checkbox
                    v-model="editedProduct.discountable"
                    label="Discountable"
                ></v-checkbox>

                <!-- Translations -->
                <div
                    v-for="(translation, index) in editedProduct.translations"
                    :key="translation.lang"
                >
                    <v-text-field
                        v-model="translation.name"
                        :label="`Translation ${translation.lang.toUpperCase()} Name`"
                    ></v-text-field>
                    <v-text-field
                        v-model="translation.description"
                        :label="`Translation ${translation.lang.toUpperCase()} Description`"
                    ></v-text-field>
                </div>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn text @click="closeDialog">Cancel</v-btn>
                <v-btn color="primary" text @click="saveChanges">Save</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from 'vue'
import type { Product } from '~/types'

// Extend translation with a language code for local editing
interface ExtendedTranslation {
    lang: string
    name: string
    description: string
}

interface ExtendedProduct extends Product {
    translations: ExtendedTranslation[]
}

const props = defineProps<{ product: Product | null }>()
const emit = defineEmits<{
    (e: 'update', updatedProduct: Product): void
    (e: 'close'): void
}>()

const dialog = ref(true)

// Define categories constant (replace with your own categories as needed)
const categories = ref([
    { id: 'cat1', name: 'Category 1' },
    { id: 'cat2', name: 'Category 2' },
    { id: 'cat3', name: 'Category 3' },
])

// Create a product copy that always includes 3 translations for fr, en, and zh.
const createProductCopy = (product: any): ExtendedProduct | null => {
    if (!product) return null
    const languages = ['fr', 'en', 'zh']
    let translations: ExtendedTranslation[] = []

    if (product.translations && Array.isArray(product.translations) && product.translations.length) {
        for (let i = 0; i < languages.length; i++) {
            if (product.translations[i]) {
                translations.push({
                    lang: languages[i],
                    name: product.translations[i].name,
                    description: product.translations[i].description,
                })
            } else {
                translations.push({ lang: languages[i], name: '', description: '' })
            }
        }
    } else {
        translations = languages.map(lang => ({ lang, name: '', description: '' }))
    }

    return {
        id: product.id,
        price: product.price,
        code: product.code,
        slug: product.slug,
        pieceCount: product.pieceCount ?? 0,
        isHalal: product.isHalal ?? false,
        isVegan: product.isVegan ?? false,
        // Use product.isAvailable if provided; otherwise, fall back to product.isActive
        isAvailable: product.isAvailable !== undefined ? product.isAvailable : product.isActive,
        categoryId: product.categoryId,
        discountable: product.discountable ?? false,
        translations: translations,
    }
}

const editedProduct = ref(createProductCopy(props.product))

watch(() => props.product, (newVal) => {
    editedProduct.value = createProductCopy(newVal)
})

const closeDialog = () => {
    dialog.value = false
    emit('close')
}

const saveChanges = () => {
    if (editedProduct.value) {
        emit('update', editedProduct.value)
    }
    closeDialog()
}
</script>
