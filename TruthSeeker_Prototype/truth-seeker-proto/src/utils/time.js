const MINUTES_IN_HOUR = 60;

export function minutesAdd(baseMinutes, offset) {
  return baseMinutes + offset;
}

export function humanWindow(startMinutes, durationMinutes) {
  const start = toClock(startMinutes);
  const end = toClock(startMinutes + durationMinutes);
  return `${start} - ${end}`;
}

function toClock(totalMinutes) {
  const hours = Math.floor(totalMinutes / MINUTES_IN_HOUR);
  const minutes = totalMinutes % MINUTES_IN_HOUR;
  const normalizedHours = ((hours % 24) + 24) % 24;
  return `${normalizedHours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}`;
}
