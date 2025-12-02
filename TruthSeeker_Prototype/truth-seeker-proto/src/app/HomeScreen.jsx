import PropTypes from 'prop-types';

const DIFFICULTY_LABELS = {
  easy: 'Easy (Full clues, 30% quiz)',
  medium: 'Medium (60% clues, 60% quiz)',
  hard: 'Hard (30% clues, all quiz)'
};

export default function HomeScreen({ onSelectDifficulty, loading, error, canContinue, onContinue }) {
  return (
    <div className="home-screen">
      <div className="home-screen__panel">
        <h1>TruthSeeker</h1>
        <p className="home-screen__blurb">Choose a difficulty to begin your investigation.</p>
        {error && <p className="error">Failed to load data: {error.message}</p>}
        <div className="home-screen__buttons">
          {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="home-screen__difficulty"
              onClick={() => onSelectDifficulty(value)}
              disabled={loading}
            >
              {label}
            </button>
          ))}
        </div>
        {canContinue && (
          <button type="button" className="home-screen__continue" onClick={onContinue} disabled={loading}>
            Continue Current Case
          </button>
        )}
      </div>
    </div>
  );
}

HomeScreen.propTypes = {
  onSelectDifficulty: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.instanceOf(Error),
  canContinue: PropTypes.bool,
  onContinue: PropTypes.func
};
