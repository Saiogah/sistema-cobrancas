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
