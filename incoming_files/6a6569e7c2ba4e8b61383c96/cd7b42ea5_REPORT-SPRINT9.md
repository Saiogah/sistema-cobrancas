# Relatório — Sprint 9 / M15 — Validação End-to-End

**Status final do MVP: ❌ REPROVADO PARA RELEASE.** O backend transacional, RLS e regras centrais passaram; porém permanecem falhas confirmadas de confiabilidade/performance no Dashboard, ausência de paginação real no histórico e falta de um fluxo Supabase Auth que estabeleça uma sessão utilizável pelo frontend. Além disso, não há URL/frontend de teste com navegador automatizado nesta sessão, então critérios estritamente visuais ficaram bloqueados.

## Nota sobre o checklist
O pedido fala em **61 critérios**, mas o **PRD v2.0 definitivo contém AC-01 a AC-86**. Como o PRD prevalece, este relatório valida os 86. No recorte AC-01..61: **51 passaram, 1 falhou, 7 ficaram bloqueados/condicionados e 2 são N/A (M10c)**. No PRD completo: **69 passaram, 3 falharam, 12 ficaram bloqueados/conflitantes e 2 são N/A**.

## Pré-requisito — seed_test_data
- O projeto Supabase conectado estava inicialmente **sem tabelas/migrations/usuários**, apesar do estado declarado. Foram aplicadas as três migrations já aprovadas de infraestrutura.
- A primeira execução do seed **falhou** por um bug real no trigger monetário genérico (`NEW.valor_padrao` em tabelas que não possuem a coluna).
- Foi criada/aplicada `202609010004_fix_money_triggers.sql`, separando os triggers por tabela.
- Reexecução: `{"sucesso":true,"clientes":5,"produtos":3,"cobrancas":5,"parcelas":7}`.
- O usuário técnico/JWT de teste foi necessário porque a aplicação não possui fluxo Supabase Auth. A sessão disponível não ofereceu uma operação segura de remoção desse usuário Auth de teste; portanto o fixture técnico pode permanecer no projeto conectado.

## Cenários M15
| # | Cenário | Resultado | Evidência | Correção / observação |
|---|---|---|---|---|
| 1 | Primeiro acesso e migração | ⚠️ PARCIAL | Seed real passou: 5 clientes, 3 produtos, 5 cobranças, 7 parcelas; onboarding validado estaticamente. Não houve navegador para cadastrar manualmente/printar UI. | Trigger monetário corrigido. |
| 2 | Dia de cobrança | ❌ FALHOU | WhatsApp/service e ações existem, mas Dashboard não é otimista e não tem rollback/retry; interação visual não executada. | Pendência AC83/84; não corrigida sem reescrever estado do Dashboard. |
| 3 | Atrasadas | ⚠️ PARCIAL | Regras de atraso/arquivamento e mensagens validadas; arquivamento corrigido. Cores/transição visual não executadas. | Status preservado ao arquivar; desarquivar adicionado. |
| 4 | Pagamento parcial | ⚠️ PARCIAL | DB real: 100/200 -> pago_parcial; complemento -> pago; undo -> pago_parcial 100. Mensagem calcula saldo. UI visual não executada. | Validação <=0 e truncamento de 2 casas corrigidos. |
| 5 | Edição e exclusão | ✅ PASSOU NO BACKEND / ⚠️ UI | 16 checks SQL: regeneração, edição cobrada limitada, exclusão, bloqueios e vezesUsado passaram. Botões/rotas validados estaticamente. | Sem correção adicional de regra; PRD prevalece para cobrado=edição limitada. |
| 6 | Cliente inativo | ✅ PASSOU | SQL real confirmou inativação exclui da query e reativação restaura; histórico não é apagado. | Telefone também normalizado/validado no M15. |
| 7 | Casos especiais | ✅ PASSOU | Fev/30, 10x, PIX obrigatório e nome <3 validados em domain/RPC. Abril/31 validado na regra geral de domínio. | Nenhuma feature nova. |
| 8 | Performance | ❌ FALHOU | DB: ~0,972ms query e ~1,001ms update; filtro JS ~0,0035ms. Porém Dashboard tem N+1 sequencial e ações não otimistas; browser <2s/<300ms/<500ms não pôde ser provado. | RLS/indexes otimizados; frontend N+1/optimistic pendentes. |
| 9 | Cadastro inteligente | N/A | M10c não foi implementado; o próprio Sprint9 manda marcar N/A. | Nenhuma implementação de Sprint10 iniciada. |

