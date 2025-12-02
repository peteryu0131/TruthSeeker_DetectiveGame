import PropTypes from 'prop-types';
import StoreCard from './StoreCard.jsx';

export default function StoreGrid({ entries, onPurchase, actionPoints, nextCost }) {
  return (
    <section className="store-grid">
      {entries.map((entry) => (
        <StoreCard
          key={entry.clue.id}
          entry={entry}
          onPurchase={onPurchase}
          actionPoints={actionPoints}
          nextCost={nextCost}
        />
      ))}
    </section>
  );
}

StoreGrid.propTypes = {
  entries: PropTypes.arrayOf(PropTypes.object).isRequired,
  onPurchase: PropTypes.func.isRequired,
  actionPoints: PropTypes.number.isRequired,
  nextCost: PropTypes.number.isRequired
};
