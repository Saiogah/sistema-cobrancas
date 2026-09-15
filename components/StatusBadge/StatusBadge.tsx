// components/StatusBadge/StatusBadge.tsx — Badge de status da parcela (PRD v2.0 seção 10.4)
//
// Reduz tempo da usuária: substitui a releitura manual da lista no Word
// para saber quem pagou — a cor do badge comunica o status instantaneamente.

import React from "react";
import type { ParcelaStatus } from "../../types/common.types";

interface StatusBadgeProps {
  status: ParcelaStatus;
  diasAtraso?: number;
}

/**
 * Badge que exibe o status da parcela com cor semântica.
 *
 * Cores (PRD v2.0 seção 10.4):
 * - pendente: neutro/muted
 * - cobrado: amarelo/warning
 * - pago: verde/success
 * - pago_parcial: azul/info
 * - atrasado 1-3 dias: laranja
 * - atrasado 4+ dias: vermelho/destructive
 */
function StatusBadgeBase({ status, diasAtraso }: StatusBadgeProps) {
  const isAtrasado = status === "pendente" || status === "cobrado" || status === "pago_parcial"
    ? diasAtraso !== undefined && diasAtraso > 0
    : false;

  let label: string;
  let className: string;

  if (isAtrasado) {
    if (diasAtraso! <= 3) {
      label = `Atrasada há ${diasAtraso} ${diasAtraso === 1 ? "dia" : "dias"}`;
      className = "inline-flex items-center rounded-md bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700";
    } else {
      label = `Atrasada há ${diasAtraso} dias`;
      className = "inline-flex items-center rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700";
    }
  } else {
    switch (status) {
      case "pendente":
        label = "Pendente";
        className = "inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground";
        break;
      case "cobrado":
        label = "Cobrado";
        className = "inline-flex items-center rounded-md bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-700";
        break;
      case "pago":
        label = "Pago";
        className = "inline-flex items-center rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700";
        break;
      case "pago_parcial":
        label = "Pago parcial";
        className = "inline-flex items-center rounded-md bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700";
        break;
      case "arquivado":
        label = "Arquivado";
        className = "inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground/60";
        break;
      default:
        label = status;
        className = "inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground";
    }
  }

  return React.createElement("span", { className }, label);
}

export const StatusBadge = React.memo(StatusBadgeBase);
