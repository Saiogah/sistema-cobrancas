// pages/DashboardPage.tsx — Dashboard principal (M9)
// PRD v2.0 seção 7.3 — Tela principal: quem cobrar hoje.
// Ordenação: atrasadas (vermelhas 4+ dias, laranjas 1-3), cobradas hoje, pendentes hoje.
// Seleção em lote, busca, próximos vencimentos com overlay, undo toast.

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useDashboard } from "../hooks/useDashboard";
import { useParcelActions } from "../hooks/useParcelActions";
import { useBatchSelect } from "../hooks/useBatchSelect";
import { ChargeCard } from "../components/ChargeCard";
import { BatchBar } from "../components/BatchBar";
import { SearchInput } from "../components/SearchInput";
import { EmptyState } from "../components/EmptyState";
import { UndoToast } from "../components/UndoToast";
import { Cliente as ClienteAPI, Cobranca as CobrancaAPI } from "../api/entities";
import { hoje, formatarDataBR } from "../lib/date.utils";
import { formatarMoeda } from "../lib/format.utils";
import { diasAtraso } from "../domain/overdue.rules";
import type { Parcela } from "../types/parcel.types";
import type { Cobranca } from "../types/charge.types";
import type { Cliente } from "../types/client.types";
import type { EstadoAnterior } from "../types/parcel.types";

interface DashboardItem {
  parcela: Parcela;
  cobranca?: Cobranca;
  cliente?: Cliente;
}

