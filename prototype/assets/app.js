(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

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
  function lum(hex) {
    const { r, g, b } = hexToRgb(hex);
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function contrast(a, b) {
    const la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  function isDark(hex) { return lum(hex) < 0.4; }

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
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex({ r: A.r + (B.r - A.r) * t, g: A.g + (B.g - A.g) * t, b: A.b + (B.b - A.b) * t });
  }
function ensureContrast(color, bg, minRatio) {
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

  /* --- Semantic color analyzer --- */
  function chromaScore({ r, g, b }) {
    return Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);
  }

  function analyzePalette(colors) {
    const analyzed = colors.map((hex, i) => {
      const hsl = hexToHsl(hex);
      const rgb = hexToRgb(hex);
      const l = lum(hex);
      const cs = chromaScore(rgb);
      return {
        hex, hsl, luminance: l, hue: hsl.h,
        chroma: cs, rgb, isNeutral: cs < 60, index: i
      };
    });

    const veryLight = analyzed.filter(c => c.luminance > 0.8).length;
    const veryDark = analyzed.filter(c => c.luminance < 0.08).length;
    const avgLum = analyzed.reduce((s, c) => s + c.luminance, 0) / analyzed.length;

    let mode;
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

    let bg, surface, surfaceElevated, border, borderSubtle;
    let textPrimary, textSecondary, textMuted;
    let accent, accentHover, accentSoft;

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

  function generateAltTheme(cs) {
    // Генерирует противоположную тему из colorSystem
    const isLight = cs.mode === 'light';
    let bg, surface, surfaceElevated, border, borderSubtle;
    let textPrimary, textSecondary, textMuted;
    let accent, accentHover, accentSoft;
    const sem = {};

    if (isLight) {
      // Light → Dark
      const bgRgb = hexToRgb(cs.background);
      const dr = bgRgb.r < 250 ? -1 : 0, dg = bgRgb.g < 250 ? -1 : 0, db = bgRgb.b < 250 ? -1 : 0;
      const bias = { r: bgRgb.r + dr * 4, g: bgRgb.g + dg * 4, b: bgRgb.b + db * 4 };
      bg = rgbToHex({ r: clamp(bias.r - 236, 6, 16), g: clamp(bias.g - 236, 6, 16), b: clamp(bias.b - 236, 8, 20) });
      surface = rgbToHex({ r: clamp(bias.r - 220, 12, 24), g: clamp(bias.g - 220, 12, 24), b: clamp(bias.b - 220, 14, 28) });
      surfaceElevated = rgbToHex({ r: clamp(bias.r - 202, 18, 34), g: clamp(bias.g - 202, 18, 34), b: clamp(bias.b - 202, 20, 36) });
      border = mix(bg, '#ffffff', 0.1);
      borderSubtle = mix(bg, '#ffffff', 0.05);
      textPrimary = mix(cs.textPrimary, '#ffffff', 0.92);
      textSecondary = mix(textPrimary, bg, 0.35);
      textMuted = mix(textPrimary, bg, 0.58);
      const accH = rgbToHsl(hexToRgb(cs.accent));
      accent = hslToHex(accH.h, Math.min(100, accH.s + 5), Math.max(38, Math.min(72, accH.l + 15)));
      accentHover = hslToHex(accH.h, Math.min(100, accH.s + 8), Math.min(88, accH.l + 25));
      accentSoft = mix(accent, bg, 0.82);
      sem.success = mix('#4ADE80', bg, 0.28); sem.warning = mix('#FBBF24', bg, 0.28);
      sem.error = mix('#F87171', bg, 0.28); sem.info = mix('#60A5FA', bg, 0.28);
    } else {
      // Dark → Light
      const bgRgb = hexToRgb(cs.background);
      const dr = bgRgb.r + 240, dg = bgRgb.g + 240, db = bgRgb.b + 240;
      bg = rgbToHex({ r: clamp(dr, 248, 255), g: clamp(dg, 248, 255), b: clamp(db, 248, 255) });
      surface = rgbToHex({ r: clamp(dr - 8, 240, 250), g: clamp(dg - 8, 240, 250), b: clamp(db - 8, 240, 250) });
      surfaceElevated = '#ffffff';
      const bgL = lum(bg);
      border = mix(bg, '#000000', 0.1);
      borderSubtle = mix(bg, border, 0.4);
      textPrimary = mix(cs.textPrimary, '#000000', 0.88);
      const tpL = lum(textPrimary);
      if (tpL > 0.12) textPrimary = mix(textPrimary, '#000000', 0.7);
      textSecondary = mix(textPrimary, bg, 0.38);
      textMuted = mix(textPrimary, bg, 0.58);
      const accH = rgbToHsl(hexToRgb(cs.accent));
      accent = hslToHex(accH.h, Math.min(100, accH.s + 5), Math.max(22, Math.min(55, accH.l - 8)));
      accentHover = hslToHex(accH.h, Math.min(100, accH.s + 5), Math.max(14, Math.min(45, accH.l - 16)));
      accentSoft = mix(accent, bg, 0.88);
      sem.success = '#3F6212'; sem.warning = '#92400E';
      sem.error = '#9A3412'; sem.info = '#1E40AF';
    }

    // Contrast adjustment
    textPrimary = ensureContrast(textPrimary, isLight ? bg : bg, 4.5);
    textSecondary = ensureContrast(textSecondary, isLight ? bg : bg, 3.0);
    textMuted = ensureContrast(textMuted, isLight ? bg : bg, 3.0);

    return {
      mode: isLight ? 'dark' : 'light',
      background: bg, surface, surfaceElevated, border, borderSubtle,
      textPrimary, textSecondary, textMuted, accent, accentHover, accentSoft,
      semantic: sem
    };
  }

  function getSemanticColors(palette, useAlt) {
    if (useAlt && palette.colorSystemAlt) return palette.colorSystemAlt;
    if (useAlt && palette.colorSystem) {
      if (!palette._colorSystemAlt) palette._colorSystemAlt = generateAltTheme(palette.colorSystem);
      return palette._colorSystemAlt;
    }
    if (!palette.colorSystem) {
      palette.colorSystem = analyzePalette(palette.colors);
      palette.primaryMode = palette.colorSystem.mode;
    }
    if (useAlt) {
      if (!palette._colorSystemAlt) palette._colorSystemAlt = generateAltTheme(palette.colorSystem);
      return palette._colorSystemAlt;
    }
    return palette.colorSystem;
  }

  /* --- Data — inline fallback + загрузка из JSON (если сервер) --- */
  /* Полные данные хранятся в assets/data/*.json. При загрузке через
     file:// fetch заблокирован CORS — используем inline-копию ниже. */
  let PALETTES = [
    {"id":"graphite-order","name":"Графитовый порядок","colors":["#F7F8FA","#FFFFFF","#343A40","#6C757D","#16181D"]},
    {"id":"cold-slate","name":"Холодный сланец","colors":["#F5F7F9","#FFFFFF","#334155","#64748B","#172033"]},
    {"id":"steel-grid","name":"Стальная сетка","colors":["#F4F6F8","#FBFCFD","#3F4A56","#7B8794","#20262D"]},
    {"id":"ink","name":"Чернила","colors":["#FAFAF9","#FFFFFF","#27272A","#71717A","#18181B"]},
    {"id":"white-paper","name":"Белая бумага","colors":["#FCFCFB","#F7F7F5","#404040","#737373","#171717"]},
    {"id":"electric-uv","name":"Электрический ультрафиолет","colors":["#090812","#151127","#9B5CFF","#FF3CAC","#F7F2FF"]},
    {"id":"acid-lime","name":"Кислотный лайм","colors":["#060A08","#101A14","#B7FF00","#00F5A0","#EEFFF4"]},
    {"id":"cyan-pulse","name":"Циановый импульс","colors":["#070B12","#111A27","#22D3EE","#6366F1","#ECFEFF"]},
    {"id":"midnight-magenta","name":"Магента после полуночи","colors":["#100711","#211022","#F43F9E","#A855F7","#FFF1FA"]},
    {"id":"signal-red","name":"Сигнальный красный","colors":["#0D090A","#1C1113","#FF3158","#FFB000","#FFF5F6"]},
    {"id":"sapphire-glass","name":"Сапфировое стекло","colors":["#F3F8FF","#FFFFFF","#2563EB","#60A5FA","#172554"]},
    {"id":"ice-fog","name":"Ледяной туман","colors":["#F5FAFC","#FFFFFF","#0E7490","#67E8F9","#164E63"]},
    {"id":"aquamarine","name":"Аквамарин","colors":["#F2FCFB","#FFFFFF","#0F766E","#5EEAD4","#134E4A"]},
    {"id":"lavender-glass","name":"Лавандовое стекло","colors":["#F8F6FF","#FFFFFF","#6D5BD0","#B8A8FF","#312E5A"]},
    {"id":"sky-haze","name":"Небесная дымка","colors":["#F2F8FF","#FFFFFF","#3478C5","#8EC5FF","#183B61"]},
    {"id":"scarlet-concrete","name":"Алый бетон","colors":["#F8F4F2","#FFFFFF","#C91C2B","#262626","#111111"]},
    {"id":"black-poster","name":"Чёрный плакат","colors":["#F2F2F0","#FFFFFF","#111111","#E03A2F","#090909"]},
    {"id":"cobalt-strike","name":"Кобальтовый удар","colors":["#F4F6FA","#FFFFFF","#1646D8","#111827","#0A0F1A"]},
    {"id":"orange-print","name":"Оранжевый принт","colors":["#FFF8F0","#FFFFFF","#EA580C","#1F2937","#171717"]},
    {"id":"burgundy-poster","name":"Бордовый постер","colors":["#FAF5F6","#FFFFFF","#8F1D35","#26202A","#171014"]},
    {"id":"milky-minimal","name":"Молочный минимализм","colors":["#FCFCFA","#FFFFFF","#30343B","#9AA0A8","#17191C"]},
    {"id":"stone-minimal","name":"Каменный минимализм","colors":["#F6F5F2","#FFFFFF","#57534E","#A8A29E","#292524"]},
    {"id":"quiet-olive","name":"Тихая олива","colors":["#F8FAF3","#FFFFFF","#657A3A","#A3B18A","#26301B"]},
    {"id":"quiet-blue","name":"Тихий синий","colors":["#F7F9FC","#FFFFFF","#4B6B8A","#9CB4CA","#1F3040"]},
    {"id":"warm-clay","name":"Тёплая глина","colors":["#FBF8F4","#FFFFFF","#A66A45","#D7B39A","#34251D"]},
    {"id":"dark-gold","name":"Тёмное золото","colors":["#17130E","#231C12","#D6A84F","#8D6A2F","#F7EFD9"]},
    {"id":"champagne","name":"Шампанское","colors":["#F7F2E8","#FFFCF5","#B8893D","#D8C29A","#29231A"]},
    {"id":"wine-brass","name":"Вино и латунь","colors":["#1A1014","#29171D","#C59A55","#8E3048","#F4E8DC"]},
    {"id":"espresso","name":"Эспрессо","colors":["#211813","#30231B","#C59A72","#79553C","#F4E8D8"]},
    {"id":"ivory","name":"Слоновая кость","colors":["#FAF7EF","#FFFDF8","#9B7139","#C8A66A","#29251E"]},
    {"id":"peach-warmth","name":"Персиковое тепло","colors":["#FFF8F4","#FFFFFF","#E97858","#F5B39E","#3A2722"]},
    {"id":"berry-cream","name":"Ягодный крем","colors":["#FFF7FA","#FFFFFF","#C94B78","#F2A7BF","#3B202B"]},
    {"id":"soft-mint","name":"Мягкая мята","colors":["#F5FBF8","#FFFFFF","#3F9B7A","#A9DEC9","#20382F"]},
    {"id":"powder-lavender","name":"Пудровая лаванда","colors":["#FAF8FF","#FFFFFF","#8068C8","#C9BDF0","#30294A"]},
    {"id":"lemon-cream","name":"Лимонный крем","colors":["#FFFCF0","#FFFFFF","#C79A18","#F1D878","#3A3117"]},
    {"id":"data-cobalt","name":"Кобальт данных","colors":["#F4F7FB","#FFFFFF","#2457C5","#7B9DE8","#14213D"]},
    {"id":"engineer-navy","name":"Инженерный navy","colors":["#F2F5F8","#FFFFFF","#183B5B","#4E86B8","#0D1B2A"]},
    {"id":"cold-cyan","name":"Холодный циан","colors":["#F3F9FB","#FFFFFF","#087F8C","#55C7D1","#12343B"]},
    {"id":"indigo-scheme","name":"Индиго-схема","colors":["#F5F6FC","#FFFFFF","#4F46A5","#8B91D9","#20204A"]},
    {"id":"steel-interface","name":"Стальной интерфейс","colors":["#F5F7F9","#FFFFFF","#52606D","#9AA6B2","#202A33"]},
    {"id":"film-70s","name":"Плёнка 70-х","colors":["#F4EBDD","#FBF5E9","#A85B32","#D0A15C","#493329"]},
    {"id":"olive-film","name":"Оливковая плёнка","colors":["#EFEBDD","#F8F4E8","#6C7042","#B59A5A","#36352A"]},
    {"id":"rusty-postcard","name":"Ржавая открытка","colors":["#F7E9DD","#FFF5EA","#A64B2A","#D08B52","#45291E"]},
    {"id":"old-coffee","name":"Старая кофейня","colors":["#F1E6D7","#FAF1E4","#76513B","#B68A62","#38271F"]},
    {"id":"mustard-poster","name":"Горчичный плакат","colors":["#F7EFD4","#FFF8E4","#9B751C","#C8A449","#40351B"]},
    {"id":"deep-forest","name":"Глубокий лес","colors":["#F2F7F1","#FFFFFF","#216E4A","#6FA77D","#173426"]},
    {"id":"moss","name":"Мох","colors":["#F6F7EE","#FFFFFF","#667A36","#A5B56A","#303A1D"]},
    {"id":"sage","name":"Шалфей","colors":["#F3F7F3","#FFFFFF","#557A68","#9DB9A8","#25352E"]},
    {"id":"clay-grass","name":"Глина и трава","colors":["#F8F3EA","#FFFDF8","#8C5A3C","#78965B","#35291F"]},
    {"id":"pine-shadow","name":"Сосновая тень","colors":["#EEF4F0","#F9FCFA","#285943","#86A58E","#183126"]}
  ]
  let FONT_PAIRS = [
    { "id": "pair1", "name": "Yeseva One + Manrope", "heading": "Yeseva One", "body": "Manrope", "hw": 500, "bw": 400, "note": "Изящный заголовок, современный текст" },
    { "id": "pair2", "name": "Merriweather + Open Sans", "heading": "Merriweather", "body": "Open Sans", "hw": 500, "bw": 400, "note": "Классическая редакционная пара" },
    { "id": "pair3", "name": "IBM Plex Serif + IBM Plex Sans", "heading": "IBM Plex Serif", "body": "IBM Plex Sans", "hw": 500, "bw": 400, "note": "Единая система, антиква + гротеск" },
    { "id": "pair4", "name": "Raleway + Raleway", "heading": "Raleway", "body": "Raleway", "hw": 600, "bw": 400, "note": "Один шрифт, разный вес" },
    { "id": "pair5", "name": "Bitter + Open Sans", "heading": "Bitter", "body": "Open Sans", "hw": 500, "bw": 400, "note": "Контрастная, современная классика" },
    { "id": "pair6", "name": "Cormorant + Open Sans", "heading": "Cormorant", "body": "Open Sans", "hw": 500, "bw": 400, "note": "Премиальная, журнальная" },
    { "id": "pair7", "name": "Nunito + Roboto", "heading": "Nunito", "body": "Roboto", "hw": 600, "bw": 400, "note": "Дружелюбная, современная" },
    { "id": "pair8", "name": "Viaoda Libre + Manrope", "heading": "Viaoda Libre", "body": "Manrope", "hw": 500, "bw": 400, "note": "Каллиграфический заголовок, современный текст" },
    { "id": "pair9", "name": "Noto Serif + Roboto", "heading": "Noto Serif", "body": "Roboto", "hw": 500, "bw": 400, "note": "Строгая, универсальная" },
    { "id": "pair10", "name": "Yeseva One + Roboto", "heading": "Yeseva One", "body": "Roboto", "hw": 500, "bw": 400, "note": "Элегантный заголовок, нейтральный текст" },
    { "id": "pair11", "name": "Space Grotesk + Inter", "heading": "Space Grotesk", "body": "Inter", "hw": 500, "bw": 400, "note": "Технологичная, современная" },
    { "id": "pair12", "name": "Playfair Display + Lato", "heading": "Playfair Display", "body": "Lato", "hw": 500, "bw": 400, "note": "Элегантная, премиальная" },
    { "id": "pair13", "name": "Playfair Display + Source Sans Pro", "heading": "Playfair Display", "body": "Source Sans Pro", "hw": 500, "bw": 400, "note": "Акцидентная, журнальная" },
    { "id": "pair14", "name": "Nunito + PT Sans", "heading": "Nunito", "body": "PT Sans", "hw": 600, "bw": 400, "note": "Мягкая, дружелюбная" },
    { "id": "pair15", "name": "Jost + Roboto", "heading": "Jost", "body": "Roboto", "hw": 500, "bw": 400, "note": "Геометричная, современная" },
    { "id": "pair16", "name": "Manrope + Manrope", "heading": "Manrope", "body": "Manrope", "hw": 600, "bw": 400, "note": "Моно-стиль, универсальная" },
    { "id": "pair17", "name": "Marmelad + Manrope", "heading": "Marmelad", "body": "Manrope", "hw": 500, "bw": 400, "note": "Игривый заголовок, современный текст" },
    { "id": "pair18", "name": "Forum + PT Sans", "heading": "Forum", "body": "PT Sans", "hw": 400, "bw": 400, "note": "Винтажная, благородная" },
    { "id": "pair19", "name": "Tenor Sans + Manrope", "heading": "Tenor Sans", "body": "Manrope", "hw": 500, "bw": 400, "note": "Чистая, минималистичная" },
    { "id": "pair20", "name": "Inter + Playfair Display", "heading": "Playfair Display", "body": "Inter", "hw": 500, "bw": 400, "note": "Гротеск + антиква, премиально" },
    { "id": "pair21", "name": "EB Garamond + Inter", "heading": "EB Garamond", "body": "Inter", "hw": 500, "bw": 400, "note": "Утончённый заголовок, современный текст" },
    { "id": "pair22", "name": "IBM Plex Sans + IBM Plex Sans", "heading": "IBM Plex Sans", "body": "IBM Plex Sans", "hw": 500, "bw": 400, "note": "Единая Plex-система, медицинская" },
    { "id": "pair23", "name": "Geologica + Manrope", "heading": "Geologica", "body": "Manrope", "hw": 500, "bw": 400, "note": "Характерный заголовок, нейтральный текст" },
    { "id": "pair24", "name": "Bebas Neue + Inter", "heading": "Bebas Neue", "body": "Inter", "hw": 600, "bw": 400, "note": "Акцидентный заголовок, чистый UI-текст" },
    { "id": "pair25", "name": "Lora + Manrope", "heading": "Lora", "body": "Manrope", "hw": 500, "bw": 400, "note": "Антиква + гротеск, современная классика" },
    { "id": "pair26", "name": "Manrope + Lora", "heading": "Manrope", "body": "Lora", "hw": 600, "bw": 400, "note": "Креативная, обратная пара к Lora + Manrope" },
    { "id": "pair27", "name": "Playfair Display + Manrope", "heading": "Playfair Display", "body": "Manrope", "hw": 500, "bw": 400, "note": "Playfair — главный герой, Manrope — надёжная основа" },
    { "id": "pair28", "name": "Martian Mono + Manrope", "heading": "Martian Mono", "body": "Manrope", "hw": 500, "bw": 400, "note": "Моноширинный акцент + нейтральный текст" },
    { "id": "pair29", "name": "Handjet + Inter", "heading": "Handjet", "body": "Inter", "hw": 500, "bw": 400, "note": "Пиксельная, игровая" },
    { "id": "pair30", "name": "Noto Serif + Open Sans", "heading": "Noto Serif", "body": "Open Sans", "hw": 500, "bw": 400, "note": "Классическая универсальная" },
    { "id": "pair31", "name": "Golos Text + Inter", "heading": "Golos Text", "body": "Inter", "hw": 500, "bw": 400, "note": "Строгая, нейтральная, системная" },
    { "id": "pair32", "name": "Onest + Manrope", "heading": "Onest", "body": "Manrope", "hw": 500, "bw": 400, "note": "Современная, цельная UI-пара" }
  ];
  let FONTS = [
    { "family": "Manrope", "css": "https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800" },
    { "family": "Inter", "css": "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700" },
    { "family": "Space Grotesk", "css": "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700" },
    { "family": "PT Sans", "css": "https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700" },
    { "family": "PT Serif", "css": "https://fonts.googleapis.com/css2?family=PT+Serif:wght@400;700" },
    { "family": "Playfair Display", "css": "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700" },
    { "family": "JetBrains Mono", "css": "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500" },
    { "family": "Archivo", "css": "https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600;700" },
    { "family": "Nunito", "css": "https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700" },
    { "family": "Montserrat", "css": "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700" },
    { "family": "Exo 2", "css": "https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700" },
    { "family": "Oswald", "css": "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700" },
    { "family": "Lora", "css": "https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700" },
    { "family": "Rubik", "css": "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700" },
    { "family": "Open Sans", "css": "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700" },
    { "family": "Cormorant Garamond", "css": "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700" },
    { "family": "Space Mono", "css": "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700" },
    { "family": "Dancing Script", "css": "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700" },
    { "family": "Onest", "css": "https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700" },
    { "family": "Golos Text", "css": "https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700" },
    { "family": "IBM Plex Sans", "css": "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700" },
    { "family": "IBM Plex Serif", "css": "https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@400;500;600;700" },
    { "family": "Raleway", "css": "https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700" },
    { "family": "Jost", "css": "https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700" },
    { "family": "Commissioner", "css": "https://fonts.googleapis.com/css2?family=Commissioner:wght@300;400;500;600;700" },
    { "family": "Wix Madefor Display", "css": "https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400;500;600;700" },
    { "family": "Wix Madefor Text", "css": "https://fonts.googleapis.com/css2?family=Wix+Madefor+Text:wght@400;500;600;700" },
    { "family": "Bebas Neue", "css": "https://fonts.googleapis.com/css2?family=Bebas+Neue" },
    { "family": "Plus Jakarta Sans", "css": "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700" },
    { "family": "Yeseva One", "css": "https://fonts.googleapis.com/css2?family=Yeseva+One" },
    { "family": "Comfortaa", "css": "https://fonts.googleapis.com/css2?family=Comfortaa:wght@300;400;500;600;700" },
    { "family": "Merriweather", "css": "https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900" },
    { "family": "Bitter", "css": "https://fonts.googleapis.com/css2?family=Bitter:wght@300;400;500;600;700" },
    { "family": "Cormorant", "css": "https://fonts.googleapis.com/css2?family=Cormorant:wght@400;500;600;700" },
    { "family": "Andika", "css": "https://fonts.googleapis.com/css2?family=Andika:wght@400;700" },
    { "family": "Roboto", "css": "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700" },
    { "family": "Viaoda Libre", "css": "https://fonts.googleapis.com/css2?family=Viaoda+Libre" },
    { "family": "Noto Serif", "css": "https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;500;600;700" },
    { "family": "Ubuntu", "css": "https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700" },
    { "family": "Lato", "css": "https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900" },
    { "family": "Source Sans Pro", "css": "https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@300;400;600;700" },
    { "family": "Marmelad", "css": "https://fonts.googleapis.com/css2?family=Marmelad" },
    { "family": "Forum", "css": "https://fonts.googleapis.com/css2?family=Forum" },
    { "family": "Arimo", "css": "https://fonts.googleapis.com/css2?family=Arimo:wght@400;500;600;700" },
    { "family": "Tenor Sans", "css": "https://fonts.googleapis.com/css2?family=Tenor+Sans" },
    { "family": "EB Garamond", "css": "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700" },
    { "family": "Geologica", "css": "https://fonts.googleapis.com/css2?family=Geologica:wght@300;400;500;600;700" },
    { "family": "Handjet", "css": "https://fonts.googleapis.com/css2?family=Handjet:wght@300;400;500;600;700" },
    { "family": "Martian Mono", "css": "https://fonts.googleapis.com/css2?family=Martian+Mono:wght@300;400;500;600;700" },
    { "family": "Noto Sans Display", "css": "https://fonts.googleapis.com/css2?family=Noto+Sans+Display:wght@300;400;500;600;700" },
    { "family": "Vela Sans", "css": "https://fonts.googleapis.com/css2?family=Vela+Sans:wght@300;400;500;600;700" }
  ];
  let DESIGN_CONCEPTS = [
    {
      id: 'strict', name: 'Строгий', color: '#374151', icon: 'tabler-square',
      desc: 'Чёткие линии, прямоугольные формы, минимум украшений',
      radius: [2, 4, 6], shadow: 'medium', scale: 'compact', space: 4,
      paletteIds: ["graphite-order","cold-slate","steel-grid"],
      allowedPaletteIds: ["ink","white-paper"],
      fontPairIds: ["pair31","pair22","pair32"],
      allowedFontPairIds: ["pair9","pair4"],
      styleConfig: {
        effects: { blur: false, glassmorphism: false, noise: false, glow: false },
        borders: { thickness: '1px', style: 'solid' },
        animation: { style: 'технический', fast: '100ms', normal: '200ms', slow: '350ms', easing: 'ease-in-out' },
        components: { button: { ghost: 'accent text, 10% accent bg on hover', destructive: 'red bg, white text' }, navigation: { style: 'topbar', height: '56px' }, modal: { width: '480px' }, badge: { variants: ['default','success','warning','error','info'] } },
        density: { ui: 'компактная', info: 'высокая' },
        images: { photoStyle: 'предметная съёмка, без фильтров', illustrationStyle: 'линейные иконки, 1px stroke' },
        icons: { strokeWidth: 1.5 },
        letterSpacing: { heading: '-0.01em', body: '0' },
        layout: { maxWidth: '1200px' }
      }
    },
    {
      id: 'neon', name: 'Неоновый', color: '#581C87', icon: 'tabler-sparkles',
      desc: 'Тёмный фон, неоновое свечение, дерзкие акценты',
      radius: [8, 10, 12], shadow: 'glow', scale: 'large', space: 4,
      paletteIds: ["electric-uv","acid-lime","cyan-pulse"],
      allowedPaletteIds: ["midnight-magenta","signal-red"],
      fontPairIds: ["pair28","pair29","pair11","pair24"],
      allowedFontPairIds: ["pair23","pair16"],
      styleConfig: {
        effects: { blur: { enabled: true, strength: '12px' }, glassmorphism: true, noise: { enabled: true, opacity: '5%' }, glow: { enabled: true, intensity: '20px' } },
        borders: { thickness: '1px', style: 'solid' },
        animation: { style: 'выразительный', fast: '200ms', normal: '350ms', slow: '600ms', easing: 'ease-out' },
        components: { button: { ghost: 'glow accent text, glow bg on hover', destructive: 'neon pink bg, contrast text' }, navigation: { style: 'floating', height: '64px' }, modal: { width: '520px' }, badge: { variants: ['default','success','warning','error','info'] } },
        density: { ui: 'комфортная', info: 'средняя' },
        images: { photoStyle: 'высококонтрастные, с подсветкой', illustrationStyle: 'абстрактные геометрические с glow' },
        icons: { strokeWidth: 1.5 },
        letterSpacing: { heading: '0.05em', body: '0' },
        layout: { maxWidth: '1400px' }
      }
    },
    {
      id: 'glass', name: 'Стеклянный', color: '#1E40AF', icon: 'tabler-eye',
      desc: 'Полупрозрачные поверхности, blur, мягкий свет',
      radius: [14, 18, 22], shadow: 'soft', scale: 'standard', space: 5,
      paletteIds: ["sapphire-glass","ice-fog","aquamarine"],
      allowedPaletteIds: ["lavender-glass","sky-haze"],
      fontPairIds: ["pair16","pair32","pair15","pair11"],
      allowedFontPairIds: ["pair22"],
      styleConfig: {
        effects: { blur: { enabled: true, strength: '20px' }, glassmorphism: true, noise: { enabled: true, opacity: '3%' }, glow: false },
        borders: { thickness: '0.5px', style: 'solid' },
        animation: { style: 'сдержанный', fast: '300ms', normal: '400ms', slow: '700ms', easing: 'ease-in-out' },
        components: { button: { ghost: 'transparent, blurred bg on hover', destructive: 'red with 10px blur bg' }, navigation: { style: 'floating', height: '64px' }, modal: { width: '500px' }, badge: { variants: ['default','success','warning','error','info'] } },
        density: { ui: 'просторная', info: 'низкая' },
        images: { photoStyle: 'мягкие, с размытыми краями', illustrationStyle: 'полупрозрачные слои, пастель' },
        icons: { strokeWidth: 2 },
        letterSpacing: { heading: '0', body: '0' },
        layout: { maxWidth: '1200px' }
      }
    },
    {
      id: 'brutal', name: 'Брутальный', color: '#991B1B', icon: 'tabler-template',
      desc: 'Резкие границы, жирные рамки, максимум контраста',
      radius: [0, 2, 4], shadow: 'brutal', scale: 'standard', space: 4,
      paletteIds: ["scarlet-concrete","black-poster","cobalt-strike"],
      allowedPaletteIds: ["orange-print","burgundy-poster"],
      fontPairIds: ["pair24","pair11","pair31","pair22"],
      allowedFontPairIds: ["pair28","pair32"],
      styleConfig: {
        effects: { blur: false, glassmorphism: false, noise: false, glow: false },
        borders: { thickness: '3px', style: 'solid' },
        animation: { style: 'отсутствует', fast: '0ms', normal: '0ms', slow: '0ms', easing: 'step-start' },
        components: { button: { ghost: '2px frame only, no bg', destructive: 'black bg, red text' }, navigation: { style: 'sidebar', height: '100vh' }, modal: { width: '600px' }, badge: { variants: ['default','success','warning','error','info'] } },
        density: { ui: 'компактная', info: 'высокая' },
        images: { photoStyle: 'высококонтрастные, ч/б с зерном', illustrationStyle: 'толстые линии 3px, сплошная заливка' },
        icons: { strokeWidth: 2.5 },
        letterSpacing: { heading: '0', body: '0' },
        layout: { maxWidth: '100%' }
      }
    },
    {
      id: 'minimal', name: 'Минимальный', color: '#52525B', icon: 'tabler-minus',
      desc: 'Воздух, один акцент, никаких лишних деталей',
      radius: [8, 12, 16], shadow: 'none', scale: 'standard', space: 5,
      paletteIds: ["milky-minimal","stone-minimal","quiet-olive"],
      allowedPaletteIds: ["quiet-blue","warm-clay"],
      fontPairIds: ["pair16","pair32","pair19","pair15"],
      allowedFontPairIds: ["pair31","pair22"],
      styleConfig: {
        effects: { blur: false, glassmorphism: false, noise: false, glow: false },
        borders: { thickness: '0', style: 'none' },
        animation: { style: 'сдержанный', fast: '150ms', normal: '250ms', slow: '400ms', easing: 'ease-out' },
        components: { button: { ghost: 'only text, no frame or bg', destructive: 'red text, no bg' }, navigation: { style: 'minimal', height: '48px' }, modal: { width: '440px' }, badge: { variants: ['default','success','warning','error','info'] } },
        density: { ui: 'просторная', info: 'низкая' },
        images: { photoStyle: 'крупные, с обрезкой, без деталей', illustrationStyle: 'минималистичные контуры 1px' },
        icons: { strokeWidth: 1.5 },
        letterSpacing: { heading: '-0.03em', body: '0' },
        layout: { maxWidth: '1080px' }
      }
    },
    {
      id: 'premium', name: 'Премиум', color: '#92400E', icon: 'tabler-star',
      desc: 'Тёмный фон, золотые акценты, элегантные шрифты',
      radius: [10, 14, 18], shadow: 'strong', scale: 'large', space: 6,
      paletteIds: ["dark-gold","champagne","wine-brass"],
      allowedPaletteIds: ["espresso","ivory"],
      fontPairIds: ["pair27","pair21","pair6","pair25"],
      allowedFontPairIds: ["pair12","pair1"],
      styleConfig: {
        effects: { blur: { enabled: true, strength: '8px' }, glassmorphism: false, noise: { enabled: true, opacity: '2%' }, glow: { enabled: true, intensity: '10px' } },
        borders: { thickness: '0.5px', style: 'solid' },
        animation: { style: 'элегантный', fast: '300ms', normal: '450ms', slow: '800ms', easing: 'ease-in-out' },
        components: { button: { ghost: 'letter-spaced text, no bg', destructive: 'burgundy with gold accent' }, navigation: { style: 'topbar', height: '64px' }, modal: { width: '560px' }, badge: { variants: ['default','success','warning','error','info'] } },
        density: { ui: 'просторная', info: 'низкая' },
        images: { photoStyle: 'студийные, тёмные тона, золото', illustrationStyle: 'золотые линии, минимум цвета' },
        icons: { strokeWidth: 1 },
        letterSpacing: { heading: '0.08em', body: '0' },
        layout: { maxWidth: '1280px' }
      }
    },
    {
      id: 'friendly', name: 'Дружелюбный', color: '#9D174D', icon: 'tabler-circle-check',
      desc: 'Большие скругления, пастельные тона, тепло',
      radius: [16, 20, 28], shadow: 'soft', scale: 'standard', space: 4,
      paletteIds: ["peach-warmth","berry-cream","soft-mint"],
      allowedPaletteIds: ["powder-lavender","lemon-cream"],
      fontPairIds: ["pair14","pair7","pair17","pair1"],
      allowedFontPairIds: ["pair8","pair32"],
      styleConfig: {
        effects: { blur: false, glassmorphism: false, noise: false, glow: false },
        borders: { thickness: '1px', style: 'solid' },
        animation: { style: 'игривый', fast: '200ms', normal: '300ms', slow: '500ms', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
        components: { button: { ghost: 'pastel bg 20%, soft hover lift', destructive: 'pastel pink, warm text' }, navigation: { style: 'topbar', height: '60px' }, modal: { width: '480px' }, badge: { variants: ['default','success','warning','error','info'] } },
        density: { ui: 'комфортная', info: 'средняя' },
        images: { photoStyle: 'тёплые, с мягким светом', illustrationStyle: 'скруглённые персонажи, пастель' },
        icons: { strokeWidth: 2 },
        letterSpacing: { heading: '0', body: '0' },
        layout: { maxWidth: '1140px' }
      }
    },
    {
      id: 'tech', name: 'Технологичный', color: '#1E3A5F', icon: 'tabler-grid-dots',
      desc: 'Холодный, заострённый, гротесковые шрифты',
      radius: [4, 6, 8], shadow: 'medium', scale: 'compact', space: 4,
      paletteIds: ["data-cobalt","engineer-navy","cold-cyan"],
      allowedPaletteIds: ["indigo-scheme","steel-interface"],
      fontPairIds: ["pair11","pair23","pair28","pair22"],
      allowedFontPairIds: ["pair32","pair31"],
      styleConfig: {
        effects: { blur: { enabled: true, strength: '6px' }, glassmorphism: false, noise: false, glow: { enabled: true, intensity: '8px' } },
        borders: { thickness: '1px', style: 'solid' },
        animation: { style: 'технический', fast: '100ms', normal: '200ms', slow: '300ms', easing: 'ease-in-out' },
        components: { button: { ghost: 'blue text on 5% bg', destructive: 'cold red' }, navigation: { style: 'sidebar', height: '48px' }, modal: { width: '520px' }, badge: { variants: ['default','success','warning','error','info'] } },
        density: { ui: 'компактная', info: 'высокая' },
        images: { photoStyle: 'чёткие, холодные тона, графики', illustrationStyle: 'изометричные, grid-основа' },
        icons: { strokeWidth: 1.5 },
        letterSpacing: { heading: '-0.02em', body: '0' },
        layout: { maxWidth: '1400px' }
      }
    },
    {
      id: 'retro', name: 'Ретро', color: '#6B4423', icon: 'tabler-book',
      desc: 'Приглушённые тона, плёночная текстура, винтаж',
      radius: [6, 10, 14], shadow: 'soft', scale: 'standard', space: 5,
      paletteIds: ["film-70s","olive-film","rusty-postcard"],
      allowedPaletteIds: ["old-coffee","mustard-poster"],
      fontPairIds: ["pair18","pair25","pair21","pair2"],
      allowedFontPairIds: ["pair12","pair1"],
      styleConfig: {
        effects: { blur: false, glassmorphism: false, noise: { enabled: true, opacity: '8%' }, glow: false },
        borders: { thickness: '2px', style: 'solid' },
        animation: { style: 'игривый', fast: '300ms', normal: '400ms', slow: '700ms', easing: 'ease-out' },
        components: { button: { ghost: 'muted text, 1px frame on hover', destructive: 'muted burgundy' }, navigation: { style: 'topbar', height: '56px' }, modal: { width: '480px' }, badge: { variants: ['default','success','warning','error','info'] } },
        density: { ui: 'комфортная', info: 'средняя' },
        images: { photoStyle: 'тёплые с зерном, винтажные фильтры', illustrationStyle: 'принты 70-х, тёплая палитра' },
        icons: { strokeWidth: 2 },
        letterSpacing: { heading: '0.02em', body: '0' },
        layout: { maxWidth: '1140px' }
      }
    },
    {
      id: 'nature', name: 'Природный', color: '#065F46', icon: 'tabler-world',
      desc: 'Землистые оттенки, натуральные фактуры, зелень',
      radius: [10, 14, 20], shadow: 'soft', scale: 'standard', space: 5,
      paletteIds: ["deep-forest","moss","sage"],
      allowedPaletteIds: ["clay-grass","pine-shadow"],
      fontPairIds: ["pair25","pair2","pair3","pair30"],
      allowedFontPairIds: ["pair18","pair19"],
      styleConfig: {
        effects: { blur: false, glassmorphism: false, noise: { enabled: true, opacity: '4%' }, glow: false },
        borders: { thickness: '1px', style: 'solid' },
        animation: { style: 'сдержанный', fast: '200ms', normal: '350ms', slow: '600ms', easing: 'ease-in-out' },
        components: { button: { ghost: 'earthy text, bg on hover', destructive: 'earthy terracotta' }, navigation: { style: 'topbar', height: '56px' }, modal: { width: '480px' }, badge: { variants: ['default','success','warning','error','info'] } },
        density: { ui: 'просторная', info: 'низкая' },
        images: { photoStyle: 'натуральный свет, живые текстуры', illustrationStyle: 'акварельные, землистые тона' },
        icons: { strokeWidth: 2 },
        letterSpacing: { heading: '0', body: '0' },
        layout: { maxWidth: '1200px' }
      }
    }
  ];

  const SHADOWS = {
    soft: { subtle: '0 1px 2px rgba(28,25,23,.06), 0 1px 3px rgba(28,25,23,.05)', medium: '0 4px 6px rgba(28,25,23,.08), 0 10px 24px rgba(28,25,23,.07)', focus: null },
    medium: { subtle: '0 2px 4px rgba(28,25,23,.08)', medium: '0 8px 16px rgba(28,25,23,.10), 0 16px 40px rgba(28,25,23,.10)', focus: null },
    strong: { subtle: '0 3px 6px rgba(28,25,23,.10)', medium: '0 12px 24px rgba(28,25,23,.14), 0 24px 60px rgba(28,25,23,.20)', focus: null },
    none: { subtle: 'none', medium: 'none', focus: null },
    brutal: { subtle: null, medium: null, focus: null },
    glow: { subtle: null, medium: null, focus: null },
  };

  function buildShadow(shadowName, accent) {
    const base = SHADOWS[shadowName] || SHADOWS.soft;
    const r = parseInt(accent.slice(1,3), 16);
    const g = parseInt(accent.slice(3,5), 16);
    const b = parseInt(accent.slice(5,7), 16);
    if (shadowName === 'glow') {
      return {
        subtle: '0 0 12px rgba(' + r + ',' + g + ',' + b + ',.35)',
        medium: '0 0 22px rgba(' + r + ',' + g + ',' + b + ',.5), 0 4px 14px rgba(0,0,0,.5)',
        focus: '0 0 0 3px rgba(' + r + ',' + g + ',' + b + ',.4)'
      };
    }
    if (shadowName === 'brutal') {
      return {
        subtle: '4px 4px 0 rgba(' + r + ',' + g + ',' + b + ',1)',
        medium: '5px 5px 0 rgba(' + r + ',' + g + ',' + b + ',1), 9px 9px 0 rgba(' + r + ',' + g + ',' + b + ',.18)',
        focus: '0 0 0 3px rgba(' + r + ',' + g + ',' + b + ',.3)'
      };
    }
    return {
      subtle: base.subtle,
      medium: base.medium,
      focus: '0 0 0 3px rgba(' + r + ',' + g + ',' + b + ',.25)'
    };
  }

  const TYPE_SCALES = { compact: { title: 26, body: 14 }, standard: { title: 32, body: 15 }, large: { title: 40, body: 17 } };

  const loadedFonts = new Set();

  const wizard = {
    step: 1,
    paletteId: null,
    fontPairId: null,
    headingFont: '',
    bodyFont: '',
    conceptId: null,
    themeMode: null, // 'light' | 'dark' — переопределение темы пользователем
  };

  function fontCss(family) {
    const f = FONTS.find((x) => x.family === family);
    return f ? f.css : 'https://fonts.googleapis.com/css2?family=' + family.split(' ').join('+') + ':wght@400;500;600';
  }

  function loadFont(family) {
    if (loadedFonts.has(family)) return;
    loadedFonts.add(family);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontCss(family);
    document.head.appendChild(link);
  }

  function goto(name) {
    $$('.screen').forEach((s) => {
      const active = s.id === name;
      s.classList.toggle('is-active', active);
      s.hidden = !active;
    });
    window.scrollTo(0, 0);
  }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
  }

  function wizardGo(step) {
    wizard.step = step;
    for (let i = 1; i <= 4; i++) {
      const panel = $('#wizard-step-' + i);
      const marker = $('.wizard-step[data-step="' + i + '"]');
      if (panel) { panel.hidden = i !== step; }
      if (marker) { marker.classList.toggle('is-active', i === step); }
    }
    const backBtn = $('#wizard-back-btn');
    backBtn.textContent = step === 1 ? 'Отмена' : 'Назад';
    if (step === 1) backBtn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#tabler-x"></use></svg> Отмена';
    else backBtn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#tabler-arrow-left"></use></svg> Назад';

    const nextBtn = $('#wizard-next-btn');
    nextBtn.hidden = step === 4;
    renderFooterSelection();

    // Перерисовывать палитры и шрифты при входе на шаги 2 и 3
    if (step === 2) renderPalettes();
    if (step === 3) renderFontPairs();

    // Показывать FAB и слайдер темы только на шаге 4
    const fab = $('#edit-toggle-btn');
    if (fab) fab.hidden = step !== 4;
    const themeArea = $('#theme-toggle-area');
    if (themeArea) themeArea.hidden = step !== 4;

    if (step === 4) {
      const p = getPalette();
      if (!wizard.themeMode) wizard.themeMode = p.primaryMode || p.colorSystem?.mode || 'light';
      renderStep4(); renderEditPanel();
    }
    // Закрыть drawer при переходе на другой шаг
    if (step !== 4) {
      const panel = $('#edit-panel');
      if (panel) panel.hidden = true;
    }
  }

  function renderFooterSelection() {
    const concept = getConcept();
    const palette = getPalette();
    const cs = getSemanticColors(palette);
    const pair = getFontPair();
    const step = wizard.step;

    const conceptEl = $('#wiz-sel-concept');
    const palEl = $('#wiz-sel-palette');
    const fontEl = $('#wiz-sel-fonts');

    /* Concept: visible only after step >= 1 and concept selected */
    if (step >= 1 && wizard.conceptId) {
      conceptEl.innerHTML = '<span class="wiz-sel-label">' + concept.name + '</span>';
      conceptEl.hidden = false;
    } else { conceptEl.hidden = true; }

    /* Palette: visible only after step >= 2 and palette selected */
    if (step >= 2 && wizard.paletteId) {
      palEl.innerHTML =
        '<span class="wiz-dot" style="background:' + cs.background + '" title="фон"></span>' +
        '<span class="wiz-dot" style="background:' + cs.surface + '" title="поверхность"></span>' +
        '<span class="wiz-dot" style="background:' + cs.accent + '" title="акцент"></span>' +
        '<span class="wiz-dot" style="background:' + cs.textPrimary + '" title="текст"></span>';
      palEl.hidden = false;
    } else { palEl.hidden = true; }

    /* Fonts: visible only after step >= 3 and font pair selected */
    if (step >= 3 && wizard.fontPairId) {
      fontEl.innerHTML =
        '<span class="wiz-font-sample" style="font-family:\'' + pair.heading + '\',sans-serif;font-weight:' + pair.hw + '">Заголовок</span>' +
        '<span class="wiz-font-divider"></span>' +
        '<span class="wiz-font-sample wiz-font-body" style="font-family:\'' + pair.body + '\',sans-serif;font-weight:' + pair.bw + '">Основной текст</span>';
      fontEl.hidden = false;
    } else { fontEl.hidden = true; }
  }

  function renderPalettes() {
    const grid = $('#palette-grid');
    grid.innerHTML = '';
    const concept = getConcept();
    const recommended = concept.paletteIds || [];
    const allowed = concept.allowedPaletteIds || [];
    const recPalettes = PALETTES.filter(p => recommended.includes(p.id));
    const allowedPalettes = PALETTES.filter(p => allowed.includes(p.id));

    if (recPalettes.length) {
      const head = document.createElement('div');
      head.className = 'section-heading'; head.textContent = 'Рекомендуемые палитры';
      grid.appendChild(head);
    }
    recPalettes.forEach((p) => { buildPaletteCard(grid, p, recommended); });
    if (allowedPalettes.length) {
      const head = document.createElement('div');
      head.className = 'section-heading'; head.textContent = 'Допустимые палитры';
      grid.appendChild(head);
    }
    allowedPalettes.forEach((p) => { buildPaletteCard(grid, p, recommended); });
  }

  function buildPaletteCard(grid, p, recommended) {
    const shellDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (!p.primaryMode) getSemanticColors(p); // вычисляет primaryMode
    const pPrimary = p.primaryMode || 'light';
    const useAlt = shellDark !== (pPrimary === 'dark');
    const cs = getSemanticColors(p, useAlt);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'palette-card' + (wizard.paletteId === p.id ? ' is-active' : '');
    card.dataset.id = p.id;
    const isD = cs.mode === 'dark';
    card.style.setProperty('--pc-text', isD ? '#fff' : '#111');
    card.innerHTML =
      '<div class="palette-swatches">' +
      '<span class="palette-swatch" style="background:' + cs.background + ';width:32%" title="фон"></span>' +
      '<span class="palette-swatch" style="background:' + cs.surface + ';width:22%" title="поверхность"></span>' +
      '<span class="palette-swatch" style="background:' + cs.border + ';width:10%" title="граница"></span>' +
      '<span class="palette-swatch" style="background:' + cs.accent + ';width:18%" title="акцент"></span>' +
      '<span class="palette-swatch" style="background:' + cs.textPrimary + ';width:18%" title="текст"></span>' +
      '</div>' +
      '<span class="palette-name">' + p.name + '</span>';
    card.addEventListener('click', () => {
      wizard.paletteId = p.id;
      wizard.themeMode = null;
      $$('.palette-card').forEach((c) => c.classList.toggle('is-active', c.dataset.id === p.id));
      renderFooterSelection();
    });
    grid.appendChild(card);
  }

  function renderFontPairs() {
    const grid = $('#wizard-font-pairs');
    grid.innerHTML = '';
    const concept = getConcept();
    const recommended = concept.fontPairIds || [];
    const allowed = concept.allowedFontPairIds || [];
    const recFonts = FONT_PAIRS.filter(p => recommended.includes(p.id));
    const allowedFonts = FONT_PAIRS.filter(p => allowed.includes(p.id));

    if (recFonts.length) {
      const head = document.createElement('div');
      head.className = 'section-heading'; head.textContent = 'Шрифтовые пары';
      grid.appendChild(head);
    }
    recFonts.forEach((pair) => { buildFontCard(grid, pair); });
    if (allowedFonts.length) {
      const head = document.createElement('div');
      head.className = 'section-heading'; head.textContent = 'Альтернативы';
      grid.appendChild(head);
    }
    allowedFonts.forEach((pair) => { buildFontCard(grid, pair); });
    renderTypePreview();
  }

  function buildFontCard(grid, pair) {
    loadFont(pair.heading);
    loadFont(pair.body);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'font-pair-card' + (wizard.fontPairId === pair.id ? ' is-active' : '');
    card.dataset.id = pair.id;
    card.innerHTML =
      '<span class="font-pair-badge">' + pair.name + '</span>' +
      '<span class="font-pair-heading" style="font-family:\'' + pair.heading + '\',sans-serif;font-weight:' + pair.hw + '">Заголовок</span>' +
      '<span class="font-pair-body" style="font-family:\'' + pair.body + '\',sans-serif;font-weight:' + pair.bw + '">Основной текст</span>' +
      '<span class="font-pair-note">' + pair.note + '</span>';
    card.addEventListener('click', () => {
      wizard.fontPairId = pair.id;
      wizard.headingFont = pair.heading;
      wizard.bodyFont = pair.body;
      loadFont(pair.heading);
      loadFont(pair.body);
      renderTypePreview();
      renderFooterSelection();
      $$('.font-pair-card').forEach((c) => c.classList.toggle('is-active', c.dataset.id === pair.id));
    });
    grid.appendChild(card);
  }

  function renderTypePreview() {
    const pair = FONT_PAIRS.find((p) => p.id === wizard.fontPairId) || FONT_PAIRS[0];
    const preview = $('#wizard-type-preview');
    preview.style.setProperty('--w-heading-font', "'" + pair.heading + "', system-ui, sans-serif");
    preview.style.setProperty('--w-body-font', "'" + pair.body + "', system-ui, sans-serif");
    preview.style.setProperty('--w-heading-weight', pair.hw);
    preview.style.setProperty('--w-body-weight', pair.bw);
  }

  function conceptBadges(sc) { return ''; }

  function renderConcepts() {
    const grid = $('#concept-grid');
    grid.innerHTML = '';
    const shellDark = document.documentElement.getAttribute('data-theme') === 'dark';

    DESIGN_CONCEPTS.forEach((c) => {
      /* Первая рекомендуемая палитра и шрифт */
      const firstPalId = (c.paletteIds || [])[0] || PALETTES[0].id;
      const palette = PALETTES.find(p => p.id === firstPalId) || PALETTES[0];
      const firstFontId = (c.fontPairIds || [])[0] || FONT_PAIRS[0].id;
      const fontPair = FONT_PAIRS.find(f => f.id === firstFontId) || FONT_PAIRS[0];
      loadFont(fontPair.heading);
      loadFont(fontPair.body);

      /* Определяем тему карточки по теме оболочки */
      if (!palette.primaryMode) getSemanticColors(palette); // вычисляет primaryMode
      const pPrimary = palette.primaryMode || 'light';
      const useAlt = shellDark !== (pPrimary === 'dark');
      const cs = getSemanticColors(palette, useAlt);

      const isD = cs.mode === 'dark';
      const descColor = isD ? cs.textMuted : cs.textSecondary;
      const radii = c.radius || [8, 12, 16];

      /* Дополнительные стили по концепции */
      const sc = c.styleConfig || {};
      const glow = sc.effects?.glow;
      const glass = sc.effects?.glassmorphism;
      let cardShadow = 'var(--shadow-subtle)';
      if (glow && glow.enabled && isD) {
        cardShadow = '0 0 ' + (glow.intensity || '20px') + ' ' + cs.accent + '33';
      } else if (c.shadow === 'medium') {
        cardShadow = 'var(--shadow-medium)';
      } else if (c.shadow === 'none') {
        cardShadow = 'none';
      }

      let cardBg = cs.background;
      if (glass && isD) {
        cardBg = cs.surface;
      }

      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'concept-card' + (wizard.conceptId === c.id ? ' is-active' : '');
      card.dataset.id = c.id;
      card.style.cssText =
        'background:' + cardBg +
        ';color:' + cs.textPrimary +
        ';font-family:\'' + fontPair.body + '\',sans-serif' +
        ';border-color:' + cs.border +
        ';border-radius:' + radii[1] + 'px' +
        ';box-shadow:' + cardShadow;
      card.innerHTML =
        '<span class="concept-name" style="background:' + cs.accent + ';color:#fff;font-family:\'' + fontPair.heading + '\',sans-serif;font-weight:' + fontPair.hw + '">' + c.name + '</span>' +
        '<span class="concept-desc" style="color:' + descColor + '">' + c.desc + '</span>';
      card.addEventListener('click', () => {
        wizard.conceptId = c.id;
        const recPalettes = c.paletteIds || [];
        const allowedPalettes = c.allowedPaletteIds || [];
        if (!recPalettes.concat(allowedPalettes).includes(wizard.paletteId)) {
          wizard.paletteId = recPalettes[0] || allowedPalettes[0] || PALETTES[0].id;
        }
        const recFonts = c.fontPairIds || [];
        const allowedFonts = c.allowedFontPairIds || [];
        if (!recFonts.concat(allowedFonts).includes(wizard.fontPairId)) {
          wizard.fontPairId = recFonts[0] || allowedFonts[0] || FONT_PAIRS[0].id;
          const pair = getFontPair();
          wizard.headingFont = pair.heading;
          wizard.bodyFont = pair.body;
          loadFont(pair.heading);
          loadFont(pair.body);
        }
        $$('.concept-card').forEach((x) => x.classList.toggle('is-active', x.dataset.id === c.id));
        renderFooterSelection();
      });
      grid.appendChild(card);
    });
  }

  function getPalette() { return PALETTES.find((p) => p.id === wizard.paletteId) || PALETTES[0]; }
  function getFontPair() { return FONT_PAIRS.find((p) => p.id === wizard.fontPairId) || FONT_PAIRS[0]; }
  function getConcept() { return DESIGN_CONCEPTS.find((c) => c.id === wizard.conceptId) || DESIGN_CONCEPTS[0]; }

  function getSafeColors(palette) {
    const pMode = palette.primaryMode || palette.colorSystem?.mode;
    const useAlt = wizard.themeMode && pMode && wizard.themeMode !== pMode;
    return getSemanticColors(palette, useAlt);
  }

  function renderStep4() {
    const palette = getPalette();
    const pair = getFontPair();
    const concept = getConcept();
    const cs = getSafeColors(palette);
    const bg = cs.background, surface = cs.surface, text = cs.textPrimary;
    const textMuted = cs.textMuted, accent = cs.accent;
    const isD = cs.mode === 'dark';
    const primaryMode = palette.primaryMode || palette.colorSystem?.mode || analyzePalette(palette.colors).mode;
    const isAltTheme = wizard.themeMode && wizard.themeMode !== primaryMode;
    const scale = TYPE_SCALES[concept.scale] || TYPE_SCALES.standard;
    const radii = concept.radius;
    const shadow = buildShadow(concept.shadow, accent);

    const badge = $('#preview-info-badge');
    const hf = wizard.headingFont || pair.heading;
    const bf = wizard.bodyFont || pair.body;
    loadFont(hf); loadFont(bf);
    badge.innerHTML =
      '<span class="badge-item"><span class="badge-dot" style="background:' + cs.background + '"></span>' + palette.name + '</span>' +
      '<span class="badge-sep"></span>' +
      '<span class="badge-item">' + hf + ' + ' + bf + '</span>' +
      '<span class="badge-sep"></span>' +
      '<span class="badge-item">' + concept.name + '</span>';

    // Theme slider
    const themeArea = $('#theme-toggle-area');
    const themeSlider = $('#theme-toggle-slider');
    if (themeArea && themeSlider) {
      themeArea.hidden = false;
      themeSlider.checked = cs.mode === 'dark';
    }

    const wrap = $('#final-preview');
    wrap.style.cssText = '--fp-bg:' + bg + ';--fp-surface:' + surface + ';--fp-text:' + text + ';--fp-text-muted:' + textMuted + ';--fp-accent:' + accent + ';--fp-font:\'' + hf + '\',system-ui,sans-serif;--fp-body-font:\'' + bf + '\',system-ui,sans-serif;--fp-heading-weight:600;--fp-body-weight:400;--fp-title-size:' + scale.title + 'px;--fp-body-size:' + scale.body + 'px;--fp-radius-sm:' + radii[0] + 'px;--fp-radius-md:' + radii[1] + 'px;--fp-radius-lg:' + radii[2] + 'px;--fp-shadow-subtle:' + shadow.subtle + ';--fp-shadow-medium:' + shadow.medium + ';background:var(--fp-bg);color:var(--fp-text);font-family:var(--fp-body-font)';

    wrap.innerHTML =
      '<header style="display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid var(--fp-text-muted);opacity:.85">' +
        '<span style="font-family:var(--fp-font);font-weight:var(--fp-heading-weight);font-size:18px;color:var(--fp-text)">DSgen</span>' +
        '<nav style="display:flex;gap:16px;align-items:center">' +
          '<a href="#" style="color:var(--fp-text-muted);text-decoration:none;font-size:var(--fp-body-size)">Возможности</a>' +
          '<a href="#" style="color:var(--fp-text-muted);text-decoration:none;font-size:var(--fp-body-size)">Цены</a>' +
          '<a href="#" style="color:var(--fp-text-muted);text-decoration:none;font-size:var(--fp-body-size)">О нас</a>' +
          '<span style="display:inline-block;padding:6px 14px;background:var(--fp-accent);color:#fff;border-radius:var(--fp-radius-sm);font-size:var(--fp-body-size);font-weight:600">Войти</span>' +
        '</nav>' +
      '</header>' +
      '<main style="padding:32px;max-width:720px;margin:0 auto">' +
        '<section style="margin-bottom:32px">' +
          '<p style="color:var(--fp-accent);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px">Платформа</p>' +
          '<h1 style="font-family:var(--fp-font);font-weight:var(--fp-heading-weight);font-size:var(--fp-title-size);margin:0 0 12px;line-height:1.2">Дизайн-система за минуты</h1>' +
          '<p style="color:var(--fp-text-muted);font-size:var(--fp-body-size);line-height:1.6;margin:0 0 20px;max-width:560px">Выберите палитру, шрифты и концепцию — всё остальное соберётся само. Цвета, типографика, отступы и радиусы из токенов.</p>' +
          '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
            '<span style="display:inline-block;padding:10px 22px;background:var(--fp-accent);color:#fff;border-radius:var(--fp-radius-md);font-size:var(--fp-body-size);font-weight:600;border:none;cursor:default">Начать проект</span>' +
            '<span style="display:inline-block;padding:10px 22px;background:var(--fp-surface);color:var(--fp-text);border-radius:var(--fp-radius-md);font-size:var(--fp-body-size);font-weight:500;border:1px solid var(--fp-text-muted);cursor:default">Подробнее</span>' +
          '</div>' +
        '</section>' +
        '<div style="display:flex;gap:16px;margin-bottom:32px;flex-wrap:wrap">' +
          '<div style="flex:1;min-width:100px;padding:16px;background:var(--fp-surface);border-radius:var(--fp-radius-md);box-shadow:var(--fp-shadow-subtle)">' +
            '<span style="display:block;font-size:20px;font-weight:700;font-family:var(--fp-font)">' + radii[0] + 'px</span>' +
            '<span style="color:var(--fp-text-muted);font-size:13px">базовый радиус</span>' +
          '</div>' +
          '<div style="flex:1;min-width:100px;padding:16px;background:var(--fp-surface);border-radius:var(--fp-radius-md);box-shadow:var(--fp-shadow-subtle)">' +
            '<span style="display:block;font-size:20px;font-weight:700;font-family:var(--fp-font)">' + scale.title + '/' + scale.body + '</span>' +
            '<span style="color:var(--fp-text-muted);font-size:13px">масштаб заг/текст</span>' +
          '</div>' +
          '<div style="flex:1;min-width:100px;padding:16px;background:var(--fp-surface);border-radius:var(--fp-radius-md);box-shadow:var(--fp-shadow-subtle)">' +
            '<span style="display:block;font-size:20px;font-weight:700;font-family:var(--fp-font)">AA</span>' +
            '<span style="color:var(--fp-text-muted);font-size:13px">контраст WCAG</span>' +
          '</div>' +
        '</div>' +
        '<blockquote style="margin:0 0 32px;padding:20px 24px;border-left:4px solid var(--fp-accent);background:var(--fp-surface);border-radius:0 var(--fp-radius-sm) var(--fp-radius-sm) 0;box-shadow:var(--fp-shadow-subtle)">' +
          '<p style="margin:0 0 8px;font-size:var(--fp-body-size);line-height:1.6;font-style:italic">«Дизайн — это не то, как это выглядит. Дизайн — это то, как это работает.»</p>' +
          '<cite style="color:var(--fp-text-muted);font-size:13px;font-style:normal">— Стив Джобс</cite>' +
        '</blockquote>' +
        '<div style="display:flex;gap:16px;margin-bottom:32px;flex-wrap:wrap">' +
          '<article style="flex:1;min-width:200px;padding:20px;background:var(--fp-surface);border-radius:var(--fp-radius-lg);box-shadow:var(--fp-shadow-medium)">' +
            '<h3 style="font-family:var(--fp-font);font-weight:var(--fp-heading-weight);font-size:18px;margin:0 0 8px">Палитра</h3>' +
            '<p style="color:var(--fp-text-muted);font-size:var(--fp-body-size);line-height:1.5;margin:0 0 12px">' + cs.mode + ' · семантические токены</p>' +
            '<div style="display:flex;gap:4px">' +
              '<span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:' + cs.background + ';border:1px solid rgba(0,0,0,.08)" title="background"></span>' +
              '<span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:' + cs.surface + ';border:1px solid rgba(0,0,0,.08)" title="surface"></span>' +
              '<span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:' + cs.border + ';border:1px solid rgba(0,0,0,.08)" title="border"></span>' +
              '<span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:' + cs.accent + ';border:1px solid rgba(0,0,0,.08)" title="accent"></span>' +
              '<span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:' + cs.textPrimary + ';border:1px solid rgba(0,0,0,.08)" title="text"></span>' +
            '</div>' +
          '</article>' +
          '<article style="flex:1;min-width:200px;padding:20px;background:var(--fp-surface);border-radius:var(--fp-radius-lg);box-shadow:var(--fp-shadow-medium)">' +
            '<h3 style="font-family:var(--fp-font);font-weight:var(--fp-heading-weight);font-size:18px;margin:0 0 8px">Типографика</h3>' +
            '<p style="color:var(--fp-text-muted);font-size:var(--fp-body-size);line-height:1.5;margin:0 0 12px">' + pair.heading + ' + ' + pair.body + '</p>' +
            '<div style="display:flex;gap:6px"><span style="font-family:\'' + pair.heading + '\',sans-serif;font-weight:' + pair.hw + '">Aa</span><span style="font-family:\'' + pair.body + '\',sans-serif;font-weight:' + pair.bw + '">Бб</span></div>' +
          '</article>' +
        '</div>' +
        '<form style="margin-bottom:32px;padding:20px;background:var(--fp-surface);border-radius:var(--fp-radius-md);box-shadow:var(--fp-shadow-subtle)" onsubmit="return false">' +
          '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:var(--fp-text)">Имя проекта</label>' +
          '<div style="display:flex;gap:10px">' +
            '<input type="text" value="Мой проект" style="flex:1;padding:10px 14px;border:1px solid var(--fp-text-muted);background:var(--fp-bg);color:var(--fp-text);border-radius:var(--fp-radius-sm);font-size:var(--fp-body-size);outline:none" readonly>' +
            '<span style="display:inline-block;padding:10px 20px;background:var(--fp-accent);color:#fff;border-radius:var(--fp-radius-sm);font-weight:600;font-size:var(--fp-body-size);cursor:default">Создать</span>' +
          '</div>' +
        '</form>' +
        '<ul style="list-style:none;padding:0;margin:0">' +
          '<li style="padding:8px 0;border-bottom:1px solid var(--fp-surface);font-size:var(--fp-body-size)"><span style="font-weight:600;font-family:var(--fp-font)">Палитра</span> — пять оттенков по цветовому кругу</li>' +
          '<li style="padding:8px 0;border-bottom:1px solid var(--fp-surface);font-size:var(--fp-body-size)"><span style="font-weight:600;font-family:var(--fp-font)">Типографика</span> — вес, кегль и масштаб из токенов</li>' +
          '<li style="padding:8px 0;font-size:var(--fp-body-size)"><span style="font-weight:600;font-family:var(--fp-font)">Отступы</span> — единый шаг на базе ' + concept.space * 4 + '·' + concept.space * 8 + ' px</li>' +
        '</ul>' +
      '</main>' +
      '<footer style="padding:16px;text-align:center;border-top:1px solid var(--fp-surface);color:var(--fp-text-muted);font-size:13px">' +
        'Сгенерировано в DSgen · ' + palette.name + ' · ' + concept.name +
      '</footer>';

    /* ---- Mobile preview ---- */
    const mp = $('#mobile-preview');
    mp.style.cssText = 'display:flex;justify-content:center;padding:24px 0 40px;background:var(--fp-bg);color:var(--fp-text);font-family:var(--fp-body-font)';
    mp.innerHTML =
      '<div class="phone-frame">' +
        '<div class="phone-notch"></div>' +
        '<div class="phone-screen" style="background:' + bg + ';color:' + text + ';font-family:\'' + bf + '\',sans-serif">' +
          /* Status bar */
          '<div style="display:flex;justify-content:space-between;padding:8px 16px;font-size:11px;font-weight:600;color:' + textMuted + '">' +
            '<span>9:41</span><span>●●●</span>' +
          '</div>' +
          /* Header */
          '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid ' + mix(bg, text, 0.1) + '">' +
            '<span style="font-family:\'' + hf + '\',sans-serif;font-weight:600;font-size:17px;color:' + text + '">Мой APP</span>' +
            '<div style="width:24px;height:24px;border-radius:50%;background:' + accent + ';display:flex;align-items:center;justify-content:center"><svg style="width:14px;height:14px" aria-hidden="true"><use href="#tabler-palette"></use></svg></div>' +
          '</div>' +
          /* Content */
          '<div style="padding:16px">' +
            '<p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:' + accent + ';margin:0 0 6px">Привет</p>' +
            '<h2 style="font-family:\'' + hf + '\',sans-serif;font-weight:600;font-size:20px;margin:0 0 8px;color:' + text + '">Добро пожаловать</h2>' +
            '<p style="font-size:13px;line-height:1.5;color:' + textMuted + ';margin:0 0 16px">Это мобильное приложение использует вашу дизайн-систему с теми же токенами, цветами и шрифтами.</p>' +
            /* Card */
            '<div style="padding:16px;background:' + surface + ';border-radius:' + radii[2] + 'px;box-shadow:' + shadow.subtle + ';margin-bottom:16px">' +
              '<div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">' +
                '<div style="width:36px;height:36px;border-radius:' + radii[1] + 'px;background:' + accent + ';flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff"><svg style="width:18px;height:18px" aria-hidden="true"><use href="#tabler-palette"></use></svg></div>' +
                '<div><div style="font-weight:600;font-size:14px;color:' + text + '">Статус проекта</div><div style="font-size:12px;color:' + textMuted + '">3 задачи завершены</div></div>' +
              '</div>' +
              '<div style="height:6px;border-radius:3px;background:' + mix(accent, bg, 0.85) + ';overflow:hidden"><div style="width:70%;height:100%;border-radius:3px;background:' + accent + '"></div></div>' +
            '</div>' +
            /* Form field */
            '<div style="margin-bottom:12px">' +
              '<label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;color:' + text + '">Имя</label>' +
              '<input type="text" value="Иван Петров" readonly style="width:100%;padding:10px 12px;border:1px solid ' + mix(bg, text, 0.15) + ';border-radius:' + radii[0] + 'px;background:' + bg + ';color:' + text + ';font-size:13px;outline:none;font-family:inherit">' +
            '</div>' +
            /* Primary button */
            '<button style="width:100%;padding:12px;border:none;border-radius:' + radii[1] + 'px;background:' + accent + ';color:#fff;font-weight:600;font-size:14px;cursor:default;font-family:inherit;margin-bottom:10px">Отправить</button>' +
            /* Secondary button */
            '<button style="width:100%;padding:12px;border:1px solid ' + mix(bg, text, 0.15) + ';border-radius:' + radii[1] + 'px;background:transparent;color:' + text + ';font-weight:500;font-size:14px;cursor:default;font-family:inherit">Отмена</button>' +
          '</div>' +
          /* Bottom nav */
          '<div style="display:flex;justify-content:space-around;padding:10px 0;border-top:1px solid ' + mix(bg, text, 0.1) + ';margin-top:auto">' +
            '<span style="display:flex;flex-direction:column;align-items:center;gap:2px;font-size:10px;color:' + accent + '"><svg style="width:20px;height:20px" aria-hidden="true"><use href="#tabler-world"></use></svg>Главная</span>' +
            '<span style="display:flex;flex-direction:column;align-items:center;gap:2px;font-size:10px;color:' + textMuted + '"><svg style="width:20px;height:20px" aria-hidden="true"><use href="#tabler-search"></use></svg>Поиск</span>' +
            '<span style="display:flex;flex-direction:column;align-items:center;gap:2px;font-size:10px;color:' + textMuted + '"><svg style="width:20px;height:20px" aria-hidden="true"><use href="#tabler-settings"></use></svg>Профиль</span>' +
          '</div>' +
        '</div>' +
      '</div>';

    /* Tab switching */
    const tabs = $$('.preview-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        const target = tab.dataset.tab;
        wrap.hidden = target !== 'web';
        mp.hidden = target !== 'mobile';
      });
    });
  }

  /* ---------- Генераторы ---------- */

  function generateDesignMD() {
    const palette = getPalette();
    const pair = getFontPair();
    const concept = getConcept();
    const cs = getSafeColors(palette);
    const primaryCs = getSemanticColors(palette);
    const altCs = getSemanticColors(palette, true);
    const csLight = primaryCs.mode === 'light' ? primaryCs : altCs;
    const csDark = primaryCs.mode === 'dark' ? primaryCs : altCs;
    const bg = cs.background, surface = cs.surface, text = cs.textPrimary;
    const textMuted = cs.textMuted, accent = cs.accent;
    const isD = cs.mode === 'dark';
    const scale = TYPE_SCALES[concept.scale] || TYPE_SCALES.standard;
    const radii = concept.radius;
    const spaceBase = concept.space * 4;
    const sc = concept.styleConfig || {};
    const shadow = buildShadow(concept.shadow, accent);
    const date = new Date().toISOString().slice(0, 10);
    const secText = cs.textSecondary;
    const borderCol = cs.border;
    const sText = isD ? mix(text, '#ffffff', 0.2) : mix(text, '#ffffff', 0.4);
    const bgSubtle = isD ? mix(bg, '#ffffff', 0.04) : mix(bg, '#000000', 0.02);
    const surfaceElevated = cs.surfaceElevated;
    const surfaceHover = isD ? mix(surface, '#ffffff', 0.08) : mix(surface, '#000000', 0.03);
    const borderSubtle = cs.borderSubtle;

    const conceptKeywords = {
      strict: 'Строгий / Деловой / Чёткий', neon: 'Неоновый / Футуристический / Дерзкий', glass: 'Стеклянный / Мягкий / Современный', brutal: 'Брутальный / Резкий / Сырой', minimal: 'Минимальный / Чистый / Воздушный', premium: 'Премиальный / Элегантный / Тёмный', friendly: 'Дружелюбный / Тёплый / Мягкий', tech: 'Технологичный / Холодный / Точный', retro: 'Винтажный / Приглушённый / Ностальгический', nature: 'Природный / Землистый / Спокойный',
    };
    const keywords = conceptKeywords[concept.id] || 'Современный / Чистый';

    const effectsLines = [];
    if (sc.effects) {
      const e = sc.effects;
      effectsLines.push(`Blur: ${e.blur && e.blur.enabled ? '✅ ' + (e.blur.strength || '8px') : '❌'}`);
      effectsLines.push(`Glassmorphism: ${e.glassmorphism ? '✅' : '❌'}`);
      effectsLines.push(`Noise/Grain: ${e.noise && e.noise.enabled ? '✅ ' + (e.noise.opacity || '5%') : '❌'}`);
      effectsLines.push(`Glow: ${e.glow && e.glow.enabled ? '✅ ' + (e.glow.intensity || '10px') : '❌'}`);
    }

    const anim = sc.animation || {};
    const comp = sc.components || {};
    const density = sc.density || {};
    const images = sc.images || {};
    const icons = sc.icons || {};
    const ls = sc.letterSpacing || {};
    const borders = sc.borders || {};
    const layout = sc.layout || {};

    return `# ДИЗАЙН-СИСТЕМА

> Этот документ — источник истины по визуальному оформлению проекта.
> AI-агенты ОБЯЗАНЫ следовать этим правилам при создании или изменении UI.
> Не изобретайте визуальные стили, противоречащие этому документу.

---

# 1. ИДЕНТИЧНОСТЬ ДИЗАЙНА

## Продукт

**Название:** \`DSgen Project\`

**Тип:** \`Web App / SaaS\`

**Направление дизайна:**
\`${concept.name} / ${keywords}\`

## Ключевые слова дизайна

* \`${palette.name}\`
* \`${concept.name}\`
* \`${pair.name}\`
* \`Токены\`
* \`Дизайн-система\`

## Чего избегать

* Случайные HEX-цвета вне палитры
* Смешение разных шрифтовых семей
* Произвольные скругления
* ${borders.style === 'none' ? 'Границы и рамки' : 'Избыточные границы'}

---

# 2. ПРИНЦИПЫ ДИЗАЙНА

Интерфейс должен транслировать:

1. **${concept.name} характер** — ${concept.desc}
2. **Цельность** — единая система токенов для всех компонентов
3. **Доступность** — WCAG AA минимум для всех текстовых пар
4. **${anim.style || 'Сдержанность'}** — анимация только по необходимости

### Ключевое правило

Каждое визуальное решение должно поддерживать ощущение **${concept.name.toLowerCase()} эстетики**, а не конфликтовать с ней.

### Приоритет при конфликте решений

1. Юзабилити
2. Иерархия
3. Консистентность
4. Индивидуальность бренда
5. Декор

---

# 3. ЦВЕТОВАЯ СИСТЕМА

## Бренд

\`\`\`text
Primary:        ${accent}
Primary Hover:  ${cs.accentHover}
Primary Active: ${mix(accent, isD ? '#ffffff' : '#000000', 0.3)}
Secondary:      ${surface}
Secondary Hover: ${surfaceHover}
\`\`\`

## Фон

\`\`\`text
Background:        ${bg}
Background Subtle: ${bgSubtle}
Surface:            ${surface}
Surface Elevated:   ${surfaceElevated}
Surface Hover:       ${surfaceHover}
\`\`\`

## Текст

\`\`\`text
Text Primary:   ${text}
Text Secondary: ${secText}
Text Muted:     ${textMuted}
Text Disabled:  ${sText}
Text Inverse:   ${isD ? '#1C1917' : '#FFFFFF'}
\`\`\`

## Границы

\`\`\`text
Border:        ${borderCol}
Border Subtle: ${borderSubtle}
Border Strong: ${borderCol}
\`\`\`

## Семантические цвета

\`\`\`text
Success: ${cs.semantic.success}
Warning: ${cs.semantic.warning}
Error:   ${cs.semantic.error}
Info:    ${cs.semantic.info}
\`\`\`

## Правила по цвету

* Не вводи новые цвета без явной причины
* Отдавай предпочтение семантическим токенам
* Поддерживай достаточный контраст (WCAG AA минимум)
* Не используй градиенты, если они явно не разрешены
* Каждый цвет из палитры должен быть использован хотя бы в одном компоненте

### Палитра

\`\`\`text
${palette.colors.map((c, i) => `Color ${i + 1}: ${c}`).join('\n')}
\`\`\`

### Градиенты

\`\`\`text
Разрешены: НЕТ
\`\`\`

---

# 4. ТИПОГРАФИКА

## Семейства шрифтов

\`\`\`text
Основной:     "${pair.heading}"
Дополнительный: "${pair.body}"
Моноширинный:  "JetBrains Mono"
\`\`\`

## Шкала

\`\`\`text
Display:
Размер: ${scale.title + 8}px
Начертание: ${pair.hw}
Высота строки: 1.1
Межбуквенный интервал: ${ls.heading || '0'}

H1:
Размер: ${scale.title}px
Начертание: ${pair.hw}
Высота строки: 1.2

H2:
Размер: ${Math.round(scale.title * 0.8)}px
Начертание: ${pair.hw}
Высота строки: 1.25

H3:
Размер: ${Math.round(scale.title * 0.65)}px
Начертание: ${pair.hw}
Высота строки: 1.3

Body:
Размер: ${scale.body}px
Начертание: ${pair.bw}
Высота строки: 1.6

Small:
Размер: ${scale.body - 2}px
Начертание: ${pair.bw}
Высота строки: 1.5

Caption:
Размер: ${scale.body - 3}px
Начертание: ${pair.bw}
Высота строки: 1.4
\`\`\`

## Правила типографики

* Заголовки должны иметь чёткую иерархию по размеру и начертанию
* Основной текст должен оставаться легко читаемым (не менее ${scale.body}px)
* Не используй больше 3 семейств шрифтов
* Не меняй начертания произвольно
* Избегай избыточного uppercase
* Избегай слишком мелкого текста (< 12px)

---

# 5. СИСТЕМА ОТСТУПОВ

\`\`\`text
Базовая единица: ${spaceBase}px

3xs: ${Math.round(spaceBase / 4)}px
2xs: ${Math.round(spaceBase / 2)}px
xs:  ${spaceBase}px
sm:  ${spaceBase * 2}px
md:  ${spaceBase * 4}px
lg:  ${spaceBase * 6}px
xl:  ${spaceBase * 8}px
2xl: ${spaceBase * 12}px
3xl: ${spaceBase * 16}px
4xl: ${spaceBase * 24}px
\`\`\`

## Правила

* Отдавай предпочтение токенам отступов, а не произвольным значениям
* Поддерживай последовательный вертикальный ритм
* Связанные элементы — меньший отступ
* Разделы — больший отступ

---

# 6. РАЗМЕТКА (LAYOUT)

## Контейнер

\`\`\`text
Максимальная ширина: ${layout.maxWidth || '1200px'}
Горизонтальный паддинг: ${spaceBase * 6}px
\`\`\`

## Сетка

\`\`\`text
Колонки: 12
Промежуток (gap): ${spaceBase * 4}px
\`\`\`

## Точки перелома (Breakpoints)

\`\`\`text
Mobile:  640px
Tablet:  768px
Desktop: 1024px
Wide:    1280px
\`\`\`

## Принципы разметки

* Контент должен иметь чёткую визуальную иерархию
* Избегай неоправданно широких текстовых блоков (> 75 символов)
* Сохраняй выравнивание между разделами
* Используй одну и ту же систему контейнеров во всём приложении

---

# 7. СКРУГЛЕНИЕ УГЛОВ

\`\`\`text
None: 0
XS:   ${radii[0]}px
SM:   ${radii[1]}px
MD:   ${radii[2]}px
LG:   ${radii[2] * 1.5}px
XL:   ${radii[2] * 2}px
Full: 9999px
\`\`\`

## Правила

Примеры:
\`\`\`text
Кнопки:    ${radii[1]}px
Инпуты:    ${radii[0]}px
Карточки:  ${radii[2]}px
Диалоги:   ${radii[2] * 1.5}px
Бейджи:    9999px
\`\`\`

Не смешивай значения радиуса произвольно.

---

# 8. ГРАНИЦЫ И РАЗДЕЛИТЕЛИ

\`\`\`text
Обычная толщина: ${borders.thickness || '1px'}
Усиленная толщина: ${parseInt(borders.thickness) * 2 || '2'}px
Стиль: ${borders.style || 'solid'}
\`\`\`

Правила:

* Границы должны поддерживать иерархию, а не создавать визуальный шум
* Избегай избыточного количества границ
* Предпочитай мягкие границы на второстепенных поверхностях

---

# 9. ТЕНИ И ЭЛЕВАЦИЯ

## Шкала теней

\`\`\`text
None: none

SM:
${shadow.subtle}

MD:
${shadow.medium}

LG:
${shadow.medium}
\`\`\`

## Правила

* Используй тени только для передачи элевации
* Избегай избыточного эффекта «парящих карточек»
* Не используй тени как декор, если это не указано явно

---

# 10. КОМПОНЕНТЫ

## Кнопки

### Primary

\`\`\`text
Фон: ${accent}
Текст: ${isD ? bg : '#FFFFFF'}
Радиус: ${radii[1]}px
Высота: 44px
Паддинг: 10px 22px
Начертание: 600
\`\`\`

Состояния:
\`\`\`text
Default:  ${accent}
Hover:    ${cs.accentHover}
Active:   ${mix(accent, isD ? '#ffffff' : '#000000', 0.3)}
Focus:    ${shadow.focus}
Disabled: ${sText} bg, ${borderCol} text
Loading:  spinner + ${cs.accentSoft}
\`\`\`

### Secondary

\`\`\`text
Фон: ${surface}
Текст: ${text}
Граница: 1px solid ${borderCol}
Радиус: ${radii[1]}px
\`\`\`

### Ghost

\`\`\`text
Фон: transparent
Текст: ${accent}
Радиус: ${radii[1]}px
Поведение: ${comp.button && comp.button.ghost ? comp.button.ghost : 'hover — 10% accent bg'}
\`\`\`

### Destructive

\`\`\`text
Фон: #EF4444
Текст: #FFFFFF
Радиус: ${radii[1]}px
Поведение: ${comp.button && comp.button.destructive ? comp.button.destructive : 'hover — темнее'}
\`\`\`

## Инпуты

\`\`\`text
Высота: 44px
Радиус: ${radii[0]}px
Граница: 1px solid ${borderCol}
Фон: ${bg}
\`\`\`

Состояния:
\`\`\`text
Default: 1px solid ${borderCol}
Hover:   1px solid ${textMuted}
Focus:   ${shadow.focus}
Filled:  ${bg}
Error:   1px solid #EF4444
Disabled: ${bgSubtle} bg, ${sText} text
\`\`\`

## Карточки

\`\`\`text
Фон: ${surface}
Граница: ${borderCol}
Радиус: ${radii[2]}px
Паддинг: 20px
Тень: ${shadow.subtle}
\`\`\`

Правила:
* Карточки — основной строительный блок контента
* Hover: подъём на ${shadow.medium}

## Бейджи

\`\`\`text
Радиус: 9999px
Высота: 22px
Паддинг: 2px 10px
Размер шрифта: 13px
\`\`\`

Варианты:
\`\`\`text
Default: ${surface} bg, ${text} text
Success: #22C55E bg, white text
Warning: #F59E0B bg, white text
Error:   #EF4444 bg, white text
Info:    #3B82F6 bg, white text
\`\`\`

## Навигация

\`\`\`text
Стиль: ${comp.navigation ? comp.navigation.style : 'topbar'}
Высота: ${comp.navigation ? comp.navigation.height : '56px'}
Фон: ${bg}
\`\`\`

Правила:
* Активный элемент: ${accent} underline или bg
* Hover: ${surfaceHover} bg
* Размер иконки: 20px

## Модалки / диалоги

\`\`\`text
Ширина: ${comp.modal ? comp.modal.width : '480px'}
Радиус: ${radii[2]}px
Фон: ${surface}
Тень: ${shadow.medium}
\`\`\`

---

# 11. ИКОНОГРАФИЯ

\`\`\`text
Библиотека иконок: Lucide / Tabler
Размер по умолчанию: 20px
Толщина линии (stroke width): ${icons.strokeWidth || 1.5}
\`\`\`

Правила:

* Используй одно семейство иконок последовательно
* Не смешивай стили иконок
* Иконки должны нести смысл, а не декор
* Используй тултипы, если действие только с иконкой может быть неоднозначным

---

# 12. ИЗОБРАЖЕНИЯ

## Фотография

\`\`\`text
Стиль:
${images.photoStyle || 'Натуральный, без фильтров'}
\`\`\`

## Иллюстрации

\`\`\`text
Стиль:
${images.illustrationStyle || 'Минималистичные'}
\`\`\`

## Обработка изображений

\`\`\`text
Радиус: ${radii[2]}px
Соотношения сторон: 16:9 / 4:3 / 1:1
Оверлей: НЕТ
\`\`\`

Правила:
* Изображения должны поддерживать общий стиль концепции
* Не используй декоративные изображения без цели

---

# 13. АНИМАЦИЯ И ДВИЖЕНИЕ

## Общее

\`\`\`text
Стиль движения: ${anim.style || 'сдержанный'}
\`\`\`

## Длительность

\`\`\`text
Быстро:   ${anim.fast || '150ms'}
Обычно:   ${anim.normal || '250ms'}
Медленно: ${anim.slow || '400ms'}
\`\`\`

## Easing

\`\`\`text
По умолчанию: ${anim.easing || 'ease-out'}
\`\`\`

## Правила

* Анимация должна сообщать о состоянии или иерархии
* Избегай анимации ради декора
* Взаимодействие должно быть быстрым
* Уважай prefers-reduced-motion

---

# 14. АДАПТИВНОЕ ПОВЕДЕНИЕ

## Mobile

\`\`\`text
Одноколоночный layout, навигация — гамбургер, отступы ${spaceBase * 3}px
\`\`\`

## Tablet

\`\`\`text
Двухколоночный layout, навигация — topbar, отступы ${spaceBase * 4}px
\`\`\`

## Desktop

\`\`\`text
Многоколоночный layout, полная навигация, максимум ${layout.maxWidth || '1200px'}
\`\`\`

## Правила

* Не просто сжимай десктопный UI
* Навигация должна адаптироваться подходящим образом
* Тач-таргеты должны оставаться удобными (мин. 44x44px)
* Избегай горизонтального overflow

---

# 15. ТЁМНАЯ / СВЕТЛАЯ ТЕМА

## Светлая тема

\`\`\`text
Режим:        Светлая
Background:   ${csLight.background}
Surface:      ${csLight.surface}
Surface Elevated: ${csLight.surfaceElevated}
Border:       ${csLight.border}
Border Subtle: ${csLight.borderSubtle}
\`\`\`

\`\`\`text
Text Primary:   ${csLight.textPrimary}
Text Secondary: ${csLight.textSecondary}
Text Muted:     ${csLight.textMuted}
\`\`\`

\`\`\`text
Primary:       ${csLight.accent}
Primary Hover: ${csLight.accentHover}
Primary Soft:  ${csLight.accentSoft}
\`\`\`

\`\`\`text
Success: ${csLight.semantic.success}
Warning: ${csLight.semantic.warning}
Error:   ${csLight.semantic.error}
Info:    ${csLight.semantic.info}
\`\`\`

## Тёмная тема

\`\`\`text
Режим:        Тёмная
Background:   ${csDark.background}
Surface:      ${csDark.surface}
Surface Elevated: ${csDark.surfaceElevated}
Border:       ${csDark.border}
Border Subtle: ${csDark.borderSubtle}
\`\`\`

\`\`\`text
Text Primary:   ${csDark.textPrimary}
Text Secondary: ${csDark.textSecondary}
Text Muted:     ${csDark.textMuted}
\`\`\`

\`\`\`text
Primary:       ${csDark.accent}
Primary Hover: ${csDark.accentHover}
Primary Soft:  ${csDark.accentSoft}
\`\`\`

\`\`\`text
Success: ${csDark.semantic.success}
Warning: ${csDark.semantic.warning}
Error:   ${csDark.semantic.error}
Info:    ${csDark.semantic.info}
\`\`\`

Правила:

* Не просто инвертируй цвета
* Поддерживай иерархию и контраст в обоих режимах
* Семантические цвета должны оставаться узнаваемыми в обеих темах
* Светлая тема подходит для дневного использования
* Тёмная тема снижает нагрузку на глаза в условиях низкой освещённости

---

# 16. ДОСТУПНОСТЬ (ACCESSIBILITY)

Минимальные требования:

* Навигация с клавиатуры должна работать
* Состояния фокуса должны быть визуально заметны
* Интерактивные элементы нуждаются в доступных подписях (aria-label)
* Не полагайся только на цвет для передачи смысла
* Текст должен сохранять достаточный контраст
* Ошибки форм должны быть понятны пользователю
* Уважай предпочтения по снижению анимации

---

# 17. КОНТЕНТ И ПЛОТНОСТЬ UI

## Плотность

\`\`\`text
${density.ui || 'Комфортная'}
\`\`\`

## Информационная плотность

\`\`\`text
${density.info === 'высокая' ? 'Высокая — много данных на экране, компактные отступы' : density.info === 'низкая' ? 'Низкая — воздух, минимум элементов на экране' : 'Средняя — сбалансированный объём контента'}
\`\`\`

## Правила

\`\`\`text
${density.ui === 'компактная' ? 'Максимум информации, минимальные отступы' : density.ui === 'просторная' ? 'Просторный интерфейс, крупные отступы, фокус на контенте' : 'Сбалансированный интерфейс, комфортные отступы'}
\`\`\`

---

# 18. ВИЗУАЛЬНЫЕ ЭФФЕКТЫ

${effectsLines.length ? effectsLines.map(l => '## ' + l).join('\n\n') : '## Нет разрешённых эффектов'}

---

# 19. ДИЗАЙН-ПАТТЕРНЫ

Предпочитаемые паттерны:

* Токенизированные компоненты
* Последовательная цветовая система
* Чёткая иерархия заголовков
* ${density.ui === 'просторная' ? 'Минималистичные макеты' : density.ui === 'компактная' ? 'Плотные информационные макеты' : 'Сбалансированные макеты'}

Избегать:

* Случайных цветов и шрифтов
* Избыточного декора
* Конфликтующих визуальных стилей

---

# 20. СТРУКТУРА СТРАНИЦЫ

Типичная структура страницы:

\`\`\`text
Страница
├── Header / навигация
├── Hero / заголовок страницы
├── Основной контент
│   ├── Секция
│   ├── Секция
│   └── Секция
└── Footer / действия
\`\`\`

Правила:

* Все страницы следуют единой структуре
* Контент — главный герой
* Навигация не должна доминировать

---

# 21. СОСТОЯНИЯ UI

Каждый интерактивный компонент должен учитывать:

\`\`\`text
Default (по умолчанию)
Hover (наведение)
Active (нажатие)
Focus (фокус)
Disabled (недоступен)
Loading (загрузка)
Success (успех)
Error (ошибка)
Empty (пусто)
\`\`\`

Не реализуй только happy path.

---

# 22. ВИЗУАЛИЗАЦИЯ ДАННЫХ

\`\`\`text
Стиль графиков: минимальный

Линии сетки: НЕТ
Подписи: по необходимости
Тултипы: при наведении
Легенда: при необходимости
\`\`\`

Правила:

* Не используй декоративные графики
* Используй те же цветовые токены, что и в основном UI
* Применяй семантические цвета последовательно

---

# 23. ДИЗАЙН-ТОКЕНЫ

По возможности определяй токены в коде.

\`\`\`json
{
  "color": {
    "background": "${bg}",
    "surface": "${surface}",
    "primary": "${accent}",
    "text": "${text}",
    "muted": "${textMuted}"
  },
  "radius": {
    "sm": "${radii[0]}px",
    "md": "${radii[1]}px",
    "lg": "${radii[2]}px"
  },
  "spacing": {
    "xs": "${spaceBase}px",
    "sm": "${spaceBase * 2}px",
    "md": "${spaceBase * 4}px",
    "lg": "${spaceBase * 6}px",
    "xl": "${spaceBase * 8}px"
  }
}
\`\`\`

---

# 24. ПРАВИЛА ДЛЯ AI-АГЕНТА

## Обязательно

AI-агенты ОБЯЗАНЫ:

* Следовать этой дизайн-системе
* Переиспользовать существующие компоненты
* Переиспользовать существующие токены
* Сохранять визуальную консистентность
* Проверять адаптивное поведение
* Учитывать все релевантные состояния UI
* Предпочитать существующие паттерны созданию новых
* Помнить о доступности

## Запрещено

AI-агентам ЗАПРЕЩЕНО:

* Вводить случайные цвета
* Вводить случайные семейства шрифтов
* Произвольно менять радиус скругления
* Создавать ненужные компоненты
* Смешивать разные библиотеки иконок
* Добавлять градиенты без разрешения
* Добавлять избыточные тени
* Добавлять декоративную анимацию без цели
* Пересобирать существующие компоненты без необходимости

## Если решение не определено

1. Изучи существующие компоненты
2. Изучи существующие токены
3. Следуй ближайшему существующему паттерну
4. Предпочитай консистентность новизне

---

# 25. ПРАВИЛО ПЕРЕИСПОЛЬЗОВАНИЯ КОМПОНЕНТОВ

Порядок действий: **Переиспользовать → Скомпоновать → Расширить → Создать**

---

# 26. ЧЕК-ЛИСТ ВИЗУАЛЬНОГО QA

## 26.1 Финальный чек-лист перед сдачей UI

### Разметка

* [ ] Выравнивание последовательно
* [ ] Отступы соответствуют системе отступов
* [ ] Ширина контейнеров последовательна
* [ ] Нет случайного overflow

### Типографика

* [ ] Верный шрифт: ${pair.heading} / ${pair.body}
* [ ] Верная иерархия
* [ ] Верные начертания
* [ ] Читаемая длина строки

### Цвета

* [ ] Используются только утверждённые токены
* [ ] Контраст достаточен
* [ ] Семантические цвета применены последовательно

### Компоненты

* [ ] Существующие компоненты переиспользованы там, где возможно
* [ ] Радиус последователен
* [ ] Границы последовательны
* [ ] Тени последовательны

### Взаимодействие

* [ ] Hover
* [ ] Focus
* [ ] Active
* [ ] Disabled
* [ ] Loading — где применимо
* [ ] Error — где применимо

### Адаптивность

* [ ] Mobile
* [ ] Tablet
* [ ] Desktop

### Доступность

* [ ] Навигация с клавиатуры
* [ ] Заметный фокус
* [ ] Доступные подписи
* [ ] Цвет не единственный источник смысла
* [ ] Учтён reduced motion

---

# 27. ПОЛИТИКА ИЗМЕНЕНИЙ

При изменении визуальной системы:

1. Обнови этот документ
2. Обнови соответствующие токены
3. Обнови затронутые компоненты
4. Проверь существующие страницы на регрессии
5. Сохраняй внутреннюю консистентность системы

---

# 28. ТЕКУЩИЕ ДИЗАЙН-РЕШЕНИЯ

\`\`\`text
Решение: Использование ${concept.name} концепции
Причина: Выбрана пользователем через мастер DSgen
Дата: ${date}
\`\`\`

---

# 29. СТАТУС ДИЗАЙН-СИСТЕМЫ

\`\`\`text
Версия: 0.1.0
Статус: Черновик
Последнее обновление: ${date}
\`\`\`

---

# ФИНАЛЬНЫЙ ПРИНЦИП

Интерфейс должен ощущаться как единый продукт, а не набор независимо сгенерированных экранов.

Консистентность важнее новизны.

Когда есть сомнения:

**Переиспользовать → Скомпоновать → Расширить → Создать**

Generated by DSgen — ${palette.name} · ${pair.name} · ${concept.name}
`;
  }

  function generateTokensJSON() {
    const palette = getPalette();
    const pair = getFontPair();
    const concept = getConcept();
    const cs = getSafeColors(palette);
    const primaryCs = getSemanticColors(palette);
    const altCs = getSemanticColors(palette, true);
    const csLight = primaryCs.mode === 'light' ? primaryCs : altCs;
    const csDark = primaryCs.mode === 'dark' ? primaryCs : altCs;
    const bg = cs.background, surface = cs.surface, text = cs.textPrimary;
    const textMuted = cs.textMuted, accent = cs.accent;
    const radii = concept.radius;
    const spaceBase = concept.space * 4;
    const scale = TYPE_SCALES[concept.scale] || TYPE_SCALES.standard;
    const isD = cs.mode === 'dark';
    const sc = concept.styleConfig || {};

    const colorToken = (c) => ({
      background: c.background, surface: c.surface, 'surface-elevated': c.surfaceElevated,
      'text-primary': c.textPrimary, 'text-secondary': c.textSecondary, 'text-muted': c.textMuted,
      'text-inverse': c.mode === 'dark' ? '#1C1917' : '#FFFFFF',
      accent: c.accent, 'accent-hover': c.accentHover,
      'accent-active': mix(c.accent, c.mode === 'dark' ? '#ffffff' : '#000000', 0.3),
      'accent-soft': c.accentSoft, border: c.border, 'border-subtle': c.borderSubtle,
      success: c.semantic.success, warning: c.semantic.warning, error: c.semantic.error, info: c.semantic.info,
    });

    return JSON.stringify({
      meta: { name: 'Design Kit Project', palette: palette.name, fonts: pair.name, concept: concept.name, date: new Date().toISOString().slice(0, 10) },
      color: {
        active: colorToken(cs),
        light: colorToken(csLight),
        dark: colorToken(csDark),
        'palette-original': palette.colors,
      },
      typography: {
        'font-heading': pair.heading,
        'font-body': pair.body,
        'heading-weight': pair.hw,
        'body-weight': pair.bw,
        'letter-spacing-heading': (sc.letterSpacing && sc.letterSpacing.heading) || '0',
        scale: { display: scale.title + 8, h1: scale.title, h2: Math.round(scale.title * 0.8), h3: Math.round(scale.title * 0.65), body: scale.body, small: scale.body - 2, caption: scale.body - 3 },
      },
      spacing: { unit: spaceBase, '3xs': Math.round(spaceBase / 4), '2xs': Math.round(spaceBase / 2), xs: spaceBase, sm: spaceBase * 2, md: spaceBase * 4, lg: spaceBase * 6, xl: spaceBase * 8, '2xl': spaceBase * 12, '3xl': spaceBase * 16, '4xl': spaceBase * 24 },
      radius: { none: 0, sm: radii[0], md: radii[1], lg: radii[2], full: 9999 },
      shadow: { style: concept.shadow },
      effects: sc.effects || {},
      borders: sc.borders || {},
      animation: sc.animation || {},
      density: sc.density || {},
      icons: sc.icons || {},
      layout: sc.layout || {},
    }, null, 2);
  }

  function generateComponentsMD() {
    const palette = getPalette();
    const pair = getFontPair();
    const concept = getConcept();
    const cs = getSafeColors(palette);
    const primaryCs = getSemanticColors(palette);
    const altCs = getSemanticColors(palette, true);
    const csL = primaryCs.mode === 'light' ? primaryCs : altCs;
    const csD = primaryCs.mode === 'dark' ? primaryCs : altCs;
    const radii = concept.radius;
    const sc = concept.styleConfig || {};
    const comp = sc.components || {};

    const btnCSS = (c) =>
`.btn-primary {
  background: ${c.accent};
  color: ${c.mode === 'dark' ? c.background : '#FFFFFF'};
  border-radius: ${radii[1]}px;
  padding: 10px 22px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
}
.btn-primary:hover { background: ${c.accentHover}; }
.btn-primary:focus-visible {
  box-shadow: 0 0 0 3px ${c.accentSoft};
  outline: none;
}
.btn-primary:disabled {
  background: ${c.textSecondary};
  color: ${c.mode === 'dark' ? c.background : '#FFFFFF'};
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: ${c.surface};
  color: ${c.textPrimary};
  border: 1px solid ${c.border};
  border-radius: ${radii[1]}px;
  padding: 10px 22px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
}
.btn-secondary:hover {
  background: ${mix(c.surface, c.mode === 'dark' ? '#ffffff' : '#000000', c.mode === 'dark' ? 0.05 : 0.03)};
}
.btn-secondary:focus-visible {
  box-shadow: 0 0 0 3px ${c.accentSoft};
  outline: none;
}

.btn-ghost {
  background: transparent;
  color: ${c.accent};
  border: none;
  border-radius: ${radii[1]}px;
  padding: 10px 22px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-ghost:hover { background: ${c.accentSoft}; }
.btn-ghost:focus-visible {
  box-shadow: 0 0 0 3px ${c.accentSoft};
  outline: none;
}

.btn-destructive {
  background: #EF4444;
  color: #FFFFFF;
  border: none;
  border-radius: ${radii[1]}px;
  padding: 10px 22px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-destructive:hover { background: #DC2626; }
.btn-destructive:focus-visible {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.4);
  outline: none;
}`;

    const inputCSS = (c) =>
`.input {
  height: 44px;
  border-radius: ${radii[0]}px;
  border: 1px solid ${c.border};
  background: ${c.background};
  color: ${c.textPrimary};
  padding: 0 14px;
  font-family: '${pair.body}', sans-serif;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.input:hover { border-color: ${c.textMuted}; }
.input:focus {
  border-color: ${c.accent};
  box-shadow: 0 0 0 3px ${c.accentSoft};
  outline: none;
}
.input:disabled {
  background: ${c.borderSubtle};
  color: ${c.textSecondary};
  cursor: not-allowed;
}
.input--error { border-color: #EF4444; }`;

    const cardCSS = (c) =>
`.card {
  background: ${c.surface};
  border-radius: ${radii[2]}px;
  padding: 20px;
  box-shadow: ${buildShadow(concept.shadow, c.accent).subtle};
  transition: box-shadow 0.3s;
}
.card:hover {
  box-shadow: ${buildShadow(concept.shadow, c.accent).medium};
}`;

    const badgeCSS = (c) =>
`.badge {
  border-radius: 9999px;
  padding: 2px 10px;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.badge--default { background: ${c.surface}; color: ${c.textPrimary}; }
.badge--success { background: #22C55E; color: #FFFFFF; }
.badge--warning { background: #F59E0B; color: #FFFFFF; }
.badge--error   { background: #EF4444; color: #FFFFFF; }
.badge--info    { background: #3B82F6; color: #FFFFFF; }`;

    const navCSS = (c) =>
`.navbar {
  display: flex;
  align-items: center;
  height: ${comp.navigation ? comp.navigation.height : '56px'};
  background: ${c.background};
  gap: 24px;
  padding: 0 ${concept.space * 6}px;
}
.navbar-link {
  color: ${c.textMuted};
  text-decoration: none;
  font-size: 15px;
  padding: 8px 0;
  border-bottom: 2px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}
.navbar-link:hover { color: ${c.textPrimary}; }
.navbar-link.is-active {
  color: ${c.accent};
  border-bottom-color: ${c.accent};
}`;

    const modalCSS = (c) =>
`.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 300;
}
.modal {
  background: ${c.surface};
  border-radius: ${radii[2]}px;
  width: ${comp.modal ? comp.modal.width : '480px'};
  max-width: 90vw; max-height: 85vh;
  overflow-y: auto;
  padding: 24px;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16px;
}
.modal-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  margin-top: 24px;
}`;

    return `# Components

## HTML (общий для обеих тем)

### Button

\`\`\`html
<button class="btn btn-primary">Action</button>
<button class="btn btn-secondary">Action</button>
<button class="btn btn-ghost">Action</button>
<button class="btn btn-destructive">Delete</button>
\`\`\`

### Input

\`\`\`html
<input type="text" class="input" placeholder="Placeholder">
<input type="text" class="input input--error" placeholder="Error">
\`\`\`

### Card

\`\`\`html
<div class="card">
  <h3>Title</h3>
  <p>Content</p>
</div>
\`\`\`

### Badge

\`\`\`html
<span class="badge badge--default">Label</span>
<span class="badge badge--success">Success</span>
<span class="badge badge--warning">Warning</span>
<span class="badge badge--error">Error</span>
<span class="badge badge--info">Info</span>
\`\`\`

### Navigation

\`\`\`html
<nav class="navbar">
  <a href="#" class="navbar-link is-active">Home</a>
  <a href="#" class="navbar-link">About</a>
  <a href="#" class="navbar-link">Contact</a>
</nav>
\`\`\`

### Modal

\`\`\`html
<div class="modal-overlay">
  <div class="modal">
    <div class="modal-header">
      <h2>Title</h2>
      <button class="btn-ghost" aria-label="Close">&times;</button>
    </div>
    <div class="modal-body">Content</div>
    <div class="modal-footer">
      <button class="btn btn-secondary">Cancel</button>
      <button class="btn btn-primary">Confirm</button>
    </div>
  </div>
</div>
\`\`\`

---

## CSS — Светлая тема

\`\`\`css
/* Светлая тема */
:root {
  --bg: ${csL.background};
  --surface: ${csL.surface};
  --text: ${csL.textPrimary};
  --text-secondary: ${csL.textSecondary};
  --text-muted: ${csL.textMuted};
  --border: ${csL.border};
  --accent: ${csL.accent};
  --accent-hover: ${csL.accentHover};
  --accent-soft: ${csL.accentSoft};
  --radius-sm: ${radii[0]}px;
  --radius-md: ${radii[1]}px;
  --radius-lg: ${radii[2]}px;
  --font: '${pair.body}', sans-serif;
  --font-heading: '${pair.heading}', sans-serif;
}

${btnCSS(csL)}

${inputCSS(csL)}

${cardCSS(csL)}

${badgeCSS(csL)}

${navCSS(csL)}

${modalCSS(csL)}
\`\`\`

---

## CSS — Тёмная тема

\`\`\`css
/* Тёмная тема */
:root[data-theme="dark"] {
  --bg: ${csD.background};
  --surface: ${csD.surface};
  --text: ${csD.textPrimary};
  --text-secondary: ${csD.textSecondary};
  --text-muted: ${csD.textMuted};
  --border: ${csD.border};
  --accent: ${csD.accent};
  --accent-hover: ${csD.accentHover};
  --accent-soft: ${csD.accentSoft};
  --radius-sm: ${radii[0]}px;
  --radius-md: ${radii[1]}px;
  --radius-lg: ${radii[2]}px;
}

${btnCSS(csD)}

${inputCSS(csD)}

${cardCSS(csD)}

${badgeCSS(csD)}

${navCSS(csD)}

${modalCSS(csD)}
\`\`\`

---

Generated by Design Kit — ${palette.name} · ${pair.name} · ${concept.name}
`;
  }

  async function downloadZip() {
    const zip = new JSZip();
    const design = zip.folder('.design');

    design.file('design.md', generateDesignMD());
    design.file('tokens.json', generateTokensJSON());
    design.file('components.md', generateComponentsMD());

    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'design-system.zip';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Архив design-system.zip скачан');
  }

  function initStickyShadow() {
    const el = $('#wizard-type-preview');
    if (!el) return;
    const observer = new IntersectionObserver(
      ([e]) => el.classList.toggle('stuck', e.intersectionRatio < 1),
      { threshold: [1], rootMargin: '-70px 0px 0px 0px' }
    );
    observer.observe(el);
  }

  function renderEditPanel() {
    const headingSel = $('#edit-heading-font');
    const bodySel = $('#edit-body-font');
    if (!headingSel) return;
    const hf = wizard.headingFont || getFontPair().heading;
    const bf = wizard.bodyFont || getFontPair().body;
    headingSel.innerHTML = FONTS.map((f) => {
      loadFont(f.family);
      return '<option value="' + f.family + '"' + (f.family === hf ? ' selected' : '') + ' style="font-family:\'' + f.family + '\', sans-serif">' + f.family + '</option>';
    }).join('');
    bodySel.innerHTML = FONTS.map((f) => {
      loadFont(f.family);
      return '<option value="' + f.family + '"' + (f.family === bf ? ' selected' : '') + ' style="font-family:\'' + f.family + '\', sans-serif">' + f.family + '</option>';
    }).join('');

    const palGrid = $('#edit-palettes');
    if (palGrid) {
      palGrid.innerHTML = '';
      PALETTES.forEach((p) => {
        const cs = getSemanticColors(p);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'edit-palette-btn' + (wizard.paletteId === p.id ? ' is-active' : '');
        btn.dataset.id = p.id;
        btn.innerHTML =
          '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + cs.background + ';border:1px solid rgba(0,0,0,.08)" title="фон"></span>' +
          '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + cs.surface + ';border:1px solid rgba(0,0,0,.08)" title="поверхность"></span>' +
          '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + cs.accent + ';border:1px solid rgba(0,0,0,.08)" title="акцент"></span>' +
          '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + cs.textPrimary + ';border:1px solid rgba(0,0,0,.08)" title="текст"></span>';
        btn.title = p.name;
        btn.addEventListener('click', () => {
          wizard.paletteId = p.id;
          wizard.themeMode = null;
          $$('.edit-palette-btn').forEach((x) => x.classList.toggle('is-active', x.dataset.id === p.id));
          renderStep4();
        });
        palGrid.appendChild(btn);
      });
    }

    const conceptSel = $('#edit-concept-select');
    if (conceptSel) {
      conceptSel.innerHTML = DESIGN_CONCEPTS.map((c) =>
        '<option value="' + c.id + '"' + (wizard.conceptId === c.id ? ' selected' : '') + '>' + c.name + '</option>'
      ).join('');
      conceptSel.onchange = () => {
        wizard.conceptId = conceptSel.value;
        renderStep4();
      };
    }

    headingSel.onchange = () => {
      wizard.headingFont = headingSel.value;
      loadFont(headingSel.value);
      renderStep4();
    };
    bodySel.onchange = () => {
      wizard.bodyFont = bodySel.value;
      loadFont(bodySel.value);
      renderStep4();
    };
  }

  function toggleEditPanel() {
    const panel = $('#edit-panel');
    const isOpen = !panel.hidden;
    panel.hidden = isOpen;
    if (!isOpen) renderEditPanel();
  }

  async function pasteFromClipboard() {
    try {
      let text;
      try {
        text = (await navigator.clipboard.readText()).trim();
      } catch {
        text = prompt('Вставьте цвета из Colors CO:');
      }
      if (!text) return;
      const colors = [];
      text.split('\n').forEach((line) => {
        const m = line.match(/--[\w-]+:\s*#([0-9a-fA-F]{6,8})\s*;/);
        if (m) colors.push('#' + m[1].slice(0, 6));
      });
      if (colors.length < 2) { toast('Не удалось распознать цвета'); return; }

      const id = 'pasted-' + Date.now();
      const name = 'Из буфера (' + colors.length + ')';
      const pasted = { id, name, colors };
      PALETTES.unshift(pasted);
      wizard.paletteId = id;
      wizard.themeMode = null;
      renderEditPanel();
      renderStep4();
      toast('Вставлено ' + colors.length + ' цветов');
    } catch (e) {
      toast('Ошибка: ' + e.message);
    }
  }

  /* ---------- Init ---------- */
  async function init() {
    try {
      const [palettes, fontsData, concepts] = await Promise.all([
        fetch('assets/data/palettes.json').then(r => r.json()),
        fetch('assets/data/fonts.json').then(r => r.json()),
        fetch('assets/data/concepts.json').then(r => r.json()),
      ]);
      PALETTES = palettes;
      FONTS = fontsData.fonts;
      FONT_PAIRS = fontsData.pairs;
      DESIGN_CONCEPTS = concepts;
    } catch (e) {
      // file:// — CORS блокирует fetch, используем inline-данные
    }

    loadFont('Manrope');
    loadFont('Inter');
    loadFont('Lora');

    /* Загрузить тему оболочки ДО отрисовки карточек */
    const savedTheme = localStorage.getItem('dsgen-shell-theme');
    if (savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      const sl = $('#shell-theme-slider');
      if (sl) sl.checked = true;
    }

    wizard.paletteId = PALETTES[0].id;
    wizard.headingFont = FONT_PAIRS[0].heading;
    wizard.bodyFont = FONT_PAIRS[0].body;
    wizard.conceptId = DESIGN_CONCEPTS[0].id;
    renderConcepts();
    renderPalettes();
    renderFontPairs();
    wizardGo(1);

    $('#wizard-next-btn').addEventListener('click', () => {
      if (wizard.step < 4) wizardGo(wizard.step + 1);
    });

    $('#wizard-back-btn').addEventListener('click', () => {
      if (wizard.step <= 1) {
        wizardGo(1);
      } else {
        wizardGo(wizard.step - 1);
      }
    });

    $('#download-zip-btn').addEventListener('click', downloadZip);
    $('#edit-toggle-btn').addEventListener('click', toggleEditPanel);
    const closeBtn = $('#edit-drawer-close');
    if (closeBtn) closeBtn.addEventListener('click', toggleEditPanel);

    // Сворачивание палитры в drawer
    const paletteToggle = $('#edit-palette-toggle');
    const paletteContent = $('#edit-palettes');
    if (paletteToggle && paletteContent) {
      paletteToggle.addEventListener('click', () => {
        const expanded = paletteToggle.getAttribute('aria-expanded') === 'true';
        paletteToggle.setAttribute('aria-expanded', !expanded);
        paletteContent.hidden = expanded;
      });
    }

    // Вставка цветов из буфера
    const pasteBtn = $('#edit-paste-colors');
    if (pasteBtn) pasteBtn.addEventListener('click', pasteFromClipboard);

    // Переключение темы на шаге 4 — слайдер
    const themeSlider = $('#theme-toggle-slider');
    if (themeSlider) {
      themeSlider.addEventListener('change', () => {
        wizard.themeMode = themeSlider.checked ? 'dark' : 'light';
        renderStep4();
      });
    }

    // Переключение темы оболочки — слайдер в хедере
    const shellSlider = $('#shell-theme-slider');
    if (shellSlider) {
      shellSlider.addEventListener('change', () => {
        const dark = shellSlider.checked;
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
        localStorage.setItem('dsgen-shell-theme', dark ? 'dark' : 'light');
        /* Перерисовать карточки концепций и палитр под новую тему */
        renderConcepts();
        renderPalettes();
        if (wizard.step === 4) renderStep4();
      });
    }

    initStickyShadow();
  }

  init();
})();