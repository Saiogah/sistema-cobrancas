// hooks/useDashboard.ts — Hook do Dashboard com cálculo de atrasados em tempo real (M6b + M14)
// PRD v2.0 seção 5 — Performance: cache em memória, sem polling, sem setInterval.
// Invalidado por ações de parcela e por criação/edição/exclusão de cobranças.
import { useState, useEffect, useRef, useCallback } from "react";
import { Parcela as ParcelaAPI, Cliente as ClienteAPI } from "../api/entities";
import { eventBus } from "../lib/event-bus";
import { hoje, adicionarMeses } from "../lib/date.utils";
import { isAtrasada, ordenarParcelas } from "../domain/overdue.rules";
import type { Parcela } from "../types/parcel.types";
import { DIAS_VENCIMENTO } from "../config/days.config";

export interface ProximoVencimento {
  dia: number;
  data: string;
  total: number;
  valor: number;
}
export interface Contadores {
  total: number;
  valor: number;
  atrasadas: number;
}

export interface UseDashboardResult {
  parcelasHoje: Parcela[];
  parcelasAtrasadas: Parcela[];
  proximosVencimentos: ProximoVencimento[];
  contadores: Contadores;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboard(): UseDashboardResult {
  const [parcelasHoje, setParcelasHoje] = useState<Parcela[]>([]);
  const [parcelasAtrasadas, setParcelasAtrasadas] = useState<Parcela[]>([]);
  const [proximosVencimentos, setProximosVencimentos] = useState<ProximoVencimento[]>([]);
  const [contadores, setContadores] = useState<Contadores>({ total: 0, valor: 0, atrasadas: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<{ parcelas: Parcela[]; dataReferencia: string } | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dataHoje = hoje();
      const limiteSuperior = adicionarMeses(dataHoje, 1);
      const todosClientes = await ClienteAPI.list();
      const clientesAtivosIds = new Set(
        todosClientes.filter((c: any) => c.ativo === true).map((c: any) => c.id)
      );
      const todasParcelas = await ParcelaAPI.list({ sort: "dataVencimento" });
      const parcelasFiltradas = todasParcelas.filter((p: any) =>
        !p.arquivada &&
        p.dataVencimento <= limiteSuperior &&
        p.status !== "pago" &&
        clientesAtivosIds.has(p.clienteId)
      ) as Parcela[];

      const atrasadas = parcelasFiltradas.filter((p) => isAtrasada(p, dataHoje));
      const hojeParcelas = parcelasFiltradas.filter(
        (p) => p.dataVencimento === dataHoje && !isAtrasada(p, dataHoje)
      );

      const atrasadasOrdenadas = ordenarParcelas(atrasadas, dataHoje);
      const hojeOrdenadas = ordenarParcelas(hojeParcelas, dataHoje);
      const proximos: ProximoVencimento[] = [];
      const datasVistas = new Set<string>();
      const datasFuturas = parcelasFiltradas
        .filter((p) => {
          if (p.dataVencimento <= dataHoje) return false;
          const dia = parseInt(p.dataVencimento.split("-")[2], 10);
          return DIAS_VENCIMENTO.includes(dia as (typeof DIAS_VENCIMENTO)[number]);
        })
        .map((p) => p.dataVencimento)
        .sort();

      for (const data of datasFuturas) {
        if (datasVistas.has(data)) continue;
        datasVistas.add(data);
        const parcelasDoDia = parcelasFiltradas.filter((p) => p.dataVencimento === data);
        const dia = parseInt(data.split("-")[2], 10);
        const valor = parcelasDoDia.reduce((sum, p) => sum + p.valor, 0);
        proximos.push({ dia, data, total: parcelasDoDia.length, valor });
        if (proximos.length >= 3) break;
      }

      const todasRelevantes = [...atrasadas, ...hojeParcelas];
      const total = todasRelevantes.length;
      const valor = todasRelevantes.reduce((sum, p) => sum + p.valor, 0);
      const numAtrasadas = atrasadas.length;
      cacheRef.current = { parcelas: parcelasFiltradas, dataReferencia: dataHoje };
      setParcelasHoje(hojeOrdenadas);
      setParcelasAtrasadas(atrasadasOrdenadas);
      setProximosVencimentos(proximos);
      setContadores({ total, valor, atrasadas: numAtrasadas });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar dashboard";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const unsubs = [
      eventBus.on("parcel:paid", () => fetchDashboard()),
      eventBus.on("parcel:charged", () => fetchDashboard()),
      eventBus.on("parcel:archived", () => fetchDashboard()),
      eventBus.on("parcel:unarchived", () => fetchDashboard()),
      eventBus.on("parcel:updated", () => fetchDashboard()),
      eventBus.on("charge:created", () => fetchDashboard()),
      eventBus.on("charge:updated", () => fetchDashboard()),
      eventBus.on("charge:deleted", () => fetchDashboard()),
      eventBus.on("client:inactivated", () => fetchDashboard()),
      eventBus.on("client:updated", () => fetchDashboard()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [fetchDashboard]);

  return {
    parcelasHoje,
    parcelasAtrasadas,
    proximosVencimentos,
    contadores,
    loading,
    error,
    refresh: fetchDashboard,
  };
}
