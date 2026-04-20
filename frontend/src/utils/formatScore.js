export function formatScore(score) {
  if (score === undefined || score === null) return '0%';
  return `${Math.round(score * 100)}%`;
}

export function getScoreColor(score) {
  if (score >= 0.8) return 'bg-green-500';
  if (score >= 0.5) return 'bg-yellow-500';
  return 'bg-red-400';
}