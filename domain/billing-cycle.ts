import { adicionarMeses, mesAlvoExisteDia } from '../lib/date.utils';

/**
 * Calcula a data de vencimento da parcela N.
 * - Parcela 1: retorna primeiroVencimento (igual ao informado)
 * - Parcela N (N>1): adiciona N-1 meses ao primeiroVencimento, depois ajusta para o diaVencimentoFixo.
 *   Se o diaVencimentoFixo não existe no mês alvo, usa o último dia do mês.
 */
export function calcularVencimentoParcela(
  primeiroVencimento: string,
  diaVencimentoFixo: number,
  numeroParcela: number
): string {
  if (numeroParcela === 1) {
    return primeiroVencimento;
  }

  const base = adicionarMeses(primeiroVencimento, numeroParcela - 1);
  const [yearStr, monthStr] = base.split('-');
  const ano = parseInt(yearStr, 10);
  const mes = parseInt(monthStr, 10);

  const pad = (n: number) => String(n).padStart(2, '0');

  if (mesAlvoExisteDia(ano, mes, diaVencimentoFixo)) {
    return `${ano}-${pad(mes)}-${pad(diaVencimentoFixo)}`;
  } else {
    const lastDay = new Date(ano, mes, 0).getDate();
    return `${ano}-${pad(mes)}-${pad(lastDay)}`;
  }
}
