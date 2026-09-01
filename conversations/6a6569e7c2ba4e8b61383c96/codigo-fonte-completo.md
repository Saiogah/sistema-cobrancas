# CÓDIGO-FONTE COMPLETO — Sistema de Cobranças (Sprints 1-6)
# Cada bloco abaixo é um arquivo, delimitado por === ARQUIVO: caminho ===


=== ARQUIVO: package.json ===

{
  "devDependencies": {
    "@testing-library/dom": "^10.4.1",
    "@testing-library/react": "^16.3.2",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "jsdom": "^29.1.1",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "typescript": "^7.0.2"
  }
}


=== ARQUIVO: api/entities.ts ===

// api/entities.ts — Stub de tipos para o Base44 SDK
// No ambiente do Base44 App Builder, este arquivo é gerado automaticamente.
// Aqui serve apenas para compilacao TypeScript do codigo fonte.
// Cada entity expoe: list(), filter(), get(id), create(), update(id), delete()

import type { Cliente as ClienteType, ClienteInput, ClienteUpdate } from "../types/client.types";
import type { ProdutoServico as ProdutoServicoType, ProdutoInput, ProdutoUpdate } from "../types/product.types";
import type { Cobranca as CobrancaType, CobrancaInput, CobrancaUpdate } from "../types/charge.types";
import type { Parcela as ParcelaType, ParcelaInput, ParcelaUpdate } from "../types/parcel.types";

interface BaseEntityApi<T, C, U> {
  list(params?: { limit?: number; skip?: number; sort?: string }): Promise<T[]>;
  filter(params: Record<string, unknown>): Promise<T[]>;
  get(id: string): Promise<T>;
  create(data: C): Promise<T>;
  update(id: string, data: U): Promise<T>;
  delete(id: string): Promise<void>;
}

interface ConfiguracaoRecord {
  id: string;
  diasTrabalhados: string;
  created_date: string;
  updated_date: string;
}

interface ConfiguracaoApi {
  list(params?: { limit?: number; skip?: number }): Promise<ConfiguracaoRecord[]>;
  filter(params: Record<string, unknown>): Promise<ConfiguracaoRecord[]>;
  get(id: string): Promise<ConfiguracaoRecord>;
  create(data: { diasTrabalhados: string }): Promise<ConfiguracaoRecord>;
  update(id: string, data: { diasTrabalhados?: string }): Promise<ConfiguracaoRecord>;
  delete(id: string): Promise<void>;
}

export const Cliente: BaseEntityApi<ClienteType, ClienteInput, ClienteUpdate> = {} as any;
export const ProdutoServico: BaseEntityApi<ProdutoServicoType, ProdutoInput, ProdutoUpdate> = {} as any;
export const Cobranca: BaseEntityApi<CobrancaType, CobrancaInput, CobrancaUpdate> = {} as any;
export const Parcela: BaseEntityApi<ParcelaType, ParcelaInput, ParcelaUpdate> = {} as any;
export const Configuracao: ConfiguracaoApi = {} as any;


=== ARQUIVO: types/charge.types.ts ===

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


=== ARQUIVO: types/client.types.ts ===

// types/client.types.ts — Tipos da entidade Cliente

/** Registro completo de Cliente (como retornado pela API) */
export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  observacoes: string;
  ativo: boolean;
  created_date: string;
  updated_date: string;
}

/** Dados para criar um novo cliente */
export interface ClienteInput {
  nome: string;
  telefone: string;
  observacoes?: string;
  ativo?: boolean;
}

/** Dados para atualizar um cliente existente */
export interface ClienteUpdate {
  nome?: string;
  telefone?: string;
  observacoes?: string;
  ativo?: boolean;
}


=== ARQUIVO: types/common.types.ts ===

// types/common.types.ts — Tipos compartilhados do sistema

/** Dias de vencimento fixos disponíveis no sistema */
export type DiaVencimento = 5 | 10 | 15 | 20 | 25 | 30;

/** Formas de pagamento aceitas (sem boleto) */
export type FormaPagamento =
  | "pix"
  | "dinheiro"
  | "cartao_credito"
  | "cartao_debito"
  | "transferencia";

/** Status possíveis de uma parcela */
export type ParcelaStatus =
  | "pendente"
  | "cobrado"
  | "pago"
  | "pago_parcial"
  | "arquivado";

/** Ações que podem ser executadas sobre o status de uma parcela */
export type AcaoStatus =
  | "confirmar_envio"
  | "marcar_pago"
  | "marcar_parcial"
  | "complementar_pagamento"
  | "desfazer_pagamento"
  | "arquivar"
  | "desarquivar";

/** Estado anterior de uma parcela, para undo */
export interface EstadoAnterior {
  status: ParcelaStatus;
  valorPago: number | null;
  dataPagamento: string | null;
  dataCobrancaEnviada: string | null;
}

/** Eventos do EventBus — usados para invalidação de cache entre hooks */
export interface EventTypes {
  // Cliente
  "client:created": void;
  "client:updated": void;
  "client:inactivated": void;
  // Produto
  "product:created": void;
  "product:updated": void;
  "product:deleted": void;
  // Cobrança
  "charge:created": void;
  "charge:updated": void;
  "charge:deleted": void;
  // Parcela
  "parcel:paid": void;
  "parcel:charged": void;
  "parcel:archived": void;
  "parcel:unarchived": void;
  "parcel:updated": void;
  "parcel:batch:paid": void;
}

/** Resultado padrão de operações */
export interface ResultadoOperacao<T = unknown> {
  sucesso: boolean;
  erro?: string;
  dados?: T;
}


=== ARQUIVO: types/parcel.types.ts ===

// types/parcel.types.ts — Tipos da entidade Parcela

import type { ParcelaStatus, EstadoAnterior } from "./common.types";

/** Registro completo de Parcela (como retornado pela API) */
export interface Parcela {
  id: string;
  cobrancaId: string;
  clienteId: string;
  numeroParcela: number;
  valor: number;
  valorPago: number | null;
  dataVencimento: string; // YYYY-MM-DD
  status: ParcelaStatus;
  dataPagamento: string | null; // YYYY-MM-DD
  dataCobrancaEnviada: string | null; // YYYY-MM-DD
  arquivada: boolean;
  created_date: string;
  updated_date: string;
}

/** Dados para criar uma nova parcela (gerada automaticamente) */
export interface ParcelaInput {
  cobrancaId: string;
  clienteId: string;
  numeroParcela: number;
  valor: number;
  dataVencimento: string; // YYYY-MM-DD
  status: "pendente";
}

/** Dados para atualizar uma parcela existente */
export interface ParcelaUpdate {
  status?: ParcelaStatus;
  valorPago?: number | null;
  dataPagamento?: string | null;
  dataCobrancaEnviada?: string | null;
  arquivada?: boolean;
}

/** Estado derivado de uma parcela calculado em tempo de execução */
export interface ParcelaComStatusCalculado extends Parcela {
  isAtrasada: boolean;
  diasAtraso: number;
  corAtraso: "laranja" | "vermelho" | null;
}

/** Export EstadoAnterior para conveniência */
export type { EstadoAnterior };


=== ARQUIVO: types/product.types.ts ===

// types/product.types.ts — Tipos da entidade ProdutoServico

/** Registro completo de ProdutoServico (como retornado pela API) */
export interface ProdutoServico {
  id: string;
  nome: string;
  valorPadrao: number | null;
  vezesUsado: number;
  created_date: string;
  updated_date: string;
}

/** Dados para criar um novo produto/serviço */
export interface ProdutoInput {
  nome: string;
  valorPadrao?: number;
  vezesUsado?: number;
}

/** Dados para atualizar um produto/serviço existente */
export interface ProdutoUpdate {
  nome?: string;
  valorPadrao?: number;
  vezesUsado?: number;
}


=== ARQUIVO: domain/billing-cycle.ts ===

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


=== ARQUIVO: domain/charge.rules.ts ===

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


=== ARQUIVO: domain/overdue.rules.ts ===

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


=== ARQUIVO: domain/parcel.rules.ts ===

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
 * REGRA (PRD v2.0 seção 7.5 — prevalece sobre o Plano v2.0):
 * true APENAS se TODAS as parcelas têm status = "pendente".
 * Se qualquer parcela tem status != "pendente" (cobrado, pago, pago_parcial),
 * a edição é limitada a observacoes e pixUtilizado.
 *
 * DIVERGÊNCIA REGISTRADA: O Plano v2.0 permitia cobrado, mas o PRD v2.0
 * diz que cobrado bloqueia a regeneração. Implementação segue o PRD.
 */
export function podeEditarCobranca(parcelas: Parcela[]): boolean {
  return parcelas.length > 0 && parcelas.every(p => p.status === 'pendente');
}

/**
 * Verifica se uma cobrança pode ser excluída.
 * REGRA (PRD v2.0 seção 7.5): true se nenhuma parcela tem status=pago,
 * status=pago_parcial, ou valorPago != null.
 * Parcelas com status=cobrado ou arquivado NÃO bloqueiam a exclusão.
 */
export function podeExcluirCobranca(parcelas: Parcela[]): boolean {
  return !parcelas.some(p => p.status === 'pago' || p.status === 'pago_parcial' || p.valorPago !== null);
}


=== ARQUIVO: domain/status.rules.ts ===

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


=== ARQUIVO: lib/date.utils.ts ===

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


=== ARQUIVO: lib/event-bus.ts ===

// lib/event-bus.ts — EventBus para comunicação desacoplada entre hooks (PRD v2.0 seção 5 — Performance)

import type { EventTypes } from "../types/common.types";

type EventKey = keyof EventTypes;
type Handler<T> = (payload: T) => void;

/**
 * EventBus simples para invalidação de cache entre hooks.
 * Sem polling, sem setInterval — os hooks invalidam cache quando um evento relevante é emitido.
 * Preparado para WebSocket/SSE no futuro: basta plugar um WebSocket que emite os mesmos eventos.
 */
class EventBus {
  private handlers: Map<EventKey, Set<Handler<unknown>>> = new Map();

  /** Registra um handler para um evento */
  on<K extends EventKey>(event: K, handler: Handler<EventTypes[K]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as Handler<unknown>);

    // Retorna função de unregister
    return () => this.off(event, handler);
  }

  /** Registra um handler que só dispara uma vez */
  once<K extends EventKey>(event: K, handler: Handler<EventTypes[K]>): () => void {
    const wrapper: Handler<EventTypes[K]> = (payload) => {
      handler(payload);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  /** Remove um handler específico */
  off<K extends EventKey>(event: K, handler: Handler<EventTypes[K]>): void {
    this.handlers.get(event)?.delete(handler as Handler<unknown>);
  }

  /** Emite um evento para todos os handlers registrados */
  emit<K extends EventKey>(event: K, payload?: EventTypes[K]): void {
    const set = this.handlers.get(event);
    if (set) {
      set.forEach((handler) => {
        try {
          handler(payload as unknown);
        } catch (e) {
          console.error(`[EventBus] Erro no handler do evento "${event}":`, e);
        }
      });
    }
  }

  /** Remove todos os handlers de um evento específico (ou todos se omitido) */
  clear(event?: EventKey): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }
}

/** Instância singleton do EventBus */
export const eventBus = new EventBus();

/** Re-export da classe para testes */
export { EventBus };


=== ARQUIVO: lib/format.utils.ts ===

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


=== ARQUIVO: lib/math.utils.ts ===

/**
 * Funções utilitárias matemáticas para o sistema de cobrança.
 */

/**
 * Divide um valor em parcelas de forma que a soma de todas as parcelas seja exatamente igual ao valor original.
 * Utiliza truncamento na base e joga a diferença centesimal na última parcela.
 * 
 * @param valor Valor total a ser parcelado
 * @param parcelas Quantidade de parcelas
 */
export function dividirValor(valor: number, parcelas: number): { valorBase: number, valorUltima: number } {
  if (parcelas <= 0) {
    throw new Error("A quantidade de parcelas deve ser maior que zero.");
  }
  
  const valorBase = Math.floor((valor / parcelas) * 100) / 100;
  const valorUltima = Math.round((valor - (valorBase * (parcelas - 1))) * 100) / 100;
  
  return { valorBase, valorUltima };
}


=== ARQUIVO: lib/validation.utils.ts ===

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


=== ARQUIVO: services/clipboard.service.ts ===

// services/clipboard.service.ts — Cópia para área de transferência

/**
 * Copia um texto para a área de transferência.
 * Usa navigator.clipboard quando disponível, com fallback para execCommand.
 *
 * @param texto - Texto a ser copiado
 * @returns true se copiou com sucesso, false caso contrário
 */
export async function copiar(texto: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // Fallback para execCommand se clipboard API falhar
  }

  // Fallback: criar textarea temporária e usar execCommand
  try {
    const textarea = document.createElement("textarea");
    textarea.value = texto;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const sucesso = document.execCommand("copy");
    document.body.removeChild(textarea);
    return sucesso;
  } catch {
    return false;
  }
}


=== ARQUIVO: services/whatsapp.service.ts ===

// services/whatsapp.service.ts — Geração de links e mensagens WhatsApp (PRD v2.0 seção 15)

import type { Parcela } from "../types/parcel.types";
import type { Cobranca } from "../types/charge.types";
import type { Cliente } from "../types/client.types";
import {
  TEMPLATE_HOJE,
  TEMPLATE_ATRASADA,
  TEMPLATE_PAGO_PARCIAL,
  BLOCO_PIX,
  selecionarTemplate,
} from "../config/messages.config";
import { formatarMoedaSimples } from "../lib/format.utils";
import { formatarDataCurta } from "../lib/date.utils";

/**
 * Gera um link wa.me para abrir o WhatsApp com mensagem pré-preenchida.
 * @param telefone - Telefone no formato DDI+DDD+número, apenas dígitos (ex: "5511987654321")
 * @param mensagem - Mensagem pré-preenchida
 * @returns URL completa: https://wa.me/5511987654321?text=...
 */
export function gerarLinkWhatsApp(telefone: string, mensagem: string): string {
  const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
  return url;
}

/**
 * Gera a mensagem de cobrança baseada no estado da parcela.
 * Seleciona o template apropriado e substitui os placeholders.
 *
 * @param parcela - Dados da parcela
 * @param cobranca - Dados da cobrança pai
 * @param cliente - Dados do cliente
 * @param dataHoje - Data de hoje no formato YYYY-MM-DD (para determinar se está atrasada)
 * @returns Mensagem formatada pronta para envio
 */
export function gerarMensagem(
  parcela: Parcela,
  cobranca: Cobranca,
  cliente: Cliente,
  dataHoje: string
): string {
  const isAtrasada = parcela.dataVencimento < dataHoje;
  const isPagoParcial = parcela.status === "pago_parcial";
  const tipo = selecionarTemplate(isAtrasada, isPagoParcial);

  // Formatações
  const valor = formatarMoedaSimples(parcela.valor);
  const valorTotal = formatarMoedaSimples(parcela.valor);
  const data = formatarDataCurta(parcela.dataVencimento);
  const saldoDevedor = formatarMoedaSimples(parcela.valor - (parcela.valorPago || 0));

  // Bloco PIX: apenas se forma=pix e pixUtilizado não vazio
  const blocoPix =
    cobranca.formaPagamento === "pix" && cobranca.pixUtilizado
      ? BLOCO_PIX.replace("[PIX]", cobranca.pixUtilizado)
      : "";

  // Selecionar template e substituir
  let template: string;
  switch (tipo) {
    case "hoje":
      template = TEMPLATE_HOJE;
      break;
    case "atrasada":
      template = TEMPLATE_ATRASADA;
      break;
    case "pago_parcial":
      template = TEMPLATE_PAGO_PARCIAL;
      break;
  }

  let mensagem = template
    .replace(/\[Nome\]/g, cliente.nome)
    .replace(/\[Valor\]/g, valor)
    .replace(/\[ValorTotal\]/g, valorTotal)
    .replace(/\[Produto\]/g, cobranca.nomeProdutoServico)
    .replace(/\[Data\]/g, data)
    .replace(/\[SaldoDevedor\]/g, saldoDevedor)
    .replace(/\[PIX\]/g, blocoPix);

  // Limpar linhas vazias restantes (quando não há bloco PIX, o placeholder [PIX] vira string vazia)
  mensagem = mensagem
    .replace(/\n\n\n/g, "\n\n") // colapsar linhas vazias duplas
    .replace(/\[PIX\]/g, "") // limpar placeholder residual
    .trim();

  return mensagem;
}


=== ARQUIVO: hooks/useBatchSelect.ts ===

// hooks/useBatchSelect.ts — Hook de seleção em lote (interno do M9)
// Gerencia seleção múltipla de parcelas no Dashboard.
// Plano v2.0 seção M9: hook construído junto com o Dashboard, não em M6.

import { useState, useCallback } from "react";

