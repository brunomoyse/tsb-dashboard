import { describe, expect, it } from 'vitest'
import { splitEmptyChoiceGroups } from '~/utils/choiceGroups'

describe('splitEmptyChoiceGroups', () => {
  it('keeps the groups that hold a choice', () => {
    const full = { id: 'g1', choices: [{ id: 'c1' }] }
    const added = { choices: [{}] }

    expect(splitEmptyChoiceGroups([full, added])).toEqual({
      kept: [full, added],
      emptyGroupIds: [],
    })
  })

  it('drops empty groups and lists the persisted ones to delete', () => {
    const full = { id: 'g1', choices: [{ id: 'c1' }] }
    const emptied = { id: 'g2', choices: [] }
    const neverSaved = { choices: [] }

    expect(splitEmptyChoiceGroups([emptied, full, neverSaved])).toEqual({
      kept: [full],
      emptyGroupIds: ['g2'],
    })
  })

  it('handles a product without groups', () => {
    expect(splitEmptyChoiceGroups([])).toEqual({ kept: [], emptyGroupIds: [] })
  })
})
