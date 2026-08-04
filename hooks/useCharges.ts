// hooks/useCharges.ts — Hook de cobranças + parcelas por cliente com cache e invalidação (M6a)
//
// PRD v2.0 seção 5 — Performance: cache em memória, sem polling, sem setInterval.
// Limitado a COBRANCAS_RECENTES_LIMIT (5) por padrão. carregarTodas() para paginação.
// Invalidação por EventBus: charge:created, charge:updated, charge:deleted, parcel:updated.
//
// NOTA ARQUITETURAL: O hook busca cobranças via Cobranca.filter({ clienteId }) e para cada
// cobrança busca suas parcelas via Parcela.filter({ cobrancaId }). Os IDs das parcelas são
// preservados no retorno para uso futuro (ex: editarCobranca precisa de parcelasAtuaisIds).

import { useState, useEffect, useRef, useCallback } from "react";
import { Cobranca as CobrancaAPI, Parcela as ParcelaAPI } from "../api/entities";
import { eventBus } from "../lib/event-bus";
import { COBRANCAS_RECENTES_LIMIT } from "../config/app.config";
import type { Cobranca } from "../types/charge.types";
import type { Parcela } from "../types/parcel.types";

export interface CobrancaComParcelas extends Cobranca {
  parcelas: Parcela[];
}

export interface UseChargesResult {
  cobrancas: CobrancaComParcelas[];
  loading: boolean;
  error: string | null;
  carregarTodas: () => Promise<void>;
  todasCarregadas: boolean;
}

export function useCharges(clienteId: string | null): UseChargesResult {
  const [cobrancas, setCobrancas] = useState<CobrancaComParcelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todasCarregadas, setTodasCarregadas] = useState(false);
  const cacheRef = useRef<CobrancaComParcelas[] | null>(null);

  const fetchCobrancas = useCallback(async (limite?: number) => {
    if (!clienteId) {
      setCobrancas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let cobrancasData: Cobranca[];
      if (limite) {
        cobrancasData = await CobrancaAPI.filter({ clienteId });
        // O SDK não suporta limit direto em filter, então slice aplicado após
        // Para paginação real, usar skip/limit quando disponível
        if (!todasCarregadas && limite > 0) {
          cobrancasData = cobrancasData.slice(0, limite);
        }
      } else {
        cobrancasData = await CobrancaAPI.filter({ clienteId });
        if (!todasCarregadas) {
          cobrancasData = cobrancasData.slice(0, COBRANCAS_RECENTES_LIMIT);
        }
      }

      // Para cada cobrança, buscar suas parcelas
      const cobrancasComParcelas: CobrancaComParcelas[] = await Promise.all(
        cobrancasData.map(async (cob) => {
          const parcelas = await ParcelaAPI.filter({ cobrancaId: cob.id });
          return { ...cob, parcelas };
        })
      );

      cacheRef.current = cobrancasComParcelas;
      setCobrancas(cobrancasComParcelas);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar cobranças";
      setError(msg);
      if (cacheRef.current) {
        setCobrancas(cacheRef.current);
      }
    } finally {
      setLoading(false);
    }
  }, [clienteId, todasCarregadas]);

  useEffect(() => {
    setTodasCarregadas(false);
    fetchCobrancas();
  }, [fetchCobrancas]);

  // Invalidação por EventBus
  useEffect(() => {
    if (!clienteId) return;
    const unsubs = [
      eventBus.on("charge:created", () => fetchCobrancas()),
      eventBus.on("charge:updated", () => fetchCobrancas()),
      eventBus.on("charge:deleted", () => fetchCobrancas()),
      eventBus.on("parcel:updated", () => fetchCobrancas()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [clienteId, fetchCobrancas]);

  const carregarTodas = useCallback(async () => {
    setTodasCarregadas(true);
    await fetchCobrancas();
  }, [fetchCobrancas]);

  return { cobrancas, loading, error, carregarTodas, todasCarregadas };
}
