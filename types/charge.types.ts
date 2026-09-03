// types/charge.types.ts — Tipos da entidade Cobranca

import type { FormaPagamento, DiaVencimento } from "./common.types";

/** Registro completo de Cobranca (como retornado pela API) */
export interface Cobranca {
  id: string;
  clienteId: string;
  produtoServicoId: string | null;
  nomeProdutoServico: string;
  valor: number;
  formaPagamento: FormaPagamento;
  quantidadeParcelas: number;
  primeiroVencimento: string; // YYYY-MM-DD
  diaVencimentoFixo: DiaVencimento;
  pixUtilizado: string | null;
  observacoes: string;
  created_date: string;
  updated_date: string;
}

/** Dados para criar uma nova cobrança */
export interface CobrancaInput {
  clienteId: string;
  produtoServicoId?: string | null;
  nomeProdutoServico: string;
  valor: number;
  formaPagamento: FormaPagamento;
  quantidadeParcelas: number;
  primeiroVencimento: string; // YYYY-MM-DD
  diaVencimentoFixo: DiaVencimento;
  pixUtilizado?: string | null;
  observacoes?: string;
}

/** Dados para editar uma cobrança existente (edição limitada) */
export interface CobrancaUpdate {
  observacoes?: string;
  pixUtilizado?: string;
  // Campos abaixo só se podeEditarCobranca retornar true
  valor?: number;
  quantidadeParcelas?: number;
  primeiroVencimento?: string;
  diaVencimentoFixo?: DiaVencimento;
  formaPagamento?: FormaPagamento;
  produtoServicoId?: string | null;
}

/** Resposta da backend function createCobranca */
export interface CreateCobrancaResult {
  sucesso: boolean;
  cobrancaId: string;
  parcelas: Array<{
    numeroParcela: number;
    valor: number;
    dataVencimento: string;
  }>;
  erro?: string;
}

/** Resposta da backend function editarCobranca */
export interface EditarCobrancaResult {
  sucesso: boolean;
  cobrancaId: string;
  parcelas: Array<{
    numeroParcela: number;
    valor: number;
    dataVencimento: string;
  }>;
  erro?: string;
}
