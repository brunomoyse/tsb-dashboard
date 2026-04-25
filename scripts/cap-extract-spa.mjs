/**
 * Extract the SPA shell HTML from the Nitro server build.
 *
 * With ssr:false, `nuxt build` produces a Nitro server that generates the
 * SPA shell at runtime — there's no static index.html. Capacitor needs one,
 * so we start the server briefly, fetch the shell, and save it.
 *
 * Capacitor's Android asset server (WebViewLocalServer) returns 404 when a
 * requested path has no matching file. In a SPA with locale-prefixed routes
 * (e.g. /fr/orders), every route refresh or deep-link would 404. To avoid
 * that, we also save a copy of the shell at every known locale-prefixed
 * route so any refresh inside the app is served the SPA shell and the
 * client-side router takes over.
 */

import { dirname, resolve } from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'

const PORT = 3199
const LOCALES = ['fr', 'en', 'zh', 'nl']
// Keep in sync with pages/ — one entry per Vue page
const PAGES = [
  '', // Locale root (/{locale}/)
  'auth/login',
  'auth/callback',
  'coupons',
  'customers',
  'order-history',
  'orders',
  'printer-test',
  'products',
  'settings',
]

const serverEntry = resolve('.output/server/index.mjs')
const publicDir = resolve('.output/public')
const rootIndex = resolve(publicDir, 'index.html')

console.log('Starting Nitro server to extract SPA shell...')

const server = spawn('node', [serverEntry], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
})

await new Promise((ready) => {
  server.stdout.on('data', (data) => {
    if (data.toString().includes('Listening')) ready()
  })
  setTimeout(ready, 3000)
})

function writeShell(path, html) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, html)
}

try {
  const res = await fetch(`http://localhost:${PORT}/fr`)
  const html = await res.text()
  writeShell(rootIndex, html)
  console.log(`SPA shell saved to .output/public/index.html (${html.length} bytes)`)

  let count = 0
  for (const locale of LOCALES) {
    for (const page of PAGES) {
      const path = page
        ? resolve(publicDir, locale, page, 'index.html')
        : resolve(publicDir, locale, 'index.html')
      writeShell(path, html)
      count++
    }
  }
  console.log(`SPA shell also saved to ${count} locale-prefixed routes`)
} finally {
  server.kill()
}
