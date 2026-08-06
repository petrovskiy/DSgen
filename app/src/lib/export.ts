'use client';

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { Palette, FontPair, Concept, ColorSystem } from './types';
import { buildShadow, TYPE_SCALES } from './shadows';
import { mix, clamp, analyzePalette, generateAltTheme } from './color';

/** Получить ColorSystem с учётом переключения темы */
export function getSafeColors(palette: Palette, themeMode: 'light' | 'dark' | null): ColorSystem {
  const pMode = palette.primaryMode || palette.colorSystem?.mode;
  const useAlt = Boolean(themeMode && pMode && themeMode !== pMode);
  return getSemanticColors(palette, useAlt);
}

/** Получить семантические цвета из палитры */
export function getSemanticColors(palette: Palette, useAlt: boolean): ColorSystem {
  if (useAlt && palette.colorSystemAlt) return palette.colorSystemAlt as ColorSystem;
  if (useAlt && palette.colorSystem) {
    if (!palette._colorSystemAlt) {
      palette._colorSystemAlt = generateAltTheme(palette.colorSystem as ColorSystem);
    }
    return palette._colorSystemAlt as ColorSystem;
  }
  if (!palette.colorSystem) {
    palette.colorSystem = analyzePalette(palette.colors);
    palette.primaryMode = palette.colorSystem.mode;
  }
  if (useAlt) {
    if (!palette._colorSystemAlt) {
      palette._colorSystemAlt = generateAltTheme(palette.colorSystem as ColorSystem);
    }
    return palette._colorSystemAlt as ColorSystem;
  }
  return palette.colorSystem as ColorSystem;
}

