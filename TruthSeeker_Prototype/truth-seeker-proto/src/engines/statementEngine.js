export function buildStatement(caseData, purchasedClues = []) {
  return {
    opening: [],
    initial: caseData.initialClues ?? [],
    purchased: purchasedClues
  };
}

export function mergePurchasedClue(statement, clueEntry) {
  if (statement.purchased.some((clue) => clue.id === clueEntry.id)) {
    return statement;
  }
  return {
    ...statement,
    purchased: [...statement.purchased, clueEntry]
  };
}

export function mergeContradictions(statement) {
  return statement;
}
