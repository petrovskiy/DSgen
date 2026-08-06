'use client';

import { useCallback } from 'react';
import { useWizardStore } from '@/store/wizard-store';
import Header from '@/components/Header';
import StepConcept from '@/components/StepConcept';
import StepPalette from '@/components/StepPalette';
import StepFonts from '@/components/StepFonts';
import StepPreview from '@/components/StepPreview';
import SettingsDrawer from '@/components/SettingsDrawer';
import { downloadZip } from '@/lib/export';
import { PALETTES } from '@/lib/data/palettes';
import { CONCEPTS } from '@/lib/data/concepts';
import type { Palette } from '@/lib/types';

export default function Home() {
  const {
    step, setStep,
    conceptId, selectConcept,
    paletteId, selectPalette,
    fontPairId, selectFontPair,
    headingFont, setHeadingFont,
    bodyFont, setBodyFont,
    themeMode, setThemeMode,
    previewTab, setPreviewTab,
    drawerOpen, setDrawerOpen,
    getConcept, getPalette, getFontPair,
  } = useWizardStore();

  const handleConceptSelect = useCallback((id: string) => {
    const concept = CONCEPTS.find(c => c.id === id);
    if (!concept) return;
    
    const store = useWizardStore.getState();
    const currentPalette = PALETTES.find(p => p.id === store.paletteId);
    
    selectConcept(id);
    
    if (currentPalette) {
      const allowed = [...concept.paletteIds, ...concept.allowedPaletteIds];
      if (!allowed.includes(currentPalette.id)) {
        const defaultPaletteId = concept.paletteIds[0];
        selectPalette(defaultPaletteId);
      }
    }
    
    const store2 = useWizardStore.getState();
    const currentPair = store2.fontPairId;
    const allowedFonts = [...concept.fontPairIds, ...concept.allowedFontPairIds];
    if (!allowedFonts.includes(currentPair)) {
      const defaultFontId = concept.fontPairIds[0];
      selectFontPair(defaultFontId);
    }
    
    setThemeMode(null);
  }, [selectConcept, selectPalette, selectFontPair, setThemeMode]);

  const handlePaletteSelect = useCallback((id: string) => {
    selectPalette(id);
    setThemeMode(null);
  }, [selectPalette, setThemeMode]);

  const handleFontSelect = useCallback((id: string) => {
    selectFontPair(id);
  }, [selectFontPair]);

  const handleHeadingFontChange = useCallback((family: string) => {
    setHeadingFont(family);
  }, [setHeadingFont]);

  const handleBodyFontChange = useCallback((family: string) => {
    setBodyFont(family);
  }, [setBodyFont]);

  const handlePasteColors = useCallback((colors: string[]) => {
    if (colors.length < 2) return;
    const id = 'pasted-' + Date.now();
    const name = 'Из буфера (' + colors.length + ')';
    const pasted: Palette = { id, name, colors };
    PALETTES.unshift(pasted);
    selectPalette(id);
  }, [selectPalette]);

  const handleDownload = useCallback(async () => {
    const palette = getPalette();
    const pair = getFontPair();
    const concept = getConcept();
    if (!palette || !pair || !concept) return;
    
    const exportPair = { ...pair };
    if (headingFont) exportPair.heading = headingFont;
    if (bodyFont) exportPair.body = bodyFont;
    
    await downloadZip(palette, exportPair, concept, themeMode);
  }, [getPalette, getFontPair, getConcept, headingFont, bodyFont, themeMode]);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <StepConcept
            selectedId={conceptId}
            onSelect={handleConceptSelect}
          />
        );
      case 2:
        return (
          <StepPalette
            conceptId={conceptId}
            selectedId={paletteId}
            onSelect={handlePaletteSelect}
          />
        );
      case 3:
        return (
          <StepFonts
            conceptId={conceptId}
            selectedId={fontPairId}
            headingFont={headingFont}
            bodyFont={bodyFont}
            onSelect={handleFontSelect}
            onFontChange={(h, b) => {
              setHeadingFont(h);
              setBodyFont(b);
            }}
          />
        );
      case 4: {
        const palette = getPalette();
        const pair = getFontPair();
        const concept = getConcept();
        if (!palette || !pair || !concept) return null;
        return (
          <>
            <StepPreview
              palette={palette}
              pair={pair}
              concept={concept}
              headingFont={headingFont || pair.heading}
              bodyFont={bodyFont || pair.body}
              themeMode={themeMode}
              onThemeModeChange={setThemeMode}
              onDownload={handleDownload}
              onOpenDrawer={() => setDrawerOpen(true)}
              previewTab={previewTab}
              onPreviewTabChange={setPreviewTab}
            />
            <SettingsDrawer
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              headingFont={headingFont || pair.heading}
              bodyFont={bodyFont || pair.body}
              paletteId={paletteId}
              conceptId={conceptId}
              onHeadingFontChange={handleHeadingFontChange}
              onBodyFontChange={handleBodyFontChange}
              onPaletteChange={handlePaletteSelect}
              onConceptChange={selectConcept}
              onPasteColors={handlePasteColors}
            />
          </>
        );
      }
      default:
        return null;
    }
  };

  const concept = getConcept();
  const palette = getPalette();
  const pair = getFontPair();

  return (
    <div className="min-h-screen flex flex-col bg-background text-primary transition-colors duration-300">
      <Header
        currentStep={step}
        onStepClick={setStep}
      />
      
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderStep()}
      </main>
      
      <footer className="sticky bottom-0 z-sticky border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex-1">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-secondary 
                  hover:text-primary hover:bg-surface-2 rounded-lg transition-colors"
              >
                ← Назад
              </button>
            )}
            {step === 1 && (
              <button
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted
                  rounded-lg cursor-default"
                disabled
              >
                Отмена
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted">
            {concept && (
              <span className="hidden sm:inline">
                <span className="text-secondary">{concept.name}</span>
              </span>
            )}
            {palette && (
              <span className="hidden sm:inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-border"></span>
                <span className="flex gap-0.5">
                  {palette.colors.slice(0, 3).map((c, i) => (
                    <span key={i} className="w-2.5 h-2.5 rounded-full border border-border/50" style={{ background: c }}></span>
                  ))}
                </span>
                <span className="text-secondary">{palette.name}</span>
              </span>
            )}
            {pair && (
              <span className="hidden sm:inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-border"></span>
                <span className="text-secondary">
                  {headingFont || pair.heading} · {bodyFont || pair.body}
                </span>
              </span>
            )}
          </div>
          
          <div className="flex-1 flex justify-end">
            {step < 4 && (
              <button
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium bg-accent text-white
                  rounded-lg hover:bg-accent-hover transition-colors focus-visible:shadow-focus"
              >
                Далее →
              </button>
            )}
            {step === 4 && (
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium bg-accent text-white
                  rounded-lg hover:bg-accent-hover transition-colors focus-visible:shadow-focus"
              >
                Скачать архив
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
