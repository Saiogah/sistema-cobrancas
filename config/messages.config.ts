// config/messages.config.ts — Templates de mensagem WhatsApp (PRD v2.0 seção 15)

/**
 * Templates de mensagem de cobrança.
 * Placeholders: [Nome], [Valor], [Produto], [Data], [SaldoDevedor]
 */

/** Template para parcela vencendo HOJE (não atrasada) */
export const TEMPLATE_HOJE = `Olá [Nome]!

Sua parcela de R$ [Valor] referente a [Produto] vence hoje ([Data]).

Obrigada!`;

/** Template para parcela ATRASADA */
export const TEMPLATE_ATRASADA = `Olá [Nome]!

Sua parcela de R$ [Valor] referente a [Produto] venceu no dia [Data] e ainda não foi recebida.

Pode verificar o pagamento?

Obrigada!`;

/** Template para parcela com PAGO PARCIAL */
export const TEMPLATE_PAGO_PARCIAL = `Olá [Nome]!

Sua parcela de R$ [ValorTotal] referente a [Produto] tem R$ [SaldoDevedor] pendentes.

Pode verificar o pagamento?

Obrigada!`;

/** Tipo identificador de qual template usar */
export type TipoTemplate = "hoje" | "atrasada" | "pago_parcial";

/**
 * Seleciona o template apropriado baseado no estado da parcela.
 * @param isAtrasada - se a parcela está atrasada (dataVencimento < hoje)
 * @param isPagoParcial - se a parcela tem status pago_parcial
 */
export function selecionarTemplate(
  isAtrasada: boolean,
  isPagoParcial: boolean
): TipoTemplate {
  if (isPagoParcial) return "pago_parcial";
  if (isAtrasada) return "atrasada";
  return "hoje";
}

/**
 * Modelo configurável da mensagem de cobrança (página Config → "Mensagem de cobrança").
 * Única fonte do texto quando o usuário define uma mensagem própria; tanto o fluxo
 * manual (botão Cobrar) quanto uma futura automação devem gerar a mensagem a partir
 * daqui (via gerarMensagem, em services/whatsapp.service.ts).
 *
 * Variáveis substituídas em tempo de geração (nenhum dado novo é persistido):
 * {cliente} {produto} {parcela} {totalParcelas} {vencimento} {valor} {valorPago} {saldo}
 */
export const MENSAGEM_COBRANCA_DEFAULT = `Olá, {cliente}. Sua parcela {parcela}/{totalParcelas} de {produto}, no valor de {valor}, vence em {vencimento}.`;
