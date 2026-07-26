import { MAX_PARCELAS, MAX_VALOR } from '../config/app.config';

/**
 * Funções utilitárias de validação e normalização para o sistema de cobrança.
 */

/**
 * Valida se um número de telefone é composto apenas por 12 ou 13 dígitos numéricos.
 */
export function validarTelefone(telefone: string): boolean {
  return /^[0-9]{12,13}$/.test(telefone);
}

/**
 * Valida se um valor monetário em reais é maior que zero e menor ou igual ao valor máximo do sistema.
 */
export function validarValorMonetario(valor: number): boolean {
  return valor > 0 && valor <= MAX_VALOR;
}

/**
 * Valida se a quantidade de parcelas é um número inteiro válido dentro da faixa permitida.
 */
export function validarQuantidadeParcelas(qtd: number): boolean {
  return Number.isInteger(qtd) && qtd >= 1 && qtd <= MAX_PARCELAS;
}

/**
 * Valida se o nome do produto ou serviço tem pelo menos 3 caracteres significativos (após remover espaços).
 */
export function validarNomeProduto(nome: string): boolean {
  return nome.trim().length >= 3;
}

/**
 * Remove qualquer caractere não numérico do telefone informado e normaliza para o formato DDI+DDD+número.
 * Se o número limpo já começa com '55' e possui 12 ou mais dígitos, ele é mantido.
 * Se o número limpo possui de 10 a 11 dígitos (DDD + número), o DDI '55' é adicionado à frente.
 */
export function normalizarTelefone(input: string): string {
  const digits = input.replace(/\D/g, '');
  
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }
  
  if (digits.length === 10 || digits.length === 11) {
    return '55' + digits;
  }
  
  return digits;
}
