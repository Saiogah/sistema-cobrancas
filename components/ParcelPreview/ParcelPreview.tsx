// components/ParcelPreview/ParcelPreview.tsx — Pré-visualização de parcelas (M8a)
import React, { useMemo } from "react";
import { gerarParcelas } from "../../domain/parcel.rules";
import { formatarMoeda } from "../../lib/format.utils";
import { formatarDataCurta } from "../../lib/date.utils";
import type { CobrancaInput } from "../../types/charge.types";

export interface ParcelPreviewProps {
  valor: number;
  quantidadeParcelas: number;
  primeiroVencimento: string;
  diaVencimentoFixo: number;
}

function ParcelPreviewBase(props: ParcelPreviewProps) {
  const parcelas = useMemo(() => {
    if (props.valor <= 0 || props.quantidadeParcelas < 1 || !props.primeiroVencimento) return [];
    const input: CobrancaInput = {
      clienteId: "preview",
      nomeProdutoServico: "Preview",
      valor: props.valor,
      formaPagamento: "pix",
      quantidadeParcelas: props.quantidadeParcelas,
      primeiroVencimento: props.primeiroVencimento,
      diaVencimentoFixo: props.diaVencimentoFixo as any,
    };
    return gerarParcelas(input);
  }, [props.valor, props.quantidadeParcelas, props.primeiroVencimento, props.diaVencimentoFixo]);

  const total = parcelas.reduce((sum, p) => sum + p.valor, 0);

  if (parcelas.length === 0) return null;

  return React.createElement("div", { className: "rounded-md border bg-card p-3 space-y-1" },
    ...parcelas.map((p, i) => React.createElement("div", {
      key: i,
      className: "flex items-center justify-between text-sm",
    },
      React.createElement("span", { className: "text-muted-foreground" },
        `${p.numeroParcela}. ${formatarMoeda(p.valor)}`),
      React.createElement("span", { className: "text-muted-foreground" },
        formatarDataCurta(p.dataVencimento)),
    )),
    React.createElement("div", { className: "flex items-center justify-between pt-2 border-t text-sm font-semibold" },
      React.createElement("span", null, "Total"),
      React.createElement("span", null, formatarMoeda(total)),
    ),
  );
}
export const ParcelPreview = React.memo(ParcelPreviewBase);
