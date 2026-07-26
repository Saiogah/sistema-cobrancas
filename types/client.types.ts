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
