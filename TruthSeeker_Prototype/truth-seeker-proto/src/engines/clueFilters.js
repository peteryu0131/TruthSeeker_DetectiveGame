export function prepareCandidateSet(suspects) {
  return suspects.map((suspect) => ({ id: suspect.id, name: suspect.name, possible: true }));
}

export function narrowCandidates(candidateSet, predicate) {
  return candidateSet.map((candidate) => ({
    ...candidate,
    possible: predicate(candidate)
  }));
}
