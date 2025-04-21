<template>
    <v-dialog v-model="dialog" max-width="800px" persistent>
        <v-card>
            <v-card-title>{{ dialogTitle }}</v-card-title>
            <v-card-text>
                <v-form ref="form" :lazy-validation="false">
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
                                    :label="t('products.category')"
                                    :rules="[v => (!!v && v.trim().length > 0) || t('validation.categoryRequired')]"
                                ></v-select>
                                <v-text-field
                                    v-model="editedProduct.code"
                                    :label="t('products.code')"
                                ></v-text-field>
                                <v-text-field
                                   v-model="editedProduct.price"
                                   :label="t('products.priceEuro')"
                                   type="number"
                                   required
                                   :rules="[
                                     v => (v !== null && v !== '' && !isNaN(v)) || t('validation.priceRequired')
                                   ]"
                                ></v-text-field>
                                <v-text-field
                                    v-model.number="editedProduct.pieceCount"
                                    :label="t('products.pieceCount')"
                                    type="number"
                                ></v-text-field>
                            </v-col>
                            <!-- Right Column: Image Preview / Upload -->
                            <v-col cols="12" md="6" class="d-flex flex-column align-center justify-center">
                                <div v-if="hasImage" class="d-flex flex-column align-center justify-center">
                                    <v-img
                                        :src="imageUrl"
                                        class="mb-4"
                                        width="150"
                                    ></v-img>
                                    <v-btn text @click="removeImage">{{ t('products.image') }}</v-btn>
                                </div>
                                <div v-else class="d-flex flex-column align-center justify-center">
                                    <!-- Image preview -->
                                    <v-img
                                        v-if="imagePreview"
                                        :src="imagePreview"
                                        width="150"
                                        height="150"
                                        class="mb-4"
                                        cover
                                    ></v-img>

                                    <!-- File input -->
                                    <v-file-input
                                        v-model="selectedImage"
                                        label="Upload Image"
                                        accept="image/*"
                                        style="width: 300px;"
                                    ></v-file-input>
                                </div>
                            </v-col>
                        </v-row>
                        <!-- Row 2: Translations (3 columns) -->
                        <v-row>
                            <v-col
                                cols="12"
                                md="4"
                                v-for="translation in editedProduct.translations"
                                :key="translation.language"
                            >
                                <v-text-field
                                    v-model="translation.name"
                                    :label="translation.language.toUpperCase() + ' ' + t('common.name')"
                                    :rules="translation.language === 'fr' ? [v => (!!v && v.trim().length > 0) || t('validation.frenchNameRequired')] : []"
                                ></v-text-field>
                                <v-textarea
                                    v-model="translation.description"
                                    :label="translation.language.toUpperCase() + ' ' + t('common.description')"
                                ></v-textarea>
                            </v-col>
                        </v-row>
                        <!-- Row 3: Checkboxes -->
                        <v-row dense class="pa-0 ma-0">
                            <v-col cols="12" md="4" class="pa-1">
                                <v-checkbox dense v-model="editedProduct.isVisible" :label="t('common.visible')"></v-checkbox>
                            </v-col>
                            <v-col cols="12" md="4" class="pa-1">
                                <v-checkbox dense v-model="editedProduct.isAvailable" :label="t('common.available')"></v-checkbox>
                            </v-col>
                            <v-col cols="12" md="4" class="pa-1">
                                <v-checkbox dense v-model="editedProduct.isDiscountable" :label="t('products.discountable')"></v-checkbox>
                            </v-col>
                            <v-col cols="12" md="4" class="pa-1">
                                <v-checkbox dense v-model="editedProduct.isHalal" :label="t('products.halal')"></v-checkbox>
                            </v-col>
                            <v-col cols="12" md="4" class="pa-1">
                                <v-checkbox dense v-model="editedProduct.isVegan" :label="t('products.vegan')"></v-checkbox>
                            </v-col>
                        </v-row>
                    </v-container>
                </v-form>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn @click="closeDialog">{{ t('common.cancel') }}</v-btn>
                <v-btn color="primary" @click="saveChanges">{{ saveLabel }}</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import type {
    CreateProductInput,
    Product,
    Translation,
    TranslationInput,
    UpdateProductInput,
    UpdateProductRequest
} from '~/types'
import { useCategoriesStore } from '~/stores/categories'
import { useI18n } from 'vue-i18n'
import type { VForm } from 'vuetify/components'

