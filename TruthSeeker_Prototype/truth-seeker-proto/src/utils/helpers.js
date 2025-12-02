import { renderTemplate } from './template.js';

export function rand(rng, list) {
  if (!list.length) return undefined;
  const index = Math.floor(rng() * list.length);
  return list[index];
}

export function pickUnique(rng, list, count) {
  const copy = [...list];
  const result = [];
  while (copy.length && result.length < count) {
    const index = Math.floor(rng() * copy.length);
    result.push(copy.splice(index, 1)[0]);
  }
  return result;
}

export function priceOfClue(clue, fallback = 100) {
  return typeof clue?.price === 'number' ? clue.price : fallback;
}

export function renderClue(clue, context = {}) {
  return {
    ...clue,
    text: renderTemplate(clue.text, context)
  };
}
