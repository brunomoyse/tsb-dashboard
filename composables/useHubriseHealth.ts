// HubRise health polling composable.
//
// Consumes the public /api/v1/hubrise/webshop/health endpoint and
// keeps the status reactive for the persistent banner in
// layouts/default.vue. No credentials needed — the endpoint is
// intentionally public (aggregated counts, no PII).
//
// Poll interval: 30s. Short enough for operational incidents, gentle
// enough to avoid hammering tsb-service.

export interface HubriseHealthSnapshot {
  status: 'ok' | 'degraded' | 'down'
  orders_failed_count: number
  orders_stuck_pending_count: number
  last_successful_push_age_seconds: number | null
  catalog_last_push_status: string | null
  catalog_last_push_age_seconds: number | null
  generated_at: string
  reasons?: string[]
}

export function useHubriseHealth() {
  const status = ref<'ok' | 'degraded' | 'down' | 'unknown'>('unknown')
  const snapshot = ref<HubriseHealthSnapshot | null>(null)
  const lastError = ref<string | null>(null)
  const runtimeConfig = useRuntimeConfig()

  async function fetchOnce() {
    try {
      const baseURL = runtimeConfig.public.api as string
      const url = `${baseURL.replace(/\/$/, '')}/hubrise/webshop/health`
      // `ignoreResponseError: true` — the endpoint returns 503 on `down`
      // with a valid JSON body, which we still want to decode.
      const data = await $fetch<HubriseHealthSnapshot>(url, {
        ignoreResponseError: true,
      })
      snapshot.value = data
      status.value = data.status
      lastError.value = null
    } catch (err) {
      status.value = 'unknown'
      lastError.value = String(err)
    }
  }

  let interval: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    fetchOnce()
    interval = setInterval(fetchOnce, 30_000)
  })

  onBeforeUnmount(() => {
    if (interval) {
      clearInterval(interval)
      interval = null
    }
  })

  return { status, snapshot, lastError, fetchOnce }
}
