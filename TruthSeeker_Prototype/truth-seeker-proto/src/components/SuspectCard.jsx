import PropTypes from 'prop-types';

export default function SuspectCard({ suspect }) {
  return (
    <article className="suspect-card">
      <header>
        <h3>{suspect.name}</h3>
        <p className="suspect-card__role">{suspect.role}</p>
      </header>
      {suspect.occupation && (
        <section>
          <h4>Occupation</h4>
          <p>{suspect.occupation}</p>
        </section>
      )}
      {(suspect.appearance || suspect.clothing) && (
        <section>
          <h4>Appearance</h4>
          <p>{suspect.appearance || suspect.clothing}</p>
        </section>
      )}
      {suspect.notes && (
        <section>
          <h4>Notes</h4>
          <p>{suspect.notes}</p>
        </section>
      )}
    </article>
  );
}

SuspectCard.propTypes = {
  suspect: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    role: PropTypes.string,
    occupation: PropTypes.string,
    appearance: PropTypes.string,
    clothing: PropTypes.string,
    notes: PropTypes.string
  }).isRequired
};
