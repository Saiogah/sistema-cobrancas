// components/StatusBadge/StatusBadge.tsx — Badge de status da parcela (PRD v2.0 seção 10.4)

import React from "react";
import type { ParcelaStatus } from "../../types/common.types";

interface StatusBadgeProps {
  status: ParcelaStatus;
  diasAtraso?: number;
}

function StatusBadgeBase({ status, diasAtraso }: StatusBadgeProps) {
  const isAtrasado = status === "pendente" || status === "cobrado" || status === "pago_parcial"
    ? diasAtraso !== undefined && diasAtraso > 0
    : false;

  let label: string;
  let className: string;

  if (isAtrasado) {
    if (diasAtraso! <= 3) {
      label = `Atrasada há ${diasAtraso} ${diasAtraso === 1 ? "dia" : "dias"}`;
      className = "inline-flex items-center rounded-md bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
    } else {
      label = `Atrasada há ${diasAtraso} dias`;
      className = "inline-flex items-center rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300";
    }
  } else {
    switch (status) {
      case "pendente":
        label = "Pendente";
        className = "inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground";
        break;
      case "cobrado":
        label = "Cobrado";
        className = "inline-flex items-center rounded-md bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
        break;
      case "pago":
        label = "Pago";
        className = "inline-flex items-center rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
        break;
      case "pago_parcial":
        label = "Pago parcial";
        className = "inline-flex items-center rounded-md bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
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
