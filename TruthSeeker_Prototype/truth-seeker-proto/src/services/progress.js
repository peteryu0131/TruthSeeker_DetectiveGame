const PROGRESS_KEY = 'truth_seeker_progress';

export function getProgress() {
  try {
    const stored = localStorage.getItem(PROGRESS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error('Failed to load progress:', err);
  }
  return {
    completedStories: [],
    unlockedStories: [0], // First story is always unlocked
    lastStoryIndex: 0,
    savedActionPoints: 0,
    savedExcessAP: 0,
    storyScores: {}, // { storyIndex: { correct, total, accuracy } }
    storyInitialAP: {} // { storyIndex: initialAP } - tracks initial AP when entering each story
  };
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (err) {
    console.error('Failed to save progress:', err);
  }
}

export function completeStory(storyIndex, actionPoints, quizScore = null) {
  const progress = getProgress();
  
  // Mark story as completed if not already
  if (!progress.completedStories.includes(storyIndex)) {
    progress.completedStories.push(storyIndex);
  }
  
  // Unlock next story
  const nextIndex = storyIndex + 1;
  if (!progress.unlockedStories.includes(nextIndex)) {
    progress.unlockedStories.push(nextIndex);
  }
  
  // Save action points for next story
  progress.savedActionPoints = actionPoints;
  progress.lastStoryIndex = storyIndex;
  
  // Save quiz score if provided
  if (quizScore && quizScore.total > 0) {
    if (!progress.storyScores) {
      progress.storyScores = {};
    }
    progress.storyScores[storyIndex] = {
      correct: quizScore.correct,
      total: quizScore.total,
      accuracy: Math.round((quizScore.correct / quizScore.total) * 100),
      errorRate: Math.round(((quizScore.total - quizScore.correct) / quizScore.total) * 100)
    };
  }
  
  saveProgress(progress);
  return progress;
}

export function getStoryScore(storyIndex) {
  const progress = getProgress();
  return progress.storyScores?.[storyIndex] || null;
}

export function getAllStoryScores() {
  const progress = getProgress();
  return progress.storyScores || {};
}

export function getOverallStats() {
  const progress = getProgress();
  const scores = progress.storyScores || {};
  const storyIndices = Object.keys(scores).map(Number);
  
  if (storyIndices.length === 0) {
    return { totalCorrect: 0, totalQuestions: 0, overallAccuracy: 0, overallErrorRate: 0 };
  }
  
  let totalCorrect = 0;
  let totalQuestions = 0;
  
  storyIndices.forEach((index) => {
    const score = scores[index];
    totalCorrect += score.correct;
    totalQuestions += score.total;
  });
  
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const overallErrorRate = totalQuestions > 0 ? Math.round(((totalQuestions - totalCorrect) / totalQuestions) * 100) : 0;
  
  return {
    totalCorrect,
    totalQuestions,
    overallAccuracy,
    overallErrorRate,
    completedCount: storyIndices.length
  };
}

export function isStoryUnlocked(storyIndex) {
  const progress = getProgress();
  return progress.unlockedStories.includes(storyIndex);
}

export function isStoryCompleted(storyIndex) {
  const progress = getProgress();
  return progress.completedStories.includes(storyIndex);
}

const BASE_ACTION_POINTS = 100;

export function getSavedActionPoints() {
  const progress = getProgress();
  const baseAP = progress.savedActionPoints || 0;
  const excessAP = progress.savedExcessAP || 0;
  // Return base AP (capped at 100) + excess, but cap total at 100
  return Math.min(BASE_ACTION_POINTS, baseAP + excessAP);
}

export function clearSavedExcessAP() {
  const progress = getProgress();
  progress.savedExcessAP = 0;
  saveProgress(progress);
}

export function clearSavedActionPoints() {
  const progress = getProgress();
  progress.savedActionPoints = 0;
  saveProgress(progress);
}

export function resetProgress() {
  const defaultProgress = {
    completedStories: [],
    unlockedStories: [0],
    lastStoryIndex: 0,
    savedActionPoints: 0,
    savedExcessAP: 0,
    storyScores: {},
    storyInitialAP: {}
  };
  saveProgress(defaultProgress);
  return defaultProgress;
}

// Save the initial AP when entering a story (for reset functionality)
export function saveStoryInitialAP(storyIndex, ap) {
  const progress = getProgress();
  if (!progress.storyInitialAP) {
    progress.storyInitialAP = {};
  }
  progress.storyInitialAP[storyIndex] = ap;
  saveProgress(progress);
}

// Get the initial AP for a story (used when resetting)
export function getStoryInitialAP(storyIndex) {
  const progress = getProgress();
  return progress.storyInitialAP?.[storyIndex] ?? null;
}

export function areAllStoriesCompleted(totalStories) {
  const progress = getProgress();
  const completedCount = progress.completedStories?.length || 0;
  return completedCount >= totalStories && totalStories > 0;
}

