# Plano de Implementação — Sistema de Cobranças (v2.0)

**Base:** PRD v2.0
**Plataforma:** Base44
**Estratégia:** Desenvolvimento incremental, módulos independentes com dependências explícitas
**Substitui:** v1.0

---

## 0. Changelog v2.0

| # | Problema original | Solução adotada | Justificativa técnica | Impacto arquitetura | Impacto cronograma | Compatível PRD v2.0 |
|---|---|---|---|---|---|---|
| 1 | Dependência circular M3↔M5: M3 usa tipos de M5 mas M5 depende de M3 | M5 antes de M3. M5 não tem dependências. M3 depende de M5. | Elimina referência forward. Tipos devem existir antes das funções que os usam. | M3 depende de M5 em vez de nenhum. M5 perde dependência de M3. | M5 e M1 paralelos no Sprint 1. M3 no Sprint 2. | ✅ — PRD não define ordem de construção |
| 2 | M3 com 9 arquivos misturando utils e domain em um checkpoint | M3 dividido em M3a (utils: math, date, format, validation) e M3b (domain: billing, parcel, status, overdue, charge) | Utils são triviais e independentes. Domain é complexo e depende de utils. Separar permite concluir M3a e iniciar M3b/M2 em paralelo. | Dois módulos em vez de um. M3b depende de M3a. | M3a no Sprint 2, M3b no Sprint 3 paralelo a M2. | ✅ — estrutura de diretórios do PRD já separa lib/ e domain/ |
| 3 | M4 (services) é wrapper 1:1 do SDK sem abstração real | M4 removido. Hooks chamam o SDK do Base44 diretamente. whatsapp.service.ts e clipboard.service.ts movidos para M5. | Em Base44, o SDK já é a API (`import { EntityName } from '@/api/entities'`). Uma camada que apenas repassa chamadas adiciona um arquivo por entidade sem benefício. A única exceção — criarCobranca — já é uma backend function. | Remoção de services/api.service.ts. Hooks dependem de M1+M3+M5 em vez de M4. whatsapp.service e clipboard.service movidos para M5. | Sprint 3 (M4) eliminado. Hooks começam 1 sprint mais cedo. | ✅ — PRD define services/ como camada, mas não exige wrapper do SDK. A arquitetura modular é preservada com hooks encapsulando acesso a dados. |
| 4 | M6 com 7 hooks de complexidade desigual em um checkpoint | M6 dividido em M6a (useClients, useProducts, useCharges, useConfig) e M6b (useDashboard, useParcelActions) | M6a é CRUD simples que desbloqueia M11, M12, M13. M6b é complexo e só desbloqueia M9. Separar permite paralelizar páginas simples antes do Dashboard. | Dois módulos. M6b depende de M6a. | M6a no Sprint 4. M6b no Sprint 5. M11/M12/M13 no Sprint 5 em paralelo. | ✅ — PRD não define granularidade de hooks |
| 5 | useBatchSelect em M6 mas só usado no Dashboard (M9) | Movido para M9. O hook é construído junto com o componente que o usa. | O hook precisa da interface do ChargeCard (círculo de seleção). Construir antes do componente gera retrabalho na API do hook. | M6b reduzido para 2 hooks. M9 ganha 1 hook interno. | Sem impacto (era Sprint 4, agora Sprint 6 — mesmo momento do Dashboard). | ✅ |
| 6 | M8 mistura componentes complexos (ChargeCard) com triviais (BatchBar, OnboardingGuide) | M8 dividido em M8a (core: ChargeCard, autocompletes, PaymentSelector, ParcelPreview) e M8b (auxiliares: BatchBar). OnboardingGuide movido para M14. | M8a bloqueia M9 e M10. M8b (BatchBar) é trivial e pode ser feito junto com M9. OnboardingGuide depende de detecção de estado vazio que só existe na integração (M14). | Três mudanças: M8a com 5 componentes, M8b com 1 (BatchBar) dentro de M9, OnboardingGuide em M14. | M8a no Sprint 5. BatchBar e OnboardingGuide adiados para Sprint 6/8. | ✅ |
| 7 | M10 com 20 critérios em um único módulo | M10 dividido em M10a (passos 1+2: seleção), M10b (passos 3+4: vencimento+sucesso), M10c (cadastro inteligente, pós-MVP) | M10a e M10b são sequenciais mas com checkpoints separados. M10c é otimização que não bloqueia o MVP. | Três módulos. M10b depende de M10a. M10c depende de M14. | M10a no Sprint 6, M10b no Sprint 7, M10c no Sprint 10 (opcional). | ✅ — PRD define cadastro inteligente como feature, não como bloqueador do MVP. Funcional sem ele. |
| 8 | M2 (createCobranca) e M3 (domain) duplicam lógica de parcelas sem alinhamento | M3a (utils) concluído antes de M2. M2 reimplementa a lógica independentemente (duplicação consciente). Ambos validados contra os mesmos testes. | Backend functions em Base44 são isoladas — não importam de src/. Duplicar é inevitável. O risco de divergência é mitigado por testes compartilhados. | M2 depende de M3a. Adicionado critério de não-avanço: se M3a muda, M2 deve ser revalidado. | M3a no Sprint 2, M2 no Sprint 3. | ✅ — PRD exige backend function para criação atômica |
| 9 | Edição de cobrança "regenera parcelas" sem transação — risco de perder parcelas | M2b (editarCobranca backend function) adicionado. Estratégia: criar novas parcelas primeiro, depois deletar as antigas, depois atualizar a cobrança. | Sem transação ACID, criar-antes-de-deletar é mais seguro que deletar-antes-de-criar. Se criar falha, as antigas continuam existindo. | Novo módulo M2b no Sprint 3. | +0.5 dia no Sprint 3. | ✅ — PRD exige edição de cobrança com regeneração de parcelas |
| 10 | Dados de teste do M1 com datas absolutas ficam desatualizados entre sprints | M1 inclui `seed-test-data.ts` que cria dados com datas calculadas dinamicamente (relative a hoje). Reutilizável em M9, M10, M14, M15. | Datas absolutas tornam testes não reprodutíveis. Datas relativas garantem que "vence hoje" sempre vence hoje. | M1 ganha 1 arquivo de seed. Cada fase de teste chama o seed antes. | +0.5 dia no Sprint 1. | ✅ |
| 11 | M2 não especifica role do SDK (user-scoped vs asServiceRole) | M2 usa `base44.entities` (user-scoped) para criar cobranças e parcelas. `base44.asServiceRole` apenas para incrementar vezesUsado se RLS bloquear. | RLS está habilitado. O update cross-entity (incrementar vezesUsado do ProdutoServico a partir da criação de Cobranca) pode exigir service role. | M2 especifica explicitamente qual role usar em cada operação. | Sem impacto. | ✅ — PRD exige RLS |
| 12 | M7 no Sprint 4 mas depende apenas de M5+M3a (Sprint 1-2) | M7 movido para Sprint 2, em paralelo com M3a. | M7 usa apenas tipos (M5) e format.utils (M3a). Pode começar assim que M5 está pronto. | M7 no Sprint 2 em vez de Sprint 4. | M7 concluído 2 sprints mais cedo. Desbloqueia M8a e M11/M12 mais cedo. | ✅ |
| 13 | M11/M12/M13 no Sprint 7 mas dependem de M6a+M7 (Sprint 2-4) | M11/M12/M13 movidos para Sprint 5, em paralelo com M8a e M6b. | M11 e M12 dependem apenas de M6a (hooks básicos) e M7 (componentes base), não de M8a (compostos). M13 é trivial (1-2h). | Sprint 5 agora tem 4 módulos paralelos. | Páginas simples concluídas 2 sprints mais cedo. | ✅ |
| 14 | M9 não define comportamento do clique em "Próximos vencimentos" | Adicionado critério: clique abre overlay/modal listando parcelas daquele dia. Não navega para outra página. | Sem definição, dois devs implementam de forma diferente (overlay vs navegação). | Novo critério em M9. | Sem impacto. | ✅ — PRD define "linhas clicáveis" mas não o comportamento |
| 15 | M10 não define tratamento de erro do backend function | Adicionado critério: se backend retorna erro, wizard permanece no passo atual com toast de erro. Dados não são perdidos. | Sem definição, o desenvolvedor pode limpar o wizard ou redirecionar para o Dashboard. | Novo critério em M10b. | Sem impacto. | ✅ |
| 16 | M14 não detalha fluxo de edição tecnicamente | Adicionado: M10 recebe prop editMode=true e cobrancaId. Passo 1 como somente leitura. Botão diz "Salvar alterações". Chama editarCobranca (M2b), não createCobranca. | Sem definição, a edição seria implementada de forma diferente do fluxo de criação. | M14 detalha a integração da edição. | Sem impacto. | ✅ — PRD exige edição de cobrança |
| 17 | M15 não testa cadastro inteligente end-to-end | Adicionado cenário 9: criar 3 cobranças para mesmo cliente com mesmo PIX, abrir Nova Cobrança, verificar pré-preenchimento. | Sem teste E2E, o cadastro inteligente pode funcionar em unit tests mas falhar na integração. | Novo cenário em M15. | Sem impacto (Sprint 10). | ✅ |

---

## 1. Visão Geral

21 módulos em 10 fases. Cada módulo é independente, testável isoladamente, e só avança após validar seus critérios de conclusão. A ordem minimiza retrabalho — cada módulo só depende de módulos já concluídos.

```
Sprint 1: M1 (entities) + M5 (types/config/event-bus/services)
Sprint 2: M3a (utils) + M7 (componentes base)
Sprint 3: M2 (createCobranca) + M2b (editarCobranca) + M3b (domain)
Sprint 4: M6a (hooks básicos) + M13 (Settings)
Sprint 5: M6b (hooks complexos) + M8a (compostos core) + M11 (Clientes) + M12 (Produtos)
Sprint 6: M9 (Dashboard) + M10a (Nova Cobrança passos 1+2)
Sprint 7: M10b (Nova Cobrança passos 3+4)
Sprint 8: M14 (integração, onboarding, edição)
Sprint 9: M15 (validação E2E)
Sprint 10: M10c (cadastro inteligente — opcional/pós-MVP)
```

**MVP funcional ao final do Sprint 9 (~16 dias úteis).** Sprint 10 é melhoria opcional.

### Diagrama de dependências

