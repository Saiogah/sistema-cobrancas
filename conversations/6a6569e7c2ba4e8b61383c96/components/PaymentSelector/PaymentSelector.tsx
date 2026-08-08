// components/PaymentSelector/PaymentSelector.tsx — Seletor de forma de pagamento e parcelas (PRD v2.0 seção 7.1 e 7.8)

import React from "react";
import type { FormaPagamento } from "../../types/common.types";
import { MAX_PARCELAS, PIX_SUGESTOES_LIMIT } from "../../config/app.config";

export interface PaymentSelectorProps {
  value: FormaPagamento | null;
  onChange: (forma: FormaPagamento) => void;
  pixUtilizado?: string;
  onPixUtilizadoChange?: (value: string) => void;
  pixSugestoes?: string[];
  quantidadeParcelas: number;
  onQuantidadeParcelasChange: (qtd: number) => void;
}

const FORMAS: Array<{ key: FormaPagamento; label: string; icon: string }> = [
  { key: "pix", label: "PIX", icon: "⚡" },
  { key: "cartao_credito", label: "Cartão de Crédito", icon: "💳" },
  { key: "cartao_debito", label: "Cartão de Débito", icon: "💳" },
  { key: "dinheiro", label: "Dinheiro", icon: "💵" },
  { key: "transferencia", label: "Transferência", icon: "🏦" },
];

/**
 * Seletor de forma de pagamento com suporte a PIX inteligente,
 * toggle entre À Vista e Parcelado, botões rápidos de parcelas (2-12x)
 * e input customizado para parcelamento estendido (até 60x).
 */
function PaymentSelectorBase({
  value,
  onChange,
  pixUtilizado = "",
  onPixUtilizadoChange,
  pixSugestoes = [],
  quantidadeParcelas,
  onQuantidadeParcelasChange,
}: PaymentSelectorProps) {
  const isParcelado = quantidadeParcelas > 1;

  const handleToggleParcelado = (parcelado: boolean) => {
    if (!parcelado) {
      onQuantidadeParcelasChange(1);
    } else {
      if (quantidadeParcelas <= 1) {
        onQuantidadeParcelasChange(2);
      }
    }
  };

  const handleCustomParcelasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      if (val >= 1 && val <= MAX_PARCELAS) {
        onQuantidadeParcelasChange(val);
      }
    }
  };

  return React.createElement(
    "div",
    { className: "space-y-4 w-full" },
    // 1. Botões de Formas de Pagamento
    React.createElement(
      "div",
      { className: "space-y-1.5" },
      React.createElement("label", { className: "text-xs font-semibold text-foreground" }, "Forma de Pagamento"),
      React.createElement(
        "div",
        { className: "grid grid-cols-2 sm:grid-cols-3 gap-2" },
        FORMAS.map((f) => {
          const isSelected = value === f.key;
          return React.createElement(
            "button",
            {
              key: f.key,
              type: "button",
              onClick: () => onChange(f.key),
              className: `flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                  : "border-input bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground"
              }`,
            },
            React.createElement("span", { className: "text-lg mb-1" }, f.icon),
            React.createElement("span", { className: "text-center line-clamp-1" }, f.label)
          );
        })
      )
    ),

    // 2. Campo PIX Utilizado (se PIX selecionado)
    value === "pix"
      ? React.createElement(
          "div",
          { className: "space-y-1.5 p-3 rounded-md bg-muted/40 border border-border" },
          React.createElement(
            "label",
            { className: "text-xs font-medium text-foreground block" },
            "PIX Utilizado (Chave, Banco ou Descrição)"
          ),
          React.createElement("input", {
            type: "text",
            value: pixUtilizado,
            placeholder: "Ex: CPF, Telefone, E-mail ou Nome da Conta",
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => onPixUtilizadoChange?.(e.target.value),
            className:
              "w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          }),

          // Sugestões de PIX
          pixSugestoes.length > 0
            ? React.createElement(
                "div",
                { className: "pt-1" },
                React.createElement(
                  "span",
                  { className: "text-[10px] text-muted-foreground block mb-1 font-medium" },
                  "Sugestões:"
                ),
                React.createElement(
                  "div",
                  { className: "flex flex-wrap gap-1.5" },
                  pixSugestoes.slice(0, PIX_SUGESTOES_LIMIT).map((sug, idx) =>
                    React.createElement(
                      "button",
                      {
                        key: idx,
                        type: "button",
                        onClick: () => onPixUtilizadoChange?.(sug),
                        className:
                          "rounded-full bg-background border border-border px-2.5 py-0.5 text-[11px] text-foreground hover:bg-accent transition-colors",
                      },
                      sug
                    )
                  )
                )
              )
            : null
        )
      : null,

    // 3. Toggle À Vista / Parcelado
    React.createElement(
      "div",
      { className: "space-y-2 pt-1 border-t border-border" },
      React.createElement("label", { className: "text-xs font-semibold text-foreground" }, "Parcelamento"),
      React.createElement(
        "div",
        { className: "grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg" },
        React.createElement(
          "button",
          {
            type: "button",
            onClick: () => handleToggleParcelado(false),
            className: `py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
              !isParcelado
                ? "bg-background text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`,
          },
          "À vista (1x)"
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: () => handleToggleParcelado(true),
            className: `py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
              isParcelado
                ? "bg-background text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`,
          },
          "Parcelado"
        )
      ),

      // 4. Seleção de Quantidade de Parcelas (se Parcelado)
      isParcelado
        ? React.createElement(
            "div",
            { className: "space-y-2 pt-2" },
            // Botões rápidos 2x a 12x
            React.createElement(
              "div",
              { className: "grid grid-cols-4 sm:grid-cols-6 gap-1.5" },
              Array.from({ length: 11 }, (_, i) => i + 2).map((qtd) => {
                const isSelected = quantidadeParcelas === qtd;
                return React.createElement(
                  "button",
                  {
                    key: qtd,
                    type: "button",
                    onClick: () => onQuantidadeParcelasChange(qtd),
                    className: `py-1.5 px-2 rounded-md border text-xs font-medium transition-all ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground font-bold"
                        : "border-input bg-card text-card-foreground hover:bg-accent"
                    }`,
                  },
                  `${qtd}x`
                );
              })
            ),

            // Custom input para 13 a 60 parcelas
            React.createElement(
              "div",
              { className: "flex items-center gap-2 pt-1" },
              React.createElement(
                "label",
                { className: "text-xs text-muted-foreground whitespace-nowrap" },
                "Outras (13-60):"
              ),
              React.createElement("input", {
                type: "number",
                min: 13,
                max: MAX_PARCELAS,
                value: quantidadeParcelas >= 13 ? quantidadeParcelas : "",
                placeholder: "Ex: 24",
                onChange: handleCustomParcelasChange,
                className:
                  "w-24 rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              })
            )
          )
        : null
    )
  );
}

export const PaymentSelector = React.memo(PaymentSelectorBase);
