// components/ProductAutocomplete/ProductAutocomplete.tsx — Autocomplete de produtos (M8a)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { DEBOUNCE_SEARCH, PRODUTOS_SUGERIDOS_LIMIT } from "../../config/app.config";
import { formatarMoeda } from "../../lib/format.utils";
import { validarNomeProduto } from "../../lib/validation.utils";
import type { ProdutoServico } from "../../types/product.types";

export interface ProductAutocompleteProps {
  onSelect: (produto: ProdutoServico | { nome: string; produtoServicoId: null }) => void;
  produtos: ProdutoServico[];
  allowVendaAvulsa?: boolean;
  onCreateNew?: (nome: string, valor: number) => Promise<ProdutoServico>;
}

function ProductAutocompleteBase(props: ProductAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [mostraLista, setMostraLista] = useState(false);
  const [novoForm, setNovoForm] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [vendaAvulsa, setVendaAvulsa] = useState(false);
  const [avulsaNome, setAvulsaNome] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_SEARCH);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const ordenados = [...props.produtos].sort((a, b) => b.vezesUsado - a.vezesUsado);
  const filtrados = debouncedQuery
    ? ordenados.filter(p => p.nome.toLowerCase().includes(debouncedQuery.toLowerCase()))
    : [];
  const maisVendidos = ordenados.slice(0, PRODUTOS_SUGERIDOS_LIMIT);

  const handleSelecionar = useCallback((p: ProdutoServico) => {
    props.onSelect(p);
    setQuery(""); setDebouncedQuery(""); setMostraLista(false); setNovoForm(false); setVendaAvulsa(false);
  }, [props]);

  const handleCriar = useCallback(async () => {
    if (!novoNome.trim() || !props.onCreateNew) return;
    const v = parseFloat(novoValor.replace(",", ".")) || 0;
    const p = await props.onCreateNew(novoNome, v);
    handleSelecionar(p);
    setNovoNome(""); setNovoValor("");
  }, [novoNome, novoValor, props, handleSelecionar]);

  const handleAvulsa = useCallback(() => {
    if (!validarNomeProduto(avulsaNome)) return;
    props.onSelect({ nome: avulsaNome, produtoServicoId: null });
    setAvulsaNome(""); setVendaAvulsa(false); setMostraLista(false);
  }, [avulsaNome, props]);

  return React.createElement("div", { className: "relative w-full" },
    React.createElement("input", {
      type: "text", value: query,
      onChange: (e: any) => { setQuery(e.target.value); setMostraLista(true); setNovoForm(false); setVendaAvulsa(false); },
      onFocus: () => setMostraLista(true),
      placeholder: "Buscar produto...",
      className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
    }),
    mostraLista ? React.createElement("div", { className: "absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-80 overflow-auto" },
      !debouncedQuery && maisVendidos.length > 0
        ? React.createElement("div", { className: "p-2" },
            React.createElement("span", { className: "text-xs font-medium text-muted-foreground px-1" }, "MAIS VENDIDOS"),
            ...maisVendidos.map(p => React.createElement("button", {
              key: p.id, onClick: () => handleSelecionar(p),
              className: "flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent",
            }, React.createElement("span", null, p.nome), React.createElement("span", { className: "text-xs text-muted-foreground" }, p.valorPadrao ? formatarMoeda(p.valorPadrao) : "Sem valor"))),
          )
        : null,
      debouncedQuery && filtrados.length > 0
        ? React.createElement("div", { className: "p-2" },
            ...filtrados.map(p => React.createElement("button", {
              key: p.id, onClick: () => handleSelecionar(p),
              className: "flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent",
            }, React.createElement("span", null, p.nome), React.createElement("span", { className: "text-xs text-muted-foreground" }, p.valorPadrao ? formatarMoeda(p.valorPadrao) : "Sem valor"))),
          )
        : null,
      !novoForm && !vendaAvulsa ? React.createElement("div", { className: "border-t" },
        React.createElement("button", { onClick: () => setNovoForm(true), className: "flex w-full items-center rounded px-2 py-1.5 text-sm font-medium text-primary" }, "+ Cadastrar novo produto"),
        props.allowVendaAvulsa ? React.createElement("button", { onClick: () => setVendaAvulsa(true), className: "flex w-full items-center rounded px-2 py-1.5 text-sm font-medium text-primary" }, "Venda avulsa") : null,
      ) : null,
      novoForm ? React.createElement("div", { className: "p-2 space-y-2 border-t" },
        React.createElement("input", { type: "text", value: novoNome, onChange: (e: any) => setNovoNome(e.target.value), placeholder: "Nome do produto", className: "w-full rounded-md border px-2 py-1.5 text-sm" }),
        React.createElement("input", { type: "text", value: novoValor, onChange: (e: any) => setNovoValor(e.target.value), placeholder: "Valor padrão (opcional)", className: "w-full rounded-md border px-2 py-1.5 text-sm" }),
        React.createElement("div", { className: "flex gap-2" },
          React.createElement("button", { onClick: handleCriar, className: "rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm" }, "Salvar"),
          React.createElement("button", { onClick: () => setNovoForm(false), className: "rounded-md border px-3 py-1 text-sm" }, "Cancelar"),
        ),
      ) : null,
      vendaAvulsa ? React.createElement("div", { className: "p-2 space-y-2 border-t" },
        React.createElement("input", {
          type: "text", value: avulsaNome,
          onChange: (e: any) => setAvulsaNome(e.target.value),
          placeholder: "O que foi vendido? (mín. 3 caracteres)",
          className: "w-full rounded-md border px-2 py-1.5 text-sm",
        }),
        React.createElement("div", { className: "flex gap-2" },
          React.createElement("button", { onClick: handleAvulsa, disabled: !validarNomeProduto(avulsaNome), className: "rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm disabled:opacity-50" }, "Confirmar"),
          React.createElement("button", { onClick: () => setVendaAvulsa(false), className: "rounded-md border px-3 py-1 text-sm" }, "Cancelar"),
        ),
      ) : null,
    ) : null,
  );
}
export const ProductAutocomplete = React.memo(ProductAutocompleteBase);
