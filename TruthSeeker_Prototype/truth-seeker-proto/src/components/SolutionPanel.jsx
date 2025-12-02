import PropTypes from 'prop-types';
import { CheckCircleIcon } from './icons/CheckCircleIcon.jsx';

const bulletIcon = (
  <span className="solution-panel__dot" aria-hidden="true">
    ●
  </span>
);

export default function SolutionPanel({ solution, revealed, onReveal }) {
  return (
    <section className="solution-panel">
      <header className="solution-panel__header">
        <div className="solution-panel__title">
          <CheckCircleIcon className="solution-panel__icon" />
          <h3>Solution</h3>
        </div>
        <button type="button" className="button button--secondary" onClick={onReveal} disabled={revealed}>
          {revealed ? 'Solution Revealed' : 'Reveal Solution'}
        </button>
      </header>
      {revealed ? (
        <div className="solution-panel__content">
          <p className="solution-panel__summary">{solution.summary}</p>
          <ul className="solution-panel__details">
            {solution.details.map((detail, index) => (
              <li key={index}>
                {bulletIcon}
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="solution-panel__placeholder">Reveal the solution to review the full deduction.</p>
      )}
    </section>
  );
}

SolutionPanel.propTypes = {
  solution: PropTypes.shape({
    summary: PropTypes.string,
    details: PropTypes.arrayOf(PropTypes.string)
  }).isRequired,
  revealed: PropTypes.bool.isRequired,
  onReveal: PropTypes.func.isRequired
};
