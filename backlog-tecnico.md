# Backlog Técnico — Melhorias Pós-MVP

Itens identificados na retrospectiva do Sprint 1. Não implementar durante o MVP.
Avaliar após conclusão do Sprint 9 (MVP funcional).

---

## BT-01: Unificar tipo DiaVencimento
**Origem:** Retrospectiva Sprint 1, item 1a
**Descrição:** `DiaVencimento` definido em dois lugares: `types/common.types.ts` (union literal) e `config/days.config.ts` (derivado do array). Unificar em uma fonte, fazer common.types importar de days.config.
**Impacto:** Manutenção — adicionar um dia requer mudança em 2 arquivos hoje.

## BT-02: Formato Deno.serve no arquivo seedTestData.ts em disco
**Origem:** Retrospectiva Sprint 1, item 1b
**Descrição:** Arquivo em disco usa `export default` mas o deployado usa `Deno.serve`. Reescrever o arquivo em disco no formato exato do deploy.
**Impacto:** Manutenção — dev que edita o arquivo em disco acha que está editando o deploy.

## BT-03: Remover corAtraso de ParcelaComStatusCalculado
**Origem:** Retrospectiva Sprint 1, item 1c
**Descrição:** `corAtraso: "laranja" | "vermelho" | null` é lógica de UI no tipo de domínio. Mover para o componente StatusBadge.
**Impacto:** Arquitetura — separação domínio/UI.

## BT-04: Extrair formatarMoedaSimples e formatarDataCurta de whatsapp.service.ts
**Origem:** Retrospectiva Sprint 1, item 1d
**Status:** RESOLVIDO no Sprint 2 (Correção Técnica aprovada — whatsapp.service.ts passou a importar de lib/format.utils.ts)

## BT-05: Remover variável valorTotal redundante em whatsapp.service.ts
**Origem:** Retrospectiva Sprint 1, item 1e
**Descrição:** `const valorTotal = formatarMoedaSimples(parcela.valor)` é idêntico a `const valor`. Remover e usar `valor` para o placeholder [ValorTotal].
**Impacto:** Código limpo — 1 linha.

## BT-06: Mover clipboard.service.ts para lib/
**Origem:** Retrospectiva Sprint 1, item 1f
**Descrição:** Uma função de 25 linhas não justifica um arquivo de "serviço". Mover para lib/clipboard.utils.ts.
**Impacto:** Arquitetura — 1 arquivo renomeado, 1 import mudado.

## BT-07: Dividir seedTestData.ts em funções auxiliares
**Origem:** Retrospectiva Sprint 1, item 2a
**Descrição:** 188 linhas em um arquivo. Dividir em criarClientes(), criarProdutos(), criarCobrancas() para reduzir tamanho e permitir reuso.
**Impacto:** Manutenção — adicionar cenários de teste fica mais fácil.

## BT-08: Separar config/app.config.ts em domain.config.ts e ui.config.ts
**Origem:** Retrospectiva Sprint 1, item 2b
**Descrição:** 17 constantes misturando domínio (MAX_PARCELAS, MAX_VALOR) e UI (UNDO_TIMEOUT, TOAST_DURATION).
**Impacto:** Arquitetura — separação de concerns.

## BT-09: Unificar DIAS_TRABALHADOS_DEFAULT entre config e entity schema
**Origem:** Retrospectiva Sprint 1, item 3b
**Descrição:** Definido em config/app.config.ts e no schema da entity Configuracao independentemente.
**Impacto:** Manutenção — mudança precisa em 2 lugares.

## BT-10: Unificar CreateCobrancaResult e EditarCobrancaResult
**Origem:** Retrospectiva Sprint 1, item 3d
**Descrição:** Tipos idênticos. Unificar em OperacaoCobrancaResult.
**Impacto:** Código limpo — 1 tipo em vez de 2.

