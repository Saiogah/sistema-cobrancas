// components/ChargeCard/ChargeCard.tsx — Card de parcela expansível (M8a)
import React, { useState, useCallback } from "react";
import { StatusBadge } from "../StatusBadge";
import { formatarMoeda, formatarTelefone } from "../../lib/format.utils";
import { formatarDataCurta, hoje } from "../../lib/date.utils";
import { isAtrasada, diasAtraso } from "../../domain/overdue.rules";
import type { Parcela } from "../../types/parcel.types";
import type { Cobranca } from "../../types/charge.types";
import type { Cliente } from "../../types/client.types";

export interface ChargeCardProps {
  parcela: Parcela; cobranca?: Cobranca; cliente?: Cliente;
  onSelect?: (id: string) => void; onCharge?: (p: Parcela) => void;
  onConfirmSend?: (id: string) => void; onMarkPaid?: (id: string) => void;
  onMarkPartial?: (id: string, v: number) => void; onArchive?: (id: string) => void;
  isSelected?: boolean;
}

function ChargeCardBase(props: ChargeCardProps) {
  const { parcela, cobranca, cliente } = props;
  const [expandido, setExpandido] = useState(false);
  const [menuPago, setMenuPago] = useState(false);
  // CR-03 fix: rastreia se o WhatsApp foi aberto para mostrar "Confirmar envio"
  const [cobrancaAberta, setCobrancaAberta] = useState(false);
  const dataHoje = hoje();
  const atrasada = isAtrasada(parcela, dataHoje);
  const dias = atrasada ? diasAtraso(parcela, dataHoje) : 0;
  const isPP = parcela.status === "pago_parcial";

  // AL-07 fix: cobrado não deve mostrar cor de atrasado
  const mostrarAtraso = atrasada && parcela.status !== "cobrado";

  const handleMarcarTotal = useCallback(() => { setMenuPago(false); props.onMarkPaid?.(parcela.id); }, [parcela.id, props]);

  const handleCobrar = useCallback((e: any) => {
    e.stopPropagation();
    props.onCharge?.(parcela);
    setCobrancaAberta(true);
  }, [parcela, props]);

  // Determina se deve mostrar "Confirmar envio":
  // - status persistido === "cobrado" (já confirmado antes)
  // - OU acabou de abrir o WhatsApp (cobrancaAberta === true)
  const mostrarConfirmarEnvio = parcela.status === "cobrado" || (parcela.status === "pendente" && cobrancaAberta);

  // AL-06 fix: parcela pago_parcial também pode ser cobrada
  const podeCobrar = parcela.status === "pendente" || parcela.status === "pago_parcial";

  return React.createElement("div", {
    className: `rounded-lg border bg-card p-3 ${mostrarAtraso ? (dias <= 3 ? "border-orange-300 dark:border-orange-700" : "border-red-400 dark:border-red-700") : ""}`
  },
    React.createElement("div", { className: "flex items-center gap-3" },
      props.onSelect ? React.createElement("button", {
        onClick: (e: any) => { e.stopPropagation(); props.onSelect?.(parcela.id); },
        className: `flex-shrink-0 w-5 h-5 rounded-full border-2 ${props.isSelected ? "bg-primary border-primary" : "border-input"}`,
      }) : null,
      React.createElement("div", { className: "flex-1 cursor-pointer min-w-0", onClick: () => setExpandido(!expandido) },
        React.createElement("span", { className: "font-medium text-foreground block truncate" }, cliente?.nome || "Cliente"),
        React.createElement("span", { className: "text-xs text-muted-foreground block truncate" }, `${cobranca?.nomeProdutoServico || "Produto"} · ${parcela.numeroParcela}/${cobranca?.quantidadeParcelas || 1}`),
      ),
      React.createElement("div", { className: "flex flex-col items-end gap-1" },
        React.createElement("span", { className: "font-semibold text-foreground" }, formatarMoeda(parcela.valor)),
        // AL-07 fix: cobrado mostra badge amarelo em vez de atrasado
        mostrarAtraso ? React.createElement("span", { className: "text-xs text-red-600 dark:text-red-400" }, `Atrasada há ${dias} ${dias === 1 ? "dia" : "dias"}`)
          : isPP ? React.createElement("span", { className: "text-xs text-blue-600 dark:text-blue-400" },
              // AL-08 fix: formatarMoeda já inclui R$, não duplicar
              `${formatarMoeda(parcela.valorPago || 0)} de ${formatarMoeda(parcela.valor)}`)
          : parcela.status === "cobrado" ? React.createElement(StatusBadge, { status: "cobrado" })
          : React.createElement(StatusBadge, { status: parcela.status }),
      ),
    ),
    parcela.status !== "pago" && parcela.status !== "arquivado" ? React.createElement("div", { className: "flex items-center gap-2 mt-2 flex-wrap" },
      // CR-03 + AL-06: Cobrar aparece para pendente e pago_parcial
      podeCobrar && !mostrarConfirmarEnvio ? React.createElement("button", {
        onClick: handleCobrar,
        className: "rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent"
      }, "💬 Cobrar") : null,
      // "Confirmar envio" aparece após abrir WhatsApp (UI state) ou se já está cobrado
      mostrarConfirmarEnvio && parcela.status === "pendente" ? React.createElement("button", {
        onClick: (e: any) => { e.stopPropagation(); props.onConfirmSend?.(parcela.id); },
        className: "rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent"
      }, "✓ Confirmar envio") : null,
      // Se já está cobrado, mostra Confirmar envio (re-confirmar)
      parcela.status === "cobrado" ? React.createElement("button", {
        onClick: (e: any) => { e.stopPropagation(); props.onConfirmSend?.(parcela.id); },
        className: "rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent"
      }, "✓ Confirmar envio") : null,
      // AL-06: Cobrar para pago_parcial também (quando não há cobranca aberta)
      parcela.status === "pago_parcial" && !cobrancaAberta ? React.createElement("button", {
        onClick: handleCobrar,
        className: "rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent"
      }, "💬 Cobrar saldo") : null,
      !menuPago ? React.createElement("button", { onClick: (e: any) => { e.stopPropagation(); setMenuPago(true); }, className: "rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent" }, "Marcar pago")
        : React.createElement("div", { className: "flex flex-col gap-2 w-full mt-1 p-2 rounded-md border" },
            // Identificação da parcela visível antes de confirmar o pagamento
            React.createElement("div", { className: "text-xs text-muted-foreground" },
              `Parcela ${parcela.numeroParcela} de ${cobranca?.quantidadeParcelas || 1} · Vencimento: ${formatarDataCurta(parcela.dataVencimento)} · Valor: ${formatarMoeda(parcela.valor)}`),
            isPP ? React.createElement("div", { className: "text-xs text-muted-foreground" },
              `Já pago: ${formatarMoeda(parcela.valorPago || 0)} · Saldo restante: ${formatarMoeda(parcela.valor - (parcela.valorPago || 0))}`) : null,
            // Pagamento parcial não é exposto aqui: nesta interface marca-se apenas o pagamento total (marcarPago).
            React.createElement("div", { className: "flex items-center gap-1 flex-wrap" },
              React.createElement("button", { onClick: (e: any) => { e.stopPropagation(); handleMarcarTotal(); }, className: "rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 text-xs font-medium" }, "Marcar parcela como paga"),
              React.createElement("button", { onClick: (e: any) => { e.stopPropagation(); setMenuPago(false); }, className: "text-xs text-muted-foreground px-1" }, "✕"),
            ),
          ),
      expandido ? React.createElement("button", { onClick: (e: any) => { e.stopPropagation(); props.onArchive?.(parcela.id); }, className: "rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent" }, "Arquivar") : null,
    ) : null,
    expandido ? React.createElement("div", { className: "mt-2 pt-2 border-t space-y-1 text-xs text-muted-foreground" },
      cliente ? React.createElement("div", null, `Telefone: ${formatarTelefone(cliente.telefone)}`) : null,
      cobranca?.pixUtilizado ? React.createElement("div", null, `PIX: ${cobranca.pixUtilizado}`) : null,
      cobranca?.formaPagamento ? React.createElement("div", null, `Pagamento: ${cobranca.formaPagamento}`) : null,
      cobranca?.observacoes ? React.createElement("div", null, `Obs: ${cobranca.observacoes}`) : null,
      React.createElement("div", null, `Vencimento: ${formatarDataCurta(parcela.dataVencimento)}`),
    ) : null,
  );
}
export const ChargeCard = React.memo(ChargeCardBase);
