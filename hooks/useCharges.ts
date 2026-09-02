// hooks/useCharges.ts — histórico paginado real por cliente (Sprint 9.5 / AC-54)
// Supabase range via Cobranca.page(): 5 por vez, mantendo páginas já carregadas.
import { useState, useEffect, useRef, useCallback } from "react";
import { Cobranca as CobrancaAPI, Parcela as ParcelaAPI } from "../api/entities";
import { eventBus } from "../lib/event-bus";
import { COBRANCAS_RECENTES_LIMIT } from "../config/app.config";
import type { Cobranca } from "../types/charge.types";
import type { Parcela, ParcelaUpdate } from "../types/parcel.types";

export interface CobrancaComParcelas extends Cobranca { parcelas: Parcela[]; }
export interface UseChargesResult {
  cobrancas: CobrancaComParcelas[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  total: number;
  temMais: boolean;
  carregarMais: () => Promise<void>;
  refresh: () => Promise<void>;
  patchParcelaLocal: (parcelaId: string, patch: ParcelaUpdate) => void;
}

const PAGE_SIZE = COBRANCAS_RECENTES_LIMIT || 5;

async function hidratarParcelas(cobrancas: Cobranca[]): Promise<CobrancaComParcelas[]> {
  if (cobrancas.length === 0) return [];
  const ids = cobrancas.map(c => c.id);
  const parcelas = await ParcelaAPI.filter({ cobrancaId: { $in: ids } });
  const porCobranca = new Map<string, Parcela[]>();
  for (const parcela of parcelas) {
    const lista = porCobranca.get(parcela.cobrancaId) ?? [];
    lista.push(parcela);
    porCobranca.set(parcela.cobrancaId, lista);
  }
  return cobrancas.map(c => ({
    ...c,
    parcelas: (porCobranca.get(c.id) ?? []).sort((a, b) => a.numeroParcela - b.numeroParcela),
  }));
}

export function useCharges(clienteId: string | null): UseChargesResult {
  const [cobrancas, setCobrancas] = useState<CobrancaComParcelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const loadedCountRef = useRef(0);
  const cacheRef = useRef<CobrancaComParcelas[]>([]);

  const carregarPagina = useCallback(async (skip: number, limit: number, append: boolean) => {
    if (!clienteId) return;
    const pagina = await CobrancaAPI.page(
      { clienteId },
      { skip, limit, sort: "-created_date" },
    );
    const hidratadas = await hidratarParcelas(pagina.data);
    setTotal(pagina.count);
    setCobrancas(prev => {
      const next = append ? [...prev, ...hidratadas] : hidratadas;
      cacheRef.current = next;
      loadedCountRef.current = next.length;
      return next;
    });
  }, [clienteId]);

  const refresh = useCallback(async () => {
    if (!clienteId) {
      setCobrancas([]);
      setTotal(0);
      setLoading(false);
      loadedCountRef.current = 0;
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await carregarPagina(0, Math.max(PAGE_SIZE, loadedCountRef.current), false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar cobranças");
      setCobrancas(cacheRef.current);
    } finally {
      setLoading(false);
    }
  }, [clienteId, carregarPagina]);

  useEffect(() => {
    loadedCountRef.current = 0;
    cacheRef.current = [];
    setCobrancas([]);
    setTotal(0);
    void refresh();
  }, [clienteId, refresh]);

  useEffect(() => {
    if (!clienteId) return;
    const invalida = () => void refresh();
    const unsubs = [
      eventBus.on("charge:created", invalida),
      eventBus.on("charge:updated", invalida),
      eventBus.on("charge:deleted", invalida),
      eventBus.on("parcel:updated", invalida),
      eventBus.on("parcel:paid", invalida),
      eventBus.on("parcel:charged", invalida),
      eventBus.on("parcel:archived", invalida),
      eventBus.on("parcel:unarchived", invalida),
    ];
    return () => unsubs.forEach(u => u());
  }, [clienteId, refresh]);

  const carregarMais = useCallback(async () => {
    if (!clienteId || loadingMore || loadedCountRef.current >= total) return;
    setLoadingMore(true);
    setError(null);
    try {
      await carregarPagina(loadedCountRef.current, PAGE_SIZE, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar mais cobranças");
    } finally {
      setLoadingMore(false);
    }
  }, [clienteId, loadingMore, total, carregarPagina]);

  const patchParcelaLocal = useCallback((parcelaId: string, patch: ParcelaUpdate) => {
    setCobrancas(prev => {
      const next = prev.map(c => ({
        ...c,
        parcelas: c.parcelas.map(p => p.id === parcelaId ? ({ ...p, ...patch } as Parcela) : p),
      }));
      cacheRef.current = next;
      return next;
    });
  }, []);

  return {
    cobrancas,
    loading,
    loadingMore,
    error,
    total,
    temMais: cobrancas.length < total,
    carregarMais,
    refresh,
    patchParcelaLocal,
  };
}
