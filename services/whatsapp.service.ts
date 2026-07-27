// services/whatsapp.service.ts — Geração de links e mensagens WhatsApp (PRD v2.0 seção 15)

import type { Parcela } from "../types/parcel.types";
import type { Cobranca } from "../types/charge.types";
import type { Cliente } from "../types/client.types";
import {
  TEMPLATE_HOJE,
  TEMPLATE_ATRASADA,
  TEMPLATE_PAGO_PARCIAL,
  BLOCO_PIX,
  selecionarTemplate,
} from "../config/messages.config";
import { formatarMoedaSimples } from "../lib/format.utils";
import { formatarDataCurta } from "../lib/date.utils";

/**
 * Gera um link wa.me para abrir o WhatsApp com mensagem pré-preenchida.
 * @param telefone - Telefone no formato DDI+DDD+número, apenas dígitos (ex: "5511987654321")
 * @param mensagem - Mensagem pré-preenchida
 * @returns URL completa: https://wa.me/5511987654321?text=...
 */
export function gerarLinkWhatsApp(telefone: string, mensagem: string): string {
  const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
  return url;
}

/**
 * Gera a mensagem de cobrança baseada no estado da parcela.
 * Seleciona o template apropriado e substitui os placeholders.
 *
 * @param parcela - Dados da parcela
 * @param cobranca - Dados da cobrança pai
 * @param cliente - Dados do cliente
 * @param dataHoje - Data de hoje no formato YYYY-MM-DD (para determinar se está atrasada)
 * @returns Mensagem formatada pronta para envio
 */
export function gerarMensagem(
  parcela: Parcela,
  cobranca: Cobranca,
  cliente: Cliente,
  dataHoje: string
): string {
  const isAtrasada = parcela.dataVencimento < dataHoje;
  const isPagoParcial = parcela.status === "pago_parcial";
  const tipo = selecionarTemplate(isAtrasada, isPagoParcial);

  // Formatações
  const valor = formatarMoedaSimples(parcela.valor);
  const valorTotal = formatarMoedaSimples(parcela.valor);
  const data = formatarDataCurta(parcela.dataVencimento);
  const saldoDevedor = formatarMoedaSimples(parcela.valor - (parcela.valorPago || 0));

  // Bloco PIX: apenas se forma=pix e pixUtilizado não vazio
  const blocoPix =
    cobranca.formaPagamento === "pix" && cobranca.pixUtilizado
      ? BLOCO_PIX.replace("[PIX]", cobranca.pixUtilizado)
      : "";

  // Selecionar template e substituir
  let template: string;
  switch (tipo) {
    case "hoje":
      template = TEMPLATE_HOJE;
      break;
    case "atrasada":
      template = TEMPLATE_ATRASADA;
      break;
    case "pago_parcial":
      template = TEMPLATE_PAGO_PARCIAL;
      break;
  }

  let mensagem = template
    .replace(/\[Nome\]/g, cliente.nome)
    .replace(/\[Valor\]/g, valor)
    .replace(/\[ValorTotal\]/g, valorTotal)
    .replace(/\[Produto\]/g, cobranca.nomeProdutoServico)
    .replace(/\[Data\]/g, data)
    .replace(/\[SaldoDevedor\]/g, saldoDevedor)
    .replace(/\[PIX\]/g, blocoPix);

  // Limpar linhas vazias restantes (quando não há bloco PIX, o placeholder [PIX] vira string vazia)
  mensagem = mensagem
    .replace(/\n\n\n/g, "\n\n") // colapsar linhas vazias duplas
    .replace(/\[PIX\]/g, "") // limpar placeholder residual
    .trim();

  return mensagem;
}
