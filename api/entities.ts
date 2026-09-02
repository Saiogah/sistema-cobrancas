// api/entities.ts — Adapter Supabase compatível com a API usada pelos hooks do projeto.
// Preserva list/filter/get/create/update/delete e o shape camelCase/created_date do Base44.

import { supabase } from './supabase';
import { criarCobranca, editarCobranca, excluirCobranca } from './rpcs';
import type { Cliente as ClienteType, ClienteInput, ClienteUpdate } from '../types/client.types';
import type { ProdutoServico as ProdutoServicoType, ProdutoInput, ProdutoUpdate } from '../types/product.types';
import type { Cobranca as CobrancaType, CobrancaInput, CobrancaUpdate } from '../types/charge.types';
import type { Parcela as ParcelaType, ParcelaInput, ParcelaUpdate } from '../types/parcel.types';

type Row = Record<string, unknown>;
type FilterValue = unknown;
type Query = any;

interface ListParams {
  limit?: number;
  skip?: number;
  /** Base44: prefixo '-' = desc. Ex.: '-vezesUsado'. Aceita campos separados por vírgula. */
  sort?: string;
}

export interface PageResult<T> { data: T[]; count: number; }

interface BaseEntityApi<T, C, U> {
  list(params?: ListParams): Promise<T[]>;
  filter(params: Record<string, FilterValue>): Promise<T[]>;
  page(params: Record<string, FilterValue>, options: ListParams): Promise<PageResult<T>>;
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
  filter(params: Record<string, FilterValue>): Promise<ConfiguracaoRecord[]>;
  get(id: string): Promise<ConfiguracaoRecord>;
  create(data: { diasTrabalhados: string }): Promise<ConfiguracaoRecord>;
  update(id: string, data: { diasTrabalhados?: string }): Promise<ConfiguracaoRecord>;
  delete(id: string): Promise<void>;
}

const FIELD_MAP: Record<string, string> = {
  clienteId: 'cliente_id',
  cobrancaId: 'cobranca_id',
  produtoServicoId: 'produto_servico_id',
  nomeProdutoServico: 'nome_produto_servico',
  valorPadrao: 'valor_padrao',
  vezesUsado: 'vezes_usado',
  formaPagamento: 'forma_pagamento',
  quantidadeParcelas: 'quantidade_parcelas',
  primeiroVencimento: 'primeiro_vencimento',
  diaVencimentoFixo: 'dia_vencimento_fixo',
  pixUtilizado: 'pix_utilizado',
  numeroParcela: 'numero_parcela',
  valorPago: 'valor_pago',
  dataVencimento: 'data_vencimento',
  dataPagamento: 'data_pagamento',
  dataCobrancaEnviada: 'data_cobranca_enviada',
  created_date: 'created_at',
  updated_date: 'updated_at',
};

const SYSTEM_FIELDS = new Set(['id', 'created_date', 'updated_date', 'created_at', 'updated_at', 'user_id']);
const dbField = (field: string): string => FIELD_MAP[field] ?? field;

function toDb(input: Row, special?: (key: string, value: unknown) => unknown): Row {
  const output: Row = {};
  for (const [key, value] of Object.entries(input)) {
    if (SYSTEM_FIELDS.has(key) || value === undefined) continue;
    const transformed = special ? special(key, value) : value;
    if (transformed === undefined) continue;
    output[dbField(key)] = transformed;
  }
  return output;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value);
}

function clienteFromDb(r: Row): ClienteType {
  return {
    id: String(r.id),
    nome: String(r.nome),
    telefone: String(r.telefone),
    observacoes: String(r.observacoes ?? ''),
    ativo: Boolean(r.ativo),
    created_date: String(r.created_at),
    updated_date: String(r.updated_at),
  };
}

function produtoFromDb(r: Row): ProdutoServicoType {
  return {
    id: String(r.id),
    nome: String(r.nome),
    valorPadrao: r.valor_padrao == null ? null : asNumber(r.valor_padrao),
    vezesUsado: asNumber(r.vezes_usado),
    created_date: String(r.created_at),
    updated_date: String(r.updated_at),
  };
}