## Evidência de banco real
Todos os **16 checks transacionais** executados no Supabase passaram: seed baseline, criação 10x, fevereiro dia 30, parcial→total→undo, edição completa com regeneração, edição cobrada limitada, exclusão sem pagamento, decremento de uso, bloqueio de exclusão paga, bloqueio de produto usado, inativação/reativação, PIX obrigatório e nome avulso mínimo 3.

RLS após otimização: usuário do teste enxergou `5/5/7` (clientes/cobranças/parcelas); outro `auth.uid()` enxergou `0/0/0`.

Performance apenas do backend: query com carga 50+ parcelas ≈ **0,972 ms**; update de pagamento + triggers ≈ **1,001 ms**. Isso **não substitui** medição de rede/render/browser.

## Bugs encontrados e corrigidos no M15
- Trigger monetário genérico quebrava INSERTs reais no PostgreSQL → funções de trigger tipadas por tabela.
- Arquivamento persistia `status=arquivado` → agora preserva status financeiro e usa somente `arquivada=true`; compatibilidade para registros legados.
- Histórico não oferecia desarquivar → botão/ação adicionados.
- Pagamento parcial aceitava <=0 e somava sem truncamento explícito → validação e truncamento em 2 casas.
- Undo manual usava o estado pago atual como “anterior” → volta para `cobrado` quando já houve envio, senão `pendente`.
- Próximos vencimentos aceitavam quaisquer datas futuras → restritos aos dias `[5,10,15,20,25,30]`.
- Cadastro/edição de telefone não normalizava DDI+DDD → normalização e validação no ClientsPage e cadastro inline do wizard.
- Passo 1 aceitava venda/nome com 1–2 caracteres → mínimo 3.
- `useCharges` não invalidava todos os eventos de parcela → adicionados paid/charged/archived/unarchived.
- Produtos mostrava “Venda avulsa — 0” fixo → COUNT real de cobranças com produto null.
- “Recentes” usava a lista de clientes, não cobranças recentes → ordenado pelos 5 `clienteId` distintos das cobranças mais recentes.
- Advisor apontou FKs sem índice e RLS recalculando auth.uid por linha → índices dedicados + `(select auth.uid())`.

## Bugs / bloqueadores pendentes
- **AC-83/84 / confiabilidade:** Dashboard não faz update otimista com rollback em falha e não exibe toast de erro com `[Tentar novamente]`. O código aguarda a API e depois chama `refresh()`.
- **Performance frontend:** Dashboard ainda faz `Cobranca.get()` e `Cliente.get()` sequenciais por ID (N+1 legado Base44). A meta de browser não pode ser aprovada.
- **AC-54:** “Ver todas” no histórico carrega tudo; não há paginação real.
- **Autenticação:** RLS depende de `auth.uid()`, mas o frontend não estabelece sessão Supabase Auth. Criar tela/fluxo de login seria feature nova e foi deliberadamente não implementado neste sprint.
- **Browser/visual:** não existe URL implantada/browser automatizado disponível nesta sessão; cores, animações, máscara do input parcial, clipboard e reload do estado “Confirmar envio” não puderam receber evidência visual.
- **Security hardening:** `seed_test_data` segue executável por `authenticated`; é útil para teste, mas deve ser removido/revogado no ambiente de produção. O advisor também informa proteção contra senhas vazadas desativada.

## Checklist completo — PRD v2.0
Legenda: ✅ validado; ❌ falha confirmada; ⚠️ bloqueado/depende de browser ou há conflito interno do PRD; N/A fora do MVP conforme regra explícita do Sprint9.

