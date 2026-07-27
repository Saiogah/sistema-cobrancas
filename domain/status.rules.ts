import { hoje } from '../lib/date.utils';
import type { ParcelaStatus, AcaoStatus, EstadoAnterior } from '../types/common.types';
import type { Parcela } from '../types/parcel.types';

/**
 * Calcula o próximo status e campos a atualizar quando uma ação é executada sobre uma parcela.
 * Segue a máquina de transições do PRD v2.0 seção 7.2.
 */
export function proximoStatus(
  statusAtual: ParcelaStatus,
  acao: AcaoStatus,
  parcela: Parcela,
  valorRecebido?: number,
  dataHoje?: string
): { novoStatus: ParcelaStatus; camposAtualizar: Partial<Parcela> } {
  const diaHoje = dataHoje || hoje();

  // Ação universal: arquivar
  if (acao === 'arquivar') {
    return {
      novoStatus: 'arquivado',
      camposAtualizar: {
        status: 'arquivado',
        arquivada: true
      }
    };
  }

  // Ação universal para arquivado: desarquivar
  if (statusAtual === 'arquivado' && acao === 'desarquivar') {
    // Inferir o status anterior baseado nos campos da parcela
    let statusAnterior: ParcelaStatus = 'pendente';
    if (parcela.valorPago !== null && parcela.valorPago >= parcela.valor) {
      statusAnterior = 'pago';
    } else if (parcela.valorPago !== null && parcela.valorPago > 0) {
      statusAnterior = 'pago_parcial';
    } else if (parcela.dataCobrancaEnviada !== null) {
      statusAnterior = 'cobrado';
    }

    return {
      novoStatus: statusAnterior,
      camposAtualizar: {
        status: statusAnterior,
        arquivada: false
      }
    };
  }

  // Máquina de estados baseada em statusAtual e acao
  switch (statusAtual) {
    case 'pendente':
      if (acao === 'confirmar_envio') {
        return {
          novoStatus: 'cobrado',
          camposAtualizar: {
            status: 'cobrado',
            dataCobrancaEnviada: diaHoje
          }
        };
      }
      break;

    case 'cobrado':
      if (acao === 'marcar_pago') {
        return {
          novoStatus: 'pago',
          camposAtualizar: {
            status: 'pago',
            dataPagamento: diaHoje,
            valorPago: parcela.valor
          }
        };
      }
      if (acao === 'marcar_parcial') {
        const recebido = valorRecebido || 0;
        if (recebido >= parcela.valor) {
          return {
            novoStatus: 'pago',
            camposAtualizar: {
              status: 'pago',
              dataPagamento: diaHoje,
              valorPago: parcela.valor
            }
          };
        } else {
          return {
            novoStatus: 'pago_parcial',
            camposAtualizar: {
              status: 'pago_parcial',
              valorPago: recebido
            }
          };
        }
      }
      break;

    case 'pago_parcial':
      if (acao === 'complementar_pagamento') {
        return {
          novoStatus: 'pago',
          camposAtualizar: {
            status: 'pago',
            dataPagamento: diaHoje,
            valorPago: parcela.valor
          }
        };
      }
      if (acao === 'marcar_parcial') {
        const recebido = valorRecebido || 0;
        const novoValorPago = (parcela.valorPago || 0) + recebido;
        if (novoValorPago >= parcela.valor) {
          return {
            novoStatus: 'pago',
            camposAtualizar: {
              status: 'pago',
              dataPagamento: diaHoje,
              valorPago: parcela.valor
            }
          };
        } else {
          return {
            novoStatus: 'pago_parcial',
            camposAtualizar: {
              status: 'pago_parcial',
              valorPago: novoValorPago
            }
          };
        }
      }
      break;
  }

  throw new Error(`Transição inválida: ${statusAtual} + ${acao}`);
}

/**
 * Reverte uma parcela ao estado anterior (undo).
 */
export function desfazerStatus(estadoAnterior: EstadoAnterior): { novoStatus: ParcelaStatus; camposAtualizar: Partial<Parcela> } {
  const novoStatus = estadoAnterior.status;
  return {
    novoStatus,
    camposAtualizar: {
      status: novoStatus,
      dataPagamento: estadoAnterior.dataPagamento,
      valorPago: estadoAnterior.valorPago,
      dataCobrancaEnviada: estadoAnterior.dataCobrancaEnviada
    }
  };
}
