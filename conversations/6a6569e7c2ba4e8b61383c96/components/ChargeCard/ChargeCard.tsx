// components/ChargeCard/ChargeCard.tsx — Card de parcela/cobrança (PRD v2.0 seção 10.4)

import React, { useState } from "react";
import type { Parcela } from "../../types/parcel.types";
import type { Cobranca } from "../../types/charge.types";
import type { Cliente } from "../../types/client.types";
import { StatusBadge } from "../StatusBadge/StatusBadge";
import { formatarMoeda, formatarTelefone } from "../../lib/format.utils";
import { diasAtraso } from "../../domain/overdue.rules";
import { hoje } from "../../lib/date.utils";

export interface ChargeCardProps {
  parcela: Parcela;
  cobranca?: Cobranca;
  cliente?: Cliente;
  onSelect?: (id: string) => void;
  onCharge?: (parcela: Parcela) => void;
  onConfirmSend?: (parcelaId: string) => void;
  onMarkPaid?: (parcelaId: string) => void;
  onMarkPartial?: (parcelaId: string, valor: number) => void;
  onArchive?: (parcelaId: string) => void;
  isSelected?: boolean;
}

/**
 * Card de exibição e interações rápidas com uma parcela.
 * Suporta expansão para mais detalhes, marcação de pagamento total/parcial,
 * cobrança via WhatsApp e confirmação de envio.
 */
