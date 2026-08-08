// components/ClientAutocomplete/ClientAutocomplete.tsx — Autocomplete de clientes (M8a)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { DEBOUNCE_SEARCH, CLIENTES_RECENTES_LIMIT } from "../../config/app.config";
import { formatarTelefone } from "../../lib/format.utils";
import type { Cliente } from "../../types/client.types";

export interface ClientAutocompleteProps {
  onSelect: (cliente: Cliente) => void;
  clientes: Cliente[];
  onCreateNew?: (nome: string, telefone: string) => Promise<Cliente>;
}

function ClientAutocompleteBase(props: ClientAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [mostraLista, setMostraLista] = useState(false);
  const [novoForm, setNovoForm] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_SEARCH);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const filtrados = debouncedQuery
    ? props.clientes.filter(c => c.nome.toLowerCase().includes(debouncedQuery.toLowerCase()))
    : [];
  const recentes = [...props.clientes].slice(0, CLIENTES_RECENTES_LIMIT);

  const handleSelecionar = useCallback((c: Cliente) => {
    props.onSelect(c);
    setQuery(""); setDebouncedQuery(""); setMostraLista(false); setNovoForm(false);
  }, [props]);

  const handleCriar = useCallback(async () => {
    if (!novoNome.trim() || !novoTelefone.trim() || !props.onCreateNew) return;
    const c = await props.onCreateNew(novoNome, novoTelefone);
    handleSelecionar(c);
    setNovoNome(""); setNovoTelefone("");
  }, [novoNome, novoTelefone, props, handleSelecionar]);

  return React.createElement("div", { className: "relative w-full" },
    React.createElement("input", {
      type: "text", value: query,
      onChange: (e: any) => { setQuery(e.target.value); setMostraLista(true); setNovoForm(false); },
      onFocus: () => setMostraLista(true),
      placeholder: "Buscar cliente...",
      className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
    }),
    mostraLista ? React.createElement("div", { className: "absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-80 overflow-auto" },
      !debouncedQuery && recentes.length > 0
        ? React.createElement("div", { className: "p-2" },
            React.createElement("span", { className: "text-xs font-medium text-muted-foreground px-1" }, "RECENTES"),
            ...recentes.map(c => React.createElement("button", {
              key: c.id, onClick: () => handleSelecionar(c),
              className: "flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent",
            }, React.createElement("span", null, c.nome), React.createElement("span", { className: "text-xs text-muted-foreground" }, formatarTelefone(c.telefone)))),
          )
        : null,
      debouncedQuery && filtrados.length > 0
        ? React.createElement("div", { className: "p-2" },
            ...filtrados.map(c => React.createElement("button", {
              key: c.id, onClick: () => handleSelecionar(c),
              className: "flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent",
            }, React.createElement("span", null, c.nome), React.createElement("span", { className: "text-xs text-muted-foreground" }, formatarTelefone(c.telefone)))),
          )
        : null,
      !novoForm ? React.createElement("button", {
        onClick: () => setNovoForm(true),
        className: "flex w-full items-center rounded px-2 py-1.5 text-sm font-medium text-primary border-t",
      }, "+ Cadastrar novo cliente") : null,
      novoForm ? React.createElement("div", { className: "p-2 space-y-2 border-t" },
        React.createElement("input", { type: "text", value: novoNome, onChange: (e: any) => setNovoNome(e.target.value), placeholder: "Nome", className: "w-full rounded-md border px-2 py-1.5 text-sm" }),
        React.createElement("input", { type: "text", value: novoTelefone, onChange: (e: any) => setNovoTelefone(e.target.value), placeholder: "Telefone", className: "w-full rounded-md border px-2 py-1.5 text-sm" }),
        React.createElement("div", { className: "flex gap-2" },
          React.createElement("button", { onClick: handleCriar, className: "rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm" }, "Salvar"),
          React.createElement("button", { onClick: () => setNovoForm(false), className: "rounded-md border px-3 py-1 text-sm" }, "Cancelar"),
        ),
      ) : null,
    ) : null,
  );
}
export const ClientAutocomplete = React.memo(ClientAutocompleteBase);
