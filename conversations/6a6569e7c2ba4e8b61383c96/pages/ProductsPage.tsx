// pages/ProductsPage.tsx — Tela de Gestão de Produtos e Serviços (M12)
//
// Requisitos PRD v2.0 M12:
// - Listagem de produtos/serviços com useProducts (ordenados por vezesUsado desc)
// - Card com nome, valor padrão formatado ou 'Sem valor', 'Usado X vezes', ⭐ no mais usado
// - Toque/clique no card expande edição inline (nome, valorPadrao)
// - Botão [＋ Novo] no cabeçalho abre mini-form inline
// - Item 'Venda avulsa' fixo no fim (agrupamento visual de cobranças sem produtoServicoId, não editável)
// - Exclusão com verificação: bloqueia se houver cobranças vinculadas ao produto, permite caso contrário
// - Busca com SearchInput por nome do produto
// - EmptyState quando não houver produtos
// - Dispara eventos no eventBus (product:created, product:updated, product:deleted)

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useProducts } from "../hooks/useProducts";
import { ProdutoServico, Cobranca } from "../api/entities";
import { eventBus } from "../lib/event-bus";
import { formatarMoeda } from "../lib/format.utils";
import { SearchInput } from "../components/SearchInput";
import { EmptyState } from "../components/EmptyState";
import type { ProdutoServico as ProdutoServicoType } from "../types/product.types";

