// hooks/useBatchSelect.ts — Hook de seleção em lote (interno do M9)
// Gerencia seleção múltipla de parcelas no Dashboard.
// Plano v2.0 seção M9: hook construído junto com o Dashboard, não em M6.

import { useState, useCallback } from "react";

export function useBatchSelect() {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelecionadas(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isSelected = useCallback((id: string) => selecionadas.has(id), [selecionadas]);

  const limpar = useCallback(() => {
    setSelecionadas(new Set());
  }, []);

  const selecionarTodas = useCallback((ids: string[]) => {
    setSelecionadas(new Set(ids));
  }, []);

  return {
    selecionadas,
    quantidade: selecionadas.size,
    toggle,
    isSelected,
    limpar,
    selecionarTodas,
    temSelecao: selecionadas.size >= 2,
  };
}
