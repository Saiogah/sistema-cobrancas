import { dividirValor } from '../lib/math.utils';
import { calcularVencimentoParcela } from './billing-cycle';
import type { CobrancaInput } from '../types/charge.types';
import type { Parcela, ParcelaInput } from '../types/parcel.types';

/**
 * Gera o array de parcelas a partir dos dados da cobrança.
 * Retorna N parcelas com numeroParcela, valor (dividirValor), dataVencimento (billing-cycle), status='pendente'
 */
export function gerarParcelas(input: CobrancaInput): ParcelaInput[] {
  const { valor, quantidadeParcelas, primeiroVencimento, diaVencimentoFixo, clienteId } = input;
  const { valorBase, valorUltima } = dividirValor(valor, quantidadeParcelas);
  const parcelas: ParcelaInput[] = [];

  for (let i = 1; i <= quantidadeParcelas; i++) {
    const valorParcela = i === quantidadeParcelas ? valorUltima : valorBase;
    const dataVencimento = calcularVencimentoParcela(primeiroVencimento, diaVencimentoFixo, i);
    parcelas.push({
      cobrancaId: '',
      clienteId,
      numeroParcela: i,
      valor: valorParcela,
      dataVencimento,
      status: 'pendente'
    });
  }

  return parcelas;
}

/**
 * Verifica se uma cobrança pode ser editada com regeneração de parcelas.
 * REGRA (PRD v2.0 seção 7.5 — prevalece sobre o Plano v2.0):
 * true APENAS se TODAS as parcelas têm status = "pendente".
 * Se qualquer parcela tem status != "pendente" (cobrado, pago, pago_parcial),
 * a edição é limitada a observacoes e pixUtilizado.
 *
 * DIVERGÊNCIA REGISTRADA: O Plano v2.0 permitia cobrado, mas o PRD v2.0
 * diz que cobrado bloqueia a regeneração. Implementação segue o PRD.
 */
export function podeEditarCobranca(parcelas: Parcela[]): boolean {
  return parcelas.length > 0 && parcelas.every(p => p.status === 'pendente');
}

/**
 * Verifica se uma cobrança pode ser excluída.
 * REGRA (PRD v2.0 seção 7.5): true se nenhuma parcela tem status=pago,
 * status=pago_parcial, ou valorPago != null.
 * Parcelas com status=cobrado ou arquivado NÃO bloqueiam a exclusão.
 */
export function podeExcluirCobranca(parcelas: Parcela[]): boolean {
  return !parcelas.some(p => p.status === 'pago' || p.status === 'pago_parcial' || p.valorPago !== null);
}
