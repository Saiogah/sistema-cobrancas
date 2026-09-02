// pages/ClientsPage.tsx — Página de Clientes (M11 + integração M14)
// Listagem, busca, edição inline, histórico de cobranças, inativar/reativar, edição/exclusão de cobrança.
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useClients } from "../hooks/useClients";
import { useCharges, type CobrancaComParcelas } from "../hooks/useCharges";
import { useParcelActions } from "../hooks/useParcelActions";
import { eventBus } from "../lib/event-bus";
import { formatarTelefone, formatarMoeda } from "../lib/format.utils";
import { normalizarTelefone, validarTelefone } from "../lib/validation.utils";
import { formatarDataCurta } from "../lib/date.utils";
import { podeEditarCobranca, podeExcluirCobranca } from "../domain/charge.rules";
import { SearchInput } from "../components/SearchInput";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { Cliente as ClienteAPI, Cobranca as CobrancaAPI } from "../api/entities";
import type { Cliente } from "../types/client.types";
import type { Parcela } from "../types/parcel.types";
import type { EstadoAnterior } from "../types/common.types";

export function ClientsPage() {
  const navigate = useNavigate();
  const { clientes, loading, error, refresh } = useClients();
  const [busca, setBusca] = useState("");
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [novoForm, setNovoForm] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [eNome, setENome] = useState("");
  const [eTel, setETel] = useState("");
  const [eObs, setEObs] = useState("");

  const filtrados = busca
    ? clientes.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()) || c.telefone.includes(busca.replace(/\D/g, "")))
    : clientes;

  const handleInativar = useCallback(async (c: Cliente) => {
    if (!window.confirm(`Inativar ${c.nome}?`)) return;
    await ClienteAPI.update(c.id, { ativo: false });
    eventBus.emit("client:inactivated");
    await refresh();
  }, [refresh]);

  const handleReativar = useCallback(async (c: Cliente) => {
    await ClienteAPI.update(c.id, { ativo: true });
    eventBus.emit("client:updated");
    await refresh();
  }, [refresh]);

  const handleSalvar = useCallback(async (c: Cliente) => {
    const telefone = normalizarTelefone(eTel);
    if (!eNome.trim() || !validarTelefone(telefone)) {
      window.alert("Informe nome e telefone válido com DDD.");
      return;
    }
    await ClienteAPI.update(c.id, { nome: eNome.trim(), telefone, observacoes: eObs });
    eventBus.emit("client:updated");
    setEditandoId(null);
    await refresh();
  }, [eNome, eTel, eObs, refresh]);

  const handleCriar = useCallback(async () => {
    const telefone = normalizarTelefone(novoTelefone);
    if (!novoNome.trim() || !validarTelefone(telefone)) {
      window.alert("Informe nome e telefone válido com DDD.");
      return;
    }
    await ClienteAPI.create({ nome: novoNome.trim(), telefone, observacoes: "", ativo: true });
    eventBus.emit("client:created");
    setNovoForm(false); setNovoNome(""); setNovoTelefone("");
    await refresh();
  }, [novoNome, novoTelefone, refresh]);

  const handleEditarCobranca = useCallback((id: string) => {
    navigate(`/nova?editar=${encodeURIComponent(id)}`);
  }, [navigate]);

  const handleExcluirCobranca = useCallback(async (cobranca: CobrancaComParcelas, cliente: Cliente) => {
    // A UI e a RPC aplicam a mesma proteção: histórico com pagamento não pode ser apagado.
    if (!podeExcluirCobranca(cobranca.parcelas)) return;
    if (!window.confirm(`Excluir cobrança de ${cliente.nome}? Todas as parcelas serão deletadas.`)) return;
    try {
      await CobrancaAPI.delete(cobranca.id);
      eventBus.emit("charge:deleted");
    } catch (e) {
      const detalhe = e instanceof Error ? e.message : "Erro desconhecido";
      window.alert(`Erro ao excluir cobrança. ${detalhe}`);
    }
  }, []);

  if (loading) return React.createElement("div", { className: "flex justify-center py-12" }, React.createElement("p", { className: "text-muted-foreground" }, "Carregando..."));
  if (error) return React.createElement("div", { className: "flex justify-center py-12" }, React.createElement("p", { className: "text-destructive" }, `Erro: ${error}`));

  return React.createElement("div", { className: "flex flex-col gap-4 p-4 max-w-2xl mx-auto" },
    React.createElement("div", { className: "flex items-center justify-between" },
      React.createElement("h1", { className: "text-xl font-semibold" }, "Clientes"),
      React.createElement("button", { onClick: () => setNovoForm(!novoForm), className: "rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium" }, "+ Novo"),
    ),
    novoForm ? React.createElement("div", { className: "rounded-lg border bg-card p-3 space-y-2" },
      React.createElement("input", { type: "text", value: novoNome, onChange: (e: any) => setNovoNome(e.target.value), placeholder: "Nome", className: "w-full rounded-md border px-3 py-2 text-sm" }),
      React.createElement("input", { type: "text", value: novoTelefone, onChange: (e: any) => setNovoTelefone(e.target.value), placeholder: "Telefone", className: "w-full rounded-md border px-3 py-2 text-sm" }),
      React.createElement("div", { className: "flex gap-2" },
        React.createElement("button", { onClick: handleCriar, className: "rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm" }, "Salvar"),
        React.createElement("button", { onClick: () => { setNovoForm(false); setNovoNome(""); setNovoTelefone(""); }, className: "rounded-md border px-3 py-1 text-sm" }, "Cancelar"),
      ),
    ) : null,
    React.createElement(SearchInput, { placeholder: "Buscar por nome ou telefone...", onChange: setBusca }),
    filtrados.length === 0
      ? React.createElement(EmptyState, { title: "Nenhum cliente", description: busca ? "Tente outra busca" : "Clique em + Novo" })
      : React.createElement("div", { className: "flex flex-col gap-2" },
          ...filtrados.map(c => React.createElement(ClientCard, {
            key: c.id, cliente: c,
            expandido: expandidoId === c.id, editando: editandoId === c.id,
            eNome, eTel, eObs,
            onToggle: () => setExpandidoId(expandidoId === c.id ? null : c.id),
            onEdit: () => { setENome(c.nome); setETel(c.telefone); setEObs(c.observacoes || ""); setEditandoId(c.id); },
            onSave: () => handleSalvar(c), onCancel: () => setEditandoId(null),
            onInativar: () => handleInativar(c), onReativar: () => handleReativar(c),
            onSetENome: setENome, onSetETel: setETel, onSetEObs: setEObs,
            onEditarCobranca: handleEditarCobranca,
            onExcluirCobranca: (cobranca: CobrancaComParcelas) => handleExcluirCobranca(cobranca, c),
          })),
        ),
  );
}

