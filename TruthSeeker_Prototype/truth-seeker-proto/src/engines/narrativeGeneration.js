export function buildRichDescription({ victim, suspects, variables }) {
  const suspectNames = suspects.map((suspect) => suspect.name).join(', ');
  const intro = `${victim.name}, the ${victim.role.toLowerCase()}, was found in the ${variables.location} shortly after a facility-wide blackout.`;
  const cast = `The primary staff on duty were ${suspectNames}. Each held fragments of access and motive that could weaponize the outage.`;
  const tone = `Outside, the weather was ${variables.weather.toLowerCase()}, while the control room clock froze at ${variables.localTime}.`;

  return `${intro} ${cast} ${tone}`;
}
