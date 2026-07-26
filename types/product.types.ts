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
