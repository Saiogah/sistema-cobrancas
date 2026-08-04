// hooks/useClients.ts — Hook de listagem de clientes com cache e invalidação por EventBus (M6a)
//
// PRD v2.0 seção 5 — Performance: cache em memória, sem polling, sem setInterval.
// Invalidação por EventBus: client:created, client:updated, client:inactivated.

import { useState, useEffect, useRef, useCallback } from "react";
import { Cliente as ClienteAPI } from "@/api/entities";
import { eventBus } from "../lib/event-bus";
import type { Cliente } from "../types/client.types";

export interface UseClientsResult {
  clientes: Cliente[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useClients(): UseClientsResult {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Cliente[] | null>(null);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ClienteAPI.list();
      cacheRef.current = data;
      setClientes(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar clientes";
      setError(msg);
      // Em caso de erro, manter cache anterior se existir
      if (cacheRef.current) {
        setClientes(cacheRef.current);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  // Invalidação por EventBus
  useEffect(() => {
    const unsubs = [
      eventBus.on("client:created", () => fetchClientes()),
      eventBus.on("client:updated", () => fetchClientes()),
      eventBus.on("client:inactivated", () => fetchClientes()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [fetchClientes]);

  return { clientes, loading, error, refresh: fetchClientes };
}
