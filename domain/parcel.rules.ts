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
 * REGRA (Plano v2.0): true se todas as parcelas têm status=pendente OU cobrado.
 * NOTA: O PRD v2.0 seção 7.5 diz apenas pendente, mas o Plano v2.0 permite cobrado.
 * Esta implementação segue o Plano v2.0 (aprovado). Pendente de confirmação definitiva.
 */
export function podeEditarCobranca(parcelas: Parcela[]): boolean {
  return parcelas.every(p => p.status === 'pendente' || p.status === 'cobrado');
}

/**
 * Verifica se uma cobrança pode ser excluída.
 * REGRA: true se nenhuma parcela tem status=pago, status=pago_parcial, ou valorPago != null.
 * Parcelas com status=cobrado ou arquivado NÃO bloqueiam a exclusão.
 */
export function podeExcluirCobranca(parcelas: Parcela[]): boolean {
  return !parcelas.some(p => p.status === 'pago' || p.status === 'pago_parcial' || p.valorPago !== null);
}
