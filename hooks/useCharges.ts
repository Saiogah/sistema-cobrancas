// hooks/useCharges.ts — Hook de cobranças + parcelas por cliente com cache e invalidação (M6a + correção M15)
import { useState, useEffect, useRef, useCallback } from "react";
import { Cobranca as CobrancaAPI, Parcela as ParcelaAPI } from "../api/entities";
import { eventBus } from "../lib/event-bus";
import { COBRANCAS_RECENTES_LIMIT } from "../config/app.config";
import type { Cobranca } from "../types/charge.types";
import type { Parcela } from "../types/parcel.types";

export interface CobrancaComParcelas extends Cobranca { parcelas: Parcela[]; }
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
  const todasCarregadasRef = useRef(false);
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
      let cobrancasData: Cobranca[] = await CobrancaAPI.filter({ clienteId });
      if (limite && !todasCarregadasRef.current && limite > 0) {
        cobrancasData = cobrancasData.slice(0, limite);
      } else if (!todasCarregadasRef.current) {
        cobrancasData = cobrancasData.slice(0, COBRANCAS_RECENTES_LIMIT);
      }

      const cobrancasComParcelas: CobrancaComParcelas[] = await Promise.all(
        cobrancasData.map(async (cob) => ({
          ...cob,
          parcelas: await ParcelaAPI.filter({ cobrancaId: cob.id }),
        })),
      );
      cacheRef.current = cobrancasComParcelas;
      setCobrancas(cobrancasComParcelas);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar cobranças");
      if (cacheRef.current) setCobrancas(cacheRef.current);
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    setTodasCarregadas(false);
    todasCarregadasRef.current = false;
    void fetchCobrancas();
  }, [fetchCobrancas]);

  useEffect(() => {
    if (!clienteId) return;
    const refresh = () => void fetchCobrancas();
    const unsubs = [
      eventBus.on("charge:created", refresh),
      eventBus.on("charge:updated", refresh),
      eventBus.on("charge:deleted", refresh),
      eventBus.on("parcel:updated", refresh),
      eventBus.on("parcel:paid", refresh),
      eventBus.on("parcel:charged", refresh),
      eventBus.on("parcel:archived", refresh),
      eventBus.on("parcel:unarchived", refresh),
    ];
    return () => unsubs.forEach((u) => u());
  }, [clienteId, fetchCobrancas]);

  const carregarTodas = useCallback(async () => {
    setTodasCarregadas(true);
    todasCarregadasRef.current = true;
    await fetchCobrancas();
  }, [fetchCobrancas]);

  return { cobrancas, loading, error, carregarTodas, todasCarregadas };
}
