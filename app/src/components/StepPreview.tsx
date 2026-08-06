'use client';

import { useEffect } from 'react';
import { Download, Settings } from 'lucide-react';
import type { Palette, FontPair, Concept, ColorSystem } from '@/lib/types';
import { getSafeColors } from '@/lib/export';
import { buildShadow, TYPE_SCALES } from '@/lib/shadows';
import { mix } from '@/lib/color';

interface StepPreviewProps {
  palette: Palette;
  pair: FontPair;
  concept: Concept;
  headingFont: string;
  bodyFont: string;
  themeMode: 'light' | 'dark' | null;
  onThemeModeChange: (mode: 'light' | 'dark' | null) => void;
  onDownload: () => void;
  onOpenDrawer: () => void;
  previewTab: 'web' | 'mobile';
  onPreviewTabChange: (tab: 'web' | 'mobile') => void;
}

export default function StepPreview({
  palette,
  pair,
  concept,
  headingFont,
  bodyFont,
  themeMode,
  onThemeModeChange,
  onDownload,
  onOpenDrawer,
  previewTab,
  onPreviewTabChange,
}: StepPreviewProps) {
  const cs = getSafeColors(palette, themeMode);
  const bg = cs.background;
  const surface = cs.surface;
  const text = cs.textPrimary;
  const textMuted = cs.textMuted;
  const accent = cs.accent;
  const primaryMode = palette.primaryMode || palette.colorSystem?.mode || 'light';
  const scale = TYPE_SCALES[concept.scale] || TYPE_SCALES.standard;
  const radii = concept.radius;
  const shadow = buildShadow(concept.shadow, accent);
  const hf = headingFont || pair.heading;
  const bf = bodyFont || pair.body;

  useEffect(() => {
    loadFont(hf);
    loadFont(bf);
  }, [hf, bf]);

  const handleThemeToggle = () => {
    if (cs.mode === 'dark') {
      onThemeModeChange(primaryMode === 'dark' ? 'light' : null);
    } else {
      onThemeModeChange(primaryMode === 'dark' ? null : 'dark');
    }
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Info badge bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface flex-shrink-0">
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full border border-black/10"
              style={{ background: cs.background }}
            />
            <span className="text-secondary">{palette.name}</span>
          </span>
          <span className="text-border">|</span>
          <span className="text-secondary">
            {hf} + {bf}
          </span>
          <span className="text-border">|</span>
          <span className="text-secondary">{concept.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenDrawer}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-secondary hover:text-primary hover:bg-surface-2 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Настройки
          </button>
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            <Download className="w-4 h-4" />
            Скачать архив
          </button>
        </div>
      </div>

      {/* Tabs + theme slider */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-border bg-background flex-shrink-0">
        <div className="flex items-center gap-1 bg-surface rounded-lg p-0.5">
          <button
            onClick={() => onPreviewTabChange('web')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              previewTab === 'web'
                ? 'bg-background text-primary shadow-subtle'
                : 'text-muted hover:text-secondary'
            }`}
          >
            Сайт
          </button>
          <button
            onClick={() => onPreviewTabChange('mobile')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              previewTab === 'mobile'
                ? 'bg-background text-primary shadow-subtle'
                : 'text-muted hover:text-secondary'
            }`}
          >
            Мобильное приложение
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">
            {cs.mode === 'dark' ? 'Тёмная' : 'Светлая'}
          </span>
          <button
            onClick={handleThemeToggle}
            className="relative w-10 h-5 rounded-full transition-colors"
            style={{ background: cs.mode === 'dark' ? accent : cs.border }}
            aria-label="Переключить тему генерируемой системы"
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
              style={{
                left: cs.mode === 'dark' ? 'calc(100% - 18px)' : '2px',
              }}
            />
          </button>
        </div>
      </div>

      {/* Preview canvas */}
      <div className="flex-1 overflow-auto">
        {previewTab === 'web' ? (
          <DesktopPreview
            cs={cs}
            bg={bg}
            surface={surface}
            text={text}
            textMuted={textMuted}
            accent={accent}
            hf={hf}
            bf={bf}
            pair={pair}
            scale={scale}
            radii={radii}
            shadow={shadow}
            concept={concept}
            palette={palette}
          />
        ) : (
          <MobilePreview
            bg={bg}
            surface={surface}
            text={text}
            textMuted={textMuted}
            accent={accent}
            hf={hf}
            bf={bf}
            radii={radii}
            shadow={shadow}
          />
        )}
      </div>
    </div>
  );
}

