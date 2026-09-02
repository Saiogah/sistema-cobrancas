// api/rpcs.ts — Wrappers para as RPCs PostgreSQL transacionais do Supabase.
// As RPCs (create_cobranca, editar_cobranca, excluir_cobranca, seed_test_data)
// foram criadas durante a migração Base44 → Supabase (Sprint 6).

import { supabase } from './supabase';
import type { CobrancaInput, CobrancaUpdate } from '../types/charge.types';

export interface CriarCobrancaResult {
  cobrancaId: string;
  parcelasIds: string[];
}

/**
 * Cria cobrança + parcelas atomicamente via RPC PostgreSQL.
 * A RPC `create_cobranca` faz toda a validação, geração de parcelas,
 * arredondamento de centavos na última parcela e incremento de vezesUsado.
 */
export async function criarCobranca(input: CobrancaInput): Promise<CriarCobrancaResult> {
  const { data, error } = await supabase.rpc('create_cobranca', {
    p_cliente_id: input.clienteId,
    p_produto_servico_id: input.produtoServicoId ?? null,
    p_nome_produto_servico: input.nomeProdutoServico,
    p_valor: input.valor,
    p_forma_pagamento: input.formaPagamento,
    p_quantidade_parcelas: input.quantidadeParcelas,
    p_primeiro_vencimento: input.primeiroVencimento,
    p_dia_vencimento_fixo: input.diaVencimentoFixo,
    p_pix_utilizado: input.pixUtilizado ?? null,
    p_observacoes: input.observacoes ?? null,
  });

  if (error) throw error;
  return data;
}

/**
 * Edita cobrança via RPC PostgreSQL.
 * Se todas as parcelas estiverem pendentes → regenera parcelas.
 * Se alguma estiver cobrada/paga → edição limitada (observações/PIX apenas).
 */
export async function editarCobranca(id: string, patch: CobrancaUpdate): Promise<void> {
  const { error } = await supabase.rpc('editar_cobranca', {
    p_cobranca_id: id,
    p_nome_produto_servico: patch.nomeProdutoServico ?? null,
    p_valor: patch.valor ?? null,
    p_forma_pagamento: patch.formaPagamento ?? null,
    p_quantidade_parcelas: patch.quantidadeParcelas ?? null,
    p_primeiro_vencimento: patch.primeiroVencimento ?? null,
    p_dia_vencimento_fixo: patch.diaVencimentoFixo ?? null,
    p_pix_utilizado: patch.pixUtilizado ?? null,
    p_observacoes: patch.observacoes ?? null,
  });

  if (error) throw error;
}

/**
 * Exclui cobrança + parcelas via RPC PostgreSQL.
 * Bloqueia se houver parcela com pagamento (pago/pago_parcial).
 * Decrementa vezesUsado do produto se aplicável.
 */
export async function excluirCobranca(id: string): Promise<void> {
  const { error } = await supabase.rpc('excluir_cobranca', {
    p_cobranca_id: id,
  });

  if (error) throw error;
}

/**
 * Executa o seed de dados de teste.
 * Cria clientes, produtos, cobranças e parcelas com datas relativas a hoje.
 */
export async function seedTestData(reset: boolean = false): Promise<void> {
  const { error } = await supabase.rpc('seed_test_data', {
    p_reset: reset,
  });

  if (error) throw error;
}
