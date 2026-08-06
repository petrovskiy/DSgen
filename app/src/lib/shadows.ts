import type { ShadowSet } from './types';

export const SHADOWS: Record<string, { subtle: string; medium: string }> = {
  soft: {
    subtle: '0 1px 2px rgba(28,25,23,.06), 0 1px 3px rgba(28,25,23,.05)',
    medium: '0 4px 6px rgba(28,25,23,.08), 0 10px 24px rgba(28,25,23,.07)'
  },
  medium: {
    subtle: '0 2px 4px rgba(28,25,23,.08)',
    medium: '0 8px 16px rgba(28,25,23,.10), 0 16px 40px rgba(28,25,23,.10)'
  },
  strong: {
    subtle: '0 3px 6px rgba(28,25,23,.10)',
    medium: '0 12px 24px rgba(28,25,23,.14), 0 24px 60px rgba(28,25,23,.20)'
  },
  none: { subtle: 'none', medium: 'none' },
  brutal: { subtle: '4px 4px 0 rgba(0,0,0,1)', medium: '5px 5px 0 rgba(0,0,0,1)' },
  glow: { subtle: '0 0 12px rgba(0,0,0,.35)', medium: '0 0 22px rgba(0,0,0,.5)' },
};

export const TYPE_SCALES: Record<string, { title: number; body: number }> = {
  compact: { title: 26, body: 14 },
  standard: { title: 32, body: 15 },
  large: { title: 40, body: 17 },
};

export function buildShadow(shadowName: string, accent: string): ShadowSet {
  const base = SHADOWS[shadowName] || SHADOWS.soft;
  const r = parseInt(accent.slice(1, 3), 16);
  const g = parseInt(accent.slice(3, 5), 16);
  const b = parseInt(accent.slice(5, 7), 16);

  if (shadowName === 'glow') {
    return {
      subtle: `0 0 12px rgba(${r},${g},${b},.35)`,
      medium: `0 0 22px rgba(${r},${g},${b},.5), 0 4px 14px rgba(0,0,0,.5)`,
      focus: `0 0 0 3px rgba(${r},${g},${b},.4)`,
    };
  }
  if (shadowName === 'brutal') {
    return {
      subtle: `4px 4px 0 rgba(${r},${g},${b},1)`,
      medium: `5px 5px 0 rgba(${r},${g},${b},1), 9px 9px 0 rgba(${r},${g},${b},.18)`,
      focus: `0 0 0 3px rgba(${r},${g},${b},.3)`,
    };
  }
  return {
    subtle: base.subtle,
    medium: base.medium,
    focus: `0 0 0 3px rgba(${r},${g},${b},.25)`,
  };
}
