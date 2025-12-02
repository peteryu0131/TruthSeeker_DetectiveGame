import PropTypes from 'prop-types';
import { getProgress, getStoryScore, getOverallStats } from '../services/progress.js';

export default function GameCompleteScreen({ stories, onReset, onHome }) {
  const progress = getProgress();
  const completedCount = progress.completedStories?.length || 0;
  const totalStories = stories?.length || 0;
  const allCompleted = completedCount >= totalStories;
  const overallStats = getOverallStats();

  const completedStories = (progress.completedStories || [])
    .map((index) => {
      const story = stories?.[index];
      const score = getStoryScore(index);
      return {
        index,
        story,
        score
      };
    })
    .filter((item) => item.story);

  return (
    <div className="game-complete-screen">
      <div className="game-complete-screen__content">
        <h1 className="game-complete-screen__title">🎉 Congratulations! 🎉</h1>
        <p className="game-complete-screen__subtitle">You have completed all stories!</p>

        <div className="game-complete-screen__stats">
          <div className="stat-card">
            <div className="stat-card__value">{completedCount}</div>
            <div className="stat-card__label">Stories Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">{overallStats.overallAccuracy}%</div>
            <div className="stat-card__label">Overall Accuracy</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">{overallStats.overallErrorRate}%</div>
            <div className="stat-card__label">Overall Error Rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">
              {overallStats.totalCorrect}/{overallStats.totalQuestions}
            </div>
            <div className="stat-card__label">Total Score</div>
          </div>
        </div>

        {completedStories.length > 0 && (
          <section className="game-complete-screen__stories">
            <h2>Completed Stories</h2>
            <div className="stories-list">
              {completedStories.map(({ index, story, score }) => (
                <div key={index} className="story-summary">
                  <div className="story-summary__header">
                    <span className="story-summary__number">Story {index + 1}</span>
                    <h3 className="story-summary__title">{story.title}</h3>
                  </div>
                  {story.metadata?.blurb && (
                    <p className="story-summary__blurb">{story.metadata.blurb}</p>
                  )}
                  {score && (
                    <div className="story-summary__score">
                      <div className="score-row">
                        <span className="score-label">Accuracy:</span>
                        <span className="score-value score-value--accuracy">{score.accuracy}%</span>
                      </div>
                      <div className="score-row">
                        <span className="score-label">Error Rate:</span>
                        <span className="score-value score-value--error">{score.errorRate}%</span>
                      </div>
                      <div className="score-row">
                        <span className="score-label">Score:</span>
                        <span className="score-value">{score.correct}/{score.total}</span>
                      </div>
                    </div>
                  )}
                  {story.tags && story.tags.length > 0 && (
                    <div className="story-summary__tags">
                      {story.tags
                        .filter((tag) => tag.startsWith('difficulty:'))
                        .map((tag) => (
                          <span key={tag} className="tag tag--difficulty">
                            {tag.replace('difficulty:', '')}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="game-complete-screen__actions">
          <button type="button" onClick={onHome} className="button button--primary">
            Return to Home
          </button>
          <button type="button" onClick={onReset} className="button button--secondary">
            Reset Progress
          </button>
        </div>

        <div className="game-complete-screen__message">
          <p>Thank you for playing Truth Seeker!</p>
          <p>You've solved all the mysteries and proven yourself as a master detective.</p>
        </div>
      </div>
    </div>
  );
}

GameCompleteScreen.propTypes = {
  stories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      metadata: PropTypes.shape({
        blurb: PropTypes.string
      }),
      tags: PropTypes.arrayOf(PropTypes.string)
    })
  ),
  onReset: PropTypes.func.isRequired,
  onHome: PropTypes.func.isRequired
};

