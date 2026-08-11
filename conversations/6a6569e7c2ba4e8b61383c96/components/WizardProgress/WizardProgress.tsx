// components/WizardProgress/WizardProgress.tsx — Barra de progresso 4 passos
import React from 'react';

export interface WizardProgressProps {
  passoAtual: number;  // 1-4
  totalPassos?: number; // default 4
}

export const WizardProgress = React.memo(function WizardProgress({ passoAtual, totalPassos = 4 }: WizardProgressProps) {
  const passos = Array.from({ length: totalPassos }, (_, i) => i + 1);

  return React.createElement('div', { className: 'flex items-center justify-center gap-2 py-2' },
    ...passos.map(p => {
      const isCompleted = p < passoAtual;
      const isCurrent = p === passoAtual;
      const dotClass = isCompleted
        ? 'w-2.5 h-2.5 rounded-full bg-primary'
        : isCurrent
        ? 'w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-primary/30'
        : 'w-2.5 h-2.5 rounded-full bg-muted-foreground/30';

      if (p < totalPassos) {
        return React.createElement(React.Fragment, { key: p },
          React.createElement('div', { className: dotClass }),
          React.createElement('div', {
            className: `w-8 h-0.5 ${p < passoAtual ? 'bg-primary' : 'bg-muted-foreground/20'}`
          })
        );
      }
      return React.createElement('div', { key: p, className: dotClass });
    })
  );
});
