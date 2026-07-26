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
