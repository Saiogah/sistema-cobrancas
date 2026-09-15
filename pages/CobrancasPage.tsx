// pages/CobrancasPage.tsx — Visão geral de todas as parcelas (Etapa 3A — consulta)
// Lista todas as parcelas de todos os clientes com filtros por categoria e busca.
// Nesta etapa é apenas consulta: ações de pagamento entram na Etapa 3B (useParcelActions).
import React, { useState, useEffect, useCallback } from "react";
import { Parcela as ParcelaAPI, Cliente as ClienteAPI, Cobranca as CobrancaAPI } from "../api/entities";
import { eventBus } from "../lib/event-bus";
import { formatarMoeda } from "../lib/format.utils";
import { formatarDataCurta, hoje } from "../lib/date.utils";
import { isAtrasada, diasAtraso } from "../domain/overdue.rules";
import { SearchInput } from "../components/SearchInput";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import type { Parcela } from "../types/parcel.types";
import type { Cobranca } from "../types/charge.types";
import type { Cliente } from "../types/client.types";
import type { ParcelaStatus } from "../types/common.types";

type Categoria = "pendente" | "vencida" | "futura" | "paga" | "pago_parcial" | "arquivada";
type Filtro = "todas" | Categoria;

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

  const dataHoje = hoje();
  const comCategoria = parcelas.map(p => ({ parcela: p, categoria: categoriaDe(p, dataHoje) }));

  const termo = busca.toLowerCase();
  const porBusca = busca
    ? comCategoria.filter(({ parcela: p }) =>
        (nomes[p.clienteId] || "").toLowerCase().includes(termo)
        || (cobrancas[p.cobrancaId]?.nomeProdutoServico || "").toLowerCase().includes(termo))
    : comCategoria;

  const visiveis = (filtro === "todas" ? porBusca : porBusca.filter(x => x.categoria === filtro))
    .slice()
    .sort((a, b) => a.parcela.dataVencimento === b.parcela.dataVencimento
      ? a.parcela.numeroParcela - b.parcela.numeroParcela
      : a.parcela.dataVencimento < b.parcela.dataVencimento ? -1 : 1);

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
    visiveis.length === 0
      ? React.createElement(EmptyState, {
          title: busca || filtro !== "todas" ? "Nenhum resultado" : "Nenhuma parcela",
          description: busca || filtro !== "todas" ? "Ajuste a busca ou o filtro" : "Cadastre uma cobrança para começar",
        })
      : React.createElement("div", { className: "flex flex-col gap-2" },
          ...visiveis.map(({ parcela: p, categoria }) => {
            const pago = p.valorPago || 0;
            const saldo = p.valor - pago;
            const cob = cobrancas[p.cobrancaId];
            const total = cob?.quantidadeParcelas || 1;
            return React.createElement("div", { key: p.id, className: "rounded-lg border bg-card p-3" },
              React.createElement("div", { className: "flex items-center justify-between gap-2" },
                React.createElement("div", { className: "flex-1 min-w-0" },
                  React.createElement("span", { className: "font-medium block truncate" }, nomes[p.clienteId] || "Cliente"),
                  React.createElement("span", { className: "text-xs text-muted-foreground block truncate" },
                    `${cob?.nomeProdutoServico || "Produto"} · ${p.numeroParcela}/${total}`),
                ),
                React.createElement("div", { className: "flex flex-col items-end gap-1 flex-shrink-0" },
                  React.createElement("span", { className: "font-semibold" }, formatarMoeda(p.valor)),
                  renderBadge(p, categoria, dataHoje),
                ),
              ),
              React.createElement("div", { className: "text-xs text-muted-foreground mt-1" },
                `Vencimento: ${formatarDataCurta(p.dataVencimento)} · Pago: ${formatarMoeda(pago)} · Saldo: ${formatarMoeda(saldo)}`),
            );
          }),
          React.createElement("div", { className: "text-xs text-muted-foreground" },
            `Mostrando ${visiveis.length} de ${parcelas.length} parcelas`),
        ),
  );
}
