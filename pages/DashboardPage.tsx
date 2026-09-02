// pages/DashboardPage.tsx — Dashboard M9 + correções de release Sprint 9.5
// Optimistic UI com rollback/retry e carregamento de dados relacionados sem N+1.
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useDashboard } from "../hooks/useDashboard";
import { useParcelActions } from "../hooks/useParcelActions";
import { useBatchSelect } from "../hooks/useBatchSelect";
import { ChargeCard } from "../components/ChargeCard";
import { BatchBar } from "../components/BatchBar";
import { SearchInput } from "../components/SearchInput";
import { EmptyState } from "../components/EmptyState";
import { UndoToast } from "../components/UndoToast";
import { ActionToast } from "../components/ActionToast";
import { Cliente as ClienteAPI, Cobranca as CobrancaAPI, Parcela as ParcelaAPI } from "../api/entities";
import { hoje, formatarDataBR } from "../lib/date.utils";
import { formatarMoeda } from "../lib/format.utils";
import { isAtrasada } from "../domain/overdue.rules";
import type { Parcela } from "../types/parcel.types";
import type { Cobranca } from "../types/charge.types";
import type { Cliente } from "../types/client.types";

interface DashboardItem {
  parcela: Parcela;
  cobranca?: Cobranca;
  cliente?: Cliente;
}

type OptimisticOverride = Parcela | null;
interface ErrorToastState { message: string; retry: () => void; }

function toMap<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map(item => [item.id, item]));
}

