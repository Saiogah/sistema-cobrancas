// api/entities.ts — Local IndexedDB Implementation for Single-User Billing System

import type { Cliente as ClienteType, ClienteInput, ClienteUpdate } from '../types/client.types';
import type { ProdutoServico as ProdutoServicoType, ProdutoInput, ProdutoUpdate } from '../types/product.types';
import type { Cobranca as CobrancaType, CobrancaInput, CobrancaUpdate } from '../types/charge.types';
import type { Parcela as ParcelaType, ParcelaInput, ParcelaUpdate } from '../types/parcel.types';
import { gerarParcelas, podeEditarCobranca, podeExcluirCobranca } from '../domain/parcel.rules';

type FilterValue = unknown;

export interface ListParams {
  limit?: number;
  skip?: number;
  sort?: string;
}

export interface PageResult<T> {
  data: T[];
  count: number;
}

export interface BaseEntityApi<T, C, U> {
  list(params?: ListParams): Promise<T[]>;
  filter(params: Record<string, FilterValue>): Promise<T[]>;
  page(params: Record<string, FilterValue>, options: ListParams): Promise<PageResult<T>>;
  get(id: string): Promise<T>;
  create(data: C): Promise<T>;
  update(id: string, data: U): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface ConfiguracaoRecord {
  id: string;
  diasTrabalhados: string;
  created_date: string;
  updated_date: string;
}

export interface ConfiguracaoInput {
  diasTrabalhados: string | number[];
}

export interface ConfiguracaoUpdate {
  diasTrabalhados?: string | number[];
}

// -----------------------------------------------------------------------------
// IndexedDB Raw Driver & Store Helpers
// -----------------------------------------------------------------------------

const DB_NAME = 'sistema-cobrancas-db';
const DB_VERSION = 1;
const STORES = ['clientes', 'produtos_servicos', 'cobrancas', 'parcelas', 'configuracoes'] as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        for (const store of STORES) {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
    });
  }
  return dbPromise;
}

function getAllFromStore<T>(storeName: string, tx?: IDBTransaction): Promise<T[]> {
  if (tx) {
    return new Promise((resolve, reject) => {
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  }
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const req = transaction.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  });
}

function getFromStore<T>(storeName: string, id: string, tx?: IDBTransaction): Promise<T | null> {
  if (tx) {
    return new Promise((resolve, reject) => {
      const req = tx.objectStore(storeName).get(id);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  }
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const req = transaction.objectStore(storeName).get(id);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  });
}

function putToStore<T>(storeName: string, record: T, tx?: IDBTransaction): Promise<T> {
  if (tx) {
    return new Promise((resolve, reject) => {
      const req = tx.objectStore(storeName).put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  }
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const req = transaction.objectStore(storeName).put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  });
}

