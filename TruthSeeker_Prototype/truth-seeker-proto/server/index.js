import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateCase } from '../src/engines/caseGenerator.js';
import { buildStatement, mergePurchasedClue } from '../src/engines/statementEngine.js';
import { composeSolution } from '../src/engines/solutionComposer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load pools directly since we're in Node.js environment
function loadPools() {
  const poolsPath = join(__dirname, '../public/pools.json');
  const data = readFileSync(poolsPath, 'utf-8');
  return JSON.parse(data);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Constants
const BASE_ACTION_POINTS = 100;
const ACTION_POINT_STEP = 10;
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

// In-memory session storage (replace with Redis in production)
const sessions = new Map();

// Load story pools on startup
let storyPools = null;
try {
  storyPools = loadPools();
  console.log(`Loaded ${storyPools.stories?.length || 0} stories`);
} catch (err) {
  console.error('Failed to load story pools:', err);
  process.exit(1);
}

// Helper: Generate session ID
function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Helper: Get or create session
function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }
  session.lastAccessed = Date.now();
  return session;
}

// Helper: Cleanup expired sessions
function cleanupSessions() {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastAccessed > SESSION_TIMEOUT) {
      sessions.delete(sessionId);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupSessions, 60 * 60 * 1000);

// Helper: Calculate quiz score
function calculateQuizScore(questions, answers) {
  const total = questions.length;
  if (total === 0) return { correct: 0, total: 0 };
  const correct = questions.filter((q) => answers[q.id] === q.answer).length;
  return { correct, total };
}

// API Routes

// GET /api/stories - Get available stories
app.get('/api/stories', (req, res) => {
  if (!storyPools?.stories) {
    return res.status(503).json({ error: 'Stories not loaded', code: 'STORIES_NOT_LOADED' });
  }

  const stories = storyPools.stories.map((story) => ({
    id: story.id,
    title: story.title,
    tags: story.tags || [],
    metadata: story.metadata || {}
  }));

  res.json({ stories });
});

// POST /api/cases - Create new case
app.post('/api/cases', (req, res) => {
  if (!storyPools?.stories) {
    return res.status(503).json({ error: 'Stories not loaded', code: 'STORIES_NOT_LOADED' });
  }

  const { storyIndex = 0, difficulty = 'medium', seed } = req.body;

  if (storyIndex < 0 || storyIndex >= storyPools.stories.length) {
    return res.status(400).json({ error: 'Invalid story index', code: 'INVALID_STORY_INDEX' });
  }

  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    return res.status(400).json({ error: 'Invalid difficulty', code: 'INVALID_DIFFICULTY' });
  }

  try {
    const generated = generateCase(storyPools.stories, storyIndex, difficulty, seed);
    const decoratedStore = (generated.storeClues || []).map((entry) => ({
      ...entry,
      purchased: false
    }));
    const freshStatement = buildStatement(generated, []);

    const sessionId = generateSessionId();
    const session = {
      sessionId,
      caseData: generated,
      store: decoratedStore,
      purchasedClues: [],
      statement: freshStatement,
      actionPoints: BASE_ACTION_POINTS,
      roundSpentPoints: 0,
      quizAnswers: {},
      quizRevealed: false,
      solutionRevealed: false,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      // Track initial AP for each story (for reset functionality)
      storyInitialAP: {}
    };
    // Save initial AP for story 0
    session.storyInitialAP[storyIndex] = BASE_ACTION_POINTS;

    sessions.set(sessionId, session);

    const purchasedCount = 0;
    const nextAbilityCost = (purchasedCount + 1) * ACTION_POINT_STEP;

    res.status(201).json({
      sessionId,
      case: {
        seed: generated.seed,
        storyId: generated.storyId,
        storyTitle: generated.storyTitle,
        difficulty: generated.difficulty,
        narrative: generated.narrative,
        victim: generated.victim,
        location: generated.location,
        timeWindow: generated.timeWindow,
        suspects: generated.suspects,
        initialClues: generated.initialClues,
        statementEntries: generated.statementEntries
      },
      store: decoratedStore,
      actionPoints: BASE_ACTION_POINTS,
      nextAbilityCost
    });
  } catch (error) {
    console.error('Error generating case:', error);
    res.status(500).json({ error: 'Failed to generate case', code: 'GENERATION_ERROR', details: error.message });
  }
});

