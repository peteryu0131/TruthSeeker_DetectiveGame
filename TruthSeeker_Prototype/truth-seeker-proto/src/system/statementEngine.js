export function buildStatement(caseData, purchasedClues = []) {
  return {
    opening: [],
    initial: caseData.initialClues ?? [],
    purchased: purchasedClues
  };
}
