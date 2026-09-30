import { onMounted, ref, watch } from 'vue'
import { useGqlSubscription, useNuxtApp, useState } from '#imports'
import gql from 'graphql-tag'
import { print } from 'graphql'

const GET_ORDERING = print(gql`
  query OrderingStatus {
    restaurantConfig { orderingEnabled }
  }
`)

const UPDATE_ORDERING = print(gql`
  mutation UpdateOrderingEnabled($enabled: Boolean!) {
    updateOrderingEnabled(enabled: $enabled) { orderingEnabled }
  }
`)

const SUB_ORDERING = print(gql`
  subscription OrderingStatusUpdated {
    restaurantConfigUpdated { orderingEnabled }
  }
`)

/**
 * Whether online ordering is open ("en ligne") or paused ("en pause").
 * Shared by the mobile orders header and the Plus page. `enabled` stays null
 * until the first load so the UI doesn't flash "paused".
 *
 * Call it directly in `<script setup>`: it subscribes to live config updates.
 */
export function useOrderingStatus() {
  const { $gqlFetch } = useNuxtApp()
  const enabled = useState<boolean | null>('pili-ordering-enabled', () => null)
  const updating = ref(false)

  const load = async () => {
    const data = await $gqlFetch<{ restaurantConfig: { orderingEnabled: boolean } }>(GET_ORDERING)
    if (data) enabled.value = data.restaurantConfig.orderingEnabled
  }

  const setEnabled = async (value: boolean) => {
    updating.value = true
    try {
      await $gqlFetch(UPDATE_ORDERING, { variables: { enabled: value } })
      enabled.value = value
    } finally {
      updating.value = false
    }
  }

  const { data: live } = useGqlSubscription<{ restaurantConfigUpdated: { orderingEnabled: boolean } }>(SUB_ORDERING)
  watch(live, (val) => {
    if (val?.restaurantConfigUpdated) enabled.value = val.restaurantConfigUpdated.orderingEnabled
  })

  onMounted(load)

  return { enabled, updating, setEnabled, reload: load }
}
