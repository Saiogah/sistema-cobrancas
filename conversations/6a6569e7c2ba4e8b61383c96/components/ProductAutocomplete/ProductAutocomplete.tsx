// components/ProductAutocomplete/ProductAutocomplete.tsx — Autocomplete de produtos (PRD v2.0 seção 8.2)

import React, { useState, useEffect, useRef } from "react";
import type { ProdutoServico } from "../../types/product.types";
import { DEBOUNCE_SEARCH } from "../../config/app.config";
import { formatarMoeda } from "../../lib/format.utils";
import { validarNomeProduto } from "../../lib/validation.utils";

export interface ProductAutocompleteProps {
  onSelect: (produto: ProdutoServico | { nome: string; produtoServicoId: null }) => void;
  produtos: ProdutoServico[];
  allowVendaAvulsa?: boolean;
  onCreateNew?: (nome: string, valor: number) => Promise<ProdutoServico>;
}

/**
 * Autocomplete para seleção de produtos/serviços com ranking de mais vendidos,
 * suporte a cadastro de novos produtos e modalidade de venda avulsa.
 */
function ProductAutocompleteBase({
  onSelect,
  produtos,
  allowVendaAvulsa = true,
  onCreateNew,
}: ProductAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // States para formulários inline
  const [showNewForm, setShowNewForm] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [newValor, setNewValor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newFormError, setNewFormError] = useState<string | null>(null);

  const [showAvulsaForm, setShowAvulsaForm] = useState(false);
  const [avulsaNome, setAvulsaNome] = useState("");
  const [avulsaError, setAvulsaError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(val);
    }, DEBOUNCE_SEARCH);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ordenar produtos por vezesUsado desc
  const sortedProdutos = [...produtos].sort((a, b) => (b.vezesUsado || 0) - (a.vezesUsado || 0));

  const cleanDebounced = debouncedQuery.trim().toLowerCase();
  const isSearchEmpty = cleanDebounced === "";

  // Se busca vazia: exibir Top 3 'MAIS VENDIDOS'
  // Se busca preenchida: filtrar por nome ordenado por vezesUsado
  const filteredProdutos = isSearchEmpty
    ? sortedProdutos.slice(0, 3)
    : sortedProdutos.filter((p) => p.nome.toLowerCase().includes(cleanDebounced));

  const handleSelectProduct = (produto: ProdutoServico) => {
    setQuery(produto.nome);
    setDebouncedQuery(produto.nome);
    setIsOpen(false);
    onSelect(produto);
  };

  const handleOpenNewForm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowNewForm(true);
    setShowAvulsaForm(false);
    setNewNome(query);
    setNewFormError(null);
  };

  const handleOpenAvulsaForm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAvulsaForm(true);
    setShowNewForm(false);
    setAvulsaNome(query);
    setAvulsaError(null);
  };

  const handleCreateNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!validarNomeProduto(newNome)) {
      setNewFormError("Nome do produto deve ter pelo menos 3 caracteres.");
      return;
    }

    const valorNum = parseFloat(newValor.replace(",", "."));
    if (isNaN(valorNum) || valorNum <= 0) {
      setNewFormError("Informe um valor maior que zero.");
      return;
    }

    if (!onCreateNew) return;

    try {
      setIsSubmitting(true);
      setNewFormError(null);
      const created = await onCreateNew(newNome.trim(), valorNum);
      setShowNewForm(false);
      setIsOpen(false);
      setQuery(created.nome);
      onSelect(created);
    } catch (err: any) {
      setNewFormError(err?.message || "Erro ao cadastrar produto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmVendaAvulsa = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!validarNomeProduto(avulsaNome)) {
      setAvulsaError("Nome do produto/serviço deve ter pelo menos 3 caracteres.");
      return;
    }

    setShowAvulsaForm(false);
    setIsOpen(false);
    setQuery(avulsaNome.trim());
    onSelect({ nome: avulsaNome.trim(), produtoServicoId: null });
  };

  return React.createElement(
    "div",
    { ref: containerRef, className: "relative w-full" },
    // Input principal
    React.createElement("input", {
      type: "text",
      value: query,
      placeholder: "Buscar produto ou serviço...",
      onChange: handleQueryChange,
      onFocus: () => setIsOpen(true),
      className:
        "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    }),

    // Dropdown
    isOpen
      ? React.createElement(
          "div",
          {
            className:
              "absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
          },
          // Header 'MAIS VENDIDOS' se query vazia
          isSearchEmpty
            ? React.createElement(
                "div",
                { className: "px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase" },
                "MAIS VENDIDOS"
              )
            : null,

          // Lista de produtos
          filteredProdutos.length > 0
            ? filteredProdutos.map((produto) =>
                React.createElement(
                  "div",
                  {
                    key: produto.id,
                    onClick: () => handleSelectProduct(produto),
                    className:
                      "flex items-center justify-between px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors",
                  },
                  React.createElement("span", { className: "font-medium" }, produto.nome),
                  produto.valorPadrao !== null && produto.valorPadrao !== undefined
                    ? React.createElement(
                        "span",
                        { className: "text-xs font-semibold text-muted-foreground" },
                        formatarMoeda(produto.valorPadrao)
                      )
                    : null
                )
              )
            : !showNewForm && !showAvulsaForm
            ? React.createElement(
                "div",
                { className: "px-3 py-2 text-xs text-muted-foreground text-center" },
                "Nenhum produto encontrado."
              )
            : null,

          // Form ou botões no rodapé do dropdown
          React.createElement(
            "div",
            { className: "mt-1 pt-1 border-t border-border flex flex-col gap-1" },
            // Botão/Form Novo Produto
            onCreateNew && !showNewForm && !showAvulsaForm
              ? React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: handleOpenNewForm,
                    className:
                      "w-full text-left px-3 py-1.5 text-xs font-semibold text-primary hover:bg-accent rounded-sm transition-colors",
                  },
                  "+ Cadastrar novo produto"
                )
              : null,

            // Form Novo Produto Inline
            showNewForm
              ? React.createElement(
                  "form",
                  {
                    onSubmit: handleCreateNewProduct,
                    className: "p-2 bg-muted/50 rounded-sm space-y-2 text-xs",
                  },
                  React.createElement("p", { className: "font-semibold text-foreground" }, "Novo Produto/Serviço"),
                  newFormError
                    ? React.createElement("p", { className: "text-destructive text-[11px]" }, newFormError)
                    : null,
                  React.createElement("input", {
                    type: "text",
                    value: newNome,
                    placeholder: "Nome do produto/serviço",
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNewNome(e.target.value),
                    className:
                      "w-full rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  }),
                  React.createElement("input", {
                    type: "text",
                    value: newValor,
                    placeholder: "Valor padrão (R$)",
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNewValor(e.target.value),
                    className:
                      "w-full rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  }),
                  React.createElement(
                    "div",
                    { className: "flex items-center justify-end gap-2 pt-1" },
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        onClick: () => setShowNewForm(false),
                        className: "px-2 py-1 text-muted-foreground hover:text-foreground",
                      },
                      "Cancelar"
                    ),
                    React.createElement(
                      "button",
                      {
                        type: "submit",
                        disabled: isSubmitting,
                        className:
                          "rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50",
                      },
                      isSubmitting ? "Salvando..." : "Salvar"
                    )
                  )
                )
              : null,

            // Botão Venda Avulsa
            allowVendaAvulsa && !showAvulsaForm && !showNewForm
              ? React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: handleOpenAvulsaForm,
                    className:
                      "w-full text-left px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent rounded-sm transition-colors",
                  },
                  "⚡ Venda avulsa"
                )
              : null,

            // Form Venda Avulsa
            showAvulsaForm
              ? React.createElement(
                  "form",
                  {
                    onSubmit: handleConfirmVendaAvulsa,
                    className: "p-2 bg-muted/50 rounded-sm space-y-2 text-xs",
                  },
                  React.createElement("p", { className: "font-semibold text-foreground" }, "Venda Avulsa"),
                  avulsaError
                    ? React.createElement("p", { className: "text-destructive text-[11px]" }, avulsaError)
                    : null,
                  React.createElement("input", {
                    type: "text",
                    value: avulsaNome,
                    placeholder: "O que foi vendido?",
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setAvulsaNome(e.target.value),
                    className:
                      "w-full rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  }),
                  React.createElement(
                    "div",
                    { className: "flex items-center justify-end gap-2 pt-1" },
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        onClick: () => setShowAvulsaForm(false),
                        className: "px-2 py-1 text-muted-foreground hover:text-foreground",
                      },
                      "Cancelar"
                    ),
                    React.createElement(
                      "button",
                      {
                        type: "submit",
                        className:
                          "rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors",
                      },
                      "Confirmar"
                    )
                  )
                )
              : null
          )
        )
      : null
  );
}

export const ProductAutocomplete = React.memo(ProductAutocompleteBase);
