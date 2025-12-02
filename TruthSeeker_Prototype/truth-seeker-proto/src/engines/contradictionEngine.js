export function detectContradictions(caseData, purchasedClues = []) {
  const rules = caseData.contradictionRules ?? [];
  const cluesByTitle = new Map(purchasedClues.map((clue) => [clue.title, clue]));

  return rules
    .filter((rule) => cluesByTitle.has(rule.premise))
    .map((rule) => ({
      id: rule.id,
      premise: rule.premise,
      conflict: rule.conflict,
      resolution: rule.resolution
    }));
}
