// components/ClientAutocomplete/ClientAutocomplete.tsx — Autocomplete de clientes (PRD v2.0 seção 8.2)

import React, { useState, useEffect, useRef } from "react";
import type { Cliente } from "../../types/client.types";
import { DEBOUNCE_SEARCH, CLIENTES_RECENTES_LIMIT } from "../../config/app.config";
import { formatarTelefone } from "../../lib/format.utils";
import { normalizarTelefone, validarTelefone } from "../../lib/validation.utils";

export interface ClientAutocompleteProps {
  onSelect: (cliente: Cliente) => void;
  clientes: Cliente[];
  onCreateNew?: (nome: string, telefone: string) => Promise<Cliente>;
}

/**
 * Componente de seleção de cliente com busca por nome/telefone,
 * exibe os mais recentes e permite cadastrar novo cliente via mini-form inline.
 */
function ClientAutocompleteBase({ onSelect, clientes, onCreateNew }: ClientAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [newTelefone, setNewTelefone] = useState("");
  const [isSubmitting, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce query
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

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter clients
  const cleanDebounced = debouncedQuery.trim().toLowerCase();
  const isSearchEmpty = cleanDebounced === "";

  const filteredClientes = isSearchEmpty
    ? clientes.slice(0, CLIENTES_RECENTES_LIMIT)
    : clientes.filter(
        (c) =>
          c.nome.toLowerCase().includes(cleanDebounced) ||
          c.telefone.includes(cleanDebounced)
      );

  const handleSelectClient = (cliente: Cliente) => {
    setQuery(cliente.nome);
    setDebouncedQuery(cliente.nome);
    setIsOpen(false);
    onSelect(cliente);
  };

  const handleOpenNewForm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowNewForm(true);
    setNewNome(query);
    setFormError(null);
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!newNome.trim()) {
      setFormError("Informe o nome do cliente.");
      return;
    }

    const telNormalizado = normalizarTelefone(newTelefone);
    if (!validarTelefone(telNormalizado)) {
      setFormError("Telefone inválido (deve ter DDD + número).");
      return;
    }

    if (!onCreateNew) return;

    try {
      setIsCreating(true);
      setFormError(null);
      const newClient = await onCreateNew(newNome.trim(), telNormalizado);
      setShowNewForm(false);
      setIsOpen(false);
      setQuery(newClient.nome);
      onSelect(newClient);
    } catch (err: any) {
      setFormError(err?.message || "Erro ao cadastrar cliente.");
    } finally {
      setIsCreating(false);
    }
  };

  return React.createElement(
    "div",
    { ref: containerRef, className: "relative w-full" },
    // Search input
    React.createElement("input", {
      type: "text",
      value: query,
      placeholder: "Buscar ou selecionar cliente...",
      onChange: handleQueryChange,
      onFocus: () => setIsOpen(true),
      className:
        "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    }),

    // Dropdown list
    isOpen
      ? React.createElement(
          "div",
          {
            className:
              "absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
          },
          // Section header when query is empty
          isSearchEmpty
            ? React.createElement(
                "div",
                { className: "px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase" },
                "RECENTES"
              )
            : null,

          // Client options list
          filteredClientes.length > 0
            ? filteredClientes.map((cliente) =>
                React.createElement(
                  "div",
                  {
                    key: cliente.id,
                    onClick: () => handleSelectClient(cliente),
                    className:
                      "flex items-center justify-between px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors",
                  },
                  React.createElement("span", { className: "font-medium" }, cliente.nome),
                  React.createElement(
                    "span",
                    { className: "text-xs text-muted-foreground" },
                    formatarTelefone(cliente.telefone)
                  )
                )
              )
            : !showNewForm
            ? React.createElement(
                "div",
                { className: "px-3 py-2 text-xs text-muted-foreground text-center" },
                "Nenhum cliente encontrado."
              )
            : null,

          // Divider / New Form Section
          onCreateNew
            ? React.createElement(
                "div",
                { className: "mt-1 pt-1 border-t border-border" },
                !showNewForm
                  ? React.createElement(
                      "button",
                      {
                        type: "button",
                        onClick: handleOpenNewForm,
                        className:
                          "w-full text-left px-3 py-2 text-xs font-semibold text-primary hover:bg-accent rounded-sm transition-colors flex items-center gap-1",
                      },
                      "+ Cadastrar novo cliente"
                    )
                  : React.createElement(
                      "form",
                      {
                        onSubmit: handleCreateNew,
                        className: "p-2 bg-muted/50 rounded-sm space-y-2 text-xs",
                      },
                      React.createElement("p", { className: "font-semibold text-foreground" }, "Novo Cliente"),
                      formError
                        ? React.createElement("p", { className: "text-destructive text-[11px]" }, formError)
                        : null,
                      React.createElement("input", {
                        type: "text",
                        value: newNome,
                        placeholder: "Nome do cliente",
                        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNewNome(e.target.value),
                        className:
                          "w-full rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      }),
                      React.createElement("input", {
                        type: "text",
                        value: newTelefone,
                        placeholder: "Telefone com DDD",
                        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNewTelefone(e.target.value),
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
              )
            : null
        )
      : null
  );
}

export const ClientAutocomplete = React.memo(ClientAutocompleteBase);
