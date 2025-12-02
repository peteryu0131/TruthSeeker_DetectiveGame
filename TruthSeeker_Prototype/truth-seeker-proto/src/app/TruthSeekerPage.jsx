import { useEffect, useMemo, useState } from 'react';
import HomeScreen from './HomeScreen.jsx';
import GameCompleteScreen from '../components/GameCompleteScreen.jsx';
import SuspectCard from '../components/SuspectCard.jsx';
import StatementPanel from '../components/StatementPanel.jsx';
import StoreGrid from '../components/StoreGrid.jsx';
import QuizPanel from '../components/QuizPanel.jsx';
import SolutionPanel from '../components/SolutionPanel.jsx';
import { useCaseEngine } from '../hooks/useCaseEngine.js';
import { useQuiz } from '../hooks/useQuiz.js';
import { loadPools } from '../services/pools.js';
import { areAllStoriesCompleted, resetProgress } from '../services/progress.js';

function computeQuizScore(questions, answers) {
  const total = questions.length;
  if (total === 0) {
    return { correct: 0, total: 0 };
  }
  const correct = questions.filter((question) => answers[question.id] === question.answer).length;
  return { correct, total };
}

export default function TruthSeekerPage() {
  const [pools, setPools] = useState(null);
  const [loadingPools, setLoadingPools] = useState(true);
  const [poolError, setPoolError] = useState(null);
  const [showHome, setShowHome] = useState(true);

  const caseEngine = useCaseEngine({ pools });
  const quiz = useQuiz({ caseData: caseEngine.caseData, difficulty: caseEngine.difficulty });

  useEffect(() => {
    let active = true;
    loadPools()
      .then((loaded) => {
        if (active) {
          setPools(loaded);
          setLoadingPools(false);
        }
      })
      .catch((error) => {
        console.error(error);
        if (active) {
          setPoolError(error);
          setLoadingPools(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const storyMeta = useMemo(
    () => ({
      title: caseEngine.caseData?.storyTitle,
      blurb: caseEngine.caseData?.metadata?.blurb,
      index: caseEngine.currentStoryIndex + 1,
      total: caseEngine.totalStories
    }),
    [caseEngine.caseData, caseEngine.currentStoryIndex, caseEngine.totalStories]
  );

  const handleSelectDifficulty = (difficulty) => {
    caseEngine.setDifficulty(difficulty);
    caseEngine.resetCase({ difficulty, storyIndex: 0 });
    setShowHome(false);
  };

  const handleContinue = () => {
    setShowHome(false);
  };

  const handleHome = () => {
    setShowHome(true);
    // Reset completion check to allow returning to game
    setCompletionCheck((prev) => prev + 1);
  };

  const handleNewCase = () => {
    // Generate a new random seed to ensure different case generation
    const newSeed = Date.now() + Math.floor(Math.random() * 1000000);
    caseEngine.resetCase({ storyIndex: caseEngine.currentStoryIndex, seed: newSeed });
  };

  const handleRevealResults = () => {
    if (quiz.revealed) return;
    const { correct, total } = computeQuizScore(quiz.questions, quiz.answers);
    quiz.revealResults();
    caseEngine.finalizeRound({ correct, total });
    // Mark story as completed when quiz is revealed
    // finalizeRound already saves action points, so we just mark story as complete
    caseEngine.completeCurrentStory({ correct, total });
    // Force re-check of completion status
    setTimeout(() => {
      // This will trigger a re-render and check completion status
      window.dispatchEvent(new Event('storyCompleted'));
    }, 100);
  };

  const handleAdvanceStory = () => {
    caseEngine.advanceStory();
  };

  const handleResetProgress = () => {
    if (window.confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      resetProgress();
      window.location.reload();
    }
  };

  const [completionCheck, setCompletionCheck] = useState(0);

  useEffect(() => {
    const handleStoryCompleted = () => {
      setCompletionCheck((prev) => prev + 1);
    };
    window.addEventListener('storyCompleted', handleStoryCompleted);
    return () => {
      window.removeEventListener('storyCompleted', handleStoryCompleted);
    };
  }, []);

  const allStoriesCompleted = useMemo(() => {
    if (!pools?.stories || caseEngine.totalStories === 0) return false;
    return areAllStoriesCompleted(caseEngine.totalStories);
  }, [pools?.stories, caseEngine.totalStories, caseEngine.unlockedStories, completionCheck]);

  // Show game complete screen if all stories are completed
  // But allow returning to home if user clicks the button
  if (allStoriesCompleted && pools?.stories && !showHome) {
    return (
      <GameCompleteScreen
        stories={pools.stories}
        onReset={handleResetProgress}
        onHome={handleHome}
      />
    );
  }

  if (showHome || !caseEngine.caseData) {
    return (
      <HomeScreen
        onSelectDifficulty={handleSelectDifficulty}
        loading={loadingPools}
        error={poolError}
        canContinue={!!caseEngine.caseData && !caseEngine.loading}
        onContinue={handleContinue}
      />
    );
  }

  const newCaseDisabled = caseEngine.loading || loadingPools;

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Truth Seeker</h1>
          {storyMeta.title && (
            <p className="page__subtitle">
              Story {storyMeta.index}/{storyMeta.total}: {storyMeta.title}
              {caseEngine.unlockedStories && caseEngine.unlockedStories.length > 0 && (
                <span className="page__progress">
                  {' '}(Unlocked: {caseEngine.unlockedStories.length}/{caseEngine.totalStories})
                </span>
              )}
            </p>
          )}
          {storyMeta.blurb && <p className="page__tags">{storyMeta.blurb}</p>}
        </div>
        <div className="page__actions">
          <div className="page__ap">
            <span>Action Points:</span>
            <strong>
              {caseEngine.actionPoints}/{caseEngine.initialActionPoints}
            </strong>
          </div>
          <button type="button" onClick={handleHome} disabled={loadingPools}>
            Home
          </button>
          <button type="button" onClick={handleNewCase} disabled={newCaseDisabled}>
            New Case
          </button>
          <button
            type="button"
            onClick={handleAdvanceStory}
            disabled={newCaseDisabled || !quiz.revealed || !caseEngine.isNextStoryUnlocked || caseEngine.currentStoryIndex >= caseEngine.totalStories - 1}
            title={
              newCaseDisabled
                ? 'Loading...'
                : !quiz.revealed
                  ? 'Complete the quiz and reveal results first'
                  : caseEngine.currentStoryIndex >= caseEngine.totalStories - 1
                    ? 'This is the last story'
                    : !caseEngine.isNextStoryUnlocked
                      ? 'Complete the current story to unlock the next one'
                      : 'Advance to next story'
            }
          >
            Next Story {quiz.revealed && caseEngine.isNextStoryUnlocked && caseEngine.currentStoryIndex < caseEngine.totalStories - 1 ? '✓' : '🔒'}
          </button>
        </div>
      </header>

      {caseEngine.caseData && !caseEngine.loading && (
        <main className="page__grid" key={`case-${caseEngine.caseData.seed}-${caseEngine.caseData.storyId}`}>
          <section className="page__section page__section--wide">
            <h2>Incident Overview</h2>
            <div className="incident-overview__description">
              {(caseEngine.caseData.descriptionBeats ?? []).map((beat) => (
                <p key={beat.id}>{beat.text}</p>
              ))}
            </div>
            {caseEngine.caseData.timeWindow && (
              <p>
                <strong>Incident Window:</strong> {caseEngine.caseData.timeWindow.start} -{' '}
                {caseEngine.caseData.timeWindow.end}
              </p>
            )}
            {caseEngine.caseData.location && (
              <p>
                <strong>Location:</strong> {caseEngine.caseData.location.label}
              </p>
            )}
            {caseEngine.caseData.victim && (
              <p>
                <strong>Victim:</strong> {caseEngine.caseData.victim.name} ({caseEngine.caseData.victim.role})
              </p>
            )}
            <h2>Statement</h2>
            <StatementPanel statement={caseEngine.statement} />
          </section>

          <section className="page__section">
            <h2>Suspects</h2>
            <div className="suspect-grid">
              {(caseEngine.caseData.suspects ?? []).map((suspect) => (
                <SuspectCard key={`${caseEngine.caseData.seed}-${suspect.id}`} suspect={suspect} />
              ))}
            </div>
            <h2>Store</h2>
            <StoreGrid
              entries={caseEngine.store}
              onPurchase={caseEngine.purchaseClue}
              actionPoints={caseEngine.actionPoints}
              nextCost={caseEngine.nextAbilityCost}
            />
          </section>

          <section className="page__section">
            <QuizPanel
              questions={quiz.questions}
              answers={quiz.answers}
              revealed={quiz.revealed}
              score={quiz.score}
              onAnswer={quiz.submitAnswer}
              onReveal={handleRevealResults}
            />
            <SolutionPanel
              solution={caseEngine.solution}
              revealed={caseEngine.solutionRevealed}
              onReveal={caseEngine.revealSolution}
            />
          </section>
        </main>
      )}
    </div>
  );
}
