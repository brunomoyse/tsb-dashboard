/**
 * A product must never keep a choice group without choices: the shop renders the group's name on the card
 * ("riz vinaigré + choix") and a required empty group can never be satisfied, so the product cannot be ordered.
 * On save the dialog keeps the groups that still hold a choice and deletes the persisted ones left empty.
 */
export const splitEmptyChoiceGroups = <G extends { id?: string; choices: readonly unknown[] }>(
  groups: readonly G[],
): { kept: G[]; emptyGroupIds: string[] } => ({
  kept: groups.filter((group) => group.choices.length > 0),
  emptyGroupIds: groups.flatMap((group) =>
    group.choices.length === 0 && group.id !== undefined ? [group.id] : [],
  ),
})
