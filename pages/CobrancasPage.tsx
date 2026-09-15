// pages/CobrancasPage.tsx — Visão geral de todas as parcelas (Etapa 3A + 3B)
// Agrupada por Cliente → Cobrança/produto → Parcelas, com filtros e busca.
// Ações: Marcar parcela como paga (marcarPago) e Desfazer pagamento (desfazerPagamento),
// ambos reutilizados de useParcelActions. Pagamento parcial não é exposto aqui.
import React, { useState, useEffect, useCallback } from "react";
import { Parcela as ParcelaAPI, Cliente as ClienteAPI, Cobranca as CobrancaAPI } from "../api/entities";
import { eventBus } from "../lib/event-bus";
import { formatarMoeda } from "../lib/format.utils";
import { formatarDataBR, hoje } from "../lib/date.utils";
import { isAtrasada, diasAtraso } from "../domain/overdue.rules";
import { useParcelActions } from "../hooks/useParcelActions";
import { SearchInput } from "../components/SearchInput";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { ActionToast } from "../components/ActionToast";
import type { Parcela } from "../types/parcel.types";
import type { Cobranca } from "../types/charge.types";
import type { Cliente } from "../types/client.types";
import type { ParcelaStatus } from "../types/common.types";
import type { EstadoAnterior } from "../types/common.types";

type Categoria = "pendente" | "vencida" | "futura" | "paga" | "pago_parcial" | "arquivada";
type Filtro = "todas" | Categoria;

interface Item { parcela: Parcela; categoria: Categoria; }

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "pendente", label: "Pendentes" },
  { id: "paga", label: "Pagas" },
  { id: "vencida", label: "Vencidas" },
  { id: "futura", label: "Futuras" },
  { id: "arquivada", label: "Arquivadas" },
];

/**
 * Categoria de exibição, derivada em tempo de execução (nada é gravado no banco):
 * arquivada > paga > pago_parcial > vencida (isAtrasada) > futura > pendente (vence hoje).
 */
function categoriaDe(p: Parcela, dataHoje: string): Categoria {
  if (p.arquivada) return "arquivada";
  if (p.status === "pago") return "paga";
  if (p.status === "pago_parcial") return "pago_parcial";
  if (isAtrasada(p, dataHoje)) return "vencida";
  if (p.dataVencimento > dataHoje) return "futura";
  return "pendente";
}

/** Badge da categoria: reutiliza StatusBadge; "Futura" usa o mesmo visual muted. */
function renderBadge(p: Parcela, categoria: Categoria, dataHoje: string) {
  if (categoria === "arquivada") return React.createElement(StatusBadge, { status: "arquivado" });
  if (categoria === "paga") return React.createElement(StatusBadge, { status: "pago" });
  if (categoria === "pago_parcial") return React.createElement(StatusBadge, { status: "pago_parcial" });
  if (categoria === "vencida") return React.createElement(StatusBadge, { status: p.status as ParcelaStatus, diasAtraso: diasAtraso(p, dataHoje) });
  if (categoria === "futura") return React.createElement("span", {
    className: "inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground",
  }, "Futura");
  // Vence hoje: mostra o status real (Pendente ou Cobrado)
  return React.createElement(StatusBadge, { status: p.status });
}