```
Sprint 1:  M1 ─────────┬───────────────────────────────────────────────
                     │
         M5 ─────────┼──────┬──────────────────────────────────────────
                     │      │
Sprint 2:  M3a ──────┼──────┤
                     │      │
         M7 ─────────┼──────┼──────┬──────────────────────────────────
                     │      │      │
Sprint 3:  M2 ───────┘      │      │
         M2b ───────────────┘      │
         M3b ──────────────────────┤
                                   │
Sprint 4:  M6a ───────────────────┤
         M13 ─────────────────────┤
                                   │
Sprint 5:  M6b ───────────────────┤
         M8a ─────────────────────┤
         M11 ─────────────────────┤
         M12 ─────────────────────┤
                                   │
Sprint 6:  M9 ────────────────────┤
         M10a ────────────────────┤
                                   │
Sprint 7:  M10b ──────────────────┤
                                   │
Sprint 8:  M14 ────────────────────┤
                                   │
Sprint 9:  M15 ────────────────────┘

Sprint 10: M10c (opcional)
```

### Matriz de dependências

| Módulo | Depende de | Bloqueia | Sprint |
|---|---|---|---|
| M1 | — | M2, M2b, M6a | 1 |
| M5 | — | M3a, M7, M6a | 1 |
| M3a | M5 | M3b, M2, M2b, M7, M6a | 2 |
| M7 | M5, M3a (format.utils apenas) | M8a, M11, M12, M13 | 2 |
| M2 | M1, M3a | M10a | 3 |
| M2b | M1, M3a | M14 | 3 |
| M3b | M3a, M5 | M6b, M8a, M10 | 3 |
| M6a | M1, M3a, M5 | M6b, M11, M12, M13, M10a | 4 |
| M13 | M6a, M7 | M14 | 4 |
| M6b | M6a, M3b | M9 | 5 |
| M8a | M7, M3b, M5 | M9, M10a | 5 |
| M11 | M6a, M7 | M14 | 5 |
| M12 | M6a, M7 | M14 | 5 |
| M9 | M6b, M8a, M7 | M14 | 6 |
| M10a | M8a, M6a, M2 | M10b | 6 |
| M10b | M10a | M14 | 7 |
| M14 | M9, M10b, M11, M12, M13, M2b | M15, M10c | 8 |
| M15 | M14 | — | 9 |
| M10c | M14 | — | 10 (opcional) |

---

## Sprint 1 — Fundação

### Módulo M1: Entities + Seed de Teste

**Objetivo:** Criar as 5 entities no Base44 com schemas exatos do PRD v2.0 seção 6, e preparar dados de teste com datas relativas.

**Tarefas:**
1. Criar entity `Cliente` via `manage_entity_schemas` (action=create)
   - Schema: `{ nome: { type: "string" }, telefone: { type: "string" }, observacoes: { type: "string" }, ativo: { type: "boolean", default: true } }`
2. Criar entity `ProdutoServico`
   - Schema: `{ nome: { type: "string" }, valorPadrao: { type: "number" }, vezesUsado: { type: "number", default: 0 } }`
3. Criar entity `Cobranca`
   - Schema: `{ clienteId: { type: "string", ref: "Cliente" }, produtoServicoId: { type: "string", ref: "ProdutoServico" }, nomeProdutoServico: { type: "string" }, valor: { type: "number" }, formaPagamento: { type: "string", enum: ["pix", "dinheiro", "cartao_credito", "cartao_debito", "transferencia"] }, quantidadeParcelas: { type: "number" }, primeiroVencimento: { type: "string", format: "date" }, diaVencimentoFixo: { type: "number", enum: [5, 10, 15, 20, 25, 30] }, pixUtilizado: { type: "string" }, observacoes: { type: "string" } }`
4. Criar entity `Parcela`
   - Schema: `{ cobrancaId: { type: "string", ref: "Cobranca" }, clienteId: { type: "string", ref: "Cliente" }, numeroParcela: { type: "number" }, valor: { type: "number" }, valorPago: { type: "number" }, dataVencimento: { type: "string", format: "date" }, status: { type: "string", enum: ["pendente", "cobrado", "pago", "pago_parcial", "arquivado"], default: "pendente" }, dataPagamento: { type: "string", format: "date" }, dataCobrancaEnviada: { type: "string", format: "date" }, arquivada: { type: "boolean", default: false } }`
5. Criar entity `Configuracao`
   - Schema: `{ diasTrabalhados: { type: "string" } }` — armazenado como string "1,2,3,4,5" (ver critério de teste abaixo)
6. Habilitar RLS em todas as entities
7. Escrever `lib/seed-test-data.ts` — função que cria dados de teste com datas relativas a hoje

**seed-test-data.ts deve criar:**
- 5 clientes: Maria Silva (ativo), João Pereira (ativo), Ana Costa (ativo), Carlos Santos (ativo), Fernanda Souza (inativo)
- 3 produtos: Manutenção Mensal (R$ 200, vezesUsado=8), Consultoria (R$ 150, vezesUsado=5), Hospedagem (R$ 80, vezesUsado=3)
- Cobranças e parcelas cobrindo: vence hoje, vence amanhã, atrasada 2 dias, atrasada 10 dias, paga, pago parcial (R$ 100 de R$ 200), arquivada, à vista, parcelada 3x, parcelada 10x, venda avulsa (produtoServicoId=null), PIX e dinheiro
- 1 Configuracao com diasTrabalhados = "1,2,3,4,5"
- Todas as datas calculadas com `const hoje = new Date()` em timezone America/Sao_Paulo

**Dependências:** Nenhuma

**Critérios de conclusão:**
- [ ] As 5 entities existem via `manage_entity_schemas` action=list
- [ ] Campos obrigatórios marcados como required
- [ ] Defaults configurados (ativo=true, vezesUsado=0, status=pendente, arquivada=false)
- [ ] RLS habilitado em todas as entities
- [ ] `formaPagamento` enum tem exatamente 5 valores (pix, dinheiro, cartao_credito, cartao_debito, transferencia — sem boleto)
- [ ] `diaVencimentoFixo` enum tem exatamente [5, 10, 15, 20, 25, 30]
- [ ] `status` enum tem exatamente [pendente, cobrado, pago, pago_parcial, arquivado]
- [ ] seed-test-data.ts executa sem erro e cria todos os registros
- [ ] Dados do seed têm datas relativas a hoje (não hardcoded)

**Testes antes de avançar:**
1. Criar registros via `create_entity_records` e ler via `read_entities` — confirmar campos gravam e recuperam corretamente
2. Tentar criar cobrança com formaPagamento = "boleto" — se Base44 rejeitar, confirmar erro. Se não rejeitar, registrar como limitação conhecida (validação em código no M2 e M3).
3. Tentar criar parcela com status = "invalido" — mesmo procedimento
4. Criar Configuracao com diasTrabalhados = [1,2,3,4,5] — se persistir como array, manter. Se não persistir, armazenar como string "1,2,3,4,5" e converter no frontend.
5. Executar seed-test-data.ts → confirmar que parcelas "de hoje" têm dataVencimento = hoje
6. Confirmar RLS: ler entidades como usuário não-admin — deve ver apenas próprios registros

---

### Módulo M5: Types, Config, EventBus e Services Leves

**Objetivo:** Definir todas as tipagens TypeScript, configurações, EventBus, e serviços que não são wrappers do SDK (WhatsApp e clipboard).

**Tarefas:**

**5a. Tipos TypeScript**
- `types/client.types.ts` — Cliente, ClienteInput, ClienteUpdate
- `types/product.types.ts` — ProdutoServico, ProdutoInput
- `types/charge.types.ts` — Cobranca, CobrancaInput, CobrancaUpdate, FormaPagamento (union type: "pix" | "dinheiro" | "cartao_credito" | "cartao_debito" | "transferencia")
- `types/parcel.types.ts` — Parcela, ParcelaInput, ParcelaStatus (union: "pendente" | "cobrado" | "pago" | "pago_parcial" | "arquivado"), AcaoStatus, EstadoAnterior
- `types/common.types.ts` — DiasVencimento (5|10|15|20|25|30), EventTypes, ResultadoOperacao

**5b. Configurações**
- `config/days.config.ts` — `export const DIAS_VENCIMENTO = [5, 10, 15, 20, 25, 30] as const`
- `config/messages.config.ts` — 3 templates de mensagem WhatsApp (hoje, atrasada, pago parcial) com placeholders [Nome], [Valor], [Produto], [Data], [PIX], [SaldoDevedor]
- `config/app.config.ts` — MAX_PARCELAS=60, MAX_VALOR=999999.99, UNDO_TIMEOUT=5000, TOAST_DURATION=5000

**5c. Infraestrutura**
- `lib/event-bus.ts` — EventBus com métodos emit, on, off, once. Tipagem de eventos via EventTypes.

**5d. Services leves (não-wrappers do SDK)**
- `services/whatsapp.service.ts` — `gerarLinkWhatsApp(telefone, mensagem): string` e `gerarMensagem(parcela, cobranca, cliente): string`. Seleção de template: pago_parcial → template parcial; atrasada (dataVencimento < hoje) → template atrasada; senão → template hoje. Substituição de placeholders. Linhas de PIX apenas se formaPagamento=pix E pixUtilizado != null.
- `services/clipboard.service.ts` — `copiar(texto: string): Promise<boolean>` com fallback para execCommand.

**Dependências:** Nenhuma

**Critérios de conclusão:**
- [ ] Todos os tipos compilam sem erro
- [ ] DIAS_VENCIMENTO tem exatamente [5, 10, 15, 20, 25, 30]
- [ ] FormaPagamento tem 5 valores (sem boleto)
- [ ] ParcelaStatus tem 5 valores (pendente, cobrado, pago, pago_parcial, arquivado)
- [ ] EventBus: emit dispara callback registrado via on
- [ ] EventBus: off remove callback
- [ ] EventBus: once dispara apenas uma vez
- [ ] messages.config.ts tem 3 templates com placeholders corretos
- [ ] `gerarLinkWhatsApp("5511987654321", "Olá")` → `https://wa.me/5511987654321?text=Ol%C3%A1`
- [ ] `gerarMensagem` para parcela vencendo hoje com PIX → mensagem contém "vence hoje", chave PIX, sem saldo devedor
- [ ] `gerarMensagem` para parcela atrasada → mensagem contém "venceu no dia" e "Pode verificar o pagamento?"
- [ ] `gerarMensagem` para pago_parcial → mensagem contém "R$ X pendentes"
- [ ] `gerarMensagem` para forma=dinheiro → mensagem NÃO contém "Forma de pagamento" nem "Chave"
- [ ] `copiar("teste")` retorna true

