'use client';

import { useCallback, useMemo } from 'react';
import { CONCEPTS } from '@/lib/data/concepts';
import { PALETTES } from '@/lib/data/palettes';
import { useWizardStore } from '@/store/wizard-store';
import { analyzePalette, generateAltTheme } from '@/lib/color';
import type { ColorSystem as LibColorSystem } from '@/lib/color';
import type { Palette } from '@/lib/types';

interface StepPaletteProps {
  conceptId: string;
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

const SWATCH_WIDTHS = ['32%', '22%', '10%', '18%', '18%'] as const;

export default function StepPalette({ conceptId, selectedId, onSelect }: StepPaletteProps) {
  const shellTheme = useWizardStore((s) => s.shellTheme);
  const shellDark = shellTheme === 'dark';

  const { recommended, allowed } = useMemo(() => {
    const concept = CONCEPTS.find((c) => c.id === conceptId);
    const recIds = concept?.paletteIds || [];
    const allowedIds = concept?.allowedPaletteIds || [];
    return {
      recommended: PALETTES.filter((p) => recIds.includes(p.id)),
      allowed: PALETTES.filter((p) => allowedIds.includes(p.id)),
    };
  }, [conceptId]);

  const handleSelect = useCallback(
    (id: string) => onSelect(id),
    [onSelect],
  );

  const renderCard = (palette: Palette) => {
    const isSelected = selectedId === palette.id;
    const { light, dark, primaryMode } = getColorSystems(palette);
    const useAlt = shellDark !== (primaryMode === 'dark');
    const cs = useAlt ? dark : light;

    const colors = [cs.background, cs.surface, cs.border, cs.accent, cs.textPrimary];

    return (
      <button
        key={palette.id}
        type="button"
        onClick={() => handleSelect(palette.id)}
        className={`
          flex flex-col gap-2 p-3 rounded-xl bg-background text-left cursor-pointer border
          transition-[border-color,box-shadow,transform] duration-160 ease
          focus-visible:shadow-focus focus-visible:outline-none
          hover:-translate-y-0.5 hover:border-accent hover:shadow-subtle
          ${isSelected
            ? 'border-accent shadow-focus'
            : 'border-border'
          }
        `}
      >
        <div className="flex gap-1 rounded-lg overflow-hidden">
          {colors.map((color, i) => (
            <span
              key={i}
              style={{ background: color, width: SWATCH_WIDTHS[i] }}
              className="block flex-none h-10"
            />
          ))}
        </div>
        <span className="text-small font-medium text-primary truncate">
          {palette.name}
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-caption text-muted">Шаг 2 из 4</p>
        <h1 className="font-heading text-display text-primary">
          Выберите цветовую палитру
        </h1>
        <p className="mt-2 text-small text-muted">
          Трендовые палитры из Coolors — выберите ту, что отражает характер
          бренда.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {recommended.length > 0 && (
          <div className="col-span-full pt-4 mt-4 border-t border-border">
            <h2 className="text-small font-semibold text-secondary">
              Рекомендуемые палитры
            </h2>
          </div>
        )}
        {recommended.map(renderCard)}

        {allowed.length > 0 && (
          <div className="col-span-full pt-4 mt-4 border-t border-border">
            <h2 className="text-small font-semibold text-secondary">
              Допустимые палитры
            </h2>
          </div>
        )}
        {allowed.map(renderCard)}
      </div>
    </div>
  );
}
