import PropTypes from 'prop-types';

export default function StoreCard({ entry, onPurchase, actionPoints, nextCost }) {
  const disabled = entry.purchased || actionPoints < nextCost;
  const displayCost = entry.purchased ? entry.spentCost ?? 0 : nextCost;
  return (
    <div className={`store-card${entry.purchased ? ' store-card--purchased' : ''}`}>
      <header>
        <p className="store-card__category">{entry.category.toUpperCase()}</p>
        <h3>{entry.clue.title}</h3>
      </header>
      <p>{entry.purchased ? entry.clue.text : 'Unlock to reveal detailed insight.'}</p>
      <footer>
        <span className="store-card__price">Cost: {displayCost} AP</span>
        <button type="button" onClick={() => onPurchase(entry.clue.id)} disabled={disabled}>
          {entry.purchased ? 'Unlocked' : actionPoints < nextCost ? 'Insufficient AP' : 'Unlock'}
        </button>
      </footer>
    </div>
  );
}

StoreCard.propTypes = {
  entry: PropTypes.shape({
    category: PropTypes.string.isRequired,
    clue: PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired
    }).isRequired,
    purchased: PropTypes.bool,
    spentCost: PropTypes.number
  }).isRequired,
  onPurchase: PropTypes.func.isRequired,
  actionPoints: PropTypes.number.isRequired,
  nextCost: PropTypes.number.isRequired
};
