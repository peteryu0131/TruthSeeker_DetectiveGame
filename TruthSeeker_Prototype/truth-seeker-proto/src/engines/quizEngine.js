import { createSeededRandom, shuffle } from '../services/rng.js';

const DIFFICULTY_LIMIT = {
  easy: 1,
  medium: 2,
  hard: 3
};

export function buildQuiz(caseData) {
  return caseData.quiz ?? [];
}
