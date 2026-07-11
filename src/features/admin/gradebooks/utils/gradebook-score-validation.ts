import type { ParticipationState } from '@/types/gradebook';

export function parseScoreInput(
  raw: string,
  maxScore: number,
): { valid: true; score: number; scoreIsSet: true } | { valid: false; reason: 'empty' | 'invalid' | 'negative' | 'over_max' } {
  const trimmed = raw.trim();
  if (!trimmed) return { valid: false, reason: 'empty' };
  const normalized = trimmed.replace(',', '.');
  const value = Number(normalized);
  if (!Number.isFinite(value)) return { valid: false, reason: 'invalid' };
  if (value < 0) return { valid: false, reason: 'negative' };
  if (value > maxScore) return { valid: false, reason: 'over_max' };
  return { valid: true, score: value, scoreIsSet: true };
}

export function formatScoreDisplay(
  score: number | null,
  scoreIsSet: boolean,
  participationState: ParticipationState,
): string {
  if (participationState !== 'taken' && participationState !== 'not_entered') return '';
  if (!scoreIsSet) return '';
  if (score === null) return '';
  return String(score);
}

export function scoreValidationMessageKey(
  reason: 'invalid' | 'negative' | 'over_max',
): string {
  if (reason === 'negative') return 'admin.gradebooks.validation.negative';
  if (reason === 'over_max') return 'admin.gradebooks.validation.overMax';
  return 'admin.gradebooks.validation.invalid';
}
