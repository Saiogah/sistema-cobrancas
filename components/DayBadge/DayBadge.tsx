// components/DayBadge/DayBadge.tsx — Badge de dia de vencimento fixo (PRD v2.0 seção 6)
//
// Reduz tempo da usuária: substitui a busca visual por seções no documento
// do Word — cada dia é identificado instantaneamente pelo badge.

import React from "react";

interface DayBadgeProps {
  dia: number;
  selected?: boolean;
}

/**
 * Badge que exibe "Dia XX" para o dia de vencimento fixo.
 * Suporta estado selecionado para uso em seletores e listas.
 */
function DayBadgeBase({ dia, selected = false }: DayBadgeProps) {
  const label = `Dia ${String(dia).padStart(2, "0")}`;
  const className = selected
    ? "inline-flex items-center rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"
    : "inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground";

  return React.createElement("span", { className }, label);
}

export const DayBadge = React.memo(DayBadgeBase);
