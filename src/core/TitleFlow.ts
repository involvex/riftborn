/** Which primary title actions to show. */
export type TitleAction = 'newGame' | 'continue' | 'settings';

/** Title primary buttons: Continue only when a save exists. */
export function titleActions(hasSave: boolean): TitleAction[] {
  const actions: TitleAction[] = ['newGame'];
  if (hasSave) actions.push('continue');
  actions.push('settings');
  return actions;
}

/** First empty slot index, or null if all occupied. */
export function firstEmptySlot(
  slots: readonly (unknown | null)[],
): number | null {
  for (let i = 0; i < slots.length; i++) {
    if (!slots[i]) return i;
  }
  return null;
}
