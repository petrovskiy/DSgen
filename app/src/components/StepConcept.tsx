'use client';

import { useCallback, useEffect, useRef } from 'react';
import { CONCEPTS } from '@/lib/data/concepts';
import { PALETTES } from '@/lib/data/palettes';
import { FONT_PAIRS, FONTS } from '@/lib/data/fonts';
import { useWizardStore } from '@/store/wizard-store';
import { analyzePalette, generateAltTheme } from '@/lib/color';
import type { ColorSystem as LibColorSystem } from '@/lib/color';
import type { Palette } from '@/lib/types';

interface StepConceptProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const COLOR_CACHE = new Map<string, { light: LibColorSystem; dark: LibColorSystem; primaryMode: 'light' | 'dark' }>();

function getColorSystems(palette: Palette): { light: LibColorSystem; dark: LibColorSystem; primaryMode: 'light' | 'dark' } {
  if (COLOR_CACHE.has(palette.id)) return COLOR_CACHE.get(palette.id)!;

  let primaryMode: 'light' | 'dark' = palette.primaryMode || 'light';
  let csLight: LibColorSystem = palette.colorSystem as LibColorSystem;
  let csDark: LibColorSystem = palette.colorSystemAlt as LibColorSystem;

  if (!csLight) {
    csLight = analyzePalette(palette.colors);
    primaryMode = csLight.mode;
  }

  if (!csDark) {
    csDark = generateAltTheme(csLight);
  }

  COLOR_CACHE.set(palette.id, { light: csLight, dark: csDark, primaryMode });
  return COLOR_CACHE.get(palette.id)!;
}

function resolveFontCss(family: string): string | undefined {
  return FONTS.find((f) => f.family === family)?.css;
}

export default function StepConcept({ selectedId, onSelect }: StepConceptProps) {
  const shellTheme = useWizardStore((s) => s.shellTheme);
  const shellDark = shellTheme === 'dark';
  const loadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    CONCEPTS.forEach((c) => {
      const firstFontId = (c.fontPairIds || [])[0] || FONT_PAIRS[0]?.id;
      const pair = FONT_PAIRS.find((f) => f.id === firstFontId) || FONT_PAIRS[0];
      if (!pair) return;
      [pair.heading, pair.body].forEach((family) => {
        const css = resolveFontCss(family);
        if (css && !loadedRef.current.has(family)) {
          loadedRef.current.add(family);
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = css;
          document.head.appendChild(link);
        }
      });
    });
  }, []);

  const handleSelect = useCallback(
    (id: string) => onSelect(id),
    [onSelect],
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-caption text-muted">Шаг 1 из 4</p>
        <h1 className="font-heading text-display text-primary">
          Выберите дизайн-концепцию
        </h1>
        <p className="mt-2 text-small text-muted">
          Характер интерфейса: скругления, тени, отступы — каждая концепция
          задаёт настроение.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {CONCEPTS.map((concept) => {
          const isSelected = selectedId === concept.id;
          const firstPalId = (concept.paletteIds || [])[0] || PALETTES[0]?.id;
          const palette = PALETTES.find((p) => p.id === firstPalId) || PALETTES[0];
          if (!palette) return null;

          const { light, dark, primaryMode } = getColorSystems(palette);
          const useAlt = shellDark !== (primaryMode === 'dark');
          const cs = useAlt ? dark : light;
          const isD = cs.mode === 'dark';

          const fontPairId = (concept.fontPairIds || [])[0] || FONT_PAIRS[0]?.id;
          const fontPair = FONT_PAIRS.find((f) => f.id === fontPairId) || FONT_PAIRS[0];

          const radius = (concept.radius || [8, 12, 16])[1];
          const descColor = isD ? cs.textMuted : cs.textSecondary;

          const sc = concept.styleConfig || {};
          const glow = sc.effects?.glow;
          let cardShadow: string | undefined;
          if (glow && typeof glow === 'object' && glow.enabled && isD) {
            cardShadow = `0 0 ${glow.intensity || '20px'} ${cs.accent}33`;
          } else if (concept.shadow === 'none') {
            cardShadow = 'none';
          }

          const isGlass = sc.effects?.glassmorphism && isD;
          const cardBg = isGlass ? cs.surface : cs.background;

          return (
            <button
              key={concept.id}
              type="button"
              onClick={() => handleSelect(concept.id)}
              style={{
                background: cardBg,
                color: cs.textPrimary,
                borderColor: cs.border,
                borderRadius: `${radius}px`,
                boxShadow: cardShadow,
              }}
              className={`
                group flex flex-col gap-1 p-3 border text-left cursor-pointer
                transition-[border-color,box-shadow,transform] duration-160 ease
                focus-visible:shadow-focus focus-visible:outline-none
                hover:-translate-y-0.5
                ${isSelected ? '!border-accent shadow-focus' : ''}
              `}
            >
              <span
                style={{
                  background: cs.accent,
                  fontFamily: fontPair?.heading
                    ? `'${fontPair.heading}', sans-serif`
                    : undefined,
                  fontWeight: fontPair?.hw || 500,
                }}
                className="inline-block px-2 py-0.5 rounded text-white text-body w-fit"
              >
                {concept.name}
              </span>

              <span
                style={{
                  color: descColor,
                  fontFamily: fontPair?.body
                    ? `'${fontPair.body}', sans-serif`
                    : undefined,
                }}
                className="text-caption leading-snug"
              >
                {concept.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