// Props and emits definition.
const props = defineProps<{
    product?: Product
    mode?: 'create' | 'edit'
}>()

const emit = defineEmits<{
    (e: 'update', updatedProduct: UpdateProductRequest): void
    (e: 'create', newProduct: CreateProductInput): void
    (e: 'close'): void
}>()

const { t, locale } = useI18n()

// Languages used for translations.
const languages = ['fr', 'en', 'zh']

// Create a copy of an existing product with exactly the languages we need.
const createProductCopy = (product: Product): UpdateProductInput => {
    const categoryId = product.category?.id || ''
    const translations: TranslationInput[] = languages.map(lang => {
        const existing = product.translations.find(t => t.language === lang)
        return existing
            ? { language: lang, name: existing.name, description: existing.description }
            : { language: lang, name: '', description: '' }
    })
    return { ...product, translations, categoryId }
}

// Create a default product for create mode.
const createDefaultProduct = (): CreateProductInput => ({
    categoryId: '',
    code: null,
    isAvailable: false,
    isDiscountable: true,
    isHalal: false,
    isVegan: false,
    isVisible: false,
    pieceCount: null,
    price: '',
    translations: languages.map(language => ({ language, name: '', description: null }))
})

// Initialize the edited product based on mode.
const editedProduct = ref<CreateProductInput | UpdateProductInput>(
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

const categoryStore = useCategoriesStore()
const categories = computed(() => categoryStore.getCategories(locale.value))

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
        let createProductInput: CreateProductInput = editedProduct.value as CreateProductInput

        if (selectedImage.value) {
            createProductInput.image = selectedImage.value
        }
        emit('create', createProductInput)
    } else {
        if (!props.product?.id) return

        let updateProductInput: UpdateProductInput = editedProduct.value as UpdateProductInput

        if (selectedImage.value) {
            updateProductInput.image = selectedImage.value
        }

        let updateProductRequest: UpdateProductRequest = {
            id: props.product?.id,
            input: updateProductInput
        }

        emit('update', updateProductRequest)
    }
    closeDialog()
}

const dialogTitle = computed(() =>
    props.mode === 'create' ? t('products.add') : t('products.edit')
)
const saveLabel = computed(() =>
    props.mode === 'create' ? t('common.create') : t('common.save')
)

// ----- Image Preview / Upload Section -----
const config = useRuntimeConfig()
// Compute the image URL based on the product slug.
const imageUrl = computed(() =>
    props.product?.slug
        ? `${config.public.s3bucketUrl}/images/thumbnails/${props.product.slug}.png`
        : ''
)

// Flag indicating if the image exists.
const hasImage = ref(false)
// Reactive property to hold the file if the user uploads one.
const selectedImage = ref<File | null>(null)
const imagePreview = ref<string | null>(null)

watch(selectedImage, (file) => {
    if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
            imagePreview.value = e.target?.result as string
        }
        reader.readAsDataURL(file as File)
    } else {
        imagePreview.value = null
    }
})

// Helper function to check if an image exists at a given URL.
const checkImageExists = (url: string) => {
    const img = new Image()
    img.src = url
    img.onload = () => {
        hasImage.value = true
    }
    img.onerror = () => {
        hasImage.value = false
    }
}

onMounted(() => {
    if (imageUrl.value) {
        checkImageExists(imageUrl.value)
    }
})

// Re-check the image whenever the URL changes.
watch(imageUrl, (newUrl) => {
    if (newUrl) {
        checkImageExists(newUrl)
    } else {
        hasImage.value = false
    }
})

// Remove the current image preview so that the file input appears.
const removeImage = () => {
    hasImage.value = false
    selectedImage.value = null
}
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
