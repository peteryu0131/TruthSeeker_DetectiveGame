import PropTypes from 'prop-types';

export default function QuizPanel({ questions, answers, revealed, score, onAnswer, onReveal }) {
  if (!questions.length) {
    return (
      <section className="quiz-panel">
        <h3>Quiz</h3>
        <p>No quiz questions available for this difficulty.</p>
      </section>
    );
  }

  return (
    <section className="quiz-panel">
      <header className="quiz-panel__header">
        <h3>Quiz</h3>
        <button type="button" className="button button--ghost" onClick={onReveal} disabled={revealed}>
          {revealed ? 'Results Revealed' : 'Reveal Results'}
        </button>
      </header>
      <ol className="quiz-panel__list">
        {questions.map((question) => (
          <li key={question.id}>
            <h4>{question.question}</h4>
            <div className="quiz-panel__options">
              {question.options.map((option, optionIndex) => {
                const selected = answers[question.id] === option;
                const isCorrect = revealed && option === question.answer;
                const isWrongSelection = revealed && selected && option !== question.answer;
                const optionClass = selected
                  ? 'quiz-panel__option quiz-panel__option--selected'
                  : 'quiz-panel__option';
                const resolvedClass = isCorrect
                  ? `${optionClass} quiz-panel__option--correct`
                  : isWrongSelection
                  ? `${optionClass} quiz-panel__option--incorrect`
                  : optionClass;

                return (
                  <button
                    key={`${question.id}-option-${optionIndex}`}
                    type="button"
                    className={resolvedClass}
                    onClick={() => onAnswer(question.id, option)}
                    disabled={revealed}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {revealed && (
              <p className="quiz-panel__explanation">{question.explanation}</p>
            )}
          </li>
        ))}
      </ol>
      {revealed && score && (
        <footer className="quiz-panel__footer">
          <strong>
            Score: {score.correct}/{score.total}
          </strong>
        </footer>
      )}
    </section>
  );
}

QuizPanel.propTypes = {
  questions: PropTypes.array.isRequired,
  answers: PropTypes.object.isRequired,
  revealed: PropTypes.bool.isRequired,
  score: PropTypes.shape({
    correct: PropTypes.number,
    total: PropTypes.number
  }),
  onAnswer: PropTypes.func.isRequired,
  onReveal: PropTypes.func.isRequired
};
