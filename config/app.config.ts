// config/app.config.ts — Constantes gerais do sistema

/** Número máximo de parcelas permitido (PRD v2.0 seção 7.1) */
export const MAX_PARCELAS = 60;

/** Valor máximo permitido para uma cobrança em reais (PRD v2.0 seção 7.1) */
export const MAX_VALOR = 999999.99;

/** Tempo em milissegundos que o undo toast fica visível (PRD v2.0 seção 10.6) */
export const UNDO_TIMEOUT = 5000;

/** Tempo em milissegundos que um toast comum fica visível */
export const TOAST_DURATION = 5000;

/** Debounce em milissegundos para inputs de busca */
export const DEBOUNCE_SEARCH = 150;

/** Número de cobranças recentes exibidas no histórico do cliente (PRD v2.0 seção 13.12) */
export const COBRANCAS_RECENTES_LIMIT = 5;

/** Número de clientes recentes exibidos no autocomplete (PRD v2.0 seção 8.2) */
export const CLIENTES_RECENTES_LIMIT = 5;

/** Número de produtos sugeridos no autocomplete "Mais vendidos" */
export const PRODUTOS_SUGERIDOS_LIMIT = 5;

/** Número máximo de sugestões de PIX no autocomplete (PRD v2.0 seção 7.8) */
export const PIX_SUGESTOES_LIMIT = 5;

/** Número mínimo de cobranças com mesmo padrão para ativar cadastro inteligente (PRD v2.0 seção 7.8) */
export const CADASTRO_INTELIGENTE_MINIMO = 2;

/** Número de cobranças analisadas para o cadastro inteligente */
export const CADASTRO_INTELIGENTE_HISTORICO = 3;

/** Fuso horário da usuária (PRD v2.0 seção 6 — Convenções de Dados) */
export const TIMEZONE = "America/Sao_Paulo";

/** DDD padrão do Brasil */
export const DDI_BRASIL = "55";

/** Dias da semana (0 = Domingo, 1 = Segunda, ..., 6 = Sábado) */
export const DIAS_SEMANA = [
  { valor: 0, label: "Dom" },
  { valor: 1, label: "Seg" },
  { valor: 2, label: "Ter" },
  { valor: 3, label: "Qua" },
  { valor: 4, label: "Qui" },
  { valor: 5, label: "Sex" },
  { valor: 6, label: "Sáb" },
] as const;

/** Dias trabalhados padrão (segunda a sexta) (PRD v2.0 seção 6 — Entidade 5) */
export const DIAS_TRABALHADOS_DEFAULT = "1,2,3,4,5";
