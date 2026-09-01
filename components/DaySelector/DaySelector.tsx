// components/DaySelector/DaySelector.tsx — Seletor de dia fixo de vencimento (M10b)
import React from 'react';
import { DIAS_VENCIMENTO } from '../../config/days.config';
import type { DiaVencimento } from '../../types/common.types';

export interface DaySelectorProps {
  value: DiaVencimento;
  onChange: (dia: DiaVencimento) => void;
  disabled?: boolean;
}

function DaySelectorBase({ value, onChange, disabled = false }: DaySelectorProps) {
  return React.createElement(
    'div',
    {
      className: 'grid grid-cols-3 gap-2 sm:grid-cols-6',
      role: 'group',
      'aria-label': 'Dia fixo de vencimento',
    },
    ...DIAS_VENCIMENTO.map((dia) =>
      React.createElement(
        'button',
        {
          key: dia,
          type: 'button',
          disabled,
          onClick: () => onChange(dia),
          'aria-pressed': value === dia,
          className: `min-h-12 rounded-md border px-4 py-3 text-base font-semibold transition-colors ${
            value === dia
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input bg-background hover:bg-accent'
          } disabled:cursor-not-allowed disabled:opacity-50`,
        },
        String(dia).padStart(2, '0'),
      ),
    ),
  );
}

export const DaySelector = React.memo(DaySelectorBase);
