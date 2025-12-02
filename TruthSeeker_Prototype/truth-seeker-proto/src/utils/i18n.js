const messages = {
  en: {
    title: 'TruthSeeker Prototype',
    newCase: 'New Case',
    purchasing: 'Purchase clue',
    purchased: 'Purchased clues',
    contradictions: 'Contradictions',
    quiz: 'Quiz',
    solution: 'Solution',
    revealSolution: 'Reveal Solution',
    restart: 'Restart',
    loading: 'Loading case...',
    store: 'Clue Store',
    initialClues: 'Initial Clues',
    statement: 'Statement',
    difficulty: 'Difficulty',
    language: 'Language',
    continue: 'Continue',
    caseMeta: 'Case Metadata'
  }
};

let activeLanguage = 'en';

export function setLanguage(language) {
  activeLanguage = language in messages ? language : 'en';
}

export function t(key) {
  return messages[activeLanguage]?.[key] ?? key;
}
