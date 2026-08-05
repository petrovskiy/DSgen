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

  /* --- Data — inline fallback + загрузка из JSON (если сервер) --- */
  /* Полные данные хранятся в assets/data/*.json. При загрузке через
     file:// fetch заблокирован CORS — используем inline-копию ниже. */
  let PALETTES = [
    { "id": "warm-minimal", "name": "Тёплый минимализм", "colors": ["#FDFBF7","#F5F0E8","#D4A574","#8B5E34","#2B2B27"] },
    { "id": "ocean", "name": "Морской бриз", "colors": ["#F0F9FF","#BAE6FD","#38BDF8","#0284C7","#0F172A"] },
    { "id": "sunset", "name": "Закат", "colors": ["#FFF7ED","#FED7AA","#FB923C","#EA580C","#7C2D12"] },
    { "id": "forest", "name": "Лес", "colors": ["#ECFDF5","#BBF7D0","#34D399","#059669","#064E3B"] },
    { "id": "lavender", "name": "Лаванда", "colors": ["#F3E8FF","#D8B4FE","#A855F7","#7E22CE","#581C87"] },
    { "id": "rose", "name": "Роза", "colors": ["#FFF1F2","#FECDD3","#FB7185","#E11D48","#9F1239"] },
    { "id": "indigo", "name": "Индиго", "colors": ["#E0E7FF","#A5B4FC","#6366F1","#4338CA","#312E81"] },
    { "id": "neon", "name": "Неон", "colors": ["#0F0E17","#23203A","#FF8906","#E53170","#7A5AF0"] },
    { "id": "sand", "name": "Песок", "colors": ["#FEF9EF","#FDE68A","#F59E0B","#B45309","#78350F"] },
    { "id": "snow", "name": "Снег", "colors": ["#FFFFFF","#F8FAFC","#E2E8F0","#64748B","#0F172A"] },
    { "id": "wine", "name": "Вино", "colors": ["#FDF2F8","#FBCFE8","#EC4899","#BE185D","#701A4E"] },
    { "id": "hacker", "name": "Матрица", "colors": ["#010B07","#0A2E1A","#00FF7F","#39FF14","#E8FFE8"] },
    { "id": "gold", "name": "Золото", "colors": ["#FFFBE6","#FDE68A","#D97706","#92400E","#451A03"] },
    { "id": "arctic", "name": "Арктика", "colors": ["#ECFEFF","#A5F3FC","#22D3EE","#0891B2","#164E63"] },
    { "id": "coffee", "name": "Кофе", "colors": ["#FBF7F0","#E8DCCC","#A0846C","#5C4033","#2D1810"] },
    { "id": "cyberpunk", "name": "Киберпанк", "colors": ["#0B0518","#2B0F66","#7F3FF2","#F875AA","#F5F0FF"] },
    { "id": "olive", "name": "Оливковый", "colors": ["#F7FEE7","#ECFCCB","#84CC16","#4D7C0F","#365314"] },
    { "id": "fuchsia", "name": "Фуксия", "colors": ["#FDF4FF","#F5D0FE","#D946EF","#A21CAF","#701A75"] },
    { "id": "graphite", "name": "Графит", "colors": ["#16181D","#1E2128","#3D424C","#8A8F98","#E8EAED"] },
    { "id": "mango", "name": "Манго", "colors": ["#FFF9ED","#FFE5A3","#FFB347","#FF8C00","#CC7000"] },
    { "id": "lilac-mist", "name": "Сиреневый туман", "colors": ["#F5F3FF","#DDD6FE","#A78BFA","#7C3AED","#5B21B6"] },
    { "id": "tiffany", "name": "Тиффани", "colors": ["#F0FDFA","#CCFBF1","#2DD4BF","#0D9488","#115E59"] },
    { "id": "scarlet", "name": "Алый", "colors": ["#FEF2F2","#FECACA","#EF4444","#B91C1C","#7F1D1D"] },
    { "id": "rainy", "name": "Дождливый", "colors": ["#F8FAFC","#E2E8F0","#94A3B8","#475569","#1E293B"] },
    { "id": "amber", "name": "Янтарь", "colors": ["#FFFBEB","#FDE68A","#F59E0B","#D97706","#92400E"] },
    { "id": "emerald", "name": "Изумруд", "colors": ["#ECFDF5","#A7F3D0","#10B981","#047857","#064E3B"] },
    { "id": "sakura", "name": "Сакура", "colors": ["#FFF0F5","#F9A8D4","#F472B6","#DB2777","#9D174D"] },
    { "id": "stormy", "name": "Грозовой", "colors": ["#0F172A","#1E293B","#334155","#475569","#CBD5E1"] },
    { "id": "sun", "name": "Солнце", "colors": ["#FFFBE6","#FEF08A","#EAB308","#A16207","#713F12"] },
    { "id": "deep-ocean", "name": "Глубокий океан", "colors": ["#F0F9FF","#E0F2FE","#7DD3FC","#38BDF8","#0369A1"] },
    { "id": "chocolate", "name": "Шоколад", "colors": ["#FBF7F0","#D4A574","#A0724A","#6B4423","#3E2723"] },
    { "id": "burgundy", "name": "Бургунди", "colors": ["#FDF2F8","#FCE7F3","#F472B6","#BE123C","#6B0F2A"] },
    { "id": "sky", "name": "Небо", "colors": ["#F0F9FF","#E0F2FE","#93C5FD","#60A5FA","#1D4ED8"] },
    { "id": "mint", "name": "Мятный", "colors": ["#F3FAF7","#D1FAE5","#6EE7B7","#059669","#065F46"] },
    { "id": "terracotta", "name": "Терракота", "colors": ["#FEF7F3","#FED7AA","#D97A4A","#9C4221","#5C2211"] },
    { "id": "midnight", "name": "Полночь", "colors": ["#0B0E14","#1A1F2E","#2D3654","#4A5880","#8EA0C8"] },
    { "id": "spring", "name": "Весна", "colors": ["#F0FDF4","#BBF7D0","#4ADE80","#22C55E","#166534"] },
    { "id": "honey", "name": "Медовый", "colors": ["#FFF7ED","#FFEDD5","#FDBA74","#EA580C","#9A3412"] },
    { "id": "sapphire", "name": "Сапфир", "colors": ["#EFF6FF","#BFDBFE","#3B82F6","#2563EB","#1E40AF"] },
    { "id": "bamboo", "name": "Бамбук", "colors": ["#F7FEE7","#D9F99D","#65A30D","#4D7C0F","#3F6212"] },
    { "id": "lilac", "name": "Лиловый", "colors": ["#FAF5FF","#E9D5FF","#C084FC","#9333EA","#6B21A8"] },
    { "id": "mocha", "name": "Мокко", "colors": ["#FAF7F2","#E8DDD0","#C4AD93","#8B7355","#4A3F32"] },
    { "id": "ruby", "name": "Рубин", "colors": ["#FFF1F2","#FFA3A3","#F43F5E","#BE123C","#881337"] },
    { "id": "foggy", "name": "Туманный", "colors": ["#F9FAFB","#F3F4F6","#D1D5DB","#6B7280","#374151"] },
    { "id": "agate", "name": "Агат", "colors": ["#FDF4FF","#FAE8FF","#E879F9","#C026D3","#86198F"] },
    { "id": "cinnamon", "name": "Корица", "colors": ["#FFF9ED","#FDE68A","#D97706","#B45309","#92400E"] },
    { "id": "turquoise", "name": "Бирюза", "colors": ["#F0FDFA","#CCFBF1","#5EEAD4","#14B8A6","#0F766E"] },
    { "id": "pomegranate", "name": "Гранат", "colors": ["#FFF1F2","#FFC4C4","#E5484D","#C1121F","#780A16"] },
    { "id": "silver", "name": "Серебро", "colors": ["#F8F9FA","#E9ECEF","#CED4DA","#6C757D","#343A40"] },
    { "id": "aurora", "name": "Аврора", "colors": ["#F0F9FF","#E0F2FE","#93C5FD","#60A5FA","#1D4ED8"] }
  ];
  let FONT_PAIRS = [
    { "id": "pair1", "name": "Yeseva One + Comfortaa", "heading": "Yeseva One", "body": "Comfortaa", "hw": 500, "bw": 400, "note": "Изящный заголовок, мягкий текст" },
    { "id": "pair2", "name": "Merriweather + Open Sans", "heading": "Merriweather", "body": "Open Sans", "hw": 500, "bw": 400, "note": "Классическая редакционная пара" },
    { "id": "pair3", "name": "IBM Plex Serif + IBM Plex Sans", "heading": "IBM Plex Serif", "body": "IBM Plex Sans", "hw": 500, "bw": 400, "note": "Единая система, антиква + гротеск" },
    { "id": "pair4", "name": "Raleway + Raleway", "heading": "Raleway", "body": "Raleway", "hw": 600, "bw": 400, "note": "Один шрифт, разный вес" },
    { "id": "pair5", "name": "Bitter + Open Sans", "heading": "Bitter", "body": "Open Sans", "hw": 500, "bw": 400, "note": "Контрастная, современная классика" },
    { "id": "pair6", "name": "Cormorant + Open Sans", "heading": "Cormorant", "body": "Open Sans", "hw": 500, "bw": 400, "note": "Премиальная, журнальная" },
    { "id": "pair7", "name": "Andika + Roboto", "heading": "Andika", "body": "Roboto", "hw": 500, "bw": 400, "note": "Дружелюбная, детская, читаемая" },
    { "id": "pair8", "name": "Viaoda Libre + Inter", "heading": "Viaoda Libre", "body": "Inter", "hw": 500, "bw": 400, "note": "Каллиграфический заголовок" },
    { "id": "pair9", "name": "Noto Serif + Roboto", "heading": "Noto Serif", "body": "Roboto", "hw": 500, "bw": 400, "note": "Строгая, универсальная" },
    { "id": "pair10", "name": "Yeseva One + Roboto", "heading": "Yeseva One", "body": "Roboto", "hw": 500, "bw": 400, "note": "Элегантный заголовок, нейтральный текст" },
    { "id": "pair11", "name": "Ubuntu + Open Sans", "heading": "Ubuntu", "body": "Open Sans", "hw": 500, "bw": 400, "note": "Современная, технологичная" },
    { "id": "pair12", "name": "Playfair Display + Lato", "heading": "Playfair Display", "body": "Lato", "hw": 500, "bw": 400, "note": "Элегантная, премиальная" },
    { "id": "pair13", "name": "Playfair Display + Source Sans Pro", "heading": "Playfair Display", "body": "Source Sans Pro", "hw": 500, "bw": 400, "note": "Акцидентная, журнальная" },
    { "id": "pair14", "name": "Nunito + PT Sans", "heading": "Nunito", "body": "PT Sans", "hw": 600, "bw": 400, "note": "Мягкая, дружелюбная" },
    { "id": "pair15", "name": "Jost + Roboto", "heading": "Jost", "body": "Roboto", "hw": 500, "bw": 400, "note": "Геометричная, современная" },
    { "id": "pair16", "name": "Manrope + Manrope", "heading": "Manrope", "body": "Manrope", "hw": 600, "bw": 400, "note": "Моно-стиль, универсальная" },
    { "id": "pair17", "name": "Marmelad + Roboto", "heading": "Marmelad", "body": "Roboto", "hw": 500, "bw": 400, "note": "Игривый заголовок, строгий текст" },
    { "id": "pair18", "name": "Forum + Arimo", "heading": "Forum", "body": "Arimo", "hw": 400, "bw": 400, "note": "Винтажная, благородная" },
    { "id": "pair19", "name": "Tenor Sans + Roboto", "heading": "Tenor Sans", "body": "Roboto", "hw": 500, "bw": 400, "note": "Чистая, минималистичная" },
    { "id": "pair20", "name": "Inter + Playfair Display", "heading": "Playfair Display", "body": "Inter", "hw": 500, "bw": 400, "note": "Гротеск + антиква, премиально" },
    { "id": "pair21", "name": "Inter + EB Garamond", "heading": "EB Garamond", "body": "Inter", "hw": 500, "bw": 400, "note": "Утончённая, для подписей" },
    { "id": "pair22", "name": "IBM Plex Sans + Vela Sans", "heading": "IBM Plex Sans", "body": "Vela Sans", "hw": 500, "bw": 400, "note": "Чистая, медицинская" },
    { "id": "pair23", "name": "Geologica + Nunito", "heading": "Geologica", "body": "Nunito", "hw": 500, "bw": 400, "note": "Эмпатичная, тёплая" },
    { "id": "pair24", "name": "Bebas Neue + Noto Sans Display", "heading": "Bebas Neue", "body": "Noto Sans Display", "hw": 600, "bw": 400, "note": "Акцидентная, IT-стиль" },
    { "id": "pair25", "name": "Lora + LTSuperior", "heading": "Lora", "body": "Manrope", "hw": 500, "bw": 400, "note": "Антиква + гротеск" },
    { "id": "pair26", "name": "Manrope + LinguaFranca", "heading": "Manrope", "body": "Lora", "hw": 600, "bw": 400, "note": "Креативная, контрастная" },
    { "id": "pair27", "name": "Playfair Display + Oswald", "heading": "Playfair Display", "body": "Oswald", "hw": 500, "bw": 400, "note": "Антиква + гротеск" },
    { "id": "pair28", "name": "Martian Mono + Inter", "heading": "Martian Mono", "body": "Inter", "hw": 500, "bw": 400, "note": "Моноширинный акцент" },
    { "id": "pair29", "name": "Handjet + Inter", "heading": "Handjet", "body": "Inter", "hw": 500, "bw": 400, "note": "Пиксельная, игровая" },
    { "id": "pair30", "name": "Noto Serif + Open Sans", "heading": "Noto Serif", "body": "Open Sans", "hw": 500, "bw": 400, "note": "Классическая универсальная" },
    { "id": "pair31", "name": "Golos Text + Manrope", "heading": "Golos Text", "body": "Manrope", "hw": 500, "bw": 400, "note": "Государственная, строгая" },
    { "id": "pair32", "name": "Onest + PT Sans", "heading": "Onest", "body": "PT Sans", "hw": 500, "bw": 400, "note": "Современная, читаемая" }
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
    soft: { subtle: '0 1px 2px rgba(28,25,23,.06), 0 1px 3px rgba(28,25,23,.05)', medium: '0 4px 6px rgba(28,25,23,.08), 0 10px 24px rgba(28,25,23,.07)', focus: '0 0 0 3px rgba(161,98,7,.18)' },
    medium: { subtle: '0 2px 4px rgba(28,25,23,.08)', medium: '0 8px 16px rgba(28,25,23,.10), 0 16px 40px rgba(28,25,23,.10)', focus: '0 0 0 4px rgba(161,98,7,.26)' },
    strong: { subtle: '0 3px 6px rgba(28,25,23,.10)', medium: '0 12px 24px rgba(28,25,23,.14), 0 24px 60px rgba(28,25,23,.20)', focus: '0 0 0 4px rgba(161,98,7,.30)' },
    none: { subtle: 'none', medium: 'none', focus: '0 0 0 3px rgba(161,98,7,.25)' },
    brutal: { subtle: '4px 4px 0 rgba(20,20,20,1)', medium: '5px 5px 0 rgba(20,20,20,1), 9px 9px 0 rgba(20,20,20,.18)', focus: '0 0 0 3px rgba(20,20,20,.3)' },
    glow: { subtle: '0 0 12px rgba(255,137,6,.35)', medium: '0 0 22px rgba(255,137,6,.5), 0 4px 14px rgba(0,0,0,.5)', focus: '0 0 0 3px rgba(255,137,6,.4)' },
  };

  const TYPE_SCALES = { compact: { title: 26, body: 14 }, standard: { title: 32, body: 15 }, large: { title: 40, body: 17 } };

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

    // Показывать FAB только на шаге 4
    const fab = $('#edit-toggle-btn');
    if (fab) fab.hidden = step !== 4;

    if (step === 4) { renderStep4(); renderEditPanel(); }
    // Закрыть drawer при переходе на другой шаг
    if (step !== 4) {
      const panel = $('#edit-panel');
      if (panel) panel.hidden = true;
    }
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

  function conceptBadges(sc) {
    if (!sc) return '';
    const parts = [];
    if (sc.animation && sc.animation.style) parts.push(sc.animation.style);
    if (sc.density && sc.density.ui) parts.push(sc.density.ui);
    if (sc.borders && sc.borders.thickness !== '1px') parts.push('рамки ' + sc.borders.thickness);
    if (sc.icons && sc.icons.strokeWidth) parts.push('stroke ' + sc.icons.strokeWidth);
    if (sc.letterSpacing && sc.letterSpacing.heading !== '0') parts.push('ls ' + sc.letterSpacing.heading);
    if (sc.layout && sc.layout.maxWidth) parts.push('ширина ' + sc.layout.maxWidth);
    return parts.join(' · ');
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
      const badges = conceptBadges(c.styleConfig);
      card.innerHTML =
        '<div class="concept-head" style="background:' + c.color + '">' +
          '<svg class="icon concept-icon" aria-hidden="true"><use href="#' + c.icon + '"></use></svg>' +
          '<span class="concept-name">' + c.name + '</span>' +
        '</div>' +
        '<div class="concept-divider"></div>' +
        '<span class="concept-desc">' + c.desc + '</span>' +
        (badges ? '<div class="concept-badges">' + badges + '</div>' : '');
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

  /* ---------- Генераторы ---------- */

  function generateDesignMD() {
    const palette = getPalette();
    const pair = getFontPair();
    const concept = getConcept();
    const { bg, surface, text, textMuted, accent } = getSafeColors(palette, concept);
    const isD = isDark(bg);
    const scale = TYPE_SCALES[concept.scale] || TYPE_SCALES.standard;
    const radii = concept.radius;
    const spaceBase = concept.space * 4;
    const sc = concept.styleConfig || {};
    const shadow = SHADOWS[concept.shadow] || SHADOWS.soft;
    const date = new Date().toISOString().slice(0, 10);
    const secText = isD ? mix(text, '#ffffff', 0.3) : textMuted;
    const borderCol = isD ? mix(bg, '#ffffff', 0.15) : mix(text, '#ffffff', 0.7);
    const sText = isD ? mix(text, '#ffffff', 0.2) : mix(text, '#ffffff', 0.4);
    const bgSubtle = isD ? mix(bg, '#ffffff', 0.04) : mix(bg, '#000000', 0.02);
    const surfaceElevated = isD ? mix(surface, '#ffffff', 0.05) : surface;
    const surfaceHover = isD ? mix(surface, '#ffffff', 0.08) : mix(surface, '#000000', 0.03);
    const borderSubtle = isD ? mix(borderCol, bg, 0.3) : mix(borderCol, '#ffffff', 0.3);

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
Primary Hover:  ${mix(accent, isD ? '#ffffff' : '#000000', 0.15)}
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
Success: #22C55E
Warning: #F59E0B
Error:   #EF4444
Info:    #3B82F6
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
Hover:    ${mix(accent, isD ? '#ffffff' : '#000000', 0.15)}
Active:   ${mix(accent, isD ? '#ffffff' : '#000000', 0.3)}
Focus:    ${shadow.focus}
Disabled: ${sText} bg, ${borderCol} text
Loading:  spinner + ${mix(accent, '#000000', 0.2)}
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

\`\`\`text
Режимы: ${isD ? 'Тёмная' : 'Светлая'}
По умолчанию: ${isD ? 'Тёмная' : 'Светлая'}
\`\`\`

## ${isD ? 'Тёмная (текущая)' : 'Светлая (текущая)'}

\`\`\`text
Background: ${bg}
Surface: ${surface}
Text: ${text}
Border: ${borderCol}
Primary: ${accent}
\`\`\`

## ${isD ? 'Светлая (альтернативная)' : 'Тёмная (альтернативная)'}

\`\`\`text
Background: ${isD ? '#FFFFFF' : '#0F0E17'}
Surface: ${isD ? '#FAFAF9' : '#1A1A2E'}
Text: ${isD ? '#1C1917' : '#E8EAED'}
Border: ${isD ? '#E7E5E4' : '#2D2D3F'}
Primary: ${accent}
\`\`\`

Правила:

* Не просто инвертируй цвета
* Поддерживай иерархию и контраст в обоих режимах
* Семантические цвета должны оставаться узнаваемыми в обеих темах

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
    const { bg, surface, text, textMuted, accent } = getSafeColors(palette, concept);
    const radii = concept.radius;
    const spaceBase = concept.space * 4;
    const scale = TYPE_SCALES[concept.scale] || TYPE_SCALES.standard;
    const isD = isDark(bg);
    const sc = concept.styleConfig || {};

    return JSON.stringify({
      meta: { name: 'DSgen Project', palette: palette.name, fonts: pair.name, concept: concept.name },
      color: {
        background: bg,
        surface: surface,
        'text-primary': text,
        'text-secondary': isD ? mix(text, '#ffffff', 0.3) : textMuted,
        'text-muted': textMuted,
        'text-inverse': isD ? '#1C1917' : '#FFFFFF',
        accent: accent,
        'accent-hover': mix(accent, isD ? '#ffffff' : '#000000', 0.15),
        'accent-active': mix(accent, isD ? '#ffffff' : '#000000', 0.3),
        'border': isD ? mix(bg, '#ffffff', 0.15) : mix(text, '#ffffff', 0.7),
        'palette-original': palette.colors,
        success: '#22C55E', warning: '#F59E0B', error: '#EF4444', info: '#3B82F6',
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
    const { bg, surface, text, textMuted, accent } = getSafeColors(palette, concept);
    const isD = isDark(bg);
    const radii = concept.radius;
    const sc = concept.styleConfig || {};
    const comp = sc.components || {};
    const borderCol = isD ? mix(bg, '#ffffff', 0.15) : mix(text, '#ffffff', 0.7);
    const secText = isD ? mix(text, '#ffffff', 0.3) : textMuted;

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
  transition: background 0.2s, box-shadow 0.2s;
}
.btn-primary:hover {
  background: ${mix(accent, isD ? '#ffffff' : '#000000', 0.15)};
}
.btn-primary:focus-visible {
  box-shadow: 0 0 0 3px ${mix(accent, '#ffffff', 0.5)};
  outline: none;
}
.btn-primary:disabled {
  background: ${secText};
  color: ${isD ? bg : '#FFFFFF'};
  opacity: 0.5;
  cursor: not-allowed;
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
  border: 1px solid ${borderCol};
  border-radius: ${radii[1]}px;
  padding: 10px 22px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
}
.btn-secondary:hover {
  background: ${mix(surface, isD ? '#ffffff' : '#000000', isD ? 0.05 : 0.03)};
}
.btn-secondary:focus-visible {
  box-shadow: 0 0 0 3px ${mix(accent, '#ffffff', 0.5)};
  outline: none;
}
\`\`\`

### Ghost
\`\`\`html
<button class="btn btn-ghost">Action</button>
\`\`\`

\`\`\`css
.btn-ghost {
  background: transparent;
  color: ${accent};
  border: none;
  border-radius: ${radii[1]}px;
  padding: 10px 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-ghost:hover {
  background: ${mix(accent, '#ffffff', 0.9)};
}
.btn-ghost:focus-visible {
  box-shadow: 0 0 0 3px ${mix(accent, '#ffffff', 0.5)};
  outline: none;
}
\`\`\`

### Destructive
\`\`\`html
<button class="btn btn-destructive">Delete</button>
\`\`\`

\`\`\`css
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
.btn-destructive:hover {
  background: #DC2626;
}
.btn-destructive:focus-visible {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.4);
  outline: none;
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
  border: 1px solid ${borderCol};
  background: ${bg};
  color: ${text};
  padding: 0 14px;
  font-family: '${pair.body}', sans-serif;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.input:hover {
  border-color: ${textMuted};
}
.input:focus {
  border-color: ${accent};
  box-shadow: 0 0 0 3px ${mix(accent, '#ffffff', 0.5)};
  outline: none;
}
.input:disabled {
  background: ${isD ? mix(bg, '#ffffff', 0.04) : mix(bg, '#000000', 0.02)};
  color: ${secText};
  cursor: not-allowed;
}
.input--error {
  border-color: #EF4444;
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
  box-shadow: ${SHADOWS[concept.shadow] ? SHADOWS[concept.shadow].subtle : 'none'};
  transition: box-shadow 0.3s;
}
.card:hover {
  box-shadow: ${SHADOWS[concept.shadow] ? SHADOWS[concept.shadow].medium : 'none'};
}
\`\`\`

## Badge

\`\`\`html
<span class="badge badge--default">Label</span>
<span class="badge badge--success">Success</span>
<span class="badge badge--warning">Warning</span>
<span class="badge badge--error">Error</span>
<span class="badge badge--info">Info</span>
\`\`\`

\`\`\`css
.badge {
  border-radius: 9999px;
  padding: 2px 10px;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.badge--default {
  background: ${surface};
  color: ${text};
}
.badge--success {
  background: #22C55E;
  color: #FFFFFF;
}
.badge--warning {
  background: #F59E0B;
  color: #FFFFFF;
}
.badge--error {
  background: #EF4444;
  color: #FFFFFF;
}
.badge--info {
  background: #3B82F6;
  color: #FFFFFF;
}
\`\`\`

## Navigation

\`\`\`html
<nav class="navbar">
  <a href="#" class="navbar-link is-active">Home</a>
  <a href="#" class="navbar-link">About</a>
  <a href="#" class="navbar-link">Contact</a>
</nav>
\`\`\`

\`\`\`css
.navbar {
  display: flex;
  align-items: center;
  height: ${comp.navigation ? comp.navigation.height : '56px'};
  background: ${bg};
  gap: 24px;
  padding: 0 ${concept.space * 6}px;
}
.navbar-link {
  color: ${textMuted};
  text-decoration: none;
  font-size: 15px;
  padding: 8px 0;
  border-bottom: 2px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}
.navbar-link:hover {
  color: ${text};
}
.navbar-link.is-active {
  color: ${accent};
  border-bottom-color: ${accent};
}
\`\`\`

## Modal

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

\`\`\`css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}
.modal {
  background: ${surface};
  border-radius: ${radii[2]}px;
  width: ${comp.modal ? comp.modal.width : '480px'};
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
  padding: 24px;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}
\`\`\`

---

Generated by DSgen — ${palette.name} · ${pair.name} · ${concept.name}
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

    initStickyShadow();
  }

  init();
})();