| AC | Critério resumido | Status | Evidência |
|---|---|---|---|
| AC-01 | Dashboard mostra hoje + atrasadas | ✅ | useDashboard/DB |
| AC-02 | Atrasadas acima das de hoje | ✅ | ordenação do Dashboard |
| AC-03 | Gradiente 1–3 laranja / 4+ vermelho | ⚠️ | regra existe; visual não executado em browser |
| AC-04 | Contadores refletem lista atual | ✅ | EventBus + refresh |
| AC-05 | Estado vazio + próximo vencimento | ✅ | DashboardPage |
| AC-06 | Próximos 3 dias com parcelas | ✅ | useDashboard corrigido |
| AC-07 | Dias vazios do enum omitidos | ✅ | useDashboard corrigido |
| AC-08 | Cliente inativo não aparece | ✅ | teste SQL real |
| AC-09 | Parcela arquivada não aparece | ✅ | filtro + correção arquivamento |
| AC-10 | Busca nome/produto/telefone | ✅ | DashboardPage; filtro local medido |
| AC-11 | Cobrar abre WhatsApp formatado | ✅ | whatsapp.service + handler |
| AC-12 | Status só muda em Confirmar envio | ⚠️ | fluxo estático; clique real não executado |
| AC-13 | Card muda após confirmar envio | ⚠️ | visual não executado |
| AC-14 | Marcar pago abre menu total/parcial | ⚠️ | componente visual não executado |
| AC-15 | Pagamento total sem confirmação + undo | ✅ | DashboardPage/useParcelActions |
| AC-16 | Parcial abre input com máscara | ⚠️ | browser/componente não executado |
| AC-17 | Parcial >0 <saldo; >= saldo vira total | ✅ | hook corrigido + DB |
| AC-18 | Card parcial mostra R$ X de R$ Y | ⚠️ | visual não executado |
| AC-19 | Seleção em lote 2+ e pagar | ✅ | DashboardPage/useBatchSelect |
| AC-20 | Undo em lote único | ✅ | DashboardPage |
| AC-21 | Arquivar sai do Dashboard e fica histórico | ✅ | correção M15 + filtro |
| AC-22 | Desarquivar volta quando aplicável | ✅ | ClientsPage + hook corrigidos |
| AC-23 | Wizard tem 4 passos | ✅ | NewChargePage |
| AC-24 | Cliente + produto no passo 1 | ✅ | NewChargePage |
| AC-25 | Valor + pagamento no passo 2 | ✅ | NewChargePage |
| AC-26 | PIX inline ao selecionar PIX | ✅ | PaymentSelector/flow |
| AC-27 | PIX obrigatório | ✅ | wizard + RPC real |
| AC-28 | Sem boleto | ✅ | scan final |
| AC-29 | Venda avulsa mínimo 3 chars | ✅ | wizard corrigido + RPC real |
| AC-30 | Venda avulsa produtoServicoId=null | ✅ | wizard/RPC |
| AC-31 | Primeiro vencimento sugerido | ✅ | domain test |
| AC-32 | Dia fixo=hoje sugere hoje | ✅ | domain test |
| AC-33 | Preview inclusive 1 parcela | ✅ | Sprint7/static |
| AC-34 | Preview recalcula dia/data | ✅ | domain/static |
| AC-35 | Sem revisão separada | ✅ | NewChargePage |
| AC-36 | Sucesso: Nova cobrança / Voltar Hoje | ✅ | NewChargePage |
| AC-37 | Cadastro inteligente para histórico 2+ | N/A | M10c não implementado; regra explícita do Sprint9 |
| AC-38 | Sem sugestão para 0/1 cobrança | N/A | M10c não implementado |
| AC-39 | Produtos por frequência | ✅ | useProducts |
| AC-40 | Recentes = 5 clientes das cobranças mais recentes | ✅ | corrigido M15 |
| AC-41 | Valor >0 <=999999.99 | ✅ | wizard/RPC/schema |
| AC-42 | Parcelas 1–60 | ✅ | wizard/RPC/schema |
| AC-43 | À vista gera 1 parcela | ✅ | seed/RPC |
| AC-44 | Parcelado gera N | ✅ | 10x real |
| AC-45 | Soma parcelas = cobrança | ✅ | seed + 10x real |
| AC-46 | Última parcela recebe centavos | ✅ | seed R$100/3 |
| AC-47 | Dia 30 fevereiro -> 28/29 | ✅ | domain + SQL real |
| AC-48 | Dia 31 abril -> 30 | ✅ | domain geral; 31 não está no enum de UI |
| AC-49 | Primeira parcela usa primeiro vencimento | ✅ | domain/RPC |
| AC-50 | Subsequentes usam dia fixo | ✅ | domain/RPC |
| AC-51 | Clientes: busca nome/telefone | ✅ | ClientsPage |
| AC-52 | Card cliente expande inline | ⚠️ | browser não executado |
| AC-53 | Histórico mostra 5 recentes | ✅ | useCharges limite |
| AC-54 | Ver todas mostra lista paginada | ❌ | carregarTodas traz tudo; paginação não existe |
| AC-55 | Inativo some Dashboard e mantém histórico | ✅ | SQL real + arquitetura |
| AC-56 | Inativação pede confirmação | ✅ | ClientsPage |
| AC-57 | Reativação restaura parcelas | ✅ | SQL real |
| AC-58 | Telefone armazenado DDI+DDD só dígitos | ✅ | correção M15 + schema |
| AC-59 | Telefone exibido com máscara | ✅ | format.utils real |
| AC-60 | Produtos ordenados por uso | ✅ | useProducts |
| AC-61 | Valor padrão opcional | ✅ | schema/UI |
| AC-62 | Produto: edição inline | ✅ | ProductsPage |
| AC-63 | Produto em uso não exclui | ✅ | SQL real/FK + UI |
| AC-64 | Venda avulsa é agrupamento não editável | ✅ | ProductsPage corrigida com COUNT |
| AC-65 | Editar todas pendentes regenera | ✅ | RPC real |
| AC-66 | Alguma cobrada: só observações/PIX | ✅ | RPC real edicaoLimitada=true |
| AC-67 | Editar só aparece se todas pendentes | ⚠️ | conflito interno: AC66 exige acesso à edição limitada; implementação mantém botão e restringe campos |
| AC-68 | Excluir sem pagamento deleta tudo | ✅ | RPC real |
| AC-69 | Excluir com pagamento bloqueia | ✅ | RPC real |
| AC-70 | Excluir decrementa vezesUsado | ✅ | RPC real 1→2→1 |
| AC-71 | Desfazer manual disponível | ✅ | ClientsPage corrigida |
| AC-72 | Mensagem hoje usa ‘vence em’ | ⚠️ | PRD §15 diz “vence hoje”; código segue template, conflito textual no AC |
| AC-73 | Atrasada usa ‘venceu em’ | ⚠️ | PRD §15/cenário dizem “venceu no dia”; código segue template |
| AC-74 | Mensagem inclui nome/produto/valor/data | ✅ | whatsapp.service real |
| AC-75 | PIX só quando forma PIX e chave | ✅ | whatsapp.service real |
| AC-76 | Parcial menciona saldo | ✅ | whatsapp.service real |
| AC-77 | Copiar mensagem usa clipboard | ⚠️ | componente/browser não foi executado |
| AC-78 | wa.me usa telefone em dígitos | ✅ | whatsapp.service real |
| AC-79 | Onboarding quando sem dados | ✅ | App/OnboardingGuide estático |
| AC-80 | Onboarding some após 1ª cobrança | ✅ | charge:created + App |
| AC-81 | Dias trabalhados persistem | ✅ | config/schema/hook |
| AC-82 | Default seg-sex [1..5] | ✅ | schema/seed |
| AC-83 | Falha marcar pago: card volta + toast erro | ❌ | Dashboard aguarda API; rollback otimista ausente |
| AC-84 | Toast erro tem Tentar novamente | ❌ | Dashboard não possui retry de ações |
| AC-85 | Falha criar cobrança não deixa parcelas | ✅ | RPC ACID + NewCharge preserva dados |
| AC-86 | Confirmar envio intermediário não persiste | ⚠️ | estado de UI previsto; browser reload não executado |

