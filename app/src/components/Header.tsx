'use client';

import { useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useWizardStore } from '@/store/wizard-store';

interface HeaderProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

const STEPS = [
  { key: 'concept', label: 'Концепция' },
  { key: 'palette', label: 'Палитра' },
  { key: 'fonts', label: 'Шрифты' },
  { key: 'preview', label: 'Превью' },
] as const;

export default function Header({ currentStep, onStepClick }: HeaderProps) {
  const shellTheme = useWizardStore((s) => s.shellTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', shellTheme);
    try {
      localStorage.setItem('dsgen-shell-theme', shellTheme);
    } catch {
      // localStorage недоступен
    }
  }, [shellTheme]);

  const handleToggleTheme = () => {
    useWizardStore.getState().toggleShellTheme();
  };

  return (
    <header className="sticky top-0 z-[--z-sticky] flex items-center justify-between h-14 px-6 bg-background border-b border-border backdrop-blur-sm">
      {/* Бренд */}
      <div className="flex-shrink-0">
        <span className="font-heading text-heading font-medium text-primary uppercase tracking-[0.05em]">
          MD DESIGN KIT
        </span>
      </div>

      {/* Шаги */}
      <nav className="flex items-center gap-0" aria-label="Шаги визарда">
        {STEPS.map((step, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <div key={step.key} className="flex items-center gap-0">
              {index > 0 && (
                <div className="w-4 h-px bg-border" aria-hidden="true" />
              )}
              <button
                type="button"
                onClick={() => onStepClick?.(stepNum)}
                className={`
                  group flex items-center gap-2 px-3 py-1.5 rounded-lg text-caption font-medium
                  transition-colors duration-200
                  focus-visible:shadow-focus focus-visible:outline-none
                  ${isActive
                    ? 'bg-accent text-white'
                    : isCompleted
                      ? 'bg-accent-soft text-accent'
                      : 'text-muted border border-border hover:text-secondary hover:border-secondary'
                  }
                `}
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className={`
                    flex items-center justify-center w-5 h-5 rounded-lg text-xs font-semibold
                    transition-colors duration-200
                    ${isActive
                      ? 'bg-white/20'
                      : isCompleted
                        ? 'bg-accent/10'
                        : 'bg-transparent'
                    }
                  `}
                >
                  {stepNum}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            </div>
          );
        })}
      </nav>

      {/* Переключатель темы */}
      <div className="flex-shrink-0 flex items-center">
        <button
          type="button"
          onClick={handleToggleTheme}
          className="
            flex items-center justify-center w-9 h-9 rounded-lg
            text-muted hover:text-secondary hover:bg-surface-2
            transition-colors duration-200
            focus-visible:shadow-focus focus-visible:outline-none
          "
          aria-label={shellTheme === 'light' ? 'Переключить на тёмную тему' : 'Переключить на светлую тему'}
        >
          {shellTheme === 'light' ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </button>
      </div>
    </header>
  );
}