// GET /api/cases/:sessionId - Get case state
app.get('/api/cases/:sessionId', (req, res) => {
  try {
    const session = getSession(req.params.sessionId);
    const purchasedCount = session.purchasedClues.length;
    const nextAbilityCost = (purchasedCount + 1) * ACTION_POINT_STEP;

    res.json({
      case: {
        seed: session.caseData.seed,
        storyId: session.caseData.storyId,
        storyTitle: session.caseData.storyTitle,
        difficulty: session.caseData.difficulty,
        narrative: session.caseData.narrative,
        victim: session.caseData.victim,
        location: session.caseData.location,
        timeWindow: session.caseData.timeWindow,
        suspects: session.caseData.suspects,
        initialClues: session.caseData.initialClues,
        statementEntries: session.caseData.statementEntries
      },
      store: session.store,
      purchasedClues: session.purchasedClues,
      actionPoints: session.actionPoints,
      nextAbilityCost,
      statement: session.statement
    });
  } catch (error) {
    if (error.message === 'SESSION_NOT_FOUND') {
      return res.status(404).json({ error: 'Session not found', code: 'SESSION_NOT_FOUND' });
    }
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// POST /api/cases/:sessionId/reset - Reset case
app.post('/api/cases/:sessionId/reset', (req, res) => {
  try {
    const session = getSession(req.params.sessionId);
    const { difficulty = session.caseData.difficulty, seed } = req.body;
    const storyIndex = session.caseData.storyIndex || 0;

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty', code: 'INVALID_DIFFICULTY' });
    }

    const generated = generateCase(storyPools.stories, storyIndex, difficulty, seed);
    const decoratedStore = (generated.storeClues || []).map((entry) => ({
      ...entry,
      purchased: false
    }));
    const freshStatement = buildStatement(generated, []);

    // Determine reset AP based on story index:
    // - Story 0 (first story): reset to BASE_ACTION_POINTS (100)
    // - Story 1+: reset to the initial AP when entering that story
    let resetActionPoints;
    if (storyIndex === 0) {
      // Story 1: always reset to 100
      resetActionPoints = BASE_ACTION_POINTS;
    } else {
      // Story 2+: reset to the initial AP when entering this story
      // Initialize storyInitialAP if it doesn't exist
      if (!session.storyInitialAP) {
        session.storyInitialAP = {};
      }
      // If we have saved initial AP for this story, use it; otherwise use current AP
      resetActionPoints = session.storyInitialAP[storyIndex] ?? session.actionPoints;
    }

    session.caseData = generated;
    session.store = decoratedStore;
    session.purchasedClues = [];
    session.statement = freshStatement;
    session.actionPoints = resetActionPoints;
    session.roundSpentPoints = 0;
    session.quizAnswers = {};
    session.quizRevealed = false;
    session.solutionRevealed = false;

    const purchasedCount = 0;
    const nextAbilityCost = (purchasedCount + 1) * ACTION_POINT_STEP;

    res.json({
      case: {
        seed: generated.seed,
        storyId: generated.storyId,
        storyTitle: generated.storyTitle,
        difficulty: generated.difficulty,
        narrative: generated.narrative
      },
      store: decoratedStore,
      actionPoints: resetActionPoints,
      nextAbilityCost
    });
  } catch (error) {
    if (error.message === 'SESSION_NOT_FOUND') {
      return res.status(404).json({ error: 'Session not found', code: 'SESSION_NOT_FOUND' });
    }
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

 app.post('/api/cases/:sessionId/advance', (req, res) => {
  try {
    const session = getSession(req.params.sessionId);
    const currentIndex = session.caseData.storyIndex || 0;
    const nextIndex = (currentIndex + 1) % storyPools.stories.length;

    const generated = generateCase(storyPools.stories, nextIndex, session.caseData.difficulty);
    const decoratedStore = (generated.storeClues || []).map((entry) => ({
      ...entry,
      purchased: false
    }));
    const freshStatement = buildStatement(generated, []);

    // Preserve current action points instead of resetting to BASE_ACTION_POINTS
    // This allows AP to accumulate across stories
    const preservedActionPoints = session.actionPoints;

    // Initialize storyInitialAP if it doesn't exist
    if (!session.storyInitialAP) {
      session.storyInitialAP = {};
    }

    session.caseData = generated;
    session.store = decoratedStore;
    session.purchasedClues = [];
    session.statement = freshStatement;
    // Keep current AP, don't reset to BASE_ACTION_POINTS
    // session.actionPoints remains unchanged
    // Save the initial AP for this new story (for reset functionality)
    session.storyInitialAP[nextIndex] = preservedActionPoints;
    session.roundSpentPoints = 0;
    session.quizAnswers = {};
    session.quizRevealed = false;
    session.solutionRevealed = false;

    const purchasedCount = 0;
    const nextAbilityCost = (purchasedCount + 1) * ACTION_POINT_STEP;

    res.json({
      sessionId: session.sessionId,
      case: {
        seed: generated.seed,
        storyId: generated.storyId,
        storyTitle: generated.storyTitle,
        difficulty: generated.difficulty,
        narrative: generated.narrative
      },
      store: decoratedStore,
      actionPoints: preservedActionPoints,
      nextAbilityCost
    });
  } catch (error) {
    if (error.message === 'SESSION_NOT_FOUND') {
      return res.status(404).json({ error: 'Session not found', code: 'SESSION_NOT_FOUND' });
    }
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// POST /api/cases/:sessionId/clues/purchase - Purchase clue
app.post('/api/cases/:sessionId/clues/purchase', (req, res) => {
  try {
    const session = getSession(req.params.sessionId);
    const { clueId } = req.body;

    if (!clueId) {
      return res.status(400).json({ error: 'Clue ID required', code: 'MISSING_CLUE_ID' });
    }

    const target = session.store.find((entry) => entry.clue.id === clueId);
    if (!target) {
      return res.status(404).json({ error: 'Clue not found in store', code: 'CLUE_NOT_FOUND' });
    }

    if (target.purchased) {
      return res.status(409).json({ error: 'Clue already purchased', code: 'CLUE_ALREADY_PURCHASED' });
    }

    const previousPurchases = session.purchasedClues.length;
    const cost = (previousPurchases + 1) * ACTION_POINT_STEP;

    if (session.actionPoints < cost) {
      return res.status(400).json({
        error: 'Insufficient action points',
        code: 'INSUFFICIENT_POINTS',
        required: cost,
        current: session.actionPoints
      });
    }

    target.purchased = true;
    target.spentCost = cost;
    session.purchasedClues.push(target.clue);
    session.statement = mergePurchasedClue(session.statement, target.clue);
    session.actionPoints = Math.max(0, session.actionPoints - cost);
    session.roundSpentPoints += cost;

    const nextPurchases = session.purchasedClues.length;
    const nextAbilityCost = (nextPurchases + 1) * ACTION_POINT_STEP;

    res.json({
      success: true,
      clue: target.clue,
      actionPoints: session.actionPoints,
      nextAbilityCost,
      spentCost: cost
    });
  } catch (error) {
    if (error.message === 'SESSION_NOT_FOUND') {
      return res.status(404).json({ error: 'Session not found', code: 'SESSION_NOT_FOUND' });
    }
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// GET /api/cases/:sessionId/quiz - Get quiz questions
app.get('/api/cases/:sessionId/quiz', (req, res) => {
  try {
    const session = getSession(req.params.sessionId);
    const questions = session.caseData.quiz || [];

    // Don't send answers to client
    const questionsWithoutAnswers = questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty
    }));

    res.json({ questions: questionsWithoutAnswers });
  } catch (error) {
    if (error.message === 'SESSION_NOT_FOUND') {
      return res.status(404).json({ error: 'Session not found', code: 'SESSION_NOT_FOUND' });
    }
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// POST /api/cases/:sessionId/quiz/finalize - Finalize quiz and calculate refund
app.post('/api/cases/:sessionId/quiz/finalize', (req, res) => {
  try {
    const session = getSession(req.params.sessionId);
    const { answers } = req.body;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Answers required', code: 'MISSING_ANSWERS' });
    }

    if (session.quizRevealed) {
      return res.status(409).json({ error: 'Quiz already finalized', code: 'QUIZ_ALREADY_SUBMITTED' });
    }

    const questions = session.caseData.quiz || [];
    const score = calculateQuizScore(questions, answers);

    // Calculate refund
    let refund = 0;
    if (score.total > 0 && session.roundSpentPoints > 0) {
      const ratio = Math.max(0, Math.min(1, score.correct / score.total));
      refund = Math.round(session.roundSpentPoints * ratio);
    }

    // Calculate final AP: current AP (already has roundSpentPoints deducted) + refund
    // Don't cap at BASE_ACTION_POINTS - allow AP to accumulate across stories
    const finalActionPoints = session.actionPoints + refund;

    // Build results
    const results = questions.map((q) => ({
      questionId: q.id,
      correct: answers[q.id] === q.answer,
      userAnswer: answers[q.id] || null,
      correctAnswer: q.answer
    }));

    session.quizAnswers = answers;
    session.quizRevealed = true;
    session.actionPoints = finalActionPoints;
    const roundSpent = session.roundSpentPoints;
    session.roundSpentPoints = 0;

    res.json({
      score,
      results,
      refund,
      finalActionPoints,
      roundSpentPoints: roundSpent
    });
  } catch (error) {
    if (error.message === 'SESSION_NOT_FOUND') {
      return res.status(404).json({ error: 'Session not found', code: 'SESSION_NOT_FOUND' });
    }
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// GET /api/cases/:sessionId/solution - Get solution
app.get('/api/cases/:sessionId/solution', (req, res) => {
  try {
    const session = getSession(req.params.sessionId);

    if (!session.solutionRevealed) {
      return res.status(403).json({ error: 'Solution not revealed yet', code: 'SOLUTION_NOT_REVEALED' });
    }

    const solution = composeSolution(session.caseData.solution);

    res.json({
      ...solution,
      revealed: true
    });
  } catch (error) {
    if (error.message === 'SESSION_NOT_FOUND') {
      return res.status(404).json({ error: 'Session not found', code: 'SESSION_NOT_FOUND' });
    }
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// POST /api/cases/:sessionId/solution/reveal - Reveal solution
app.post('/api/cases/:sessionId/solution/reveal', (req, res) => {
  try {
    const session = getSession(req.params.sessionId);
    session.solutionRevealed = true;

    const solution = composeSolution(session.caseData.solution);

    res.json({
      success: true,
      solution
    });
  } catch (error) {
    if (error.message === 'SESSION_NOT_FOUND') {
      return res.status(404).json({ error: 'Session not found', code: 'SESSION_NOT_FOUND' });
    }
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// Progress Management (for Unity client and future server-side storage)
// Note: Web version currently uses localStorage, but these endpoints support Unity

// In-memory progress storage (replace with database in production)
const playerProgress = new Map();

// Helper: Get or create player progress
function getPlayerProgress(playerId = 'default') {
  if (!playerProgress.has(playerId)) {
    playerProgress.set(playerId, {
      completedStories: [],
      unlockedStories: [0],
      lastStoryIndex: 0,
      savedActionPoints: 0,
      savedExcessAP: 0,
      storyScores: {}
    });
  }
  return playerProgress.get(playerId);
}

// Helper: Calculate overall stats
function calculateOverallStats(scores) {
  const storyIndices = Object.keys(scores).map(Number);
  if (storyIndices.length === 0) {
    return { totalCorrect: 0, totalQuestions: 0, overallAccuracy: 0, overallErrorRate: 0, completedCount: 0 };
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

// GET /api/progress - Get player progress
app.get('/api/progress', (req, res) => {
  try {
    const playerId = req.query.playerId || 'default';
    const progress = getPlayerProgress(playerId);
    const overallStats = calculateOverallStats(progress.storyScores || {});
    
    // Convert storyScores Dictionary to array for Unity compatibility
    const storyScoresArray = Object.entries(progress.storyScores || {}).map(([key, value]) => ({
      key,
      value
    }));
    
    res.json({
      completedStories: progress.completedStories || [],
      unlockedStories: progress.unlockedStories || [0],
      lastStoryIndex: progress.lastStoryIndex || 0,
      storyScores: storyScoresArray,
      overallStats
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// POST /api/progress - Save/update player progress
app.post('/api/progress', (req, res) => {
  try {
    const playerId = req.body.playerId || 'default';
    const { storyIndex, quizScore, actionPoints } = req.body;
    
    if (typeof storyIndex !== 'number' || storyIndex < 0) {
      return res.status(400).json({ error: 'Invalid story index', code: 'INVALID_STORY_INDEX' });
    }
    
    const progress = getPlayerProgress(playerId);
    
    // Mark story as completed
    if (!progress.completedStories.includes(storyIndex)) {
      progress.completedStories.push(storyIndex);
    }
    
    // Unlock next story
    const nextIndex = storyIndex + 1;
    if (!progress.unlockedStories.includes(nextIndex)) {
      progress.unlockedStories.push(nextIndex);
    }
    
    // Save action points
    if (typeof actionPoints === 'number') {
      progress.savedActionPoints = actionPoints;
    }
    progress.lastStoryIndex = storyIndex;
    
    // Save quiz score
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
    
    playerProgress.set(playerId, progress);
    const overallStats = calculateOverallStats(progress.storyScores || {});
    
    // Convert storyScores Dictionary to array for Unity compatibility
    const storyScoresArray = Object.entries(progress.storyScores || {}).map(([key, value]) => ({
      key,
      value
    }));
    
    res.json({
      success: true,
      progress: {
        completedStories: progress.completedStories,
        unlockedStories: progress.unlockedStories,
        storyScores: storyScoresArray,
        overallStats
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// GET /api/progress/statistics - Get overall statistics
app.get('/api/progress/statistics', (req, res) => {
  try {
    const playerId = req.query.playerId || 'default';
    const progress = getPlayerProgress(playerId);
    const overallStats = calculateOverallStats(progress.storyScores || {});
    
    // Convert storyScores Dictionary to array for Unity compatibility
    const storyScoresArray = Object.entries(progress.storyScores || {}).map(([key, value]) => ({
      key,
      value
    }));
    
    res.json({
      overallStats,
      storyScores: {
        scores: storyScoresArray
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// GET /api/progress/story/:storyIndex - Get score for specific story
app.get('/api/progress/story/:storyIndex', (req, res) => {
  try {
    const playerId = req.query.playerId || 'default';
    const storyIndex = parseInt(req.params.storyIndex, 10);
    
    if (isNaN(storyIndex) || storyIndex < 0) {
      return res.status(400).json({ error: 'Invalid story index', code: 'INVALID_STORY_INDEX' });
    }
    
    const progress = getPlayerProgress(playerId);
    const score = progress.storyScores?.[storyIndex] || null;
    
    if (!score) {
      return res.status(404).json({ error: 'Story score not found', code: 'SCORE_NOT_FOUND' });
    }
    
    res.json({
      storyIndex,
      score
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// POST /api/progress/reset - Reset all progress
app.post('/api/progress/reset', (req, res) => {
  try {
    const playerId = req.body.playerId || 'default';
    
    playerProgress.set(playerId, {
      completedStories: [],
      unlockedStories: [0],
      lastStoryIndex: 0,
      savedActionPoints: 0,
      savedExcessAP: 0,
      storyScores: {}
    });
    
    res.json({
      success: true,
      message: 'Progress reset successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    storiesLoaded: !!storyPools,
    activeSessions: sessions.size
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Truth Seeker API server running on http://localhost:${PORT}`);
  console.log(`API base URL: http://localhost:${PORT}/api`);
});