/* ---- Desktop Preview ---- */
function DesktopPreview({
  cs, bg, surface, text, textMuted, accent, hf, bf, pair, scale, radii, shadow, concept, palette,
}: {
  cs: ColorSystem;
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  hf: string;
  bf: string;
  pair: FontPair;
  scale: { title: number; body: number };
  radii: number[];
  shadow: { subtle: string; medium: string };
  concept: Concept;
  palette: Palette;
}) {
  return (
    <div
      style={{
        background: bg,
        color: text,
        fontFamily: `'${bf}', system-ui, sans-serif`,
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          borderBottom: `1px solid ${textMuted}`,
          opacity: 0.85,
        }}
      >
        <span
          style={{
            fontFamily: `'${hf}', system-ui, sans-serif`,
            fontWeight: 600,
            fontSize: 18,
            color: text,
          }}
        >
          DSgen
        </span>
        <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a
            href="#"
            style={{
              color: textMuted,
              textDecoration: 'none',
              fontSize: scale.body,
            }}
            onClick={(e) => e.preventDefault()}
          >
            Возможности
          </a>
          <a
            href="#"
            style={{
              color: textMuted,
              textDecoration: 'none',
              fontSize: scale.body,
            }}
            onClick={(e) => e.preventDefault()}
          >
            Цены
          </a>
          <a
            href="#"
            style={{
              color: textMuted,
              textDecoration: 'none',
              fontSize: scale.body,
            }}
            onClick={(e) => e.preventDefault()}
          >
            О нас
          </a>
          <span
            style={{
              display: 'inline-block',
              padding: '6px 14px',
              background: accent,
              color: '#fff',
              borderRadius: radii[0],
              fontSize: scale.body,
              fontWeight: 600,
            }}
          >
            Войти
          </span>
        </nav>
      </header>

      {/* Main */}
      <main style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}>
        {/* Hero */}
        <section style={{ marginBottom: 32 }}>
          <p
            style={{
              color: accent,
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 8px',
            }}
          >
            Платформа
          </p>
          <h1
            style={{
              fontFamily: `'${hf}', system-ui, sans-serif`,
              fontWeight: 600,
              fontSize: scale.title,
              margin: '0 0 12px',
              lineHeight: 1.2,
            }}
          >
            Дизайн-система за минуты
          </h1>
          <p
            style={{
              color: textMuted,
              fontSize: scale.body,
              lineHeight: 1.6,
              margin: '0 0 20px',
              maxWidth: 560,
            }}
          >
            Выберите палитру, шрифты и концепцию — всё остальное соберётся
            само. Цвета, типографика, отступы и радиусы из токенов.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '10px 22px',
                background: accent,
                color: '#fff',
                borderRadius: radii[1],
                fontSize: scale.body,
                fontWeight: 600,
                cursor: 'default',
              }}
            >
              Начать проект
            </span>
            <span
              style={{
                display: 'inline-block',
                padding: '10px 22px',
                background: surface,
                color: text,
                borderRadius: radii[1],
                fontSize: scale.body,
                fontWeight: 500,
                border: `1px solid ${textMuted}`,
                cursor: 'default',
              }}
            >
              Подробнее
            </span>
          </div>
        </section>

        {/* Stats cards */}
        <div
          style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}
        >
          <StatCard
            value={`${radii[0]}px`}
            label="базовый радиус"
            surface={surface}
            borderRadius={radii[1]}
            shadow={shadow.subtle}
            font={hf}
          />
          <StatCard
            value={`${scale.title}/${scale.body}`}
            label="масштаб заг/текст"
            surface={surface}
            borderRadius={radii[1]}
            shadow={shadow.subtle}
            font={hf}
          />
          <StatCard
            value="AA"
            label="контраст WCAG"
            surface={surface}
            borderRadius={radii[1]}
            shadow={shadow.subtle}
            font={hf}
          />
        </div>

        {/* Blockquote */}
        <blockquote
          style={{
            margin: '0 0 32px',
            padding: '20px 24px',
            borderLeft: `4px solid ${accent}`,
            background: surface,
            borderRadius: `0 ${radii[0]}px ${radii[0]}px 0`,
            boxShadow: shadow.subtle,
          }}
        >
          <p
            style={{
              margin: '0 0 8px',
              fontSize: scale.body,
              lineHeight: 1.6,
              fontStyle: 'italic',
            }}
          >
            «Дизайн — это не то, как это выглядит. Дизайн — это то, как это
            работает.»
          </p>
          <cite
            style={{
              color: textMuted,
              fontSize: 13,
              fontStyle: 'normal',
            }}
          >
            — Стив Джобс
          </cite>
        </blockquote>

        {/* Info cards */}
        <div
          style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}
        >
          <article
            style={{
              flex: 1,
              minWidth: 200,
              padding: 20,
              background: surface,
              borderRadius: radii[2],
              boxShadow: shadow.medium,
            }}
          >
            <h3
              style={{
                fontFamily: `'${hf}', system-ui, sans-serif`,
                fontWeight: 600,
                fontSize: 18,
                margin: '0 0 8px',
              }}
            >
              Палитра
            </h3>
            <p
              style={{
                color: textMuted,
                fontSize: scale.body,
                lineHeight: 1.5,
                margin: '0 0 12px',
              }}
            >
              {cs.mode} · семантические токены
            </p>
            <div style={{ display: 'flex', gap: 4 }}>
              <ColorDot color={cs.background} />
              <ColorDot color={cs.surface} />
              <ColorDot color={cs.border} />
              <ColorDot color={cs.accent} />
              <ColorDot color={cs.textPrimary} />
            </div>
          </article>
          <article
            style={{
              flex: 1,
              minWidth: 200,
              padding: 20,
              background: surface,
              borderRadius: radii[2],
              boxShadow: shadow.medium,
            }}
          >
            <h3
              style={{
                fontFamily: `'${hf}', system-ui, sans-serif`,
                fontWeight: 600,
                fontSize: 18,
                margin: '0 0 8px',
              }}
            >
              Типографика
            </h3>
            <p
              style={{
                color: textMuted,
                fontSize: scale.body,
                lineHeight: 1.5,
                margin: '0 0 12px',
              }}
            >
              {pair.heading} + {pair.body}
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              <span
                style={{
                  fontFamily: `'${pair.heading}', sans-serif`,
                  fontWeight: pair.hw,
                  fontSize: 24,
                }}
              >
                Aa
              </span>
              <span
                style={{
                  fontFamily: `'${pair.body}', sans-serif`,
                  fontWeight: pair.bw,
                  fontSize: 24,
                }}
              >
                Бб
              </span>
            </div>
          </article>
        </div>

        {/* Form */}
        <form
          style={{
            marginBottom: 32,
            padding: 20,
            background: surface,
            borderRadius: radii[1],
            boxShadow: shadow.subtle,
          }}
          onSubmit={(e) => e.preventDefault()}
        >
          <label
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
              color: text,
            }}
          >
            Имя проекта
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              defaultValue="Мой проект"
              readOnly
              style={{
                flex: 1,
                padding: '10px 14px',
                border: `1px solid ${textMuted}`,
                background: bg,
                color: text,
                borderRadius: radii[0],
                fontSize: scale.body,
                outline: 'none',
              }}
            />
            <span
              style={{
                padding: '10px 20px',
                background: accent,
                color: '#fff',
                borderRadius: radii[0],
                fontWeight: 600,
                fontSize: scale.body,
                cursor: 'default',
              }}
            >
              Создать
            </span>
          </div>
        </form>

        {/* List */}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li
            style={{
              padding: '8px 0',
              borderBottom: `1px solid ${surface}`,
              fontSize: scale.body,
            }}
          >
            <span
              style={{
                fontWeight: 600,
                fontFamily: `'${hf}', system-ui, sans-serif`,
              }}
            >
              Палитра
            </span>{' '}
            — пять оттенков по цветовому кругу
          </li>
          <li
            style={{
              padding: '8px 0',
              borderBottom: `1px solid ${surface}`,
              fontSize: scale.body,
            }}
          >
            <span
              style={{
                fontWeight: 600,
                fontFamily: `'${hf}', system-ui, sans-serif`,
              }}
            >
              Типографика
            </span>{' '}
            — вес, кегль и масштаб из токенов
          </li>
          <li
            style={{
              padding: '8px 0',
              fontSize: scale.body,
            }}
          >
            <span
              style={{
                fontWeight: 600,
                fontFamily: `'${hf}', system-ui, sans-serif`,
              }}
            >
              Отступы
            </span>{' '}
            — единый шаг на базе{' '}
            {concept.space * 4}·{concept.space * 8} px
          </li>
        </ul>
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: 16,
          textAlign: 'center',
          borderTop: `1px solid ${surface}`,
          color: textMuted,
          fontSize: 13,
        }}
      >
        Сгенерировано в DSgen · {palette.name} · {concept.name}
      </footer>
    </div>
  );
}

