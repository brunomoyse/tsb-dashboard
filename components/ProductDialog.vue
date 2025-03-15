<template>
    <v-dialog v-model="dialog" max-width="800px" persistent>
        <v-card>
            <v-card-title>{{ dialogTitle }}</v-card-title>
            <v-card-text>
                <v-form ref="form">
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
                                    :rules="[v => (!!v && v.trim().length > 0) || t('form.categoryRequired')]"
                                ></v-select>
                                <v-text-field
                                    v-model="editedProduct.code"
                                    :label="t('productCode')"
                                ></v-text-field>
                                <v-text-field
                                    v-model.number="editedProduct.price"
                                    :label="t('price')"
                                    type="number"
                                ></v-text-field>
                                <v-text-field
                                    v-model.number="editedProduct.pieceCount"
                                    :label="t('pieceCount')"
                                    type="number"
                                ></v-text-field>
                            </v-col>
                            <!-- Right Column: Checkboxes in Two Columns -->
                            <v-col cols="12" md="6">
                                <v-row>
                                    <!-- First Column: Visible, Available, Discountable -->
                                    <v-col cols="12" md="6">
                                        <v-checkbox
                                            v-model="editedProduct.isVisible"
                                            :label="t('visible')"
                                        ></v-checkbox>
                                        <v-checkbox
                                            v-model="editedProduct.isAvailable"
                                            :label="t('available')"
                                        ></v-checkbox>
                                        <v-checkbox
                                            v-model="editedProduct.isDiscountable"
                                            :label="t('discountable')"
                                        ></v-checkbox>
                                    </v-col>
                                    <!-- Second Column: Halal, Vegan -->
                                    <v-col cols="12" md="6">
                                        <v-checkbox
                                            v-model="editedProduct.isHalal"
                                            :label="t('halal')"
                                        ></v-checkbox>
                                        <v-checkbox
                                            v-model="editedProduct.isVegan"
                                            :label="t('vegan')"
                                        ></v-checkbox>
                                    </v-col>
                                </v-row>
                            </v-col>
                        </v-row>
                        <!-- Row 2: Translations (3 columns) -->
                        <v-row>
                            <v-col
                                cols="12"
                                md="4"
                                v-for="translation in editedProduct.translations"
                                :key="translation.locale"
                            >
                                <v-text-field
                                    v-model="translation.name"
                                    :label="translation.locale.toUpperCase() + ' ' + t('name')"
                                    :rules="translation.locale === 'fr' ? [v => (!!v && v.trim().length > 0) || t('form.frenchNameRequired')] : []"
                                ></v-text-field>
                                <v-textarea
                                    v-model="translation.description"
                                    :label="translation.locale.toUpperCase() + ' ' + t('description')"
                                ></v-textarea>
                            </v-col>
                        </v-row>
                    </v-container>
                </v-form>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn @click="closeDialog">{{ t('cancel') }}</v-btn>
                <v-btn color="primary" @click="saveChanges">{{ saveLabel }}</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Product, Translation } from '~/types'
import { useCategoriesStore } from '~/stores/categories'
import { useI18n } from 'vue-i18n'
import type { VForm } from 'vuetify/components'

// Define props and emits.
// - In edit mode, a product is provided.
// - In create mode, product prop may be omitted.
const props = defineProps<{
    product?: Product
    mode?: 'create' | 'edit'
}>()

const emit = defineEmits<{
    (e: 'update', updatedProduct: Product): void
    (e: 'create', newProduct: Product): void
    (e: 'close'): void
}>()

const { t } = useI18n()

// Languages used for translations.
const languages = ['fr', 'en', 'zh']

// Create a copy of an existing product with exactly the languages we need.
const createProductCopy = (product: Product): Product => {
    const translations: Translation[] = languages.map(lang => {
        const existing = product.translations.find(t => t.locale === lang)
        return existing
            ? { locale: lang, name: existing.name, description: existing.description }
            : { locale: lang, name: '', description: '' }
    })
    return { ...product, translations }
}

// Create a default product for create mode.
const createDefaultProduct = (): Product => ({
    id: '00000000-0000-0000-0000-000000000000',
    price: 0,
    code: null,
    pieceCount: null,
    isHalal: false,
    isVegan: false,
    isVisible: false,
    isAvailable: false,
    categoryId: '',
    isDiscountable: true,
    translations: languages.map(locale => ({ locale, name: null, description: null }))
})

// Initialize the edited product based on mode.
const editedProduct = ref<Product>(
    props.mode === 'create' || !props.product
        ? createDefaultProduct()
        : createProductCopy(props.product)
)

// In edit mode, update the copy if the prop changes.
if (props.mode !== 'create') {
    watch(() => props.product, (newVal) => {
        if (newVal) {
            editedProduct.value = createProductCopy(newVal)
        }
    })
}

const dialog = ref(true)

// Use categories store.
const categoryStore = useCategoriesStore()
const categories = computed(() => categoryStore.getCategories())

const closeDialog = () => {
    dialog.value = false
    emit('close')
}

const form = ref<InstanceType<typeof VForm> | null>(null)

const saveChanges = async () => {
    if (form.value) {
        const valid = await form.value.validate()
        if (!valid) return
    }
    if (props.mode === 'create') {
        emit('create', editedProduct.value)
    } else {
        emit('update', editedProduct.value)
    }
    closeDialog()
}

// Dynamic dialog title and save button label.
const dialogTitle = computed(() =>
    props.mode === 'create' ? t('addProduct') : t('editProduct')
)
const saveLabel = computed(() =>
    props.mode === 'create' ? t('create') : t('save')
)
</script>

<style scoped>
/* Remove the spinner arrows in WebKit browsers */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

/* Remove the spinner arrows in Firefox */
input[type="number"] {
    -moz-appearance: textfield;
}
</style>
