// components/PaymentSelector/PaymentSelector.tsx — Seletor de forma de pagamento (M8a)
import React, { useState, useCallback } from "react";
import { MAX_PARCELAS, PIX_SUGESTOES_LIMIT } from "../../config/app.config";
import type { FormaPagamento } from "../../types/common.types";

export interface PaymentSelectorProps {
  value: FormaPagamento | null;
  onChange: (forma: FormaPagamento) => void;
  pixUtilizado?: string;
  onPixUtilizadoChange?: (v: string) => void;
  pixSugestoes?: string[];
  quantidadeParcelas: number;
  onQuantidadeParcelasChange: (qtd: number) => void;
}

const FORMAS: { value: FormaPagamento; label: string }[] = [
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão Crédito" },
  { value: "cartao_debito", label: "Cartão Débito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência" },
];

function PaymentSelectorBase(props: PaymentSelectorProps) {
  const [avista, setAvista] = useState(props.quantidadeParcelas <= 1);
  const [customParc, setCustomParc] = useState("");

  const handleSelectForma = useCallback((f: FormaPagamento) => {
    props.onChange(f);
  }, [props]);

  const handleToggleAvista = useCallback((isAvista: boolean) => {
    setAvista(isAvista);
    if (isAvista) { props.onQuantidadeParcelasChange(1); }
    else { props.onQuantidadeParcelasChange(2); setCustomParc(""); }
  }, [props]);

  const handleQuantidade = useCallback((qtd: number) => {
    props.onQuantidadeParcelasChange(qtd);
    setCustomParc("");
  }, [props]);

  const handleCustomParc = useCallback((v: string) => {
    setCustomParc(v);
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= 2 && n <= MAX_PARCELAS) { props.onQuantidadeParcelasChange(n); }
  }, [props]);

  const pixSugestoesFiltradas = (props.pixSugestoes || []).slice(0, PIX_SUGESTOES_LIMIT);

  return React.createElement("div", { className: "space-y-3" },
    // 5 botões de forma de pagamento
    React.createElement("div", { className: "grid grid-cols-3 gap-2" },
      ...FORMAS.map(f => React.createElement("button", {
        key: f.value,
        onClick: () => handleSelectForma(f.value),
        className: `rounded-md border px-3 py-2 text-sm font-medium ${props.value === f.value ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`,
      }, f.label)),
    ),
    // Campo PIX quando selecionado
    props.value === "pix" ? React.createElement("div", { className: "space-y-1" },
      React.createElement("label", { className: "text-xs text-muted-foreground" }, "PIX utilizado"),
      React.createElement("input", {
        type: "text",
        value: props.pixUtilizado || "",
        onChange: (e: any) => props.onPixUtilizadoChange?.(e.target.value),
        placeholder: "Chave PIX",
        list: "pix-sugestoes",
        className: "w-full rounded-md border px-3 py-2 text-sm",
      }),
      pixSugestoesFiltradas.length > 0 ? React.createElement("datalist", { id: "pix-sugestoes" },
        ...pixSugestoesFiltradas.map((s, i) => React.createElement("option", { key: i, value: s })),
      ) : null,
    ) : null,
    // Toggle À Vista / Parcelado
    React.createElement("div", { className: "flex gap-2" },
      React.createElement("button", {
        onClick: () => handleToggleAvista(true),
        className: `rounded-md border px-4 py-1.5 text-sm font-medium ${avista ? "bg-primary text-primary-foreground border-primary" : ""}`,
      }, "À Vista"),
      React.createElement("button", {
        onClick: () => handleToggleAvista(false),
        className: `rounded-md border px-4 py-1.5 text-sm font-medium ${!avista ? "bg-primary text-primary-foreground border-primary" : ""}`,
      }, "Parcelado"),
    ),
    // Seletor de parcelas
    !avista ? React.createElement("div", { className: "space-y-2" },
      React.createElement("div", { className: "flex flex-wrap gap-1.5" },
        ...Array.from({ length: 11 }, (_, i) => i + 2).map(n => React.createElement("button", {
          key: n,
          onClick: () => handleQuantidade(n),
          className: `rounded-md border px-3 py-1.5 text-sm ${props.quantidadeParcelas === n ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`,
        }, String(n))),
      ),
      React.createElement("div", { className: "flex items-center gap-2" },
        React.createElement("input", {
          type: "number",
          value: customParc,
          onChange: (e: any) => handleCustomParc(e.target.value),
          placeholder: "13-60",
          min: 13, max: MAX_PARCELAS,
          className: "w-20 rounded-md border px-2 py-1.5 text-sm",
        }),
        React.createElement("span", { className: "text-xs text-muted-foreground" }, `máx ${MAX_PARCELAS}`),
      ),
    ) : null,
  );
}
export const PaymentSelector = React.memo(PaymentSelectorBase);