function deleteFromStore(storeName: string, id: string, tx?: IDBTransaction): Promise<void> {
  if (tx) {
    return new Promise((resolve, reject) => {
      const req = tx.objectStore(storeName).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const req = transaction.objectStore(storeName).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

async function runTransaction<T>(
  storeNames: string[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => Promise<T>
): Promise<T> {
  const db = await getDB();
  const tx = db.transaction(storeNames, mode);

  // AL-03 fix: aguardar oncomplete/onerror/onabort antes de resolver
  const txDone = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });

  try {
    const result = await fn(tx);
    // Aguarda a transação commitar de fato antes de retornar o resultado
    await txDone;
    return result;
  } catch (err) {
    try {
      tx.abort();
    } catch (_) {}
    throw err;
  }
}

// -----------------------------------------------------------------------------
// Filtering, Sorting & Pagination Utilities
// -----------------------------------------------------------------------------

function matchesFilter(record: Record<string, any>, filterParams: Record<string, FilterValue>): boolean {
  for (const [key, filterValue] of Object.entries(filterParams)) {
    if (filterValue === undefined) continue;
    const recValue = record[key];

    if (filterValue === null) {
      if (recValue !== null && recValue !== undefined) return false;
    } else if (Array.isArray(filterValue)) {
      if (!filterValue.includes(recValue)) return false;
    } else if (typeof filterValue === 'object' && filterValue !== null) {
      const ops = filterValue as Record<string, any>;
      if ('$in' in ops && Array.isArray(ops.$in)) {
        if (!ops.$in.includes(recValue)) return false;
      }
      if ('$gt' in ops) {
        if (!(recValue > ops.$gt)) return false;
      }
      if ('$gte' in ops) {
        if (!(recValue >= ops.$gte)) return false;
      }
      if ('$lt' in ops) {
        if (!(recValue < ops.$lt)) return false;
      }
      if ('$lte' in ops) {
        if (!(recValue <= ops.$lte)) return false;
      }
      if ('$ne' in ops) {
        if (recValue === ops.$ne) return false;
      }
    } else {
      if (recValue !== filterValue) return false;
    }
  }
  return true;
}

function compareValues(a: any, b: any, desc: boolean): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return desc ? 1 : -1;
  if (b === null || b === undefined) return desc ? -1 : 1;
  if (typeof a === 'number' && typeof b === 'number') {
    return desc ? b - a : a - b;
  }
  if (typeof a === 'string' && typeof b === 'string') {
    const cmp = a.localeCompare(b);
    return desc ? -cmp : cmp;
  }
  const cmp = a > b ? 1 : a < b ? -1 : 0;
  return desc ? -cmp : cmp;
}

function applySort<T>(items: T[], sortStr?: string): T[] {
  const sortTokens = (sortStr || '-created_date').split(',').map(s => s.trim()).filter(Boolean);
  if (sortTokens.length === 0) return [...items];

  return [...items].sort((a: any, b: any) => {
    for (const token of sortTokens) {
      const desc = token.startsWith('-');
      const field = desc ? token.slice(1) : token;
      const valA = a[field];
      const valB = b[field];
      const cmp = compareValues(valA, valB, desc);
      if (cmp !== 0) return cmp;
    }
    return 0;
  });
}

function applyPagination<T>(items: T[], params?: ListParams): T[] {
  const skip = Math.max(0, params?.skip ?? 0);
  let result = items.slice(skip);
  if (params?.limit !== undefined && params.limit >= 0) {
    result = result.slice(0, params.limit);
  }
  return result;
}

// -----------------------------------------------------------------------------
// Base Generic Repository
// -----------------------------------------------------------------------------

function createRepository<T extends { id: string }, C, U>(
  storeName: string
): BaseEntityApi<T, C, U> {
  return {
    async list(params?: ListParams): Promise<T[]> {
      const all = await getAllFromStore<T>(storeName);
      const sorted = applySort(all, params?.sort);
      return applyPagination(sorted, params);
    },

    async filter(params: Record<string, FilterValue>): Promise<T[]> {
      const all = await getAllFromStore<T>(storeName);
      const filtered = all.filter(r => matchesFilter(r as Record<string, any>, params));
      return applySort(filtered, '-created_date');
    },

    async page(params: Record<string, FilterValue>, options: ListParams): Promise<PageResult<T>> {
      const all = await getAllFromStore<T>(storeName);
      const filtered = all.filter(r => matchesFilter(r as Record<string, any>, params));
      const count = filtered.length;
      const sorted = applySort(filtered, options?.sort);
      const data = applyPagination(sorted, options);
      return { data, count };
    },

    async get(id: string): Promise<T> {
      const record = await getFromStore<T>(storeName, id);
      if (!record) {
        throw new Error(`Registro com id "${id}" não encontrado`);
      }
      return record;
    },

    async create(input: C): Promise<T> {
      const now = new Date().toISOString();
      const record: T = {
        ...(input as any),
        id: crypto.randomUUID(),
        created_date: now,
        updated_date: now,
      };
      await putToStore(storeName, record);
      return record;
    },

    async update(id: string, patch: U): Promise<T> {
      const existing = await getFromStore<T>(storeName, id);
      if (!existing) {
        throw new Error(`Registro com id "${id}" não encontrado`);
      }
      const now = new Date().toISOString();
      const merged: T = {
        ...existing,
        ...(patch as any),
        id: existing.id,
        created_date: (existing as any).created_date,
        updated_date: now,
      };
      await putToStore(storeName, merged);
      return merged;
    },

    async delete(id: string): Promise<void> {
      await deleteFromStore(storeName, id);
    },
  };
}

// -----------------------------------------------------------------------------
// Entity Exports
// -----------------------------------------------------------------------------

export const Cliente: BaseEntityApi<ClienteType, ClienteInput, ClienteUpdate> = createRepository<
  ClienteType,
  ClienteInput,
  ClienteUpdate
>('clientes');

const produtoBase = createRepository<ProdutoServicoType, ProdutoInput, ProdutoUpdate>('produtos_servicos');

export const ProdutoServico: BaseEntityApi<ProdutoServicoType, ProdutoInput, ProdutoUpdate> = {
  ...produtoBase,
  async create(input) {
    const { vezesUsado, ...rest } = input as any;
    return produtoBase.create({
      ...rest,
      vezesUsado: vezesUsado ?? 0,
      valorPadrao: rest.valorPadrao ?? null,
    });
  },
  async update(id, patch) {
    const { vezesUsado, ...allowedPatch } = patch as any;
    return produtoBase.update(id, allowedPatch);
  },
};

const cobrancaBase = createRepository<CobrancaType, CobrancaInput, CobrancaUpdate>('cobrancas');

export const Cobranca: BaseEntityApi<CobrancaType, CobrancaInput, CobrancaUpdate> = {
  list: cobrancaBase.list,
  filter: cobrancaBase.filter,
  page: cobrancaBase.page,
  get: cobrancaBase.get,

  async create(input: CobrancaInput): Promise<CobrancaType> {
    return runTransaction(['cobrancas', 'parcelas', 'produtos_servicos'], 'readwrite', async (tx) => {
      const now = new Date().toISOString();
      const cobrancaId = crypto.randomUUID();

      const cobrancaRecord: CobrancaType = {
        id: cobrancaId,
        clienteId: input.clienteId,
        produtoServicoId: input.produtoServicoId ?? null,
        nomeProdutoServico: input.nomeProdutoServico,
        valor: Math.round(input.valor * 100) / 100,
        formaPagamento: input.formaPagamento,
        quantidadeParcelas: input.quantidadeParcelas,
        primeiroVencimento: input.primeiroVencimento,
        diaVencimentoFixo: input.diaVencimentoFixo,
        pixUtilizado: input.pixUtilizado ?? null,
        observacoes: input.observacoes ?? '',
        created_date: now,
        updated_date: now,
      };

      await putToStore('cobrancas', cobrancaRecord, tx);

      // Auto-generate parcelas
      const parcelasInput = gerarParcelas(input);
      for (const pInput of parcelasInput) {
        const parcelaRecord: ParcelaType = {
          id: crypto.randomUUID(),
          cobrancaId: cobrancaId,
          clienteId: input.clienteId,
          numeroParcela: pInput.numeroParcela,
          valor: pInput.valor,
          valorPago: null,
          dataVencimento: pInput.dataVencimento,
          status: 'pendente',
          dataPagamento: null,
          dataCobrancaEnviada: null,
          arquivada: false,
          created_date: now,
          updated_date: now,
        };
        await putToStore('parcelas', parcelaRecord, tx);
      }

      // Increment vezesUsado on produto if produtoServicoId is provided
      if (input.produtoServicoId) {
        const produto = await getFromStore<ProdutoServicoType>('produtos_servicos', input.produtoServicoId, tx);
        if (produto) {
          const updatedProduto: ProdutoServicoType = {
            ...produto,
            vezesUsado: (produto.vezesUsado || 0) + 1,
            updated_date: now,
          };
          await putToStore('produtos_servicos', updatedProduto, tx);
        }
      }

      return cobrancaRecord;
    });
  },

  async update(id: string, patch: CobrancaUpdate): Promise<CobrancaType> {
    return runTransaction(['cobrancas', 'parcelas', 'produtos_servicos'], 'readwrite', async (tx) => {
      const cobranca = await getFromStore<CobrancaType>('cobrancas', id, tx);
      if (!cobranca) {
        throw new Error(`Cobrança com id "${id}" não encontrada`);
      }

      const allParcelas = await getAllFromStore<ParcelaType>('parcelas', tx);
      const cobrancaParcelas = allParcelas.filter(p => p.cobrancaId === id);

      const canEdit = podeEditarCobranca(cobrancaParcelas);
      const now = new Date().toISOString();

      let updatedCobranca: CobrancaType;

      if (canEdit) {
        // Delete existing parcelas
        for (const p of cobrancaParcelas) {
          await deleteFromStore('parcelas', p.id, tx);
        }

        const valorTruncado = patch.valor !== undefined ? Math.round(patch.valor * 100) / 100 : cobranca.valor;
        updatedCobranca = {
          ...cobranca,
          ...patch,
          valor: valorTruncado,
          updated_date: now,
        };

        await putToStore('cobrancas', updatedCobranca, tx);

        // AL-05 fix: ajustar vezesUsado se o produto foi trocado
        if (patch.produtoServicoId !== undefined && patch.produtoServicoId !== cobranca.produtoServicoId) {
          // Decrement old produto
          if (cobranca.produtoServicoId) {
            const oldProd = await getFromStore<ProdutoServicoType>('produtos_servicos', cobranca.produtoServicoId, tx);
            if (oldProd) {
              await putToStore('produtos_servicos', { ...oldProd, vezesUsado: Math.max(0, (oldProd.vezesUsado || 0) - 1), updated_date: now }, tx);
            }
          }
          // Increment new produto
          if (patch.produtoServicoId) {
            const newProd = await getFromStore<ProdutoServicoType>('produtos_servicos', patch.produtoServicoId, tx);
            if (newProd) {
              await putToStore('produtos_servicos', { ...newProd, vezesUsado: (newProd.vezesUsado || 0) + 1, updated_date: now }, tx);
            }
          }
        }

        // Regenerate new parcelas
        const newParcelasInput = gerarParcelas({
          clienteId: updatedCobranca.clienteId,
          produtoServicoId: updatedCobranca.produtoServicoId,
          nomeProdutoServico: updatedCobranca.nomeProdutoServico,
          valor: updatedCobranca.valor,
          formaPagamento: updatedCobranca.formaPagamento,
          quantidadeParcelas: updatedCobranca.quantidadeParcelas,
          primeiroVencimento: updatedCobranca.primeiroVencimento,
          diaVencimentoFixo: updatedCobranca.diaVencimentoFixo,
          pixUtilizado: updatedCobranca.pixUtilizado,
          observacoes: updatedCobranca.observacoes,
        });

        for (const pInput of newParcelasInput) {
          const parcelaRecord: ParcelaType = {
            id: crypto.randomUUID(),
            cobrancaId: id,
            clienteId: updatedCobranca.clienteId,
            numeroParcela: pInput.numeroParcela,
            valor: pInput.valor,
            valorPago: null,
            dataVencimento: pInput.dataVencimento,
            status: 'pendente',
            dataPagamento: null,
            dataCobrancaEnviada: null,
            arquivada: false,
            created_date: now,
            updated_date: now,
          };
          await putToStore('parcelas', parcelaRecord, tx);
        }
      } else {
        // Limited edit: only observacoes and pixUtilizado
        updatedCobranca = {
          ...cobranca,
          ...(patch.observacoes !== undefined ? { observacoes: patch.observacoes } : {}),
          ...(patch.pixUtilizado !== undefined ? { pixUtilizado: patch.pixUtilizado } : {}),
          valor: Math.round(cobranca.valor * 100) / 100,
          updated_date: now,
        };

        await putToStore('cobrancas', updatedCobranca, tx);
      }

      return updatedCobranca;
    });
  },

  async delete(id: string): Promise<void> {
    return runTransaction(['cobrancas', 'parcelas', 'produtos_servicos'], 'readwrite', async (tx) => {
      const cobranca = await getFromStore<CobrancaType>('cobrancas', id, tx);
      if (!cobranca) return;

      const allParcelas = await getAllFromStore<ParcelaType>('parcelas', tx);
      const cobrancaParcelas = allParcelas.filter(p => p.cobrancaId === id);

      if (!podeExcluirCobranca(cobrancaParcelas)) {
        throw new Error('Não é possível excluir cobrança com parcelas pagas ou parcialmente pagas');
      }

      // Decrement vezesUsado on produto if produtoServicoId exists
      if (cobranca.produtoServicoId) {
        const produto = await getFromStore<ProdutoServicoType>('produtos_servicos', cobranca.produtoServicoId, tx);
        if (produto) {
          const updatedProduto: ProdutoServicoType = {
            ...produto,
            vezesUsado: Math.max(0, (produto.vezesUsado || 0) - 1),
            updated_date: new Date().toISOString(),
          };
          await putToStore('produtos_servicos', updatedProduto, tx);
        }
      }

      // Delete parcelas
      for (const p of cobrancaParcelas) {
        await deleteFromStore('parcelas', p.id, tx);
      }

      // Delete cobranca
      await deleteFromStore('cobrancas', id, tx);
    });
  },
};

const parcelaBase = createRepository<ParcelaType, ParcelaInput, ParcelaUpdate>('parcelas');

export const Parcela: BaseEntityApi<ParcelaType, ParcelaInput, ParcelaUpdate> = {
  list: parcelaBase.list,
  filter: parcelaBase.filter,
  page: parcelaBase.page,
  get: parcelaBase.get,
  update: parcelaBase.update,

  async create(): Promise<ParcelaType> {
    throw new Error('Parcelas são geradas automaticamente');
  },

  async delete(): Promise<void> {
    throw new Error('Exclusão direta de parcelas não é permitida');
  },
};

const configBase = createRepository<ConfiguracaoRecord, ConfiguracaoInput, ConfiguracaoUpdate>('configuracoes');

function formatDiasTrabalhados(val: any): string {
  if (Array.isArray(val)) {
    return val.map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 6).join(',');
  }
  if (typeof val === 'string') {
    return val;
  }
  return '1,2,3,4,5';
}

export const Configuracao: BaseEntityApi<ConfiguracaoRecord, ConfiguracaoInput, ConfiguracaoUpdate> = {
  list: configBase.list,
  filter: configBase.filter,
  page: configBase.page,
  get: configBase.get,
  delete: configBase.delete,

  async create(data: ConfiguracaoInput): Promise<ConfiguracaoRecord> {
    return configBase.create({
      diasTrabalhados: formatDiasTrabalhados(data.diasTrabalhados),
    });
  },

  async update(id: string, data: ConfiguracaoUpdate): Promise<ConfiguracaoRecord> {
    const patch: ConfiguracaoUpdate = {};
    if (data.diasTrabalhados !== undefined) {
      patch.diasTrabalhados = formatDiasTrabalhados(data.diasTrabalhados);
    }
    return configBase.update(id, patch);
  },
};