**Testes antes de avançar:**
1. Compilar todos os arquivos .ts sem erros
2. Testar EventBus: registrar listener, emitir evento, confirmar callback disparado
3. Testar EventBus: once → emitir 2x → só disparou 1x
4. Gerar link WhatsApp para 3 cenários (hoje, atrasada, pago parcial) → validar formato
5. Testar clipboard em pelo menos 1 browser

---

## Sprint 2 — Utils e Componentes Base

### Módulo M3a: Utils (Funções Puras de Utilidade)

**Objetivo:** Implementar funções puras de matemática, data, formatação e validação.

**Tarefas:**

**3a-1. `lib/math.utils.ts`**
- `dividirValor(valor: number, parcelas: number): { valorBase: number, valorUltima: number }`
- `valorBase = Math.floor((valor / parcelas) * 100) / 100` (truncate em 2 casas)
- `valorUltima = Math.round((valor - (valorBase * (parcelas - 1))) * 100) / 100` (round para evitar float drift)
- Todos os valores em reais com 2 casas decimais (não centavos inteiros)

**3a-2. `lib/date.utils.ts`**
- `hoje(): string` — retorna YYYY-MM-DD em timezone America/Sao_Paulo (não UTC)
- `formatarDataBR(iso: string): string` — "15/08/2026"
- `formatarDataCurta(iso: string): string` — "15/08"
- `adicionarMeses(data: string, meses: number): string` — regra: se o dia não existe no mês alvo, usar o último dia do mês
- `proximoVencimento(diaFixo: number, dataReferencia: string): string` — próxima ocorrência do diaFixo a partir de dataReferencia (inclusive)
- `diasEntre(data1: string, data2: string): number` — diferença em dias corridos (data2 - data1)
- `mesAlvoExisteDia(ano: number, mes: number, dia: number): boolean`
- `ehFimDeSemana(data: string): boolean` — sábado (6) ou domingo (0)

**3a-3. `lib/format.utils.ts`**
- `formatarMoeda(valor: number): string` — "R$ 200,00" (Intl.NumberFormat pt-BR)
- `formatarTelefone(telefone: string): string` — "(11) 98765-4321"
- `formatarTelefoneCurto(telefone: string): string` — "(11) 98765..."

**3a-4. `lib/validation.utils.ts`**
- `validarTelefone(telefone: string): boolean` — 12-13 dígitos, só números
- `validarValorMonetario(valor: number): boolean` — >0 e <=999999.99
- `validarQuantidadeParcelas(qtd: number): boolean` — 1-60
- `validarNomeProduto(nome: string): boolean` — mínimo 3 chars
- `normalizarTelefone(input: string): string` — remove não-dígitos, adiciona "55" se não tem DDI

**Dependências:** M5 (types)

**Critérios de conclusão:**
- [ ] `dividirValor(100, 3)` → { valorBase: 33.33, valorUltima: 33.34 }
- [ ] `dividirValor(200, 2)` → { valorBase: 100, valorUltima: 100 }
- [ ] `dividirValor(99.99, 3)` → soma das 3 parcelas (valorBase×2 + valorUltima) = 99.99
- [ ] `dividirValor(1500, 10)` → { valorBase: 150, valorUltima: 150 }
- [ ] `adicionarMeses("2026-01-30", 1)` → "2026-02-28" (fevereiro não bissexto)
- [ ] `adicionarMeses("2024-01-30", 1)` → "2024-02-29" (2024 bissexto)
- [ ] `adicionarMeses("2026-03-31", 1)` → "2026-04-30" (abril tem 30 dias)
- [ ] `adicionarMeses("2026-01-31", 2)` → "2026-03-31" (março tem 31 dias)
- [ ] `proximoVencimento(10, "2026-07-05")` → "2026-07-10"
- [ ] `proximoVencimento(10, "2026-07-15")` → "2026-08-10"
- [ ] `proximoVencimento(10, "2026-07-10")` → "2026-07-10" (inclusive)
- [ ] `hoje()` retorna data no formato YYYY-MM-DD (não ISO datetime)
- [ ] `diasEntre("2026-07-10", "2026-07-20")` → 10
- [ ] `formatarMoeda(200)` → "R$ 200,00"
- [ ] `formatarMoeda(66.67)` → "R$ 66,67"
- [ ] `normalizarTelefone("11 98765-4321")` → "5511987654321"
- [ ] `validarValorMonetario(0)` → false
- [ ] `validarQuantidadeParcelas(61)` → false
- [ ] `validarNomeProduto("ab")` → false

**Testes antes de avançar:**
1. Rodar todos os testes de critérios de conclusão acima
2. Verificar que `hoje()` não retorna data em UTC quando executado após 21:00 no Brasil
3. Verificar que `dividirValor` com 7 parcelas de R$ 100 → soma exata = 100.00

---

### Módulo M7: Componentes Base

**Objetivo:** Implementar componentes reutilizáveis simples, sem dependência entre eles.

**Tarefas (cada componente é independente):**

1. **`components/StatusBadge`** — recebe status + diasAtraso → badge colorido (pendente=neutro/muted, cobrado=amarelo/warning, pago=verde/success, pago_parcial=azul/info, atrasado 1-3 dias=laranja, atrasado 4+=vermelho/destructive)
2. **`components/DayBadge`** — recebe número do dia → badge "Dia 05"
3. **`components/EmptyState`** — recebe título + descrição opcional → estado vazio
4. **`components/UndoToast`** — recebe mensagem + onUndo → toast fixo no rodapé, desaparece após 5s
5. **`components/SearchInput`** — debounce 300ms, callback onChange, ícone de lupa, botão limpar
6. **`components/CopyButton`** — recebe texto, ao clicar copia para clipboard, feedback "Copiado!" por 2s

**Dependências:** M5 (types), M3a (format.utils para StatusBadge usar formatarMoeda)

**Critérios de conclusão:**
- [ ] StatusBadge renderiza corretamente para cada um dos 5 status + 2 variações de atraso
- [ ] DayBadge renderiza "Dia 05" para input 5
- [ ] EmptyState renderiza título e descrição
- [ ] UndoToast aparece ao chamar, desaparece após 5s, botão [Desfazer] chama callback
- [ ] SearchInput debounce 300ms (não dispara a cada tecla)
- [ ] CopyButton copia texto e mostra "Copiado!" por 2s
- [ ] Nenhum componente usa setInterval (UndoToast usa setTimeout)
- [ ] Todos componentes são React.memo

**Testes antes de avançar:**
1. Renderizar StatusBadge com cada status → verificar cor e texto
2. Renderizar UndoToast → esperar 5s → verificar que desaparece
3. Digitar no SearchInput → verificar que callback só dispara após 300ms
4. Clicar em CopyButton → verificar clipboard contém o texto

---

## Sprint 3 — Backend Functions e Domain Logic

### Módulo M2: Backend Function — createCobranca

**Objetivo:** Deployar a backend function que cria cobrança + parcelas com compensação best-effort em falha.

**Tarefas:**
1. Escrever `functions/createCobranca.ts`:
   - Receber payload: `{ clienteId, produtoServicoId, nomeProdutoServico, valor, formaPagamento, quantidadeParcelas, primeiroVencimento, diaVencimentoFixo, pixUtilizado, observacoes }`
   - **Validação:** valor >0 e <=999999.99; quantidadeParcelas 1-60; se formaPagamento=pix → pixUtilizado obrigatório; nomeProdutoServico mínimo 3 chars; primeiroVencimento é YYYY-MM-DD válido; diaVencimentoFixo ∈ [5,10,15,20,25,30]; formaPagamento ∈ [pix, dinheiro, cartao_credito, cartao_debito, transferencia]
   - **Criar Cobranca** via `base44.entities.Cobranca.create()`
   - **Calcular parcelas** (lógica duplicada de M3a — ver "Duplicação consciente" abaixo):
     - `valorBase = Math.floor((valor / quantidadeParcelas) * 100) / 100`
     - `valorUltima = Math.round((valor - (valorBase * (quantidadeParcelas - 1))) * 100) / 100`
     - Para cada parcela i (1 a N): `dataVencimento = calcularVencimento(primeiroVencimento, diaVencimentoFixo, i)`
     - `calcularVencimento`: parcela 1 = primeiroVencimento; parcela N = adicionarMeses(primeiroVencimento, N-1), depois ajustar para diaVencimentoFixo se diferente, com regra de mês curto
   - **Criar parcelas em batch** via `base44.entities.Parcela.createMany()` (uma chamada, N registros)
   - Se batch falha: **deletar cobranca criada** via `base44.entities.Cobranca.delete(cobrancaId)`
   - Se delete também falha: retornar erro para o frontend. Cobranca órfã fica no banco mas o frontend trata como não criada.
   - **Incrementar vezesUsado** via `base44.asServiceRole.entities.ProdutoServico.update()` (service role para cross-entity update com RLS). Se produtoServicoId = null, pular.
   - Se incremento de vezesUsado falha: não é crítico. Registrar log e continuar.
   - Retornar `{ sucesso: true, cobrancaId, parcelas: [...] }`
2. Deploy via `deploy_backend_function`
3. Testar via `test_backend_function`

**Duplicação consciente:** As funções `dividirValor` e `adicionarMeses` são implementadas dentro de `createCobranca.ts` sem importar de `lib/`. Backend functions em Base44 são isoladas. A duplicação é controlada: se uma regra muda em M3a, o critério de não-avanço exige revalidação de M2 com os mesmos testes.

**Dependências:** M1 (entities), M3a (lógica de referência para duplicar)