export function useBatchSelect() {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelecionadas(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isSelected = useCallback((id: string) => selecionadas.has(id), [selecionadas]);

  const limpar = useCallback(() => {
    setSelecionadas(new Set());
  }, []);

  const selecionarTodas = useCallback((ids: string[]) => {
    setSelecionadas(new Set(ids));
  }, []);

  return {
    selecionadas,
    quantidade: selecionadas.size,
    toggle,
    isSelected,
    limpar,
    selecionarTodas,
    temSelecao: selecionadas.size >= 2,
  };
}


=== ARQUIVO: hooks/useCharges.ts ===

// hooks/useCharges.ts — Hook de cobranças + parcelas por cliente com cache e invalidação (M6a)
//
// PRD v2.0 seção 5 — Performance: cache em memória, sem polling, sem setInterval.
// Limitado a COBRANCAS_RECENTES_LIMIT (5) por padrão. carregarTodas() para paginação.
// Invalidação por EventBus: charge:created, charge:updated, charge:deleted, parcel:updated.
//
// NOTA ARQUITETURAL: O hook busca cobranças via Cobranca.filter({ clienteId }) e para cada
// cobrança busca suas parcelas via Parcela.filter({ cobrancaId }). Os IDs das parcelas são
// preservados no retorno para uso futuro (ex: editarCobranca precisa de parcelasAtuaisIds).
//
// BT-20 FIX: todasCarregadas é espelhada em um ref para evitar ciclo entre useEffect e useCallback.
// fetchCobrancas lê do ref, não do state, então suas deps são apenas [clienteId].

import { useState, useEffect, useRef, useCallback } from "react";
import { Cobranca as CobrancaAPI, Parcela as ParcelaAPI } from "../api/entities";
import { eventBus } from "../lib/event-bus";
import { COBRANCAS_RECENTES_LIMIT } from "../config/app.config";
import type { Cobranca } from "../types/charge.types";
import type { Parcela } from "../types/parcel.types";

export interface CobrancaComParcelas extends Cobranca {
  parcelas: Parcela[];
}

export interface UseChargesResult {
  cobrancas: CobrancaComParcelas[];
  loading: boolean;
  error: string | null;
  carregarTodas: () => Promise<void>;
  todasCarregadas: boolean;
}

export function useCharges(clienteId: string | null): UseChargesResult {
  const [cobrancas, setCobrancas] = useState<CobrancaComParcelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todasCarregadas, setTodasCarregadas] = useState(false);
  const todasCarregadasRef = useRef(false);
  const cacheRef = useRef<CobrancaComParcelas[] | null>(null);

  const fetchCobrancas = useCallback(async (limite?: number) => {
    if (!clienteId) {
      setCobrancas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let cobrancasData: Cobranca[];
      if (limite) {
        cobrancasData = await CobrancaAPI.filter({ clienteId });
        // O SDK não suporta limit direto em filter, então slice aplicado após
        // Para paginação real, usar skip/limit quando disponível
        if (!todasCarregadasRef.current && limite > 0) {
          cobrancasData = cobrancasData.slice(0, limite);
        }
      } else {
        cobrancasData = await CobrancaAPI.filter({ clienteId });
        if (!todasCarregadasRef.current) {
          cobrancasData = cobrancasData.slice(0, COBRANCAS_RECENTES_LIMIT);
        }
      }

      // Para cada cobrança, buscar suas parcelas
      const cobrancasComParcelas: CobrancaComParcelas[] = await Promise.all(
        cobrancasData.map(async (cob) => {
          const parcelas = await ParcelaAPI.filter({ cobrancaId: cob.id });
          return { ...cob, parcelas };
        })
      );

      cacheRef.current = cobrancasComParcelas;
      setCobrancas(cobrancasComParcelas);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar cobranças";
      setError(msg);
      if (cacheRef.current) {
        setCobrancas(cacheRef.current);
      }
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    setTodasCarregadas(false);
    todasCarregadasRef.current = false;
    fetchCobrancas();
  }, [fetchCobrancas]);

  // Invalidação por EventBus
  useEffect(() => {
    if (!clienteId) return;
    const unsubs = [
      eventBus.on("charge:created", () => fetchCobrancas()),
      eventBus.on("charge:updated", () => fetchCobrancas()),
      eventBus.on("charge:deleted", () => fetchCobrancas()),
      eventBus.on("parcel:updated", () => fetchCobrancas()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [clienteId, fetchCobrancas]);

  const carregarTodas = useCallback(async () => {
    setTodasCarregadas(true);
    todasCarregadasRef.current = true;
    await fetchCobrancas();
  }, [fetchCobrancas]);

  return { cobrancas, loading, error, carregarTodas, todasCarregadas };
}


=== ARQUIVO: hooks/useClients.ts ===

// hooks/useClients.ts — Hook de listagem de clientes com cache e invalidação por EventBus (M6a)
//
// PRD v2.0 seção 5 — Performance: cache em memória, sem polling, sem setInterval.
// Invalidação por EventBus: client:created, client:updated, client:inactivated.

import { useState, useEffect, useRef, useCallback } from "react";
import { Cliente as ClienteAPI } from "../api/entities";
import { eventBus } from "../lib/event-bus";
import type { Cliente } from "../types/client.types";

export interface UseClientsResult {
  clientes: Cliente[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useClients(): UseClientsResult {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Cliente[] | null>(null);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ClienteAPI.list();
      cacheRef.current = data;
      setClientes(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar clientes";
      setError(msg);
      // Em caso de erro, manter cache anterior se existir
      if (cacheRef.current) {
        setClientes(cacheRef.current);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  // Invalidação por EventBus
  useEffect(() => {
    const unsubs = [
      eventBus.on("client:created", () => fetchClientes()),
      eventBus.on("client:updated", () => fetchClientes()),
      eventBus.on("client:inactivated", () => fetchClientes()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [fetchClientes]);

  return { clientes, loading, error, refresh: fetchClientes };
}


=== ARQUIVO: hooks/useConfig.ts ===

// hooks/useConfig.ts — Hook de configuração singleton com criação de defaults (M6a)
//
// PRD v2.0 seção 6 — Entidade 5: Configuracao é singleton (1 registro por usuário).
// Se não existir, cria com defaults diasTrabalhados = "1,2,3,4,5" (DIAS_TRABALHADOS_DEFAULT).
// salvar(diasTrabalhados: number[]) converte array para string antes de persistir.
// Retorna diasTrabalhados como number[] (parse da string armazenada).
//
// Invalidação por EventBus: charge:created, charge:updated, charge:deleted não afetam config.
// Nenhum evento invalida useConfig — ela só refaz busca no mount.

import { useState, useEffect, useRef, useCallback } from "react";
import { Configuracao as ConfiguracaoAPI } from "../api/entities";
import { DIAS_TRABALHADOS_DEFAULT } from "../config/app.config";

export interface ConfigData {
  id: string;
  diasTrabalhados: number[];
}

export interface UseConfigResult {
  config: ConfigData | null;
  loading: boolean;
  error: string | null;
  salvar: (diasTrabalhados: number[]) => Promise<boolean>;
}

/**
 * Converte string "1,2,3,4,5" para number[] [1,2,3,4,5]
 */
export function parseDiasTrabalhados(str: string): number[] {
  return str
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 0 && n <= 6);
}

/**
 * Converte number[] [1,2,3,4,5] para string "1,2,3,4,5"
 */
export function serializeDiasTrabalhados(dias: number[]): string {
  return dias.sort((a, b) => a - b).join(",");
}

export function useConfig(): UseConfigResult {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const configIdRef = useRef<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const existing = await ConfiguracaoAPI.list();
      if (existing.length > 0) {
        const record = existing[0];
        configIdRef.current = record.id;
        setConfig({
          id: record.id,
          diasTrabalhados: parseDiasTrabalhados(record.diasTrabalhados),
        });
      } else {
        // Criar com defaults
        const created = await ConfiguracaoAPI.create({
          diasTrabalhados: DIAS_TRABALHADOS_DEFAULT,
        });
        configIdRef.current = created.id;
        setConfig({
          id: created.id,
          diasTrabalhados: parseDiasTrabalhados(created.diasTrabalhados),
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar configuração";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const salvar = useCallback(async (diasTrabalhados: number[]): Promise<boolean> => {
    if (!configIdRef.current) {
      setError("Configuração ainda não carregada");
      return false;
    }
    try {
      const serialized = serializeDiasTrabalhados(diasTrabalhados);
      await ConfiguracaoAPI.update(configIdRef.current, { diasTrabalhados: serialized });
      setConfig({
        id: configIdRef.current,
        diasTrabalhados: [...diasTrabalhados].sort((a, b) => a - b),
      });
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar configuração";
      setError(msg);
      return false;
    }
  }, []);

  return { config, loading, error, salvar };
}


=== ARQUIVO: hooks/useDashboard.ts ===

// hooks/useDashboard.ts — Hook do Dashboard com cálculo de atrasados em tempo real (M6b)
//
// PRD v2.0 seção 5 — Performance: cache em memória, sem polling, sem setInterval.
// Busca parcelas não arquivadas com vencimento <= hoje + 30 dias.
// Filtra por clientes ativos. Calcula atrasadas via overdue.rules.
// Invalidado por: parcel:paid, parcel:charged, parcel:archived, charge:created, charge:deleted, client:inactivated.

import { useState, useEffect, useRef, useCallback } from "react";
import { Parcela as ParcelaAPI, Cliente as ClienteAPI } from "../api/entities";
import { eventBus } from "../lib/event-bus";
import { hoje, adicionarMeses } from "../lib/date.utils";
import { isAtrasada, diasAtraso, ordenarParcelas } from "../domain/overdue.rules";
import type { Parcela } from "../types/parcel.types";

export interface ProximoVencimento {
  dia: number;
  data: string;
  total: number;
  valor: number;
}

export interface Contadores {
  total: number;
  valor: number;
  atrasadas: number;
}

export interface UseDashboardResult {
  parcelasHoje: Parcela[];
  parcelasAtrasadas: Parcela[];
  proximosVencimentos: ProximoVencimento[];
  contadores: Contadores;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboard(): UseDashboardResult {
  const [parcelasHoje, setParcelasHoje] = useState<Parcela[]>([]);
  const [parcelasAtrasadas, setParcelasAtrasadas] = useState<Parcela[]>([]);
  const [proximosVencimentos, setProximosVencimentos] = useState<ProximoVencimento[]>([]);
  const [contadores, setContadores] = useState<Contadores>({ total: 0, valor: 0, atrasadas: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<{ parcelas: Parcela[]; dataReferencia: string } | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dataHoje = hoje();
      const limiteSuperior = adicionarMeses(dataHoje, 1); // hoje + 30 dias aprox

      // Buscar clientes ativos
      const todosClientes = await ClienteAPI.list();
      const clientesAtivosIds = new Set(
        todosClientes.filter((c: any) => c.ativo === true).map((c: any) => c.id)
      );

      // Buscar todas as parcelas e filtrar manualmente
      const todasParcelas = await ParcelaAPI.list({ limit: 500 });
      const parcelasFiltradas = todasParcelas.filter((p: any) =>
        !p.arquivada &&
        p.dataVencimento <= limiteSuperior &&
        p.status !== "pago" &&
        clientesAtivosIds.has(p.clienteId)
      ) as Parcela[];

      // Separar atrasadas e de hoje
      const atrasadas = parcelasFiltradas.filter((p) => isAtrasada(p, dataHoje));
      const hojeParcelas = parcelasFiltradas.filter(
        (p) => p.dataVencimento === dataHoje && !isAtrasada(p, dataHoje)
      );

      // Ordenar ambas as listas
      const atrasadasOrdenadas = ordenarParcelas(atrasadas, dataHoje);
      const hojeOrdenadas = ordenarParcelas(hojeParcelas, dataHoje);

      // Próximos vencimentos: próximos 3 dias COM parcelas após hoje
      const proximos: ProximoVencimento[] = [];
      const datasVistas = new Set<string>();

      // Coletar datas de vencimento futuras (após hoje, excluindo hoje)
      const datasFuturas = parcelasFiltradas
        .filter((p) => p.dataVencimento > dataHoje)
        .map((p) => p.dataVencimento)
        .sort();

      // Agrupar por data e pegar os primeiros 3 dias
      for (const data of datasFuturas) {
        if (datasVistas.has(data)) continue;
        datasVistas.add(data);

        const parcelasDoDia = parcelasFiltradas.filter((p) => p.dataVencimento === data);
        const dia = parseInt(data.split("-")[2], 10);
        const valor = parcelasDoDia.reduce((sum, p) => sum + p.valor, 0);

        proximos.push({ dia, data, total: parcelasDoDia.length, valor });

        if (proximos.length >= 3) break;
      }

      // Contadores
      const todasRelevantes = [...atrasadas, ...hojeParcelas];
      const total = todasRelevantes.length;
      const valor = todasRelevantes.reduce((sum, p) => sum + p.valor, 0);
      const numAtrasadas = atrasadas.length;

      cacheRef.current = { parcelas: parcelasFiltradas, dataReferencia: dataHoje };
      setParcelasHoje(hojeOrdenadas);
      setParcelasAtrasadas(atrasadasOrdenadas);
      setProximosVencimentos(proximos);
      setContadores({ total, valor, atrasadas: numAtrasadas });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar dashboard";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Invalidação por EventBus
  useEffect(() => {
    const unsubs = [
      eventBus.on("parcel:paid", () => fetchDashboard()),
      eventBus.on("parcel:charged", () => fetchDashboard()),
      eventBus.on("parcel:archived", () => fetchDashboard()),
      eventBus.on("parcel:unarchived", () => fetchDashboard()),
      eventBus.on("charge:created", () => fetchDashboard()),
      eventBus.on("charge:deleted", () => fetchDashboard()),
      eventBus.on("client:inactivated", () => fetchDashboard()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [fetchDashboard]);

  return {
    parcelasHoje,
    parcelasAtrasadas,
    proximosVencimentos,
    contadores,
    loading,
    error,
    refresh: fetchDashboard,
  };
}


=== ARQUIVO: hooks/useNewChargeWizard.ts ===

// hooks/useNewChargeWizard.ts — Estado do wizard de Nova Cobrança (M10a)
// Gerencia passo atual (1-4), dados preenchidos, validações por passo, e cancelar.

import { useState, useCallback, useMemo } from 'react';
import type { Cliente } from '../types/client.types';
import type { FormaPagamento } from '../types/common.types';

export interface WizardData {
  // Passo 1
  cliente: Cliente | null;
  produtoNome: string;        // nome do produto (do cadastro ou avulsa)
  produtoServicoId: string | null;  // null = venda avulsa
  valorPadrao: number | null;       // valor padrão do produto selecionado
  // Passo 2
  valor: string;              // string para preservar formatação
  formaPagamento: FormaPagamento | null;
  pixUtilizado: string;
  isParcelado: boolean;
  quantidadeParcelas: number;
  // Passo 3 (será usado no M10b, mas state existe aqui)
  diaVencimentoFixo: number;
  primeiroVencimento: string;
  observacoes: string;
  // Passo 4 (será usado no M10b)
}

const initialData: WizardData = {
  cliente: null,
  produtoNome: '',
  produtoServicoId: null,
  valorPadrao: null,
  valor: '',
  formaPagamento: null,
  pixUtilizado: '',
  isParcelado: false,
  quantidadeParcelas: 1,
  diaVencimentoFixo: 10,
  primeiroVencimento: '',
  observacoes: '',
};

export function useNewChargeWizard() {
  const [passoAtual, setPassoAtual] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [isDirty, setIsDirty] = useState(false);

  const updateData = useCallback((updates: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  const irParaPasso = useCallback((passo: number) => {
    if (passo >= 1 && passo <= 4) {
      setPassoAtual(passo);
    }
  }, []);

  const proximoPasso = useCallback(() => {
    setPassoAtual(p => Math.min(p + 1, 4));
  }, []);

  const voltarPasso = useCallback(() => {
    setPassoAtual(p => Math.max(p - 1, 1));
  }, []);

  const reset = useCallback(() => {
    setData(initialData);
    setPassoAtual(1);
    setIsDirty(false);
  }, []);

  // Validação do Passo 1: cliente e produto preenchidos
  const isPasso1Valid = useMemo(() => {
    return data.cliente !== null && data.produtoNome.trim().length > 0;
  }, [data.cliente, data.produtoNome]);

  // Validação do Passo 2: valor, forma de pagamento, PIX se PIX
  const isPasso2Valid = useMemo(() => {
    const valorClean = data.valor.replace(/\./g, '').replace(',', '.');
    const valorNum = parseFloat(valorClean);
    if (isNaN(valorNum) || valorNum <= 0 || valorNum > 999999.99) return false;
    if (data.formaPagamento === null) return false;
    if (data.formaPagamento === 'pix' && !data.pixUtilizado.trim()) return false;
    if (data.isParcelado && (data.quantidadeParcelas < 2 || data.quantidadeParcelas > 60)) return false;
    return true;
  }, [data.valor, data.formaPagamento, data.pixUtilizado, data.isParcelado, data.quantidadeParcelas]);

  const podeContinuar = useMemo(() => {
    if (passoAtual === 1) return isPasso1Valid;
    if (passoAtual === 2) return isPasso2Valid;
    return true;
  }, [passoAtual, isPasso1Valid, isPasso2Valid]);

  return {
    passoAtual,
    data,
    isDirty,
    podeContinuar,
    isPasso1Valid,
    isPasso2Valid,
    updateData,
    irParaPasso,
    proximoPasso,
    voltarPasso,
    reset,
  };
}


=== ARQUIVO: hooks/useParcelActions.ts ===

// hooks/useParcelActions.ts — Ações de parcela com undo (M6b)
//
// PRD v2.0 seção 5 — Performance: sem polling, sem setInterval.
// Ações: marcarPago, marcarParcial, cobrar, confirmarEnvio, arquivar, desarquivar, desfazerPagamento.
// Cada ação atualiza o backend via Parcela.update e emite evento do EventBus.
// marcarPago retorna função de undo que restaura o estado anterior.
//
// NOTA: marcarPago e marcarParcial fazem atualização direta (Plano v2.0 seção M6b),
// sem passar por proximoStatus. A máquina de estados (status.rules) valida transições
// mas a ação de pagamento é direta — o usuário pode marcar como pago de qualquer estado.

import { useCallback } from "react";
import { Parcela as ParcelaAPI } from "../api/entities";
import { eventBus } from "../lib/event-bus";
import { hoje } from "../lib/date.utils";
import { desfazerStatus } from "../domain/status.rules";
import { gerarLinkWhatsApp, gerarMensagem } from "../services/whatsapp.service";
import type { Parcela } from "../types/parcel.types";
import type { Cobranca } from "../types/charge.types";
import type { Cliente } from "../types/client.types";
import type { EstadoAnterior } from "../types/common.types";

export interface UseParcelActionsResult {
  marcarPago: (parcela: Parcela) => Promise<() => Promise<void>>;
  marcarParcial: (parcela: Parcela, valorRecebido: number) => Promise<void>;
  cobrar: (parcela: Parcela, cobranca: Cobranca, cliente: Cliente) => string;
  confirmarEnvio: (parcelaId: string) => Promise<void>;
  arquivar: (parcelaId: string) => Promise<void>;
  desarquivar: (parcelaId: string) => Promise<void>;
  desfazerPagamento: (parcelaId: string, estadoAnterior: EstadoAnterior) => Promise<void>;
}

export function useParcelActions(): UseParcelActionsResult {
  const marcarPago = useCallback(async (parcela: Parcela): Promise<() => Promise<void>> => {
    const estadoAnterior: EstadoAnterior = {
      status: parcela.status,
      valorPago: parcela.valorPago,
      dataPagamento: parcela.dataPagamento,
      dataCobrancaEnviada: parcela.dataCobrancaEnviada,
    };

    // Atualização direta (Plano v2.0 seção M6b)
    const dataHoje = hoje();
    await ParcelaAPI.update(parcela.id, {
      status: "pago",
      dataPagamento: dataHoje,
      valorPago: parcela.valor,
    } as any);
    eventBus.emit("parcel:paid");

    // Função de undo
    return async () => {
      const { camposAtualizar } = desfazerStatus(estadoAnterior);
      await ParcelaAPI.update(parcela.id, camposAtualizar as any);
      eventBus.emit("parcel:updated");
    };
  }, []);

  const marcarParcial = useCallback(async (parcela: Parcela, valorRecebido: number): Promise<void> => {
    const dataHoje = hoje();
    const valorPagoAtual = parcela.valorPago || 0;
    const novoValorPago = valorPagoAtual + valorRecebido;

    if (novoValorPago >= parcela.valor) {
      // Trata como total
      await ParcelaAPI.update(parcela.id, {
        status: "pago",
        dataPagamento: dataHoje,
        valorPago: parcela.valor,
      } as any);
    } else {
      await ParcelaAPI.update(parcela.id, {
        status: "pago_parcial",
        valorPago: novoValorPago,
      } as any);
    }
    eventBus.emit("parcel:updated");
  }, []);

  const cobrar = useCallback((parcela: Parcela, cobranca: Cobranca, cliente: Cliente): string => {
    const mensagem = gerarMensagem(parcela, cobranca, cliente, hoje());
    return gerarLinkWhatsApp(cliente.telefone, mensagem);
  }, []);

  const confirmarEnvio = useCallback(async (parcelaId: string): Promise<void> => {
    await ParcelaAPI.update(parcelaId, {
      status: "cobrado",
      dataCobrancaEnviada: hoje(),
    } as any);
    eventBus.emit("parcel:charged");
  }, []);

  const arquivar = useCallback(async (parcelaId: string): Promise<void> => {
    await ParcelaAPI.update(parcelaId, {
      arquivada: true,
      status: "arquivado",
    } as any);
    eventBus.emit("parcel:archived");
  }, []);

  const desarquivar = useCallback(async (parcelaId: string): Promise<void> => {
    // Buscar a parcela para inferir o status anterior
    const parcela = await ParcelaAPI.get(parcelaId) as any;
    let statusAnterior: string = "pendente";
    if (parcela.valorPago !== null && parcela.valorPago >= parcela.valor) {
      statusAnterior = "pago";
    } else if (parcela.valorPago !== null && parcela.valorPago > 0) {
      statusAnterior = "pago_parcial";
    } else if (parcela.dataCobrancaEnviada !== null) {
      statusAnterior = "cobrado";
    }

    await ParcelaAPI.update(parcelaId, {
      arquivada: false,
      status: statusAnterior,
    } as any);
    eventBus.emit("parcel:unarchived");
  }, []);

  const desfazerPagamento = useCallback(async (parcelaId: string, estadoAnterior: EstadoAnterior): Promise<void> => {
    const { camposAtualizar } = desfazerStatus(estadoAnterior);
    await ParcelaAPI.update(parcelaId, camposAtualizar as any);
    eventBus.emit("parcel:updated");
  }, []);

  return {
    marcarPago,
    marcarParcial,
    cobrar,
    confirmarEnvio,
    arquivar,
    desarquivar,
    desfazerPagamento,
  };
}


=== ARQUIVO: hooks/useProducts.ts ===

// hooks/useProducts.ts — Hook de listagem de produtos/serviços com cache e invalidação por EventBus (M6a)
//
// PRD v2.0 seção 5 — Performance: cache em memória, sem polling, sem setInterval.
// Ordenado por vezesUsado desc (mais usados primeiro).
// Invalidação por EventBus: product:created, product:updated, product:deleted, charge:created.

import { useState, useEffect, useRef, useCallback } from "react";
import { ProdutoServico as ProdutoAPI } from "../api/entities";
import { eventBus } from "../lib/event-bus";
import type { ProdutoServico } from "../types/product.types";

export interface UseProductsResult {
  produtos: ProdutoServico[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProducts(): UseProductsResult {
  const [produtos, setProdutos] = useState<ProdutoServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<ProdutoServico[] | null>(null);

  const fetchProdutos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ProdutoAPI.list({ sort: "-vezesUsado" });
      cacheRef.current = data;
      setProdutos(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar produtos";
      setError(msg);
      if (cacheRef.current) {
        setProdutos(cacheRef.current);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProdutos();
  }, [fetchProdutos]);

  // Invalidação por EventBus
  useEffect(() => {
    const unsubs = [
      eventBus.on("product:created", () => fetchProdutos()),
      eventBus.on("product:updated", () => fetchProdutos()),
      eventBus.on("product:deleted", () => fetchProdutos()),
      // charge:created atualiza vezesUsado do produto
      eventBus.on("charge:created", () => fetchProdutos()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [fetchProdutos]);

  return { produtos, loading, error, refresh: fetchProdutos };
}


=== ARQUIVO: components/BatchBar/BatchBar.tsx ===

// components/BatchBar/BatchBar.tsx — Barra de ações em lote (M9)
// Barra fixa no rodapé quando 2+ parcelas selecionadas.
// Plano v2.0 seção M9: "X selecionadas · [Marcar todas como pagas]"

import React from "react";

interface BatchBarProps {
  quantidade: number;
  onMarcarTodasPagas: () => void;
  onLimpar: () => void;
}

export const BatchBar = React.memo(function BatchBar({ quantidade, onMarcarTodasPagas, onLimpar }: BatchBarProps) {
  return React.createElement("div", {
    className: "fixed bottom-0 left-0 right-0 z-50 border-t bg-card text-card-foreground px-4 py-3 shadow-lg",
  },
    React.createElement("div", { className: "flex items-center justify-between max-w-2xl mx-auto" },
      React.createElement("div", { className: "flex items-center gap-3" },
        React.createElement("span", { className: "text-sm font-medium" }, `${quantidade} selecionada${quantidade > 1 ? "s" : ""}`),
        React.createElement("button", {
          onClick: onLimpar,
          className: "text-xs text-muted-foreground hover:text-foreground",
        }, "Limpar"),
      ),
      React.createElement("button", {
        onClick: onMarcarTodasPagas,
        className: "rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90",
      }, "Marcar todas como pagas"),
    ),
  );
});


=== ARQUIVO: components/BatchBar/index.ts ===

export { BatchBar } from "./BatchBar";


=== ARQUIVO: components/ChargeCard/ChargeCard.tsx ===

// components/ChargeCard/ChargeCard.tsx — Card de parcela expansível (M8a)
import React, { useState, useCallback } from "react";
import { StatusBadge } from "../StatusBadge";
import { formatarMoeda, formatarTelefone } from "../../lib/format.utils";
import { formatarDataCurta, hoje } from "../../lib/date.utils";
import { isAtrasada, diasAtraso } from "../../domain/overdue.rules";
import type { Parcela } from "../../types/parcel.types";
import type { Cobranca } from "../../types/charge.types";
import type { Cliente } from "../../types/client.types";

export interface ChargeCardProps {
  parcela: Parcela; cobranca?: Cobranca; cliente?: Cliente;
  onSelect?: (id: string) => void; onCharge?: (p: Parcela) => void;
  onConfirmSend?: (id: string) => void; onMarkPaid?: (id: string) => void;
  onMarkPartial?: (id: string, v: number) => void; onArchive?: (id: string) => void;
  isSelected?: boolean;
}

function ChargeCardBase(props: ChargeCardProps) {
  const { parcela, cobranca, cliente } = props;
  const [expandido, setExpandido] = useState(false);
  const [menuPago, setMenuPago] = useState(false);
  const [valorParcial, setValorParcial] = useState("");
  const dataHoje = hoje();
  const atrasada = isAtrasada(parcela, dataHoje);
  const dias = atrasada ? diasAtraso(parcela, dataHoje) : 0;
  const isPP = parcela.status === "pago_parcial";

  const handleMarcarTotal = useCallback(() => { setMenuPago(false); props.onMarkPaid?.(parcela.id); }, [parcela.id, props]);
  const handleMarcarParcial = useCallback(() => {
    const v = parseFloat(valorParcial.replace(",", "."));
    if (!isNaN(v) && v > 0) { setMenuPago(false); setValorParcial(""); props.onMarkPartial?.(parcela.id, v); }
  }, [valorParcial, props]);

  return React.createElement("div", { className: `rounded-lg border bg-card p-3 ${atrasada ? (dias <= 3 ? "border-orange-300" : "border-red-400") : ""}` },
    React.createElement("div", { className: "flex items-center gap-3" },
      props.onSelect ? React.createElement("button", {
        onClick: (e: any) => { e.stopPropagation(); props.onSelect?.(parcela.id); },
        className: `flex-shrink-0 w-5 h-5 rounded-full border-2 ${props.isSelected ? "bg-primary border-primary" : "border-input"}`,
      }) : null,
      React.createElement("div", { className: "flex-1 cursor-pointer min-w-0", onClick: () => setExpandido(!expandido) },
        React.createElement("span", { className: "font-medium text-foreground block truncate" }, cliente?.nome || "Cliente"),
        React.createElement("span", { className: "text-xs text-muted-foreground block truncate" }, `${cobranca?.nomeProdutoServico || "Produto"} · ${parcela.numeroParcela}/${cobranca?.quantidadeParcelas || 1}`),
      ),
      React.createElement("div", { className: "flex flex-col items-end gap-1" },
        React.createElement("span", { className: "font-semibold text-foreground" }, formatarMoeda(parcela.valor)),
        atrasada ? React.createElement("span", { className: "text-xs text-red-600" }, `Atrasada há ${dias} ${dias === 1 ? "dia" : "dias"}`)
          : isPP ? React.createElement("span", { className: "text-xs text-blue-600" }, `R$ ${formatarMoeda(parcela.valorPago || 0)} de ${formatarMoeda(parcela.valor)}`)
          : React.createElement(StatusBadge, { status: parcela.status }),
      ),
    ),
    parcela.status !== "pago" && parcela.status !== "arquivado" ? React.createElement("div", { className: "flex items-center gap-2 mt-2 flex-wrap" },
      parcela.status === "pendente" ? React.createElement("button", { onClick: (e: any) => { e.stopPropagation(); props.onCharge?.(parcela); }, className: "rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent" }, "💬 Cobrar") : null,
      parcela.status === "cobrado" ? React.createElement("button", { onClick: (e: any) => { e.stopPropagation(); props.onConfirmSend?.(parcela.id); }, className: "rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent" }, "✓ Confirmar envio") : null,
      !menuPago ? React.createElement("button", { onClick: (e: any) => { e.stopPropagation(); setMenuPago(true); }, className: "rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent" }, "Marcar pago")
        : React.createElement("div", { className: "flex items-center gap-1 flex-wrap" },
            React.createElement("button", { onClick: (e: any) => { e.stopPropagation(); handleMarcarTotal(); }, className: "rounded-md bg-emerald-100 text-emerald-700 px-2.5 py-1 text-xs font-medium" }, "Pagamento total"),
            React.createElement("button", { onClick: (e: any) => { e.stopPropagation(); setMenuPago(false); }, className: "text-xs text-muted-foreground px-1" }, "✕"),
            React.createElement("div", { className: "flex items-center gap-1" },
              React.createElement("input", { type: "text", value: valorParcial, onChange: (e: any) => setValorParcial(e.target.value), placeholder: "0,00", className: "w-20 rounded-md border px-2 py-1 text-xs", onClick: (e: any) => e.stopPropagation() }),
              React.createElement("button", { onClick: (e: any) => { e.stopPropagation(); handleMarcarParcial(); }, className: "rounded-md bg-blue-100 text-blue-700 px-2 py-1 text-xs font-medium" }, "Parcial"),
            ),
          ),
      expandido ? React.createElement("button", { onClick: (e: any) => { e.stopPropagation(); props.onArchive?.(parcela.id); }, className: "rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent" }, "Arquivar") : null,
    ) : null,
    expandido ? React.createElement("div", { className: "mt-2 pt-2 border-t space-y-1 text-xs text-muted-foreground" },
      cliente ? React.createElement("div", null, `Telefone: ${formatarTelefone(cliente.telefone)}`) : null,
      cobranca?.pixUtilizado ? React.createElement("div", null, `PIX: ${cobranca.pixUtilizado}`) : null,
      cobranca?.formaPagamento ? React.createElement("div", null, `Pagamento: ${cobranca.formaPagamento}`) : null,
      cobranca?.observacoes ? React.createElement("div", null, `Obs: ${cobranca.observacoes}`) : null,
      React.createElement("div", null, `Vencimento: ${formatarDataCurta(parcela.dataVencimento)}`),
    ) : null,
  );
}
export const ChargeCard = React.memo(ChargeCardBase);


=== ARQUIVO: components/ChargeCard/index.ts ===

export { ChargeCard } from "./ChargeCard";
export type { ChargeCardProps } from "./ChargeCard";


=== ARQUIVO: components/ClientAutocomplete/ClientAutocomplete.tsx ===

// components/ClientAutocomplete/ClientAutocomplete.tsx — Autocomplete de clientes (M8a)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { DEBOUNCE_SEARCH, CLIENTES_RECENTES_LIMIT } from "../../config/app.config";
import { formatarTelefone } from "../../lib/format.utils";
import type { Cliente } from "../../types/client.types";

export interface ClientAutocompleteProps {
  onSelect: (cliente: Cliente) => void;
  clientes: Cliente[];
  onCreateNew?: (nome: string, telefone: string) => Promise<Cliente>;
}

function ClientAutocompleteBase(props: ClientAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [mostraLista, setMostraLista] = useState(false);
  const [novoForm, setNovoForm] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_SEARCH);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const filtrados = debouncedQuery
    ? props.clientes.filter(c => c.nome.toLowerCase().includes(debouncedQuery.toLowerCase()))
    : [];
  const recentes = [...props.clientes].slice(0, CLIENTES_RECENTES_LIMIT);

  const handleSelecionar = useCallback((c: Cliente) => {
    props.onSelect(c);
    setQuery(""); setDebouncedQuery(""); setMostraLista(false); setNovoForm(false);
  }, [props]);

  const handleCriar = useCallback(async () => {
    if (!novoNome.trim() || !novoTelefone.trim() || !props.onCreateNew) return;
    const c = await props.onCreateNew(novoNome, novoTelefone);
    handleSelecionar(c);
    setNovoNome(""); setNovoTelefone("");
  }, [novoNome, novoTelefone, props, handleSelecionar]);

  return React.createElement("div", { className: "relative w-full" },
    React.createElement("input", {
      type: "text", value: query,
      onChange: (e: any) => { setQuery(e.target.value); setMostraLista(true); setNovoForm(false); },
      onFocus: () => setMostraLista(true),
      placeholder: "Buscar cliente...",
      className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
    }),
    mostraLista ? React.createElement("div", { className: "absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-80 overflow-auto" },
      !debouncedQuery && recentes.length > 0
        ? React.createElement("div", { className: "p-2" },
            React.createElement("span", { className: "text-xs font-medium text-muted-foreground px-1" }, "RECENTES"),
            ...recentes.map(c => React.createElement("button", {
              key: c.id, onClick: () => handleSelecionar(c),
              className: "flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent",
            }, React.createElement("span", null, c.nome), React.createElement("span", { className: "text-xs text-muted-foreground" }, formatarTelefone(c.telefone)))),
          )
        : null,
      debouncedQuery && filtrados.length > 0
        ? React.createElement("div", { className: "p-2" },
            ...filtrados.map(c => React.createElement("button", {
              key: c.id, onClick: () => handleSelecionar(c),
              className: "flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent",
            }, React.createElement("span", null, c.nome), React.createElement("span", { className: "text-xs text-muted-foreground" }, formatarTelefone(c.telefone)))),
          )
        : null,
      !novoForm ? React.createElement("button", {
        onClick: () => setNovoForm(true),
        className: "flex w-full items-center rounded px-2 py-1.5 text-sm font-medium text-primary border-t",
      }, "+ Cadastrar novo cliente") : null,
      novoForm ? React.createElement("div", { className: "p-2 space-y-2 border-t" },
        React.createElement("input", { type: "text", value: novoNome, onChange: (e: any) => setNovoNome(e.target.value), placeholder: "Nome", className: "w-full rounded-md border px-2 py-1.5 text-sm" }),
        React.createElement("input", { type: "text", value: novoTelefone, onChange: (e: any) => setNovoTelefone(e.target.value), placeholder: "Telefone", className: "w-full rounded-md border px-2 py-1.5 text-sm" }),
        React.createElement("div", { className: "flex gap-2" },
          React.createElement("button", { onClick: handleCriar, className: "rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm" }, "Salvar"),
          React.createElement("button", { onClick: () => setNovoForm(false), className: "rounded-md border px-3 py-1 text-sm" }, "Cancelar"),
        ),
      ) : null,
    ) : null,
  );
}
export const ClientAutocomplete = React.memo(ClientAutocompleteBase);


=== ARQUIVO: components/ClientAutocomplete/index.ts ===

export { ClientAutocomplete } from "./ClientAutocomplete";
export type { ClientAutocompleteProps } from "./ClientAutocomplete";


=== ARQUIVO: components/CopyButton/CopyButton.tsx ===

// components/CopyButton/CopyButton.tsx — Botão copiar para clipboard (PRD v2.0 seção 15)
//
// Reduz tempo da usuária: substitui o copiar manual da mensagem de cobrança
// do Word (selecionar texto, Ctrl+C, ir pro WhatsApp, Ctrl+V) por um único
// clique que copia o texto pronto e mostra feedback "Copiado!".

import React, { useState, useCallback } from "react";
import { copiar } from "../../services/clipboard.service";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

const COPIED_DURATION = 2000;

/**
 * Botão que copia `text` para a clipboard ao clicar.
 * Exibe "Copiado!" por 2 segundos como feedback.
 * Usa a função `copiar` de clipboard.service (navigator.clipboard + fallback execCommand).
 */
function CopyButtonBase({ text, label = "Copiar", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(async () => {
    const success = await copiar(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_DURATION);
    }
  }, [text]);

  const baseClass = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring px-3 py-1.5";
  const stateClass = copied
    ? "bg-emerald-100 text-emerald-700"
    : "bg-secondary text-secondary-foreground hover:bg-secondary/80";

  return React.createElement(
    "button",
    {
      onClick: handleClick,
      className: className || `${baseClass} ${stateClass}`,
    },
    copied ? "Copiado!" : label
  );
}

export const CopyButton = React.memo(CopyButtonBase);


=== ARQUIVO: components/CopyButton/index.ts ===

export { CopyButton} from './CopyButton';


=== ARQUIVO: components/DayBadge/DayBadge.tsx ===

// components/DayBadge/DayBadge.tsx — Badge de dia de vencimento fixo (PRD v2.0 seção 6)
//
// Reduz tempo da usuária: substitui a busca visual por seções no documento
// do Word — cada dia é identificado instantaneamente pelo badge.

import React from "react";

interface DayBadgeProps {
  dia: number;
  selected?: boolean;
}

/**
 * Badge que exibe "Dia XX" para o dia de vencimento fixo.
 * Suporta estado selecionado para uso em seletores e listas.
 */
function DayBadgeBase({ dia, selected = false }: DayBadgeProps) {
  const label = `Dia ${String(dia).padStart(2, "0")}`;
  const className = selected
    ? "inline-flex items-center rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"
    : "inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground";

  return React.createElement("span", { className }, label);
}

export const DayBadge = React.memo(DayBadgeBase);


=== ARQUIVO: components/DayBadge/index.ts ===

export { DayBadge} from './DayBadge';


=== ARQUIVO: components/EmptyState/EmptyState.tsx ===

// components/EmptyState/EmptyState.tsx — Estado vazio amigável (PRD v2.0 seção 8.1)
//
// Reduz tempo da usuária: substitui a confusão de abrir o Word e não saber
// se a lista está vazia ou se está olhando no lugar errado — mensagem clara
// de "nada para hoje" em vez de tela em branco.

import React from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
}

/**
 * Componente de estado vazio — exibe título e descrição opcional.
 * Usado quando não há parcelas para cobrar, lista de clientes vazia, etc.
 */
function EmptyStateBase({ title, description }: EmptyStateProps) {
  return React.createElement(
    "div",
    { className: "flex flex-col items-center justify-center py-12 px-4 text-center" },
    React.createElement("p", { className: "text-lg font-medium text-foreground" }, title),
    description ? React.createElement("p", { className: "mt-2 text-sm text-muted-foreground" }, description) : null
  );
}

export const EmptyState = React.memo(EmptyStateBase);


=== ARQUIVO: components/EmptyState/index.ts ===

export { EmptyState} from './EmptyState';


=== ARQUIVO: components/ParcelPreview/ParcelPreview.tsx ===

// components/ParcelPreview/ParcelPreview.tsx — Pré-visualização de parcelas (M8a)
import React, { useMemo } from "react";
import { gerarParcelas } from "../../domain/parcel.rules";
import { formatarMoeda } from "../../lib/format.utils";
import { formatarDataCurta } from "../../lib/date.utils";
import type { CobrancaInput } from "../../types/charge.types";

export interface ParcelPreviewProps {
  valor: number;
  quantidadeParcelas: number;
  primeiroVencimento: string;
  diaVencimentoFixo: number;
}

function ParcelPreviewBase(props: ParcelPreviewProps) {
  const parcelas = useMemo(() => {
    if (props.valor <= 0 || props.quantidadeParcelas < 1 || !props.primeiroVencimento) return [];
    const input: CobrancaInput = {
      clienteId: "preview",
      nomeProdutoServico: "Preview",
      valor: props.valor,
      formaPagamento: "pix",
      quantidadeParcelas: props.quantidadeParcelas,
      primeiroVencimento: props.primeiroVencimento,
      diaVencimentoFixo: props.diaVencimentoFixo as any,
    };
    return gerarParcelas(input);
  }, [props.valor, props.quantidadeParcelas, props.primeiroVencimento, props.diaVencimentoFixo]);

  const total = parcelas.reduce((sum, p) => sum + p.valor, 0);

  if (parcelas.length === 0) return null;

  return React.createElement("div", { className: "rounded-md border bg-card p-3 space-y-1" },
    ...parcelas.map((p, i) => React.createElement("div", {
      key: i,
      className: "flex items-center justify-between text-sm",
    },
      React.createElement("span", { className: "text-muted-foreground" },
        `${p.numeroParcela}. ${formatarMoeda(p.valor)}`),
      React.createElement("span", { className: "text-muted-foreground" },
        formatarDataCurta(p.dataVencimento)),
    )),
    React.createElement("div", { className: "flex items-center justify-between pt-2 border-t text-sm font-semibold" },
      React.createElement("span", null, "Total"),
      React.createElement("span", null, formatarMoeda(total)),
    ),
  );
}
export const ParcelPreview = React.memo(ParcelPreviewBase);


=== ARQUIVO: components/ParcelPreview/index.ts ===

export { ParcelPreview } from "./ParcelPreview";
export type { ParcelPreviewProps } from "./ParcelPreview";


=== ARQUIVO: components/PaymentSelector/PaymentSelector.tsx ===

// components/PaymentSelector/PaymentSelector.tsx — Seletor de forma de pagamento (M8a)
import React, { useState, useCallback } from "react";
import { MAX_PARCELAS, PIX_SUGESTOES_LIMIT } from "../../config/app.config";
import type { FormaPagamento } from "../../types/common.types";

export interface PaymentSelectorProps {
  value: FormaPagamento | null;
  onChange: (forma: FormaPagamento) => void;
  pixUtilizado?: string;
  onPixUtilizadoChange?: (v: string) => void;
  pixSugestoes?: string[];
  quantidadeParcelas: number;
  onQuantidadeParcelasChange: (qtd: number) => void;
}

const FORMAS: { value: FormaPagamento; label: string }[] = [
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão Crédito" },
  { value: "cartao_debito", label: "Cartão Débito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência" },
];

function PaymentSelectorBase(props: PaymentSelectorProps) {
  const [avista, setAvista] = useState(props.quantidadeParcelas <= 1);
  const [customParc, setCustomParc] = useState("");

  const handleSelectForma = useCallback((f: FormaPagamento) => {
    props.onChange(f);
  }, [props]);

  const handleToggleAvista = useCallback((isAvista: boolean) => {
    setAvista(isAvista);
    if (isAvista) { props.onQuantidadeParcelasChange(1); }
    else { props.onQuantidadeParcelasChange(2); setCustomParc(""); }
  }, [props]);

  const handleQuantidade = useCallback((qtd: number) => {
    props.onQuantidadeParcelasChange(qtd);
    setCustomParc("");
  }, [props]);

  const handleCustomParc = useCallback((v: string) => {
    setCustomParc(v);
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= 2 && n <= MAX_PARCELAS) { props.onQuantidadeParcelasChange(n); }
  }, [props]);

  const pixSugestoesFiltradas = (props.pixSugestoes || []).slice(0, PIX_SUGESTOES_LIMIT);

  return React.createElement("div", { className: "space-y-3" },
    // 5 botões de forma de pagamento
    React.createElement("div", { className: "grid grid-cols-3 gap-2" },
      ...FORMAS.map(f => React.createElement("button", {
        key: f.value,
        onClick: () => handleSelectForma(f.value),
        className: `rounded-md border px-3 py-2 text-sm font-medium ${props.value === f.value ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`,
      }, f.label)),
    ),
    // Campo PIX quando selecionado
    props.value === "pix" ? React.createElement("div", { className: "space-y-1" },
      React.createElement("label", { className: "text-xs text-muted-foreground" }, "PIX utilizado"),
      React.createElement("input", {
        type: "text",
        value: props.pixUtilizado || "",
        onChange: (e: any) => props.onPixUtilizadoChange?.(e.target.value),
        placeholder: "Chave PIX",
        list: "pix-sugestoes",
        className: "w-full rounded-md border px-3 py-2 text-sm",
      }),
      pixSugestoesFiltradas.length > 0 ? React.createElement("datalist", { id: "pix-sugestoes" },
        ...pixSugestoesFiltradas.map((s, i) => React.createElement("option", { key: i, value: s })),
      ) : null,
    ) : null,
    // Toggle À Vista / Parcelado
    React.createElement("div", { className: "flex gap-2" },
      React.createElement("button", {
        onClick: () => handleToggleAvista(true),
        className: `rounded-md border px-4 py-1.5 text-sm font-medium ${avista ? "bg-primary text-primary-foreground border-primary" : ""}`,
      }, "À Vista"),
      React.createElement("button", {
        onClick: () => handleToggleAvista(false),
        className: `rounded-md border px-4 py-1.5 text-sm font-medium ${!avista ? "bg-primary text-primary-foreground border-primary" : ""}`,
      }, "Parcelado"),
    ),
    // Seletor de parcelas
    !avista ? React.createElement("div", { className: "space-y-2" },
      React.createElement("div", { className: "flex flex-wrap gap-1.5" },
        ...Array.from({ length: 11 }, (_, i) => i + 2).map(n => React.createElement("button", {
          key: n,
          onClick: () => handleQuantidade(n),
          className: `rounded-md border px-3 py-1.5 text-sm ${props.quantidadeParcelas === n ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`,
        }, String(n))),
      ),
      React.createElement("div", { className: "flex items-center gap-2" },
        React.createElement("input", {
          type: "number",
          value: customParc,
          onChange: (e: any) => handleCustomParc(e.target.value),
          placeholder: "13-60",
          min: 13, max: MAX_PARCELAS,
          className: "w-20 rounded-md border px-2 py-1.5 text-sm",
        }),
        React.createElement("span", { className: "text-xs text-muted-foreground" }, `máx ${MAX_PARCELAS}`),
      ),
    ) : null,
  );
}
export const PaymentSelector = React.memo(PaymentSelectorBase);


=== ARQUIVO: components/PaymentSelector/index.ts ===

export { PaymentSelector } from "./PaymentSelector";
export type { PaymentSelectorProps } from "./PaymentSelector";


=== ARQUIVO: components/ProductAutocomplete/ProductAutocomplete.tsx ===

// components/ProductAutocomplete/ProductAutocomplete.tsx — Autocomplete de produtos (M8a)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { DEBOUNCE_SEARCH, PRODUTOS_SUGERIDOS_LIMIT } from "../../config/app.config";
import { formatarMoeda } from "../../lib/format.utils";
import { validarNomeProduto } from "../../lib/validation.utils";
import type { ProdutoServico } from "../../types/product.types";

export interface ProductAutocompleteProps {
  onSelect: (produto: ProdutoServico | { nome: string; produtoServicoId: null }) => void;
  produtos: ProdutoServico[];
  allowVendaAvulsa?: boolean;
  onCreateNew?: (nome: string, valor: number) => Promise<ProdutoServico>;
}

function ProductAutocompleteBase(props: ProductAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [mostraLista, setMostraLista] = useState(false);
  const [novoForm, setNovoForm] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [vendaAvulsa, setVendaAvulsa] = useState(false);
  const [avulsaNome, setAvulsaNome] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_SEARCH);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const ordenados = [...props.produtos].sort((a, b) => b.vezesUsado - a.vezesUsado);
  const filtrados = debouncedQuery
    ? ordenados.filter(p => p.nome.toLowerCase().includes(debouncedQuery.toLowerCase()))
    : [];
  const maisVendidos = ordenados.slice(0, PRODUTOS_SUGERIDOS_LIMIT);

  const handleSelecionar = useCallback((p: ProdutoServico) => {
    props.onSelect(p);
    setQuery(""); setDebouncedQuery(""); setMostraLista(false); setNovoForm(false); setVendaAvulsa(false);
  }, [props]);

  const handleCriar = useCallback(async () => {
    if (!novoNome.trim() || !props.onCreateNew) return;
    const v = parseFloat(novoValor.replace(",", ".")) || 0;
    const p = await props.onCreateNew(novoNome, v);
    handleSelecionar(p);
    setNovoNome(""); setNovoValor("");
  }, [novoNome, novoValor, props, handleSelecionar]);

  const handleAvulsa = useCallback(() => {
    if (!validarNomeProduto(avulsaNome)) return;
    props.onSelect({ nome: avulsaNome, produtoServicoId: null });
    setAvulsaNome(""); setVendaAvulsa(false); setMostraLista(false);
  }, [avulsaNome, props]);

  return React.createElement("div", { className: "relative w-full" },
    React.createElement("input", {
      type: "text", value: query,
      onChange: (e: any) => { setQuery(e.target.value); setMostraLista(true); setNovoForm(false); setVendaAvulsa(false); },
      onFocus: () => setMostraLista(true),
      placeholder: "Buscar produto...",
      className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
    }),
    mostraLista ? React.createElement("div", { className: "absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-80 overflow-auto" },
      !debouncedQuery && maisVendidos.length > 0
        ? React.createElement("div", { className: "p-2" },
            React.createElement("span", { className: "text-xs font-medium text-muted-foreground px-1" }, "MAIS VENDIDOS"),
            ...maisVendidos.map(p => React.createElement("button", {
              key: p.id, onClick: () => handleSelecionar(p),
              className: "flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent",
            }, React.createElement("span", null, p.nome), React.createElement("span", { className: "text-xs text-muted-foreground" }, p.valorPadrao ? formatarMoeda(p.valorPadrao) : "Sem valor"))),
          )
        : null,
      debouncedQuery && filtrados.length > 0
        ? React.createElement("div", { className: "p-2" },
            ...filtrados.map(p => React.createElement("button", {
              key: p.id, onClick: () => handleSelecionar(p),
              className: "flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent",
            }, React.createElement("span", null, p.nome), React.createElement("span", { className: "text-xs text-muted-foreground" }, p.valorPadrao ? formatarMoeda(p.valorPadrao) : "Sem valor"))),
          )
        : null,
      !novoForm && !vendaAvulsa ? React.createElement("div", { className: "border-t" },
        React.createElement("button", { onClick: () => setNovoForm(true), className: "flex w-full items-center rounded px-2 py-1.5 text-sm font-medium text-primary" }, "+ Cadastrar novo produto"),
        props.allowVendaAvulsa ? React.createElement("button", { onClick: () => setVendaAvulsa(true), className: "flex w-full items-center rounded px-2 py-1.5 text-sm font-medium text-primary" }, "Venda avulsa") : null,
      ) : null,
      novoForm ? React.createElement("div", { className: "p-2 space-y-2 border-t" },
        React.createElement("input", { type: "text", value: novoNome, onChange: (e: any) => setNovoNome(e.target.value), placeholder: "Nome do produto", className: "w-full rounded-md border px-2 py-1.5 text-sm" }),
        React.createElement("input", { type: "text", value: novoValor, onChange: (e: any) => setNovoValor(e.target.value), placeholder: "Valor padrão (opcional)", className: "w-full rounded-md border px-2 py-1.5 text-sm" }),
        React.createElement("div", { className: "flex gap-2" },
          React.createElement("button", { onClick: handleCriar, className: "rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm" }, "Salvar"),
          React.createElement("button", { onClick: () => setNovoForm(false), className: "rounded-md border px-3 py-1 text-sm" }, "Cancelar"),
        ),
      ) : null,
      vendaAvulsa ? React.createElement("div", { className: "p-2 space-y-2 border-t" },
        React.createElement("input", {
          type: "text", value: avulsaNome,
          onChange: (e: any) => setAvulsaNome(e.target.value),
          placeholder: "O que foi vendido? (mín. 3 caracteres)",
          className: "w-full rounded-md border px-2 py-1.5 text-sm",
        }),
        React.createElement("div", { className: "flex gap-2" },
          React.createElement("button", { onClick: handleAvulsa, disabled: !validarNomeProduto(avulsaNome), className: "rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm disabled:opacity-50" }, "Confirmar"),
          React.createElement("button", { onClick: () => setVendaAvulsa(false), className: "rounded-md border px-3 py-1 text-sm" }, "Cancelar"),
        ),
      ) : null,
    ) : null,
  );
}
export const ProductAutocomplete = React.memo(ProductAutocompleteBase);


=== ARQUIVO: components/ProductAutocomplete/index.ts ===

export { ProductAutocomplete } from "./ProductAutocomplete";
export type { ProductAutocompleteProps } from "./ProductAutocomplete";


=== ARQUIVO: components/SearchInput/SearchInput.tsx ===

// components/SearchInput/SearchInput.tsx — Input de busca com debounce (PRD v2.0 seção 8.2)
//
// Reduz tempo da usuária: substitui a busca visual no documento Word
// (Ctrl+F em um documento grande) por digitação com resultado instantâneo
// — o debounce de 300ms evita disparar busca a cada tecla.

import React, { useState, useEffect, useCallback, useRef } from "react";
import { DEBOUNCE_SEARCH } from "../../config/app.config";

interface SearchInputProps {
  placeholder?: string;
  onChange: (value: string) => void;
}

/**
 * Input de busca com debounce de 300ms (DEBOUNCE_SEARCH).
 * Ícone de lupa à esquerda e botão limpar (X) à direita.
 * O callback onChange só dispara após o debounce, não a cada tecla.
 */
function SearchInputBase({ placeholder = "Buscar...", onChange }: SearchInputProps) {
  const [value, setValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedChange = useCallback(
    (val: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(val);
      }, DEBOUNCE_SEARCH);
    },
    [onChange]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleClear = () => {
    setValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onChange("");
  };

  return React.createElement(
    "div",
    { className: "relative flex items-center w-full" },
    // Ícone de lupa
    React.createElement(
      "span",
      { className: "absolute left-3 text-muted-foreground pointer-events-none" },
      React.createElement(
        "svg",
        { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 },
        React.createElement("circle", { cx: 11, cy: 11, r: 8 }),
        React.createElement("line", { x1: 21, y1: 21, x2: 16.65, y2: 16.65 })
      )
    ),
    // Input
    React.createElement("input", {
      type: "text",
      value,
      placeholder,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
        debouncedChange(e.target.value);
      },
      className: "w-full rounded-md border border-input bg-background pl-9 pr-8 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    }),
    // Botão limpar
    value
      ? React.createElement(
          "button",
          {
            onClick: handleClear,
            className: "absolute right-2 text-muted-foreground hover:text-foreground transition-colors",
            "aria-label": "Limpar busca",
          },
          React.createElement(
            "svg",
            { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 },
            React.createElement("line", { x1: 18, y1: 6, x2: 6, y2: 18 }),
            React.createElement("line", { x1: 6, y1: 6, x2: 18, y2: 18 })
          )
        )
      : null
  );
}

export const SearchInput = React.memo(SearchInputBase);


=== ARQUIVO: components/SearchInput/index.ts ===

export { SearchInput} from './SearchInput';


=== ARQUIVO: components/StatusBadge/StatusBadge.tsx ===

// components/StatusBadge/StatusBadge.tsx — Badge de status da parcela (PRD v2.0 seção 10.4)
//
// Reduz tempo da usuária: substitui a releitura manual da lista no Word
// para saber quem pagou — a cor do badge comunica o status instantaneamente.

import React from "react";
import type { ParcelaStatus } from "../../types/common.types";

interface StatusBadgeProps {
  status: ParcelaStatus;
  diasAtraso?: number;
}

/**
 * Badge que exibe o status da parcela com cor semântica.
 *
 * Cores (PRD v2.0 seção 10.4):
 * - pendente: neutro/muted
 * - cobrado: amarelo/warning
 * - pago: verde/success
 * - pago_parcial: azul/info
 * - atrasado 1-3 dias: laranja
 * - atrasado 4+ dias: vermelho/destructive
 */
function StatusBadgeBase({ status, diasAtraso }: StatusBadgeProps) {
  const isAtrasado = status === "pendente" || status === "cobrado" || status === "pago_parcial"
    ? diasAtraso !== undefined && diasAtraso > 0
    : false;

  let label: string;
  let className: string;

  if (isAtrasado) {
    if (diasAtraso! <= 3) {
      label = `Atrasada há ${diasAtraso} ${diasAtraso === 1 ? "dia" : "dias"}`;
      className = "inline-flex items-center rounded-md bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700";
    } else {
      label = `Atrasada há ${diasAtraso} dias`;
      className = "inline-flex items-center rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700";
    }
  } else {
    switch (status) {
      case "pendente":
        label = "Pendente";
        className = "inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground";
        break;
      case "cobrado":
        label = "Cobrado";
        className = "inline-flex items-center rounded-md bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-700";
        break;
      case "pago":
        label = "Pago";
        className = "inline-flex items-center rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700";
        break;
      case "pago_parcial":
        label = "Pago parcial";
        className = "inline-flex items-center rounded-md bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700";
        break;
      case "arquivado":
        label = "Arquivado";
        className = "inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground/60";
        break;
      default:
        label = status;
        className = "inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground";
    }
  }

  return React.createElement("span", { className }, label);
}

export const StatusBadge = React.memo(StatusBadgeBase);


=== ARQUIVO: components/StatusBadge/index.ts ===

export { StatusBadge} from './StatusBadge';


=== ARQUIVO: components/UndoToast/UndoToast.tsx ===

// components/UndoToast/UndoToast.tsx — Toast com ação de desfazer (PRD v2.0 seção 10.6)
//
// Reduz tempo da usuária: substitui a edição manual do documento Word
// quando a usuária marca alguém como pago por engano — basta clicar
// [Desfazer] dentro de 5 segundos e o status volta ao anterior.

import React, { useEffect, useState } from "react";
import { UNDO_TIMEOUT } from "../../config/app.config";

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

/**
 * Toast fixo no rodapé que exibe uma mensagem e um botão [Desfazer].
 * Desaparece automaticamente após UNDO_TIMEOUT (5s) — usa setTimeout, NÃO setInterval.
 * O botão [Desfazer] chama onUndo e depois onDismiss.
 */
function UndoToastBase({ message, onUndo, onDismiss }: UndoToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, UNDO_TIMEOUT);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  const handleUndo = () => {
    setVisible(false);
    onUndo();
    onDismiss();
  };

  return React.createElement(
    "div",
    {
      className: "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg bg-card border px-4 py-3 shadow-lg",
      role: "status",
      "aria-live": "polite",
    },
    React.createElement("span", { className: "text-sm text-foreground" }, message),
    React.createElement(
      "button",
      {
        onClick: handleUndo,
        className: "text-sm font-medium text-primary hover:text-primary/80 transition-colors",
      },
      "Desfazer"
    )
  );
}

export const UndoToast = React.memo(UndoToastBase);


=== ARQUIVO: components/UndoToast/index.ts ===

export { UndoToast} from './UndoToast';


=== ARQUIVO: components/WizardProgress/WizardProgress.tsx ===

// components/WizardProgress/WizardProgress.tsx — Barra de progresso 4 passos
import React from 'react';

export interface WizardProgressProps {
  passoAtual: number;  // 1-4
  totalPassos?: number; // default 4
}

export const WizardProgress = React.memo(function WizardProgress({ passoAtual, totalPassos = 4 }: WizardProgressProps) {
  const passos = Array.from({ length: totalPassos }, (_, i) => i + 1);

  return React.createElement('div', { className: 'flex items-center justify-center gap-2 py-2' },
    ...passos.map(p => {
      const isCompleted = p < passoAtual;
      const isCurrent = p === passoAtual;
      const dotClass = isCompleted
        ? 'w-2.5 h-2.5 rounded-full bg-primary'
        : isCurrent
        ? 'w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-primary/30'
        : 'w-2.5 h-2.5 rounded-full bg-muted-foreground/30';

      if (p < totalPassos) {
        return React.createElement(React.Fragment, { key: p },
          React.createElement('div', { className: dotClass }),
          React.createElement('div', {
            className: `w-8 h-0.5 ${p < passoAtual ? 'bg-primary' : 'bg-muted-foreground/20'}`
          })
        );
      }
      return React.createElement('div', { key: p, className: dotClass });
    })
  );
});


=== ARQUIVO: components/WizardProgress/index.ts ===

export { WizardProgress } from './WizardProgress';
export type { WizardProgressProps } from './WizardProgress';


=== ARQUIVO: pages/ClientsPage.tsx ===

// pages/ClientsPage.tsx — Página de Clientes (M11)
// Listagem, busca, edição inline, histórico de cobranças, inativar/reativar, desfazer pagamento.
import React, { useState, useCallback } from "react";
import { useClients } from "../hooks/useClients";
import { useCharges, type CobrancaComParcelas } from "../hooks/useCharges";
import { useParcelActions } from "../hooks/useParcelActions";
import { eventBus } from "../lib/event-bus";
import { formatarTelefone, formatarMoeda } from "../lib/format.utils";
import { formatarDataCurta } from "../lib/date.utils";
import { podeEditarCobranca, podeExcluirCobranca } from "../domain/parcel.rules";
import { SearchInput } from "../components/SearchInput";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { Cliente as ClienteAPI, Cobranca as CobrancaAPI } from "../api/entities";
import type { Cliente } from "../types/client.types";
import type { Parcela } from "../types/parcel.types";
import type { EstadoAnterior } from "../types/common.types";

export function ClientsPage() {
  const { clientes, loading, error, refresh } = useClients();
  const [busca, setBusca] = useState("");
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [novoForm, setNovoForm] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [eNome, setENome] = useState("");
  const [eTel, setETel] = useState("");
  const [eObs, setEObs] = useState("");

  const filtrados = busca
    ? clientes.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()) || c.telefone.includes(busca.replace(/\D/g, "")))
    : clientes;

  const handleInativar = useCallback(async (c: Cliente) => {
    if (!window.confirm(`Inativar ${c.nome}?`)) return;
    await ClienteAPI.update(c.id, { ativo: false });
    eventBus.emit("client:inactivated");
    await refresh();
  }, [refresh]);

  const handleReativar = useCallback(async (c: Cliente) => {
    await ClienteAPI.update(c.id, { ativo: true });
    eventBus.emit("client:updated");
    await refresh();
  }, [refresh]);

  const handleSalvar = useCallback(async (c: Cliente) => {
    await ClienteAPI.update(c.id, { nome: eNome, telefone: eTel, observacoes: eObs });
    eventBus.emit("client:updated");
    setEditandoId(null);
    await refresh();
  }, [eNome, eTel, eObs, refresh]);

  const handleCriar = useCallback(async () => {
    if (!novoNome.trim() || !novoTelefone.trim()) return;
    await ClienteAPI.create({ nome: novoNome, telefone: novoTelefone, observacoes: "", ativo: true });
    eventBus.emit("client:created");
    setNovoForm(false); setNovoNome(""); setNovoTelefone("");
    await refresh();
  }, [novoNome, novoTelefone, refresh]);

  const handleExcluirCobranca = useCallback(async (id: string) => {
    if (!window.confirm("Excluir cobrança?")) return;
    await CobrancaAPI.delete(id);
    eventBus.emit("charge:deleted");
  }, []);

  if (loading) return React.createElement("div", { className: "flex justify-center py-12" }, React.createElement("p", { className: "text-muted-foreground" }, "Carregando..."));
  if (error) return React.createElement("div", { className: "flex justify-center py-12" }, React.createElement("p", { className: "text-destructive" }, `Erro: ${error}`));

  return React.createElement("div", { className: "flex flex-col gap-4 p-4 max-w-2xl mx-auto" },
    React.createElement("div", { className: "flex items-center justify-between" },
      React.createElement("h1", { className: "text-xl font-semibold" }, "Clientes"),
      React.createElement("button", { onClick: () => setNovoForm(!novoForm), className: "rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium" }, "+ Novo"),
    ),
    novoForm ? React.createElement("div", { className: "rounded-lg border bg-card p-3 space-y-2" },
      React.createElement("input", { type: "text", value: novoNome, onChange: (e: any) => setNovoNome(e.target.value), placeholder: "Nome", className: "w-full rounded-md border px-3 py-2 text-sm" }),
      React.createElement("input", { type: "text", value: novoTelefone, onChange: (e: any) => setNovoTelefone(e.target.value), placeholder: "Telefone", className: "w-full rounded-md border px-3 py-2 text-sm" }),
      React.createElement("div", { className: "flex gap-2" },
        React.createElement("button", { onClick: handleCriar, className: "rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm" }, "Salvar"),
        React.createElement("button", { onClick: () => { setNovoForm(false); setNovoNome(""); setNovoTelefone(""); }, className: "rounded-md border px-3 py-1 text-sm" }, "Cancelar"),
      ),
    ) : null,
    React.createElement(SearchInput, { placeholder: "Buscar por nome ou telefone...", onChange: setBusca }),
    filtrados.length === 0
      ? React.createElement(EmptyState, { title: "Nenhum cliente", description: busca ? "Tente outra busca" : "Clique em + Novo" })
      : React.createElement("div", { className: "flex flex-col gap-2" },
          ...filtrados.map(c => React.createElement(ClientCard, {
            key: c.id, cliente: c,
            expandido: expandidoId === c.id, editando: editandoId === c.id,
            eNome, eTel, eObs,
            onToggle: () => setExpandidoId(expandidoId === c.id ? null : c.id),
            onEdit: () => { setENome(c.nome); setETel(c.telefone); setEObs(c.observacoes || ""); setEditandoId(c.id); },
            onSave: () => handleSalvar(c), onCancel: () => setEditandoId(null),
            onInativar: () => handleInativar(c), onReativar: () => handleReativar(c),
            onSetENome: setENome, onSetETel: setETel, onSetEObs: setEObs,
            onExcluirCobranca: handleExcluirCobranca,
          })),
        ),
  );
}

interface ClientCardProps {
  cliente: Cliente; expandido: boolean; editando: boolean;
  eNome: string; eTel: string; eObs: string;
  onToggle: () => void; onInativar: () => void; onReativar: () => void;
  onEdit: () => void; onSave: () => void; onCancel: () => void;
  onSetENome: (v: string) => void; onSetETel: (v: string) => void; onSetEObs: (v: string) => void;
  onExcluirCobranca: (id: string) => void;
}

function ClientCard(props: ClientCardProps) {
  const { cliente, expandido, editando } = props;
  const { cobrancas, loading: cLoading, carregarTodas, todasCarregadas } = useCharges(expandido ? cliente.id : null);
  const parcelActions = useParcelActions();
  const [cobExpandida, setCobExpandida] = useState<string | null>(null);

  return React.createElement("div", { className: "rounded-lg border bg-card", onClick: props.onToggle },
    React.createElement("div", { className: "flex items-center justify-between p-3 cursor-pointer" },
      React.createElement("div", { className: "flex flex-col" },
        React.createElement("span", { className: "font-medium" }, cliente.nome),
        React.createElement("span", { className: "text-sm text-muted-foreground" }, formatarTelefone(cliente.telefone)),
      ),
      React.createElement("div", { className: "flex items-center gap-2" },
        React.createElement("span", {
          className: cliente.ativo ? "rounded-md bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700" : "rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground",
          onClick: (e: any) => { e.stopPropagation(); if (!cliente.ativo) props.onReativar(); },
        }, cliente.ativo ? "Ativo" : "Inativo"),
        cobrancas.length > 0 ? React.createElement("span", { className: "text-xs text-muted-foreground" }, `${cobrancas.length} cobrança(s)`) : null,
      ),
    ),
    expandido ? React.createElement("div", { className: "border-t p-3 space-y-3", onClick: (e: any) => e.stopPropagation() },
      editando
        ? React.createElement("div", { className: "space-y-2" },
            React.createElement("input", { type: "text", value: props.eNome, onChange: (e: any) => props.onSetENome(e.target.value), placeholder: "Nome", className: "w-full rounded-md border px-3 py-2 text-sm" }),
            React.createElement("input", { type: "text", value: props.eTel, onChange: (e: any) => props.onSetETel(e.target.value), placeholder: "Telefone", className: "w-full rounded-md border px-3 py-2 text-sm" }),
            React.createElement("textarea", { value: props.eObs, onChange: (e: any) => props.onSetEObs(e.target.value), placeholder: "Observações", rows: 2, className: "w-full rounded-md border px-3 py-2 text-sm" }),
            React.createElement("div", { className: "flex gap-2" },
              React.createElement("button", { onClick: props.onSave, className: "rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm" }, "Salvar"),
              React.createElement("button", { onClick: props.onCancel, className: "rounded-md border px-3 py-1 text-sm" }, "Cancelar"),
            ),
          )
        : React.createElement("div", { className: "space-y-1" },
            cliente.observacoes ? React.createElement("p", { className: "text-sm text-muted-foreground" }, cliente.observacoes) : null,
            React.createElement("div", { className: "flex gap-2" },
              React.createElement("button", { onClick: props.onEdit, className: "rounded-md border px-3 py-1 text-xs" }, "Editar"),
              cliente.ativo
                ? React.createElement("button", { onClick: props.onInativar, className: "rounded-md border px-3 py-1 text-xs text-destructive" }, "Inativar")
                : React.createElement("button", { onClick: props.onReativar, className: "rounded-md border px-3 py-1 text-xs text-emerald-600" }, "Reativar"),
            ),
          ),
      cLoading
        ? React.createElement("p", { className: "text-sm text-muted-foreground" }, "Carregando cobranças...")
        : cobrancas.length === 0
          ? React.createElement("p", { className: "text-sm text-muted-foreground" }, "Nenhuma cobrança")
          : React.createElement("div", { className: "space-y-2" },
              ...cobrancas.map((cob: CobrancaComParcelas) => {
                const isExp = cobExpandida === cob.id;
                const pEdit = podeEditarCobranca(cob.parcelas);
                const pExc = podeExcluirCobranca(cob.parcelas);
                return React.createElement("div", { key: cob.id, className: "rounded-md border p-2" },
                  React.createElement("div", { className: "flex items-center justify-between cursor-pointer", onClick: (e: any) => { e.stopPropagation(); setCobExpandida(isExp ? null : cob.id); } },
                    React.createElement("div", { className: "flex flex-col" },
                      React.createElement("span", { className: "text-sm font-medium" }, cob.nomeProdutoServico),
                      React.createElement("span", { className: "text-xs text-muted-foreground" }, `${cob.quantidadeParcelas}x · ${formatarMoeda(cob.valor)}`),
                    ),
                    React.createElement("div", { className: "flex gap-1" },
                      pEdit ? React.createElement("button", { onClick: (e: any) => e.stopPropagation(), className: "rounded border px-2 py-0.5 text-xs" }, "Editar") : null,
                      pExc ? React.createElement("button", { onClick: (e: any) => { e.stopPropagation(); props.onExcluirCobranca(cob.id); }, className: "rounded border px-2 py-0.5 text-xs text-destructive" }, "Excluir") : null,
                    ),
                  ),
                  isExp ? React.createElement("div", { className: "mt-2 space-y-1 pl-2" },
                    ...cob.parcelas.map((par: Parcela) => {
                      const isPago = par.status === "pago" || par.status === "pago_parcial";
                      return React.createElement("div", { key: par.id, className: "flex items-center justify-between text-xs" },
                        React.createElement("span", null, `${par.numeroParcela}. ${formatarMoeda(par.valor)} · ${formatarDataCurta(par.dataVencimento)}`),
                        React.createElement("div", { className: "flex items-center gap-1" },
                          React.createElement(StatusBadge, { status: par.status }),
                          isPago ? React.createElement("button", {
                            onClick: async (e: any) => {
                              e.stopPropagation();
                              const est: EstadoAnterior = { status: par.status, valorPago: par.valorPago, dataPagamento: par.dataPagamento, dataCobrancaEnviada: par.dataCobrancaEnviada };
                              await parcelActions.desfazerPagamento(par.id, est);
                            },
                            className: "rounded border px-1.5 py-0.5 text-xs", title: "Desfazer pagamento",
                          }, "↺") : null,
                        ),
                      );
                    }),
                  ) : null,
                );
              }),
              !todasCarregadas && cobrancas.length >= 5
                ? React.createElement("button", { onClick: (e: any) => { e.stopPropagation(); carregarTodas(); }, className: "text-sm text-primary w-full text-center py-1" }, "Ver todas as cobranças")
                : null,
            ),
    ) : null,
  );
}


=== ARQUIVO: pages/DashboardPage.tsx ===

// pages/DashboardPage.tsx — Dashboard principal (M9)
// PRD v2.0 seção 7.3 — Tela principal: quem cobrar hoje.
// Ordenação: atrasadas (vermelhas 4+ dias, laranjas 1-3), cobradas hoje, pendentes hoje.
// Seleção em lote, busca, próximos vencimentos com overlay, undo toast.

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useDashboard } from "../hooks/useDashboard";
import { useParcelActions } from "../hooks/useParcelActions";
import { useBatchSelect } from "../hooks/useBatchSelect";
import { ChargeCard } from "../components/ChargeCard";
import { BatchBar } from "../components/BatchBar";
import { SearchInput } from "../components/SearchInput";
import { EmptyState } from "../components/EmptyState";
import { UndoToast } from "../components/UndoToast";
import { Cliente as ClienteAPI, Cobranca as CobrancaAPI } from "../api/entities";
import { hoje, formatarDataBR } from "../lib/date.utils";
import { formatarMoeda } from "../lib/format.utils";
import { diasAtraso } from "../domain/overdue.rules";
import type { Parcela } from "../types/parcel.types";
import type { Cobranca } from "../types/charge.types";
import type { Cliente } from "../types/client.types";
import type { EstadoAnterior } from "../types/parcel.types";

interface DashboardItem {
  parcela: Parcela;
  cobranca?: Cobranca;
  cliente?: Cliente;
}

export function DashboardPage() {
  const { parcelasHoje, parcelasAtrasadas, proximosVencimentos, contadores, loading, error, refresh } = useDashboard();
  const { marcarPago, marcarParcial, cobrar, confirmarEnvio, arquivar } = useParcelActions();
  const batch = useBatchSelect();

  const [busca, setBusca] = useState("");
  const [dadosCobrancas, setDadosCobrancas] = useState<Record<string, Cobranca>>({});
  const [dadosClientes, setDadosClientes] = useState<Record<string, Cliente>>({});
  const [undoToast, setUndoToast] = useState<{ message: string; onUndo: () => void } | null>(null);
  const [overlayVencimento, setOverlayVencimento] = useState<{ dia: number; data: string; total: number; valor: number; parcelas: DashboardItem[] } | null>(null);

  // Buscar cobranças e clientes para preencher os cards
  useEffect(() => {
    let cancelled = false;
    async function fetchDados() {
      const todasParcelas = [...parcelasAtrasadas, ...parcelasHoje];
      if (todasParcelas.length === 0) return;

      const cobrancaIds = [...new Set(todasParcelas.map(p => p.cobrancaId))];
      const clienteIds = [...new Set(todasParcelas.map(p => p.clienteId))];

      const cobrancasMap: Record<string, Cobranca> = {};
      const clientesMap: Record<string, Cliente> = {};

      // Buscar cobranças individualmente (list() retorna vazio no SDK backend)
      for (const id of cobrancaIds) {
        try {
          const cob = await CobrancaAPI.get(id) as Cobranca;
          if (cob) cobrancasMap[id] = cob;
        } catch { /* ignore */ }
      }

      // Buscar clientes individualmente
      for (const id of clienteIds) {
        try {
          const cli = await ClienteAPI.get(id) as Cliente;
          if (cli) clientesMap[id] = cli;
        } catch { /* ignore */ }
      }

      if (!cancelled) {
        setDadosCobrancas(cobrancasMap);
        setDadosClientes(clientesMap);
      }
    }
    fetchDados();
    return () => { cancelled = true; };
  }, [parcelasHoje, parcelasAtrasadas]);

  // Construir lista combinada de items
  const allItems: DashboardItem[] = useMemo(() => {
    const atrasadas: DashboardItem[] = parcelasAtrasadas.map(p => ({
      parcela: p,
      cobranca: dadosCobrancas[p.cobrancaId],
      cliente: dadosClientes[p.clienteId],
    }));
    const hojes: DashboardItem[] = parcelasHoje.map(p => ({
      parcela: p,
      cobranca: dadosCobrancas[p.cobrancaId],
      cliente: dadosClientes[p.clienteId],
    }));
    return [...atrasadas, ...hojes];
  }, [parcelasAtrasadas, parcelasHoje, dadosCobrancas, dadosClientes]);

  // Filtrar por busca (nome, produto, telefone)
  const itemsFiltrados = useMemo(() => {
    if (!busca.trim()) return allItems;
    const q = busca.toLowerCase();
    return allItems.filter(item => {
      const nome = item.cliente?.nome?.toLowerCase() || "";
      const produto = item.cobranca?.nomeProdutoServico?.toLowerCase() || "";
      const telefone = item.cliente?.telefone?.toLowerCase() || "";
      return nome.includes(q) || produto.includes(q) || telefone.includes(q);
    });
  }, [allItems, busca]);

  // Handlers
  const handleCharge = useCallback((parcela: Parcela) => {
    const cobranca = dadosCobrancas[parcela.cobrancaId];
    const cliente = dadosClientes[parcela.clienteId];
    if (!cobranca || !cliente) return;
    const link = cobrar(parcela, cobranca, cliente);
    window.open(link, "_blank");
  }, [dadosCobrancas, dadosClientes, cobrar]);

  const handleConfirmSend = useCallback(async (parcelaId: string) => {
    await confirmarEnvio(parcelaId);
    await refresh();
  }, [confirmarEnvio, refresh]);

  const handleMarkPaid = useCallback(async (parcelaId: string) => {
    const parcela = allItems.find(i => i.parcela.id === parcelaId)?.parcela;
    if (!parcela) return;
    const undo = await marcarPago(parcela);
    setUndoToast({
      message: `${dadosClientes[parcela.clienteId]?.nome || "Cliente"} — ${formatarMoeda(parcela.valor)} pago.`,
      onUndo: undo,
    });
    await refresh();
  }, [allItems, marcarPago, dadosClientes, refresh]);

  const handleMarkPartial = useCallback(async (parcelaId: string, valor: number) => {
    const parcela = allItems.find(i => i.parcela.id === parcelaId)?.parcela;
    if (!parcela) return;
    await marcarParcial(parcela, valor);
    await refresh();
  }, [allItems, marcarParcial, refresh]);

  const handleArchive = useCallback(async (parcelaId: string) => {
    await arquivar(parcelaId);
    await refresh();
  }, [arquivar, refresh]);

  // Lote: marcar todas como pagas
  const handleMarcarLote = useCallback(async () => {
    const ids = Array.from(batch.selecionadas);
    const parcelasParaPagar = allItems
      .filter(i => ids.includes(i.parcela.id))
      .map(i => i.parcela);

    if (parcelasParaPagar.length === 0) return;

    // Executar marcarPago para cada parcela e guardar undo functions
    const undos: (() => Promise<void>)[] = [];
    for (const p of parcelasParaPagar) {
      const undo = await marcarPago(p);
      undos.push(undo);
    }

    // 1 toast de undo para todas
    setUndoToast({
      message: `${parcelasParaPagar.length} parcela${parcelasParaPagar.length > 1 ? "s" : ""} marca${parcelasParaPagar.length > 1 ? "das" : "da"} como paga${parcelasParaPagar.length > 1 ? "s" : ""}.`,
      onUndo: async () => {
        for (const undo of undos) {
          await undo();
        }
        await refresh();
      },
    });

    batch.limpar();
    await refresh();
  }, [batch, allItems, marcarPago, refresh]);

  // Próximos vencimentos: clique abre overlay
  const handleVencimentoClick = useCallback(async (venc: { dia: number; data: string; total: number; valor: number }) => {
    // Buscar parcelas daquele dia
    try {
      const parcelasDia = await (await import("../api/entities")).Parcela.filter({ dataVencimento: venc.data });
      const items: DashboardItem[] = [];
      for (const p of parcelasDia) {
        if (p.arquivada) continue;
        if (p.status === "pago") continue;
        let cobranca: Cobranca | undefined;
        let cliente: Cliente | undefined;
        try { cobranca = await CobrancaAPI.get(p.cobrancaId) as Cobranca; } catch { /* */ }
        try { cliente = await ClienteAPI.get(p.clienteId) as Cliente; } catch { /* */ }
        if (cliente && !cliente.ativo) continue;
        items.push({ parcela: p, cobranca, cliente });
      }
      setOverlayVencimento({ ...venc, parcelas: items });
    } catch { /* */ }
  }, []);

  // Toast dismiss
  const dismissToast = useCallback(() => {
    setUndoToast(null);
  }, []);

  if (loading) {
    return React.createElement("div", { className: "flex justify-center py-12" },
      React.createElement("p", { className: "text-muted-foreground" }, "Carregando...")
    );
  }

  if (error) {
    return React.createElement("div", { className: "flex justify-center py-12" },
      React.createElement("p", { className: "text-destructive" }, `Erro: ${error}`)
    );
  }

  const dataHoje = hoje();
  const dataFormatada = formatarDataBR(dataHoje);

  // Estado vazio
  if (allItems.length === 0 && proximosVencimentos.length === 0) {
    return React.createElement("div", { className: "flex flex-col gap-4 p-4 max-w-2xl mx-auto" },
      React.createElement(EmptyState, { title: "Nada para cobrar hoje", description: "Tudo em dia! ✓" }),
    );
  }

  if (allItems.length === 0 && proximosVencimentos.length > 0) {
    const proximo = proximosVencimentos[0];
    return React.createElement("div", { className: "flex flex-col gap-4 p-4 max-w-2xl mx-auto" },
      React.createElement(EmptyState, { title: "Nada para cobrar hoje", description: `✓ Próximo vencimento: dia ${proximo.dia}` }),
      // Próximos vencimentos
      ...proximosVencimentos.map((v, i) => renderProximoVencimento(v, i, handleVencimentoClick)),
    );
  }

  return React.createElement("div", { className: "flex flex-col gap-3 p-4 max-w-2xl mx-auto pb-20" },
    // Cabeçalho: data de hoje
    React.createElement("div", { className: "flex flex-col gap-1" },
      React.createElement("h1", { className: "text-lg font-semibold" }, `Hoje — ${dataFormatada}`),
      // Contadores
      React.createElement("div", { className: "flex items-center gap-4 text-sm" },
        React.createElement("span", { className: "text-muted-foreground" }, `${contadores.total} cobrança${contadores.total > 1 ? "s" : ""}`),
        React.createElement("span", { className: "font-medium" }, formatarMoeda(contadores.valor)),
        contadores.atrasadas > 0
          ? React.createElement("span", { className: "text-destructive" }, `${contadores.atrasadas} atrasada${contadores.atrasadas > 1 ? "s" : ""}`)
          : null,
      ),
    ),

    // Busca
    React.createElement(SearchInput, { placeholder: "Buscar por nome, produto ou telefone...", onChange: setBusca }),

    // Lista de cards
    itemsFiltrados.length === 0
      ? React.createElement(EmptyState, { title: "Nenhum resultado", description: "Tente outra busca" })
      : itemsFiltrados.map((item, idx) => {
          const isAtrasada = parcelasAtrasadas.some(p => p.id === item.parcela.id);
          return React.createElement(ChargeCard, {
            key: item.parcela.id,
            parcela: item.parcela,
            cobranca: item.cobranca,
            cliente: item.cliente,
            isSelected: batch.isSelected(item.parcela.id),
            onSelect: batch.toggle,
            onCharge: handleCharge,
            onConfirmSend: handleConfirmSend,
            onMarkPaid: handleMarkPaid,
            onMarkPartial: handleMarkPartial,
            onArchive: handleArchive,
          });
        }),

    // Próximos vencimentos
    proximosVencimentos.length > 0
      ? React.createElement("div", { className: "mt-4 pt-3 border-t" },
          React.createElement("h2", { className: "text-sm font-medium text-muted-foreground mb-2" }, "Próximos vencimentos"),
          ...proximosVencimentos.map((v, i) => renderProximoVencimento(v, i, handleVencimentoClick)),
        )
      : null,

    // BatchBar
    batch.temSelecao
      ? React.createElement(BatchBar, {
          quantidade: batch.quantidade,
          onMarcarTodasPagas: handleMarcarLote,
          onLimpar: batch.limpar,
        })
      : null,

    // UndoToast
    undoToast
      ? React.createElement(UndoToast, {
          message: undoToast.message,
          onUndo: () => { undoToast.onUndo(); dismissToast(); },
          onDismiss: dismissToast,
        })
      : null,

    // Overlay de próximos vencimentos
    overlayVencimento
      ? renderOverlayVencimento(overlayVencimento, () => setOverlayVencimento(null))
      : null,
  );
}

// Helper: renderizar linha de próximo vencimento
function renderProximoVencimento(
  venc: { dia: number; data: string; total: number; valor: number },
  index: number,
  onClick: (v: typeof venc) => void
) {
  return React.createElement("div", {
    key: index,
    className: "flex items-center justify-between py-2 px-3 rounded-lg border bg-card cursor-pointer hover:bg-accent",
    onClick: () => onClick(venc),
  },
    React.createElement("div", { className: "flex items-center gap-2" },
      React.createElement("span", { className: "w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium" },
        String(venc.dia).padStart(2, "0")),
      React.createElement("div", { className: "flex flex-col" },
        React.createElement("span", { className: "text-sm font-medium" }, `${venc.total} cobrança${venc.total > 1 ? "s" : ""}`),
        React.createElement("span", { className: "text-xs text-muted-foreground" }, formatarDataBR(venc.data)),
      ),
    ),
    React.createElement("span", { className: "text-sm font-medium" }, formatarMoeda(venc.valor)),
  );
}

// Helper: renderizar overlay/modal de vencimentos
function renderOverlayVencimento(
  venc: { dia: number; data: string; total: number; valor: number; parcelas: DashboardItem[] },
  onClose: () => void
) {
  return React.createElement("div", {
    className: "fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center",
    onClick: onClose,
  },
    React.createElement("div", {
      className: "bg-card text-card-foreground rounded-t-lg sm:rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto",
      onClick: (e: any) => e.stopPropagation(),
    },
      // Header
      React.createElement("div", { className: "flex items-center justify-between p-4 border-b" },
        React.createElement("div", { className: "flex flex-col" },
          React.createElement("h2", { className: "text-lg font-semibold" }, `Dia ${venc.dia} — ${formatarDataBR(venc.data)}`),
          React.createElement("span", { className: "text-sm text-muted-foreground" }, `${venc.total} cobrança${venc.total > 1 ? "s" : ""} · ${formatarMoeda(venc.valor)}`),
        ),
        React.createElement("button", {
          onClick: onClose,
          className: "rounded-md p-2 hover:bg-accent",
          "aria-label": "Fechar",
        }, "✕"),
      ),
      // Lista de parcelas
      React.createElement("div", { className: "flex flex-col gap-2 p-4" },
        venc.parcelas.length === 0
          ? React.createElement("p", { className: "text-sm text-muted-foreground text-center py-4" }, "Nenhuma parcela encontrada")
          : venc.parcelas.map((item, idx) =>
              React.createElement(ChargeCard, {
                key: item.parcela.id,
                parcela: item.parcela,
                cobranca: item.cobranca,
                cliente: item.cliente,
              })
            ),
      ),
    ),
  );
}


=== ARQUIVO: pages/NewChargePage.tsx ===

// pages/NewChargePage.tsx — Nova Cobrança, Passos 1 e 2 (M10a)
import React, { useCallback } from 'react';
import { useNewChargeWizard } from '../hooks/useNewChargeWizard';
import { useClients } from '../hooks/useClients';
import { useProducts } from '../hooks/useProducts';
import { WizardProgress } from '../components/WizardProgress';
import { ClientAutocomplete } from '../components/ClientAutocomplete';
import { ProductAutocomplete } from '../components/ProductAutocomplete';
import { PaymentSelector } from '../components/PaymentSelector';
import { Cliente as ClienteAPI, ProdutoServico as ProdutoAPI } from '../api/entities';
import { eventBus } from '../lib/event-bus';
import { formatarMoeda, formatarTelefone } from '../lib/format.utils';
import type { Cliente } from '../types/client.types';
import type { ProdutoServico } from '../types/product.types';
import type { FormaPagamento } from '../types/common.types';

export function NewChargePage() {
  const wizard = useNewChargeWizard();
  const { clientes, refresh: refreshClientes } = useClients();
  const { produtos, refresh: refreshProdutos } = useProducts();

  const handleCancel = useCallback(() => {
    if (wizard.isDirty) {
      const confirm = window.confirm('Deseja cancelar? Os dados preenchidos serão perdidos.');
      if (!confirm) return;
    }
    wizard.reset();
  }, [wizard]);

  // Criação inline de cliente
  const handleCreateClient = useCallback(async (nome: string, telefone: string): Promise<Cliente> => {
    const newClient = await ClienteAPI.create({ nome, telefone, ativo: true });
    eventBus.emit('client:created');
    await refreshClientes();
    return newClient;
  }, [refreshClientes]);

  // Seleção de cliente
  const handleSelectClient = useCallback((cliente: Cliente) => {
    wizard.updateData({ cliente });
  }, [wizard]);

  // Criação inline de produto
  const handleCreateProduct = useCallback(async (nome: string, valor: number): Promise<ProdutoServico> => {
    const newProduct = await ProdutoAPI.create({ nome, valorPadrao: valor, vezesUsado: 0 });
    eventBus.emit('product:created');
    await refreshProdutos();
    return newProduct;
  }, [refreshProdutos]);

  // Seleção de produto
  const handleSelectProduct = useCallback((produto: ProdutoServico | { nome: string; produtoServicoId: null }) => {
    const p = produto as any;
    const prodId: string | null = p.id || p.produtoServicoId || null;
    const valorPadrao: number | null = p.valorPadrao !== undefined && p.valorPadrao !== null ? p.valorPadrao : null;

    wizard.updateData({
      produtoNome: p.nome || '',
      produtoServicoId: prodId,
      valorPadrao: valorPadrao,
      ...(valorPadrao !== null ? { valor: String(valorPadrao) } : {}),
    });
  }, [wizard]);

  // Handlers do Passo 2
  const handleValorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    wizard.updateData({ valor: e.target.value });
  }, [wizard]);

  const handleFormaPagamentoChange = useCallback((forma: FormaPagamento) => {
    wizard.updateData({ formaPagamento: forma });
  }, [wizard]);

  const handlePixUtilizadoChange = useCallback((pix: string) => {
    wizard.updateData({ pixUtilizado: pix });
  }, [wizard]);

  const handleQuantidadeParcelasChange = useCallback((qtd: number) => {
    wizard.updateData({
      quantidadeParcelas: qtd,
      isParcelado: qtd > 1,
    });
  }, [wizard]);

  const { passoAtual, data, isPasso1Valid, isPasso2Valid } = wizard;

  return React.createElement('div', { className: 'max-w-xl mx-auto p-4 space-y-6' },
    // Header
    React.createElement('div', { className: 'flex items-center justify-between border-b pb-4' },
      React.createElement('h1', { className: 'text-xl font-bold text-foreground' }, 'Nova Cobrança'),
      React.createElement('button', {
        onClick: handleCancel,
        className: 'rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground text-lg leading-none',
        title: 'Cancelar',
        'aria-label': 'Cancelar',
      }, '✕')
    ),

    // Progress Bar
    React.createElement(WizardProgress, { passoAtual }),

    // Passo 1: Cliente e Produto
    passoAtual === 1 ? React.createElement('div', { className: 'space-y-6' },
      React.createElement('h2', { className: 'text-lg font-semibold text-foreground' }, 'Passo 1: Cliente e Produto'),

      // Campo Cliente
      React.createElement('div', { className: 'space-y-2' },
        React.createElement('label', { className: 'block text-sm font-medium text-foreground' }, 'Cliente'),
        data.cliente ? React.createElement('div', { className: 'flex items-center justify-between p-3 rounded-md border bg-muted/30' },
          React.createElement('div', null,
            React.createElement('p', { className: 'font-medium text-sm text-foreground' }, data.cliente.nome),
            React.createElement('p', { className: 'text-xs text-muted-foreground' }, formatarTelefone(data.cliente.telefone))
          ),
          React.createElement('button', {
            onClick: () => wizard.updateData({ cliente: null }),
            className: 'text-xs text-primary hover:underline font-medium'
          }, 'Alterar')
        ) : React.createElement(ClientAutocomplete, {
          clientes,
          onSelect: handleSelectClient,
          onCreateNew: handleCreateClient,
        })
      ),

      // Campo Produto / Serviço
      React.createElement('div', { className: 'space-y-2' },
        React.createElement('label', { className: 'block text-sm font-medium text-foreground' }, 'Produto ou Serviço'),
        data.produtoNome ? React.createElement('div', { className: 'flex items-center justify-between p-3 rounded-md border bg-muted/30' },
          React.createElement('div', null,
            React.createElement('p', { className: 'font-medium text-sm text-foreground' }, data.produtoNome),
            data.valorPadrao !== null ? React.createElement('p', { className: 'text-xs text-muted-foreground' }, `Valor padrão: ${formatarMoeda(data.valorPadrao)}`) : React.createElement('p', { className: 'text-xs text-muted-foreground' }, 'Venda avulsa')
          ),
          React.createElement('button', {
            onClick: () => wizard.updateData({ produtoNome: '', produtoServicoId: null, valorPadrao: null }),
            className: 'text-xs text-primary hover:underline font-medium'
          }, 'Alterar')
        ) : React.createElement(ProductAutocomplete, {
          produtos,
          allowVendaAvulsa: true,
          onSelect: handleSelectProduct,
          onCreateNew: handleCreateProduct,
        })
      ),

      // Botões do Passo 1
      React.createElement('div', { className: 'flex justify-end gap-2 pt-4 border-t' },
        React.createElement('button', {
          onClick: handleCancel,
          className: 'px-4 py-2 text-sm font-medium rounded-md border hover:bg-accent'
        }, 'Cancelar'),
        React.createElement('button', {
          onClick: wizard.proximoPasso,
          disabled: !isPasso1Valid,
          className: 'px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed'
        }, 'Continuar')
      )
    ) : null,

    // Passo 2: Valor e Forma de Pagamento
    passoAtual === 2 ? React.createElement('div', { className: 'space-y-6' },
      React.createElement('h2', { className: 'text-lg font-semibold text-foreground' }, 'Passo 2: Valor e Pagamento'),

      // Input de Valor
      React.createElement('div', { className: 'space-y-1' },
        React.createElement('label', { className: 'block text-sm font-medium text-foreground' }, 'Valor (R$)'),
        React.createElement('input', {
          type: 'text',
          value: data.valor,
          onChange: handleValorChange,
          placeholder: '0,00',
          className: 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
        })
      ),

      // PaymentSelector
      React.createElement('div', { className: 'space-y-2' },
        React.createElement('label', { className: 'block text-sm font-medium text-foreground' }, 'Forma de Pagamento'),
        React.createElement(PaymentSelector, {
          value: data.formaPagamento,
          onChange: handleFormaPagamentoChange,
          pixUtilizado: data.pixUtilizado,
          onPixUtilizadoChange: handlePixUtilizadoChange,
          quantidadeParcelas: data.quantidadeParcelas,
          onQuantidadeParcelasChange: handleQuantidadeParcelasChange,
        })
      ),

      // Botões do Passo 2
      React.createElement('div', { className: 'flex justify-between items-center gap-2 pt-4 border-t' },
        React.createElement('button', {
          onClick: wizard.voltarPasso,
          className: 'px-4 py-2 text-sm font-medium rounded-md border hover:bg-accent'
        }, 'Voltar'),
        React.createElement('button', {
          onClick: wizard.proximoPasso,
          disabled: !isPasso2Valid,
          className: 'px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed'
        }, 'Continuar')
      )
    ) : null,

    // Passos 3 e 4 (Placeholder M10b)
    passoAtual >= 3 ? React.createElement('div', { className: 'py-12 text-center space-y-6 border rounded-lg p-6 bg-muted/10' },
      React.createElement('p', { className: 'text-muted-foreground font-medium text-base' }, 'Próxima etapa (M10b)'),
      React.createElement('div', { className: 'flex justify-center' },
        React.createElement('button', {
          onClick: wizard.voltarPasso,
          className: 'px-4 py-2 text-sm font-medium rounded-md border hover:bg-accent'
        }, 'Voltar')
      )
    ) : null
  );
}


=== ARQUIVO: pages/ProductsPage.tsx ===

// pages/ProductsPage.tsx — Página de Produtos (M12)
// Listagem ordenada por vezesUsado, edição inline, criação, exclusão, venda avulsa.
import React, { useState, useCallback } from "react";
import { useProducts } from "../hooks/useProducts";
import { eventBus } from "../lib/event-bus";
import { formatarMoeda } from "../lib/format.utils";
import { SearchInput } from "../components/SearchInput";
import { EmptyState } from "../components/EmptyState";
import { ProdutoServico as ProdutoAPI, Cobranca as CobrancaAPI } from "../api/entities";
import type { ProdutoServico } from "../types/product.types";

export function ProductsPage() {
  const { produtos, loading, error, refresh } = useProducts();
  const [busca, setBusca] = useState("");
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [eNome, setENome] = useState("");
  const [eValor, setEValor] = useState("");
  const [novoForm, setNovoForm] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoValor, setNovoValor] = useState("");

  const ordenados = [...produtos].sort((a, b) => b.vezesUsado - a.vezesUsado);
  const filtrados = busca
    ? ordenados.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()))
    : ordenados;
  const maisUsado = ordenados[0]?.vezesUsado || 0;

  const handleSalvar = useCallback(async (p: ProdutoServico) => {
    const v = parseFloat(eValor.replace(",", ".")) || undefined;
    await ProdutoAPI.update(p.id, { nome: eNome, valorPadrao: v });
    eventBus.emit("product:updated");
    setEditandoId(null);
    await refresh();
  }, [eNome, eValor, refresh]);

  const handleCriar = useCallback(async () => {
    if (!novoNome.trim()) return;
    const v = parseFloat(novoValor.replace(",", ".")) || undefined;
    await ProdutoAPI.create({ nome: novoNome, valorPadrao: v, vezesUsado: 0 });
    eventBus.emit("product:created");
    setNovoForm(false); setNovoNome(""); setNovoValor("");
    await refresh();
  }, [novoNome, novoValor, refresh]);

  const handleExcluir = useCallback(async (p: ProdutoServico) => {
    const cobrancas = await CobrancaAPI.filter({ produtoServicoId: p.id });
    if (cobrancas.length > 0) {
      window.alert(`Não é possível excluir "${p.nome}" — existem ${cobrancas.length} cobrança(s) vinculadas.`);
      return;
    }
    if (!window.confirm(`Excluir "${p.nome}"?`)) return;
    await ProdutoAPI.delete(p.id);
    eventBus.emit("product:deleted");
    await refresh();
  }, [refresh]);

  if (loading) return React.createElement("div", { className: "flex justify-center py-12" }, React.createElement("p", { className: "text-muted-foreground" }, "Carregando..."));
  if (error) return React.createElement("div", { className: "flex justify-center py-12" }, React.createElement("p", { className: "text-destructive" }, `Erro: ${error}`));

  return React.createElement("div", { className: "flex flex-col gap-4 p-4 max-w-2xl mx-auto" },
    React.createElement("div", { className: "flex items-center justify-between" },
      React.createElement("h1", { className: "text-xl font-semibold" }, "Produtos"),
      React.createElement("button", { onClick: () => setNovoForm(!novoForm), className: "rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium" }, "+ Novo"),
    ),
    novoForm ? React.createElement("div", { className: "rounded-lg border bg-card p-3 space-y-2" },
      React.createElement("input", { type: "text", value: novoNome, onChange: (e: any) => setNovoNome(e.target.value), placeholder: "Nome do produto", className: "w-full rounded-md border px-3 py-2 text-sm" }),
      React.createElement("input", { type: "text", value: novoValor, onChange: (e: any) => setNovoValor(e.target.value), placeholder: "Valor padrão (opcional)", className: "w-full rounded-md border px-3 py-2 text-sm" }),
      React.createElement("div", { className: "flex gap-2" },
        React.createElement("button", { onClick: handleCriar, className: "rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm" }, "Salvar"),
        React.createElement("button", { onClick: () => { setNovoForm(false); setNovoNome(""); setNovoValor(""); }, className: "rounded-md border px-3 py-1 text-sm" }, "Cancelar"),
      ),
    ) : null,
    React.createElement(SearchInput, { placeholder: "Buscar produto...", onChange: setBusca }),
    // Lista sempre renderizada (mesmo vazia, para mostrar venda avulsa)
    React.createElement("div", { className: "flex flex-col gap-2" },
      filtrados.length === 0
        ? React.createElement(EmptyState, { title: busca ? "Nenhum produto encontrado" : "Nenhum produto", description: busca ? "Tente outra busca" : "Clique em + Novo para cadastrar" })
        : filtrados.map(p => {
            const isExp = expandidoId === p.id;
            const isEdit = editandoId === p.id;
            const isMaisUsado = p.vezesUsado === maisUsado && p.vezesUsado > 0;
            return React.createElement("div", {
              key: p.id,
              className: "rounded-lg border bg-card",
              onClick: () => setExpandidoId(isExp ? null : p.id),
            },
              React.createElement("div", { className: "flex items-center justify-between p-3 cursor-pointer" },
                React.createElement("div", { className: "flex items-center gap-2" },
                  isMaisUsado ? React.createElement("span", { className: "text-sm" }, "⭐") : null,
                  React.createElement("div", { className: "flex flex-col" },
                    React.createElement("span", { className: "font-medium" }, p.nome),
                    React.createElement("span", { className: "text-xs text-muted-foreground" }, p.valorPadrao ? formatarMoeda(p.valorPadrao) : "Sem valor"),
                  ),
                ),
                React.createElement("span", { className: "text-xs text-muted-foreground" }, `Usado ${p.vezesUsado}x`),
              ),
              isExp ? React.createElement("div", { className: "border-t p-3 space-y-2", onClick: (e: any) => e.stopPropagation() },
                isEdit
                  ? React.createElement("div", { className: "space-y-2" },
                      React.createElement("input", { type: "text", value: eNome, onChange: (e: any) => setENome(e.target.value), placeholder: "Nome", className: "w-full rounded-md border px-3 py-2 text-sm" }),
                      React.createElement("input", { type: "text", value: eValor, onChange: (e: any) => setEValor(e.target.value), placeholder: "Valor padrão", className: "w-full rounded-md border px-3 py-2 text-sm" }),
                      React.createElement("div", { className: "flex gap-2" },
                        React.createElement("button", { onClick: () => handleSalvar(p), className: "rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm" }, "Salvar"),
                        React.createElement("button", { onClick: () => setEditandoId(null), className: "rounded-md border px-3 py-1 text-sm" }, "Cancelar"),
                      ),
                    )
                  : React.createElement("div", { className: "flex gap-2" },
                      React.createElement("button", { onClick: () => { setENome(p.nome); setEValor(p.valorPadrao ? String(p.valorPadrao) : ""); setEditandoId(p.id); }, className: "rounded-md border px-3 py-1 text-xs" }, "Editar"),
                      React.createElement("button", { onClick: () => handleExcluir(p), className: "rounded-md border px-3 py-1 text-xs text-destructive" }, "Excluir"),
                    ),
              ) : null,
            );
          }),
      // Venda avulsa item — sempre visível
      React.createElement("div", { className: "rounded-lg border bg-muted/50 p-3 flex items-center justify-between" },
        React.createElement("div", { className: "flex flex-col" },
          React.createElement("span", { className: "font-medium text-muted-foreground" }, "Venda avulsa"),
          React.createElement("span", { className: "text-xs text-muted-foreground" }, "Cobranças sem produto cadastrado"),
        ),
        React.createElement("span", { className: "text-xs text-muted-foreground" }, "Não editável"),
      ),
    ),
  );
}


=== ARQUIVO: pages/SettingsPage.tsx ===

// pages/SettingsPage.tsx — Tela de configuração de dias trabalhados (M13)
//
// PRD v2.0 seção 8.8 / Tela 5: 7 checkboxes (Seg-Dom), default Seg-Sex.
// Texto explicativo: "As cobranças que vencerem em dias não trabalhados
// aparecerão no próximo dia trabalhado."
// Usa useConfig (M6a) para carregar e persistir.

import { useState, useEffect } from "react";
import { useConfig } from "../hooks/useConfig";
import { DIAS_SEMANA } from "../config/app.config";

export function SettingsPage() {
  const { config, loading, error, salvar } = useConfig();
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Carregar config inicial
  useEffect(() => {
    if (config) {
      setDiasSelecionados(config.diasTrabalhados);
    }
  }, [config]);

  const toggleDia = (valor: number) => {
    setDiasSelecionados((prev) =>
      prev.includes(valor)
        ? prev.filter((d) => d !== valor)
        : [...prev, valor]
    );
  };

  const handleSalvar = async () => {
    setSalvando(true);
    const ok = await salvar(diasSelecionados);
    setSalvando(false);
    if (ok) {
      setToastMsg("Configuração salva com sucesso!");
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Dias que você trabalha</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Checkboxes Seg-Dom */}
      <div className="space-y-2">
        {DIAS_SEMANA.map((dia) => (
          <label
            key={dia.valor}
            className="flex items-center gap-3 rounded-lg border bg-card p-3 cursor-pointer hover:bg-accent transition-colors"
          >
            <input
              type="checkbox"
              checked={diasSelecionados.includes(dia.valor)}
              onChange={() => toggleDia(dia.valor)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm font-medium text-card-foreground">
              {dia.label}
            </span>
          </label>
        ))}
      </div>

      {/* Texto explicativo */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        As cobranças que vencerem em dias não trabalhados aparecerão no próximo dia trabalhado.
      </p>

      {/* Botão Salvar */}
      <button
        onClick={handleSalvar}
        disabled={salvando || diasSelecionados.length === 0}
        className="w-full inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {salvando ? "Salvando..." : "Salvar"}
      </button>

      {/* Toast de confirmação */}
      {toastMsg && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-card border px-4 py-2 text-sm text-card-foreground shadow-lg">
          {toastMsg}
        </div>
      )}
    </div>
  );
}


=== ARQUIVO: functions/createCobranca.ts ===

// functions/createCobranca.ts — Backend function: cria cobrança + parcelas atomicamente (M2)
//
// Duplicação consciente de dividirValor e adicionarMeses de lib/ (M3a).
// Backend functions em Base44 são isoladas — não importam de src/.
// Se M3a mudar, revalidar este arquivo contra os mesmos testes.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const input = await req.json();

    // ===== VALIDAÇÃO =====
    const erros: string[] = [];

    if (!input.clienteId) erros.push("Cliente é obrigatório");
    if (!input.nomeProdutoServico || String(input.nomeProdutoServico).trim().length < 3)
      erros.push("Nome do produto/serviço deve ter no mínimo 3 caracteres");
    if (!input.valor || input.valor <= 0 || input.valor > 999999.99)
      erros.push("Valor deve ser maior que zero e menor ou igual a 999999.99");
    if (!input.quantidadeParcelas || !Number.isInteger(input.quantidadeParcelas) || input.quantidadeParcelas < 1 || input.quantidadeParcelas > 60)
      erros.push("Quantidade de parcelas deve ser entre 1 e 60");
    if (!input.formaPagamento || !["pix", "dinheiro", "cartao_credito", "cartao_debito", "transferencia"].includes(input.formaPagamento))
      erros.push("Forma de pagamento inválida");
    if (input.formaPagamento === "pix" && (!input.pixUtilizado || String(input.pixUtilizado).trim() === ""))
      erros.push("PIX utilizado é obrigatório quando a forma de pagamento é PIX");
    if (!input.diaVencimentoFixo || ![5, 10, 15, 20, 25, 30].includes(input.diaVencimentoFixo))
      erros.push("Dia de vencimento fixo deve ser um dos valores: 5, 10, 15, 20, 25, 30");
    if (!input.primeiroVencimento || !/^\d{4}-\d{2}-\d{2}$/.test(input.primeiroVencimento))
      erros.push("Primeiro vencimento deve ser uma data válida no formato YYYY-MM-DD");

    if (erros.length > 0) {
      return new Response(JSON.stringify({ sucesso: false, erros }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ===== FUNÇÕES DUPLICADAS DE M3a =====
    // dividirValor — arredondamento na última parcela
    function dividirValor(valor: number, parcelas: number) {
      const valorBase = Math.floor((valor / parcelas) * 100) / 100;
      const valorUltima = Math.round((valor - (valorBase * (parcelas - 1))) * 100) / 100;
      return { valorBase, valorUltima };
    }

    // adicionarMeses — ajusta mês curto
    function adicionarMeses(data: string, meses: number): string {
      const [y, m, d] = data.split("-").map(Number);
      let year = y;
      let month = m + meses;
      while (month > 12) { month -= 12; year += 1; }
      while (month < 1) { month += 12; year -= 1; }
      const targetDate = new Date(year, month, 0);
      const maxDay = targetDate.getDate();
      const day = Math.min(d, maxDay);
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    // mesAlvoExisteDia
    function mesAlvoExisteDia(ano: number, mes: number, dia: number): boolean {
      const d = new Date(ano, mes - 1, dia);
      return d.getFullYear() === ano && (d.getMonth() + 1) === mes && d.getDate() === dia;
    }

    // calcularVencimentoParcela
    function calcularVencimentoParcela(primeiroVencimento: string, diaVencimentoFixo: number, numeroParcela: number): string {
      if (numeroParcela === 1) return primeiroVencimento;
      const base = adicionarMeses(primeiroVencimento, numeroParcela - 1);
      const [ano, mes] = base.split("-").map(Number);
      if (mesAlvoExisteDia(ano, mes, diaVencimentoFixo)) {
        return `${ano}-${String(mes).padStart(2, "0")}-${String(diaVencimentoFixo).padStart(2, "0")}`;
      }
      const lastDay = new Date(ano, mes, 0).getDate();
      return `${ano}-${String(mes).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    }

    // ===== CRIAR COBRANÇA =====
    const cobranca = await base44.entities.Cobranca.create({
      clienteId: input.clienteId,
      produtoServicoId: input.produtoServicoId || null,
      nomeProdutoServico: input.nomeProdutoServico,
      valor: input.valor,
      formaPagamento: input.formaPagamento,
      quantidadeParcelas: input.quantidadeParcelas,
      primeiroVencimento: input.primeiroVencimento,
      diaVencimentoFixo: input.diaVencimentoFixo,
      pixUtilizado: input.pixUtilizado || null,
      observacoes: input.observacoes || "",
    });

    // ===== CALCULAR E CRIAR PARCELAS =====
    const { valorBase, valorUltima } = dividirValor(input.valor, input.quantidadeParcelas);

    const parcelasData = [];
    for (let i = 1; i <= input.quantidadeParcelas; i++) {
      const valorParcela = i === input.quantidadeParcelas ? valorUltima : valorBase;
      const dataVencimento = calcularVencimentoParcela(input.primeiroVencimento, input.diaVencimentoFixo, i);
      parcelasData.push({
        cobrancaId: cobranca.id,
        clienteId: input.clienteId,
        numeroParcela: i,
        valor: valorParcela,
        valorPago: null,
        dataVencimento: dataVencimento,
        status: "pendente",
        dataPagamento: null,
        dataCobrancaEnviada: null,
        arquivada: false,
      });
    }

    // Criar parcelas — uma a uma (createMany não existe no SDK, usar Promise.all)
    try {
      const parcelasCriadas = await Promise.all(
        parcelasData.map((p) => base44.entities.Parcela.create(p))
      );

      // ===== INCREMENTAR vezesUsado (best-effort) =====
      if (input.produtoServicoId) {
        try {
          const produto = await base44.asServiceRole.entities.ProdutoServico.get(input.produtoServicoId);
          if (produto) {
            await base44.asServiceRole.entities.ProdutoServico.update(input.produtoServicoId, {
              vezesUsado: (produto.vezesUsado || 0) + 1,
            });
          }
        } catch (e) {
          // Não crítico — registrar e continuar
          console.log("[createCobranca] Aviso ao incrementar vezesUsado:", e);
        }
      }

      return new Response(JSON.stringify({
        sucesso: true,
        cobrancaId: cobranca.id,
        parcelas: parcelasCriadas.map((p) => ({
          numeroParcela: p.numeroParcela,
          valor: p.valor,
          dataVencimento: p.dataVencimento,
        })),
      }), {
        headers: { "Content-Type": "application/json" },
      });

    } catch (batchError) {
      // ===== COMPENSAÇÃO: deletar cobrança se batch falha =====
      try {
        await base44.entities.Cobranca.delete(cobranca.id);
      } catch (deleteError) {
        console.log("[createCobranca] Falha ao deletar cobranca órfã:", deleteError);
      }

      return new Response(JSON.stringify({
        sucesso: false,
        erro: "Falha ao criar parcelas. Cobrança removida.",
        detalhe: batchError instanceof Error ? batchError.message : String(batchError),
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({
      sucesso: false,
      erro: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});


=== ARQUIVO: functions/editarCobranca.ts ===

// functions/editarCobranca.ts — Backend function: edita cobrança, regenera parcelas quando permitido (M2b)
//
// CORREÇÃO DE BUG: list() retorna array vazio no backend SDK. Solução: receber parcelasAtuaisIds
// do frontend (que já os possui via hook useCharges) e usar get(id) + delete(id) individualmente.
//
// Estratégia criar-antes-de-deletar: se criar novas parcelas falha, as antigas continuam existindo.
// Duplicação consciente de M3a (mesmas funções de createCobranca.ts).
//
// REGRA DE EDIÇÃO (PRD v2.0 seção 7.5 — prevalece sobre o Plano v2.0):
// - Regeneração permitida APENAS se TODAS as parcelas têm status = "pendente"
// - Se qualquer parcela tem status != "pendente" (cobrado, pago, pago_parcial):
//   apenas observacoes e pixUtilizado podem ser editados

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const input = await req.json();
    const { cobrancaId, parcelasAtuaisIds } = input;

    if (!cobrancaId) {
      return new Response(JSON.stringify({
        sucesso: false,
        erro: "cobrancaId é obrigatório",
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ===== BUSCAR COBRANÇA =====
    const cobranca = await base44.entities.Cobranca.get(cobrancaId);
    if (!cobranca) {
      return new Response(JSON.stringify({
        sucesso: false,
        erro: "Cobrança não encontrada",
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ===== BUSCAR PARCELAS EXISTENTES VIA get(id) =====
    // list() não funciona no backend SDK — retorna array vazio.
    // O frontend passa os IDs das parcelas atuais via parcelasAtuaisIds.
    const parcelasExistentes = [];
    if (parcelasAtuaisIds && Array.isArray(parcelasAtuaisIds)) {
      for (const pid of parcelasAtuaisIds) {
        try {
          const parcela = await base44.entities.Parcela.get(pid);
          if (parcela) {
            parcelasExistentes.push(parcela);
          }
        } catch (e) {
          // Parcela pode ter sido removida — ignorar
        }
      }
    }

    // ===== VERIFICAR PERMISSÃO DE EDIÇÃO (PRD v2.0 seção 7.5) =====
    // Regeneração permitida APENAS se TODAS as parcelas têm status = "pendente"
    const todasPendentes = parcelasExistentes.length > 0 && parcelasExistentes.every(
      (p: any) => p.status === "pendente"
    );

    if (!todasPendentes) {
      // ===== EDIÇÃO LIMITADA =====
      // Só pode atualizar observacoes e pixUtilizado
      const updateData: any = {};
      if (input.observacoes !== undefined) updateData.observacoes = input.observacoes;
      if (input.pixUtilizado !== undefined) updateData.pixUtilizado = input.pixUtilizado;

      if (Object.keys(updateData).length > 0) {
        await base44.entities.Cobranca.update(cobrancaId, updateData);
      }

      return new Response(JSON.stringify({
        sucesso: true,
        cobrancaId: cobrancaId,
        edicaoLimitada: true,
        mensagem: "Edição limitada: existem parcelas que não estão pendentes. Apenas observações e PIX foram atualizados.",
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ===== EDIÇÃO COMPLETA COM REGENERAÇÃO =====
    // Todas as parcelas estão pendentes — permitir regeneração

    const novoValor = input.valor !== undefined ? input.valor : cobranca.valor;
    const novaQtdParcelas = input.quantidadeParcelas !== undefined ? input.quantidadeParcelas : cobranca.quantidadeParcelas;
    const novoPrimeiroVencimento = input.primeiroVencimento !== undefined ? input.primeiroVencimento : cobranca.primeiroVencimento;
    const novoDiaVencimentoFixo = input.diaVencimentoFixo !== undefined ? input.diaVencimentoFixo : cobranca.diaVencimentoFixo;

    const erros: string[] = [];
    if (novoValor <= 0 || novoValor > 999999.99) erros.push("Valor deve ser maior que zero e menor ou igual a 999999.99");
    if (!Number.isInteger(novaQtdParcelas) || novaQtdParcelas < 1 || novaQtdParcelas > 60) erros.push("Quantidade de parcelas deve ser entre 1 e 60");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(novoPrimeiroVencimento)) erros.push("Primeiro vencimento deve ser uma data válida");
    if (![5, 10, 15, 20, 25, 30].includes(novoDiaVencimentoFixo)) erros.push("Dia de vencimento fixo inválido");

    if (erros.length > 0) {
      return new Response(JSON.stringify({ sucesso: false, erros }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ===== FUNÇÕES DUPLICADAS DE M3a =====
    function dividirValor(valor: number, parcelas: number) {
      const valorBase = Math.floor((valor / parcelas) * 100) / 100;
      const valorUltima = Math.round((valor - (valorBase * (parcelas - 1))) * 100) / 100;
      return { valorBase, valorUltima };
    }

    function adicionarMeses(data: string, meses: number): string {
      const [y, m, d] = data.split("-").map(Number);
      let year = y;
      let month = m + meses;
      while (month > 12) { month -= 12; year += 1; }
      while (month < 1) { month += 12; year -= 1; }
      const maxDay = new Date(year, month, 0).getDate();
      const day = Math.min(d, maxDay);
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    function mesAlvoExisteDia(ano: number, mes: number, dia: number): boolean {
      const d = new Date(ano, mes - 1, dia);
      return d.getFullYear() === ano && (d.getMonth() + 1) === mes && d.getDate() === dia;
    }

    function calcularVencimentoParcela(primeiroVencimento: string, diaVencimentoFixo: number, numeroParcela: number): string {
      if (numeroParcela === 1) return primeiroVencimento;
      const base = adicionarMeses(primeiroVencimento, numeroParcela - 1);
      const [ano, mes] = base.split("-").map(Number);
      if (mesAlvoExisteDia(ano, mes, diaVencimentoFixo)) {
        return `${ano}-${String(mes).padStart(2, "0")}-${String(diaVencimentoFixo).padStart(2, "0")}`;
      }
      const lastDay = new Date(ano, mes, 0).getDate();
      return `${ano}-${String(mes).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    }

    // ===== CALCULAR NOVAS PARCELAS =====
    const { valorBase, valorUltima } = dividirValor(novoValor, novaQtdParcelas);

    const novasParcelas = [];
    for (let i = 1; i <= novaQtdParcelas; i++) {
      const valorParcela = i === novaQtdParcelas ? valorUltima : valorBase;
      const dataVencimento = calcularVencimentoParcela(novoPrimeiroVencimento, novoDiaVencimentoFixo, i);
      novasParcelas.push({
        cobrancaId: cobrancaId,
        clienteId: cobranca.clienteId,
        numeroParcela: i,
        valor: valorParcela,
        valorPago: null,
        dataVencimento: dataVencimento,
        status: "pendente",
        dataPagamento: null,
        dataCobrancaEnviada: null,
        arquivada: false,
      });
    }

    // ===== ESTRATÉGIA CRIAR-ANTES-DELETAR =====

    // 1. Criar novas parcelas
    let parcelasCriadas;
    try {
      parcelasCriadas = await Promise.all(
        novasParcelas.map((p) => base44.entities.Parcela.create(p))
      );
    } catch (batchError) {
      return new Response(JSON.stringify({
        sucesso: false,
        erro: "Falha ao criar novas parcelas. Parcelas originais preservadas.",
        detalhe: batchError instanceof Error ? batchError.message : String(batchError),
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Se sucesso, deletar parcelas antigas via delete(id)
    const errosDelete: string[] = [];
    for (const p of parcelasExistentes) {
      try {
        await base44.entities.Parcela.delete(p.id);
      } catch (e) {
        errosDelete.push(`parcela ${p.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 3. Atualizar cobrança
    const updateData: any = {
      valor: novoValor,
      quantidadeParcelas: novaQtdParcelas,
      primeiroVencimento: novoPrimeiroVencimento,
      diaVencimentoFixo: novoDiaVencimentoFixo,
    };
    if (input.observacoes !== undefined) updateData.observacoes = input.observacoes;
    if (input.pixUtilizado !== undefined) updateData.pixUtilizado = input.pixUtilizado;

    await base44.entities.Cobranca.update(cobrancaId, updateData);

    // 4. Se houve falha no delete, reportar
    if (errosDelete.length > 0) {
      return new Response(JSON.stringify({
        sucesso: false,
        cobrancaId: cobrancaId,
        erro: "Novas parcelas criadas mas falha ao deletar parcelas antigas. Regeneração incompleta.",
        detalhe: errosDelete,
        parcelasCriadas: parcelasCriadas.map((p) => ({
          numeroParcela: p.numeroParcela,
          valor: p.valor,
          dataVencimento: p.dataVencimento,
        })),
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      sucesso: true,
      cobrancaId: cobrancaId,
      parcelas: parcelasCriadas.map((p) => ({
        numeroParcela: p.numeroParcela,
        valor: p.valor,
        dataVencimento: p.dataVencimento,
      })),
    }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      sucesso: false,
      erro: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});


=== ARQUIVO: functions/seedTestData.ts ===

// lib/seed-test-data.ts — Cria dados de teste com datas relativas a hoje (reutilizável em M9, M10, M14, M15)
//
// Deployado como backend function para poder ser chamado via HTTP a qualquer momento.
// Cria 5 clientes, 3 produtos, cobranças variadas e parcelas cobrindo todos os cenários de teste.

// Helper: formata data para YYYY-MM-DD
function formatarData(date: Date): string {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// Helper: adiciona dias a uma data
function adicionarDias(date: Date, dias: number): Date {
  const nova = new Date(date);
  nova.setDate(nova.getDate() + dias);
  return nova;
}

export default async function seedTestData(input?: { limpar?: boolean }) {
  const limpar = input?.limpar ?? true;
  const hoje = new Date();
  const hojeStr = formatarData(hoje);

  try {
    // Limpar dados existentes se solicitado
    if (limpar) {
      try {
        const parcelas = await base44.entities.Parcela.list({ limit: 500 });
        for (const p of parcelas) {
          await base44.entities.Parcela.delete(p.id);
        }
      } catch (e) {
        console.log("[seed] Aviso ao limpar parcelas:", e);
      }

      try {
        const cobrancas = await base44.entities.Cobranca.list({ limit: 500 });
        for (const c of cobrancas) {
          await base44.entities.Cobranca.delete(c.id);
        }
      } catch (e) {
        console.log("[seed] Aviso ao limpar cobranças:", e);
      }

      try {
        const clientes = await base44.entities.Cliente.list({ limit: 500 });
        for (const c of clientes) {
          await base44.entities.Cliente.delete(c.id);
        }
      } catch (e) {
        console.log("[seed] Aviso ao limpar clientes:", e);
      }

      try {
        const produtos = await base44.entities.ProdutoServico.list({ limit: 500 });
        for (const p of produtos) {
          await base44.entities.ProdutoServico.delete(p.id);
        }
      } catch (e) {
        console.log("[seed] Aviso ao limpar produtos:", e);
      }

      try {
        const configs = await base44.entities.Configuracao.list({ limit: 10 });
        for (const c of configs) {
          await base44.entities.Configuracao.delete(c.id);
        }
      } catch (e) {
        console.log("[seed] Aviso ao limpar configurações:", e);
      }
    }

    // 1. Criar clientes
    const clientes = await Promise.all([
      base44.entities.Cliente.create({ nome: "Maria Silva", telefone: "5511987654321", ativo: true, observacoes: "Cliente desde 2024" }),
      base44.entities.Cliente.create({ nome: "João Pereira", telefone: "5511912345678", ativo: true, observacoes: "" }),
      base44.entities.Cliente.create({ nome: "Ana Costa", telefone: "5511998765432", ativo: true, observacoes: "Paga sempre em dia" }),
      base44.entities.Cliente.create({ nome: "Carlos Santos", telefone: "55119234567890", ativo: true, observacoes: "" }),
      base44.entities.Cliente.create({ nome: "Fernanda Souza", telefone: "5511977778888", ativo: false, observacoes: "Inativa temporariamente" }),
    ]);

    // 2. Criar produtos
    const produtos = await Promise.all([
      base44.entities.ProdutoServico.create({ nome: "Manutenção Mensal", valorPadrao: 200, vezesUsado: 8 }),
      base44.entities.ProdutoServico.create({ nome: "Consultoria", valorPadrao: 150, vezesUsado: 5 }),
      base44.entities.ProdutoServico.create({ nome: "Hospedagem", valorPadrao: 80, vezesUsado: 3 }),
    ]);

    // 3. Criar cobranças e parcelas
    // Cobrança 1: Maria - Manutenção Mensal - À vista - PIX - Vence HOJE
    const cob1 = await base44.entities.Cobranca.create({
      clienteId: clientes[0].id,
      produtoServicoId: produtos[0].id,
      nomeProdutoServico: "Manutenção Mensal",
      valor: 200,
      formaPagamento: "pix",
      quantidadeParcelas: 1,
      primeiroVencimento: hojeStr,
      diaVencimentoFixo: 5,
      pixUtilizado: "PIX João",
      observacoes: "",
    });
    await base44.entities.Parcela.create({
      cobrancaId: cob1.id, clienteId: clientes[0].id,
      numeroParcela: 1, valor: 200, valorPago: null,
      dataVencimento: hojeStr, status: "pendente",
      dataPagamento: null, dataCobrancaEnviada: null, arquivada: false,
    });

    // Cobrança 2: João - Consultoria - 3x - Dinheiro - Atrasada 10 dias (vermelha)
    const cob2 = await base44.entities.Cobranca.create({
      clienteId: clientes[1].id,
      produtoServicoId: produtos[1].id,
      nomeProdutoServico: "Consultoria",
      valor: 450,
      formaPagamento: "dinheiro",
      quantidadeParcelas: 3,
      primeiroVencimento: formatarData(adicionarDias(hoje, -12)),
      diaVencimentoFixo: 10,
      pixUtilizado: null,
      observacoes: "",
    });
    const cob2p1 = await base44.entities.Parcela.create({
      cobrancaId: cob2.id, clienteId: clientes[1].id,
      numeroParcela: 1, valor: 150, valorPago: null,
      dataVencimento: formatarData(adicionarDias(hoje, -12)), status: "pendente",
      dataPagamento: null, dataCobrancaEnviada: null, arquivada: false,
    });
    await base44.entities.Parcela.create({
      cobrancaId: cob2.id, clienteId: clientes[1].id,
      numeroParcela: 2, valor: 150, valorPago: null,
      dataVencimento: formatarData(adicionarDias(hoje, -2)), status: "pendente",
      dataPagamento: null, dataCobrancaEnviada: null, arquivada: false,
    });
    await base44.entities.Parcela.create({
      cobrancaId: cob2.id, clienteId: clientes[1].id,
      numeroParcela: 3, valor: 150, valorPago: null,
      dataVencimento: formatarData(adicionarDias(hoje, 8)), status: "pendente",
      dataPagamento: null, dataCobrancaEnviada: null, arquivada: false,
    });

    // Cobrança 3: Ana - Hospedagem - À vista - PIX - PAGA
    const cob3 = await base44.entities.Cobranca.create({
      clienteId: clientes[2].id,
      produtoServicoId: produtos[2].id,
      nomeProdutoServico: "Hospedagem",
      valor: 80,
      formaPagamento: "pix",
      quantidadeParcelas: 1,
      primeiroVencimento: formatarData(adicionarDias(hoje, -15)),
      diaVencimentoFixo: 15,
      pixUtilizado: "PIX Ana",
      observacoes: "",
    });
    await base44.entities.Parcela.create({
      cobrancaId: cob3.id, clienteId: clientes[2].id,
      numeroParcela: 1, valor: 80, valorPago: 80,
      dataVencimento: formatarData(adicionarDias(hoje, -15)), status: "pago",
      dataPagamento: formatarData(adicionarDias(hoje, -14)), dataCobrancaEnviada: formatarData(adicionarDias(hoje, -15)), arquivada: false,
    });

    // Cobrança 4: Carlos - Manutenção Mensal - À vista - PIX - PAGO PARCIAL (R$ 100 de R$ 200)
    const cob4 = await base44.entities.Cobranca.create({
      clienteId: clientes[3].id,
      produtoServicoId: produtos[0].id,
      nomeProdutoServico: "Manutenção Mensal",
      valor: 200,
      formaPagamento: "pix",
      quantidadeParcelas: 1,
      primeiroVencimento: formatarData(adicionarDias(hoje, -3)),
      diaVencimentoFixo: 20,
      pixUtilizado: "PIX Carlos",
      observacoes: "",
    });
    await base44.entities.Parcela.create({
      cobrancaId: cob4.id, clienteId: clientes[3].id,
      numeroParcela: 1, valor: 200, valorPago: 100,
      dataVencimento: formatarData(adicionarDias(hoje, -3)), status: "pago_parcial",
      dataPagamento: null, dataCobrancaEnviada: formatarData(adicionarDias(hoje, -3)), arquivada: false,
    });

    // Cobrança 5: Maria - Venda Avulsa - À vista - Dinheiro - ARQUIVADA
    const cob5 = await base44.entities.Cobranca.create({
      clienteId: clientes[0].id,
      produtoServicoId: null,
      nomeProdutoServico: "Instalação extra",
      valor: 50,
      formaPagamento: "dinheiro",
      quantidadeParcelas: 1,
      primeiroVencimento: formatarData(adicionarDias(hoje, -20)),
      diaVencimentoFixo: 25,
      pixUtilizado: null,
      observacoes: "",
    });
    await base44.entities.Parcela.create({
      cobrancaId: cob5.id, clienteId: clientes[0].id,
      numeroParcela: 1, valor: 50, valorPago: null,
      dataVencimento: formatarData(adicionarDias(hoje, -20)), status: "pendente",
      dataPagamento: null, dataCobrancaEnviada: null, arquivada: true,
    });

    // Cobrança 6: Ana - Consultoria - 10x - PIX - Futuras
    const cob6 = await base44.entities.Cobranca.create({
      clienteId: clientes[2].id,
      produtoServicoId: produtos[1].id,
      nomeProdutoServico: "Consultoria",
      valor: 1500,
      formaPagamento: "pix",
      quantidadeParcelas: 10,
      primeiroVencimento: formatarData(adicionarDias(hoje, 5)),
      diaVencimentoFixo: 10,
      pixUtilizado: "PIX Ana",
      observacoes: "Contrato anual",
    });
    for (let i = 0; i < 10; i++) {
      const dataVenc = new Date(hoje);
      dataVenc.setDate(5 + (i * 30)); // aproximação: 1 parcela por mês
      await base44.entities.Parcela.create({
        cobrancaId: cob6.id, clienteId: clientes[2].id,
        numeroParcela: i + 1, valor: 150, valorPago: null,
        dataVencimento: formatarData(adicionarDias(hoje, 5 + i * 30)), status: "pendente",
        dataPagamento: null, dataCobrancaEnviada: null, arquivada: false,
      });
    }

    // 4. Criar configuração
    await base44.entities.Configuracao.create({
      diasTrabalhados: "1,2,3,4,5",
    });

    return {
      sucesso: true,
      mensagem: "Dados de teste criados com sucesso",
      resumo: {
        clientes: 5,
        produtos: 3,
        cobrancas: 6,
        parcelas: 16,
        configuracao: 1,
        dataHoje: hojeStr,
      },
    };
  } catch (error) {
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : String(error),
    };
  }
}
