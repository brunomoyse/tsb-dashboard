<template>
    <v-dialog v-model="dialog" max-width="600px">
        <v-card>
            <v-card-title>Edit Product</v-card-title>
            <v-card-text>
                <!-- Your edit form goes here -->
                <v-text-field
                    v-model="editedProduct.name"
                    label="Product Name"
                ></v-text-field>
                <v-text-field
                    v-model="editedProduct.price"
                    label="Price"
                    type="number"
                ></v-text-field>
                <!-- Add more fields as needed -->
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

const props = defineProps<{ product: Product | null }>()
const emit = defineEmits<{
    (e: 'update', updatedProduct: Product): void
    (e: 'close'): void
}>()

const dialog = ref(true)

// Make a shallow copy of the product to edit
const editedProduct = ref(props.product ? { ...props.product } : null)

console.log(editedProduct)

// If the incoming product changes, update the local copy
watch(() => props.product, (newVal) => {
    editedProduct.value = newVal ? { ...newVal } : null
})

// Emit close event when the dialog is closed
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