**Critérios de conclusão:**
- [ ] Function deployed e acessível via HTTP
- [ ] Criar cobrança à vista → retorna 1 parcela com valor = valor total
- [ ] Criar cobrança 3x R$100 → 3 parcelas (33.33, 33.33, 33.34)
- [ ] Soma das parcelas = exatamente 100.00 em 5 cenários (à vista, 2x, 3x, 7x, 12x)
- [ ] diaVencimentoFixo=30, primeiroVencimento=2026-01-30, 3 parcelas → parcela 2 vence 28/02/2026
- [ ] diaVencimentoFixo=30, primeiroVencimento=2024-01-30, 3 parcelas → parcela 2 vence 29/02/2024
- [ ] formaPagamento=pix, pixUtilizado vazio → erro de validação
- [ ] valor=0 → erro de validação
- [ ] quantidadeParcelas=61 → erro de validação
- [ ] nomeProdutoServico="ab" → erro de validação
- [ ] produtoServicoId != null → vezesUsado incrementa (verificar via read_entities)
- [ ] produtoServicoId = null → vezesUsado não incrementa
- [ ] Falha simulada no batch de parcelas → cobranca é deletada (compensação)

**Testes antes de avançar:**
1. Chamar function com payload completo e válido → confirmar cobranca + parcelas criadas
2. Payload inválido (PIX sem chave) → confirmar erro e nenhum registro criado
3. Verificar vezesUsado incrementou após criar cobrança com produto
4. Verificar soma das parcelas em 5 cenários
5. Verificar fevereiro bissexto e não bissexto

---

### Módulo M2b: Backend Function — editarCobranca

**Objetivo:** Deployar a backend function que edita uma cobrança existente, regenerando parcelas quando permitido.

**Tarefas:**
1. Escrever `functions/editarCobranca.ts`:
   - Receber payload: `{ cobrancaId, observacoes, pixUtilizado, valor, quantidadeParcelas, primeiroVencimento, diaVencimentoFixo }`
   - **Verificar parcelas existentes** via `base44.entities.Parcela.list({ cobrancaId })`
   - **Regra de permissão:**
     - Se alguma parcela tem status=pago ou pago_parcial ou valorPago != null → permitir apenas editar `observacoes` e `pixUtilizado`. Rejeitar mudança de valor/parcelas/datas.
     - Se todas as parcelas têm status=pendente ou cobrado → permitir edição completa (regenerar parcelas).
   - **Estratégia de regeneração (criar-antes-de-deletar):**
     1. Calcular novas parcelas (mesma lógica do M2)
     2. Criar novas parcelas em batch
     3. Se batch falha: retornar erro. Parcelas antigas continuam existindo.
     4. Se batch sucesso: deletar parcelas antigas via `base44.entities.Parcela.deleteMany({ cobrancaId_old_parcelas })`
     5. Atualizar cobranca com novos campos
   - **Incrementar/decrementar vezesUsado:** se produtoServicoId mudou (não deveria, pois edição não muda produto), tratar separadamente. Se produto não mudou, vezesUsado não altera.
   - Retornar `{ sucesso: true, cobrancaId, parcelas: [...] }`
2. Deploy via `deploy_backend_function`
3. Testar via `test_backend_function`

**Dependências:** M1, M3a (lógica de referência)

**Critérios de conclusão:**
- [ ] Editar cobrança com todas parcelas pendentes → parcelas são regeneradas
- [ ] Editar cobrança com parcela cobrada → parcelas são regeneradas (cobrado != pago)
- [ ] Editar cobrança com parcela paga → apenas observacoes/pixUtilizado são atualizadas
- [ ] Editar cobrança com parcela pago_parcial → apenas observacoes/pixUtilizado são atualizadas
- [ ] Após regeneração: parcelas antigas não existem mais
- [ ] Após regeneração: novas parcelas têm status=pendente
- [ ] Falha simulada no batch de novas parcelas → parcelas antigas continuam existindo

**Testes antes de avançar:**
1. Criar cobrança 3x via M2 → editar para 5x → confirmar 5 parcelas, 3 antigas deletadas
2. Criar cobrança → marcar 1 parcela como pago → tentar editar valor → confirmar rejeição
3. Criar cobrança → editar observacoes → confirmar alteração sem regenerar parcelas
4. Simular falha no batch → confirmar parcelas antigas preservadas

---

### Módulo M3b: Domain Logic

**Objetivo:** Implementar as regras de negócio como funções puras, usando M3a e M5.

**Tarefas:**

**3b-1. `domain/billing-cycle.ts`**
- `calcularVencimentoParcela(primeiroVencimento: string, diaVencimentoFixo: number, numeroParcela: number): string`
- Parcela 1: retorna primeiroVencimento
- Parcela N (N>1): `adicionarMeses(primeiroVencimento, N-1)`, depois ajustar para o diaVencimentoFixo. Se o diaVencimentoFixo não existe no mês, usar o último dia do mês.
  - Ex: primeiroVencimento=15/01, diaFixo=10, parcela 2 → 10/02 (não 15/02)
  - Ex: primeiroVencimento=30/01, diaFixo=30, parcela 2 → 28/02 (fevereiro)

**3b-2. `domain/parcel.rules.ts`**
- `gerarParcelas(input: CobrancaInput): ParcelaInput[]`
- Retorna array de N parcelas com numeroParcela, valor (dividirValor), dataVencimento (billing-cycle), status=pendente
- `podeEditarCobranca(parcelas: Parcela[]): boolean` — true se todas têm status=pendente ou cobrado
- `podeExcluirCobranca(parcelas: Parcela[]): boolean` — true se nenhuma tem status=pago, pago_parcial, ou valorPago != null

**3b-3. `domain/status.rules.ts`**
- `proximoStatus(statusAtual: ParcelaStatus, acao: AcaoStatus): { novoStatus: ParcelaStatus, camposAtualizar: Partial<Parcela> }`
- Transições do PRD v2.0 seção 7.2
- `desfazerStatus(estadoAnterior: EstadoAnterior): { novoStatus: ParcelaStatus, camposAtualizar: Partial<Parcela> }`
  - Se estadoAnterior.status era pago_parcial → restaura valorPago também
  - Se estadoAnterior.status era pendente ou cobrado → valorPago = null

**3b-4. `domain/overdue.rules.ts`**
- `isAtrasada(parcela: Parcela, dataReferencia: string): boolean`
  - `dataVencimento < dataReferencia` AND `status IN (pendente, cobrado, pago_parcial)` AND `arquivada = false`
- `diasAtraso(parcela: Parcela, dataReferencia: string): number`
  - `diasEntre(parcela.dataVencimento, dataReferencia)` se atrasada; 0 caso contrário
- `corAtraso(dias: number): "laranja" | "vermelho"` — 1-3 = laranja, 4+ = vermelho
- `ordenarParcelas(parcelas: Parcela[], dataReferencia: string): Parcela[]`
  - Ordem: atrasadas vermelhas (mais dias primeiro) → atrasadas laranjas (mais dias primeiro) → cobradas hoje → pendentes hoje

**3b-5. `domain/charge.rules.ts`**
- `validarCobranca(input: CobrancaInput): { valido: boolean, erros: string[] }`
- Validações: valor >0 e <=999999.99; quantidadeParcelas 1-60; se forma=pix → pixUtilizado obrigatório; nomeProdutoServico mínimo 3 chars; diaVencimentoFixo ∈ [5,10,15,20,25,30]; formaPagamento ∈ [pix, dinheiro, cartao_credito, cartao_debito, transferencia]
- `calcularPrimeiroVencimentoSugerido(diaFixo: number): string` — `proximoVencimento(diaFixo, hoje())`

**Dependências:** M3a (utils), M5 (types)

**Critérios de conclusão:**
- [ ] `calcularVencimentoParcela("2026-01-15", 10, 1)` → "2026-01-15"
- [ ] `calcularVencimentoParcela("2026-01-15", 10, 2)` → "2026-02-10"
- [ ] `calcularVencimentoParcela("2026-01-30", 30, 2)` → "2026-02-28"
- [ ] `gerarParcelas` para 3x R$600, primeiroVencimento 15/07, diaFixo 10 → 3 parcelas com datas 15/07, 10/08, 10/09 e valores 200/200/200
- [ ] `isAtrasada` com dataVencimento=ontem, status=pendente → true
- [ ] `isAtrasada` com dataVencimento=ontem, status=pago → false
- [ ] `isAtrasada` com dataVencimento=ontem, arquivada=true → false
- [ ] `isAtrasada` com dataVencimento=hoje, status=pendente → false (hoje não é atrasada)
- [ ] `diasAtraso` com vencimento 10/07 e hoje 20/07 → 10
- [ ] `corAtraso(2)` → laranja
- [ ] `corAtraso(4)` → vermelho
- [ ] `ordenarParcelas` coloca atrasada 10 dias antes de atrasada 2 dias
- [ ] `podeEditarCobranca` com todas pendentes → true
- [ ] `podeEditarCobranca` com uma cobrada → true (cobrado != pago)
- [ ] `podeEditarCobranca` com uma paga → false
- [ ] `podeExcluirCobranca` com todas pendentes → true
- [ ] `podeExcluirCobranca` com uma paga → false
- [ ] `validarCobranca` com valor=0 → valido=false, erros contém "valor"
- [ ] `validarCobranca` com pix sem chave → valido=false
- [ ] `calcularPrimeiroVencimentoSugerido(10)` quando hoje é 05/07 → "2026-07-10"
- [ ] `calcularPrimeiroVencimentoSugerido(10)` quando hoje é 15/07 → "2026-08-10"
- [ ] `calcularPrimeiroVencimentoSugerido(10)` quando hoje é 10/07 → "2026-07-10" (inclusive)

**Testes antes de avançar:**
1. Rodar todos os testes de critérios acima
2. `gerarParcelas` para 10x R$ 1500, primeiroVencimento 25/08, diaFixo 25 → verificar 10 parcelas com datas corretas e soma = 1500
3. `desfazerStatus` com estadoAnterior = pago_parcial (valorPago=100) → restaura status=pago_parcial e valorPago=100
4. `ordenarParcelas` com mix de atrasadas, cobradas e pendentes → verificar ordem

---

## Sprint 4 — Hooks Básicos e Settings

### Módulo M6a: Hooks Básicos

**Objetivo:** Implementar hooks de CRUD simples com cache em memória e invalidação por EventBus.

**Tarefas:**

**6a-1. `hooks/useClients.ts`**
- `useClients(): { clientes, loading, error, refresh }`
- Busca via `Cliente.list()` (SDK direto, sem wrapper)
- Cache em useRef, invalidado por eventos: `client:created`, `client:updated`, `client:inactivated`
- `error: string | null` em caso de falha. Se erro, retorna cache anterior (se houver) ou lista vazia.

