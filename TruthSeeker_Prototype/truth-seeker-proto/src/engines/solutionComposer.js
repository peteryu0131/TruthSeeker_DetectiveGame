export function composeSolution(solution = {}) {
  const { summary = '', details = [] } = solution;
  return {
    summary,
    details
  };
}
