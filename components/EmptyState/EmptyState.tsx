// components/EmptyState/EmptyState.tsx — Estado vazio amigável (PRD v2.0 seção 8.1)
//
// Reduz tempo da usuária: substitui a confusão de abrir o Word e não saber
// se a lista está vazia ou se está olhando no lugar errado — mensagem clara
// de "nada para hoje" em vez de tela em branco.

import React from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
}

/**
 * Componente de estado vazio — exibe título e descrição opcional.
 * Usado quando não há parcelas para cobrar, lista de clientes vazia, etc.
 */
function EmptyStateBase({ title, description }: EmptyStateProps) {
  return React.createElement(
    "div",
    { className: "flex flex-col items-center justify-center py-12 px-4 text-center" },
    React.createElement("p", { className: "text-lg font-medium text-foreground" }, title),
    description ? React.createElement("p", { className: "mt-2 text-sm text-muted-foreground" }, description) : null
  );
}

export const EmptyState = React.memo(EmptyStateBase);