## BT-11: Remover re-export de EstadoAnterior em parcel.types.ts
**Origem:** Retrospectiva Sprint 1, item 4b
**Descrição:** `export type { EstadoAnterior }` cria ambiguidade de import path.
**Impacto:** Código limpo — 1 linha removida.

## BT-12: Remover tipos especulativos não usados
**Origem:** Retrospectiva Sprint 1, item 4c
**Descrição:** AcaoStatus, ResultadoOperacao, EstadoAnterior definidos sem consumidor. Avaliar se ainda fazem sentido após M3.
**Impacto:** Código limpo — YAGNI.

## BT-13: Corrigir datas da cobrança 6 no seed
**Origem:** Retrospectiva Sprint 1, item 8a
**Descrição:** Cobrança 6 (10 parcelas, diaVencimentoFixo=10) usa adicionarDias(hoje, 5+i*30) em vez de seguir o dia fixo. Corrigir para usar a lógica de proximoVencimento/adicionarMeses.
**Impacto:** Testes — dados de teste não refletem regra do PRD.

## BT-14: Adicionar cenário de parcela fracionada no seed
**Origem:** Retrospectiva Sprint 1, item 7d
**Descrição:** Adicionar cobrança com valor que gera centavos fracionados (ex: R$ 100 em 3x = 33.33/33.33/33.34).
**Impacto:** Testes — valida arredondamento desde o seed.

## BT-15: Adicionar "vence amanhã" e corrigir "atrasada 10 dias" no seed
**Origem:** Retrospectiva Sprint 1, item 8b
**Descrição:** Plano M1 pedia "vence amanhã" e "atrasada 10 dias". Seed tem atrasada 12 dias e não tem "vence amanhã".
**Impacto:** Testes — cobertura de cenários.

## BT-16: Remover variável cob2p1 não usada no seed
**Origem:** Retrospectiva Sprint 1, item 8c
**Descrição:** `const cob2p1` declarado mas nunca referenciado.
**Impacto:** Código limpo — 1 linha.

## BT-17: Atualizar Plano v2.0 — M2b critério "cobrado" (DIVERGÊNCIA PRD vs PLANO)
**Origem:** Sprint 3 — correção M2b
**Descrição:** O Plano v2.0 M2b critério 2 diz "Editar cobrança com parcela cobrada → parcelas são regeneradas (cobrado != pago)". O PRD v2.0 seção 7.5 diz que a regeneração é permitida APENAS se todas as parcelas têm status=pendente. O PRD prevalece. O Plano deve ser atualizado para refletir que cobrado bloqueia a regeneração (edição limitada).
**Impacto:** Documentação — Plano v2.0 diverge do PRD v2.0 em 1 critério de M2b.

## BT-18: base44.entities.EntityName.list() retorna array vazio no backend SDK
**Origem:** Sprint 3 — correção M2b
**Descrição:** `base44.entities.Parcela.list({ limit: 500 })` e `base44.asServiceRole.entities.Parcela.list({ limit: 500 })` retornam array vazio em backend functions (Deno.serve). `get(id)`, `create()` e `update()` funcionam normalmente. Isso afeta seedTestData (o "limpar" step é no-op) e editarCobranca (não encontra parcelas antigas). Solução aplicada: editarCobranca recebe `parcelasAtuaisIds` do frontend e usa `get(id)` individualmente.
**Impacto:** Arquitetura — todas as backend functions que precisam listar registros devem receber IDs externamente ou usar uma abordagem alternativa. Investigar se `list()` com outros parâmetros funciona.

## BT-19: seedTestData "limpar" não funciona (list() retorna vazio)
**Origem:** Sprint 3 — correção M2b
**Descrição:** Como consequência do BT-18, o parâmetro `limpar: true` no seedTestData é um no-op — a função não consegue listar parcelas/cobranças existentes para deletá-las. Cada chamada cria dados adicionais em vez de substituir.
**Impacto:** Testes — acumulação de dados de teste entre execuções. Solução temporária: limpar dados manualmente via update_entities/delete_entities antes de semear.
