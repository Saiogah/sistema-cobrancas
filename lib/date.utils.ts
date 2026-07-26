/**
 * Funções utilitárias de data para o sistema de cobrança.
 * Todas as funções lidam com strings no formato YYYY-MM-DD e evitam problemas de fuso horário UTC.
 */

/**
 * Retorna a data de hoje no formato YYYY-MM-DD, ajustada para o fuso horário de America/Sao_Paulo.
 */
export function hoje(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

/**
 * Recebe uma data ISO (YYYY-MM-DD) e retorna no formato brasileiro (DD/MM/YYYY).
 */
export function formatarDataBR(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

/**
 * Recebe uma data ISO (YYYY-MM-DD) e retorna no formato curto brasileiro (DD/MM).
 */
export function formatarDataCurta(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [, month, day] = parts;
  return `${day}/${month}`;
}

/**
 * Verifica se um dia existe em um determinado ano e mês.
 * @param ano Ano (ex: 2026)
 * @param mes Mês de 1 a 12 (1 = Janeiro)
 * @param dia Dia a ser validado (1 a 31)
 */
export function mesAlvoExisteDia(ano: number, mes: number, dia: number): boolean {
  const d = new Date(ano, mes - 1, dia);
  return d.getFullYear() === ano && (d.getMonth() + 1) === mes && d.getDate() === dia;
}

/**
 * Adiciona meses a uma data YYYY-MM-DD.
 * REGRA: Se o dia não existe no mês alvo, usa-se o último dia do mês.
 */
export function adicionarMeses(data: string, meses: number): string {
  const [yearStr, monthStr, dayStr] = data.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10); // 1-indexed
  const day = parseInt(dayStr, 10);

  month += meses;

  // Ajusta o ano e mês para que o mês fique no intervalo [1, 12]
  const adjustedMonth = (month - 1) % 12;
  const yearOffset = Math.floor((month - 1) / 12);
  year += yearOffset;
  month = adjustedMonth + 1;
  if (month <= 0) {
    month += 12;
    year -= 1;
  }

  return obterDataValida(year, month, day);
}

/**
 * Retorna a próxima ocorrência de diaFixo a partir de dataReferencia (INCLUSIVE).
 */
export function proximoVencimento(diaFixo: number, dataReferencia: string): string {
  const [yearStr, monthStr] = dataReferencia.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // Tenta o mês corrente da referência
  const currentMonthCandidate = obterDataValida(year, month, diaFixo);
  if (currentMonthCandidate >= dataReferencia) {
    return currentMonthCandidate;
  }

  // Tenta o próximo mês
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  return obterDataValida(nextYear, nextMonth, diaFixo);
}

/**
 * Calcula a diferença em dias corridos entre duas datas (data2 - data1).
 * Faz o parse das datas localmente para evitar problemas de off-by-one de UTC.
 */
export function diasEntre(data1: string, data2: string): number {
  const [y1, m1, d1] = data1.split('-').map(Number);
  const [y2, m2, d2] = data2.split('-').map(Number);

  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);

  const diffTime = date2.getTime() - date1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Retorna se uma data YYYY-MM-DD cai em um fim de semana (Sábado ou Domingo).
 */
export function ehFimDeSemana(data: string): boolean {
  const [y, m, d] = data.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayOfWeek = date.getDay(); // 0 = Domingo, 6 = Sábado
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/**
 * Retorna uma string de data formatada YYYY-MM-DD garantindo que o dia seja válido.
 * Se o dia não existir no mês alvo, retorna o último dia daquele mês.
 */
function obterDataValida(ano: number, mes: number, dia: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  if (mesAlvoExisteDia(ano, mes, dia)) {
    return `${ano}-${pad(mes)}-${pad(dia)}`;
  }
  // Se o dia não existir (ex: 30 de fevereiro), pega o último dia do mês
  const lastDay = new Date(ano, mes, 0).getDate();
  return `${ano}-${pad(mes)}-${pad(lastDay)}`;
}
