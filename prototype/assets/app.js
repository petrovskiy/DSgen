/* ==========================================================================
   DSgen — прототип. Логика: навигация, пресеты, генерация палитры по
   цветовому кругу, WCAG-контраст, живое превью, localStorage, экспорт ZIP.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Утилиты ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const keys = (obj) => Object.keys(obj);
  const pickKey = (obj) => pick(keys(obj));

  function hexToRgb(hex) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex({ r, g, b }) {
    const to = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
    return '#' + to(r) + to(g) + to(b);
  }
  function rgbToHsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    const d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h *= 60;
    }
    return { h, s: s * 100, l: l * 100 };
  }
  function hslToRgb({ h, s, l }) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
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
    return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
  }
  function hexToHsl(hex) { return rgbToHsl(hexToRgb(hex)); }
  function hslToHex(h, s, l) { return rgbToHex(hslToRgb({ h, s, l })); }
  function lum(hex) {
    const { r, g, b } = hexToRgb(hex);
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function contrast(a, b) {
    const la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  function wcagLevel(ratio) {
    if (ratio >= 7) return 'AAA';
    if (ratio >= 4.5) return 'AA';
    return null;
  }
  function shade(hex, amt) {
    const u = hexToHsl(hex);
    return hslToHex(u.h, u.s, clamp(u.l + amt, 0, 100));
  }
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex({ r: A.r + (B.r - A.r) * t, g: A.g + (B.g - A.g) * t, b: A.b + (B.b - A.b) * t });
  }
  function safeAccent(hex) {
    let c = hex, i = 0;
    while (contrast('#ffffff', c) < 3 && i < 24) { c = shade(c, -5); i++; }
    return c;
  }
  function normalizeHex(v) {
    const m = String(v).trim().toLowerCase().match(/^#?([0-9a-f]{6})$/);
    return m ? '#' + m[1] : null;
  }

  /* ---------- Стили и варианты пресетов ----------
     У каждого стиля — несколько готовых вариантов (палитра + типографика).
     Варианты собраны по канонам дизайн-систем (по аналогии с галереями
     вроде uizze.com), базовый набор значений идентичен пресетам PRD. */
  const STYLES = {
    brutalism: {
      name: 'Брутализм', note: 'Резкие границы, максимум контраста',
      variants: [
        { name: 'Акцидент',
          palette: ['#F4F1DE', '#E07A5F', '#3D405B', '#81B29A', '#1C110A'],
          previewBg: '#F4F1DE', previewText: '#1C110A',
          bg: '#F4F1DE', surface: '#FFFFFF', text: '#1C110A', textMuted: '#6B5B45',
          base: '#E07A5F', accent: '#C05638', font: 'Archivo', fontPreview: 'Archivo',
          radius: 2, shadow: 'none', harmony: 'complementary' },
        { name: 'Неоньюар',
          palette: ['#111111', '#FFFFFF', '#FF2B2B', '#2B2B2B', '#A0A0A0'],
          previewBg: '#161616', previewText: '#FFFFFF',
          bg: '#111111', surface: '#1A1A1A', text: '#FFFFFF', textMuted: '#999999',
          base: '#FF2B2B', accent: '#FF2B2B', font: 'Archivo', fontPreview: 'Archivo',
          radius: 0, shadow: 'none', harmony: 'complementary' },
        { name: 'Плакат',
          palette: ['#FFDE00', '#0B0B0B', '#FF3E00', '#FFFFFF', '#5F5F5F'],
          previewBg: '#FFDE00', previewText: '#0B0B0B',
          bg: '#FFDE00', surface: '#FFFFFF', text: '#0B0B0B', textMuted: '#333333',
          base: '#FF3E00', accent: '#FF3E00', font: 'Archivo', fontPreview: 'Archivo',
          radius: 0, shadow: 'none', harmony: 'analogous' },
      ],
    },
    glassmorphism: {
      name: 'Стеклянный', note: 'Полупрозрачные поверхности, blur',
      variants: [
        { name: 'Индиго',
          palette: ['#EEF2FF', '#C7D2FE', '#818CF8', '#4F46E5', '#312E81'],
          previewBg: 'rgba(238,242,255,0.5)', previewText: '#312E81',
          bg: '#F7F8FF', surface: '#FFFFFF', text: '#1E1B4B', textMuted: '#6B7280',
          base: '#4441D8', accent: '#4F46E5', font: 'Inter', fontPreview: 'Inter',
          radius: 12, shadow: 'soft', harmony: 'analogous' },
        { name: 'Медовый',
          palette: ['#FFF7ED', '#FED7AA', '#FB923C', '#EA580C', '#7C2D12'],
          previewBg: 'rgba(255,237,213,0.6)', previewText: '#7C2D12',
          bg: '#FFF9F2', surface: '#FFFFFF', text: '#431407', textMuted: '#9A6B4F',
          base: '#EA580C', accent: '#EA580C', font: 'Inter', fontPreview: 'Inter',
          radius: 14, shadow: 'soft', harmony: 'analogous' },
        { name: 'Мята',
          palette: ['#ECFDF5', '#BBF7D0', '#34D399', '#059669', '#064E3B'],
          previewBg: 'rgba(236,253,245,0.6)', previewText: '#064E3B',
          bg: '#F1FAF5', surface: '#FFFFFF', text: '#022C22', textMuted: '#5B7A6B',
          base: '#059669', accent: '#059669', font: 'Inter', fontPreview: 'Inter',
          radius: 12, shadow: 'soft', harmony: 'analogous' },
      ],
    },
    cyberpunk: {
      name: 'Киберпанк', note: 'Тёмный фон, яркие акценты',
      variants: [
        { name: 'Неон',
          palette: ['#0F0E17', '#FFFFFE', '#FF8906', '#7A5AF0', '#E53170'],
          previewBg: '#16141E', previewText: '#FFFFFE',
          bg: '#0F0E17', surface: '#1A1A26', text: '#FFFFFE', textMuted: '#A6A6B4',
          base: '#E53170', accent: '#FF8906', font: 'Space Grotesk', fontPreview: 'Space Grotesk',
          radius: 8, shadow: 'none', harmony: 'triadic' },
        { name: 'Матрица',
          palette: ['#010B07', '#E8FFE8', '#00FF7F', '#39FF14', '#0A2E1A'],
          previewBg: '#02110B', previewText: '#E8FFE8',
          bg: '#010B07', surface: '#04120A', text: '#E8FFE8', textMuted: '#5EA98A',
          base: '#39FF14', accent: '#00C853', font: 'Space Grotesk', fontPreview: 'Space Grotesk',
          radius: 6, shadow: 'none', harmony: 'analogous' },
        { name: 'Фиолет',
          palette: ['#0B0518', '#F5F0FF', '#7F3FF2', '#F875AA', '#2B0F66'],
          previewBg: '#150B2E', previewText: '#F5F0FF',
          bg: '#0B0518', surface: '#150B2E', text: '#F5F0FF', textMuted: '#8F7FB3',
          base: '#7F3FF2', accent: '#7F3FF2', font: 'Space Grotesk', fontPreview: 'Space Grotesk',
          radius: 10, shadow: 'none', harmony: 'analogous' },
      ],
    },
    minimalism: {
      name: 'Минимализм', note: 'Тёплый минимализм, один акцент',
      variants: [
        { name: 'Тёплый',
          palette: ['#FFFFFF', '#FAFAF9', '#78716C', '#1C1917', '#A16207'],
          previewBg: '#FAFAF9', previewText: '#1C1917',
          bg: '#FFFFFF', surface: '#FAFAF9', text: '#1C1917', textMuted: '#78716C',
          base: '#A16207', accent: '#A16207', font: 'Manrope', fontPreview: 'Manrope',
          radius: 12, shadow: 'soft', harmony: 'monochromatic' },
        { name: 'Пепел',
          palette: ['#FFFFFF', '#F8FAFC', '#64748B', '#0F172A', '#334155'],
          previewBg: '#F8FAFC', previewText: '#0F172A',
          bg: '#FFFFFF', surface: '#F8FAFC', text: '#0F172A', textMuted: '#64748B',
          base: '#334155', accent: '#334155', font: 'Inter', fontPreview: 'Inter',
          radius: 10, shadow: 'soft', harmony: 'monochromatic' },
        { name: 'Песок',
          palette: ['#FDFBF7', '#F5F0E8', '#A89F91', '#2B2B27', '#8B5E34'],
          previewBg: '#F5F0E8', previewText: '#2B2B27',
          bg: '#FDFBF7', surface: '#F5F0E8', text: '#2B2B27', textMuted: '#8A8178',
          base: '#A16207', accent: '#8B5E34', font: 'Manrope', fontPreview: 'Manrope',
          radius: 8, shadow: 'subtle', harmony: 'monochromatic' },
      ],
    },
    neomorphism: {
      name: 'Неоморфизм', note: 'Мягкий объём без резких теней',
      variants: [
        { name: 'Облако',
          palette: ['#E0E5EC', '#FFFFFF', '#A3B1C6', '#5B7A9D', '#4B5666'],
          previewBg: '#E0E5EC', previewText: '#4B5666',
          bg: '#E0E5EC', surface: '#E0E5EC', text: '#4B5666', textMuted: '#8A94A6',
          base: '#5B7A9D', accent: '#5B7A9D', font: 'Inter', fontPreview: 'Inter',
          radius: 16, shadow: 'neomorph', harmony: 'analogous' },
        { name: 'Лепесток',
          palette: ['#F3E7F0', '#FFFFFF', '#D9B8D1', '#A56FA0', '#6B4766'],
          previewBg: '#F3E7F0', previewText: '#4A2E47',
          bg: '#F3E7F0', surface: '#F3E7F0', text: '#4A2E47', textMuted: '#9B7E96',
          base: '#A56FA0', accent: '#A56FA0', font: 'Inter', fontPreview: 'Inter',
          radius: 16, shadow: 'neomorph', harmony: 'analogous' },
        { name: 'Охра',
          palette: ['#EDE7DA', '#FFFFFF', '#C9BCA5', '#8A7650', '#5C4E33'],
          previewBg: '#EDE7DA', previewText: '#4A4030',
          bg: '#EDE7DA', surface: '#EDE7DA', text: '#4A4030', textMuted: '#93836A',
          base: '#8A7650', accent: '#8A7650', font: 'Inter', fontPreview: 'Inter',
          radius: 14, shadow: 'neomorph', harmony: 'analogous' },
      ],
    },
    flat: {
      name: 'Плоский', note: 'Без теней, чистые поверхности',
      variants: [
        { name: 'Синий',
          palette: ['#FFFFFF', '#F1F5F9', '#2563EB', '#0F172A', '#F59E0B'],
          previewBg: '#FFFFFF', previewText: '#0F172A',
          bg: '#FFFFFF', surface: '#F8FAFC', text: '#0F172A', textMuted: '#64748B',
          base: '#2563EB', accent: '#2563EB', font: 'Inter', fontPreview: 'Inter',
          radius: 8, shadow: 'none', harmony: 'complementary' },
        { name: 'Мята',
          palette: ['#FFFFFF', '#F0FDF4', '#16A34A', '#14532D', '#22C55E'],
          previewBg: '#FFFFFF', previewText: '#0F2A1B',
          bg: '#FFFFFF', surface: '#F7FCF8', text: '#0F2A1B', textMuted: '#5A7D68',
          base: '#16A34A', accent: '#16A34A', font: 'Inter', fontPreview: 'Inter',
          radius: 6, shadow: 'none', harmony: 'complementary' },
        { name: 'Тангерин',
          palette: ['#FFF7ED', '#FFEDD5', '#EA580C', '#7C2D12', '#F97316'],
          previewBg: '#FFF7ED', previewText: '#431407',
          bg: '#FFFCF9', surface: '#FFF1E6', text: '#431407', textMuted: '#B07D63',
          base: '#EA580C', accent: '#EA580C', font: 'Inter', fontPreview: 'Inter',
          radius: 6, shadow: 'none', harmony: 'complementary' },
      ],
    },
  };

  function variantOf(styleKey, index) {
    const style = STYLES[styleKey] || STYLES.minimalism;
    return style.variants[index] || style.variants[0];
  }
  function variantName(styleKey, index) {
    return variantOf(styleKey, index).name;
  }

  const HARMONIES = {
    analogous: [{ d: 0 }, { d: -24 }, { d: 24 }, { d: -12, lo: 8 }, { d: 12, lo: 8 }],
    complementary: [{ d: 0 }, { d: 180 }, { d: 18 }, { d: -18, lo: 6 }, { d: 180, lo: 14 }],
    triadic: [{ d: 0 }, { d: 120 }, { d: 240 }, { d: -30 }, { d: 30 }],
    tetradic: [{ d: 0 }, { d: 90 }, { d: 180 }, { d: 270 }, { d: 45 }],
    monochromatic: [{ d: 0, lo: 0 }, { d: 0, lo: -12, s: -14 }, { d: 0, lo: 12, s: -14 }, { d: 0, lo: -22 }, { d: 0, lo: 24, s: -18 }],
  };

  const SHADOWS = {
    soft: {
      subtle: '0 1px 2px rgba(28,25,23,.06), 0 1px 3px rgba(28,25,23,.05)',
      medium: '0 4px 6px rgba(28,25,23,.08), 0 10px 24px rgba(28,25,23,.07)',
      focus: '0 0 0 3px rgba(161,98,7,.18)',
    },
    medium: {
      subtle: '0 2px 4px rgba(28,25,23,.08)',
      medium: '0 8px 16px rgba(28,25,23,.10), 0 16px 40px rgba(28,25,23,.10)',
      focus: '0 0 0 4px rgba(161,98,7,.26)',
    },
    strong: {
      subtle: '0 3px 6px rgba(28,25,23,.10)',
      medium: '0 12px 24px rgba(28,25,23,.14), 0 24px 60px rgba(28,25,23,.20)',
      focus: '0 0 0 4px rgba(161,98,7,.30)',
    },
    none: { subtle: 'none', medium: 'none', focus: '0 0 0 3px rgba(161,98,7,.25)' },
    neomorph: {
      subtle: '6px 6px 12px rgba(163,178,198,.7), -6px -6px 12px rgba(255,255,255,.95)',
      medium: '8px 8px 16px rgba(163,178,198,.75), -8px -8px 16px rgba(255,255,255,.95), 10px 10px 20px rgba(163,178,198,.4)',
      focus: '0 0 0 3px rgba(91,122,157,.3)',
    },
  };

  const TYPE_SCALES = {
    compact: { title: 28, body: 14 },
    standard: { title: 32, body: 15 },
    large: { title: 40, body: 17 },
  };

  /* ---------- Google Fonts (демо-каталог) ---------- */
  const FONTS = [
    { family: 'Manrope', css: 'https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800' },
    { family: 'Inter', css: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700' },
    { family: 'Space Grotesk', css: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700' },
    { family: 'PT Sans', css: 'https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700' },
    { family: 'Playfair Display', css: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700' },
    { family: 'JetBrains Mono', css: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500' },
    { family: 'Archivo', css: 'https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600;700' },
    { family: 'Roboto', css: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700' },
  ];
  const loadedFonts = new Set();

  /* ---------- Состояние ---------- */
  const STORAGE = 'dsgen:saved';
  const state = {
    styleKey: null,
    variantIndex: 0,
    baseColor: '#A16207',
    harmony: 'monochromatic',
    palette: [],
    tokens: {
      bg: '#FFFFFF', surface: '#FAFAF9', text: '#1C1917', textMuted: '#78716C',
      accent: '#A16207', accentHover: '#854D0E', accentSoft: '#FEF3C7',
      fontFamily: 'Manrope', headingWeight: 500, bodyWeight: 400, typeScale: 'standard',
      spaceStep: 4, radiusSm: 8, radiusMd: 12, radiusLg: 16, shadowLevel: 'soft',
    },
    modified: false,
    savedData: null,
  };

  /* ---------- Навигация ---------- */
  function goto(name) {
    $$('.screen').forEach((s) => {
      const active = s.id === name;
      s.classList.toggle('is-active', active);
      s.hidden = !active;
    });
    window.scrollTo(0, 0);
  }

  /* ---------- Тост ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
  }

  /* ---------- Палитра и акценты ---------- */
  function harmonyPalette(base, key) {
    const { h, s, l } = hexToHsl(base);
    return (HARMONIES[key] || HARMONIES.monochromatic).map((x) =>
      hslToHex(h + (x.d || 0), clamp(s + (x.s || 0), 8, 100), clamp(l + (x.lo || 0), 8, 92))
    );
  }
  function applyAccent() {
    const accent = safeAccent(state.palette[0]);
    state.tokens.accent = accent;
    state.tokens.accentHover = shade(accent, -12);
    state.tokens.accentSoft = mix(accent, '#FFFFFF', 0.88);
  }
  function regeneratePalette(randomBase) {
    if (randomBase) state.baseColor = randomColor();
    state.palette = harmonyPalette(state.baseColor, state.harmony);
    applyAccent();
  }
  function randomColor() {
    return hslToHex(Math.floor(Math.random() * 360), 45 + Math.floor(Math.random() * 35), 30 + Math.floor(Math.random() * 30));
  }

  /* ---------- Применение превью ---------- */
  function applyPreview() {
    const t = state.tokens;
    const scale = TYPE_SCALES[t.typeScale] || TYPE_SCALES.standard;
    const root = document.documentElement;
    root.style.setProperty('--p-bg', t.bg);
    root.style.setProperty('--p-surface', t.surface);
    root.style.setProperty('--p-text', t.text);
    root.style.setProperty('--p-text-muted', t.textMuted);
    root.style.setProperty('--p-accent', t.accent);
    root.style.setProperty('--p-accent-hover', t.accentHover);
    root.style.setProperty('--p-accent-soft', t.accentSoft);
    root.style.setProperty('--p-font', `'${t.fontFamily}', system-ui, sans-serif`);
    root.style.setProperty('--p-heading-weight', t.headingWeight);
    root.style.setProperty('--p-body-weight', t.bodyWeight);
    root.style.setProperty('--p-title-size', scale.title + 'px');
    root.style.setProperty('--p-body-size', scale.body + 'px');
    root.style.setProperty('--p-radius-sm', t.radiusSm + 'px');
    root.style.setProperty('--p-radius-md', t.radiusMd + 'px');
    root.style.setProperty('--p-radius-lg', t.radiusLg + 'px');
    root.style.setProperty('--p-space-4', t.spaceStep * 4 + 'px');
    root.style.setProperty('--p-space-6', t.spaceStep * 6 + 'px');
    root.style.setProperty('--p-shadow-subtle', SHADOWS[t.shadowLevel].subtle);
    root.style.setProperty('--p-shadow-medium', SHADOWS[t.shadowLevel].medium);
    root.style.setProperty('--p-shadow-focus', SHADOWS[t.shadowLevel].focus);
    const swatch = $('.shadow-swatch-box');
    if (swatch) swatch.style.boxShadow = SHADOWS[t.shadowLevel].medium;
  }

  /* ---------- Синхронизация полей ---------- */
  function syncFields() {
    const t = state.tokens;
    $('#base-color').value = state.baseColor;
    $('#base-color-hex').value = state.baseColor;
    $('#harmony').value = state.harmony;
    $('#font-family').value = t.fontFamily;
    $('#heading-weight').value = t.headingWeight;
    $('#body-weight').value = t.bodyWeight;
    $('#type-scale').value = t.typeScale;
    $('#space-step').value = t.spaceStep;
    $('#radius-sm').value = t.radiusSm;
    $('#radius-md').value = t.radiusMd;
    $('#radius-lg').value = t.radiusLg;
    $('#shadow-level').value = t.shadowLevel;
    $('#bp-sm').value = 640;
    $('#bp-md').value = 768;
    $('#bp-lg').value = 1024;
    $('#bp-xl').value = 1280;
  }

  /* ---------- Сваши и контраст ---------- */
  const swatchNames = ['bg', 'surface', 'muted', 'text', 'accent'];
  function renderSwatches() {
    const wrap = $('#swatches');
    wrap.innerHTML = '';
    state.palette.forEach((hex, i) => {
      const row = document.createElement('div');
      row.className = 'swatch-row';
      const chip = document.createElement('span');
      chip.className = 'swatch-chip' + (i === 4 ? ' is-base' : '');
      chip.style.background = hex;
      chip.title = hex;
      const hexLbl = document.createElement('span');
      hexLbl.className = 'swatch-caption';
      hexLbl.textContent = hex.toUpperCase();
      const name = document.createElement('span');
      name.className = 'swatch-caption';
      name.textContent = swatchNames[i];
      row.appendChild(chip);
      row.appendChild(hexLbl);
      row.appendChild(name);
      wrap.appendChild(row);
    });
  }

  function renderContrast() {
    const t = state.tokens;
    const pairs = [
      { label: 'Текст на фоне', sample: t.bg, fg: t.text },
      { label: 'Акцент на фоне', sample: t.bg, fg: t.accent },
      { label: 'Белый на акценте', sample: t.accent, fg: '#ffffff' },
    ];
    const wrap = $('#contrast-rows');
    wrap.innerHTML = '';
    pairs.forEach((p) => {
      const ratio = contrast(p.sample, p.fg);
      const level = wcagLevel(ratio);
      const row = document.createElement('div');
      row.className = 'contrast-row';
      row.innerHTML =
        '<span class="contrast-sample" style="background:' + p.sample + '"></span>' +
        '<span class="contrast-label"></span>' +
        '<span class="contrast-value">' + ratio.toFixed(2) + ':1</span>' +
        '<span class="badge ' + (level ? 'badge-pass' : 'badge-fail') + '">' +
        '<svg class="icon" aria-hidden="true"><use href="#tabler-' + (level ? 'circle-check' : 'circle-x') + '"></use></svg>' +
        '<span></span></span>';
      row.querySelector('.contrast-label').textContent = p.label;
      row.querySelector('.badge span').textContent = level || 'fail';
      wrap.appendChild(row);
    });
  }

  /* ---------- Чипы отступов ---------- */
  function renderSpacingChips() {
    const step = state.tokens.spaceStep;
    const wrap = $('#spacing-chips');
    wrap.innerHTML = '';
    [1, 2, 3, 4, 6, 8, 12, 16].forEach((s) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = s * step + 'px';
      wrap.appendChild(chip);
    });
  }

  function renderAnything() {
    renderSwatches();
    renderContrast();
    renderSpacingChips();
    applyPreview();
  }

  /* ---------- Карточки пресетов ---------- */
  function buildPresetCards() {
    const grid = $('#preset-grid');
    grid.innerHTML = '';
    Object.keys(STYLES).forEach((styleKey) => {
      const style = STYLES[styleKey];
      const card = document.createElement('div');
      card.className = 'preset-card';
      card.dataset.style = styleKey;
      card.innerHTML =
        '<span class="preset-card-name">' + style.name + '</span>' +
        '<span class="preset-card-note">' + style.note + '</span>' +
        '<span class="preset-variants"></span>';
      const vars = card.querySelector('.preset-variants');
      style.variants.forEach((v, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'preset-variant-btn';
        btn.dataset.style = styleKey;
        btn.dataset.variant = String(i);
        btn.setAttribute('aria-pressed', 'false');
        btn.innerHTML =
          '<span class="preset-variant-preview" style="background:' + v.previewBg + '">' +
          '<span class="preset-palette">' + v.palette.map((c) => '<span style="background:' + c + '"></span>').join('') + '</span>' +
          '<span class="preset-font" style="color:' + v.previewText + ';font-family:\'' + v.fontPreview + '\',sans-serif">Аа Bb</span>' +
          '</span>' +
          '<span class="preset-variant-name">' + v.name + '</span>';
        btn.addEventListener('click', () => openEditor(styleKey, i, false));
        vars.appendChild(btn);
      });
      grid.appendChild(card);
    });
  }

  /* ---------- Открытие редактора ---------- */
  function configFromVariant(styleKey, index, random) {
    const style = STYLES[styleKey] || STYLES.minimalism;
    const v = style.variants[index] || style.variants[0];
    state.styleKey = styleKey;
    state.variantIndex = index;
    state.baseColor = random ? randomColor() : v.base;
    state.harmony = random ? pickKey(HARMONIES) : (v.harmony || 'monochromatic');
    const t = state.tokens;
    t.bg = v.bg; t.surface = v.surface; t.text = v.text; t.textMuted = v.textMuted;
    t.fontFamily = v.font; t.headingWeight = 500; t.bodyWeight = 400; t.typeScale = 'standard';
    t.spaceStep = 4; t.radiusSm = v.radius; t.radiusMd = v.radius + 2; t.radiusLg = v.radius + 4;
    t.shadowLevel = v.shadow;
    regeneratePalette();
    loadFont(v.font);
  }
  function openEditor(styleKey, index, random) {
    configFromVariant(styleKey, index, random);
    goto('screen-editor');
    syncFields();
    renderAnything();
    resetDirtyState();
  }
  function resetDirtyState() {
    const el = $('#saved-state');
    el.textContent = '';
    el.className = 'saved-state';
    state.modified = false;
  }

  /* ---------- Google Fonts ---------- */
  function loadFont(family) {
    const font = FONTS.find((f) => f.family === family);
    if (!font || loadedFonts.has(font.css)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = font.css;
    document.head.appendChild(link);
    loadedFonts.add(font.css);
  }
  function buildFontList(filter) {
    const list = $('#fonts-list');
    list.innerHTML = '';
    const q = (filter || '').trim().toLowerCase();
    FONTS.filter((f) => !q || f.family.toLowerCase().indexOf(q) !== -1).forEach((f) => {
      const connected = state.tokens.fontFamily === f.family;
      const li = document.createElement('li');
      li.className = 'font-row' + (connected ? ' is-connected' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(connected));
      li.innerHTML = '<span class="font-row-name"></span><span class="font-row-preview">Aa</span>';
      li.querySelector('.font-row-name').textContent = f.family;
      li.querySelector('.font-row-preview').style.fontFamily = "'" + f.family + "',sans-serif";
      li.addEventListener('click', () => {
        state.tokens.fontFamily = f.family;
        loadFont(f.family);
        $('#font-family').value = f.family;
        applyPreview();
        markChanged();
        closeFontsPanel();
        buildFontList($('#fonts-search').value);
        toast('Подключён шрифт ' + f.family);
      });
      list.appendChild(li);
    });
  }
  function toggleFontsPanel() {
    const panel = $('#fonts-panel');
    const open = panel.hidden;
    panel.hidden = !open;
    $('#fonts-btn').setAttribute('aria-expanded', String(open));
    if (open) { buildFontList($('#fonts-search').value); $('#fonts-search').focus(); }
  }
  function closeFontsPanel() {
    $('#fonts-panel').hidden = true;
    $('#fonts-btn').setAttribute('aria-expanded', 'false');
  }

  /* ---------- Изменено ---------- */
  function markChanged() {
    state.modified = true;
    const el = $('#saved-state');
    el.textContent = 'Изменено';
    el.className = 'saved-state is-dirty';
  }

  /* ---------- Сохранение / восстановление ---------- */
  function readStore() {
    try {
      const raw = localStorage.getItem(STORAGE);
      state.savedData = raw ? JSON.parse(raw) : null;
    } catch (e) {
      state.savedData = null;
    }
  }
  function updateRestoreBanner() {
    const has = !!state.savedData;
    $('#restore-banner').hidden = !has;
    $('#restore-menu-btn').hidden = !has;
    if (has) {
      const d = new Date(state.savedData.savedAt || Date.now());
      $('#restore-detail').textContent =
        d.toLocaleDateString() + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
  function doSave() {
    const payload = {
      styleKey: state.styleKey, variantIndex: state.variantIndex,
      base: state.baseColor, harmony: state.harmony,
      tokens: state.tokens, savedAt: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE, JSON.stringify(payload));
    } catch (e) {
      toast('Не удалось сохранить проект');
      return;
    }
    const d = new Date();
    const el = $('#saved-state');
    el.textContent = 'Сохранено · ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
    el.className = 'saved-state is-saved';
    state.modified = false;
    state.savedData = payload;
    updateRestoreBanner();
    toast('Проект сохранён в localStorage');
  }
  function doRestore() {
    if (!state.savedData) return;
    const s = state.savedData;
    const styleKey = STYLES[s.styleKey] ? s.styleKey : 'minimalism';
    const startingVariant = Number(s.variantIndex);
    const variantIndex = STYLES[styleKey].variants[startingVariant] ? startingVariant : 0;
    const p = STYLES[styleKey].variants[variantIndex];
    state.styleKey = styleKey;
    state.variantIndex = variantIndex;
    state.baseColor = s.base || p.base;
    state.harmony = s.harmony || 'monochromatic';
    Object.assign(state.tokens, s.tokens || {});
    state.palette = harmonyPalette(state.baseColor, state.harmony);
    applyAccent();
    applyPreview();
    loadFont(state.tokens.fontFamily);
    goto('screen-editor');
    syncFields();
    renderAnything();
    resetDirtyState();
    const el = $('#saved-state');
    el.textContent = 'Восстановлено';
    el.className = 'saved-state is-saved';
  }
  function doNew() {
    localStorage.removeItem(STORAGE);
    state.savedData = null;
    updateRestoreBanner();
    goto('screen-start');
    toast('Новый проект');
  }

  /* ---------- Перегенерация элемента ---------- */
  function regenElement(name) {
    let target = null;
    if (name === 'card') target = $('.p-card');
    if (name === 'input') target = $('.p-input');
    if (name === 'button') target = $('.p-btn-primary') || $('.p-btn');
    if (!target) return;
    const nodes = [target, target.closest('.p-card'), target.closest('.p-form')];
    nodes.forEach((n) => { if (n) { n.classList.remove('regen-flash'); void n.offsetWidth; n.classList.add('regen-flash'); } });
    const labels = { card: 'Карточка', input: 'Инпут', button: 'Кнопка' };
    toast('Перегенерирован: ' + labels[name] + ' (только этот элемент)');
  }

  /* ---------- Экспорт данных ---------- */
  function currentTokens() {
    const t = state.tokens;
    return {
      'tokens/colors.json': JSON.stringify({
        base: state.baseColor, harmony: state.harmony, palette: state.palette,
        background: t.bg, surface: t.surface, text: t.text, accent: t.accent,
      }, null, 2),
      'tokens/typography.json': JSON.stringify({ family: t.fontFamily, headingWeight: t.headingWeight, bodyWeight: t.bodyWeight, scale: TYPE_SCALES[t.typeScale] }, null, 2),
      'tokens/spacing.json': JSON.stringify({ step: t.spaceStep }, null, 2),
      'tokens/radius.json': JSON.stringify({ sm: t.radiusSm, md: t.radiusMd, lg: t.radiusLg }, null, 2),
      'tokens/shadows.json': JSON.stringify({ level: t.shadowLevel }, null, 2),
      'tokens/z-index.json': JSON.stringify({ dropdown: 100, sticky: 200, modal: 300, tooltip: 400 }, null, 2),
      'tokens/breakpoints.json': JSON.stringify({ sm: 640, md: 768, lg: 1024, xl: 1280 }, null, 2),
    };
  }
  function cssExport() {
    const t = state.tokens;
    return [
      ':root {',
      '  --bg: ' + t.bg + ';', '  --surface: ' + t.surface + ';',
      '  --text: ' + t.text + ';', '  --accent: ' + t.accent + ';',
      '  --accent-soft: ' + t.accentSoft + ';',
      '  --radius-sm: ' + t.radiusSm + 'px;', '  --radius-md: ' + t.radiusMd + 'px;',
      '  --font: \'' + t.fontFamily + '\', sans-serif;',
      '}', '',
      '/* Генерация из токенов DSgen. Произвольные HEX запрещены — только токены. */',
    ].join('\n');
  }
  function fontCdn() {
    const font = FONTS.find((f) => f.family === state.tokens.fontFamily);
    return font ? font.css : null;
  }
  async function downloadZip() {
    const zip = new JSZip();
    const files = currentTokens();
    Object.keys(files).forEach((k) => zip.file('design-system/' + k, files[k]));
    zip.file('design-system/docs/design-system.md', '# Дизайн-система\n\nСтиль: ' + ((STYLES[state.styleKey] || STYLES.minimalism).name) + ' · Вариант: ' + (variantName(state.styleKey, state.variantIndex)) + '\n');
    zip.file('design-system/docs/AGENTS.md', '# Правила для ИИ-агента\n- Запрещены сырые HEX, только токены из tokens/.\n- Шрифт: ' + state.tokens.fontFamily + '.\n');
    zip.file('design-system/fonts/README.md', '# Шрифты\nСсылка на Google CDN:\n' + (fontCdn() || '—') + '\n');
    zip.file('design-system/components/button.md', '# Button\n<button class="btn btn-primary">Подробнее</button>\n');
    zip.file('design-system/components/card.md', '# Card\n');
    zip.file('design-system/components/input.md', '# Input\n');
    if ($('#platform-web').checked) {
      zip.file('design-system/styles/globals.css', cssExport());
      zip.file('design-system/styles/tailwind.config.ts', 'export default {\n  theme: { colors: { background: "var(--bg)", accent: "var(--accent)" } }\n};\n');
    }
    if ($('#platform-flutter').checked) {
      zip.file('design-system/flutter/tokens.dart', 'class AppColors {\n  static const background = Color(0xFF' + state.tokens.bg.slice(1) + ');\n  static const accent = Color(0xFF' + state.tokens.accent.slice(1) + ');\n}\n');
      zip.file('design-system/flutter/theme.dart', '// ThemeData.from(useMaterial3: true)\n');
    }
    if ($('#platform-swift').checked) {
      zip.file('design-system/swift/DesignSystem.swift', 'import SwiftUI\nextension Color {\n  static let background = Color(hex: 0x' + state.tokens.bg.slice(1).toUpperCase() + ')\n}\n');
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'design-system.zip';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Архив design-system.zip скачан');
  }

  /* ---------- Модалка экспорта ---------- */
  function openExportModal() {
    refreshExport();
    $('#export-modal').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeExportModal() {
    $('#export-modal').hidden = true;
    document.body.style.overflow = '';
  }
  function isPlat(key) { return !!$('#platform-' + key).checked; }
  function refreshExport() {
    const any = isPlat('web') || isPlat('flutter') || isPlat('swift');
    $('#download-zip-btn').disabled = !any;
    $('#export-error').textContent = any ? '' : 'Выберите хотя бы одну платформу';
    renderArchiveTree();
  }
  function renderArchiveTree() {
    const rows = [];
    const line = (label, inc) => '<span class="' + (inc ? 'tree-leaf' : 'tree-leaf') + '">' + label + '</span>';
    const root = (label) => '<span class="tree-node">' + label + '</span>';
    rows.push(root('design-system.zip'));
    rows.push(line(' ├─ tokens/  colors · typography · spacing · radius · shadows · z-index · breakpoints'));
    rows.push(line(' ├─ docs/  design-system.md · AGENTS.md'));
    rows.push(line(' ├─ fonts/  README.md + ' + (fontCdn() ? 'Google CDN-ссылка' : '—')));
    rows.push(line(' ├─ components/  button · card · input'));
    if (isPlat('web')) rows.push(line(' ├─ styles/  globals.css · tailwind.config.ts'));
    if (isPlat('flutter')) rows.push(line(' ├─ flutter/  tokens.dart · theme.dart'));
    if (isPlat('swift')) rows.push(line(' └─ swift/  DesignSystem.swift'));
    else rows.push(line(' └─ (платформенные папки появятся при выборе)'));
    $('#archive-tree').innerHTML = rows.join('\n');
  }

  /* ---------- Аккордеон ---------- */
  function bindAccordions() {
    $$('.group-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const group = btn.closest('.group');
        const willOpen = !group.classList.contains('is-open');
        group.classList.toggle('is-open', willOpen);
        const body = $('#' + btn.getAttribute('aria-controls'));
        if (body) body.hidden = !willOpen;
        btn.setAttribute('aria-expanded', String(willOpen));
      });
    });
  }

  /* ---------- События ---------- */
  function bindEvents() {
    $$('[data-goto]').forEach((el) => el.addEventListener('click', (e) => {
      e.preventDefault();
      const leavingEditor = el.closest('#screen-editor') && el.dataset.goto !== 'screen-editor';
      if (state.modified && !window.confirm('Несохранённые изменения будут потеряны. Продолжить?')) return;
      goto(el.dataset.goto);
    }));

    $('#generate-random-btn').addEventListener('click', () => {
      const styleKey = pickKey(STYLES);
      openEditor(styleKey, Math.floor(Math.random() * STYLES[styleKey].variants.length), true);
    });
    $('#restore-btn').addEventListener('click', doRestore);
    $('#restore-menu-btn').addEventListener('click', doRestore);
    $('#new-project-btn').addEventListener('click', doNew);
    $('#settings-btn').addEventListener('click', () => toast('Настройки появятся позже'));

    $('#base-color').addEventListener('input', (e) => {
      state.baseColor = e.target.value;
      $('#base-color-hex').value = e.target.value;
      regeneratePreset();
      markChanged();
    });
    $('#base-color-hex').addEventListener('change', (e) => {
      const v = normalizeHex(e.target.value);
      if (!v) { e.target.value = state.baseColor; return; }
      state.baseColor = v; $('#base-color').value = v;
      regenerateCart();
      markChanged();
    });
    $('#harmony').addEventListener('change', (e) => { state.harmony = e.target.value; regenerateCart(); markChanged(); });
    $('#regenerate-palette-btn').addEventListener('click', () => { regenerateCart(true); syncFields(); renderAnything(); markChanged(); });

    $('#gen-all-btn').addEventListener('click', () => {
      state.harmony = pickKey(HARMONIES);
      regenerateCart(true);
      state.tokens.typeScale = pickKey(TYPE_SCALES);
      state.tokens.spaceStep = pick([4, 5, 8]);
      state.tokens.shadowLevel = pick(['soft', 'medium', 'strong']);
      syncFields();
      renderAnything();
      markChanged();
      toast('Все токены сгенерированы по цветовому кругу');
    });

    const resetToPreset = () => {
      configFromVariant(state.styleKey, state.variantIndex, false);
      syncFields();
      renderAnything();
      resetDirtyState();
      toast('Сброшено к пресету');
    };
    $('#reset-btn').addEventListener('click', resetToPreset);
    $('#reset-to-preset').addEventListener('click', resetToPreset);

    $('#heading-weight').addEventListener('change', (e) => { state.tokens.headingWeight = Number(e.target.value); applyPreview(); markChanged(); });
    $('#body-weight').addEventListener('change', (e) => { state.tokens.bodyWeight = Number(e.target.value); applyPreview(); markChanged(); });
    $('#type-scale').addEventListener('change', (e) => { state.tokens.typeScale = e.target.value; applyPreview(); markChanged(); });
    $('#space-step').addEventListener('change', (e) => { state.tokens.spaceStep = Number(e.target.value) || 4; renderSpacingChips(); applyPreview(); markChanged(); });
    $('#radius-sm').addEventListener('change', (e) => { state.tokens.radiusSm = Number(e.target.value) || 0; applyPreview(); markChanged(); });
    $('#radius-md').addEventListener('change', (e) => { state.tokens.radiusMd = Number(e.target.value) || 0; applyPreview(); markChanged(); });
    $('#radius-lg').addEventListener('change', (e) => { state.tokens.radiusLg = Number(e.target.value) || 0; applyPreview(); markChanged(); });
    $('#shadow-level').addEventListener('change', (e) => { state.tokens.shadowLevel = e.target.value; applyPreview(); markChanged(); });

    $('#save-btn').addEventListener('click', doSave);
    $('#export-open-btn').addEventListener('click', openExportModal);
    $('#download-zip-btn').addEventListener('click', downloadZip);
    $$('[data-close-modal]').forEach((el) => el.addEventListener('click', closeExportModal));

    { const cb = document.getElementById('platforms-section');
      if (cb) cb.addEventListener('change', refreshExport); }

    $('#fonts-btn').addEventListener('click', (e) => { e.stopPropagation(); toggleFontsPanel(); });
    $('#fonts-search').addEventListener('input', (e) => buildFontList(e.target.value));
    document.addEventListener('click', (e) => {
      if (!document.getElementById('fonts-dropdown').contains(e.target)) closeFontsPanel();
    });

    $('#regen-btn').addEventListener('click', () => regenElement($('#regen-element').value));
    $$('[data-regen]').forEach((el) => el.addEventListener('click', () => regenElement(el.dataset.regen)));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeExportModal();
        closeFontsPanel();
      }
    });
  }

  /* внутренние синонимы (короткие правки) */
  function regenerateCart() { regeneratePalette(); renderAnything(); }
  function regeneratePreset() { regeneratePalette(); renderAnything(); }

  /* ---------- Инициализация ---------- */
  function init() {
    goto('screen-start');
    buildPresetCards();
    bindAccordions();
    bindEvents();
    readStore();
    updateRestoreBanner();
    renderAnything();
  }

  init();
})();