export function ProductsPage() {
  const { produtos, loading, error } = useProducts();

  // Estado de busca por texto
  const [searchTerm, setSearchTerm] = useState("");

  // Estado de contagem para "Venda avulsa" (cobranças com produtoServicoId = null)
  const [vendaAvulsaCount, setVendaAvulsaCount] = useState<number | null>(null);

  // Estado do mini-form de novo produto ([＋ Novo])
  const [isCreating, setIsCreating] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [newValorPadrao, setNewValorPadrao] = useState("");
  const [creatingError, setCreatingError] = useState<string | null>(null);
  const [isSavingNew, setIsSavingNew] = useState(false);

  // Estado da edição inline por card
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editValorPadrao, setEditValorPadrao] = useState("");
  const [editingError, setEditingError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Estado de exclusão e erro de bloqueio
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{ productId: string; message: string } | null>(null);

  // Busca a quantidade de cobranças de Venda Avulsa (produtoServicoId = null)
  const fetchVendaAvulsaCount = useCallback(async () => {
    try {
      const cobrancasAvulsas = await Cobranca.filter({ produtoServicoId: null });
      setVendaAvulsaCount(Array.isArray(cobrancasAvulsas) ? cobrancasAvulsas.length : 0);
    } catch {
      setVendaAvulsaCount(0);
    }
  }, []);

  useEffect(() => {
    fetchVendaAvulsaCount();
  }, [fetchVendaAvulsaCount]);

  // Atualiza contagem de venda avulsa quando cobranças forem alteradas
  useEffect(() => {
    const unsubs = [
      eventBus.on("charge:created", () => fetchVendaAvulsaCount()),
      eventBus.on("charge:updated", () => fetchVendaAvulsaCount()),
      eventBus.on("charge:deleted", () => fetchVendaAvulsaCount()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [fetchVendaAvulsaCount]);

  // Ordenação garantida por vezesUsado decrescente
  const produtosSorted = useMemo(() => {
    return [...produtos].sort((a, b) => (b.vezesUsado || 0) - (a.vezesUsado || 0));
  }, [produtos]);

  // Identifica o produto mais usado (para exibir a estrela ⭐)
  const mostUsedId = useMemo(() => {
    if (produtosSorted.length === 0) return null;
    const topCount = produtosSorted[0].vezesUsado || 0;
    if (topCount <= 0) return null;
    return produtosSorted[0].id;
  }, [produtosSorted]);

  // Produtos filtrados pelo campo de busca
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return produtosSorted;
    const term = searchTerm.toLowerCase().trim();
    return produtosSorted.filter((p) => p.nome.toLowerCase().includes(term));
  }, [produtosSorted, searchTerm]);

  // Alterna expansão de um card para edição inline
  const handleToggleExpand = (product: ProdutoServicoType) => {
    if (expandedProductId === product.id) {
      setExpandedProductId(null);
      setEditingError(null);
      setDeleteError(null);
    } else {
      setExpandedProductId(product.id);
      setEditNome(product.nome);
      setEditValorPadrao(
        product.valorPadrao !== null && product.valorPadrao !== undefined
          ? String(product.valorPadrao)
          : ""
      );
      setEditingError(null);
      setDeleteError(null);
    }
  };

  // Salvar novo produto
  const handleSaveNew = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nomeTrimmed = newNome.trim();
    if (!nomeTrimmed) {
      setCreatingError("O nome do produto é obrigatório.");
      return;
    }

    let parsedValor: number | undefined = undefined;
    if (newValorPadrao.trim() !== "") {
      const cleaned = newValorPadrao.replace(",", ".");
      const num = parseFloat(cleaned);
      if (isNaN(num) || num < 0) {
        setCreatingError("Valor padrão inválido.");
        return;
      }
      parsedValor = num;
    }

    setIsSavingNew(true);
    setCreatingError(null);
    try {
      await ProdutoServico.create({
        nome: nomeTrimmed,
        valorPadrao: parsedValor,
        vezesUsado: 0,
      });
      eventBus.emit("product:created");
      setIsCreating(false);
      setNewNome("");
      setNewValorPadrao("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao cadastrar produto.";
      setCreatingError(msg);
    } finally {
      setIsSavingNew(false);
    }
  };

  // Salvar edição inline do produto
  const handleSaveEdit = async (productId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nomeTrimmed = editNome.trim();
    if (!nomeTrimmed) {
      setEditingError("O nome do produto é obrigatório.");
      return;
    }

    let parsedValor: number | undefined = undefined;
    if (editValorPadrao.trim() !== "") {
      const cleaned = editValorPadrao.replace(",", ".");
      const num = parseFloat(cleaned);
      if (isNaN(num) || num < 0) {
        setEditingError("Valor padrão inválido.");
        return;
      }
      parsedValor = num;
    }

    setIsSavingEdit(true);
    setEditingError(null);
    try {
      await ProdutoServico.update(productId, {
        nome: nomeTrimmed,
        valorPadrao: parsedValor,
      });
      eventBus.emit("product:updated");
      setExpandedProductId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar produto.";
      setEditingError(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Tenta excluir o produto. Bloqueia se existirem cobranças vinculadas
  const handleDeleteProduct = async (productId: string) => {
    setDeletingProductId(productId);
    setDeleteError(null);
    try {
      const cobrancas = await Cobranca.filter({ produtoServicoId: productId });
      if (cobrancas && cobrancas.length > 0) {
        setDeleteError({
          productId,
          message: `Não é possível excluir: existem ${cobrancas.length} cobrança(s) vinculada(s) a este produto.`,
        });
        setDeletingProductId(null);
        return;
      }

      await ProdutoServico.delete(productId);
      eventBus.emit("product:deleted");
      setExpandedProductId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir produto.";
      setDeleteError({ productId, message: msg });
    } finally {
      setDeletingProductId(null);
    }
  };

  return React.createElement(
    "div",
    { className: "max-w-2xl mx-auto p-4 sm:p-6 space-y-6" },

    // Cabeçalho
    React.createElement(
      "div",
      { className: "flex items-center justify-between gap-4" },
      React.createElement(
        "div",
        { className: "space-y-1" },
        React.createElement("h1", { className: "text-2xl font-semibold text-foreground" }, "Produtos e Serviços"),
        React.createElement("p", { className: "text-sm text-muted-foreground" }, "Gerencie seus produtos, serviços e valores padrão")
      ),
      React.createElement(
        "button",
        {
          onClick: () => {
            setIsCreating(!isCreating);
            setCreatingError(null);
          },
          className: "inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground h-9 px-3.5 text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm shrink-0",
        },
        "＋ Novo"
      )
    ),

    // Mensagem de erro global do hook (se houver)
    error
      ? React.createElement(
          "div",
          { className: "rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" },
          error
        )
      : null,

    // Mini-form inline para criação de novo produto
    isCreating
      ? React.createElement(
          "form",
          {
            onSubmit: handleSaveNew,
            className: "rounded-lg border bg-card p-4 space-y-4 shadow-sm",
          },
          React.createElement("h2", { className: "text-base font-medium text-card-foreground" }, "Novo Produto / Serviço"),
          creatingError
            ? React.createElement(
                "div",
                { className: "rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive" },
                creatingError
              )
            : null,
          React.createElement(
            "div",
            { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
            React.createElement(
              "div",
              { className: "space-y-1" },
              React.createElement("label", { className: "text-xs font-medium text-muted-foreground" }, "Nome do produto *"),
              React.createElement("input", {
                type: "text",
                value: newNome,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNewNome(e.target.value),
                placeholder: "Ex: Mensalidade, Consultoria",
                className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                required: true,
              })
            ),
            React.createElement(
              "div",
              { className: "space-y-1" },
              React.createElement("label", { className: "text-xs font-medium text-muted-foreground" }, "Valor padrão (R$) - Opcional"),
              React.createElement("input", {
                type: "number",
                step: "0.01",
                min: "0",
                value: newValorPadrao,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNewValorPadrao(e.target.value),
                placeholder: "0,00",
                className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              })
            )
          ),
          React.createElement(
            "div",
            { className: "flex justify-end gap-2 pt-1" },
            React.createElement(
              "button",
              {
                type: "button",
                onClick: () => {
                  setIsCreating(false);
                  setCreatingError(null);
                },
                className: "rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors",
              },
              "Cancelar"
            ),
            React.createElement(
              "button",
              {
                type: "submit",
                disabled: isSavingNew || !newNome.trim(),
                className: "rounded-md bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors",
              },
              isSavingNew ? "Salvando..." : "Salvar"
            )
          )
        )
      : null,

    // Campo de Busca
    React.createElement(SearchInput, {
      placeholder: "Buscar produto por nome...",
      onChange: (val: string) => setSearchTerm(val),
    }),

    // Estado de carregamento ou lista de produtos
    loading
      ? React.createElement(
          "div",
          { className: "flex items-center justify-center p-8" },
          React.createElement("p", { className: "text-sm text-muted-foreground" }, "Carregando produtos...")
        )
      : React.createElement(
          "div",
          { className: "space-y-3" },

          // Empty state se não houver produtos cadastrados ou filtrados
          filteredProducts.length === 0
            ? React.createElement(EmptyState, {
                title: searchTerm ? "Nenhum produto encontrado" : "Nenhum produto cadastrado",
                description: searchTerm
                  ? `Nenhum produto corresponde a "${searchTerm}".`
                  : "Clique em '+ Novo' para cadastrar seu primeiro produto ou serviço.",
              })
            : filteredProducts.map((product) => {
                const isExpanded = expandedProductId === product.id;
                const isMostUsed = product.id === mostUsedId;
                const valorTexto =
                  product.valorPadrao !== null && product.valorPadrao !== undefined
                    ? formatarMoeda(product.valorPadrao)
                    : "Sem valor";
                const vezesTexto =
                  product.vezesUsado === 1 ? "Usado 1 vez" : `Usado ${product.vezesUsado} vezes`;

                return React.createElement(
                  "div",
                  {
                    key: product.id,
                    className: "rounded-lg border bg-card text-card-foreground shadow-sm transition-colors overflow-hidden",
                  },

                  // Resumo do card (clicável para expandir)
                  React.createElement(
                    "div",
                    {
                      onClick: () => handleToggleExpand(product),
                      className: "flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors",
                    },
                    React.createElement(
                      "div",
                      { className: "flex items-center gap-2.5 min-w-0" },
                      React.createElement("span", { className: "font-medium text-foreground text-sm truncate" }, product.nome),
                      isMostUsed
                        ? React.createElement(
                            "span",
                            { className: "text-amber-500 text-sm", title: "Produto mais usado", "aria-label": "Mais usado" },
                            "⭐"
                          )
                        : null
                    ),
                    React.createElement(
                      "div",
                      { className: "flex items-center gap-4 shrink-0 text-right" },
                      React.createElement(
                        "div",
                        { className: "flex flex-col items-end" },
                        React.createElement("span", { className: "text-sm font-medium text-foreground" }, valorTexto),
                        React.createElement("span", { className: "text-xs text-muted-foreground" }, vezesTexto)
                      ),
                      React.createElement("span", { className: "text-muted-foreground text-xs" }, isExpanded ? "▲" : "▼")
                    )
                  ),

                  // Edição inline quando expandido
                  isExpanded
                    ? React.createElement(
                        "div",
                        { className: "border-t bg-muted/20 p-4 space-y-4" },
                        deleteError && deleteError.productId === product.id
                          ? React.createElement(
                              "div",
                              { className: "rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive" },
                              deleteError.message
                            )
                          : null,
                        editingError
                          ? React.createElement(
                              "div",
                              { className: "rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive" },
                              editingError
                            )
                          : null,
                        React.createElement(
                          "form",
                          {
                            onSubmit: (e: React.FormEvent) => handleSaveEdit(product.id, e),
                            className: "space-y-3",
                          },
                          React.createElement(
                            "div",
                            { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
                            React.createElement(
                              "div",
                              { className: "space-y-1" },
                              React.createElement("label", { className: "text-xs font-medium text-muted-foreground" }, "Nome"),
                              React.createElement("input", {
                                type: "text",
                                value: editNome,
                                onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEditNome(e.target.value),
                                className: "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                required: true,
                              })
                            ),
                            React.createElement(
                              "div",
                              { className: "space-y-1" },
                              React.createElement("label", { className: "text-xs font-medium text-muted-foreground" }, "Valor padrão (R$)"),
                              React.createElement("input", {
                                type: "number",
                                step: "0.01",
                                min: "0",
                                value: editValorPadrao,
                                onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEditValorPadrao(e.target.value),
                                placeholder: "Sem valor",
                                className: "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              })
                            )
                          ),
                          React.createElement(
                            "div",
                            { className: "flex items-center justify-between pt-2" },
                            React.createElement(
                              "button",
                              {
                                type: "button",
                                onClick: () => handleDeleteProduct(product.id),
                                disabled: deletingProductId === product.id,
                                className: "rounded-md border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/15 px-3 py-1.5 text-xs font-medium disabled:opacity-50 transition-colors",
                              },
                              deletingProductId === product.id ? "Verificando..." : "Excluir"
                            ),
                            React.createElement(
                              "div",
                              { className: "flex gap-2" },
                              React.createElement(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => {
                                    setExpandedProductId(null);
                                    setEditingError(null);
                                    setDeleteError(null);
                                  },
                                  className: "rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors",
                                },
                                "Cancelar"
                              ),
                              React.createElement(
                                "button",
                                {
                                  type: "submit",
                                  disabled: isSavingEdit || !editNome.trim(),
                                  className: "rounded-md bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors",
                                },
                                isSavingEdit ? "Salvando..." : "Salvar"
                              )
                            )
                          )
                        )
                      )
                    : null
                );
              }),

          // Item 'Venda avulsa' fixo no fim (agrupamento visual, não editável)
          React.createElement(
            "div",
            {
              key: "venda-avulsa",
              className: "rounded-lg border border-dashed bg-card/60 text-card-foreground p-4 flex items-center justify-between shadow-sm",
            },
            React.createElement(
              "div",
              { className: "flex items-center gap-2 min-w-0" },
              React.createElement(
                "div",
                { className: "space-y-0.5" },
                React.createElement(
                  "div",
                  { className: "flex items-center gap-2" },
                  React.createElement("span", { className: "font-medium text-foreground text-sm" }, "Venda avulsa"),
                  React.createElement("span", { className: "text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-normal" }, "Agrupamento")
                ),
                React.createElement("p", { className: "text-xs text-muted-foreground" }, "Cobranças lançadas sem produto cadastrado")
              )
            ),
            React.createElement(
              "div",
              { className: "text-right shrink-0" },
              React.createElement("span", { className: "text-sm font-medium text-foreground block" }, "Sem valor fixo"),
              React.createElement(
                "span",
                { className: "text-xs text-muted-foreground" },
                vendaAvulsaCount !== null
                  ? vendaAvulsaCount === 1
                    ? "1 cobrança"
                    : `${vendaAvulsaCount} cobranças`
                  : "Carregando..."
              )
            )
          )
        )
  );
}
