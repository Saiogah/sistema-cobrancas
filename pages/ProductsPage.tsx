// pages/ProductsPage.tsx — Página de Produtos (M12)
// Listagem ordenada por vezesUsado, edição inline, criação, exclusão, venda avulsa.
import React, { useState, useCallback, useEffect } from "react";
import { useProducts } from "../hooks/useProducts";
import { eventBus } from "../lib/event-bus";
import { formatarMoeda } from "../lib/format.utils";
import { SearchInput } from "../components/SearchInput";
import { EmptyState } from "../components/EmptyState";
import { ProdutoServico as ProdutoAPI, Cobranca as CobrancaAPI } from "../api/entities";
import type { ProdutoServico } from "../types/product.types";

export function ProductsPage() {
  const { produtos, loading, error, refresh } = useProducts();
  const [busca, setBusca] = useState("");
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [eNome, setENome] = useState("");
  const [eValor, setEValor] = useState("");
  const [novoForm, setNovoForm] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [vendasAvulsas, setVendasAvulsas] = useState(0);

  const carregarVendasAvulsas = useCallback(async () => {
    try {
      const cobrancas = await CobrancaAPI.filter({ produtoServicoId: null });
      setVendasAvulsas(cobrancas.length);
    } catch {
      // A contagem é informativa; a tela de produtos continua funcional se a leitura falhar.
    }
  }, []);

  useEffect(() => {
    void carregarVendasAvulsas();
    const atualizar = () => { void carregarVendasAvulsas(); };
    const offCreated = eventBus.on("charge:created", atualizar);
    const offUpdated = eventBus.on("charge:updated", atualizar);
    const offDeleted = eventBus.on("charge:deleted", atualizar);
    return () => {
      offCreated();
      offUpdated();
      offDeleted();
    };
  }, [carregarVendasAvulsas]);

  const ordenados = [...produtos].sort((a, b) => b.vezesUsado - a.vezesUsado);
  const filtrados = busca
    ? ordenados.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()))
    : ordenados;
  const maisUsado = ordenados[0]?.vezesUsado || 0;

  const handleSalvar = useCallback(async (p: ProdutoServico) => {
    const v = parseFloat(eValor.replace(",", ".")) || undefined;
    await ProdutoAPI.update(p.id, { nome: eNome, valorPadrao: v });
    eventBus.emit("product:updated");
    setEditandoId(null);
    await refresh();
  }, [eNome, eValor, refresh]);

  const handleCriar = useCallback(async () => {
    if (!novoNome.trim()) return;
    const v = parseFloat(novoValor.replace(",", ".")) || undefined;
    await ProdutoAPI.create({ nome: novoNome, valorPadrao: v, vezesUsado: 0 });
    eventBus.emit("product:created");
    setNovoForm(false); setNovoNome(""); setNovoValor("");
    await refresh();
  }, [novoNome, novoValor, refresh]);

  const handleExcluir = useCallback(async (p: ProdutoServico) => {
    const cobrancas = await CobrancaAPI.filter({ produtoServicoId: p.id });
    if (cobrancas.length > 0) {
      window.alert(`Não é possível excluir "${p.nome}" — existem ${cobrancas.length} cobrança(s) vinculadas.`);
      return;
    }
    if (!window.confirm(`Excluir "${p.nome}"?`)) return;
    await ProdutoAPI.delete(p.id);
    eventBus.emit("product:deleted");
    await refresh();
  }, [refresh]);

  if (loading) return React.createElement("div", { className: "flex justify-center py-12" }, React.createElement("p", { className: "text-muted-foreground" }, "Carregando..."));
  if (error) return React.createElement("div", { className: "flex justify-center py-12" }, React.createElement("p", { className: "text-destructive" }, `Erro: ${error}`));

  return React.createElement("div", { className: "flex flex-col gap-4 p-4 max-w-2xl mx-auto" },
    React.createElement("div", { className: "flex items-center justify-between" },
      React.createElement("h1", { className: "text-xl font-semibold" }, "Produtos"),
      React.createElement("button", { onClick: () => setNovoForm(!novoForm), className: "rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium" }, "+ Novo"),
    ),
    novoForm ? React.createElement("div", { className: "rounded-lg border bg-card p-3 space-y-2" },
      React.createElement("input", { type: "text", value: novoNome, onChange: (e: any) => setNovoNome(e.target.value), placeholder: "Nome do produto", className: "w-full rounded-md border px-3 py-2 text-sm" }),
      React.createElement("input", { type: "text", value: novoValor, onChange: (e: any) => setNovoValor(e.target.value), placeholder: "Valor padrão (opcional)", className: "w-full rounded-md border px-3 py-2 text-sm" }),
      React.createElement("div", { className: "flex gap-2" },
        React.createElement("button", { onClick: handleCriar, className: "rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm" }, "Salvar"),
        React.createElement("button", { onClick: () => { setNovoForm(false); setNovoNome(""); setNovoValor(""); }, className: "rounded-md border px-3 py-1 text-sm" }, "Cancelar"),
      ),
    ) : null,
    React.createElement(SearchInput, { placeholder: "Buscar produto...", onChange: setBusca }),
    React.createElement("div", { className: "flex flex-col gap-2" },
      filtrados.length === 0
        ? React.createElement(EmptyState, { title: busca ? "Nenhum produto encontrado" : "Nenhum produto", description: busca ? "Tente outra busca" : "Clique em + Novo para cadastrar" })
        : filtrados.map(p => {
            const isExp = expandidoId === p.id;
            const isEdit = editandoId === p.id;
            const isMaisUsado = p.vezesUsado === maisUsado && p.vezesUsado > 0;
            return React.createElement("div", { key: p.id, className: "rounded-lg border bg-card", onClick: () => setExpandidoId(isExp ? null : p.id) },
              React.createElement("div", { className: "flex items-center justify-between p-3 cursor-pointer" },
                React.createElement("div", { className: "flex items-center gap-2" },
                  isMaisUsado ? React.createElement("span", { className: "text-sm" }, "⭐") : null,
                  React.createElement("div", { className: "flex flex-col" },
                    React.createElement("span", { className: "font-medium" }, p.nome),
                    React.createElement("span", { className: "text-xs text-muted-foreground" }, p.valorPadrao ? formatarMoeda(p.valorPadrao) : "Sem valor"),
                  ),
                ),
                React.createElement("span", { className: "text-xs text-muted-foreground" }, `Usado ${p.vezesUsado}x`),
              ),
              isExp ? React.createElement("div", { className: "border-t p-3 space-y-2", onClick: (e: any) => e.stopPropagation() },
                isEdit
                  ? React.createElement("div", { className: "space-y-2" },
                      React.createElement("input", { type: "text", value: eNome, onChange: (e: any) => setENome(e.target.value), placeholder: "Nome", className: "w-full rounded-md border px-3 py-2 text-sm" }),
                      React.createElement("input", { type: "text", value: eValor, onChange: (e: any) => setEValor(e.target.value), placeholder: "Valor padrão", className: "w-full rounded-md border px-3 py-2 text-sm" }),
                      React.createElement("div", { className: "flex gap-2" },
                        React.createElement("button", { onClick: () => handleSalvar(p), className: "rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm" }, "Salvar"),
                        React.createElement("button", { onClick: () => setEditandoId(null), className: "rounded-md border px-3 py-1 text-sm" }, "Cancelar"),
                      ),
                    )
                  : React.createElement("div", { className: "flex gap-2" },
                      React.createElement("button", { onClick: () => { setENome(p.nome); setEValor(p.valorPadrao ? String(p.valorPadrao) : ""); setEditandoId(p.id); }, className: "rounded-md border px-3 py-1 text-xs" }, "Editar"),
                      React.createElement("button", { onClick: () => handleExcluir(p), className: "rounded-md border px-3 py-1 text-xs text-destructive" }, "Excluir"),
                    ),
              ) : null,
            );
          }),
      React.createElement("div", { className: "rounded-lg border bg-muted/50 p-3 flex items-center justify-between" },
        React.createElement("div", { className: "flex flex-col" },
          React.createElement("span", { className: "font-medium text-muted-foreground" }, "Venda avulsa"),
          React.createElement("span", { className: "text-xs text-muted-foreground" }, `Usado ${vendasAvulsas} ${vendasAvulsas === 1 ? "vez" : "vezes"}`),
        ),
        React.createElement("span", { className: "text-xs text-muted-foreground" }, "Não editável"),
      ),
    ),
  );
}
