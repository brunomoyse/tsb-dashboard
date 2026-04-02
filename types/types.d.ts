// Types/types.d.ts
declare module '#app' {
  interface NuxtApp {
    $apiBaseUrl: () => string
    $api: <T = any>(request: string, options?: Record<string, any>) => Promise<T>
  }
}

// If using Nitro auto-imports
declare module 'nitropack' {
  interface NitroApp {
    $apiBaseUrl?: () => string
    $api?: <T = any>(request: string, options?: Record<string, any>) => Promise<T>
  }
}