/* ---- Mobile Preview ---- */
function MobilePreview({
  bg, surface, text, textMuted, accent, hf, bf, radii, shadow,
}: {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  hf: string;
  bf: string;
  radii: number[];
  shadow: { subtle: string; medium: string };
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '24px 0 40px',
        background: bg,
        color: text,
        fontFamily: `'${bf}', sans-serif`,
      }}
    >
      <div
        style={{
          width: 320,
          border: `2px solid ${mix(bg, text, 0.15)}`,
          borderRadius: 28,
          overflow: 'hidden',
          background: bg,
          boxShadow: shadow.medium,
        }}
      >
        {/* Notch */}
        <div
          style={{
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: bg,
          }}
        >
          <div
            style={{
              width: 80,
              height: 5,
              borderRadius: 3,
              background: mix(bg, text, 0.2),
              marginTop: 8,
            }}
          />
        </div>

        {/* Status bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 16px',
            fontSize: 11,
            fontWeight: 600,
            color: textMuted,
          }}
        >
          <span>9:41</span>
          <span>●●●</span>
        </div>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: `1px solid ${mix(bg, text, 0.1)}`,
          }}
        >
          <span
            style={{
              fontFamily: `'${hf}', sans-serif`,
              fontWeight: 600,
              fontSize: 17,
              color: text,
            }}
          >
            Мой APP
          </span>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            D
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 16 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: accent,
              margin: '0 0 6px',
            }}
          >
            Привет
          </p>
          <h2
            style={{
              fontFamily: `'${hf}', sans-serif`,
              fontWeight: 600,
              fontSize: 20,
              margin: '0 0 8px',
              color: text,
            }}
          >
            Добро пожаловать
          </h2>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.5,
              color: textMuted,
              margin: '0 0 16px',
            }}
          >
            Это мобильное приложение использует вашу дизайн-систему с теми же
            токенами, цветами и шрифтами.
          </p>

          {/* Card */}
          <div
            style={{
              padding: 16,
              background: surface,
              borderRadius: radii[2],
              boxShadow: shadow.subtle,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radii[1],
                  background: accent,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                S
              </div>
              <div>
                <div
                  style={{ fontWeight: 600, fontSize: 14, color: text }}
                >
                  Статус проекта
                </div>
                <div style={{ fontSize: 12, color: textMuted }}>
                  3 задачи завершены
                </div>
              </div>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: mix(accent, bg, 0.85),
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '70%',
                  height: '100%',
                  borderRadius: 3,
                  background: accent,
                }}
              />
            </div>
          </div>

          {/* Form field */}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 4,
                color: text,
              }}
            >
              Имя
            </label>
            <input
              type="text"
              defaultValue="Иван Петров"
              readOnly
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${mix(bg, text, 0.15)}`,
                borderRadius: radii[0],
                background: bg,
                color: text,
                fontSize: 13,
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Primary button */}
          <button
            style={{
              width: '100%',
              padding: 12,
              border: 'none',
              borderRadius: radii[1],
              background: accent,
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'default',
              fontFamily: 'inherit',
              marginBottom: 10,
            }}
          >
            Отправить
          </button>

          {/* Secondary button */}
          <button
            style={{
              width: '100%',
              padding: 12,
              border: `1px solid ${mix(bg, text, 0.15)}`,
              borderRadius: radii[1],
              background: 'transparent',
              color: text,
              fontWeight: 500,
              fontSize: 14,
              cursor: 'default',
              fontFamily: 'inherit',
            }}
          >
            Отмена
          </button>
        </div>

        {/* Bottom nav */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            padding: '10px 0',
            borderTop: `1px solid ${mix(bg, text, 0.1)}`,
          }}
        >
          <span
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              fontSize: 10,
              color: accent,
            }}
          >
            <span style={{ fontSize: 16 }}>⌂</span>
            Главная
          </span>
          <span
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              fontSize: 10,
              color: textMuted,
            }}
          >
            <span style={{ fontSize: 16 }}>⌕</span>
            Поиск
          </span>
          <span
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              fontSize: 10,
              color: textMuted,
            }}
          >
            <span style={{ fontSize: 16 }}>⚙</span>
            Профиль
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---- Helpers ---- */
function StatCard({
  value,
  label,
  surface,
  borderRadius,
  shadow,
  font,
}: {
  value: string;
  label: string;
  surface: string;
  borderRadius: number;
  shadow: string;
  font: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 100,
        padding: 16,
        background: surface,
        borderRadius,
        boxShadow: shadow,
      }}
    >
      <span
        style={{
          display: 'block',
          fontSize: 20,
          fontWeight: 700,
          fontFamily: `'${font}', system-ui, sans-serif`,
        }}
      >
        {value}
      </span>
      <span style={{ color: 'inherit', opacity: 0.6, fontSize: 13 }}>
        {label}
      </span>
    </div>
  );
}

function ColorDot({ color }: { color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: color,
        border: '1px solid rgba(0,0,0,0.08)',
      }}
    />
  );
}

function loadFont(family: string) {
  if (!family) return;
  const id = 'font-' + family.replace(/\s+/g, '-').toLowerCase();
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}