## Checklist de não-avanço
| # | Verificação | Resultado |
|---|---|---|
| 1 | Nenhum `console.error` / `console.warn` em operação normal | ✅ scan produção |
| 2 | Nenhum `setInterval` ou polling | ✅ `setInterval(` ausente; arquitetura EventBus |
| 3 | Nenhuma referência a boleto no enum | ✅ scan + `FormaPagamento` |
| 4 | Nenhum campo `parcelado` persistido | ✅ scan de token exato; `isParcelado` é somente estado de UI derivado |
| 5 | Nenhuma `dataLimite` | ✅ scan |
| 6 | Moeda em reais, 2 casas | ✅ NUMERIC(12,2), triggers tipados e domain tests |
| 7 | Datas YYYY-MM-DD sem hora | ✅ colunas DATE + tipos string date |
| 8 | Arredondamento consistente backend/frontend | ✅ R$100/3 testado: 33,33 + 33,33 + 33,34 |

## Testes e compilação
- TypeScript das alterações do M15: **PASS** no harness de contratos usado nos Sprints 7/8 (`npx tsc --noEmit`).
- `SPRINT9_DOMAIN_STATIC_OK` — meses curtos, 100/3, 10x, edição/exclusão, correções estáticas e filtro local.
- `SPRINT9_SQL_STATIC_OK` — tipos monetários/data, arredondamento SQL, guards de edição/exclusão, seed relativo.
- `FORBIDDEN_SCAN_OK`.
- Supabase: seed após correção + 16 checks transacionais + RLS real passaram.
- **Limitação:** não foi possível executar um `npm build` sobre um checkout Git completo no runtime, pois `git clone`/DNS externo continua indisponível. O GitHub foi usado para inspeção do código real; o typecheck foi feito sobre o overlay/contratos reconstruídos.

## Status final
**❌ MVP REPROVADO PARA RELEASE neste momento.** As regras de negócio e o backend estão em bom estado após as correções, mas AC-83/84 são requisitos de confiabilidade explícitos e estão confirmadamente ausentes, AC-54 falha, a performance E2E do Dashboard não pode ser aprovada com o N+1 atual, e não há sessão Supabase Auth utilizável pelo frontend. M10c permaneceu N/A e nenhum Sprint 10 foi iniciado.