<script setup lang="ts">
const localePath = useLocalePath()
await navigateTo(localePath('products'), { replace: true })
</script>