export function DashboardPage() {
  const { parcelasHoje, parcelasAtrasadas, proximosVencimentos, contadores, loading, error, refresh } = useDashboard();
  const { marcarPago, marcarParcial, cobrar, confirmarEnvio, arquivar } = useParcelActions();
  const batch = useBatchSelect();

  const [busca, setBusca] = useState("");
  const [dadosCobrancas, setDadosCobrancas] = useState<Record<string, Cobranca>>({});
  const [dadosClientes, setDadosClientes] = useState<Record<string, Cliente>>({});
  const [undoToast, setUndoToast] = useState<{ message: string; onUndo: () => void } | null>(null);
  const [overlayVencimento, setOverlayVencimento] = useState<{ dia: number; data: string; total: number; valor: number; parcelas: DashboardItem[] } | null>(null);

  // Buscar cobranças e clientes para preencher os cards
  useEffect(() => {
    let cancelled = false;
    async function fetchDados() {
      const todasParcelas = [...parcelasAtrasadas, ...parcelasHoje];
      if (todasParcelas.length === 0) return;

      const cobrancaIds = [...new Set(todasParcelas.map(p => p.cobrancaId))];
      const clienteIds = [...new Set(todasParcelas.map(p => p.clienteId))];

      const cobrancasMap: Record<string, Cobranca> = {};
      const clientesMap: Record<string, Cliente> = {};

      // Buscar cobranças individualmente (list() retorna vazio no SDK backend)
      for (const id of cobrancaIds) {
        try {
          const cob = await CobrancaAPI.get(id) as Cobranca;
          if (cob) cobrancasMap[id] = cob;
        } catch { /* ignore */ }
      }

      // Buscar clientes individualmente
      for (const id of clienteIds) {
        try {
          const cli = await ClienteAPI.get(id) as Cliente;
          if (cli) clientesMap[id] = cli;
        } catch { /* ignore */ }
      }

      if (!cancelled) {
        setDadosCobrancas(cobrancasMap);
        setDadosClientes(clientesMap);
      }
    }
    fetchDados();
    return () => { cancelled = true; };
  }, [parcelasHoje, parcelasAtrasadas]);

  // Construir lista combinada de items
  const allItems: DashboardItem[] = useMemo(() => {
    const atrasadas: DashboardItem[] = parcelasAtrasadas.map(p => ({
      parcela: p,
      cobranca: dadosCobrancas[p.cobrancaId],
      cliente: dadosClientes[p.clienteId],
    }));
    const hojes: DashboardItem[] = parcelasHoje.map(p => ({
      parcela: p,
      cobranca: dadosCobrancas[p.cobrancaId],
      cliente: dadosClientes[p.clienteId],
    }));
    return [...atrasadas, ...hojes];
  }, [parcelasAtrasadas, parcelasHoje, dadosCobrancas, dadosClientes]);

  // Filtrar por busca (nome, produto, telefone)
  const itemsFiltrados = useMemo(() => {
    if (!busca.trim()) return allItems;
    const q = busca.toLowerCase();
    return allItems.filter(item => {
      const nome = item.cliente?.nome?.toLowerCase() || "";
      const produto = item.cobranca?.nomeProdutoServico?.toLowerCase() || "";
      const telefone = item.cliente?.telefone?.toLowerCase() || "";
      return nome.includes(q) || produto.includes(q) || telefone.includes(q);
    });
  }, [allItems, busca]);

  // Handlers
  const handleCharge = useCallback((parcela: Parcela) => {
    const cobranca = dadosCobrancas[parcela.cobrancaId];
    const cliente = dadosClientes[parcela.clienteId];
    if (!cobranca || !cliente) return;
    const link = cobrar(parcela, cobranca, cliente);
    window.open(link, "_blank");
  }, [dadosCobrancas, dadosClientes, cobrar]);

  const handleConfirmSend = useCallback(async (parcelaId: string) => {
    await confirmarEnvio(parcelaId);
    await refresh();
  }, [confirmarEnvio, refresh]);

  const handleMarkPaid = useCallback(async (parcelaId: string) => {
    const parcela = allItems.find(i => i.parcela.id === parcelaId)?.parcela;
    if (!parcela) return;
    const undo = await marcarPago(parcela);
    setUndoToast({
      message: `${dadosClientes[parcela.clienteId]?.nome || "Cliente"} — ${formatarMoeda(parcela.valor)} pago.`,
      onUndo: undo,
    });
    await refresh();
  }, [allItems, marcarPago, dadosClientes, refresh]);

  const handleMarkPartial = useCallback(async (parcelaId: string, valor: number) => {
    const parcela = allItems.find(i => i.parcela.id === parcelaId)?.parcela;
    if (!parcela) return;
    await marcarParcial(parcela, valor);
    await refresh();
  }, [allItems, marcarParcial, refresh]);

  const handleArchive = useCallback(async (parcelaId: string) => {
    await arquivar(parcelaId);
    await refresh();
  }, [arquivar, refresh]);

  // Lote: marcar todas como pagas
  const handleMarcarLote = useCallback(async () => {
    const ids = Array.from(batch.selecionadas);
    const parcelasParaPagar = allItems
      .filter(i => ids.includes(i.parcela.id))
      .map(i => i.parcela);

    if (parcelasParaPagar.length === 0) return;

    // Executar marcarPago para cada parcela e guardar undo functions
    const undos: (() => Promise<void>)[] = [];
    for (const p of parcelasParaPagar) {
      const undo = await marcarPago(p);
      undos.push(undo);
    }

    // 1 toast de undo para todas
    setUndoToast({
      message: `${parcelasParaPagar.length} parcela${parcelasParaPagar.length > 1 ? "s" : ""} marca${parcelasParaPagar.length > 1 ? "das" : "da"} como paga${parcelasParaPagar.length > 1 ? "s" : ""}.`,
      onUndo: async () => {
        for (const undo of undos) {
          await undo();
        }
        await refresh();
      },
    });

    batch.limpar();
    await refresh();
  }, [batch, allItems, marcarPago, refresh]);

  // Próximos vencimentos: clique abre overlay
  const handleVencimentoClick = useCallback(async (venc: { dia: number; data: string; total: number; valor: number }) => {
    // Buscar parcelas daquele dia
    try {
      const parcelasDia = await (await import("../api/entities")).Parcela.filter({ dataVencimento: venc.data });
      const items: DashboardItem[] = [];
      for (const p of parcelasDia) {
        if (p.arquivada) continue;
        if (p.status === "pago") continue;
        let cobranca: Cobranca | undefined;
        let cliente: Cliente | undefined;
        try { cobranca = await CobrancaAPI.get(p.cobrancaId) as Cobranca; } catch { /* */ }
        try { cliente = await ClienteAPI.get(p.clienteId) as Cliente; } catch { /* */ }
        if (cliente && !cliente.ativo) continue;
        items.push({ parcela: p, cobranca, cliente });
      }
      setOverlayVencimento({ ...venc, parcelas: items });
    } catch { /* */ }
  }, []);

  // Toast dismiss
  const dismissToast = useCallback(() => {
    setUndoToast(null);
  }, []);

  if (loading) {
    return React.createElement("div", { className: "flex justify-center py-12" },
      React.createElement("p", { className: "text-muted-foreground" }, "Carregando...")
    );
  }

  if (error) {
    return React.createElement("div", { className: "flex justify-center py-12" },
      React.createElement("p", { className: "text-destructive" }, `Erro: ${error}`)
    );
  }

  const dataHoje = hoje();
  const dataFormatada = formatarDataBR(dataHoje);

  // Estado vazio
  if (allItems.length === 0 && proximosVencimentos.length === 0) {
    return React.createElement("div", { className: "flex flex-col gap-4 p-4 max-w-2xl mx-auto" },
      React.createElement(EmptyState, { title: "Nada para cobrar hoje", description: "Tudo em dia! ✓" }),
    );
  }

  if (allItems.length === 0 && proximosVencimentos.length > 0) {
    const proximo = proximosVencimentos[0];
    return React.createElement("div", { className: "flex flex-col gap-4 p-4 max-w-2xl mx-auto" },
      React.createElement(EmptyState, { title: "Nada para cobrar hoje", description: `✓ Próximo vencimento: dia ${proximo.dia}` }),
      // Próximos vencimentos
      ...proximosVencimentos.map((v, i) => renderProximoVencimento(v, i, handleVencimentoClick)),
    );
  }

  return React.createElement("div", { className: "flex flex-col gap-3 p-4 max-w-2xl mx-auto pb-20" },
    // Cabeçalho: data de hoje
    React.createElement("div", { className: "flex flex-col gap-1" },
      React.createElement("h1", { className: "text-lg font-semibold" }, `Hoje — ${dataFormatada}`),
      // Contadores
      React.createElement("div", { className: "flex items-center gap-4 text-sm" },
        React.createElement("span", { className: "text-muted-foreground" }, `${contadores.total} cobrança${contadores.total > 1 ? "s" : ""}`),
        React.createElement("span", { className: "font-medium" }, formatarMoeda(contadores.valor)),
        contadores.atrasadas > 0
          ? React.createElement("span", { className: "text-destructive" }, `${contadores.atrasadas atrasada${contadores.atrasadas > 1 ? "s" : ""}`)
          : null,
      ),
    ),

    // Busca
    React.createElement(SearchInput, { placeholder: "Buscar por nome, produto ou telefone...", onChange: setBusca }),

    // Lista de cards
    itemsFiltrados.length === 0
      ? React.createElement(EmptyState, { title: "Nenhum resultado", description: "Tente outra busca" })
      : itemsFiltrados.map((item, idx) => {
          const isAtrasada = parcelasAtrasadas.some(p => p.id === item.parcela.id);
          return React.createElement(ChargeCard, {
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
          });
        }),

    // Próximos vencimentos
    proximosVencimentos.length > 0
      ? React.createElement("div", { className: "mt-4 pt-3 border-t" },
          React.createElement("h2", { className: "text-sm font-medium text-muted-foreground mb-2" }, "Próximos vencimentos"),
          ...proximosVencimentos.map((v, i) => renderProximoVencimento(v, i, handleVencimentoClick)),
        )
      : null,

    // BatchBar
    batch.temSelecao
      ? React.createElement(BatchBar, {
          quantidade: batch.quantidade,
          onMarcarTodasPagas: handleMarcarLote,
          onLimpar: batch.limpar,
        })
      : null,

    // UndoToast
    undoToast
      ? React.createElement(UndoToast, {
          message: undoToast.message,
          onUndo: () => { undoToast.onUndo(); dismissToast(); },
          onDismiss: dismissToast,
        })
      : null,

    // Overlay de próximos vencimentos
    overlayVencimento
      ? renderOverlayVencimento(overlayVencimento, () => setOverlayVencimento(null))
      : null,
  );
}

