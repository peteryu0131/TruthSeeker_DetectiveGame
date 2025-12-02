export function createSeededRandom(seed = Date.now()) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;

  return function seededRandom() {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

export function shuffle(rng, array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
