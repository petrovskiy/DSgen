import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Palette, FontPair, Concept } from '@/lib/types';
import { CONCEPTS } from '@/lib/data/concepts';
import { PALETTES } from '@/lib/data/palettes';
import { FONT_PAIRS } from '@/lib/data/fonts';

interface WizardStore {
  step: number;
  conceptId: string;
  paletteId: string;
  fontPairId: string;
  headingFont: string;
  bodyFont: string;
  themeMode: 'light' | 'dark' | null;
  previewTab: 'web' | 'mobile';
  drawerOpen: boolean;
  shellTheme: 'light' | 'dark';

  setStep: (step: number) => void;
  selectConcept: (id: string) => void;
  selectPalette: (id: string) => void;
  selectFontPair: (id: string) => void;
  setHeadingFont: (family: string) => void;
  setBodyFont: (family: string) => void;
  setThemeMode: (mode: 'light' | 'dark' | null) => void;
  setPreviewTab: (tab: 'web' | 'mobile') => void;
  setDrawerOpen: (open: boolean) => void;
  toggleShellTheme: () => void;

  getConcept: () => Concept | undefined;
  getPalette: () => Palette | undefined;
  getFontPair: () => FontPair | undefined;
}

export const useWizardStore = create<WizardStore>()(
  persist(
    (set, get) => ({
      step: 1,
      conceptId: 'strict',
      paletteId: 'graphite-order',
      fontPairId: 'pair9',
      headingFont: '',
      bodyFont: '',
      themeMode: null,
      previewTab: 'web',
      drawerOpen: false,
      shellTheme: 'light',

      setStep: (step) => set({ step }),

      selectConcept: (id) => set({ conceptId: id }),
      selectPalette: (id) => set({ paletteId: id, themeMode: null }),
      selectFontPair: (id) => {
        const pair = FONT_PAIRS.find((p: FontPair) => p.id === id);
        set({
          fontPairId: id,
          headingFont: pair?.heading || '',
          bodyFont: pair?.body || ''
        });
      },
      setHeadingFont: (family) => set({ headingFont: family }),
      setBodyFont: (family) => set({ bodyFont: family }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      setPreviewTab: (tab) => set({ previewTab: tab }),
      setDrawerOpen: (open) => set({ drawerOpen: open }),
      toggleShellTheme: () => set(s => ({
        shellTheme: s.shellTheme === 'light' ? 'dark' : 'light'
      })),

      getConcept: () => CONCEPTS.find((c: Concept) => c.id === get().conceptId),
      getPalette: () => PALETTES.find((p: Palette) => p.id === get().paletteId),
      getFontPair: () => FONT_PAIRS.find((p: FontPair) => p.id === get().fontPairId),
    }),
    {
      name: 'dsgen-wizard',
      partialize: (state) => ({
        step: state.step,
        conceptId: state.conceptId,
        paletteId: state.paletteId,
        fontPairId: state.fontPairId,
        headingFont: state.headingFont,
        bodyFont: state.bodyFont,
        themeMode: state.themeMode,
        shellTheme: state.shellTheme,
      }),
    }
  )
);
