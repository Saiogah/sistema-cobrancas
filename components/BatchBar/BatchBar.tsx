// components/BatchBar/BatchBar.tsx — Barra de ações em lote (M9)
// Barra fixa no rodapé quando 2+ parcelas selecionadas.
// Plano v2.0 seção M9: "X selecionadas · [Marcar todas como pagas]"

import React from "react";

interface BatchBarProps {
  quantidade: number;
  onMarcarTodasPagas: () => void;
  onLimpar: () => void;
}

export const BatchBar = React.memo(function BatchBar({ quantidade, onMarcarTodasPagas, onLimpar }: BatchBarProps) {
  return React.createElement("div", {
    className: "fixed bottom-0 left-0 right-0 z-50 border-t bg-card text-card-foreground px-4 py-3 shadow-lg",
  },
    React.createElement("div", { className: "flex items-center justify-between max-w-2xl mx-auto" },
      React.createElement("div", { className: "flex items-center gap-3" },
        React.createElement("span", { className: "text-sm font-medium" }, `${quantidade} selecionada${quantidade > 1 ? "s" : ""}`),
        React.createElement("button", {
          onClick: onLimpar,
          className: "text-xs text-muted-foreground hover:text-foreground",
        }, "Limpar"),
      ),
      React.createElement("button", {
        onClick: onMarcarTodasPagas,
        className: "rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90",
      }, "Marcar todas como pagas"),
    ),
  );
});
