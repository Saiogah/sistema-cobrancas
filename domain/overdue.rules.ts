import { diasEntre } from '../lib/date.utils';
import type { Parcela } from '../types/parcel.types';

/**
 * Verifica se uma parcela está atrasada.
 * Atrasada = dataVencimento < dataReferencia AND status IN (pendente, cobrado, pago_parcial) AND arquivada = false
 */
export function isAtrasada(parcela: Parcela, dataReferencia: string): boolean {
  const statusValidos = ['pendente', 'cobrado', 'pago_parcial'];
  return (
    parcela.dataVencimento < dataReferencia &&
    statusValidos.includes(parcela.status) &&
    parcela.arquivada === false
  );
}

/**
 * Calcula dias de atraso. Retorna 0 se não está atrasada.
 */
export function diasAtraso(parcela: Parcela, dataReferencia: string): number {
  if (!isAtrasada(parcela, dataReferencia)) {
    return 0;
  }
  return diasEntre(parcela.dataVencimento, dataReferencia);
}

/**
 * Retorna a cor do badge de atraso: 'laranja' (1-3 dias) ou 'vermelho' (4+ dias).
 * Retorna null se dias <= 0.
 */
export function corAtraso(dias: number): 'laranja' | 'vermelho' | null {
  if (dias <= 0) {
    return null;
  }
  if (dias <= 3) {
    return 'laranja';
  }
  return 'vermelho';
}

/**
 * Ordena parcelas para exibição no Dashboard.
 * Ordem: atrasadas vermelhas (mais dias primeiro) → atrasadas laranjas (mais dias primeiro) → cobradas hoje → pendentes hoje
 */
export function ordenarParcelas(parcelas: Parcela[], dataReferencia: string): Parcela[] {
  const atrasadasVermelhas: Parcela[] = [];
  const atrasadasLaranjas: Parcela[] = [];
  const cobradasHoje: Parcela[] = [];
  const pendentesHoje: Parcela[] = [];
  const resto: Parcela[] = [];

  for (const p of parcelas) {
    if (isAtrasada(p, dataReferencia)) {
      const dias = diasAtraso(p, dataReferencia);
      const cor = corAtraso(dias);
      if (cor === 'vermelho') {
        atrasadasVermelhas.push(p);
      } else if (cor === 'laranja') {
        atrasadasLaranjas.push(p);
      } else {
        resto.push(p);
      }
    } else if (p.dataVencimento === dataReferencia && p.arquivada === false) {
      if (p.status === 'cobrado') {
        cobradasHoje.push(p);
      } else if (p.status === 'pendente') {
        pendentesHoje.push(p);
      } else {
        resto.push(p);
      }
    } else {
      resto.push(p);
    }
  }

  // Ordenar atrasadas por dias de atraso descrescente (mais dias primeiro)
  atrasadasVermelhas.sort((a, b) => diasAtraso(b, dataReferencia) - diasAtraso(a, dataReferencia));
  atrasadasLaranjas.sort((a, b) => diasAtraso(b, dataReferencia) - diasAtraso(a, dataReferencia));

  return [
    ...atrasadasVermelhas,
    ...atrasadasLaranjas,
    ...cobradasHoje,
    ...pendentesHoje,
    ...resto
  ];
}