// Helper: renderizar linha de próximo vencimento
function renderProximoVencimento(
  venc: { dia: number; data: string; total: number; valor: number },
  index: number,
  onClick: (v: typeof venc) => void
) {
  return React.createElement("div", {
    key: index,
    className: "flex items-center justify-between py-2 px-3 rounded-lg border bg-card cursor-pointer hover:bg-accent",
    onClick: () => onClick(venc),
  },
    React.createElement("div", { className: "flex items-center gap-2" },
      React.createElement("span", { className: "w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium" },
        String(venc.dia).padStart(2, "0")),
      React.createElement("div", { className: "flex flex-col" },
        React.createElement("span", { className: "text-sm font-medium" }, `${venc.total} cobrança${venc.total > 1 ? "s" : ""}`),
        React.createElement("span", { className: "text-xs text-muted-foreground" }, formatarDataBR(venc.data)),
      ),
    ),
    React.createElement("span", { className: "text-sm font-medium" }, formatarMoeda(venc.valor)),
  );
}

// Helper: renderizar overlay/modal de vencimentos
function renderOverlayVencimento(
  venc: { dia: number; data: string; total: number; valor: number; parcelas: DashboardItem[] },
  onClose: () => void
) {
  return React.createElement("div", {
    className: "fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center",
    onClick: onClose,
  },
    React.createElement("div", {
      className: "bg-card text-card-foreground rounded-t-lg sm:rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto",
      onClick: (e: any) => e.stopPropagation(),
    },
      // Header
      React.createElement("div", { className: "flex items-center justify-between p-4 border-b" },
        React.createElement("div", { className: "flex flex-col" },
          React.createElement("h2", { className: "text-lg font-semibold" }, `Dia ${venc.dia} — ${formatarDataBR(venc.data)}`),
          React.createElement("span", { className: "text-sm text-muted-foreground" }, `${venc.total} cobrança${venc.total > 1 ? "s" : ""} · ${formatarMoeda(venc.valor)}`),
        ),
        React.createElement("button", {
          onClick: onClose,
          className: "rounded-md p-2 hover:bg-accent",
          "aria-label": "Fechar",
        }, "✕"),
      ),
      // Lista de parcelas
      React.createElement("div", { className: "flex flex-col gap-2 p-4" },
        venc.parcelas.length === 0
          ? React.createElement("p", { className: "text-sm text-muted-foreground text-center py-4" }, "Nenhuma parcela encontrada")
          : venc.parcelas.map((item, idx) =>
              React.createElement(ChargeCard, {
                key: item.parcela.id,
                parcela: item.parcela,
                cobranca: item.cobranca,
                cliente: item.cliente,
              })
            ),
      ),
    ),
  );
}
