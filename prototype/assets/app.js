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
    const dark = isDark(bg);
    const hsl = hexToHsl(color);
    const h = hsl.h, s = hsl.s;
    let l = hsl.l;
    const step = dark ? 2 : -2;
    for (let i = 0; i < 60; i++) {
      l = clamp(l + step, 0, 100);
      const c = hslToHex(h, s, l);
      if (contrast(c, bg) >= minRatio) return c;
    }
    return dark ? '#ffffff' : '#000000';
  }

  const PALETTES = [
    { id: 'warm-minimal', name: 'Тёплый минимализм', colors: ['#FDFBF7','#F5F0E8','#D4A574','#8B5E34','#2B2B27'] },
    { id: 'ocean', name: 'Морской бриз', colors: ['#F0F9FF','#BAE6FD','#38BDF8','#0284C7','#0F172A'] },
    { id: 'sunset', name: 'Закат', colors: ['#FFF7ED','#FED7AA','#FB923C','#EA580C','#7C2D12'] },
    { id: 'forest', name: 'Лес', colors: ['#ECFDF5','#BBF7D0','#34D399','#059669','#064E3B'] },
    { id: 'lavender', name: 'Лаванда', colors: ['#F3E8FF','#D8B4FE','#A855F7','#7E22CE','#581C87'] },
    { id: 'rose', name: 'Роза', colors: ['#FFF1F2','#FECDD3','#FB7185','#E11D48','#9F1239'] },
    { id: 'indigo', name: 'Индиго', colors: ['#E0E7FF','#A5B4FC','#6366F1','#4338CA','#312E81'] },
    { id: 'neon', name: 'Неон', colors: ['#0F0E17','#23203A','#FF8906','#E53170','#7A5AF0'] },
    { id: 'sand', name: 'Песок', colors: ['#FEF9EF','#FDE68A','#F59E0B','#B45309','#78350F'] },
    { id: 'snow', name: 'Снег', colors: ['#FFFFFF','#F8FAFC','#E2E8F0','#64748B','#0F172A'] },
    { id: 'wine', name: 'Вино', colors: ['#FDF2F8','#FBCFE8','#EC4899','#BE185D','#701A4E'] },
    { id: 'hacker', name: 'Матрица', colors: ['#010B07','#0A2E1A','#00FF7F','#39FF14','#E8FFE8'] },
    { id: 'gold', name: 'Золото', colors: ['#FFFBE6','#FDE68A','#D97706','#92400E','#451A03'] },
    { id: 'arctic', name: 'Арктика', colors: ['#ECFEFF','#A5F3FC','#22D3EE','#0891B2','#164E63'] },
    { id: 'coffee', name: 'Кофе', colors: ['#FBF7F0','#E8DCCC','#A0846C','#5C4033','#2D1810'] },
    { id: 'cyberpunk', name: 'Киберпанк', colors: ['#0B0518','#2B0F66','#7F3FF2','#F875AA','#F5F0FF'] },
    { id: 'olive', name: 'Оливковый', colors: ['#F7FEE7','#ECFCCB','#84CC16','#4D7C0F','#365314'] },
    { id: 'fuchsia', name: 'Фуксия', colors: ['#FDF4FF','#F5D0FE','#D946EF','#A21CAF','#701A75'] },
    { id: 'graphite', name: 'Графит', colors: ['#16181D','#1E2128','#3D424C','#8A8F98','#E8EAED'] },
    { id: 'mango', name: 'Манго', colors: ['#FFF9ED','#FFE5A3','#FFB347','#FF8C00','#CC7000'] },
    { id: 'lilac-mist', name: 'Сиреневый туман', colors: ['#F5F3FF','#DDD6FE','#A78BFA','#7C3AED','#5B21B6'] },
    { id: 'tiffany', name: 'Тиффани', colors: ['#F0FDFA','#CCFBF1','#2DD4BF','#0D9488','#115E59'] },
    { id: 'scarlet', name: 'Алый', colors: ['#FEF2F2','#FECACA','#EF4444','#B91C1C','#7F1D1D'] },
    { id: 'rainy', name: 'Дождливый', colors: ['#F8FAFC','#E2E8F0','#94A3B8','#475569','#1E293B'] },
    { id: 'amber', name: 'Янтарь', colors: ['#FFFBEB','#FDE68A','#F59E0B','#D97706','#92400E'] },
    { id: 'emerald', name: 'Изумруд', colors: ['#ECFDF5','#A7F3D0','#10B981','#047857','#064E3B'] },
    { id: 'sakura', name: 'Сакура', colors: ['#FFF0F5','#F9A8D4','#F472B6','#DB2777','#9D174D'] },
    { id: 'stormy', name: 'Грозовой', colors: ['#0F172A','#1E293B','#334155','#475569','#CBD5E1'] },
    { id: 'sun', name: 'Солнце', colors: ['#FFFBE6','#FEF08A','#EAB308','#A16207','#713F12'] },
    { id: 'deep-ocean', name: 'Глубокий океан', colors: ['#F0F9FF','#E0F2FE','#7DD3FC','#38BDF8','#0369A1'] },
    { id: 'chocolate', name: 'Шоколад', colors: ['#FBF7F0','#D4A574','#A0724A','#6B4423','#3E2723'] },
    { id: 'burgundy', name: 'Бургунди', colors: ['#FDF2F8','#FCE7F3','#F472B6','#BE123C','#6B0F2A'] },
    { id: 'sky', name: 'Небо', colors: ['#F0F9FF','#E0F2FE','#93C5FD','#60A5FA','#1D4ED8'] },
    { id: 'mint', name: 'Мятный', colors: ['#F3FAF7','#D1FAE5','#6EE7B7','#059669','#065F46'] },
    { id: 'terracotta', name: 'Терракота', colors: ['#FEF7F3','#FED7AA','#D97A4A','#9C4221','#5C2211'] },
    { id: 'midnight', name: 'Полночь', colors: ['#0B0E14','#1A1F2E','#2D3654','#4A5880','#8EA0C8'] },
    { id: 'spring', name: 'Весна', colors: ['#F0FDF4','#BBF7D0','#4ADE80','#22C55E','#166534'] },
    { id: 'honey', name: 'Медовый', colors: ['#FFF7ED','#FFEDD5','#FDBA74','#EA580C','#9A3412'] },
    { id: 'sapphire', name: 'Сапфир', colors: ['#EFF6FF','#BFDBFE','#3B82F6','#2563EB','#1E40AF'] },
    { id: 'bamboo', name: 'Бамбук', colors: ['#F7FEE7','#D9F99D','#65A30D','#4D7C0F','#3F6212'] },
    { id: 'lilac', name: 'Лиловый', colors: ['#FAF5FF','#E9D5FF','#C084FC','#9333EA','#6B21A8'] },
    { id: 'mocha', name: 'Мокко', colors: ['#FAF7F2','#E8DDD0','#C4AD93','#8B7355','#4A3F32'] },
    { id: 'ruby', name: 'Рубин', colors: ['#FFF1F2','#FFA3A3','#F43F5E','#BE123C','#881337'] },
    { id: 'foggy', name: 'Туманный', colors: ['#F9FAFB','#F3F4F6','#D1D5DB','#6B7280','#374151'] },
    { id: 'agate', name: 'Агат', colors: ['#FDF4FF','#FAE8FF','#E879F9','#C026D3','#86198F'] },
    { id: 'cinnamon', name: 'Корица', colors: ['#FFF9ED','#FDE68A','#D97706','#B45309','#92400E'] },
    { id: 'turquoise', name: 'Бирюза', colors: ['#F0FDFA','#CCFBF1','#5EEAD4','#14B8A6','#0F766E'] },
    { id: 'pomegranate', name: 'Гранат', colors: ['#FFF1F2','#FFC4C4','#E5484D','#C1121F','#780A16'] },
    { id: 'silver', name: 'Серебро', colors: ['#F8F9FA','#E9ECEF','#CED4DA','#6C757D','#343A40'] },
    { id: 'aurora', name: 'Аврора', colors: ['#F0F9FF','#E0F2FE','#93C5FD','#60A5FA','#1D4ED8'] },
  ];

  const FONT_PAIRS = [
    { id: 'pair1', name: 'Yeseva One + Comfortaa', heading: 'Yeseva One', body: 'Comfortaa', hw: 500, bw: 400, note: 'Изящный заголовок, мягкий текст' },
    { id: 'pair2', name: 'Merriweather + Open Sans', heading: 'Merriweather', body: 'Open Sans', hw: 500, bw: 400, note: 'Классическая редакционная пара' },
    { id: 'pair3', name: 'IBM Plex Serif + IBM Plex Sans', heading: 'IBM Plex Serif', body: 'IBM Plex Sans', hw: 500, bw: 400, note: 'Единая система, антиква + гротеск' },
    { id: 'pair4', name: 'Raleway + Raleway', heading: 'Raleway', body: 'Raleway', hw: 600, bw: 400, note: 'Один шрифт, разный вес' },
    { id: 'pair5', name: 'Bitter + Open Sans', heading: 'Bitter', body: 'Open Sans', hw: 500, bw: 400, note: 'Контрастная, современная классика' },
    { id: 'pair6', name: 'Cormorant + Open Sans', heading: 'Cormorant', body: 'Open Sans', hw: 500, bw: 400, note: 'Премиальная, журнальная' },
    { id: 'pair7', name: 'Andika + Roboto', heading: 'Andika', body: 'Roboto', hw: 500, bw: 400, note: 'Дружелюбная, детская, читаемая' },
    { id: 'pair8', name: 'Viaoda Libre + Inter', heading: 'Viaoda Libre', body: 'Inter', hw: 500, bw: 400, note: 'Каллиграфический заголовок' },
    { id: 'pair9', name: 'Noto Serif + Roboto', heading: 'Noto Serif', body: 'Roboto', hw: 500, bw: 400, note: 'Строгая, универсальная' },
    { id: 'pair10', name: 'Yeseva One + Roboto', heading: 'Yeseva One', body: 'Roboto', hw: 500, bw: 400, note: 'Элегантный заголовок, нейтральный текст' },
    { id: 'pair11', name: 'Ubuntu + Open Sans', heading: 'Ubuntu', body: 'Open Sans', hw: 500, bw: 400, note: 'Современная, технологичная' },
    { id: 'pair12', name: 'Playfair Display + Lato', heading: 'Playfair Display', body: 'Lato', hw: 500, bw: 400, note: 'Элегантная, премиальная' },
    { id: 'pair13', name: 'Playfair Display + Source Sans Pro', heading: 'Playfair Display', body: 'Source Sans Pro', hw: 500, bw: 400, note: 'Акцидентная, журнальная' },
    { id: 'pair14', name: 'Nunito + PT Sans', heading: 'Nunito', body: 'PT Sans', hw: 600, bw: 400, note: 'Мягкая, дружелюбная' },
    { id: 'pair15', name: 'Jost + Roboto', heading: 'Jost', body: 'Roboto', hw: 500, bw: 400, note: 'Геометричная, современная' },
    { id: 'pair16', name: 'Manrope + Manrope', heading: 'Manrope', body: 'Manrope', hw: 600, bw: 400, note: 'Моно-стиль, универсальная' },
    { id: 'pair17', name: 'Marmelad + Roboto', heading: 'Marmelad', body: 'Roboto', hw: 500, bw: 400, note: 'Игривый заголовок, строгий текст' },
    { id: 'pair18', name: 'Forum + Arimo', heading: 'Forum', body: 'Arimo', hw: 400, bw: 400, note: 'Винтажная, благородная' },
    { id: 'pair19', name: 'Tenor Sans + Roboto', heading: 'Tenor Sans', body: 'Roboto', hw: 500, bw: 400, note: 'Чистая, минималистичная' },
    { id: 'pair20', name: 'Inter + Playfair Display', heading: 'Playfair Display', body: 'Inter', hw: 500, bw: 400, note: 'Гротеск + антиква, премиально' },
    { id: 'pair21', name: 'Inter + EB Garamond', heading: 'EB Garamond', body: 'Inter', hw: 500, bw: 400, note: 'Утончённая, для подписей' },
    { id: 'pair22', name: 'IBM Plex Sans + Vela Sans', heading: 'IBM Plex Sans', body: 'Vela Sans', hw: 500, bw: 400, note: 'Чистая, медицинская' },
    { id: 'pair23', name: 'Geologica + Nunito', heading: 'Geologica', body: 'Nunito', hw: 500, bw: 400, note: 'Эмпатичная, тёплая' },
    { id: 'pair24', name: 'Bebas Neue + Noto Sans Display', heading: 'Bebas Neue', body: 'Noto Sans Display', hw: 600, bw: 400, note: 'Акцидентная, IT-стиль' },
    { id: 'pair25', name: 'Lora + LTSuperior', heading: 'Lora', body: 'Manrope', hw: 500, bw: 400, note: 'Антиква + гротеск' },
    { id: 'pair26', name: 'Manrope + LinguaFranca', heading: 'Manrope', body: 'Lora', hw: 600, bw: 400, note: 'Креативная, контрастная' },
    { id: 'pair27', name: 'Playfair Display + Oswald', heading: 'Playfair Display', body: 'Oswald', hw: 500, bw: 400, note: 'Антиква + гротеск' },
    { id: 'pair28', name: 'Martian Mono + Inter', heading: 'Martian Mono', body: 'Inter', hw: 500, bw: 400, note: 'Моноширинный акцент' },
    { id: 'pair29', name: 'Handjet + Inter', heading: 'Handjet', body: 'Inter', hw: 500, bw: 400, note: 'Пиксельная, игровая' },
    { id: 'pair30', name: 'Noto Serif + Open Sans', heading: 'Noto Serif', body: 'Open Sans', hw: 500, bw: 400, note: 'Классическая универсальная' },
    { id: 'pair31', name: 'Golos Text + Manrope', heading: 'Golos Text', body: 'Manrope', hw: 500, bw: 400, note: 'Государственная, строгая' },
    { id: 'pair32', name: 'Onest + PT Sans', heading: 'Onest', body: 'PT Sans', hw: 500, bw: 400, note: 'Современная, читаемая' },
  ];

  const DESIGN_CONCEPTS = [
    {
      id: 'strict', name: 'Строгий', color: '#374151', icon: 'tabler-square',
      desc: 'Чёткие линии, прямоугольные формы, минимум украшений',
      radius: [2, 4, 6], shadow: 'medium', scale: 'compact', space: 4,
    },
    {
      id: 'neon', name: 'Неоновый', color: '#581C87', icon: 'tabler-sparkles',
      desc: 'Тёмный фон, неоновое свечение, дерзкие акценты',
      radius: [8, 10, 12], shadow: 'glow', scale: 'large', space: 4,
    },
    {
      id: 'glass', name: 'Стеклянный', color: '#1E40AF', icon: 'tabler-eye',
      desc: 'Полупрозрачные поверхности, blur, мягкий свет',
      radius: [14, 18, 22], shadow: 'soft', scale: 'standard', space: 5,
    },
    {
      id: 'brutal', name: 'Брутальный', color: '#991B1B', icon: 'tabler-template',
      desc: 'Резкие границы, жирные рамки, максимум контраста',
      radius: [0, 2, 4], shadow: 'brutal', scale: 'standard', space: 4,
    },
    {
      id: 'minimal', name: 'Минимальный', color: '#52525B', icon: 'tabler-minus',
      desc: 'Воздух, один акцент, никаких лишних деталей',
      radius: [8, 12, 16], shadow: 'none', scale: 'standard', space: 5,
    },
    {
      id: 'premium', name: 'Премиум', color: '#92400E', icon: 'tabler-star',
      desc: 'Тёмный фон, золотые акценты, элегантные шрифты',
      radius: [10, 14, 18], shadow: 'strong', scale: 'large', space: 6,
    },
    {
      id: 'friendly', name: 'Дружелюбный', color: '#9D174D', icon: 'tabler-circle-check',
      desc: 'Большие скругления, пастельные тона, тепло',
      radius: [16, 20, 28], shadow: 'soft', scale: 'standard', space: 4,
    },
    {
      id: 'tech', name: 'Технологичный', color: '#1E3A5F', icon: 'tabler-grid-dots',
      desc: 'Холодный, заострённый, гротесковые шрифты',
      radius: [4, 6, 8], shadow: 'medium', scale: 'compact', space: 4,
    },
    {
      id: 'retro', name: 'Ретро', color: '#6B4423', icon: 'tabler-book',
      desc: 'Приглушённые тона, плёночная текстура, винтаж',
      radius: [6, 10, 14], shadow: 'soft', scale: 'standard', space: 5,
    },
    {
      id: 'nature', name: 'Природный', color: '#065F46', icon: 'tabler-world',
      desc: 'Землистые оттенки, натуральные фактуры, зелень',
      radius: [10, 14, 20], shadow: 'soft', scale: 'standard', space: 5,
    },
  ];

  const SHADOWS = {
    soft: { subtle: '0 1px 2px rgba(28,25,23,.06), 0 1px 3px rgba(28,25,23,.05)', medium: '0 4px 6px rgba(28,25,23,.08), 0 10px 24px rgba(28,25,23,.07)', focus: '0 0 0 3px rgba(161,98,7,.18)' },
    medium: { subtle: '0 2px 4px rgba(28,25,23,.08)', medium: '0 8px 16px rgba(28,25,23,.10), 0 16px 40px rgba(28,25,23,.10)', focus: '0 0 0 4px rgba(161,98,7,.26)' },
    strong: { subtle: '0 3px 6px rgba(28,25,23,.10)', medium: '0 12px 24px rgba(28,25,23,.14), 0 24px 60px rgba(28,25,23,.20)', focus: '0 0 0 4px rgba(161,98,7,.30)' },
    none: { subtle: 'none', medium: 'none', focus: '0 0 0 3px rgba(161,98,7,.25)' },
    brutal: { subtle: '4px 4px 0 rgba(20,20,20,1)', medium: '5px 5px 0 rgba(20,20,20,1), 9px 9px 0 rgba(20,20,20,.18)', focus: '0 0 0 3px rgba(20,20,20,.3)' },
    glow: { subtle: '0 0 12px rgba(255,137,6,.35)', medium: '0 0 22px rgba(255,137,6,.5), 0 4px 14px rgba(0,0,0,.5)', focus: '0 0 0 3px rgba(255,137,6,.4)' },
  };

  const TYPE_SCALES = { compact: { title: 26, body: 14 }, standard: { title: 32, body: 15 }, large: { title: 40, body: 17 } };

  const FONTS = [
    { family: 'Manrope', css: 'https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800' },
    { family: 'Inter', css: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700' },
    { family: 'Space Grotesk', css: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700' },
    { family: 'PT Sans', css: 'https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700' },
    { family: 'PT Serif', css: 'https://fonts.googleapis.com/css2?family=PT+Serif:wght@400;700' },
    { family: 'Playfair Display', css: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700' },
    { family: 'JetBrains Mono', css: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500' },
    { family: 'Archivo', css: 'https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600;700' },
    { family: 'Nunito', css: 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700' },
    { family: 'Montserrat', css: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700' },
    { family: 'Exo 2', css: 'https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700' },
    { family: 'Oswald', css: 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700' },
    { family: 'Lora', css: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700' },
    { family: 'Rubik', css: 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700' },
    { family: 'Open Sans', css: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700' },
    { family: 'Cormorant Garamond', css: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700' },
    { family: 'Space Mono', css: 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700' },
    { family: 'Dancing Script', css: 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700' },
    { family: 'Onest', css: 'https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700' },
    { family: 'Golos Text', css: 'https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700' },
    { family: 'IBM Plex Sans', css: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700' },
    { family: 'IBM Plex Serif', css: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@400;500;600;700' },
    { family: 'Raleway', css: 'https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700' },
    { family: 'Jost', css: 'https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700' },
    { family: 'Commissioner', css: 'https://fonts.googleapis.com/css2?family=Commissioner:wght@300;400;500;600;700' },
    { family: 'Wix Madefor Display', css: 'https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400;500;600;700' },
    { family: 'Wix Madefor Text', css: 'https://fonts.googleapis.com/css2?family=Wix+Madefor+Text:wght@400;500;600;700' },
    { family: 'Bebas Neue', css: 'https://fonts.googleapis.com/css2?family=Bebas+Neue' },
    { family: 'Plus Jakarta Sans', css: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700' },
    { family: 'Yeseva One', css: 'https://fonts.googleapis.com/css2?family=Yeseva+One' },
    { family: 'Comfortaa', css: 'https://fonts.googleapis.com/css2?family=Comfortaa:wght@300;400;500;600;700' },
    { family: 'Merriweather', css: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900' },
    { family: 'Bitter', css: 'https://fonts.googleapis.com/css2?family=Bitter:wght@300;400;500;600;700' },
    { family: 'Cormorant', css: 'https://fonts.googleapis.com/css2?family=Cormorant:wght@400;500;600;700' },
    { family: 'Andika', css: 'https://fonts.googleapis.com/css2?family=Andika:wght@400;700' },
    { family: 'Roboto', css: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700' },
    { family: 'Viaoda Libre', css: 'https://fonts.googleapis.com/css2?family=Viaoda+Libre' },
    { family: 'Noto Serif', css: 'https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;500;600;700' },
    { family: 'Ubuntu', css: 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700' },
    { family: 'Lato', css: 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900' },
    { family: 'Source Sans Pro', css: 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@300;400;600;700' },
    { family: 'Marmelad', css: 'https://fonts.googleapis.com/css2?family=Marmelad' },
    { family: 'Forum', css: 'https://fonts.googleapis.com/css2?family=Forum' },
    { family: 'Arimo', css: 'https://fonts.googleapis.com/css2?family=Arimo:wght@400;500;600;700' },
    { family: 'Tenor Sans', css: 'https://fonts.googleapis.com/css2?family=Tenor+Sans' },
    { family: 'EB Garamond', css: 'https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700' },
    { family: 'Geologica', css: 'https://fonts.googleapis.com/css2?family=Geologica:wght@300;400;500;600;700' },
    { family: 'Handjet', css: 'https://fonts.googleapis.com/css2?family=Handjet:wght@300;400;500;600;700' },
    { family: 'Martian Mono', css: 'https://fonts.googleapis.com/css2?family=Martian+Mono:wght@300;400;500;600;700' },
    { family: 'Noto Sans Display', css: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Display:wght@300;400;500;600;700' },
    { family: 'Vela Sans', css: 'https://fonts.googleapis.com/css2?family=Vela+Sans:wght@300;400;500;600;700' },
  ];
  const loadedFonts = new Set();

  const wizard = {
    step: 1,
    paletteId: null,
    fontPairId: 'pair1',
    headingFont: '',
    bodyFont: '',
    conceptId: 'minimal',
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
    if (step === 4) { renderStep4(); renderEditPanel(); }
  }

  function renderFooterSelection() {
    const palette = getPalette();
    const pair = getFontPair();
    const palEl = $('#wiz-sel-palette');
    const fontEl = $('#wiz-sel-fonts');
    palEl.innerHTML = palette.colors.map((c) =>
      '<span class="wiz-dot" style="background:' + c + '"></span>'
    ).join('');
    fontEl.innerHTML =
      '<span class="wiz-font-sample" style="font-family:\'' + pair.heading + '\',sans-serif;font-weight:' + pair.hw + '">Заголовок</span>' +
      '<span class="wiz-font-divider"></span>' +
      '<span class="wiz-font-sample wiz-font-body" style="font-family:\'' + pair.body + '\',sans-serif;font-weight:' + pair.bw + '">Основной текст</span>';
  }

  function renderPalettes() {
    const grid = $('#palette-grid');
    grid.innerHTML = '';
    PALETTES.forEach((p) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'palette-card' + (wizard.paletteId === p.id ? ' is-active' : '');
      card.dataset.id = p.id;
      const isD = isDark(p.colors[0]);
      card.style.setProperty('--pc-text', isD ? '#fff' : '#111');
      card.innerHTML =
        '<div class="palette-swatches">' +
        p.colors.map((c) => '<span class="palette-swatch" style="background:' + c + '"></span>').join('') +
        '</div>' +
        '<span class="palette-name">' + p.name + '</span>';
      card.addEventListener('click', () => {
        wizard.paletteId = p.id;
        $$('.palette-card').forEach((c) => c.classList.toggle('is-active', c.dataset.id === p.id));
        renderFooterSelection();
      });
      grid.appendChild(card);
    });
  }

  function renderFontPairs() {
    const grid = $('#wizard-font-pairs');
    grid.innerHTML = '';
    FONT_PAIRS.forEach((pair) => {
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
    });
    renderTypePreview();
  }

  function renderTypePreview() {
    const pair = FONT_PAIRS.find((p) => p.id === wizard.fontPairId) || FONT_PAIRS[0];
    const preview = $('#wizard-type-preview');
    preview.style.setProperty('--w-heading-font', "'" + pair.heading + "', system-ui, sans-serif");
    preview.style.setProperty('--w-body-font', "'" + pair.body + "', system-ui, sans-serif");
    preview.style.setProperty('--w-heading-weight', pair.hw);
    preview.style.setProperty('--w-body-weight', pair.bw);
  }

  function renderConcepts() {
    const grid = $('#concept-grid');
    grid.innerHTML = '';
    DESIGN_CONCEPTS.forEach((c) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'concept-card' + (wizard.conceptId === c.id ? ' is-active' : '');
      card.dataset.id = c.id;
      card.style.setProperty('--cc-color', c.color);
      card.innerHTML =
        '<div class="concept-head" style="background:' + c.color + '">' +
          '<svg class="icon concept-icon" aria-hidden="true"><use href="#' + c.icon + '"></use></svg>' +
          '<span class="concept-name">' + c.name + '</span>' +
        '</div>' +
        '<div class="concept-divider"></div>' +
        '<span class="concept-desc">' + c.desc + '</span>';
      card.addEventListener('click', () => {
        wizard.conceptId = c.id;
        $$('.concept-card').forEach((x) => x.classList.toggle('is-active', x.dataset.id === c.id));
      });
      grid.appendChild(card);
    });
  }

  function getPalette() { return PALETTES.find((p) => p.id === wizard.paletteId) || PALETTES[0]; }
  function getFontPair() { return FONT_PAIRS.find((p) => p.id === wizard.fontPairId) || FONT_PAIRS[0]; }
  function getConcept() { return DESIGN_CONCEPTS.find((c) => c.id === wizard.conceptId) || DESIGN_CONCEPTS[0]; }

  function getSafeColors(palette) {
    const isD = isDark(palette.colors[0]);
    const bg = palette.colors[0];
    const surface = palette.colors[1];
    const rawText = isD ? palette.colors[4] : palette.colors[3];
    const rawTextMuted = palette.colors[2];
    const rawAccent = palette.colors[3];
    return {
      bg, surface,
      text: ensureContrast(rawText, bg, 4.5),
      textMuted: ensureContrast(rawTextMuted, bg, 3),
      accent: ensureContrast(rawAccent, bg, 3),
    };
  }

  function renderStep4() {
    const palette = getPalette();
    const pair = getFontPair();
    const concept = getConcept();
    const { bg, surface, text, textMuted, accent } = getSafeColors(palette, concept);
    const isD = isDark(bg);
    const scale = TYPE_SCALES[concept.scale] || TYPE_SCALES.standard;
    const radii = concept.radius;
    const shadow = SHADOWS[concept.shadow] || SHADOWS.soft;

    const badge = $('#preview-info-badge');
    const hf = wizard.headingFont || pair.heading;
    const bf = wizard.bodyFont || pair.body;
    loadFont(hf); loadFont(bf);
    badge.innerHTML =
      '<span class="badge-item"><span class="badge-dot" style="background:' + palette.colors[0] + '"></span>' + palette.name + '</span>' +
      '<span class="badge-sep"></span>' +
      '<span class="badge-item">' + hf + ' + ' + bf + '</span>' +
      '<span class="badge-sep"></span>' +
      '<span class="badge-item">' + concept.name + '</span>';

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
            '<p style="color:var(--fp-text-muted);font-size:var(--fp-body-size);line-height:1.5;margin:0 0 12px">Пять оттенков по правилам цветового круга.</p>' +
            '<div style="display:flex;gap:4px">' + palette.colors.map((c) => '<span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:' + c + ';border:1px solid rgba(0,0,0,.08)"></span>').join('') + '</div>' +
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
  }

  function generateDesignMD() {
    const palette = getPalette();
    const pair = getFontPair();
    const concept = getConcept();
    const { bg, surface, text, textMuted, accent } = getSafeColors(palette, concept);
    const isD = isDark(bg);
    const scale = TYPE_SCALES[concept.scale] || TYPE_SCALES.standard;
    const radii = concept.radius;
    const spaceBase = concept.space * 4;

    const conceptKeywords = {
      strict: 'Строгий / Деловой / Чёткий', neon: 'Неоновый / Футуристический / Дерзкий', glass: 'Стеклянный / Мягкий / Современный', brutal: 'Брутальный / Резкий / Сырой', minimal: 'Минимальный / Чистый / Воздушный', premium: 'Премиальный / Элегантный / Тёмный', friendly: 'Дружелюбный / Тёплый / Мягкий', tech: 'Технологичный / Холодный / Точный', retro: 'Винтажный / Приглушённый / Ностальгический', nature: 'Природный / Землистый / Спокойный',
    };
    const keywords = conceptKeywords[concept.id] || 'Современный / Чистый';

    return `# DESIGN SYSTEM

> This document is the visual source of truth for the project.
> AI agents MUST follow these rules when creating or modifying UI.
> Do not invent visual styles that conflict with this document.

---

# 1. DESIGN IDENTITY

## Product

**Name:** \`DSgen Project\`

**Type:** \`Web App / SaaS\`

**Design direction:**
\`${concept.name} / ${keywords}\`

## Design keywords

* \`${palette.name}\`
* \`${concept.name}\`
* \`${pair.name}\`
* \`Токены\`
* \`Дизайн-система\`

## Avoid

* Случайные HEX-цвета вне палитры
* Смешение разных шрифтовых семей
* Произвольные скругления

---

# 2. COLOR SYSTEM

## Brand

\`\`\`text
Primary:       ${accent}
Primary Hover: ${accent}
Background:    ${bg}
Surface:       ${surface}
Text:          ${text}
Text Muted:    ${textMuted}
\`\`\`

## Palette

\`\`\`text
${palette.colors.map((c, i) => `Color ${i + 1}: ${c}`).join('\n')}
\`\`\`

## Semantic colors

\`\`\`text
Success: #22C55E
Warning: #F59E0B
Error:   #EF4444
Info:    #3B82F6
\`\`\`

## Color rules

* Do not introduce new colors without a clear reason
* Prefer semantic tokens over hardcoded values
* Maintain sufficient contrast (WCAG AA minimum)
* No gradients unless explicitly defined

---

# 3. TYPOGRAPHY

## Font family

\`\`\`text
Primary:   "${pair.heading}"
Secondary: "${pair.body}"
Monospace: "JetBrains Mono"
\`\`\`

## Scale

\`\`\`text
Display:
Size: ${scale.title + 8}px
Weight: ${pair.hw}
Line height: 1.1

H1:
Size: ${scale.title}px
Weight: ${pair.hw}
Line height: 1.2

H2:
Size: ${Math.round(scale.title * 0.8)}px
Weight: ${pair.hw}
Line height: 1.25

H3:
Size: ${Math.round(scale.title * 0.65)}px
Weight: ${pair.hw}
Line height: 1.3

Body:
Size: ${scale.body}px
Weight: ${pair.bw}
Line height: 1.6

Small:
Size: ${scale.body - 2}px
Weight: ${pair.bw}
Line height: 1.5

Caption:
Size: ${scale.body - 3}px
Weight: ${pair.bw}
Line height: 1.4
\`\`\`

## Typography rules

* Headings use ${pair.heading} at weight ${pair.hw}
* Body uses ${pair.body} at weight ${pair.bw}
* Do not use more than 3 font families
* Do not randomly change font weights

---

# 4. SPACING SYSTEM

\`\`\`text
Base unit: ${spaceBase}px

xs:  ${spaceBase}px
sm:  ${spaceBase * 2}px
md:  ${spaceBase * 4}px
lg:  ${spaceBase * 6}px
xl:  ${spaceBase * 8}px
2xl: ${spaceBase * 12}px
3xl: ${spaceBase * 16}px
4xl: ${spaceBase * 24}px
\`\`\`

## Rules

* Prefer spacing tokens over arbitrary values
* Related elements should have smaller spacing
* Separate sections should have larger spacing

---

# 5. BORDER RADIUS

\`\`\`text
None: 0
SM:   ${radii[0]}px
MD:   ${radii[1]}px
LG:   ${radii[2]}px
Full: 9999px
\`\`\`

Examples:
\`\`\`text
Buttons:     ${radii[1]}px
Inputs:      ${radii[1]}px
Cards:       ${radii[2]}px
Badges:      9999px
\`\`\`

---

# 6. SHADOWS & ELEVATION

\`\`\`text
Style: ${concept.shadow}
SM:    ${SHADOWS[concept.shadow] ? SHADOWS[concept.shadow].subtle : 'none'}
MD:    ${SHADOWS[concept.shadow] ? SHADOWS[concept.shadow].medium : 'none'}
LG:    ${SHADOWS[concept.shadow] ? SHADOWS[concept.shadow].medium : 'none'}
\`\`\`

## Rules

* Use shadows only to communicate elevation
* Avoid excessive floating-card effects

---

# 7. COMPONENTS

## Buttons

### Primary
\`\`\`text
Background: ${accent}
Text:       ${isD ? bg : '#FFFFFF'}
Radius:     ${radii[1]}px
Height:     44px
Padding:    10px 22px
Font weight: 600
\`\`\`

### Secondary
\`\`\`text
Background: ${surface}
Text:       ${text}
Border:     1px solid ${textMuted}
Radius:     ${radii[1]}px
\`\`\`

## Inputs
\`\`\`text
Height:     44px
Radius:     ${radii[0]}px
Border:     1px solid ${textMuted}
Background: ${bg}
\`\`\`

## Cards
\`\`\`text
Background: ${surface}
Radius:     ${radii[2]}px
Padding:    20px
Shadow:     ${SHADOWS[concept.shadow] ? SHADOWS[concept.shadow].subtle : 'none'}
\`\`\`

---

# 8. DESIGN TOKENS

Defined in \`tokens.json\` — single source of truth.

---

# 9. AI AGENT RULES

## Mandatory

* Follow this design system
* Reuse existing tokens
* Preserve visual consistency
* Check responsive behavior
* Consider all relevant UI states

## Forbidden

* Random colors outside the palette
* Random font families
* Random border radius
* Unnecessary components
* Excessive shadows and gradients

---

# 10. VISUAL QA CHECKLIST

Before considering UI work complete:

### Layout
* [ ] Alignment is consistent
* [ ] Spacing follows the spacing system
* [ ] No accidental overflow

### Typography
* [ ] Correct font: ${pair.heading} / ${pair.body}
* [ ] Correct weights and hierarchy

### Colors
* [ ] Only approved tokens are used
* [ ] Contrast is sufficient

### Components
* [ ] Existing components reused where possible
* [ ] Radius is consistent

---

# FINAL PRINCIPLE

The interface should feel like one product, not a collection of independently generated screens.

Consistency beats novelty.

Generated by DSgen — ${palette.name} · ${pair.name} · ${concept.name}
`;
  }

  function generateTokensJSON() {
    const palette = getPalette();
    const pair = getFontPair();
    const concept = getConcept();
    const { bg, surface, text, textMuted, accent } = getSafeColors(palette, concept);
    const radii = concept.radius;
    const spaceBase = concept.space * 4;
    const scale = TYPE_SCALES[concept.scale] || TYPE_SCALES.standard;

    return JSON.stringify({
      meta: { name: 'DSgen Project', palette: palette.name, fonts: pair.name, concept: concept.name },
      color: {
        background: bg,
        surface: surface,
        'text-primary': text,
        'text-muted': textMuted,
        accent: accent,
        'palette-original': palette.colors,
        success: '#22C55E', warning: '#F59E0B', error: '#EF4444', info: '#3B82F6',
      },
      typography: {
        'font-heading': pair.heading,
        'font-body': pair.body,
        'heading-weight': pair.hw,
        'body-weight': pair.bw,
        scale: { display: scale.title + 8, h1: scale.title, h2: Math.round(scale.title * 0.8), h3: Math.round(scale.title * 0.65), body: scale.body, small: scale.body - 2, caption: scale.body - 3 },
      },
      spacing: { unit: spaceBase, xs: spaceBase, sm: spaceBase * 2, md: spaceBase * 4, lg: spaceBase * 6, xl: spaceBase * 8, '2xl': spaceBase * 12, '3xl': spaceBase * 16, '4xl': spaceBase * 24 },
      radius: { none: 0, sm: radii[0], md: radii[1], lg: radii[2], full: 9999 },
      shadow: { style: concept.shadow },
    }, null, 2);
  }

  function generateComponentsMD() {
    const palette = getPalette();
    const pair = getFontPair();
    const concept = getConcept();
    const { bg, surface, text, textMuted, accent } = getSafeColors(palette, concept);
    const isD = isDark(bg);
    const radii = concept.radius;

    return `# Components

## Button

### Primary
\`\`\`html
<button class="btn btn-primary">Action</button>
\`\`\`

\`\`\`css
.btn-primary {
  background: ${accent};
  color: ${isD ? bg : '#FFFFFF'};
  border-radius: ${radii[1]}px;
  padding: 10px 22px;
  font-weight: 600;
  border: none;
  cursor: pointer;
}
\`\`\`

### Secondary
\`\`\`html
<button class="btn btn-secondary">Action</button>
\`\`\`

\`\`\`css
.btn-secondary {
  background: ${surface};
  color: ${text};
  border: 1px solid ${textMuted};
  border-radius: ${radii[1]}px;
  padding: 10px 22px;
  font-weight: 500;
  cursor: pointer;
}
\`\`\`

## Input

\`\`\`html
<input type="text" class="input" placeholder="Placeholder">
\`\`\`

\`\`\`css
.input {
  height: 44px;
  border-radius: ${radii[0]}px;
  border: 1px solid ${textMuted};
  background: ${bg};
  color: ${text};
  padding: 0 14px;
  font-family: '${pair.body}', sans-serif;
}
\`\`\`

## Card

\`\`\`html
<div class="card">
  <h3>Title</h3>
  <p>Content</p>
</div>
\`\`\`

\`\`\`css
.card {
  background: ${surface};
  border-radius: ${radii[2]}px;
  padding: 20px;
}
\`\`\`

## Badge

\`\`\`html
<span class="badge">Label</span>
\`\`\`

\`\`\`css
.badge {
  border-radius: 9999px;
  padding: 2px 10px;
  font-size: 13px;
  background: ${surface};
  color: ${text};
}
\`\`\`

---

Generated by DSgen — ${palette.name} · ${pair.name} · ${concept.name}
`;
  }

  async function downloadZip() {
    const palette = getPalette();
    const pair = getFontPair();
    const concept = getConcept();

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
    const fonts = FONTS.map((f) => f.family);
    const hf = wizard.headingFont || getFontPair().heading;
    const bf = wizard.bodyFont || getFontPair().body;
    headingSel.innerHTML = fonts.map((f) => '<option value="' + f + '"' + (f === hf ? ' selected' : '') + '>' + f + '</option>').join('');
    bodySel.innerHTML = fonts.map((f) => '<option value="' + f + '"' + (f === bf ? ' selected' : '') + '>' + f + '</option>').join('');

    const palGrid = $('#edit-palettes');
    palGrid.innerHTML = '';
    PALETTES.forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'edit-palette-btn' + (wizard.paletteId === p.id ? ' is-active' : '');
      btn.dataset.id = p.id;
      btn.innerHTML = p.colors.map((c) => '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + c + ';border:1px solid rgba(0,0,0,.08)"></span>').join('');
      btn.title = p.name;
      btn.addEventListener('click', () => {
        wizard.paletteId = p.id;
        $$('.edit-palette-btn').forEach((x) => x.classList.toggle('is-active', x.dataset.id === p.id));
        renderStep4();
      });
      palGrid.appendChild(btn);
    });

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
    const btn = $('#edit-toggle-btn');
    const isOpen = !panel.hidden;
    panel.hidden = isOpen;
    btn.textContent = isOpen ? 'Редактировать' : 'Готово';
    if (!isOpen) renderEditPanel();
  }

  /* ---------- Init ---------- */
  setTimeout(() => {
    loadFont('Manrope');
    loadFont('Inter');
    loadFont('Lora');

    wizard.paletteId = PALETTES[0].id;
    wizard.headingFont = FONT_PAIRS[0].heading;
    wizard.bodyFont = FONT_PAIRS[0].body;
    renderPalettes();
    renderFontPairs();
    renderConcepts();
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
  });
})();