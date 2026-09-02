// config/messages.config.ts — Templates de mensagem WhatsApp (PRD v2.0 seção 15)

/**
 * Templates de mensagem de cobrança.
 * Placeholders: [Nome], [Valor], [Produto], [Data], [PIX], [SaldoDevedor]
 */

/** Template para parcela vencendo HOJE (não atrasada) */
export const TEMPLATE_HOJE = `Olá [Nome]!

Sua parcela de R$ [Valor] referente a [Produto] vence hoje ([Data]).
[PIX]
Obrigada!`;

/** Template para parcela ATRASADA */
export const TEMPLATE_ATRASADA = `Olá [Nome]!

Sua parcela de R$ [Valor] referente a [Produto] venceu no dia [Data] e ainda não foi recebida.
[PIX]
Pode verificar o pagamento?

Obrigada!`;

/** Template para parcela com PAGO PARCIAL */
export const TEMPLATE_PAGO_PARCIAL = `Olá [Nome]!

Sua parcela de R$ [ValorTotal] referente a [Produto] tem R$ [SaldoDevedor] pendentes.
[PIX]
Pode verificar o pagamento?

Obrigada!`;

/** Bloco PIX inserido no template quando a forma de pagamento é PIX */
export const BLOCO_PIX = `Forma de pagamento: PIX
Chave: [PIX]`;

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
