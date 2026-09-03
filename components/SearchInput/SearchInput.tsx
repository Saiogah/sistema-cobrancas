// components/SearchInput/SearchInput.tsx — Input de busca com debounce (PRD v2.0 seção 8.2)
//
// Reduz tempo da usuária: substitui a busca visual no documento Word
// (Ctrl+F em um documento grande) por digitação com resultado instantâneo
// — o debounce de 300ms evita disparar busca a cada tecla.

import React, { useState, useEffect, useCallback, useRef } from "react";
import { DEBOUNCE_SEARCH } from "../../config/app.config";

interface SearchInputProps {
  placeholder?: string;
  onChange: (value: string) => void;
}

/**
 * Input de busca com debounce de 150ms (DEBOUNCE_SEARCH).
 * Ícone de lupa à esquerda e botão limpar (X) à direita.
 * O callback onChange só dispara após o debounce, não a cada tecla.
 */
function SearchInputBase({ placeholder = "Buscar...", onChange }: SearchInputProps) {
  const [value, setValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedChange = useCallback(
    (val: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(val);
      }, DEBOUNCE_SEARCH);
    },
    [onChange]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleClear = () => {
    setValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onChange("");
  };

  return React.createElement(
    "div",
    { className: "relative flex items-center w-full" },
    // Ícone de lupa
    React.createElement(
      "span",
      { className: "absolute left-3 text-muted-foreground pointer-events-none" },
      React.createElement(
        "svg",
        { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 },
        React.createElement("circle", { cx: 11, cy: 11, r: 8 }),
        React.createElement("line", { x1: 21, y1: 21, x2: 16.65, y2: 16.65 })
      )
    ),
    // Input
    React.createElement("input", {
      type: "text",
      value,
      placeholder,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
        debouncedChange(e.target.value);
      },
      className: "w-full rounded-md border border-input bg-background pl-9 pr-8 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    }),
    // Botão limpar
    value
      ? React.createElement(
          "button",
          {
            onClick: handleClear,
            className: "absolute right-2 text-muted-foreground hover:text-foreground transition-colors",
            "aria-label": "Limpar busca",
          },
          React.createElement(
            "svg",
            { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 },
            React.createElement("line", { x1: 18, y1: 6, x2: 6, y2: 18 }),
            React.createElement("line", { x1: 6, y1: 6, x2: 18, y2: 18 })
          )
        )
      : null
  );
}

export const SearchInput = React.memo(SearchInputBase);