**6a-2. `hooks/useProducts.ts`**
- `useProducts(): { produtos, loading, error, refresh }`
- Busca via `ProdutoServico.list()` ordenado por vezesUsado desc
- Invalidado por: `product:created`, `product:updated`, `product:deleted`, `charge:created` (atualiza vezesUsado)

**6a-3. `hooks/useCharges.ts`**
- `useCharges(clienteId: string): { cobrancas, loading, error }`
- Busca cobrancas + parcelas de um cliente via `Cobranca.filter({ clienteId })`
- Para cada cobranca, buscar parcelas via `Parcela.filter({ cobrancaId })`
- Limitado a 5 cobranças recentes por padrão. `carregarTodas()` para paginação.
- Invalidado por: `charge:created`, `charge:updated`, `charge:deleted`, `parcel:updated`

**6a-4. `hooks/useConfig.ts`**
- `useConfig(): { config, loading, error, salvar }`
- Busca registro único de Configuracao via `Configuracao.list()`. Se vazio, cria com defaults `diasTrabalhados = "1,2,3,4,5"`.
- `salvar(diasTrabalhados: number[])` → atualiza registro. Converte array para string "1,2,3,4,5" antes de salvar. No return, converte string de volta para number[].

**Dependências:** M1 (entities), M3a (format/validation), M5 (types + event-bus)

**Critérios de conclusão:**
- [ ] `useClients` carrega lista ao montar
- [ ] `useClients` não refaz chamada se cache válido (sem evento)
- [ ] Emitir `client:created` → `useClients` refaz busca
- [ ] `useClients` retorna `error` preenchido se API falha (não crasha)
- [ ] `useProducts` retorna produtos ordenados por vezesUsado desc
- [ ] `useCharges` retorna cobrancas + parcelas de um cliente
- [ ] `useCharges` limita a 5 cobrancas por padrão
- [ ] `useConfig` cria registro com defaults se não existe
- [ ] `useConfig.salvar` persiste diasTrabalhados como string
- [ ] `useConfig` retorna diasTrabalhados como number[]
- [ ] Nenhum hook usa setInterval ou polling

**Testes antes de avançar:**
1. Montar componente de teste com `useClients` → confirmar carrega
2. Emitir `client:created` → confirmar refaz busca
3. Simular erro de API → confirmar que hook retorna error sem crashar
4. `useConfig` em sistema sem Configuracao → criar e retornar defaults
5. `useCharges` para cliente com 10 cobranças → confirmar que retorna 5

---

### Módulo M13: Página Settings

**Objetivo:** Implementar a tela de configuração de dias trabalhados.

**Tarefas:**
1. Tela com 7 checkboxes (Seg-Dom) usando useConfig
2. Ao carregar, checkboxes refletem config atual
3. Ao alterar, estado local atualiza
4. Botão [Salvar] persiste via `useConfig.salvar`
5. Texto explicativo: "As cobranças que vencerem em dias não trabalhados aparecerão no próximo dia trabalhado."

**Dependências:** M6a (useConfig), M7 (componentes base)

**Critérios de conclusão:**
- [ ] Checkboxes refletem config ao carregar
- [ ] Salvar persiste e mostra toast de confirmação
- [ ] Default: Seg-Sex marcados, Sáb-Dom desmarcados

**Testes antes de avançar:**
1. Abrir Settings → verificar checkboxes
2. Desmarcar Seg → Salvar → recarregar → confirmar Seg desmarcado
3. Marcar todos → Salvar → confirmar persiste

---

## Sprint 5 — Hooks Complexos, Compostos Core e Páginas Simples

### Módulo M6b: Hooks Complexos

**Objetivo:** Implementar hooks de Dashboard e ações de parcela.

**Tarefas:**

**6b-1. `hooks/useDashboard.ts`**
- `useDashboard(): { parcelasHoje, parcelasAtrasadas, proximosVencimentos, contadores, loading, error, refresh }`
- Busca parcelas via `Parcela.list()` filtrando: `arquivada = false`, `dataVencimento <= hoje + 30 dias` (otimização — não trazer parcelas muito futuras)
- Filtra clientes ativos: busca todos os clientes ativos e filtra parcelas cujo clienteId está na lista
- **Cálculo de atrasados em tempo real** via `overdue.rules`:
  - `parcelasAtrasadas = parcelas.filter(p => isAtrasada(p, hoje()))`
  - `parcelasHoje = parcelas.filter(p => p.dataVencimento === hoje() && !isAtrasada(p, hoje()))`
  - Ordenar via `ordenarParcelas`
- **Próximos vencimentos**: próximos 3 dias de vencimento (após hoje) que têm parcelas. Formato: `[{ dia: 10, total: 3, valor: 600 }]`
- **Contadores**: `{ total: N, valor: R$, atrasadas: N }`
- Invalidado por: `parcel:paid`, `parcel:charged`, `parcel:archived`, `charge:created`, `charge:deleted`, `client:inactivated`

**6b-2. `hooks/useParcelActions.ts`**
- `useParcelActions(): { marcarPago, marcarParcial, cobrar, confirmarEnvio, arquivar, desarquivar, desfazerPagamento }`
- `marcarPago(parcelaId, estadoAnterior)`:
  - Atualiza via `Parcela.update(id, { status: "pago", dataPagamento: hoje(), valorPago: valor })`
  - Emite `parcel:paid`
  - Retorna função undo
- `marcarParcial(parcelaId, valorRecebido, estadoAnterior)`:
  - Se `valorPago + valorRecebido >= valor` → trata como total (status=pago, valorPago=valor, dataPagamento=hoje)
  - Senão → `status=pago_parcial`, `valorPago = (valorPago || 0) + valorRecebido`
  - Emite `parcel:updated`
- `confirmarEnvio(parcelaId)`:
  - Atualiza via `Parcela.update(id, { status: "cobrado", dataCobrancaEnviada: hoje() })`
  - Emite `parcel:charged`
- `arquivar(parcelaId)`:
  - Atualiza via `Parcela.update(id, { arquivada: true })`
  - Emite `parcel:archived`
- `desarquivar(parcelaId)`:
  - Atualiza via `Parcela.update(id, { arquivada: false })`
  - Emite `parcel:unarchived`
- `desfazerPagamento(parcelaId, estadoAnterior)`:
  - Restaura via `desfazerStatus(estadoAnterior)`
  - Atualiza via `Parcela.update(id, camposAtualizar)`
  - Emite `parcel:updated`

**Dependências:** M6a, M3b (overdue.rules, status.rules), M5

**Critérios de conclusão:**
- [ ] `useDashboard` retorna parcelas de hoje separadas das atrasadas
- [ ] `useDashboard` calcula diasAtraso e cor (via overdue.rules)
- [ ] `useDashboard` contadores refletem soma de parcelas e valores
- [ ] `useDashboard` proximosVencimentos mostra 3 dias com parcelas após hoje
- [ ] `useDashboard` não retorna parcelas de clientes inativos
- [ ] `useDashboard` não retorna parcelas arquivadas
- [ ] `marcarPago` atualiza status no backend e emite evento
- [ ] `marcarPago` retorna função de undo que restaura estado anterior
- [ ] `marcarParcial` com valor >= saldo → status=pago (não pago_parcial)
- [ ] `confirmarEnvio` muda status para cobrado e emite evento
- [ ] `arquivar` muda arquivada para true e emite evento
- [ ] `desfazerPagamento` restaura status e valorPago do estadoAnterior
- [ ] Nenhum hook usa setInterval

**Testes antes de avançar:**
1. Montar componente de teste com `useDashboard` + dados do seed → confirmar parcelas corretas
2. Emitir `parcel:paid` → confirmar refaz busca
3. Chamar `marcarPago` → confirmar status mudou no backend
4. Chamar undo → confirmar status voltou
5. Chamar `marcarParcial` com 100 em parcela de 200 → confirmar valorPago=100, status=pago_parcial
6. Chamar `marcarParcial` com 200 em parcela de 200 → confirmar status=pago

---

### Módulo M8a: Componentes Compostos Core

**Objetivo:** Implementar os 5 componentes compostos usados pelo Dashboard e Nova Cobrança.

**Tarefas:**

1. **`components/ChargeCard`** — o componente mais complexo
   - Props: `{ parcela, cobranca, cliente, onSelect, onCharge, onConfirmSend, onMarkPaid, onMarkPartial, onArchive, isSelected }`
   - Estados visuais: pendente (neutro), cobrado (amarelo), pago (verde, não renderiza no Dashboard), pago_parcial (azul), atrasado laranja, atrasado vermelho
   - Layout: círculo de seleção (esquerda), nome + produto + parcela (centro), valor + status (direita)
   - Menu inline ao tocar "Marcar pago": botões "Pagamento total" e "Pagamento parcial"
   - Se "Pagamento parcial": input inline com máscara de moeda + botão confirmar
   - Botão "Cobrar" (💬) → chama onCharge
   - Após cobrar: botão "Confirmar envio" (✓) aparece
   - Botão "Arquivar" no card expandido
   - Card expande ao toque (mostra PIX, telefone, observações)
   - Pago parcial: mostra "R$ X de R$ Y"
   - Atrasada: mostra "Atrasada há X dias"

2. **`components/ClientAutocomplete`**
   - Props: `{ onSelect, clientes }`
   - Input com debounce 300ms
   - Lista de sugestões filtrada por nome
   - "RECENTES" (5 clientes mais recentes em cobranças)
   - Botão "+ Cadastrar novo cliente" → mini-form inline (nome, telefone)
   - Ao selecionar cliente → chama onSelect(cliente)

3. **`components/ProductAutocomplete`**
   - Props: `{ onSelect, produtos, allowVendaAvulsa }`
   - Input com debounce 300ms
   - Lista filtrada por nome, ordenada por vezesUsado desc
   - "MAIS VENDIDOS" (top 3 por vezesUsado)
   - Botão "+ Cadastrar novo produto" → mini-form inline (nome, valor)
   - Botão "Venda avulsa" → mostra input "O que foi vendido?" (mín 3 chars) → chama onSelect({ nome, produtoServicoId: null })

4. **`components/PaymentSelector`**
   - Props: `{ value, onChange }`
   - 5 botões grandes: PIX, Cartão Crédito, Cartão Débito, Dinheiro, Transferência (sem boleto)
   - Se PIX: campo "PIX utilizado" aparece inline com autocomplete (busca valores distintos de pixUtilizado)
   - Toggle À Vista / Parcelado
   - Se Parcelado: botões de 2 a 12, input para 13-60

