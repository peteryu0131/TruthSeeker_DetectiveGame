import { useState } from 'react';
import PropTypes from 'prop-types';

const DIFFICULTIES = ['easy', 'medium', 'hard'];

export default function DifficultySelectionModal({ open, initialDifficulty, onConfirm, onCancel }) {
  const [selectedDifficulty, setSelectedDifficulty] = useState(initialDifficulty ?? 'medium');

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Select Difficulty</h2>
        <p>Choose the baseline puzzle complexity.</p>
        <div className="modal__options">
          {DIFFICULTIES.map((difficulty) => (
            <button
              key={difficulty}
              type="button"
              className={difficulty === selectedDifficulty ? 'modal__option modal__option--active' : 'modal__option'}
              onClick={() => setSelectedDifficulty(difficulty)}
            >
              {difficulty.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="modal__actions">
          <button type="button" onClick={onCancel} className="button button--ghost">
            Cancel
          </button>
          <button type="button" onClick={() => onConfirm(selectedDifficulty)} className="button button--primary">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

DifficultySelectionModal.propTypes = {
  open: PropTypes.bool,
  initialDifficulty: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};