interface ClientCardProps {
  cliente: Cliente; expandido: boolean; editando: boolean;
  eNome: string; eTel: string; eObs: string;
  onToggle: () => void; onInativar: () => void; onReativar: () => void;
  onEdit: () => void; onSave: () => void; onCancel: () => void;
  onSetENome: (v: string) => void; onSetETel: (v: string) => void; onSetEObs: (v: string) => void;
  onEditarCobranca: (id: string) => void;
  onExcluirCobranca: (cobranca: CobrancaComParcelas) => void;
}

function ClientCard(props: ClientCardProps) {
  const { cliente, expandido, editando } = props;
  const { cobrancas, loading: cLoading, carregarTodas, todasCarregadas } = useCharges(expandido ? cliente.id : null);
  const parcelActions = useParcelActions();
  const [cobExpandida, setCobExpandida] = useState<string | null>(null);

  return React.createElement("div", { className: "rounded-lg border bg-card", onClick: props.onToggle },
    React.createElement("div", { className: "flex items-center justify-between p-3 cursor-pointer" },
      React.createElement("div", { className: "flex flex-col" },
        React.createElement("span", { className: "font-medium" }, cliente.nome),
        React.createElement("span", { className: "text-sm text-muted-foreground" }, formatarTelefone(cliente.telefone)),
      ),
      React.createElement("div", { className: "flex items-center gap-2" },
        React.createElement("span", {
          className: cliente.ativo ? "rounded-md bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700" : "rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground",
          onClick: (e: any) => { e.stopPropagation(); if (!cliente.ativo) props.onReativar(); },
        }, cliente.ativo ? "Ativo" : "Inativo"),
        cobrancas.length > 0 ? React.createElement("span", { className: "text-xs text-muted-foreground" }, `${cobrancas.length} cobrança(s)`) : null,
      ),
    ),
    expandido ? React.createElement("div", { className: "border-t p-3 space-y-3", onClick: (e: any) => e.stopPropagation() },
      editando
        ? React.createElement("div", { className: "space-y-2" },
            React.createElement("input", { type: "text", value: props.eNome, onChange: (e: any) => props.onSetENome(e.target.value), placeholder: "Nome", className: "w-full rounded-md border px-3 py-2 text-sm" }),
            React.createElement("input", { type: "text", value: props.eTel, onChange: (e: any) => props.onSetETel(e.target.value), placeholder: "Telefone", className: "w-full rounded-md border px-3 py-2 text-sm" }),
            React.createElement("textarea", { value: props.eObs, onChange: (e: any) => props.onSetEObs(e.target.value), placeholder: "Observações", rows: 2, className: "w-full rounded-md border px-3 py-2 text-sm" }),
            React.createElement("div", { className: "flex gap-2" },
              React.createElement("button", { onClick: props.onSave, className: "rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm" }, "Salvar"),
              React.createElement("button", { onClick: props.onCancel, className: "rounded-md border px-3 py-1 text-sm" }, "Cancelar"),
            ),
          )
        : React.createElement("div", { className: "space-y-1" },
            cliente.observacoes ? React.createElement("p", { className: "text-sm text-muted-foreground" }, cliente.observacoes) : null,
            React.createElement("div", { className: "flex gap-2" },
              React.createElement("button", { onClick: props.onEdit, className: "rounded-md border px-3 py-1 text-xs" }, "Editar"),
              cliente.ativo
                ? React.createElement("button", { onClick: props.onInativar, className: "rounded-md border px-3 py-1 text-xs text-destructive" }, "Inativar")
                : React.createElement("button", { onClick: props.onReativar, className: "rounded-md border px-3 py-1 text-xs text-emerald-600" }, "Reativar"),
            ),
          ),
      cLoading
        ? React.createElement("p", { className: "text-sm text-muted-foreground" }, "Carregando cobranças...")
        : cobrancas.length === 0
          ? React.createElement("p", { className: "text-sm text-muted-foreground" }, "Nenhuma cobrança")
          : React.createElement("div", { className: "space-y-2" },
              ...cobrancas.map((cob: CobrancaComParcelas) => {
                const isExp = cobExpandida === cob.id;
                const pEdit = podeEditarCobranca(cob.parcelas);
                const pExc = podeExcluirCobranca(cob.parcelas);
                return React.createElement("div", { key: cob.id, className: "rounded-md border p-2" },
                  React.createElement("div", { className: "flex items-center justify-between cursor-pointer", onClick: (e: any) => { e.stopPropagation(); setCobExpandida(isExp ? null : cob.id); } },
                    React.createElement("div", { className: "flex flex-col" },
                      React.createElement("span", { className: "text-sm font-medium" }, cob.nomeProdutoServico),
                      React.createElement("span", { className: "text-xs text-muted-foreground" }, `${cob.quantidadeParcelas}x · ${formatarMoeda(cob.valor)}`),
                    ),
                    React.createElement("div", { className: "flex gap-1" },
                      // M14 torna a edição limitada acessível também quando pEdit=false.
                      React.createElement("button", {
                        onClick: (e: any) => { e.stopPropagation(); props.onEditarCobranca(cob.id); },
                        className: "rounded border px-2 py-0.5 text-xs",
                        title: pEdit ? "Editar cobrança" : "Editar observações e PIX",
                      }, "Editar"),
                      pExc ? React.createElement("button", { onClick: (e: any) => { e.stopPropagation(); props.onExcluirCobranca(cob); }, className: "rounded border px-2 py-0.5 text-xs text-destructive" }, "Excluir") : null,
                    ),
                  ),
                  isExp ? React.createElement("div", { className: "mt-2 space-y-1 pl-2" },
                    ...cob.parcelas.map((par: Parcela) => {
                      const isPago = par.status === "pago" || par.status === "pago_parcial";
                      return React.createElement("div", { key: par.id, className: "flex items-center justify-between text-xs" },
                        React.createElement("span", null, `${par.numeroParcela}. ${formatarMoeda(par.valor)} · ${formatarDataCurta(par.dataVencimento)}`),
                        React.createElement("div", { className: "flex items-center gap-1" },
                          React.createElement(StatusBadge, { status: par.status }),
                          par.arquivada ? React.createElement("button", {
                            onClick: async (e: any) => {
                              e.stopPropagation();
                              await parcelActions.desarquivar(par.id);
                            },
                            className: "rounded border px-1.5 py-0.5 text-xs",
                            title: "Desarquivar parcela",
                          }, "Desarquivar") : null,
                          isPago && !par.arquivada ? React.createElement("button", {
                            onClick: async (e: any) => {
                              e.stopPropagation();
                              const est: EstadoAnterior = { status: par.dataCobrancaEnviada ? 'cobrado' : 'pendente', valorPago: null, dataPagamento: null, dataCobrancaEnviada: par.dataCobrancaEnviada };
                              await parcelActions.desfazerPagamento(par.id, est);
                            },
                            className: "rounded border px-1.5 py-0.5 text-xs", title: "Desfazer pagamento",
                          }, "↺") : null,
                        ),
                      );
                    }),
                  ) : null,
                );
              }),
              !todasCarregadas && cobrancas.length >= 5
                ? React.createElement("button", { onClick: (e: any) => { e.stopPropagation(); carregarTodas(); }, className: "text-sm text-primary w-full text-center py-1" }, "Ver todas as cobranças")
                : null,
            ),
    ) : null,
  );
}
