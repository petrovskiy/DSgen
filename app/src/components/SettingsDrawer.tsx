'use client';

import { useCallback, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, ClipboardPaste } from 'lucide-react';
import type { ColorSystem } from '@/lib/types';
import { getSemanticColors } from '@/lib/export';
import { PALETTES } from '@/lib/data/palettes';
import { FONTS } from '@/lib/data/fonts';
import { CONCEPTS } from '@/lib/data/concepts';

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  headingFont: string;
  bodyFont: string;
  paletteId: string;
  conceptId: string;
  onHeadingFontChange: (family: string) => void;
  onBodyFontChange: (family: string) => void;
  onPaletteChange: (id: string) => void;
  onConceptChange: (id: string) => void;
  onPasteColors: (colors: string[]) => void;
}

export default function SettingsDrawer({
  open,
  onClose,
  headingFont,
  bodyFont,
  paletteId,
  conceptId,
  onHeadingFontChange,
  onBodyFontChange,
  onPaletteChange,
  onConceptChange,
  onPasteColors,
}: SettingsDrawerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const hf = headingFont;
  const bf = bodyFont;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-[--z-modal]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-[380px] max-w-[90vw] bg-background border-l border-border z-[--z-modal] shadow-2xl flex flex-col animate-slide-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-heading text-heading font-medium text-primary uppercase tracking-[0.05em]">
            Настройки
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted hover:text-secondary hover:bg-surface-2 transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Fonts */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-primary">
              Шрифт заголовков
            </label>
            <select
              value={hf}
              onChange={(e) => onHeadingFontChange(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-primary text-sm focus:border-accent focus:shadow-focus outline-none transition-colors"
            >
              {FONTS.map((f) => (
                <option
                  key={f.family}
                  value={f.family}
                  style={{ fontFamily: `'${f.family}', sans-serif` }}
                >
                  {f.family}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-primary">
              Шрифт текста
            </label>
            <select
              value={bf}
              onChange={(e) => onBodyFontChange(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-primary text-sm focus:border-accent focus:shadow-focus outline-none transition-colors"
            >
              {FONTS.map((f) => (
                <option
                  key={f.family}
                  value={f.family}
                  style={{ fontFamily: `'${f.family}', sans-serif` }}
                >
                  {f.family}
                </option>
              ))}
            </select>
          </div>

          {/* Palette */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={(e) => {
                const target = e.currentTarget;
                const expanded = target.getAttribute('aria-expanded') === 'true';
                target.setAttribute('aria-expanded', String(!expanded));
                const content = target.nextElementSibling as HTMLElement | null;
                if (content) content.hidden = expanded;
              }}
              aria-expanded="true"
              className="flex items-center justify-between w-full text-sm font-semibold text-primary hover:text-accent transition-colors"
            >
              <span>Палитра</span>
              <ChevronUp className="w-4 h-4" data-collapsed="hidden" />
              <ChevronDown className="w-4 h-4 hidden" data-expanded="hidden" />
            </button>
            <div className="grid grid-cols-4 gap-2">
              {PALETTES.map((p) => {
                const cs = getSemanticColors(p, false) as ColorSystem;
                const isActive = paletteId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onPaletteChange(p.id)}
                    title={p.name}
                    className={`flex items-center gap-1 p-2 rounded-lg border transition-colors ${
                      isActive
                        ? 'border-accent bg-accent-soft'
                        : 'border-border hover:border-muted'
                    }`}
                  >
                    <PaletteDots cs={cs} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paste from clipboard */}
          <button
            onClick={async () => {
              try {
                let text: string;
                try {
                  text = await navigator.clipboard.readText();
                } catch {
                  text = prompt('Вставьте цвета из Colors CO:') || '';
                }
                if (!text) return;
                const colors: string[] = [];
                text.split('\n').forEach((line) => {
                  const m = line.match(
                    /--[\w-]+:\s*#([0-9a-fA-F]{6,8})\s*;/
                  );
                  if (m) colors.push('#' + m[1].slice(0, 6));
                });
                if (colors.length < 2) {
                  document.dispatchEvent(
                    new CustomEvent('dsgen-toast', {
                      detail: 'Не удалось распознать цвета',
                    })
                  );
                  return;
                }
                onPasteColors(colors);
              } catch (e) {
                document.dispatchEvent(
                  new CustomEvent('dsgen-toast', {
                    detail: 'Ошибка: ' + (e as Error).message,
                  })
                );
              }
            }}
            className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-secondary hover:text-primary hover:bg-surface-2 transition-colors"
          >
            <ClipboardPaste className="w-4 h-4" />
            Вставить из Colors CO
          </button>

          {/* Concept */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-primary">
              Концепция
            </label>
            <select
              value={conceptId}
              onChange={(e) => onConceptChange(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-primary text-sm focus:border-accent focus:shadow-focus outline-none transition-colors"
            >
              {CONCEPTS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slideIn 0.25s ease-out;
        }
      `}</style>
    </>
  );
}

function PaletteDots({ cs }: { cs: ColorSystem }) {
  return (
    <>
      <span
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: cs.background,
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      />
      <span
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: cs.surface,
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      />
      <span
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: cs.accent,
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      />
      <span
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: cs.textPrimary,
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      />
    </>
  );
}
