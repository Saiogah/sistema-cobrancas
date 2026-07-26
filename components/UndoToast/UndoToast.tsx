// components/UndoToast/UndoToast.tsx — Toast com ação de desfazer (PRD v2.0 seção 10.6)
//
// Reduz tempo da usuária: substitui a edição manual do documento Word
// quando a usuária marca alguém como pago por engano — basta clicar
// [Desfazer] dentro de 5 segundos e o status volta ao anterior.

import React, { useEffect, useState } from "react";
import { UNDO_TIMEOUT } from "../../config/app.config";

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

/**
 * Toast fixo no rodapé que exibe uma mensagem e um botão [Desfazer].
 * Desaparece automaticamente após UNDO_TIMEOUT (5s) — usa setTimeout, NÃO setInterval.
 * O botão [Desfazer] chama onUndo e depois onDismiss.
 */
function UndoToastBase({ message, onUndo, onDismiss }: UndoToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, UNDO_TIMEOUT);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  const handleUndo = () => {
    setVisible(false);
    onUndo();
    onDismiss();
  };

  return React.createElement(
    "div",
    {
      className: "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg bg-card border px-4 py-3 shadow-lg",
      role: "status",
      "aria-live": "polite",
    },
    React.createElement("span", { className: "text-sm text-foreground" }, message),
    React.createElement(
      "button",
      {
        onClick: handleUndo,
        className: "text-sm font-medium text-primary hover:text-primary/80 transition-colors",
      },
      "Desfazer"
    )
  );
}

export const UndoToast = React.memo(UndoToastBase);
