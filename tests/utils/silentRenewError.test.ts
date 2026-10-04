import { describe, expect, it } from 'vite-plus/test'
import { SilentRenewUnavailableError, isSilentRenewUnavailable } from '~/utils/silentRenewError'

describe('SilentRenewUnavailableError', () => {
  it('is an Error named after itself, keeping the cause', () => {
    const cause = new TypeError('Failed to fetch')
    const error = new SilentRenewUnavailableError({ cause })
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('SilentRenewUnavailableError')
    expect(error.cause).toBe(cause)
    expect(new SilentRenewUnavailableError().cause).toBeUndefined()
  })

  it('is recognised by name, so a second copy of the module still matches', () => {
    expect(isSilentRenewUnavailable(new SilentRenewUnavailableError())).toBe(true)
    const otherCopy = Object.assign(new Error('x'), { name: 'SilentRenewUnavailableError' })
    expect(isSilentRenewUnavailable(otherCopy)).toBe(true)
  })

  it.each([
    new Error('x'),
    new TypeError('x'),
    'SilentRenewUnavailableError',
    null,
    undefined,
    { name: 'SilentRenewUnavailableError' },
  ])('does not recognise %j', (value) => {
    expect(isSilentRenewUnavailable(value)).toBe(false)
  })
})
