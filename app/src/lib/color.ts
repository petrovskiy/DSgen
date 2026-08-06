import { wcagContrast, wcagLuminance } from 'culori';

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return '#' + to(r) + to(g) + to(b);
}

export function lum(hex: string): number {
  return wcagLuminance(hex);
}

export function contrast(a: string, b: string): number {
  return wcagContrast(a, b);
}

export function isDark(hex: string): boolean {
  return lum(hex) < 0.4;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rf: h = (gf - bf) / d + (gf < bf ? 6 : 0); break;
      case gf: h = (bf - rf) / d + 2; break;
      default: h = (rf - gf) / d + 4;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const to = (v: number) => clamp(Math.round((v + m) * 255), 0, 255).toString(16).padStart(2, '0');
  return '#' + to(r) + to(g) + to(b);
}

export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(
    A.r + (B.r - A.r) * t,
    A.g + (B.g - A.g) * t,
    A.b + (B.b - A.b) * t
  );
}

export function ensureContrast(color: string, bg: string, minRatio: number): string {
  if (contrast(color, bg) >= minRatio) return color;
  const dk = isDark(bg);
  const hsl = hexToHsl(color);
  const h = hsl.h, s = hsl.s;
  let l = hsl.l;
  const step = dk ? 2 : -2;
  for (let i = 0; i < 60; i++) {
    l = clamp(l + step, 0, 100);
    const c = hslToHex(h, s, l);
    if (contrast(c, bg) >= minRatio) return c;
  }
  return dk ? '#ffffff' : '#000000';
}

export function chromaScore(r: number, g: number, b: number): number {
  return Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);
}

interface AnalyzedColor {
  hex: string;
  hsl: { h: number; s: number; l: number };
  rgb: { r: number; g: number; b: number };
  luminance: number;
  hue: number;
  chroma: number;
  isNeutral: boolean;
  index: number;
}

export interface ColorSystem {
  mode: 'light' | 'dark';
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  semantic: { success: string; warning: string; error: string; info: string };
}