export function CobrancasPage() {
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [cobrancas, setCobrancas] = useState<Record<string, Cobranca>>({});
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const [expandidasCobrancas, setExpandidasCobrancas] = useState<Record<string, boolean>>({});
  const [processando, setProcessando] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ message: string; retry: () => void } | null>(null);
  const parcelActions = useParcelActions();

  const carregar = useCallback(async () => {
    try {
      const [ps, cls, cbs] = await Promise.all([
        ParcelaAPI.list({ sort: "dataVencimento" }),
        ClienteAPI.list(),
        CobrancaAPI.list(),
      ]);
      setParcelas(ps);
      setNomes(Object.fromEntries((cls as Cliente[]).map(c => [c.id, c.nome])));
      setCobrancas(Object.fromEntries((cbs as Cobranca[]).map(c => [c.id, c])));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar cobranças");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  // Atualização por eventos (mesmo padrão do useCharges) — sem polling.
  useEffect(() => {
    const invalida = () => void carregar();
    const unsubs = [
      eventBus.on("charge:created", invalida),
      eventBus.on("charge:updated", invalida),
      eventBus.on("charge:deleted", invalida),
      eventBus.on("client:created", invalida),
      eventBus.on("client:updated", invalida),
      eventBus.on("parcel:paid", invalida),
      eventBus.on("parcel:updated", invalida),
      eventBus.on("parcel:charged", invalida),
      eventBus.on("parcel:archived", invalida),
      eventBus.on("parcel:unarchived", invalida),
    ];
    return () => unsubs.forEach(u => u());
  }, [carregar]);

  // Marca somente esta parcela como paga (pagamento total, inclusive antecipado).
  // Reutiliza marcarPago; a atualização da página vem do evento parcel:paid → carregar().
  const marcarPago = useCallback(async (p: Parcela) => {
    if (processando) return;
    setProcessando(p.id);
    try {
      await parcelActions.marcarPago(p);
    } catch {
      setActionError({ message: "Erro ao marcar como pago. Tente novamente.", retry: () => void marcarPago(p) });
    } finally {
      setProcessando(null);
    }
  }, [parcelActions, processando]);

  // Desfaz o pagamento desta parcela — mesmo padrão/confirm do ClientsPage (MÉD-01).
  const desfazer = useCallback(async (par: Parcela) => {
    const confirmado = window.confirm("Desfazer o pagamento desta parcela e voltar ao status anterior?");
    if (!confirmado) return;
    const est: EstadoAnterior = {
      status: par.dataCobrancaEnviada ? "cobrado" : "pendente",
      valorPago: null,
      dataPagamento: null,
      dataCobrancaEnviada: par.dataCobrancaEnviada,
    };
    try {
      await parcelActions.desfazerPagamento(par.id, est);
    } catch {
      setActionError({ message: "Erro ao desfazer pagamento. Tente novamente.", retry: () => void desfazer(par) });
    }
  }, [parcelActions]);

  const toggleCliente = useCallback((clienteId: string) => {
    setExpandidos(prev => ({ ...prev, [clienteId]: !prev[clienteId] }));
  }, []);

  const toggleCobranca = useCallback((cobrancaId: string) => {
    setExpandidasCobrancas(prev => ({ ...prev, [cobrancaId]: !prev[cobrancaId] }));
  }, []);

  const dataHoje = hoje();
  const comCategoria: Item[] = parcelas.map(p => ({ parcela: p, categoria: categoriaDe(p, dataHoje) }));

  // Filtro + busca aplicados na lista plana; o agrupamento usa apenas os sobreviventes,
  // portanto nunca se formam grupos (cliente/cobrança) vazios.
  const termo = busca.toLowerCase();
  const visiveis = (filtro === "todas"
    ? comCategoria
    : comCategoria.filter(x => x.categoria === filtro))
    .filter(({ parcela: p }) => !busca
      || (nomes[p.clienteId] || "").toLowerCase().includes(termo)
      || (cobrancas[p.cobrancaId]?.nomeProdutoServico || "").toLowerCase().includes(termo))
    .sort((a, b) => a.parcela.dataVencimento === b.parcela.dataVencimento
      ? a.parcela.numeroParcela - b.parcela.numeroParcela
      : a.parcela.dataVencimento < b.parcela.dataVencimento ? -1 : 1);

  // Agrupamento em memória: Cliente → Cobrança/produto → parcelas visíveis.
  const porCliente = new Map<string, { nome: string; cobrancas: Map<string, { nome: string; parcelas: Item[] }> }>();
  for (const item of visiveis) {
    const p = item.parcela;
    let g = porCliente.get(p.clienteId);
    if (!g) {
      g = { nome: nomes[p.clienteId] || "Cliente", cobrancas: new Map() };
      porCliente.set(p.clienteId, g);
    }
    let cb = g.cobrancas.get(p.cobrancaId);
    if (!cb) {
      cb = { nome: cobrancas[p.cobrancaId]?.nomeProdutoServico || "Produto", parcelas: [] };
      g.cobrancas.set(p.cobrancaId, cb);
    }
    cb.parcelas.push(item);
  }
  const grupos = [...porCliente.entries()]
    .sort((a, b) => a[1].nome.localeCompare(b[1].nome))
    .map(([clienteId, g]) => ({ clienteId, nome: g.nome, cobrancas: [...g.cobrancas.values()] }));

  if (loading) return React.createElement("div", { className: "flex justify-center py-12" }, React.createElement("p", { className: "text-muted-foreground" }, "Carregando..."));
  if (error) return React.createElement("div", { className: "flex justify-center py-12" }, React.createElement("p", { className: "text-destructive" }, `Erro: ${error}`));

  return React.createElement("div", { className: "flex flex-col gap-4 p-4 max-w-2xl mx-auto" },
    React.createElement("h1", { className: "text-xl font-semibold" }, "Cobranças"),
    React.createElement(SearchInput, { placeholder: "Buscar por cliente ou produto...", onChange: setBusca }),
    React.createElement("div", { className: "flex gap-1 flex-wrap" },
      ...FILTROS.map(f => {
        const qtd = f.id === "todas"
          ? comCategoria.length
          : comCategoria.filter(x => x.categoria === f.id).length;
        const ativo = filtro === f.id;
        return React.createElement("button", {
          key: f.id,
          onClick: () => setFiltro(f.id),
          className: ativo
            ? "rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-medium"
            : "rounded-full border px-3 py-1 text-xs font-medium hover:bg-accent",
        }, `${f.label} (${qtd})`);
      }),
    ),
    grupos.length === 0
      ? React.createElement(EmptyState, {
          title: busca || filtro !== "todas" ? "Nenhum resultado" : "Nenhuma parcela",
          description: busca || filtro !== "todas" ? "Ajuste a busca ou o filtro" : "Cadastre uma cobrança para começar",
        })
      : React.createElement("div", { className: "flex flex-col gap-2" },
          ...grupos.map(g => {
            const itens = g.cobrancas.flatMap(cb => cb.parcelas);
            const pagas = itens.filter(x => x.parcela.status === "pago").length;
            const emAberto = itens.filter(x => x.parcela.status !== "pago" && !x.parcela.arquivada).length;
            const aberto = !!expandidos[g.clienteId];
            return React.createElement("div", { key: g.clienteId, className: "rounded-lg border bg-card" },
              // Cabeçalho do cliente (resumo derivado, nada persistido)
              React.createElement("div", {
                className: "flex items-center justify-between gap-2 p-3 cursor-pointer hover:bg-accent rounded-lg",
                onClick: () => toggleCliente(g.clienteId),
              },
                React.createElement("div", { className: "flex-1 min-w-0" },
                  React.createElement("span", { className: "font-medium block truncate" }, g.nome),
                  React.createElement("span", { className: "text-xs text-muted-foreground" },
                    `${itens.length} parcela${itens.length > 1 ? "s" : ""} · ${pagas} paga${pagas === 1 ? "" : "s"} · ${emAberto} em aberto`),
                ),
                React.createElement("span", { className: "text-muted-foreground text-xs" }, aberto ? "▾" : "▸"),
              ),
              // Expandido: cobranças/produtos com suas parcelas
              aberto ? React.createElement("div", { className: "px-3 pb-3 flex flex-col gap-3" },
                ...g.cobrancas.map(cb => {
                  const cobrancaId = cb.parcelas[0].parcela.cobrancaId;
                  const cob = cobrancas[cobrancaId];
                  const total = cob?.quantidadeParcelas || 1;
                  const pagasCb = cb.parcelas.filter(x => x.parcela.status === "pago").length;
                  const abertasCb = cb.parcelas.filter(x => x.parcela.status !== "pago" && !x.parcela.arquivada).length;
                  const aberta = !!expandidasCobrancas[cobrancaId];
                  return React.createElement("div", { key: cobrancaId, className: "rounded-md border" },
                    // Cabeçalho da cobrança: resumo derivado (valor total original = Cobranca.valor)
                    React.createElement("div", {
                      className: "flex items-center justify-between gap-2 p-2 cursor-pointer hover:bg-accent rounded-md",
                      onClick: () => toggleCobranca(cobrancaId),
                    },
                      React.createElement("div", { className: "flex-1 min-w-0" },
                        React.createElement("span", { className: "text-sm font-medium block truncate" }, cb.nome),
                        React.createElement("span", { className: "text-xs text-muted-foreground" },
                          `${formatarMoeda(cob?.valor || 0)} · ${cb.parcelas.length} parcela${cb.parcelas.length > 1 ? "s" : ""} · ${pagasCb} paga${pagasCb === 1 ? "" : "s"} · ${abertasCb} em aberto`),
                      ),
                      React.createElement("span", { className: "text-muted-foreground text-xs" }, aberta ? "▾" : "▸"),
                    ),
                    aberta ? React.createElement("div", { className: "px-2 pb-2 flex flex-col" },
                    ...cb.parcelas.map(({ parcela: p, categoria }) => {
                      const pago = p.valorPago || 0;
                      const saldo = p.valor - pago;
                      const isPago = p.status === "pago" || p.status === "pago_parcial";
                      return React.createElement("div", { key: p.id, className: "py-1.5 border-t first:border-t-0" },
                        React.createElement("div", { className: "flex items-center justify-between gap-2" },
                          React.createElement("span", { className: "text-sm truncate" },
                            `${p.numeroParcela}/${total} · ${formatarDataBR(p.dataVencimento)} · ${formatarMoeda(p.valor)}`),
                          React.createElement("div", { className: "flex items-center gap-1 flex-shrink-0" },
                            renderBadge(p, categoria, dataHoje),
                            !isPago && !p.arquivada ? React.createElement("button", {
                              onClick: () => void marcarPago(p),
                              disabled: processando === p.id,
                              className: "rounded border px-1.5 py-0.5 text-xs hover:bg-accent disabled:opacity-50",
                              title: "Pagamento total desta parcela (inclui antecipado)",
                            }, "Marcar parcela como paga") : null,
                            isPago && !p.arquivada ? React.createElement("button", {
                              onClick: () => void desfazer(p),
                              className: "rounded border px-1.5 py-0.5 text-xs hover:bg-accent",
                              title: "Desfazer pagamento",
                            }, "↺") : null,
                          ),
                        ),
                        React.createElement("div", { className: "text-xs text-muted-foreground" },
                          `Pago: ${formatarMoeda(pago)} · Saldo: ${formatarMoeda(saldo)}`),
                      );
                    }),
                    ) : null,
                  );
                }),
              ) : null,
            );
          }),
          React.createElement("div", { className: "text-xs text-muted-foreground" },
            `Mostrando ${visiveis.length} de ${parcelas.length} parcelas`),
        ),
    actionError ? React.createElement(ActionToast, {
      message: actionError.message,
      onRetry: () => { const retry = actionError.retry; setActionError(null); retry(); },
      onDismiss: () => setActionError(null),
    }) : null,
  );
}