export function DashboardPage() {
  const { parcelasHoje, parcelasAtrasadas, proximosVencimentos, loading, error, refresh } = useDashboard();
  const { marcarPago, marcarParcial, cobrar, confirmarEnvio, arquivar } = useParcelActions();
  const batch = useBatchSelect();
  const [busca, setBusca] = useState("");
  const [dadosCobrancas, setDadosCobrancas] = useState<Record<string, Cobranca>>({});
  const [dadosClientes, setDadosClientes] = useState<Record<string, Cliente>>({});
  const [overrides, setOverrides] = useState<Record<string, OptimisticOverride>>({});
  const [undoToast, setUndoToast] = useState<{ message: string; onUndo: () => void } | null>(null);
  const [errorToast, setErrorToast] = useState<ErrorToastState | null>(null);
  const [overlayVencimento, setOverlayVencimento] = useState<{ dia: number; data: string; total: number; valor: number; parcelas: DashboardItem[] } | null>(null);

  const setOverride = useCallback((id: string, value: OptimisticOverride) => {
    setOverrides(prev => ({ ...prev, [id]: value }));
  }, []);
  const clearOverride = useCallback((id: string) => {
    setOverrides(prev => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);
  const clearOverrides = useCallback((ids: string[]) => {
    setOverrides(prev => {
      const next = { ...prev };
      ids.forEach(id => delete next[id]);
      return next;
    });
  }, []);
  const showError = useCallback((message: string, retry: () => void) => {
    setErrorToast({ message, retry });
  }, []);

  // Zero get() em loop: duas queries em lote, independentemente do número de cards.
  useEffect(() => {
    let cancelled = false;
    async function fetchDados() {
      const todasParcelas = [...parcelasAtrasadas, ...parcelasHoje];
      const cobrancaIds = [...new Set(todasParcelas.map(p => p.cobrancaId))];
      const clienteIds = [...new Set(todasParcelas.map(p => p.clienteId))];
      if (cobrancaIds.length === 0 && clienteIds.length === 0) {
        if (!cancelled) { setDadosCobrancas({}); setDadosClientes({}); }
        return;
      }
      try {
        const [cobrancas, clientes] = await Promise.all([
          cobrancaIds.length ? CobrancaAPI.filter({ id: { $in: cobrancaIds } }) : Promise.resolve([]),
          clienteIds.length ? ClienteAPI.filter({ id: { $in: clienteIds } }) : Promise.resolve([]),
        ]);
        if (!cancelled) {
          setDadosCobrancas(toMap(cobrancas));
          setDadosClientes(toMap(clientes));
        }
      } catch {
        // O hook principal continua exibindo as parcelas; dados auxiliares podem tentar novamente no próximo refresh.
      }
    }
    void fetchDados();
    return () => { cancelled = true; };
  }, [parcelasHoje, parcelasAtrasadas]);

  const allItems: DashboardItem[] = useMemo(() => {
    const base = [...parcelasAtrasadas, ...parcelasHoje];
    const map = new Map<string, Parcela>(base.map(p => [p.id, p]));
    for (const [id, override] of Object.entries(overrides)) {
      if (override === null) map.delete(id);
      else map.set(id, override);
    }
    return [...map.values()]
      .filter(p => p.status !== "pago" && !p.arquivada)
      .map(p => ({ parcela: p, cobranca: dadosCobrancas[p.cobrancaId], cliente: dadosClientes[p.clienteId] }));
  }, [parcelasAtrasadas, parcelasHoje, overrides, dadosCobrancas, dadosClientes]);

  const contadores = useMemo(() => {
    const dataHoje = hoje();
    return {
      total: allItems.length,
      valor: allItems.reduce((sum, i) => sum + i.parcela.valor, 0),
      atrasadas: allItems.filter(i => isAtrasada(i.parcela, dataHoje)).length,
    };
  }, [allItems]);

  const itemsFiltrados = useMemo(() => {
    if (!busca.trim()) return allItems;
    const q = busca.toLowerCase();
    return allItems.filter(item =>
      (item.cliente?.nome?.toLowerCase() || "").includes(q) ||
      (item.cobranca?.nomeProdutoServico?.toLowerCase() || "").includes(q) ||
      (item.cliente?.telefone?.toLowerCase() || "").includes(q)
    );
  }, [allItems, busca]);

  const handleCharge = useCallback((parcela: Parcela) => {
    const cobranca = dadosCobrancas[parcela.cobrancaId];
    const cliente = dadosClientes[parcela.clienteId];
    if (!cobranca || !cliente) return;
    // "Cobrar" não persiste nada por definição do PRD; a persistência ocorre em Confirmar envio.
    window.open(cobrar(parcela, cobranca, cliente), "_blank");
  }, [dadosCobrancas, dadosClientes, cobrar]);

  const handleConfirmSend = useCallback(async (parcelaId: string) => {
    const anterior = allItems.find(i => i.parcela.id === parcelaId)?.parcela;
    if (!anterior) return;
    const otimista: Parcela = { ...anterior, status: "cobrado", dataCobrancaEnviada: hoje() };
    setOverride(parcelaId, otimista);
    try {
      await confirmarEnvio(parcelaId);
      await refresh();
      clearOverride(parcelaId);
    } catch {
      clearOverride(parcelaId);
      showError("Erro ao registrar cobrança enviada.", () => void handleConfirmSend(parcelaId));
    }
  }, [allItems, confirmarEnvio, refresh, setOverride, clearOverride, showError]);

  const handleMarkPaid = useCallback(async (parcelaId: string) => {
    const anterior = allItems.find(i => i.parcela.id === parcelaId)?.parcela;
    if (!anterior) return;
    setOverride(parcelaId, null);
    try {
      const undoBackend = await marcarPago(anterior);
      await refresh();
      clearOverride(parcelaId);

      const performUndo = async () => {
        setOverride(parcelaId, anterior);
        try {
          await undoBackend();
          await refresh();
          clearOverride(parcelaId);
        } catch {
          setOverride(parcelaId, null);
          showError("Erro ao desfazer pagamento.", () => void performUndo());
        }
      };
      setUndoToast({
        message: `${dadosClientes[anterior.clienteId]?.nome || "Cliente"} — ${formatarMoeda(anterior.valor)} pago.`,
        onUndo: () => void performUndo(),
      });
    } catch {
      clearOverride(parcelaId);
      showError("Erro ao marcar como pago.", () => void handleMarkPaid(parcelaId));
    }
  }, [allItems, marcarPago, refresh, clearOverride, setOverride, showError, dadosClientes]);

  const handleMarkPartial = useCallback(async (parcelaId: string, valorRecebido: number) => {
    const anterior = allItems.find(i => i.parcela.id === parcelaId)?.parcela;
    if (!anterior) return;
    const recebido = Math.floor(valorRecebido * 100) / 100;
    const novoPago = Math.floor(((anterior.valorPago || 0) + recebido) * 100) / 100;
    if (!Number.isFinite(recebido) || recebido <= 0) {
      showError("Digite um valor maior que zero.", () => undefined);
      return;
    }
    if (novoPago >= anterior.valor) setOverride(parcelaId, null);
    else setOverride(parcelaId, { ...anterior, status: "pago_parcial", valorPago: novoPago });
    try {
      await marcarParcial(anterior, recebido);
      await refresh();
      clearOverride(parcelaId);
    } catch {
      clearOverride(parcelaId);
      showError("Erro ao registrar pagamento parcial.", () => void handleMarkPartial(parcelaId, valorRecebido));
    }
  }, [allItems, marcarParcial, refresh, clearOverride, setOverride, showError]);

  const handleArchive = useCallback(async (parcelaId: string) => {
    const anterior = allItems.find(i => i.parcela.id === parcelaId)?.parcela;
    if (!anterior) return;
    setOverride(parcelaId, null);
    try {
      await arquivar(parcelaId);
      await refresh();
      clearOverride(parcelaId);
    } catch {
      clearOverride(parcelaId);
      showError("Erro ao arquivar.", () => void handleArchive(parcelaId));
    }
  }, [allItems, arquivar, refresh, clearOverride, setOverride, showError]);

  const handleMarcarLote = useCallback(async () => {
    const ids = Array.from(batch.selecionadas);
    const parcelas = allItems.filter(i => ids.includes(i.parcela.id)).map(i => i.parcela);
    if (!parcelas.length) return;
    parcelas.forEach(p => setOverride(p.id, null));
    const undos: Array<() => Promise<void>> = [];
    try {
      for (const p of parcelas) undos.push(await marcarPago(p));
      batch.limpar();
      await refresh();
      clearOverrides(ids);
      const undoLote = async () => {
        parcelas.forEach(p => setOverride(p.id, p));
        try {
          for (const undo of undos) await undo();
          await refresh();
          clearOverrides(ids);
        } catch {
          parcelas.forEach(p => setOverride(p.id, null));
          showError("Erro ao desfazer lote.", () => void undoLote());
        }
      };
      setUndoToast({ message: `${parcelas.length} parcelas marcadas como pagas.`, onUndo: () => void undoLote() });
    } catch {
      // Compensa qualquer update do lote que tenha concluído antes da falha.
      for (const undo of undos.reverse()) { try { await undo(); } catch { /* backend ficará fonte de verdade no refresh */ } }
      clearOverrides(ids);
      await refresh();
      showError("Erro ao marcar lote como pago.", () => void handleMarcarLote());
    }
  }, [batch, allItems, marcarPago, refresh, clearOverrides, setOverride, showError]);

  const handleVencimentoClick = useCallback(async (venc: { dia: number; data: string; total: number; valor: number }) => {
    try {
      const parcelasDia = (await ParcelaAPI.filter({ dataVencimento: venc.data }))
        .filter(p => !p.arquivada && p.status !== "pago");
      const cobrancaIds = [...new Set(parcelasDia.map(p => p.cobrancaId))];
      const clienteIds = [...new Set(parcelasDia.map(p => p.clienteId))];
      const [cobrancas, clientes] = await Promise.all([
        cobrancaIds.length ? CobrancaAPI.filter({ id: { $in: cobrancaIds } }) : Promise.resolve([]),
        clienteIds.length ? ClienteAPI.filter({ id: { $in: clienteIds } }) : Promise.resolve([]),
      ]);
      const cMap = toMap(cobrancas);
      const cliMap = toMap(clientes);
      const items = parcelasDia
        .filter(p => cliMap[p.clienteId]?.ativo !== false)
        .map(p => ({ parcela: p, cobranca: cMap[p.cobrancaId], cliente: cliMap[p.clienteId] }));
      setOverlayVencimento({ ...venc, parcelas: items });
    } catch {
      showError("Erro ao carregar vencimentos.", () => void handleVencimentoClick(venc));
    }
  }, [showError]);

  const dismissUndo = useCallback(() => setUndoToast(null), []);
  const dismissError = useCallback(() => setErrorToast(null), []);

  if (loading) return React.createElement("div", { className: "flex justify-center py-12" }, React.createElement("p", { className: "text-muted-foreground" }, "Carregando..."));
  if (error) return React.createElement("div", { className: "flex justify-center py-12" }, React.createElement("p", { className: "text-destructive" }, `Erro: ${error}`));

  const dataFormatada = formatarDataBR(hoje());
  if (allItems.length === 0 && proximosVencimentos.length === 0) {
    return React.createElement("div", { className: "flex flex-col gap-4 p-4 max-w-2xl mx-auto" },
      React.createElement(EmptyState, { title: "Nada para cobrar hoje", description: "Tudo em dia! ✓" }),
      errorToast ? React.createElement(ActionToast, { message: errorToast.message, onRetry: errorToast.retry, onDismiss: dismissError }) : null,
    );
  }
  if (allItems.length === 0 && proximosVencimentos.length > 0) {
    const proximo = proximosVencimentos[0];
    return React.createElement("div", { className: "flex flex-col gap-4 p-4 max-w-2xl mx-auto" },
      React.createElement(EmptyState, { title: "Nada para cobrar hoje", description: `✓ Próximo vencimento: dia ${proximo.dia}` }),
      ...proximosVencimentos.map((v, i) => renderProximoVencimento(v, i, handleVencimentoClick)),
      errorToast ? React.createElement(ActionToast, { message: errorToast.message, onRetry: errorToast.retry, onDismiss: dismissError }) : null,
    );
  }

  return React.createElement("div", { className: "flex flex-col gap-3 p-4 max-w-2xl mx-auto pb-20" },
    React.createElement("div", { className: "flex flex-col gap-1" },
      React.createElement("h1", { className: "text-lg font-semibold" }, `Hoje — ${dataFormatada}`),
      React.createElement("div", { className: "flex items-center gap-4 text-sm" },
        React.createElement("span", { className: "text-muted-foreground" }, `${contadores.total} cobrança${contadores.total > 1 ? "s" : ""}`),
        React.createElement("span", { className: "font-medium" }, formatarMoeda(contadores.valor)),
        contadores.atrasadas > 0 ? React.createElement("span", { className: "text-destructive" }, `${contadores.atrasadas} atrasada${contadores.atrasadas > 1 ? "s" : ""}`) : null,
      ),
    ),
    React.createElement(SearchInput, { placeholder: "Buscar por nome, produto ou telefone...", onChange: setBusca }),
    itemsFiltrados.length === 0
      ? React.createElement(EmptyState, { title: "Nenhum resultado", description: "Tente outra busca" })
      : itemsFiltrados.map(item => React.createElement(ChargeCard, {
          key: item.parcela.id,
          parcela: item.parcela,
          cobranca: item.cobranca,
          cliente: item.cliente,
          isSelected: batch.isSelected(item.parcela.id),
          onSelect: batch.toggle,
          onCharge: handleCharge,
          onConfirmSend: handleConfirmSend,
          onMarkPaid: handleMarkPaid,
          onMarkPartial: handleMarkPartial,
          onArchive: handleArchive,
        })),
    proximosVencimentos.length > 0 ? React.createElement("div", { className: "mt-4 pt-3 border-t" },
      React.createElement("h2", { className: "text-sm font-medium text-muted-foreground mb-2" }, "Próximos vencimentos"),
      ...proximosVencimentos.map((v, i) => renderProximoVencimento(v, i, handleVencimentoClick)),
    ) : null,
    batch.temSelecao ? React.createElement(BatchBar, { quantidade: batch.quantidade, onMarcarTodasPagas: handleMarcarLote, onLimpar: batch.limpar }) : null,
    undoToast ? React.createElement(UndoToast, { message: undoToast.message, onUndo: () => { undoToast.onUndo(); dismissUndo(); }, onDismiss: dismissUndo }) : null,
    errorToast ? React.createElement(ActionToast, { message: errorToast.message, onRetry: () => { const retry = errorToast.retry; dismissError(); retry(); }, onDismiss: dismissError }) : null,
    overlayVencimento ? renderOverlayVencimento(overlayVencimento, () => setOverlayVencimento(null)) : null,
  );
}

function renderProximoVencimento(venc: { dia: number; data: string; total: number; valor: number }, index: number, onClick: (v: typeof venc) => void) {
  return React.createElement("div", { key: index, className: "flex items-center justify-between py-2 px-3 rounded-lg border bg-card cursor-pointer hover:bg-accent", onClick: () => onClick(venc) },
    React.createElement("div", { className: "flex items-center gap-2" },
      React.createElement("span", { className: "w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium" }, String(venc.dia).padStart(2, "0")),
      React.createElement("div", { className: "flex flex-col" },
        React.createElement("span", { className: "text-sm font-medium" }, `${venc.total} cobrança${venc.total > 1 ? "s" : ""}`),
        React.createElement("span", { className: "text-xs text-muted-foreground" }, formatarDataBR(venc.data)),
      ),
    ),
    React.createElement("span", { className: "text-sm font-medium" }, formatarMoeda(venc.valor)),
  );
}

function renderOverlayVencimento(venc: { dia: number; data: string; total: number; valor: number; parcelas: DashboardItem[] }, onClose: () => void) {
  return React.createElement("div", { className: "fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center", onClick: onClose },
    React.createElement("div", { className: "bg-card text-card-foreground rounded-t-lg sm:rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto", onClick: (e: any) => e.stopPropagation() },
      React.createElement("div", { className: "flex items-center justify-between p-4 border-b" },
        React.createElement("div", { className: "flex flex-col" },
          React.createElement("h2", { className: "text-lg font-semibold" }, `Dia ${venc.dia} — ${formatarDataBR(venc.data)}`),
          React.createElement("span", { className: "text-sm text-muted-foreground" }, `${venc.total} cobrança${venc.total > 1 ? "s" : ""} · ${formatarMoeda(venc.valor)}`),
        ),
        React.createElement("button", { onClick: onClose, className: "rounded-md p-2 hover:bg-accent", "aria-label": "Fechar" }, "✕"),
      ),
      React.createElement("div", { className: "flex flex-col gap-2 p-4" },
        venc.parcelas.length === 0
          ? React.createElement("p", { className: "text-sm text-muted-foreground text-center py-4" }, "Nenhuma parcela encontrada")
          : venc.parcelas.map(item => React.createElement(ChargeCard, { key: item.parcela.id, parcela: item.parcela, cobranca: item.cobranca, cliente: item.cliente })),
      ),
    ),
  );
}
