// hooks/useProducts.ts — Hook de listagem de produtos/serviços com cache e invalidação por EventBus (M6a)
//
// PRD v2.0 seção 5 — Performance: cache em memória, sem polling, sem setInterval.
// Ordenado por vezesUsado desc (mais usados primeiro).
// Invalidação por EventBus: product:created, product:updated, product:deleted, charge:created.

import { useState, useEffect, useRef, useCallback } from "react";
import { ProdutoServico as ProdutoAPI } from "../api/entities";
import { eventBus } from "../lib/event-bus";
import type { ProdutoServico } from "../types/product.types";

export interface UseProductsResult {
  produtos: ProdutoServico[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProducts(): UseProductsResult {
  const [produtos, setProdutos] = useState<ProdutoServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<ProdutoServico[] | null>(null);

  const fetchProdutos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ProdutoAPI.list({ sort: "-vezesUsado" });
      cacheRef.current = data;
      setProdutos(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar produtos";
      setError(msg);
      if (cacheRef.current) {
        setProdutos(cacheRef.current);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProdutos();
  }, [fetchProdutos]);

  // Invalidação por EventBus
  useEffect(() => {
    const unsubs = [
      eventBus.on("product:created", () => fetchProdutos()),
      eventBus.on("product:updated", () => fetchProdutos()),
      eventBus.on("product:deleted", () => fetchProdutos()),
      // charge:created atualiza vezesUsado do produto
      eventBus.on("charge:created", () => fetchProdutos()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [fetchProdutos]);

  return { produtos, loading, error, refresh: fetchProdutos };
}
