import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { generateCase } from '../engines/caseGenerator.js';
import { buildStatement, mergePurchasedClue } from '../engines/statementEngine.js';
import { composeSolution } from '../engines/solutionComposer.js';
import { getProgress, completeStory, isStoryUnlocked, getSavedActionPoints, clearSavedActionPoints, clearSavedExcessAP, saveProgress, saveStoryInitialAP, getStoryInitialAP } from '../services/progress.js';

const DEFAULT_DIFFICULTY = 'medium';
const BASE_ACTION_POINTS = 100;
const ACTION_POINT_STEP = 10;

export function useCaseEngine({ pools, initialDifficulty = DEFAULT_DIFFICULTY }) {
  const stories = pools?.stories ?? [];

  const [caseData, setCaseData] = useState(null);
  const [statement, setStatement] = useState(null);
  const [store, setStore] = useState([]);
  const [purchasedClues, setPurchasedClues] = useState([]);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [solutionRevealed, setSolutionRevealed] = useState(false);
  const [actionPoints, setActionPoints] = useState(BASE_ACTION_POINTS);
  const [roundSpentPoints, setRoundSpentPoints] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const currentStoryIndexRef = useRef(0);
  const [unlockedStories, setUnlockedStories] = useState(() => {
    const progress = getProgress();
    return progress.unlockedStories;
  });

  const purchasedCount = useMemo(() => store.filter((entry) => entry.purchased).length, [store]);
  const nextAbilityCost = (purchasedCount + 1) * ACTION_POINT_STEP;

  const initializeCase = useCallback(
    (options = {}) => {
      if (!stories.length) return;
      setStatus('loading');
      setError(null);

      const nextDifficulty = options.difficulty ?? difficulty;
      const storyIndex = options.storyIndex ?? currentStoryIndexRef.current;

      // Check if story is unlocked
      if (!isStoryUnlocked(storyIndex)) {
        setError(new Error('Story not unlocked yet. Complete previous stories first.'));
        setStatus('error');
        return;
      }

      try {
        const generated = generateCase(stories, storyIndex, nextDifficulty, options.seed);
        const decoratedStore = (generated.storeClues ?? []).map((entry) => ({ ...entry, purchased: false }));
        const freshStatement = buildStatement(generated, []);

        // Determine initial AP based on context:
        // - If advancing to new story (useSavedAP === true): use saved AP from previous story
        // - If resetting current story: use story's initial AP (or BASE_ACTION_POINTS for story 0)
        let initialAP;
        if (options.useSavedAP === true) {
          // Advancing to new story: use saved AP from previous story
          const savedAP = getSavedActionPoints();
          initialAP = savedAP > 0 ? Math.min(BASE_ACTION_POINTS, savedAP) : BASE_ACTION_POINTS;
          // Save this as the initial AP for this story (for reset functionality)
          saveStoryInitialAP(storyIndex, initialAP);
          // Clear saved action points and excess after using them
          if (savedAP > 0) {
            clearSavedActionPoints();
            clearSavedExcessAP();
          }
        } else {
          // Resetting current story: use story's initial AP
          if (storyIndex === 0) {
            // Story 0: always reset to BASE_ACTION_POINTS
            initialAP = BASE_ACTION_POINTS;
            // Save Story 0's initial AP if not already saved
            if (!getStoryInitialAP(0)) {
              saveStoryInitialAP(0, BASE_ACTION_POINTS);
            }
          } else {
            // Story 1+: reset to the initial AP when entering this story
            const storyInitialAP = getStoryInitialAP(storyIndex);
            initialAP = storyInitialAP ?? BASE_ACTION_POINTS;
          }
        }
        
        setCaseData(generated);
        setStore(decoratedStore);
        setStatement(freshStatement);
        setPurchasedClues([]);
        setSolutionRevealed(false);
        setDifficulty(nextDifficulty);
        setActionPoints(initialAP);
        setRoundSpentPoints(0);
        setCurrentStoryIndex(storyIndex);
        currentStoryIndexRef.current = storyIndex;
        
        setStatus('ready');
      } catch (err) {
        setError(err);
        setStatus('error');
      }
    },
    [stories, difficulty]
  );

  useEffect(() => {
    if (stories.length && status === 'idle') {
      // Load progress and start with first unlocked story
      const progress = getProgress();
      const firstUnlocked = progress.unlockedStories[0] ?? 0;
      currentStoryIndexRef.current = firstUnlocked;
      setUnlockedStories(progress.unlockedStories);
      initializeCase({ storyIndex: firstUnlocked });
    }
  }, [stories, status, initializeCase]);

  const purchaseClue = useCallback(
    (clueId) => {
      if (!caseData) return;
      const target = store.find((entry) => entry.clue.id === clueId);
      if (!target || target.purchased) {
        return;
      }

      const previousPurchases = store.filter((entry) => entry.purchased).length;
      const cost = (previousPurchases + 1) * ACTION_POINT_STEP;
      if (actionPoints < cost) {
        return;
      }

      const updatedStore = store.map((entry) => {
        if (entry.clue.id === clueId) {
          return { ...entry, purchased: true, spentCost: cost };
        }
        return entry;
      });
      setStore(updatedStore);

      setPurchasedClues((prev) => {
        if (prev.some((clue) => clue.id === target.clue.id)) {
          return prev;
        }

        setStatement((prevStatement) => mergePurchasedClue(prevStatement ?? buildStatement(caseData), target.clue));
        return [...prev, target.clue];
      });

      setActionPoints((prevPoints) => Math.max(0, prevPoints - cost));
      setRoundSpentPoints((prevSpent) => prevSpent + cost);
    },
    [caseData, store, actionPoints]
  );

  const resetCase = useCallback(
    (options = {}) => {
      initializeCase(options);
    },
    [initializeCase]
  );

  const revealSolution = useCallback(() => {
    setSolutionRevealed(true);
  }, []);

  const finalizeRound = useCallback(
    ({ correct, total }) => {
      if (total <= 0 || roundSpentPoints <= 0) {
        setRoundSpentPoints(0);
        return;
      }
      const ratio = Math.max(0, Math.min(1, correct / total));
      const refund = Math.round(roundSpentPoints * ratio);
      if (refund <= 0) {
        setRoundSpentPoints(0);
        return;
      }
      // Limit action points to BASE_ACTION_POINTS, save excess for next story
      setActionPoints((prev) => {
        const newTotal = prev + refund;
        const capped = Math.min(BASE_ACTION_POINTS, newTotal);
        const excess = newTotal - capped;
        
        // Save final action points (capped) for next story
        // If there's excess, save it separately to add to next story's AP
        const progress = getProgress();
        progress.savedActionPoints = capped;
        if (excess > 0) {
          // Store excess separately, will be added when starting next story
          progress.savedExcessAP = (progress.savedExcessAP || 0) + excess;
        }
        saveProgress(progress);
        
        return capped;
      });
      setRoundSpentPoints(0);
    },
    [roundSpentPoints]
  );

  const advanceStory = useCallback(() => {
    if (!stories.length) return;
    const nextIndex = currentStoryIndexRef.current + 1;
    
    // Check if next story exists and is unlocked
    if (nextIndex >= stories.length) {
      setError(new Error('No more stories available.'));
      return;
    }
    
    if (!isStoryUnlocked(nextIndex)) {
      setError(new Error('Story not unlocked yet. Complete the current story first.'));
      return;
    }
    
    // Save current action points before advancing (inherit to next story)
    const currentAP = actionPoints;
    // Always save current AP, even if less than BASE_ACTION_POINTS
    completeStory(currentStoryIndexRef.current, currentAP);
    
    // Update unlocked stories
    const progress = getProgress();
    setUnlockedStories(progress.unlockedStories);
    
    initializeCase({ storyIndex: nextIndex, difficulty, useSavedAP: true });
  }, [stories.length, difficulty, initializeCase, actionPoints]);
  
  const completeCurrentStory = useCallback((quizScore = null) => {
    const storyIndex = currentStoryIndexRef.current;
    // Action points are already saved in finalizeRound, just mark story as completed
    const savedAP = getSavedActionPoints();
    completeStory(storyIndex, savedAP > 0 ? savedAP : actionPoints, quizScore);
    const progress = getProgress();
    setUnlockedStories(progress.unlockedStories);
  }, [actionPoints]);

  const computedSolution = useMemo(() => composeSolution(caseData?.solution), [caseData]);

  const isCurrentStoryUnlocked = useMemo(() => {
    return isStoryUnlocked(currentStoryIndex);
  }, [currentStoryIndex]);
  
  const isNextStoryUnlocked = useMemo(() => {
    const nextIndex = currentStoryIndex + 1;
    return nextIndex < stories.length && isStoryUnlocked(nextIndex);
  }, [currentStoryIndex, stories.length, unlockedStories]);

  return {
    caseData,
    statement,
    store,
    purchasedClues,
    difficulty,
    loading: status === 'loading' || status === 'idle',
    error,
    solutionRevealed,
    solution: computedSolution,
    actionPoints,
    initialActionPoints: BASE_ACTION_POINTS,
    nextAbilityCost,
    roundSpentPoints,
    currentStoryIndex,
    totalStories: stories.length,
    unlockedStories,
    isCurrentStoryUnlocked,
    isNextStoryUnlocked,
    initializeCase,
    purchaseClue,
    resetCase,
    revealSolution,
    finalizeRound,
    advanceStory,
    completeCurrentStory,
    setDifficulty
  };
}
