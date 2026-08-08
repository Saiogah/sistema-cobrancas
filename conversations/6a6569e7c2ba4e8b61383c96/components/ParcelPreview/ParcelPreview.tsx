// components/ParcelPreview/ParcelPreview.tsx — Prévia do cronograma de parcelas (PRD v2.0 seção 7.1)

import React, { useMemo } from "react";
import type { DiaVencimento } from "../../types/common.types";
import { gerarParcelas } from "../../domain/parcel.rules";
import { formatarMoeda } from "../../lib/format.utils";
import { formatarDataBR } from "../../lib/date.utils";

export interface ParcelPreviewProps {
  valor: number;
  quantidadeParcelas: number;
  primeiroVencimento: string;
  diaVencimentoFixo: number;
}

/**
 * Componente que exibe a simulação em tempo real das parcelas geradas,
 * datas de vencimento com ajuste de fim de mês e valor total acumulado.
 */
function ParcelPreviewBase({
  valor,
  quantidadeParcelas,
  primeiroVencimento,
  diaVencimentoFixo,
}: ParcelPreviewProps) {
  const parcelas = useMemo(() => {
    if (
      !valor ||
      valor <= 0 ||
      !quantidadeParcelas ||
      quantidadeParcelas <= 0 ||
      !primeiroVencimento ||
      !diaVencimentoFixo
    ) {
      return [];
    }

    try {
      return gerarParcelas({
        clienteId: "temp",
        nomeProdutoServico: "Simulação",
        valor,
        formaPagamento: "pix",
        quantidadeParcelas,
        primeiroVencimento,
        diaVencimentoFixo: diaVencimentoFixo as DiaVencimento,
      });
    } catch {
      return [];
    }
  }, [valor, quantidadeParcelas, primeiroVencimento, diaVencimentoFixo]);

  if (parcelas.length === 0) {
    return React.createElement(
      "div",
      { className: "p-4 rounded-md border border-dashed border-border text-center text-xs text-muted-foreground" },
      "Preencha o valor, parcelas e vencimentos para visualizar a prévia."
    );
  }

  const valorTotalCalculado = parcelas.reduce((acc, p) => acc + p.valor, 0);

  return React.createElement(
    "div",
    { className: "rounded-lg border border-border bg-card p-4 space-y-3" },
    React.createElement("h4", { className: "text-xs font-semibold text-foreground" }, "Prévia das Parcelas"),

    // Parcel List
    React.createElement(
      "div",
      { className: "max-h-48 overflow-y-auto space-y-1.5 pr-1" },
      parcelas.map((p) =>
        React.createElement(
          "div",
          {
            key: p.numeroParcela,
            className:
              "flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/30 border border-border/50",
          },
          React.createElement(
            "span",
            { className: "font-medium text-foreground" },
            `${p.numeroParcela}. ${formatarMoeda(p.valor)} · ${formatarDataBR(p.dataVencimento)}`
          ),
          React.createElement(
            "span",
            { className: "text-muted-foreground font-mono" },
            `#${p.numeroParcela}`
          )
        )
      )
    ),

    // Total Sum at bottom
    React.createElement(
      "div",
      { className: "pt-2 border-t border-border flex items-center justify-between text-xs font-bold text-foreground" },
      React.createElement("span", null, "Total:"),
      React.createElement("span", null, formatarMoeda(valorTotalCalculado))
    )
  );
}

export const ParcelPreview = React.memo(ParcelPreviewBase);
