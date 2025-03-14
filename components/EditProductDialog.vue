<template>
    <v-dialog v-model="dialog" max-width="800px" persistent>
        <v-card>
            <v-card-title>{{ t('editProduct') }}</v-card-title>
            <v-card-text>
                <v-container>
                    <!-- Row 1: Two Columns -->
                    <v-row>
                        <!-- Left Column: Category, Code, Price, Piece Count -->
                        <v-col cols="12" md="6">
                            <v-select
                                v-model="editedProduct.categoryId"
                                :items="categories"
                                :item-title="item => item.name"
                                item-value="id"
                                :label="t('category')"
                            ></v-select>
                            <v-text-field
                                v-model="editedProduct.code"
                                :label="t('productCode')"
                            ></v-text-field>
                            <v-text-field
                                v-model="editedProduct.price"
                                :label="t('price')"
                                type="number"
                            ></v-text-field>
                            <v-text-field
                                v-model="editedProduct.pieceCount"
                                :label="t('pieceCount')"
                                type="number"
                            ></v-text-field>
                        </v-col>
                        <!-- Right Column: Options -->
                        <v-col cols="12" md="6">
                            <v-checkbox
                                v-model="editedProduct.isHalal"
                                :label="t('halal')"
                            ></v-checkbox>
                            <v-checkbox
                                v-model="editedProduct.isVegan"
                                :label="t('vegan')"
                            ></v-checkbox>
                            <v-checkbox
                                v-model="editedProduct.discountable"
                                :label="t('discountable')"
                            ></v-checkbox>
                            <v-checkbox
                                v-model="editedProduct.isAvailable"
                                :label="t('available')"
                            ></v-checkbox>
                        </v-col>
                    </v-row>
                    <!-- Row 2: Translations (3 columns) -->
                    <v-row>
                        <v-col
                            cols="12"
                            md="4"
                            v-for="translation in editedProduct.translations"
                            :key="translation.lang"
                        >
                            <v-text-field
                                v-model="translation.name"
                                :label="translation.lang.toUpperCase() + ' ' + t('name')"
                            ></v-text-field>
                            <v-textarea
                                v-model="translation.description"
                                :label="translation.lang.toUpperCase() + ' ' + t('description')"
                            ></v-textarea>
                        </v-col>
                    </v-row>
                </v-container>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn @click="closeDialog">{{ t('cancel') }}</v-btn>
                <v-btn color="primary" @click="saveChanges">{{ t('save') }}</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Product } from '~/types'
import { useCategoriesStore } from '~/stores/categories'
const { t } = useI18n()

// Extend translation with a language code for local editing
interface ExtendedTranslation {
    lang: string
    name: string
    description: string
}

// Extend product with our custom fields (image removed)
interface ExtendedProduct extends Product {
    translations: ExtendedTranslation[]
}

const props = defineProps<{ product: Product }>()
const emit = defineEmits<{
    (e: 'update', updatedProduct: Product): void
    (e: 'close'): void
}>()

const categoryStore = useCategoriesStore()
const dialog = ref(true)

const categories = computed(() => categoryStore.getCategories())

// Create a product copy that always includes 3 translations for fr, en, and zh.
const createProductCopy = (product: Product): ExtendedProduct => {
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
        pieceCount: product.pieceCount != null ? product.pieceCount : null,
        isHalal: product.isHalal ?? false,
        isVegan: product.isVegan ?? false,
        isVisible: product.isVisible,
        isAvailable: product.isAvailable,
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