export function analyzePalette(colors: string[]): ColorSystem {
  const analyzed: AnalyzedColor[] = colors.map((hex, i) => {
    const hsl = hexToHsl(hex);
    const rgb = hexToRgb(hex);
    const l = lum(hex);
    const cs = chromaScore(rgb.r, rgb.g, rgb.b);
    return {
      hex, hsl, luminance: l, hue: hsl.h,
      chroma: cs, rgb, isNeutral: cs < 60, index: i
    };
  });

  const veryLight = analyzed.filter(c => c.luminance > 0.8).length;
  const veryDark = analyzed.filter(c => c.luminance < 0.08).length;
  const avgLum = analyzed.reduce((s, c) => s + c.luminance, 0) / analyzed.length;

  let mode: 'light' | 'dark';
  if (veryDark >= 3) mode = 'dark';
  else if (veryLight >= 3) mode = 'light';
  else if (isDark(colors[0]) && veryDark >= 2 && veryLight <= 1) mode = 'dark';
  else if (!isDark(colors[0]) && veryLight >= 2 && veryDark <= 1) mode = 'light';
  else if (avgLum < 0.3) mode = 'dark';
  else if (avgLum > 0.5) mode = 'light';
  else mode = isDark(colors[0]) ? 'dark' : 'light';

  const neutrals = analyzed.filter(c => c.isNeutral).sort((a, b) => b.luminance - a.luminance);
  const chromatics = analyzed.filter(c => !c.isNeutral).sort((a, b) => b.chroma - a.chroma);
  const allAsc = [...analyzed].sort((a, b) => a.luminance - b.luminance);
  const allDesc = [...analyzed].sort((a, b) => b.luminance - a.luminance);

  let bg: string, surface: string, surfaceElevated: string, border: string, borderSubtle: string;
  let textPrimary: string, textSecondary: string, textMuted: string;
  let accent: string, accentHover: string, accentSoft: string;

  if (mode === 'dark') {
    bg = allAsc[0].hex;
    const darkCands = allAsc.filter(c => c.hex !== bg && c.luminance < 0.35);
    surface = darkCands[0]?.hex || mix(bg, '#ffffff', 0.08);
    surfaceElevated = darkCands[1]?.hex || mix(surface, '#ffffff', 0.08);

    const brightSorted = allDesc.filter(c => c.luminance > 0.25);
    const brightNeutrals = brightSorted.filter(c => c.isNeutral);
    if (brightNeutrals.length >= 1) {
      textPrimary = ensureContrast(brightNeutrals[0].hex, bg, 4.5);
      textSecondary = brightNeutrals[1]?.hex || ensureContrast(mix(textPrimary, bg, 0.35), bg, 3);
      textMuted = brightNeutrals[2]?.hex || ensureContrast(mix(textSecondary, bg, 0.4), bg, 3);
    } else if (brightSorted.length >= 1) {
      textPrimary = ensureContrast(brightSorted[0].hex, bg, 4.5);
      textSecondary = brightSorted[1]?.hex || ensureContrast(mix(textPrimary, bg, 0.35), bg, 3);
      textMuted = brightSorted[2]?.hex || ensureContrast(mix(textSecondary, bg, 0.4), bg, 3);
    } else {
      textPrimary = ensureContrast(allDesc[0].hex, bg, 4.5);
      textSecondary = ensureContrast(mix(textPrimary, bg, 0.35), bg, 3);
      textMuted = ensureContrast(mix(textSecondary, bg, 0.4), bg, 3);
    }

    border = mix(bg, textPrimary, 0.2);
    borderSubtle = mix(bg, textPrimary, 0.1);

    if (chromatics.length > 0) {
      const brightChroma = chromatics.filter(c => c.luminance > 0.25);
      accent = brightChroma[0]?.hex || chromatics[0].hex;
      accent = ensureContrast(accent, bg, 3);
      const ah = hexToHsl(accent);
      accentHover = hslToHex(ah.h, Math.min(100, ah.s + 10), Math.min(100, ah.l + 12));
      accentSoft = mix(accent, bg, 0.75);
    } else {
      const len = allAsc.length;
      const midIdx = Math.floor(len / 2);
      accent = allAsc[midIdx]?.hex !== bg ? allAsc[midIdx]?.hex : (allAsc[midIdx + 1]?.hex || mix(bg, textPrimary, 0.35));
      accent = ensureContrast(accent, bg, 3);
      const ah = hexToHsl(accent);
      accentHover = hslToHex(ah.h, Math.min(100, ah.s + 5), Math.min(100, ah.l + 10));
      accentSoft = mix(accent, bg, 0.65);
    }
  } else {
    const lightNeutrals = neutrals.filter(c => c.luminance > 0.5);
    bg = lightNeutrals[0]?.hex || allDesc[0].hex;
    surface = lightNeutrals[1]?.hex || allDesc.find(c => c.hex !== bg && c.luminance > 0.5)?.hex || allDesc[1]?.hex || mix(bg, '#000', 0.03);
    surfaceElevated = lightNeutrals[2]?.hex || mix(surface, '#ffffff', 0.5);

    const darkCands = allAsc.filter(c => c.hex !== bg && c.luminance < 0.5);
    const darkNeutrals = darkCands.filter(c => c.isNeutral).sort((a, b) => a.luminance - b.luminance);
    const darkAll = darkCands.filter(c => c.luminance < 0.3).sort((a, b) => a.luminance - b.luminance);

    if (darkNeutrals.length >= 1) {
      textPrimary = ensureContrast(darkNeutrals[0].hex, bg, 4.5);
      textSecondary = darkNeutrals[1]?.hex || ensureContrast(mix(textPrimary, bg, 0.4), bg, 3);
      textMuted = darkNeutrals[2]?.hex || ensureContrast(mix(textSecondary, bg, 0.5), bg, 3);
    } else if (darkAll.length >= 1) {
      textPrimary = ensureContrast(darkAll[0].hex, bg, 4.5);
      textSecondary = darkAll[1]?.hex || ensureContrast(mix(textPrimary, bg, 0.4), bg, 3);
      textMuted = darkAll[2]?.hex || ensureContrast(mix(textSecondary, bg, 0.5), bg, 3);
    } else {
      textPrimary = ensureContrast(allAsc[allAsc.length - 1].hex, bg, 4.5);
      textSecondary = ensureContrast(mix(textPrimary, bg, 0.4), bg, 3);
      textMuted = ensureContrast(mix(textSecondary, bg, 0.5), bg, 3);
    }

    border = mix(bg, textPrimary, 0.12);
    borderSubtle = mix(bg, textPrimary, 0.06);

    if (chromatics.length > 0) {
      const vividChroma = [...chromatics].sort((a, b) => b.chroma - a.chroma);
      accent = vividChroma[0].hex;
      if (lum(accent) > 0.6) {
        const ah = hexToHsl(accent);
        accent = hslToHex(ah.h, Math.min(100, ah.s + 10), Math.max(10, ah.l - 25));
      }
      accent = ensureContrast(accent, bg, 3);
      const ah = hexToHsl(accent);
      accentHover = hslToHex(ah.h, Math.min(100, ah.s + 5), Math.max(5, ah.l - 10));
      accentSoft = mix(accent, bg, 0.85);
    } else {
      const len = allAsc.length;
      const midIdx = Math.floor(len / 2);
      accent = allAsc[midIdx]?.hex !== bg ? allAsc[midIdx]?.hex : (allAsc[midIdx + 1]?.hex || mix(bg, textPrimary, 0.3));
      accent = ensureContrast(accent, bg, 3);
      const ah = hexToHsl(accent);
      accentHover = hslToHex(ah.h, Math.min(100, ah.s + 5), Math.max(5, ah.l - 8));
      accentSoft = mix(accent, bg, 0.6);
    }
  }

  return {
    mode, background: bg, surface, surfaceElevated, border, borderSubtle,
    textPrimary, textSecondary, textMuted, accent, accentHover, accentSoft,
    semantic: {
      success: mode === 'dark' ? mix('#4ADE80', '#000000', 0.3) : '#3F6212',
      warning: mode === 'dark' ? mix('#FBBF24', '#000000', 0.3) : '#92400E',
      error: mode === 'dark' ? mix('#F87171', '#000000', 0.3) : '#9A3412',
      info: mode === 'dark' ? mix('#60A5FA', '#000000', 0.3) : '#1E40AF'
    }
  };
}

