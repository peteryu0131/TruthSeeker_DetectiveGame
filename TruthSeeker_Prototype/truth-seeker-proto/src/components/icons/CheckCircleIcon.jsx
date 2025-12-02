import PropTypes from 'prop-types';

export function CheckCircleIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22c5.522 0 10-4.478 10-10S17.522 2 12 2 2 6.478 2 12s4.478 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

CheckCircleIcon.propTypes = {
  className: PropTypes.string
};
