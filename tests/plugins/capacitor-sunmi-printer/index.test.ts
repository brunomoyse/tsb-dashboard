// The plugin entry: registers "SunmiPrinter" with Capacitor (native Android implementation) and lazy-loads the web stub
// for browsers. @capacitor/core is the boundary.
// Run: `vp test run tests/plugins/capacitor-sunmi-printer/index.test.ts`.
import { describe, expect, it, vi } from 'vite-plus/test'

const registerPlugin = vi.hoisted(() =>
  vi.fn((_name: string, _options: unknown) => ({ proxy: true })),
)
vi.mock('@capacitor/core', () => ({
  WebPlugin: class WebPlugin {
    readonly mocked = true
  },
  registerPlugin,
}))

const { SunmiPrinter } = await import('~/plugins/capacitor-sunmi-printer/src/index')
// Registration happens once, at import: read it before the per-test mock reset clears the calls.
const registrations = registerPlugin.mock.calls.slice()
const { SunmiPrinterWeb } = await import('~/plugins/capacitor-sunmi-printer/src/web')

describe('SunmiPrinter plugin', () => {
  it('is registered once, under the name the Android plugin answers to', () => {
    expect(registrations).toHaveLength(1)
    expect(registrations[0]?.[0]).toBe('SunmiPrinter')
    expect(SunmiPrinter).toEqual({ proxy: true })
  })

  it('serves the web stub in a browser, loaded on demand', async () => {
    const options = registrations[0]?.[1] as { web: () => Promise<unknown> }
    const web = await options.web()
    expect(web).toBeInstanceOf(SunmiPrinterWeb)
  })
})
