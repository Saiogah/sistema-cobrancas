/**
 * Funções utilitárias de formatação para o sistema de cobrança.
 */

/**
 * Formata um valor numérico em moeda brasileira (R$ X,XX).
 * Substitui espaços especiais (NBSP/NNBSP) por espaço padrão.
 */
export function formatarMoeda(valor: number): string {
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor);
  
  return formatted.replace(/\s+/g, ' ');
}

/**
 * Formata um valor numérico como string decimal brasileira (X,XX), sem o símbolo R$.
 */
export function formatarMoedaSimples(valor: number): string {
  const formatted = valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return formatted.replace(/\s+/g, ' ');
}

/**
 * Formata um telefone de 12 ou 13 dígitos (DDI + DDD + número) ou 10 ou 11 dígitos (DDD + número)
 * para o formato (XX) XXXXX-XXXX ou (XX) XXXX-XXXX.
 * Remove '55' no início se estiver presente em um número de 12 ou 13 dígitos.
 */
export function formatarTelefone(telefone: string): string {
  let digits = telefone.replace(/\D/g, '');
  
  // Se tem DDI brasileiro (55) com 12 ou 13 dígitos, remove o 55
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  
  if (digits.length < 2) {
    return telefone;
  }
  
  const ddd = digits.slice(0, 2);
  const num = digits.slice(2);
  
  if (num.length === 9) {
    return `(${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
  } else if (num.length === 8) {
    return `(${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
  }
  
  // Caso o formato de dígitos seja fora do padrão, divide no meio
  if (num.length > 0) {
    const mid = Math.ceil(num.length / 2);
    return `(${ddd}) ${num.slice(0, mid)}-${num.slice(mid)}`;
  }
  
  return digits;
}

/**
 * Retorna uma versão truncada do telefone formatado para exibição em espaços reduzidos.
 * Exemplo: (11) 98765-4321 vira (11) 98765...
 */
export function formatarTelefoneCurto(telefone: string): string {
  const formatado = formatarTelefone(telefone);
  return formatado.slice(0, 10) + '...';
}

/**
 * Recebe uma data ISO (YYYY-MM-DD) e retorna no formato curto brasileiro (DD/MM).
 * Reimplementação independente para evitar acoplamento com date.utils.ts.
 */
export function formatarDataCurta(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [, month, day] = parts;
  return `${day}/${month}`;
}