function cobrancaFromDb(r: Row): CobrancaType {
  return {
    id: String(r.id),
    clienteId: String(r.cliente_id),
    produtoServicoId: r.produto_servico_id == null ? null : String(r.produto_servico_id),
    nomeProdutoServico: String(r.nome_produto_servico),
    valor: asNumber(r.valor),
    formaPagamento: r.forma_pagamento as CobrancaType['formaPagamento'],
    quantidadeParcelas: asNumber(r.quantidade_parcelas),
    primeiroVencimento: String(r.primeiro_vencimento),
    diaVencimentoFixo: asNumber(r.dia_vencimento_fixo) as CobrancaType['diaVencimentoFixo'],
    pixUtilizado: r.pix_utilizado == null ? null : String(r.pix_utilizado),
    observacoes: String(r.observacoes ?? ''),
    created_date: String(r.created_at),
    updated_date: String(r.updated_at),
  };
}

function parcelaFromDb(r: Row): ParcelaType {
  return {
    id: String(r.id),
    cobrancaId: String(r.cobranca_id),
    clienteId: String(r.cliente_id),
    numeroParcela: asNumber(r.numero_parcela),
    valor: asNumber(r.valor),
    valorPago: r.valor_pago == null ? null : asNumber(r.valor_pago),
    dataVencimento: String(r.data_vencimento),
    status: r.status as ParcelaType['status'],
    dataPagamento: r.data_pagamento == null ? null : String(r.data_pagamento),
    dataCobrancaEnviada: r.data_cobranca_enviada == null ? null : String(r.data_cobranca_enviada),
    arquivada: Boolean(r.arquivada),
    created_date: String(r.created_at),
    updated_date: String(r.updated_at),
  };
}

function configFromDb(r: Row): ConfiguracaoRecord {
  const raw = r.dias_trabalhados;
  const dias = Array.isArray(raw) ? raw.join(',') : String(raw ?? '1,2,3,4,5');
  return {
    id: String(r.id),
    diasTrabalhados: dias,
    created_date: String(r.created_at),
    updated_date: String(r.updated_at),
  };
}


function produtoToDbValue(key: string, value: unknown): unknown {
  // vezesUsado é contador derivado do ciclo de vida da cobrança e só pode ser alterado pelas RPCs.
  if (key === 'vezesUsado') return undefined;
  return value;
}

function configToDbValue(key: string, value: unknown): unknown {
  if (key !== 'diasTrabalhados') return value;
  if (Array.isArray(value)) return value.map(Number);
  return String(value)
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
}

function applySort(query: Query, sort?: string): Query {
  if (!sort) return query.order('created_at', { ascending: false });
  for (const token of sort.split(',').map((s) => s.trim()).filter(Boolean)) {
    const descending = token.startsWith('-');
    const field = descending ? token.slice(1) : token;
    query = query.order(dbField(field), { ascending: !descending });
  }
  return query;
}

function applyPagination(query: Query, params?: ListParams): Query {
  const skip = Math.max(0, params?.skip ?? 0);
  const limit = params?.limit;
  if (typeof limit === 'number' && limit >= 0) {
    if (limit === 0) return query.limit(0);
    return query.range(skip, skip + limit - 1);
  }
  return skip > 0 ? query.range(skip, skip + 999) : query;
}

function applyFilter(query: Query, key: string, value: FilterValue): Query {
  const field = dbField(key);
  if (value === null) return query.is(field, null);
  if (Array.isArray(value)) return query.in(field, value);

  if (typeof value === 'object' && value !== null) {
    const ops = value as Record<string, unknown>;
    if ('$in' in ops && Array.isArray(ops.$in)) query = query.in(field, ops.$in);
    if ('$lt' in ops) query = query.lt(field, ops.$lt);
    if ('$lte' in ops) query = query.lte(field, ops.$lte);
    if ('$gt' in ops) query = query.gt(field, ops.$gt);
    if ('$gte' in ops) query = query.gte(field, ops.$gte);
    if ('$ne' in ops) query = query.neq(field, ops.$ne);
    return query;
  }

  return query.eq(field, value);
}

