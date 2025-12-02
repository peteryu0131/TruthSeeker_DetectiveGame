import PropTypes from 'prop-types';

export default function StatementPanel({ statement }) {
  if (!statement) return null;

  return (
    <section className="statement-panel">
      <article>
        <h3>Initial Clues</h3>
        {statement.initial.map((clue) => (
          <ClueBlock key={clue.id} clue={clue} />
        ))}
      </article>
      <article>
        <h3>Purchased Clues</h3>
        {statement.purchased.length === 0 && <p>No purchased clues yet.</p>}
        {statement.purchased.map((clue) => (
          <ClueBlock key={clue.id} clue={clue} />
        ))}
      </article>
    </section>
  );
}

function ClueBlock({ clue }) {
  return (
    <div className="statement-panel__clue">
      {clue.title && <h4>{clue.title}</h4>}
      <p>{clue.text}</p>
    </div>
  );
}

ClueBlock.propTypes = {
  clue: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    text: PropTypes.string
  }).isRequired
};

StatementPanel.propTypes = {
  statement: PropTypes.shape({
    initial: PropTypes.array,
    purchased: PropTypes.array
  })
};