function ChargeCardBase({
  parcela,
  cobranca,
  cliente,
  onSelect,
  onCharge,
  onConfirmSend,
  onMarkPaid,
  onMarkPartial,
  onArchive,
  isSelected = false,
}: ChargeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPayMenu, setShowPayMenu] = useState(false);
  const [showPartialInput, setShowPartialInput] = useState(false);
  const [partialValue, setPartialValue] = useState("");

  const dataHoje = hoje();
  const atrasoDias = diasAtraso(parcela, dataHoje);

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(parcela.id);
  };

  const handleCharge = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCharge?.(parcela);
  };

  const handleConfirmSend = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfirmSend?.(parcela.id);
  };

  const handleTogglePayMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPayMenu((prev) => !prev);
    setShowPartialInput(false);
  };

  const handleMarkPaidTotal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPayMenu(false);
    onMarkPaid?.(parcela.id);
  };

  const handleMarkPartialClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPayMenu(false);
    setShowPartialInput(true);
  };

  const handleConfirmPartial = (e: React.MouseEvent) => {
    e.stopPropagation();
    const val = parseFloat(partialValue.replace(",", "."));
    if (!isNaN(val) && val > 0) {
      onMarkPartial?.(parcela.id, val);
      setShowPartialInput(false);
      setPartialValue("");
    }
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchive?.(parcela.id);
  };

  // Valor formatado
  let valorFormatted = formatarMoeda(parcela.valor);
  if (parcela.status === "pago_parcial" && parcela.valorPago !== null) {
    valorFormatted = `${formatarMoeda(parcela.valorPago)} de ${formatarMoeda(parcela.valor)}`;
  }

  // Nome do cliente e produto
  const nomeCliente = cliente?.nome || "Cliente sem nome";
  const nomeProduto = cobranca?.nomeProdutoServico || "Cobrança";
  const numParcelasInfo = cobranca?.quantidadeParcelas
    ? `Parcela ${parcela.numeroParcela}/${cobranca.quantidadeParcelas}`
    : `Parcela ${parcela.numeroParcela}`;

  return React.createElement(
    "div",
    {
      className: `rounded-lg border bg-card text-card-foreground shadow-sm transition-all ${
        isSelected ? "border-primary ring-1 ring-primary" : "border-border"
      } p-4 mb-3`,
      onClick: handleToggleExpand,
    },
    // Main Row
    React.createElement(
      "div",
      { className: "flex items-center justify-between gap-3 cursor-pointer" },
      // Left: selection circle
      React.createElement(
        "button",
        {
          type: "button",
          onClick: handleSelect,
          className: `flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
            isSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/30 hover:border-primary"
          }`,
          "aria-label": isSelected ? "Desmarcar parcela" : "Selecionar parcela",
        },
        isSelected
          ? React.createElement(
              "svg",
              { width: 12, height: 12, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 3 },
              React.createElement("polyline", { points: "20 6 9 17 4 12" })
            )
          : null
      ),
      // Center: name + product + parcel info
      React.createElement(
        "div",
        { className: "flex-1 min-w-0" },
        React.createElement("p", { className: "font-semibold text-sm text-foreground truncate" }, nomeCliente),
        React.createElement(
          "p",
          { className: "text-xs text-muted-foreground truncate" },
          `${nomeProduto} · ${numParcelasInfo}`
        )
      ),
      // Right: value + status badge
      React.createElement(
        "div",
        { className: "flex flex-col items-end gap-1 shrink-0" },
        React.createElement("span", { className: "font-bold text-sm text-foreground" }, valorFormatted),
        React.createElement(StatusBadge, { status: parcela.status, diasAtraso: atrasoDias })
      )
    ),

    // Actions Row
    React.createElement(
      "div",
      {
        className: "mt-3 pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2",
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
      },
      // Left actions: Cobrar & Confirmar Envio
      React.createElement(
        "div",
        { className: "flex items-center gap-2" },
        // Botão Cobrar (💬)
        onCharge
          ? React.createElement(
              "button",
              {
                type: "button",
                onClick: handleCharge,
                className:
                  "inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs font-medium transition-colors",
              },
              "💬 Cobrar"
            )
          : null,
        // Botão Confirmar Envio (✓) aparece se status === 'cobrado'
        parcela.status === "cobrado" && onConfirmSend
          ? React.createElement(
              "button",
              {
                type: "button",
                onClick: handleConfirmSend,
                className:
                  "inline-flex items-center gap-1 rounded-md bg-yellow-500 hover:bg-yellow-600 text-white px-2.5 py-1 text-xs font-medium transition-colors",
              },
              "✓ Confirmar envio"
            )
          : null
      ),

      // Right actions: Marcar pago menu & expand icon
      React.createElement(
        "div",
        { className: "flex items-center gap-2 relative" },
        // Botão 'Marcar pago'
        onMarkPaid || onMarkPartial
          ? React.createElement(
              "button",
              {
                type: "button",
                onClick: handleTogglePayMenu,
                className:
                  "inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-2.5 py-1 text-xs font-medium transition-colors",
              },
              "Marcar pago"
            )
          : null,

        // Botão expandir/recolher
        React.createElement(
          "button",
          {
            type: "button",
            onClick: handleToggleExpand,
            className: "p-1 text-muted-foreground hover:text-foreground transition-colors",
            "aria-label": isExpanded ? "Recolher detalhes" : "Expandir detalhes",
          },
          React.createElement(
            "svg",
            {
              width: 16,
              height: 16,
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: 2,
              className: `transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`,
            },
            React.createElement("polyline", { points: "6 9 12 15 18 9" })
          )
        )
      )
    ),

    // Menu de opções 'Marcar pago'
    showPayMenu
      ? React.createElement(
          "div",
          {
            className:
              "mt-2 p-2 rounded-md bg-popover border border-border text-popover-foreground shadow-md flex flex-col gap-1 z-10",
            onClick: (e: React.MouseEvent) => e.stopPropagation(),
          },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: handleMarkPaidTotal,
              className: "w-full text-left px-3 py-1.5 text-xs rounded hover:bg-accent hover:text-accent-foreground font-medium",
            },
            "Pagamento total"
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: handleMarkPartialClick,
              className: "w-full text-left px-3 py-1.5 text-xs rounded hover:bg-accent hover:text-accent-foreground font-medium",
            },
            "Pagamento parcial"
          )
        )
      : null,

    // Inline input para pagamento parcial
    showPartialInput
      ? React.createElement(
          "div",
          {
            className: "mt-2 p-2 rounded-md bg-muted border border-border flex items-center gap-2",
            onClick: (e: React.MouseEvent) => e.stopPropagation(),
          },
          React.createElement(
            "span",
            { className: "text-xs font-medium text-muted-foreground" },
            "R$"
          ),
          React.createElement("input", {
            type: "text",
            value: partialValue,
            placeholder: "0,00",
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPartialValue(e.target.value),
            className: "w-24 rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          }),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: handleConfirmPartial,
              className: "rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors",
            },
            "Confirmar"
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                setShowPartialInput(false);
              },
              className: "p-1 text-xs text-muted-foreground hover:text-foreground",
            },
            "Cancelar"
          )
        )
      : null,

    // Expanded Details Section
    isExpanded
      ? React.createElement(
          "div",
          {
            className: "mt-3 pt-3 border-t border-border space-y-2 text-xs text-muted-foreground",
            onClick: (e: React.MouseEvent) => e.stopPropagation(),
          },
          // Telefone
          cliente?.telefone
            ? React.createElement(
                "p",
                { className: "flex items-center gap-1.5" },
                React.createElement(
                  "span",
                  { className: "font-semibold text-foreground" },
                  "Telefone:"
                ),
                formatarTelefone(cliente.telefone)
              )
            : null,
          // PIX
          cobranca?.pixUtilizado
            ? React.createElement(
                "p",
                { className: "flex items-center gap-1.5" },
                React.createElement(
                  "span",
                  { className: "font-semibold text-foreground" },
                  "PIX:"
                ),
                cobranca.pixUtilizado
              )
            : null,
          // Observações
          cobranca?.observacoes
            ? React.createElement(
                "p",
                { className: "flex items-start gap-1.5" },
                React.createElement(
                  "span",
                  { className: "font-semibold text-foreground shrink-0" },
                  "Obs:"
                ),
                cobranca.observacoes
              )
            : null,

          // Botão Arquivar
          onArchive
            ? React.createElement(
                "div",
                { className: "pt-2 flex justify-end" },
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: handleArchive,
                    className: "text-xs text-muted-foreground hover:text-destructive transition-colors underline",
                  },
                  "Arquivar parcela"
                )
              )
            : null
        )
      : null
  );
}

export const ChargeCard = React.memo(ChargeCardBase);
