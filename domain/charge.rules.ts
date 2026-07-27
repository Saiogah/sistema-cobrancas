import { validarValorMonetario, validarQuantidadeParcelas, validarNomeProduto } from '../lib/validation.utils';
import { proximoVencimento, hoje, mesAlvoExisteDia } from '../lib/date.utils';
import { DIAS_VENCIMENTO } from '../config/days.config';
import type { CobrancaInput } from '../types/charge.types';

/**
 * Valida os dados de uma cobrança antes da criação.
 * Retorna { valido: boolean, erros: string[] }.
 */
export function validarCobranca(input: CobrancaInput): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  // Validação do valor
  if (!validarValorMonetario(input.valor)) {
    erros.push('Valor deve ser maior que zero e menor ou igual a 999999.99');
  }

  // Validação da quantidade de parcelas
  if (!validarQuantidadeParcelas(input.quantidadeParcelas)) {
    erros.push('Quantidade de parcelas deve ser entre 1 e 60');
  }

  // Validação do nome do produto/serviço
  if (!validarNomeProduto(input.nomeProdutoServico || '')) {
    erros.push('Nome do produto/serviço deve ter no mínimo 3 caracteres');
  }

  // Validação da forma de pagamento
  const formasValidas = ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'transferencia'];
  if (!input.formaPagamento || !formasValidas.includes(input.formaPagamento)) {
    erros.push('Forma de pagamento inválida');
  } else if (input.formaPagamento === 'pix' && (!input.pixUtilizado || input.pixUtilizado.trim() === '')) {
    erros.push('PIX utilizado é obrigatório quando a forma de pagamento é PIX');
  }

  // Validação do dia de vencimento fixo
  if (!DIAS_VENCIMENTO.includes(input.diaVencimentoFixo)) {
    erros.push('Dia de vencimento fixo deve ser um dos valores: 5, 10, 15, 20, 25, 30');
  }

  // Validação do primeiro vencimento
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!input.primeiroVencimento || !dateRegex.test(input.primeiroVencimento)) {
    erros.push('Primeiro vencimento deve ser uma data válida no formato YYYY-MM-DD');
  } else {
    const [year, month, day] = input.primeiroVencimento.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day) || !mesAlvoExisteDia(year, month, day)) {
      erros.push('Primeiro vencimento deve ser uma data válida no formato YYYY-MM-DD');
    }
  }

  // Validação do cliente
  if (!input.clienteId || input.clienteId.trim() === '') {
    erros.push('Cliente é obrigatório');
  }

  return {
    valido: erros.length === 0,
    erros
  };
}

/**
 * Sugere o primeiro vencimento: próxima ocorrência do diaFixo a partir de hoje (inclusive).
 */
export function calcularPrimeiroVencimentoSugerido(diaFixo: number): string {
  return proximoVencimento(diaFixo, hoje());
}
