// components/CopyButton/CopyButton.tsx — Botão copiar para clipboard (PRD v2.0 seção 15)
//
// Reduz tempo da usuária: substitui o copiar manual da mensagem de cobrança
// do Word (selecionar texto, Ctrl+C, ir pro WhatsApp, Ctrl+V) por um único
// clique que copia o texto pronto e mostra feedback "Copiado!".

import React, { useState, useCallback } from "react";
import { copiar } from "../../services/clipboard.service";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

const COPIED_DURATION = 2000;

/**
 * Botão que copia `text` para a clipboard ao clicar.
 * Exibe "Copiado!" por 2 segundos como feedback.
 * Usa a função `copiar` de clipboard.service (navigator.clipboard + fallback execCommand).
 */
function CopyButtonBase({ text, label = "Copiar", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(async () => {
    const success = await copiar(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_DURATION);
    }
  }, [text]);

  const baseClass = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring px-3 py-1.5";
  const stateClass = copied
    ? "bg-emerald-100 text-emerald-700"
    : "bg-secondary text-secondary-foreground hover:bg-secondary/80";

  return React.createElement(
    "button",
    {
      onClick: handleClick,
      className: className || `${baseClass} ${stateClass}`,
    },
    copied ? "Copiado!" : label
  );
}

export const CopyButton = React.memo(CopyButtonBase);
