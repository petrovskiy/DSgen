'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CONCEPTS } from '@/lib/data/concepts';
import { FONT_PAIRS, FONTS } from '@/lib/data/fonts';
import type { FontPair } from '@/lib/types';

interface StepFontsProps {
  conceptId: string;
  selectedId: string | null;
  headingFont: string;
  bodyFont: string;
  onSelect: (id: string) => void;
  onFontChange: (heading: string, body: string) => void;
}

function resolveFontCss(family: string): string | undefined {
  return FONTS.find((f) => f.family === family)?.css;
}

export default function StepFonts({
  conceptId,
  selectedId,
  headingFont,
  bodyFont,
  onSelect,
  onFontChange,
}: StepFontsProps) {
  const loadedRef = useRef<Set<string>>(new Set());
  const [previewPair, setPreviewPair] = useState<FontPair | null>(null);

  const { recommended, allowed } = useMemo(() => {
    const concept = CONCEPTS.find((c) => c.id === conceptId);
    const recIds = concept?.fontPairIds || [];
    const allowedIds = concept?.allowedFontPairIds || [];
    return {
      recommended: FONT_PAIRS.filter((p) => recIds.includes(p.id)),
      allowed: FONT_PAIRS.filter((p) => allowedIds.includes(p.id)),
    };
  }, [conceptId]);

  const activePair = useMemo(() => {
    return previewPair || FONT_PAIRS.find((p) => p.id === selectedId) || null;
  }, [previewPair, selectedId]);

  const displayHeading = headingFont || activePair?.heading || '';
  const displayBody = bodyFont || activePair?.body || '';

  const loadFont = useCallback((family: string) => {
    if (loadedRef.current.has(family)) return;
    const css = resolveFontCss(family);
    if (!css) return;
    loadedRef.current.add(family);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = css;
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    FONT_PAIRS.forEach((pair) => {
      loadFont(pair.heading);
      loadFont(pair.body);
    });
  }, [loadFont]);

  const handleSelect = useCallback(
    (pair: FontPair) => {
      onSelect(pair.id);
      onFontChange(pair.heading, pair.body);
      loadFont(pair.heading);
      loadFont(pair.body);
      setPreviewPair(null);
    },
    [onSelect, onFontChange, loadFont],
  );

  const handleHover = useCallback(
    (pair: FontPair) => {
      setPreviewPair(pair);
      loadFont(pair.heading);
      loadFont(pair.body);
    },
    [loadFont],
  );

  const handleHoverLeave = useCallback(() => {
    setPreviewPair(null);
  }, []);

  const renderCard = (pair: FontPair) => {
    const isSelected = selectedId === pair.id;

    return (
      <button
        key={pair.id}
        type="button"
        onClick={() => handleSelect(pair)}
        onMouseEnter={() => handleHover(pair)}
        onMouseLeave={handleHoverLeave}
        onFocus={() => handleHover(pair)}
        onBlur={handleHoverLeave}
        className={`
          flex flex-col gap-3 p-4 rounded-xl bg-background text-left cursor-pointer border
          transition-[border-color,box-shadow] duration-160 ease
          focus-visible:shadow-focus focus-visible:outline-none
          hover:border-accent hover:shadow-subtle
          ${isSelected
            ? 'border-accent shadow-focus'
            : 'border-border'
          }
        `}
      >
        <span className="inline-block px-2.5 py-1 rounded-lg bg-accent-soft text-accent text-caption font-semibold w-fit">
          {pair.name}
        </span>

        <span
          style={{
            fontFamily: `'${pair.heading}', sans-serif`,
            fontWeight: pair.hw,
            fontSize: 28,
            lineHeight: 1.2,
          }}
          className="block text-primary"
        >
          Заголовок
        </span>

        <span
          style={{
            fontFamily: `'${pair.body}', sans-serif`,
            fontWeight: pair.bw,
          }}
          className="block text-body text-secondary"
        >
          Основной текст
        </span>

        <span className="text-caption text-muted leading-snug">{pair.note}</span>
      </button>
    );
  };

  const previewHeadingStyle = displayHeading
    ? { fontFamily: `'${displayHeading}', sans-serif` }
    : { fontFamily: 'var(--font-heading)' };
  const previewBodyStyle = displayBody
    ? { fontFamily: `'${displayBody}', sans-serif` }
    : { fontFamily: 'var(--font-body)' };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-caption text-muted">Шаг 3 из 4</p>
        <h1 className="font-heading text-display text-primary">
          Выберите шрифтовую пару
        </h1>
        <p className="mt-2 text-small text-muted">
          Гармоничные пары шрифтов из Google Fonts — сочетания заголовка и
          основного текста, подобранные под концепцию.
        </p>
      </div>

      {/* Живой предпросмотр */}
      <div
        className="sticky top-[72px] z-[--z-sticky] p-6 rounded-xl bg-background border border-border shadow-subtle mb-4"
      >
        <p className="text-caption text-muted mb-3">Предпросмотр шрифтов</p>
        <p
          style={{
            ...previewHeadingStyle,
            fontSize: 32,
            fontWeight: 500,
            lineHeight: 1.15,
          }}
          className="text-primary mb-3"
        >
          ЗАГОЛОВОК БРЕНДА
        </p>
        <p
          style={{
            ...previewBodyStyle,
            lineHeight: 1.5,
          }}
          className="text-body text-secondary"
        >
          Обычный текст: читаемый абзац, показывающий шрифт основного контента.
          Кириллица поддерживается.
        </p>
      </div>

      {/* Галерея */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {recommended.length > 0 && (
          <div className="col-span-full pt-4 mt-4 border-t border-border">
            <h2 className="text-small font-semibold text-secondary">
              Рекомендуемые пары
            </h2>
          </div>
        )}
        {recommended.map(renderCard)}

        {allowed.length > 0 && (
          <div className="col-span-full pt-4 mt-4 border-t border-border">
            <h2 className="text-small font-semibold text-secondary">
              Альтернативы
            </h2>
          </div>
        )}
        {allowed.map(renderCard)}
      </div>
    </div>
  );
}