5. **`components/ParcelPreview`**
   - Props: `{ valor, quantidadeParcelas, primeiroVencimento, diaVencimentoFixo }`
   - Lista as parcelas: "1. R$ 66,67 · 15/08/2026"
   - Recalcula em tempo real ao alterar qualquer prop
   - Mostra soma total no rodapé

**Dependências:** M7 (base), M3b (gerarParcelas para ParcelPreview, overdue.rules para ChargeCard), M5 (types)

**Critérios de conclusão:**
- [ ] ChargeCard renderiza corretamente para cada um dos 6 estados visuais
- [ ] ChargeCard mostra "Atrasada há X dias" para atrasadas
- [ ] ChargeCard mostra "R$ X de R$ Y" para pago_parcial
- [ ] ChargeCard menu inline "Marcar pago" → "total" e "parcial"
- [ ] ChargeCard input de parcial com máscara de moeda
- [ ] ChargeCard botão "Cobrar" → chama callback
- [ ] ChargeCard botão "Confirmar envio" aparece após cobrar
- [ ] ChargeCard expande ao toque (mostra PIX, telefone, observações)
- [ ] ClientAutocomplete filtra por nome com debounce
- [ ] ClientAutocomplete mostra "RECENTES"
- [ ] ClientAutocomplete mini-form cria cliente
- [ ] ProductAutocomplete ordena por vezesUsado
- [ ] ProductAutocomplete "Venda avulsa" exige 3 chars
- [ ] PaymentSelector tem 5 opções (sem boleto)
- [ ] PaymentSelector mostra campo PIX quando PIX selecionado
- [ ] PaymentSelector toggle À Vista/Parcelado
- [ ] ParcelPreview recalcula ao alterar props
- [ ] ParcelPreview soma total no rodapé

**Testes antes de avançar:**
1. Renderizar ChargeCard com cada status → verificar visual
2. Clicar "Marcar pago" → "total" → verificar callback
3. Clicar "Marcar pago" → "parcial" → digitar 100 → verificar callback com valor
4. Clicar "Cobrar" → verificar callback
5. ClientAutocomplete: digitar "Mar" → verificar que filtra
6. ProductAutocomplete: clicar "Venda avulsa" → digitar "ab" → verificar bloqueio (min 3)
7. PaymentSelector: selecionar PIX → verificar campo PIX aparece
8. ParcelPreview: 3x R$600, dia 10, primeiroVenc 15/07 → verificar 3 parcelas com datas e valores

---

### Módulo M11: Página Clientes

**Objetivo:** Listagem, busca, edição inline e histórico de clientes.

**Tarefas:**
1. Lista de clientes com `useClients`
2. SearchInput (filtra por nome e telefone)
3. Card de cliente: nome, status (Ativo/Inativo), telefone formatado, contador de cobranças ativas
4. Toque no card expande:
   - Dados editáveis inline (nome, telefone, observações)
   - Toggle Ativo/Inativo (com confirmação ao inativar)
   - Histórico de cobranças (5 recentes via `useCharges`)
   - Cada cobrança expande mostrando parcelas
   - Botões [Editar] e [Excluir] na cobrança (se permitido por M3b)
   - Botão [↺ Desfazer pagamento] em parcelas pagas/parciais
5. Botão [＋ Novo] no header → mini-form inline
6. "Ver todas as cobranças (X)" → lista paginada
7. Reativação ao tocar no status inativo

**Dependências:** M6a (useClients, useCharges), M7 (SearchInput, EmptyState)

**Critérios de conclusão:**
- [ ] Lista carrega ao montar
- [ ] Busca filtra por nome e telefone em tempo real
- [ ] Card expande ao toque
- [ ] Edição inline salva ao clicar fora
- [ ] Inativação pede confirmação e emite `client:inactivated`
- [ ] Inativação faz parcelas sumirem do Dashboard (via evento)
- [ ] Reativação faz parcelas voltarem
- [ ] Histórico mostra 5 cobranças recentes
- [ ] [Editar] só aparece se `podeEditarCobranca` (M3b) retorna true
- [ ] [Excluir] só aparece se `podeExcluirCobranca` (M3b) retorna true
- [ ] [↺ Desfazer pagamento] restaura via `desfazerPagamento` (M6b)
- [ ] "Ver todas" carrega lista completa

**Testes antes de avançar:**
1. Abrir → verificar lista
2. Buscar → verificar filtro
3. Expandir → editar nome → clicar fora → verificar salvou
4. Inativar → confirmar → verificar some do Dashboard
5. Reativar → verificar volta
6. Expandir cobrança → verificar parcelas
7. [Editar] com todas pendentes → verificar habilitado
8. [Excluir] sem pagamentos → verificar habilitado
9. [↺ Desfazer pagamento] → verificar status volta
10. [＋ Novo] → preencher → salvar → verificar na lista

---

### Módulo M12: Página Produtos

**Objetivo:** Listagem, edição inline e criação de produtos.

**Tarefas:**
1. Lista com `useProducts` (ordenados por vezesUsado desc)
2. Card: nome, valor padrão (ou "Sem valor"), vezes usado, ⭐ no mais usado
3. Toque expande: edição inline (nome, valorPadrao)
4. Botão [＋ Novo] → mini-form inline
5. Item "Venda avulsa" no fim (agrupamento visual, count de cobranças com produtoServicoId=null, não editável)
6. Exclusão: verifica se há cobranças referenciando. Se sim, bloqueia. Se não, permite.

**Dependências:** M6a (useProducts), M7 (SearchInput, EmptyState)

**Critérios de conclusão:**
- [ ] Produtos ordenados por vezesUsado desc
- [ ] ⭐ no produto mais usado
- [ ] Valor padrão formatado ou "Sem valor"
- [ ] "Usado X vezes" exibido
- [ ] Edição inline salva
- [ ] "Venda avulsa" aparece como agrupamento (não editável)
- [ ] Excluir com cobranças → bloqueia
- [ ] Excluir sem cobranças → permite

**Testes antes de avançar:**
1. Abrir → verificar ordem
2. Expandir → editar → verificar salvou
3. Criar novo → verificar na lista
4. Excluir produto usado → verificar bloqueio
5. Excluir produto não usado → verificar exclusão
6. Verificar "Venda avulsa" no fim da lista

---

## Sprint 6 — Dashboard e Nova Cobrança (Passos 1+2)

### Módulo M9: Página Dashboard

**Objetivo:** A tela principal do sistema — quem cobrar hoje.

**Tarefas:**
1. `useDashboard` hook (M6b) para carregar dados
2. Cabeçalho: data de hoje formatada, contadores (total, valor, atrasadas)
3. Lista de ChargeCards:
   - Atrasadas primeiro (vermelhas 4+ dias, laranjas 1-3 dias)
   - Pendentes de hoje
   - Cobradas hoje (aguardando confirmação de pagamento)
4. Cada ChargeCard integrado com `useParcelActions`:
   - "Cobrar" → `gerarLinkWhatsApp` → abrir link
   - "Confirmar envio" → `confirmarEnvio(parcelaId)`
   - "Marcar pago" → "total" → `marcarPago` com undo toast
   - "Marcar pago" → "parcial" → input → `marcarParcial`
5. `useBatchSelect` (hook interno do M9, não em M6):
   - Círculo à esquerda de cada card para seleção
   - Ao selecionar 2+, barra fixa no rodapé: "X selecionadas · [Marcar todas como pagas]"
   - `marcarLoteComoPago()` → chama `marcarPago` para cada uma, 1 toast de undo para todas
6. SearchInput para filtro (nome, produto, telefone)
7. EmptyState quando não há cobranças ("Nada para cobrar hoje. ✓ Próximo vencimento: dia XX")
8. Seção "Próximos vencimentos" (3 linhas clicáveis)
   - Clique abre overlay/modal listando parcelas daquele dia
   - Não navega para outra página
   - Fechar overlay volta ao Dashboard
9. BatchBar (componente trivial, construído dentro do M9)
10. UndoToast ao marcar como pago

**Dependências:** M6b (useDashboard, useParcelActions), M8a (ChargeCard), M7 (SearchInput, EmptyState, UndoToast, DayBadge)

**Critérios de conclusão:**
- [ ] AC-01: Dashboard mostra apenas parcelas de hoje + atrasadas
- [ ] AC-02: Atrasadas aparecem acima das de hoje
- [ ] AC-03: Gradiente laranja/vermelho em atrasadas
- [ ] AC-04: Contadores atualizam ao marcar como pago
- [ ] AC-05: Estado vazio com próximo vencimento
- [ ] AC-06: Próximos 3 dias com parcelas aparecem
- [ ] AC-07: Dias sem parcelas não aparecem
- [ ] AC-08: Parcelas de inativos não aparecem
- [ ] AC-09: Arquivadas não aparecem
- [ ] AC-10: Pesquisa filtra por nome, produto, telefone
- [ ] AC-11: Botão Cobrar abre WhatsApp
- [ ] AC-12: Status muda só ao confirmar envio
- [ ] AC-13: Card muda de cor após confirmar envio
- [ ] AC-14: Menu inline "Marcar pago" com total e parcial
- [ ] AC-15: Pagamento total sem dialog, com undo
- [ ] AC-16: Pagamento parcial com input e máscara
- [ ] AC-17: Valor >= saldo trata como total
- [ ] AC-18: Card parcial mostra "R$ X de R$ Y"
- [ ] AC-19: Ação em lote funciona (selecionar 2+, marcar todas)
- [ ] AC-20: Undo em lote com toast único
- [ ] AC-21: Arquivar remove do Dashboard
- [ ] AC-22: Desarquivar via histórico volta ao Dashboard
- [ ] Clique em próximo vencimento abre overlay (não navega)

**Testes antes de avançar:**
1. Executar seed → abrir Dashboard → verificar parcelas corretas aparecem
2. Clicar "Cobrar" → WhatsApp abre → "Confirmar envio" → card muda de cor
3. "Marcar pago" → "total" → card some + undo toast → "Desfazer" → card volta
4. "Marcar pago" → "parcial" → digitar 100 → "R$ 100 de R$ 200"
5. Selecionar 3 cards → "Marcar todas" → 3 cards somem + 1 undo toast
6. Digitar na busca → filtro
7. Inativar cliente (via M11) → parcelas somem do Dashboard
8. Arquivar parcela → some do Dashboard
9. Clicar em próximo vencimento → overlay abre com parcelas daquele dia
10. Sistema vazio → "Nada para cobrar hoje"

