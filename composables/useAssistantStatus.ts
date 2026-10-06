import { onMounted, watch } from 'vue'
import { useGqlSubscription, useNuxtApp, useState } from '#imports'
import gql from 'graphql-tag'
import { print } from 'graphql'
import type { AssistantConnection } from '~/utils/assistant'

const CONNECTION_FIELDS = `
  enabled
  state
  account
  since
  expiredAt
  everConnected
  loginInProgress
`

const GET_CONNECTION = print(gql`
  query AssistantConnection {
    assistantConnection {
      ${CONNECTION_FIELDS}
    }
  }
`)

const SUB_CONNECTION = print(gql`
  subscription AssistantConnectionUpdated {
    assistantConnectionUpdated {
      ${CONNECTION_FIELDS}
    }
  }
`)

/**
 * The WeChat assistant's connection, shared by the layout banner and the
 * assistant page. `connection` stays null until the first load.
 *
 * Call it directly in `<script setup>`: it subscribes to live updates.
 */
export function useAssistantStatus() {
  const { $gqlFetch } = useNuxtApp()
  const connection = useState<AssistantConnection | null>('pili-assistant-connection', () => null)

  const load = async () => {
    try {
      const data = await $gqlFetch<{ assistantConnection: AssistantConnection } | null>(
        GET_CONNECTION,
      )
      if (data) connection.value = data.assistantConnection
    } catch {
      // Not an admin, or the API is down: no banner, the page shows its own error.
    }
  }

  const { data: live } = useGqlSubscription<{ assistantConnectionUpdated: AssistantConnection }>(
    SUB_CONNECTION,
  )
  watch(live, (val) => {
    if (val?.assistantConnectionUpdated) connection.value = val.assistantConnectionUpdated
  })

  onMounted(load)

  return { connection, reload: load }
}