export function generateAltTheme(cs: ColorSystem): ColorSystem {
  const isLight = cs.mode === 'light';
  let bg: string, surface: string, surfaceElevated: string, border: string, borderSubtle: string;
  let textPrimary: string, textSecondary: string, textMuted: string;
  let accent: string, accentHover: string, accentSoft: string;
  let sem: { success: string; warning: string; error: string; info: string };

  if (isLight) {
    // Light → Dark
    const bgRgb = hexToRgb(cs.background);
    const dr = bgRgb.r < 250 ? -1 : 0, dg = bgRgb.g < 250 ? -1 : 0, db = bgRgb.b < 250 ? -1 : 0;
    const bias = { r: bgRgb.r + dr * 4, g: bgRgb.g + dg * 4, b: bgRgb.b + db * 4 };
    bg = rgbToHex(clamp(bias.r - 236, 6, 16), clamp(bias.g - 236, 6, 16), clamp(bias.b - 236, 8, 20));
    surface = rgbToHex(clamp(bias.r - 220, 12, 24), clamp(bias.g - 220, 12, 24), clamp(bias.b - 220, 14, 28));
    surfaceElevated = rgbToHex(clamp(bias.r - 202, 18, 34), clamp(bias.g - 202, 18, 34), clamp(bias.b - 202, 20, 36));
    border = mix(bg, '#ffffff', 0.1);
    borderSubtle = mix(bg, '#ffffff', 0.05);
    textPrimary = mix(cs.textPrimary, '#ffffff', 0.92);
    textSecondary = mix(textPrimary, bg, 0.35);
    textMuted = mix(textPrimary, bg, 0.58);
    const accH = hexToHsl(cs.accent);
    accent = hslToHex(accH.h, Math.min(100, accH.s + 5), Math.max(38, Math.min(72, accH.l + 15)));
    accentHover = hslToHex(accH.h, Math.min(100, accH.s + 8), Math.min(88, accH.l + 25));
    accentSoft = mix(accent, bg, 0.82);
    sem = {
      success: mix('#4ADE80', bg, 0.28),
      warning: mix('#FBBF24', bg, 0.28),
      error: mix('#F87171', bg, 0.28),
      info: mix('#60A5FA', bg, 0.28)
    };
  } else {
    // Dark → Light
    const bgRgb = hexToRgb(cs.background);
    const dr = bgRgb.r + 240, dg = bgRgb.g + 240, db = bgRgb.b + 240;
    bg = rgbToHex(clamp(dr, 248, 255), clamp(dg, 248, 255), clamp(db, 248, 255));
    surface = rgbToHex(clamp(dr - 8, 240, 250), clamp(dg - 8, 240, 250), clamp(db - 8, 240, 250));
    surfaceElevated = '#ffffff';
    border = mix(bg, '#000000', 0.1);
    borderSubtle = mix(bg, border, 0.4);
    textPrimary = mix(cs.textPrimary, '#000000', 0.88);
    if (lum(textPrimary) > 0.12) textPrimary = mix(textPrimary, '#000000', 0.7);
    textSecondary = mix(textPrimary, bg, 0.38);
    textMuted = mix(textPrimary, bg, 0.58);
    const accH = hexToHsl(cs.accent);
    accent = hslToHex(accH.h, Math.min(100, accH.s + 5), Math.max(22, Math.min(55, accH.l - 8)));
    accentHover = hslToHex(accH.h, Math.min(100, accH.s + 5), Math.max(14, Math.min(45, accH.l - 16)));
    accentSoft = mix(accent, bg, 0.88);
    sem = {
      success: '#3F6212',
      warning: '#92400E',
      error: '#9A3412',
      info: '#1E40AF'
    };
  }

  textPrimary = ensureContrast(textPrimary, bg, 4.5);
  textSecondary = ensureContrast(textSecondary, bg, 3.0);
  textMuted = ensureContrast(textMuted, bg, 3.0);

  return {
    mode: isLight ? 'dark' : 'light',
    background: bg, surface, surfaceElevated, border, borderSubtle,
    textPrimary, textSecondary, textMuted, accent, accentHover, accentSoft,
    semantic: sem
  };
}