---

### Módulo M10a: Nova Cobrança — Passos 1 e 2

**Objetivo:** Implementar o início do fluxo de Nova Cobrança (seleção de cliente, produto, valor e pagamento).

**Tarefas:**
1. Estado do wizard (passo atual 1-4, dados preenchidos em state compartilhado)
2. Barra de progresso (4 pontos)
3. **Passo 1: Cliente + Produto**
   - ClientAutocomplete (M8a) com `useClients`
   - Ao selecionar cliente: disparar busca de últimas 3 cobranças para cadastro inteligente (se M10c implementado; se não, pular)
   - Mini-form inline para novo cliente (usa `Cliente.create` via SDK)
   - ProductAutocomplete (M8a) com `useProducts`
   - Mini-form inline para novo produto
   - Venda avulsa (produtoServicoId=null, nomeProdutoServico digitado)
4. **Passo 2: Valor + Pagamento**
   - Campo valor (pré-preenchido se produto tem valorPadrao)
   - PaymentSelector (M8a)
   - Se PIX: campo PIX com autocomplete aparece inline
   - Toggle À Vista/Parcelado + seletor de parcelas
5. Botão [Continuar] no passo 2 → vai para passo 3 (M10b)
6. Botão [✕] para cancelar (com confirmação se dados preenchidos)
7. Botão [Voltar] do passo 2 → volta para passo 1 sem perder dados

**Dependências:** M8a (ClientAutocomplete, ProductAutocomplete, PaymentSelector), M6a (useClients, useProducts), M2 (backend function para criar — mas M10a não chama ainda, só M10b chama)

**Critérios de conclusão:**
- [ ] AC-24: Cliente e produto na mesma tela (passo 1)
- [ ] AC-25: Valor e pagamento na mesma tela (passo 2)
- [ ] AC-26: PIX aparece inline quando forma é PIX
- [ ] AC-27: PIX obrigatório quando forma é PIX (bloqueia Continuar)
- [ ] AC-28: Boleto não aparece (5 opções)
- [ ] AC-29: Venda avulsa exige mínimo 3 chars
- [ ] AC-30: Venda avulsa define produtoServicoId = null
- [ ] AC-39: Produtos ordenados por frequência no autocomplete
- [ ] AC-40: Recentes mostra 5 clientes mais recentes
- [ ] AC-41: Valor >0 e <=999999.99 (bloqueia Continuar se inválido)
- [ ] AC-42: Parcelas entre 1 e 60 (bloqueia se >60)
- [ ] [✕] cancela com confirmação se há dados
- [ ] [Voltar] do passo 2 para 1 não perde dados

**Testes antes de avançar:**
1. Selecionar cliente existente → selecionar produto → verificar valor pré-preenchido
2. Cadastrar novo cliente inline → verificar criado e selecionado
3. Venda avulsa com 2 chars → verificar bloqueio
4. Selecionar PIX sem preencher chave → verificar bloqueio no Continuar
5. Valor = 0 → verificar bloqueio
6. Cancelar no meio → confirmar → verificar volta
7. Voltar do passo 2 → verificar dados preservados

---

## Sprint 7 — Nova Cobrança (Passos 3+4)

### Módulo M10b: Nova Cobrança — Passos 3, 4 e Sucesso

**Objetivo:** Concluir o fluxo de Nova Cobrança com vencimento, pré-visualização, confirmação e tela de sucesso.

**Tarefas:**
1. **Passo 3: Vencimento + Observações + Pré-visualização**
   - DaySelector (6 botões grandes para [5, 10, 15, 20, 25, 30])
   - Campo "Primeiro vencimento" auto-sugerido via `calcularPrimeiroVencimentoSugerido` (M3b). Editável.
   - Se dia fixo = hoje → sugere hoje
   - Campo "Observações" (opcional, textarea)
   - ParcelPreview (M8a) — recalcula em tempo real
   - Botão [Continuar] → passo 4
2. **Passo 4: Resumo + Confirmar**
   - Resumo compacto: cliente, produto, valor, forma, parcelas, vencimento
   - NÃO é tela de revisão — é só um resumo + botão
   - Botão "Confirmar cobrança" → chama backend function `createCobranca` via `callBase44BackendFunction` ou SDK
   - Se backend retorna erro: wizard permanece no passo 4 com toast "Erro ao registrar cobrança. [Tentar novamente]". Dados não perdidos.
   - Se sucesso: vai para tela de sucesso
3. **Tela de Sucesso**
   - "✓ Cobrança registrada! X parcelas criadas."
   - [Nova cobrança] → limpa wizard, volta ao passo 1, mantém último cliente como sugestão
   - [Voltar para Hoje] → navega para Dashboard
   - Emite evento `charge:created`
4. Botão [Voltar] entre passos 3↔2, 4↔3 sem perder dados

**Dependências:** M10a, M8a (ParcelPreview), M3b (calcularPrimeiroVencimentoSugerido), M2 (backend function)

**Critérios de conclusão:**
- [ ] AC-31: Primeiro vencimento sugerido automaticamente
- [ ] AC-32: Se dia fixo = hoje, sugere hoje
- [ ] AC-33: Pré-visualização aparece inclusive para 1 parcela
- [ ] AC-34: Pré-visualização recalcula ao alterar dia fixo ou data
- [ ] AC-35: Sem tela de revisão separada (passo 4 é resumo compacto + botão)
- [ ] AC-36: Sucesso oferece "Nova cobrança" e "Voltar para Hoje"
- [ ] AC-43: Fluxo completo cria cobrança + parcelas no backend
- [ ] AC-44: Após salvar, emite `charge:created`
- [ ] [Nova cobrança] limpa wizard e volta ao passo 1
- [ ] [Voltar] entre passos não perde dados
- [ ] Erro do backend → toast de erro, dados preservados, wizard permanece

**Testes antes de avançar:**
1. Fluxo completo: cliente + produto + à vista + PIX + dia 10 + confirmar → verificar cobranca + 1 parcela criadas
2. Fluxo parcelado 10x → verificar 10 parcelas criadas com datas corretas
3. Alterar dia fixo no passo 3 → verificar pré-visualização recalcula
4. Salvar → sucesso → "Nova cobrança" → wizard limpo no passo 1
5. Salvar → sucesso → "Voltar para Hoje" → Dashboard com nova parcela
6. Simular erro do backend → verificar toast, dados preservados
7. Voltar do passo 3 para 1 → dados preservados

---

## Sprint 8 — Integração

### Módulo M14: Integração, Navegação, Onboarding e Edição

**Objetivo:** Conectar todas as páginas, implementar navegação, onboarding de primeiro acesso, e fluxo de edição de cobrança.

**Tarefas:**

**14a. Navegação**
1. Barra de navegação inferior (mobile-first): [🏠 Hoje] [➕ Nova] [👥 Clientes] [📦 Produtos] [⚙️]
2. Rotas: `/` → Dashboard, `/nova` → Nova Cobrança, `/clientes` → Clientes, `/produtos` → Produtos, `/config` → Settings
3. Navegação entre páginas sem recarregar (SPA)
4. EventBus funciona entre trocas de página (eventos de uma página invalidam cache de outra)

**14b. Onboarding**
1. Detectar sistema vazio: 0 clientes E 0 produtos E 0 cobranças
2. Se vazio, Dashboard mostra OnboardingGuide:
   - "Bem-vinda! Vamos começar?"
   - 3 botões: [👥 Cadastrar clientes] [📦 Cadastrar serviços] [➕ Nova cobrança]
   - Botão 1 com ✓ após 1+ clientes. Botão 2 com ✓ após 1+ produtos. Botão 3 destacado quando 1 e 2 têm ✓.
   - Onboarding desaparece quando a primeira cobrança é criada
3. OnboardingGuide é um componente simples construído aqui (não em M8)

**14c. Edição de Cobrança**
1. M10 (Nova Cobrança) recebe props opcionais: `editMode: boolean`, `cobrancaId: string`
2. Se `editMode = true`:
   - Passo 1: cliente e produto como somente leitura (não editáveis em cobrança existente)
   - Passo 2 e 3: editáveis se `podeEditarCobranca` (M3b) retorna true
   - Se não pode editar (parcela paga): apenas observações e PIX são editáveis
   - Botão final diz "Salvar alterações" (não "Confirmar cobrança")
   - Ao salvar: chama backend function `editarCobranca` (M2b), não `createCobranca`
   - Emite `charge:updated`
3. Acesso à edição: botão [Editar] no card de cobrança no histórico do cliente (M11)

**14d. Exclusão de Cobrança**
1. Botão [Excluir] no card de cobrança no histórico (M11), se `podeExcluirCobranca` (M3b)
2. Confirmação: "Excluir cobrança de [cliente]? Todas as parcelas serão deletadas."
3. Excluir: deletar todas as parcelas, depois deletar cobrança
4. Se produtoServicoId != null: decrementar vezesUsado
5. Emite `charge:deleted`

**Dependências:** M9, M10b, M11, M12, M13, M2b

**Critérios de conclusão:**
- [ ] Navegação entre todas as 5 páginas funciona
- [ ] EventBus propaga eventos entre páginas (criar cobrança em /nova invalida Dashboard em /)
- [ ] Onboarding aparece quando sistema vazio
- [ ] Onboarding desaparece após primeira cobrança
- [ ] Edição: M10 em editMode mostra cliente/produto como somente leitura
- [ ] Edição: se parcela paga, apenas observações/PIX editáveis
- [ ] Edição: "Salvar alterações" chama editarCobranca (M2b)
- [ ] Edição: parcelas são regeneradas se todas pendentes
- [ ] Exclusão: deleta cobrança + parcelas
- [ ] Exclusão: decrementa vezesUsado do produto
- [ ] Exclusão: bloqueia se parcela paga
- [ ] [Editar] no histórico do cliente abre M10 em editMode

