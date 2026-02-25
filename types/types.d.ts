// Types/types.d.ts
import type { $Fetch } from 'ofetch'

declare module '#app' {
  interface NuxtApp {
    $apiBaseUrl: () => string
    $api: $Fetch
    $refreshToken: () => Promise<RefreshTokenResponse | null>
  }
}

// If using Nitro auto-imports
declare module 'nitropack' {
  interface NitroApp {
    $apiBaseUrl?: () => string
    $api?: $Fetch
  }
}