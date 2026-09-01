// hooks/useProducts.ts — Hook de listagem de produtos/serviços com cache e invalidação por EventBus (M6a + M14)
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
      if (cacheRef.current) setProdutos(cacheRef.current);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProdutos();
  }, [fetchProdutos]);

  useEffect(() => {
    const unsubs = [
      eventBus.on("product:created", () => fetchProdutos()),
      eventBus.on("product:updated", () => fetchProdutos()),
      eventBus.on("product:deleted", () => fetchProdutos()),
      eventBus.on("charge:created", () => fetchProdutos()),
      // exclusão de cobrança decrementa vezesUsado dentro da RPC transacional.
      eventBus.on("charge:deleted", () => fetchProdutos()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [fetchProdutos]);

  return { produtos, loading, error, refresh: fetchProdutos };
}