function createRepository<T, C, U>(
  table: string,
  fromDb: (row: Row) => T,
  options?: { specialToDb?: (key: string, value: unknown) => unknown; allowDelete?: boolean },
): BaseEntityApi<T, C, U> {
  return {
    async list(params?: ListParams): Promise<T[]> {
      let query: Query = supabase.from(table).select('*');
      query = applySort(query, params?.sort);
      query = applyPagination(query, params);
      const { data, error } = await query;
      if (error) throw error;
      return ((data ?? []) as Row[]).map(fromDb);
    },

    async filter(params: Record<string, FilterValue>): Promise<T[]> {
      let query: Query = supabase.from(table).select('*');
      for (const [key, value] of Object.entries(params)) query = applyFilter(query, key, value);
      query = applySort(query);
      const { data, error } = await query;
      if (error) throw error;
      return ((data ?? []) as Row[]).map(fromDb);
    },

    async page(params: Record<string, FilterValue>, options: ListParams): Promise<PageResult<T>> {
      let query: Query = supabase.from(table).select('*', { count: 'exact' });
      for (const [key, value] of Object.entries(params)) query = applyFilter(query, key, value);
      query = applySort(query, options.sort);
      query = applyPagination(query, options);
      const { data, count, error } = await query;
      if (error) throw error;
      return { data: ((data ?? []) as Row[]).map(fromDb), count: count ?? 0 };
    },

    async get(id: string): Promise<T> {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) throw error;
      return fromDb(data as Row);
    },

    async create(input: C): Promise<T> {
      const payload = toDb(input as Row, options?.specialToDb);
      const { data, error } = await supabase.from(table).insert(payload).select('*').single();
      if (error) throw error;
      return fromDb(data as Row);
    },

    async update(id: string, patch: U): Promise<T> {
      const payload = toDb(patch as Row, options?.specialToDb);
      const { data, error } = await supabase.from(table).update(payload).eq('id', id).select('*').single();
      if (error) throw error;
      return fromDb(data as Row);
    },

    async delete(id: string): Promise<void> {
      if (options?.allowDelete === false) {
        throw new Error(`Exclusão direta de ${table} não é permitida`);
      }
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
  };
}

export const Cliente: BaseEntityApi<ClienteType, ClienteInput, ClienteUpdate> = createRepository(
  'clientes',
  clienteFromDb,
  { allowDelete: false },
);

export const ProdutoServico: BaseEntityApi<ProdutoServicoType, ProdutoInput, ProdutoUpdate> = createRepository(
  'produtos_servicos',
  produtoFromDb,
  { specialToDb: produtoToDbValue },
);

const CobrancaRead = createRepository<CobrancaType, CobrancaInput, CobrancaUpdate>(
  'cobrancas',
  cobrancaFromDb,
  { allowDelete: false },
);

export const Cobranca: BaseEntityApi<CobrancaType, CobrancaInput, CobrancaUpdate> = {
  list: CobrancaRead.list,
  filter: CobrancaRead.filter,
  page: CobrancaRead.page,
  get: CobrancaRead.get,
  async create(input) {
    const result = await criarCobranca(input);
    return CobrancaRead.get(result.cobrancaId);
  },
  async update(id, patch) {
    await editarCobranca(id, patch);
    return CobrancaRead.get(id);
  },
  async delete(id) {
    await excluirCobranca(id);
  },
};

const ParcelaRead = createRepository<ParcelaType, ParcelaInput, ParcelaUpdate>(
  'parcelas',
  parcelaFromDb,
  { allowDelete: false },
);

export const Parcela: BaseEntityApi<ParcelaType, ParcelaInput, ParcelaUpdate> = {
  list: ParcelaRead.list,
  filter: ParcelaRead.filter,
  page: ParcelaRead.page,
  get: ParcelaRead.get,
  async create() {
    throw new Error('Parcelas são geradas automaticamente pela RPC de cobrança');
  },
  update: ParcelaRead.update,
  async delete() {
    throw new Error('Exclusão direta de parcelas não é permitida');
  },
};

export const Configuracao: ConfiguracaoApi = createRepository<
  ConfiguracaoRecord,
  { diasTrabalhados: string },
  { diasTrabalhados?: string }
>('configuracoes', configFromDb, { specialToDb: configToDbValue, allowDelete: false });