**Testes antes de avançar:**
1. Navegar entre todas as páginas → verificar que não recarrega
2. Criar cobrança em /nova → ir para / → verificar que Dashboard atualizou
3. Sistema vazio → onboarding aparece → cadastrar 1 cliente → ✓ no botão 1
4. Cadastrar 1 produto → ✓ no botão 2
5. Criar cobrança → onboarding desaparece
6. [Editar] cobrança com todas pendentes → alterar para 5x → salvar → verificar 5 parcelas
7. [Editar] cobrança com parcela paga → verificar que valor/parcelas não são editáveis
8. [Excluir] cobrança sem pagamentos → confirmar → verificar deletada
9. [Excluir] cobrança com parcela paga → verificar bloqueado
10. Verificar que vezesUsado decrementou após exclusão

---

## Sprint 9 — Validação E2E

### Módulo M15: Validação End-to-End

**Objetivo:** Validar o sistema completo simulando uso real.

**Pré-requisito:** Executar `seed-test-data.ts` para resetar dados.

**Cenários:**

**Cenário 1 — Primeiro acesso e migração:**
- [ ] Sistema vazio → Onboarding aparece
- [ ] Cadastrar 5 clientes
- [ ] Cadastrar 3 produtos
- [ ] Criar 5 cobranças (à vista, 3x, 10x, avulsa, dinheiro)
- [ ] Onboarding desaparece
- [ ] Dashboard mostra parcelas corretas

**Cenário 2 — Dia de cobrança:**
- [ ] Dashboard mostra parcelas de hoje
- [ ] Cobrar → WhatsApp abre com mensagem correta
- [ ] Confirmar envio → card muda de cor
- [ ] Marcar pago (total) → card some + undo toast
- [ ] Desfazer → card volta
- [ ] Marcar pago (parcial) → "R$ X de R$ Y"
- [ ] Selecionar 3 → marcar lote → 3 somem
- [ ] Pesquisar por nome → filtro

**Cenário 3 — Atrasadas:**
- [ ] Atrasada 10 dias → vermelha "Atrasada há 10 dias"
- [ ] Atrasada 2 dias → laranja "Atrasada há 2 dias"
- [ ] Cobrar atrasada → mensagem diz "venceu no dia"
- [ ] Confirmar envio → card muda de vermelho/laranja para amarelo
- [ ] Arquivar → some do Dashboard
- [ ] Desarquivar via histórico → volta

**Cenário 4 — Pagamento parcial:**
- [ ] Marcar R$ 100 em parcela de R$ 200 → "R$ 100 de R$ 200 (pago parcial)"
- [ ] Cobrar parcial → mensagem menciona "R$ 100 pendentes"
- [ ] Complementar R$ 100 → status=pago, card some
- [ ] Desfazer complemento → volta para pago_parcial com valorPago=100

**Cenário 5 — Edição e exclusão:**
- [ ] Editar cobrança com todas pendentes → regenera parcelas
- [ ] Editar com parcela cobrada → permite (cobrado != pago)
- [ ] Editar com parcela paga → só observações/PIX
- [ ] Excluir sem pagamentos → deleta cobrança + parcelas
- [ ] Excluir com parcela paga → bloqueia
- [ ] Excluir produto usado → bloqueia

**Cenário 6 — Cliente inativo:**
- [ ] Inativar → parcelas somem do Dashboard
- [ ] Histórico do inativo acessível
- [ ] Reativar → parcelas voltam

**Cenário 7 — Casos especiais:**
- [ ] Fevereiro dia 30 → 28/02 (ou 29 em bissexto)
- [ ] Abril dia 31 → 30/04
- [ ] Cliente com cobranças em dias diferentes → ambos aparecem no dia correto
- [ ] PIX sem chave na forma PIX → bloqueio
- [ ] Venda avulsa <3 chars → bloqueio

**Cenário 8 — Performance:**
- [ ] Dashboard carrega em <2s com 50 parcelas
- [ ] Busca responde em <300ms
- [ ] Marcar pago responde em <500ms
- [ ] Não há polling ou setInterval em nenhuma página

**Cenário 9 — Cadastro inteligente (se M10c implementado):**
- [ ] Criar 3 cobranças para mesmo cliente com mesmo PIX
- [ ] Abrir Nova Cobrança, selecionar esse cliente → PIX pré-preenchido
- [ ] Selecionar cliente novo → nada pré-preenchido

**Checklist final de critérios de aceitação:**

| Grupo | Total | Validar |
|---|---|---|
| Dashboard (AC-01 a AC-10) | 10 | [ ] |
| Cobrança no Dashboard (AC-11 a AC-22) | 12 | [ ] |
| Nova Cobrança (AC-23 a AC-42) | 20 | [ ] |
| Geração de Parcelas (AC-43 a AC-51) | 9 | [ ] |
| Clientes (AC-52 a AC-56) | 5 | [ ] |
| Produtos (AC-57 a AC-59) | 3 | [ ] |
| Mensagens (AC-60 a AC-61) | 2 | [ ] |
| **Total** | **61** | [ ] |

---

## Sprint 10 — Cadastro Inteligente (Opcional, Pós-MVP)

### Módulo M10c: Cadastro Inteligente

**Objetivo:** Pré-preencher campos da Nova Cobrança baseado no histórico do cliente.

**Tarefas:**
1. Ao selecionar cliente no passo 1 do wizard, buscar últimas 3 cobranças via `useCharges`
2. Se 2+ cobranças usaram o mesmo produto → marcar como "Sugerido" no autocomplete
3. Se 2+ cobranças usaram o mesmo PIX → pré-preencher campo PIX
4. Se 2+ cobranças usaram a mesma quantidade de parcelas → pré-selecionar se usuário escolher "Parcelado"
5. Se cliente tem 0 ou 1 cobrança → nenhuma sugestão
6. Autocomplete de PIX: busca valores distintos de pixUtilizado em todas as cobranças com formaPagamento=pix. Ordenado por frequência. Máximo 5 sugestões.

**Dependências:** M14 (sistema funcional)

**Critérios de conclusão:**
- [ ] AC-37: Pré-preenche para cliente com 2+ cobranças com padrão
- [ ] AC-38: Sem sugestão para cliente novo ou com 1 cobrança
- [ ] Autocomplete PIX mostra até 5 sugestões ordenadas por frequência
- [ ] Usuária pode alterar qualquer sugestão

**Testes:**
1. Criar 3 cobranças para mesmo cliente com mesmo PIX → abrir Nova Cobrança → selecionar cliente → PIX pré-preenchido
2. Selecionar cliente com 1 cobrança → sem sugestões
3. Verificar autocomplete PIX mostra valores usados anteriormente

---

## Checklist de Não-Avanço

Um módulo **não pode avançar** para a próxima fase se:

1. ❌ Qualquer critério de conclusão não atendido
2. ❌ Qualquer teste obrigatório falhou
3. ❌ Há console.error ou console.warn em operação normal
4. ❌ Há setInterval ou polling em qualquer arquivo
5. ❌ Há referência a `boleto` no enum de pagamento
6. ❌ Há referência ao campo `parcelado` (removido no PRD v2.0)
7. ❌ Há referência a `dataLimite` (regra de atraso simplificada)
8. ❌ Valores monetários não estão em reais com 2 casas decimais
9. ❌ Datas não estão em YYYY-MM-DD sem hora
10. ❌ M2 ou M2b divergem de M3a nos testes de arredondamento ou datas (duplicação consciente desalinhada)

---

## Riscos e Mitigações

| Risco | Prob | Impacto | Mitigação |
|---|---|---|---|
| Backend function sem transação ACID | Média | Alto | M2 e M2b usam criar-antes-de-deletar + compensação best-effort |
| Enum validation não funciona no schema Base44 | Média | Médio | M1 testa. Se não funciona, validação em código no M2 e M3b |
| vezesUsado cross-entity update falha com RLS | Média | Médio | M2 usa `asServiceRole` para o update |
| diasTrabalhados como array não persiste | Baixa | Baixo | M1 testa. Fallback para string com conversão no hook |
| EventBus não propaga entre páginas | Baixa | Alto | M14 valida explicitamente |
| Fuso horário quebrando "hoje" | Média | Alto | M3a define hoje() em America/Sao_Paulo, M15 valida |
| Meses curtos gerando datas inválidas | Alta | Alto | M3a e M2 têm testes específicos para fev bissexto e não bissexto |
| Divergência entre M2 (backend) e M3a (frontend) | Média | Alto | Mesmos testes. Critério de não-avanço exige revalidação |
| Edição de cobrança perdendo parcelas | Baixa | Alto | M2b cria novas antes de deletar antigas |
| UX em mobile com cards expansíveis | Média | Médio | M15 testa em 375px |

---

## Validação Final

### Existe alguma inconsistência restante?

**Não.** Todas as dependências circulares foram resolvidas (M5 antes de M3). Não há critérios duplicados entre módulos (testes de M6b são unitários, M9 são de integração). As duplicações conscientes (M2↔M3a, M2b↔M3a) são explicitamente documentadas com testes compartilhados.

### Existe algum risco crítico aberto?

**Dois riscos com probabilidade média que precisam de validação no Sprint 1:**
1. Se Base44 não valida enums no schema → fallback em código (M2 e M3b validam em validação)
2. Se diasTrabalhados não persiste como array → fallback para string (já implementado no plano)

Ambos têm mitigação definida e são testados no M1 antes de qualquer outro módulo começar. Nenhum risco é crítico o suficiente para bloquear o início da implementação.

### Existe alguma decisão técnica pendente?

**Uma decisão menor:** se `callBase44BackendFunction` (SDK do Superagent) ou o SDK da app (via `import { functions } from '@/api/functions'`) é usado para chamar a backend function a partir do frontend. Ambos funcionam. A decisão pode ser tomada no Sprint 6 (M10b) quando a integração é implementada, sem afetar módulos anteriores.

### O plano está pronto para iniciar a implementação sem ambiguidades?

**Sim.** Cada módulo tem:
- Objetivo claro
- Tarefas enumeradas
- Dependências explícitas
- Critérios de conclusão verificáveis (checkbox)
- Testes obrigatórios antes de avançar
- Referência direta ao PRD v2.0 quando aplicável

A ordem dos sprints respeita todas as dependências. O caminho crítico (M1 → M3a → M3b → M6b → M9 → M14 → M15) tem 9 sprints, ~16 dias úteis. O MVP é funcional ao final do Sprint 9. O Sprint 10 (cadastro inteligente) é opcional.

---

## Fim do Plano