/** Сгенерировать design.md */
export function generateDesignMD(
  palette: Palette,
  pair: FontPair,
  concept: Concept,
  themeMode: 'light' | 'dark' | null
): string {
  const cs = getSafeColors(palette, themeMode);
  const primaryCs = getSemanticColors(palette, false);
  const altCs = getSemanticColors(palette, true);
  const csLight = primaryCs.mode === 'light' ? primaryCs : altCs;
  const csDark = primaryCs.mode === 'dark' ? primaryCs : altCs;
  const bg = cs.background;
  const surface = cs.surface;
  const text = cs.textPrimary;
  const textMuted = cs.textMuted;
  const accent = cs.accent;
  const isD = cs.mode === 'dark';
  const scale = TYPE_SCALES[concept.scale] || TYPE_SCALES.standard;
  const radii = concept.radius;
  const spaceBase = concept.space * 4;
  const sc = concept.styleConfig || {};
  const shadow = buildShadow(concept.shadow, accent);
  const date = new Date().toISOString().slice(0, 10);
  const secText =
    cs.textSecondary === cs.accent
      ? mix(cs.textSecondary, cs.background, 0.35)
      : cs.textSecondary;
  const borderCol = cs.border;
  const textDisabled = isD ? mix(text, bg, 0.45) : mix(text, bg, 0.55);
  const bgDisabled = isD ? mix(surface, '#000000', 0.15) : mix(surface, '#000000', 0.04);
  const sText = textDisabled;
  const bgSubtle = bgDisabled;
  const surfaceElevated = cs.surfaceElevated;
  const surfaceHover = isD ? mix(surface, '#ffffff', 0.08) : mix(surface, '#000000', 0.03);

  const conceptKeywords: Record<string, string> = {
    strict: 'Строгий / Деловой / Чёткий',
    neon: 'Неоновый / Футуристический / Дерзкий',
    glass: 'Стеклянный / Мягкий / Современный',
    brutal: 'Брутальный / Резкий / Сырой',
    minimal: 'Минимальный / Чистый / Воздушный',
    premium: 'Премиальный / Элегантный / Тёмный',
    friendly: 'Дружелюбный / Тёплый / Мягкий',
    tech: 'Технологичный / Холодный / Точный',
    retro: 'Винтажный / Приглушённый / Ностальгический',
    nature: 'Природный / Землистый / Спокойный',
  };
  const keywords = conceptKeywords[concept.id] || 'Современный / Чистый';

  const effectsLines: string[] = [];
  if (sc.effects) {
    const e = sc.effects;
    const blurEnabled = typeof e.blur === 'object' ? e.blur.enabled : Boolean(e.blur);
    const blurStrength = typeof e.blur === 'object' ? e.blur.strength || '8px' : '8px';
    if (blurEnabled)
      effectsLines.push(`Blur: \`backdrop-filter: blur(${blurStrength})\` — применять на .card--glass, .navbar--glass, .modal`);
    if (e.glassmorphism)
      effectsLines.push(
        `Glassmorphism: \`background: rgba(c.surface, 0.15); border: 1px solid rgba(c.border, 0.5)\` — на .card--glass`
      );
    const noiseEnabled = typeof e.noise === 'object' ? e.noise.enabled : Boolean(e.noise);
    const noiseOpacity = typeof e.noise === 'object' ? e.noise.opacity || '5%' : '5%';
    if (noiseEnabled)
      effectsLines.push(
        `Noise/Grain: SVG-фильтр с opacity ${noiseOpacity} — псевдоэлемент ::before на .card`
      );
    const glowEnabled = typeof e.glow === 'object' ? e.glow.enabled : Boolean(e.glow);
    const glowIntensity = typeof e.glow === 'object' ? e.glow.intensity || '20px' : '20px';
    if (glowEnabled)
      effectsLines.push(
        `Glow: \`box-shadow: 0 0 ${glowIntensity} var(--accent)\` — на .card, .btn-primary:focus`
      );
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
Background:          ${bg}
Background Disabled: ${bgDisabled}
Surface:             ${surface}
Surface Elevated:     ${surfaceElevated}
Surface Hover:       ${surfaceHover}
\`\`\`

## Текст

\`\`\`text
Text Primary:   ${text}
Text Secondary: ${secText}
Text Muted:     ${textMuted}
Text Disabled:  ${textDisabled}
Text Inverse:   ${isD ? '#1C1917' : '#FFFFFF'}
\`\`\`

## Границы

\`\`\`text
Border:        ${borderCol}
Border Subtle: ${cs.borderSubtle}
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

## Вертикальные отступы (секции, блоки)

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

## Отступы для layout (паддинги контейнера, gap сетки)

\`\`\`text
container-padding: ${clamp(spaceBase, 16, 32)}px
grid-gap:          ${Math.round(clamp(Math.round(spaceBase * 0.8), 12, 24) / 4) * 4}px
\`\`\`

## Правила

* Для вертикальных отступов между секциями используй большую шкалу (md–4xl)
* Для горизонтальных паддингов и gap используй layout-шкалу (16–32px)
* Отдавай предпочтение токенам отступов, а не произвольным значениям

---

# 6. РАЗМЕТКА (LAYOUT)

## Контейнер

\`\`\`text
Максимальная ширина: ${layout.maxWidth || '1200px'}
Горизонтальный паддинг: ${clamp(spaceBase, 16, 32)}px
\`\`\`

## Сетка

\`\`\`text
Колонки: 12
Промежуток (gap): ${clamp(Math.round(spaceBase * 0.8), 12, 24)}px
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
SM:   ${radii[0]}px
MD:   ${radii[1]}px
LG:   ${radii[2]}px
Full: 9999px
\`\`\`

## Правила

Примеры:
\`\`\`text
Кнопки:    ${radii[1]}px
Инпуты:    ${radii[0]}px
Карточки:  ${radii[2]}px
Диалоги:   ${radii[2]}px
Бейджи:    9999px
\`\`\`

Не смешивай значения радиуса произвольно.

---

# 8. ГРАНИЦЫ И РАЗДЕЛИТЕЛИ

\`\`\`text
Обычная толщина: ${borders.thickness || '1px'}
Усиленная толщина: ${parseInt(borders.thickness || '1') * 2}px
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
Disabled: ${bgDisabled} bg, ${textDisabled} text
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
Толщина линии (stroke width): ${Math.max(1.5, icons.strokeWidth || 1.5)}
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
Одноколоночный layout, навигация — гамбургер, паддинги ${clamp(spaceBase - 4, 12, 24)}px
\`\`\`

## Tablet

\`\`\`text
Двухколоночный layout, навигация — topbar, паддинги ${clamp(spaceBase, 16, 32)}px
\`\`\`

## Desktop

\`\`\`text
Многоколоночный layout, полная навигация, паддинги ${clamp(spaceBase, 16, 32)}px, максимум ${layout.maxWidth || '1200px'}
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
Text Disabled:  ${mix(csLight.textPrimary, csLight.background, 0.55)}
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
Text Disabled:  ${mix(csDark.textPrimary, csDark.background, 0.45)}
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
${
  density.info === 'высокая'
    ? 'Высокая — много данных на экране, компактные отступы'
    : density.info === 'низкая'
      ? 'Низкая — воздух, минимум элементов на экране'
      : 'Средняя — сбалансированный объём контента'
}
\`\`\`

## Правила

\`\`\`text
${
  density.ui === 'компактная'
    ? 'Максимум информации, минимальные отступы'
    : density.ui === 'просторная'
      ? 'Просторный интерфейс, крупные отступы, фокус на контенте'
      : 'Сбалансированный интерфейс, комфортные отступы'
}
\`\`\`

---

# 18. ВИЗУАЛЬНЫЕ ЭФФЕКТЫ

${effectsLines.length ? effectsLines.map((l) => '## ' + l).join('\n\n') : '## Нет разрешённых эффектов'}

---

# 19. ДИЗАЙН-ПАТТЕРНЫ

Предпочитаемые паттерны:

* Токенизированные компоненты
* Последовательная цветовая система
* Чёткая иерархия заголовков
* ${
  density.ui === 'просторная'
    ? 'Минималистичные макеты'
    : density.ui === 'компактная'
      ? 'Плотные информационные макеты'
      : 'Сбалансированные макеты'
}

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

/** Сгенерировать tokens.json */
export function generateTokensJSON(
  palette: Palette,
  pair: FontPair,
  concept: Concept,
  themeMode: 'light' | 'dark' | null
): string {
  const cs = getSafeColors(palette, themeMode);
  const primaryCs = getSemanticColors(palette, false);
  const altCs = getSemanticColors(palette, true);
  const csLight = primaryCs.mode === 'light' ? primaryCs : altCs;
  const csDark = primaryCs.mode === 'dark' ? primaryCs : altCs;
  const scale = TYPE_SCALES[concept.scale] || TYPE_SCALES.standard;
  const radii = concept.radius;
  const spaceBase = concept.space * 4;
  const sc = concept.styleConfig || {};

  const colorToken = (c: ColorSystem) => ({
    background: c.background,
    surface: c.surface,
    'surface-elevated': c.surfaceElevated,
    'text-primary': c.textPrimary,
    'text-secondary': c.textSecondary,
    'text-muted': c.textMuted,
    'text-disabled':
      c.mode === 'dark'
        ? mix(c.textPrimary, c.background, 0.45)
        : mix(c.textPrimary, c.background, 0.55),
    'bg-disabled':
      c.mode === 'dark'
        ? mix(c.surface, '#000000', 0.15)
        : mix(c.surface, '#000000', 0.04),
    'text-inverse': c.mode === 'dark' ? '#1C1917' : '#FFFFFF',
    accent: c.accent,
    'accent-hover': c.accentHover,
    'accent-active': mix(c.accent, c.mode === 'dark' ? '#ffffff' : '#000000', 0.3),
    'accent-soft': c.accentSoft,
    border: c.border,
    'border-subtle': c.borderSubtle,
    success: c.semantic.success,
    warning: c.semantic.warning,
    error: c.semantic.error,
    info: c.semantic.info,
  });

  return JSON.stringify(
    {
      meta: {
        name: 'Design Kit Project',
        palette: palette.name,
        fonts: pair.name,
        concept: concept.name,
        date: new Date().toISOString().slice(0, 10),
      },
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
        'letter-spacing-heading':
          (sc.letterSpacing && sc.letterSpacing.heading) || '0',
        scale: {
          display: scale.title + 8,
          h1: scale.title,
          h2: Math.round(scale.title * 0.8),
          h3: Math.round(scale.title * 0.65),
          body: scale.body,
          small: scale.body - 2,
          caption: scale.body - 3,
        },
      },
      spacing: {
        unit: spaceBase,
        '3xs': Math.round(spaceBase / 4),
        '2xs': Math.round(spaceBase / 2),
        xs: spaceBase,
        sm: spaceBase * 2,
        md: spaceBase * 4,
        lg: spaceBase * 6,
        xl: spaceBase * 8,
        '2xl': spaceBase * 12,
        '3xl': spaceBase * 16,
        '4xl': spaceBase * 24,
        'container-padding': clamp(spaceBase, 16, 32),
        'grid-gap': clamp(Math.round(spaceBase * 0.8), 12, 24),
      },
      radius: { none: 0, sm: radii[0], md: radii[1], lg: radii[2], full: 9999 },
      shadow: { style: concept.shadow },
      effects: sc.effects || {},
      borders: sc.borders || {},
      animation: sc.animation || {},
      density: sc.density || {},
      icons: sc.icons || {},
      layout: sc.layout || {},
    },
    null,
    2
  );
}

/** Сгенерировать components.md */
export function generateComponentsMD(
  palette: Palette,
  pair: FontPair,
  concept: Concept,
  themeMode: 'light' | 'dark' | null
): string {
  void themeMode;
  const primaryCs = getSemanticColors(palette, false);
  const altCs = getSemanticColors(palette, true);
  const csL = primaryCs.mode === 'light' ? primaryCs : altCs;
  const csD = primaryCs.mode === 'dark' ? primaryCs : altCs;
  const radii = concept.radius;
  const sc = concept.styleConfig || {};
  const comp = sc.components || {};
  const eff = sc.effects || {};

  const btnCSS = (c: ColorSystem) =>
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
  background: ${
    c.mode === 'dark'
      ? mix(c.surface, '#000000', 0.15)
      : mix(c.surface, '#000000', 0.04)
  };
  color: ${
    c.mode === 'dark'
      ? mix(c.textPrimary, c.background, 0.45)
      : mix(c.textPrimary, c.background, 0.55)
  };
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
  background: ${
    c.mode === 'dark'
      ? mix(c.surface, '#ffffff', 0.05)
      : mix(c.surface, '#000000', 0.03)
  };
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

  const inputCSS = (c: ColorSystem) =>
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
  background: ${
    c.mode === 'dark'
      ? mix(c.surface, '#000000', 0.15)
      : mix(c.surface, '#000000', 0.04)
  };
  color: ${
    c.mode === 'dark'
      ? mix(c.textPrimary, c.background, 0.45)
      : mix(c.textPrimary, c.background, 0.55)
  };
  cursor: not-allowed;
}
.input--error { border-color: #EF4444; }
.input--success { border-color: #22C55E; }

.form-helper {
  display: block;
  font-size: 13px;
  margin-top: 4px;
}
.form-helper--error { color: #DC2626; }
.form-helper--success { color: #16A34A; }`;

  const cardCSS = (c: ColorSystem) => {
    const blurStrength =
      typeof eff.blur === 'object' ? eff.blur.strength || '8px' : '8px';
    const glassLine =
      eff.glassmorphism
        ? `  backdrop-filter: blur(${blurStrength});
  background: rgba(${parseInt(c.surface.slice(1, 3), 16)}, ${parseInt(c.surface.slice(3, 5), 16)}, ${parseInt(c.surface.slice(5, 7), 16)}, 0.15);
  border: 1px solid rgba(${parseInt(c.border.slice(1, 3), 16)}, ${parseInt(c.border.slice(3, 5), 16)}, ${parseInt(c.border.slice(5, 7), 16)}, 0.5);
  position: relative;
  overflow: hidden;
`
        : '';
    const glowEnabled = typeof eff.glow === 'object' ? eff.glow.enabled : Boolean(eff.glow);
    const glowIntensity = typeof eff.glow === 'object' ? eff.glow.intensity || '20px' : '20px';
    const glowLine = glowEnabled
      ? `  box-shadow: 0 0 ${glowIntensity} ${c.accent}44;
`
      : `  box-shadow: ${buildShadow(concept.shadow, c.accent).subtle};
`;
    const noiseEnabled = typeof eff.noise === 'object' ? eff.noise.enabled : Boolean(eff.noise);
    const noiseOpacity = typeof eff.noise === 'object' ? eff.noise.opacity || '5%' : '5%';
    const noiseLine = noiseEnabled
      ? `.card::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='${noiseOpacity}'/%3E%3C/svg%3E");
  opacity: ${parseInt(noiseOpacity) / 100};
  pointer-events: none;
  z-index: 0;
}
.card > * { position: relative; z-index: 1; }
`
      : '';
    const glowHover = glowEnabled
      ? `  box-shadow: 0 0 ${parseInt(glowIntensity) * 1.5}px ${c.accent}66;
`
      : `  box-shadow: ${buildShadow(concept.shadow, c.accent).medium};
`;
    return `.card {
${glassLine}  border-radius: ${radii[2]}px;
  padding: 20px;
${glowLine}  transition: box-shadow 0.3s;
}
.card:hover {
${glowHover}}
${noiseLine}`;
  };

  const badgeCSS = (c: ColorSystem) =>
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

  const navCSS = (c: ColorSystem) => {
    const blurStrength =
      typeof eff.blur === 'object' ? eff.blur.strength || '8px' : '8px';
    const glassNav = eff.glassmorphism
      ? `  backdrop-filter: blur(${blurStrength});
  background: rgba(${parseInt(c.background.slice(1, 3), 16)}, ${parseInt(c.background.slice(3, 5), 16)}, ${parseInt(c.background.slice(5, 7), 16)}, 0.15);
  border-bottom: 1px solid rgba(${parseInt(c.border.slice(1, 3), 16)}, ${parseInt(c.border.slice(3, 5), 16)}, ${parseInt(c.border.slice(5, 7), 16)}, 0.5);
`
      : `  background: ${c.background};
`;
    return `.navbar {
  display: flex;
  align-items: center;
  height: ${comp.navigation ? comp.navigation.height : '56px'};
${glassNav}  gap: 24px;
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
  };

  const modalCSS = (c: ColorSystem) => {
    const blurStrength =
      typeof eff.blur === 'object' ? eff.blur.strength || '12px' : '12px';
    const glassModal = eff.glassmorphism
      ? `  backdrop-filter: blur(${blurStrength});
  background: rgba(${parseInt(c.surface.slice(1, 3), 16)}, ${parseInt(c.surface.slice(3, 5), 16)}, ${parseInt(c.surface.slice(5, 7), 16)}, 0.2);
  border: 1px solid rgba(${parseInt(c.border.slice(1, 3), 16)}, ${parseInt(c.border.slice(3, 5), 16)}, ${parseInt(c.border.slice(5, 7), 16)}, 0.5);
`
      : `  background: ${c.surface};
`;
    const glowEnabled = typeof eff.glow === 'object' ? eff.glow.enabled : Boolean(eff.glow);
    const glowIntensity = typeof eff.glow === 'object' ? eff.glow.intensity || '20px' : '20px';
    const glowModal = glowEnabled
      ? `  box-shadow: 0 0 ${glowIntensity} ${c.accent}44;
`
      : `  box-shadow: ${buildShadow(concept.shadow, c.accent).medium};
`;
    return `.modal-overlay {
  position: fixed; inset: 0;
  background: ${eff.glassmorphism ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.4)'};
  display: flex; align-items: center; justify-content: center;
  z-index: 300;
}
.modal {
${glassModal}  border-radius: ${radii[2]}px;
  width: ${comp.modal ? comp.modal.width : '480px'};
  max-width: 90vw; max-height: 85vh;
  overflow-y: auto;
  padding: 24px;
${glowModal}}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16px;
}
.modal-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  margin-top: 24px;
}`;
  };

  const glassSection =
    eff.glassmorphism || (typeof eff.glow === 'object' ? eff.glow.enabled : Boolean(eff.glow))
      ? `
### Glass Card (при включённых эффектах)

\`\`\`html
<div class="card card--glass">
  <h3>Glass Surface</h3>
  <p>Полупрозрачная карточка с blur-фоном</p>
</div>
\`\`\`
`
      : '';

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
<input type="text" class="input input--success" placeholder="Success">
<span class="form-helper form-helper--error">Это поле обязательно</span>
<span class="form-helper form-helper--success">Проверка пройдена</span>
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
${glassSection}
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

/** Скачать ZIP-архив */
export async function downloadZip(
  palette: Palette,
  pair: FontPair,
  concept: Concept,
  themeMode: 'light' | 'dark' | null
): Promise<void> {
  const zip = new JSZip();
  const design = zip.folder('.design')!;

  design.file('design.md', generateDesignMD(palette, pair, concept, themeMode));
  design.file('tokens.json', generateTokensJSON(palette, pair, concept, themeMode));
  design.file('components.md', generateComponentsMD(palette, pair, concept, themeMode));

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'design-system.zip');
}
