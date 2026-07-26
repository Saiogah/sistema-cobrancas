# Plano de Implementação — Sistema de Cobranças

**Base:** PRD v2.0
**Plataforma:** Base44
**Estratégia:** Desenvolvimento incremental, módulos independentes com dependências explícitas

---

## Visão Geral

15 módulos em 8 fases. Cada módulo é independente, testável isoladamente, e só avança após validar seus critérios de conclusão. A ordem minimiza retrabalho — cada módulo só depende de módulos já concluídos.

```
Fase 1: Fundação          M1 → M2
Fase 2: Regras de Negócio M3 → M5
Fase 3: Serviços          M4
Fase 4: Hooks            M6
Fase 5: Componentes       M7 → M8
Fase 6: Páginas           M9 → M10 → M11 → M12 → M13
Fase 7: Integração        M14
Fase 8: Validação         M15
```

---

## Fase 1 — Fundação de Dados

### Módulo M1: Entities (5 entidades)

**Objetivo:** Criar as 5 entities no Base44 com schemas exatos do PRD v2.0 seção 6.

**Tarefas:**
1. Criar entity `Cliente` (nome, telefone, observacoes, ativo)
2. Criar entity `ProdutoServico` (nome, valorPadrao, vezesUsado)
3. Criar entity `Cobranca` (clienteId, produtoServicoId, nomeProdutoServico, valor, formaPagamento, quantidadeParcelas, primeiroVencimento, diaVencimentoFixo, pixUtilizado, observacoes)
4. Criar entity `Parcela` (cobrancaId, clienteId, numeroParcela, valor, valorPago, dataVencimento, status, dataPagamento, dataCobrancaEnviada, arquivada)
5. Criar entity `Configuracao` (diasTrabalhados)
6. Habilitar RLS em todas as entities

**Dependências:** Nenhuma

**Critérios de conclusão:**
- [ ] As 5 entities existem no Base44 com os campos e tipos exatos
- [ ] Os campos obrigatórios estão marcados como required
- [ ] Os campos com default estão configurados (ativo=true, vezesUsado=0, status=pendente, arquivada=false)
- [ ] RLS habilitado em todas as entities
- [ ] `formaPagamento` aceita apenas os 5 valores do enum (sem boleto)
- [ ] `diaVencimentoFixo` aceita apenas [5, 10, 15, 20, 25, 30]
- [ ] `status` da parcela aceita apenas [pendente, cobrado, pago, pago_parcial, arquivado]

**Dados de teste (mínimo):**
- 5 clientes (3 ativos, 1 inativo, 1 sem cobranças)
- 3 produtos (com e sem valorPadrao)
- 5 cobranças variadas (à vista, parcelada 3x, parcelada 10x, venda avulsa, PIX e dinheiro)
- Parcelas geradas cobrindo: vence hoje, vence amanhã, atrasada 2 dias, atrasada 10 dias, paga, pago parcial, arquivada
- 1 registro de Configuracao (diasTrabalhados = [1,2,3,4,5])

**Testes antes de avançar:**
1. Criar registros via `create_entity_records` e ler via `read_entities` — confirmar que os campos gravam e recuperam corretamente
2. Tentar criar cobrança com formaPagamento = "boleto" — deve falhar
3. Tentar criar parcela com status = "invalido" — deve falhar
4. Confirmar que RLS impede leitura cross-user (se possível testar com 2 usuários)

---

### Módulo M2: Backend Function — createCobranca

**Objetivo:** Deployar a backend function que cria cobrança + parcelas atomicamente com compensação em falha.

**Tarefas:**
1. Escrever `functions/createCobranca.ts` com a seguinte lógica:
   - Receber payload: { clienteId, produtoServicoId, nomeProdutoServico, valor, formaPagamento, quantidadeParcelas, primeiroVencimento, diaVencimentoFixo, pixUtilizado, observacoes }
   - Validar todos os campos (regras do PRD 7.1: valor >0, parcelas 1-60, PIX obrigatório se forma=PIX, nome ≥3 chars)
   - Criar registro de Cobranca
   - Calcular parcelas (algoritmo do PRD 7.1 — arredondamento e meses curtos)
   - Criar N registros de Parcela em lote
   - Se produtoServicoId != null: incrementar vezesUsado do produto
   - Se qualquer passo falha: deletar cobranca criada + parcelas criadas (compensação)
   - Retornar { cobrancaId, parcelas: [...], sucesso: true }
2. Deploy via `deploy_backend_function`
3. Testar via `test_backend_function`

**Dependências:** M1 (entities devem existir)

**Critérios de conclusão:**
- [ ] Function deployed e acessível via HTTP
- [ ] Criar cobrança à vista → retorna 1 parcela com valor = valor total
- [ ] Criar cobrança 3x R$100 → retorna 3 parcelas (33.33, 33.33, 33.34)
- [ ] Criar cobrança 3x R$100 → soma das parcelas = exatamente 100.00
- [ ] Criar cobrança com diaVencimentoFixo=30, primeiroVencimento=2026-01-30, 3 parcelas → parcela 2 vence 28/02 (fevereiro não bissexto)
- [ ] Criar cobrança com diaVencimentoFixo=30, primeiroVencimento=2024-01-30, 3 parcelas → parcela 2 vence 29/02 (2024 bissexto)
- [ ] Criar cobrança com formaPagamento=pix, pixUtilizado vazio → retorna erro de validação
- [ ] Criar cobrança com valor=0 → retorna erro de validação
- [ ] Criar cobrança com quantidadeParcelas=61 → retorna erro de validação
- [ ] Criar cobrança com produtoServicoId → vezesUsado do produto incrementa
- [ ] Simular falha no meio da criação de parcelas → cobranca é deletada (compensação)

**Testes antes de avançar:**
1. Chamar function com payload completo e válido → confirmar cobranca + parcelas criadas
2. Chamar function com payload inválido (PIX sem chave) → confirmar erro e nenhum registro criado
3. Verificar que vezesUsado foi incrementado após criar cobrança com produto
4. Verificar que a soma das parcelas bate com o valor total em pelo menos 5 cenários diferentes (à vista, 2x, 3x, 7x, 12x)
5. Verificar fevereiro: criar cobrança com dia 30, 3 parcelas a partir de janeiro → parcela de fevereiro tem dia 28 ou 29

---

## Fase 2 — Regras de Negócio (Pure Functions)

### Módulo M3: Domain Logic

**Objetivo:** Implementar todas as regras de negócio como funções puras, sem dependência de framework.

**Tarefas (cada arquivo é independente):**

**3a. `lib/math.utils.ts`**
- `dividirValor(valor: number, parcelas: number): { valorBase: number, valorUltima: number }`
- Usa `Math.floor((valor/parcelas) * 100) / 100` para valorBase
- valorUltima = `valor - (valorBase * (parcelas - 1))`

**3b. `lib/date.utils.ts`**
- `hoje(): string` — retorna YYYY-MM-DD em timezone America/Sao_Paulo
- `formatarDataBR(iso: string): string` — "15/08/2026"
- `formatarDataCurta(iso: string): string` — "15/08"
- `adicionarMeses(data: string, meses: number): string` — com regra de meses curtos
- `proximoVencimento(diaFixo: number, dataReferencia: string): string` — próxima ocorrência do dia a partir de dataReferencia (inclusive)
- `diasEntre(data1: string, data2: string): number` — diferença em dias corridos
- `mesAlvoExisteDia(ano: number, mes: number, dia: number): boolean`

**3c. `domain/billing-cycle.ts`**
- `calcularVencimentoParcela(primeiroVencimento: string, diaVencimentoFixo: number, numeroParcela: number): string`
- Parcela 1: retorna primeiroVencimento
- Parcela N (N>1): adicionarMeses(primeiroVencimento, N-1), depois ajustar para diaVencimentoFixo com regra de meses curtos

**3d. `domain/parcel.rules.ts`**
- `gerarParcelas(cobranca: CobrancaInput): ParcelaInput[]`
- Retorna array de N parcelas com numeroParcela, valor, dataVencimento, status=pendente
- Usa math.utils para divisão e billing-cycle para datas

**3e. `domain/status.rules.ts`**
- `proximoStatus(statusAtual: ParcelaStatus, acao: AcaoStatus): { novoStatus: ParcelaStatus, camposAtualizar: Partial<Parcela> }`
- `podeEditarCobranca(parcelas: Parcela[]): boolean` — true se todas tem status=pendente
- `podeExcluirCobranca(parcelas: Parcela[]): boolean` — true se nenhuma tem status=pago ou valorPago != null
- `desfazerStatus(statusAtual: ParcelaStatus, valorPagoAtual: number, estadoAnterior: EstadoAnterior): { novoStatus: ParcelaStatus, camposAtualizar: Partial<Parcela> }`

**3f. `domain/overdue.rules.ts`**
- `isAtrasada(parcela: Parcela, dataReferencia: string): boolean` — dataVencimento < dataReferencia AND status IN (pendente, cobrado, pago_parcial) AND !arquivada
- `diasAtraso(parcela: Parcela, dataReferencia: string): number` — diasEntre(dataVencimento, dataReferencia)
- `corAtraso(dias: number): 'laranja' | 'vermelho'` — 1-3 = laranja, 4+ = vermelho
- `ordenarParcelas(parcelas: Parcela[], dataReferencia: string): Parcela[]` — atrasadas vermelhas, atrasadas laranjas, cobradas hoje, pendentes hoje

**3g. `domain/charge.rules.ts`**
- `validarCobranca(input: CobrancaInput): { valido: boolean, erros: string[] }`
- Todas as validações do PRD 7.1
- `calcularPrimeiroVencimentoSugerido(diaFixo: number): string` — usa date.utils.proximoVencimento com hoje()

**3h. `lib/validation.utils.ts`**
- `validarTelefone(telefone: string): boolean` — 12-13 dígitos, só números
- `validarValorMonetario(valor: number): boolean` — >0 e <=999999.99
- `validarQuantidadeParcelas(qtd: number): boolean` — 1-60
- `validarNomeProduto(nome: string): boolean` — mínimo 3 chars
- `normalizarTelefone(input: string): string` — remove tudo que não é dígito, adiciona 55 se não tiver DDI

**3i. `lib/format.utils.ts`**
- `formatarMoeda(valor: number): string` — "R$ 200,00"
- `formatarTelefone(telefone: string): string` — "(11) 98765-4321"
- `formatarTelefoneCurto(telefone: string): string` — "(11) 98765..."

**Dependências:** Nenhuma (funções puras)

**Critérios de conclusão:**
- [ ] `dividirValor(100, 3)` → { valorBase: 33.33, valorUltima: 33.34 }
- [ ] `dividirValor(200, 2)` → { valorBase: 100, valorUltima: 100 }
- [ ] `dividirValor(99.99, 3)` → soma das 3 parcelas = 99.99
- [ ] `adicionarMeses("2026-01-30", 1)` → "2026-02-28" (fevereiro não bissexto)
- [ ] `adicionarMeses("2024-01-30", 1)` → "2024-02-29" (2024 bissexto)
- [ ] `adicionarMeses("2026-03-31", 1)` → "2026-04-30" (abril tem 30 dias)
- [ ] `proximoVencimento(10, "2026-07-05")` → "2026-07-10" (mesmo mês, dia maior)
- [ ] `proximoVencimento(10, "2026-07-15")` → "2026-08-10" (próximo mês, dia já passou)
- [ ] `proximoVencimento(10, "2026-07-10")` → "2026-07-10" (hoje inclusive)
- [ ] `gerarParcelas` para 3x R$600, primeiroVencimento 15/07, diaFixo 10 → 3 parcelas com datas 15/07, 10/08, 10/09
- [ ] `isAtrasada` com dataVencimento ontem e status=pendente → true
- [ ] `isAtrasada` com dataVencimento ontem e status=pago → false
- [ ] `isAtrasada` com dataVencimento ontem e arquivada=true → false
- [ ] `diasAtraso` com vencimento 10/07 e hoje 20/07 → 10
- [ ] `corAtraso(2)` → laranja
- [ ] `corAtraso(4)` → vermelho
- [ ] `validarCobranca` com forma=pix e pixUtilizado vazio → invalido
- [ ] `validarCobranca` com valor=0 → invalido
- [ ] `validarTelefone("5511987654321")` → true
- [ ] `validarTelefone("11987654321")` → false (sem DDI)
- [ ] `normalizarTelefone("11 98765-4321")` → "5511987654321"
- [ ] `formatarMoeda(200)` → "R$ 200,00"
- [ ] `formatarMoeda(33.34)` → "R$ 33,34"

**Testes antes de avançar:**
1. Rodar cada função com os casos de teste listados acima em um script de testes unitários
2. Testar edge cases: dia 30 em fevereiro, dia 31 em meses curtos, ano bissexto, valor que divide exato, valor que não divide
3. Verificar que nenhuma função tem side effects (são puras)

---

### Módulo M5: Types e Config

**Objetivo:** Definir todas as tipagens TypeScript e configurações.

**Tarefas:**
1. `types/client.types.ts` — Cliente, ClienteInput, ClienteUpdate
2. `types/product.types.ts` — ProdutoServico, ProdutoInput
3. `types/charge.types.ts` — Cobranca, CobrancaInput, CobrancaUpdate, FormaPagamento enum
4. `types/parcel.types.ts` — Parcela, ParcelaStatus, AcaoStatus, EstadoAnterior
5. `types/common.types.ts` — DiasVencimento, EventTypes, ResultadoOperacao
6. `config/days.config.ts` — export const DIAS_VENCIMENTO = [5, 10, 15, 20, 25, 30]
7. `config/messages.config.ts` — templates de mensagem WhatsApp (3 variações do PRD seção 15)
8. `config/app.config.ts` — constantes gerais (MAX_PARCELAS=60, MAX_VALOR=999999.99, UNDO_TIMEOUT=5000, TOAST_DURATION=5000)
9. `lib/event-bus.ts` — implementação do EventBus (emit, on, off, once)

**Dependências:** Nenhuma (apenas definições de tipos e constantes)

**Critérios de conclusão:**
- [ ] Todos os tipos compilam sem erro
- [ ] DIAS_VENCIMENTO tem exatamente [5, 10, 15, 20, 25, 30]
- [ ] FormaPagamento tem exatamente 5 valores (sem boleto)
- [ ] ParcelaStatus tem 5 valores (pendente, cobrado, pago, pago_parcial, arquivado)
- [ ] EventBus: emit dispara callback registrado via on
- [ ] EventBus: off remove callback
- [ ] EventBus: once dispara apenas uma vez
- [ ] messages.config.ts tem 3 templates (hoje, atrasada, pago parcial) com placeholders [Nome], [Valor], [Produto], [Data], [PIX]

**Testes antes de avançar:**
1. Compilar todos os arquivos .ts sem erros
2. Testar EventBus: registrar listener, emitir evento, confirmar callback disparado
3. Testar EventBus: registrar listener com once, emitir 2x, confirmar que só disparou 1x

---

## Fase 3 — Serviços

### Módulo M4: Services

**Objetivo:** Implementar a camada de comunicação externa.

**Tarefas:**

**4a. `services/api.service.ts`**
- Wrapper das entities do Base44 SDK
- `listarClientes(filtro?)`, `buscarCliente(id)`, `criarCliente(input)`, `atualizarCliente(id, data)`, `inativarCliente(id)`, `reativarCliente(id)`
- `listarProdutos()`, `criarProduto(input)`, `atualizarProduto(id, data)`, `excluirProduto(id)`
- `listarCobrancasPorCliente(clienteId)`, `buscarCobranca(id)`
- `listarParcelasDashboard(dataReferencia)`, `listarParcelasAtrasadas(dataReferencia)`, `listarProximosVencimentos(dataReferencia)`
- `atualizarStatusParcela(id, novoStatus, campos)`, `arquivarParcela(id)`, `desarquivarParcela(id)`
- `criarCobranca(input)` → chama backend function createCobranca
- `editarCobranca(id, input)`, `excluirCobranca(id)`
- `buscarConfiguracao()`, `salvarConfiguracao(data)`
- `buscarAutocompletePIX()` → distinct pixUtilizado ordenado por frequência
- `buscarClientesRecentes()` → 5 clientes mais recentes em cobranças
- `buscarCobrancasPorClienteRecentes(clienteId, limite)` → últimas 3 cobranças (para cadastro inteligente)

**4b. `services/whatsapp.service.ts`**
- `gerarLinkWhatsApp(telefone: string, mensagem: string): string` → `wa.me/{telefone}?text={encodeURIComponent(mensagem)}`
- `gerarMensagem(parcela: Parcela, cobranca: Cobranca, cliente: Cliente): string` → usa template do messages.config
- Seleção de template: se pago_parcial → template de pago parcial; se atrasada → template atrasada; senão → template hoje
- Substituição de placeholders: [Nome] = cliente.nome, [Valor] = formatarMoeda(parcela.valor), [Produto] = cobranca.nomeProdutoServico, [Data] = formatarDataCurta(parcela.dataVencimento), [PIX] = cobranca.pixUtilizado, [SaldoDevedor] = formatarMoeda(parcela.valor - parcela.valorPago)
- Inclui linhas de PIX apenas se formaPagamento = pix E pixUtilizado != null

**4c. `services/clipboard.service.ts`**
- `copiar(texto: string): Promise<boolean>` — usa navigator.clipboard.writeText
- Fallback para execCommand se navigator.clipboard não disponível

**Dependências:** M1 (entities), M3 (domain), M5 (types)

**Critérios de conclusão:**
- [ ] `listarClientes` retorna array de clientes do Base44
- [ ] `criarCliente` cria registro e retorna com id
- [ ] `criarCobranca` chama backend function e retorna cobrancaId + parcelas
- [ ] `listarParcelasDashboard` filtra corretamente (dataVencimento == hoje, status correto, arquivada=false, cliente.ativo=true)
- [ ] `gerarLinkWhatsApp` retorna URL válida no formato wa.me/5511987654321?text=...
- [ ] `gerarMensagem` para parcela vencendo hoje com PIX → mensagem contém "vence hoje", chave PIX, sem menção a saldo devedor
- [ ] `gerarMensagem` para parcela atrasada → mensagem contém "venceu no dia" e "Pode verificar o pagamento?"
- [ ] `gerarMensagem` para pago_parcial → mensagem contém "tem R$ X pendentes"
- [ ] `gerarMensagem` para forma=dinheiro → mensagem NÃO contém "Forma de pagamento" nem "Chave"
- [ ] `copiar` retorna true e texto está na área de transferência

**Testes antes de avançar:**
1. Criar cliente via api.service → ler via read_entities → confirmar que foi criado
2. Criar cobrança via api.service (chamando backend function) → confirmar parcelas geradas
3. Gerar link WhatsApp para 3 cenários (hoje, atrasada, pago parcial) → validar formato do link e conteúdo da mensagem
4. Testar clipboard em pelo menos 1 browser
5. Testar listarParcelasDashboard com os dados de teste do M1 → confirmar que retorna apenas as parcelas corretas

---

## Fase 4 — Hooks

### Módulo M6: Hooks (Event-Based)

**Objetivo:** Implementar hooks customizados com cache em memória e invalidação por EventBus.

**Tarefas:**

**6a. `hooks/useClients.ts`**
- `useClients()` → { clientes, loading, error, refresh }
- Cache em useRef, invalidado por eventos `client:created`, `client:updated`, `client:inactivated`
- Busca via api.service.listarClientes

**6b. `hooks/useProducts.ts`**
- `useProducts()` → { produtos, loading, error, refresh }
- Ordenado por vezesUsado descendente
- Invalidado por `product:created`, `product:updated`, `product:deleted`, `charge:created` (atualiza vezesUsado)

**6c. `hooks/useCharges.ts`**
- `useCharges(clienteId)` → { cobrancas, loading, error }
- Retorna cobrancas + parcelas de um cliente (para histórico)
- Limitado a 5 recentes por padrão, com opção de carregar todas
- Invalidado por `charge:created`, `charge:updated`, `charge:deleted`, `parcel:updated`

**6d. `hooks/useDashboard.ts`**
- `useDashboard()` → { parcelasHoje, parcelasAtrasadas, proximosVencimentos, contadores, loading, error, refresh }
- Calcula atrasados em tempo real (overdue.rules)
- Ordena parcelas (overdue.rules.ordenarParcelas)
- Invalidado por `parcel:paid`, `parcel:charged`, `parcel:archived`, `charge:created`, `charge:deleted`, `client:inactivated`
- `refresh()` força nova busca

**6e. `hooks/useParcelActions.ts`**
- `useParcelActions()` → { marcarPago, marcarParcial, cobrar, confirmarEnvio, arquivar, desarquivar, desfazerPagamento }
- Cada ação: executa via api.service, emite evento EventBus, retorna estado para undo
- `marcarPago(parcelaId, estadoAnterior)` → atualiza status=pago, dataPagamento=hoje, valorPago=valor. Emite `parcel:paid`. Retorna função undo.
- `marcarParcial(parcelaId, valorRecebido)` → se >= saldo: trata como total. Senão: status=pago_parcial, valorPago+=valor. Emite `parcel:updated`.
- `confirmarEnvio(parcelaId)` → status=cobrado, dataCobrancaEnviada=hoje. Emite `parcel:charged`.
- `arquivar(parcelaId)` → arquivada=true. Emite `parcel:archived`.
- `desarquivar(parcelaId)` → arquivada=false. Emite `parcel:unarchived`.
- `desfazerPagamento(parcelaId, estadoAnterior)` → restaura status e campos do estadoAnterior. Emite `parcel:updated`.

**6f. `hooks/useBatchSelect.ts`**
- `useBatchSelect()` → { selecionadas, toggle, selecionarTodas, limpar, marcarLoteComoPago }
- Estado em useState (array de parcelaIds)
- `marcarLoteComoPago()` → chama useParcelActions.marcarPago para cada uma, emite 1 evento `parcel:batch:paid`, retorna undo para todas

**6g. `hooks/useConfig.ts`**
- `useConfig()` → { config, loading, error, salvar }
- Busca registro único de Configuracao. Se não existe, cria com defaults [1,2,3,4,5].
- `salvar(diasTrabalhados)` → atualiza registro.

**Dependências:** M4 (services), M5 (types + event-bus)

**Critérios de conclusão:**
- [ ] `useClients` carrega lista de clientes ao montar
- [ ] `useClients` não refaz a chamada se já tem cache (a menos que evento seja emitido)
- [ ] Criar cliente → emitir `client:created` → `useClients` refaz busca
- [ ] `useDashboard` retorna parcelas de hoje separadas das atrasadas
- [ ] `useDashboard` calcula diasAtraso e cor corretamente
- [ ] `useDashboard` contadores refletem soma de parcelas e valores
- [ ] `useParcelActions.marcarPago` atualiza status no backend e emite evento
- [ ] `useParcelActions.marcarPago` retorna função de undo que restaura estado anterior
- [ ] `useBatchSelect` permite selecionar 3 parcelas e marcar todas como pagas
- [ ] `useConfig` cria registro de Configuracao com defaults se não existe
- [ ] Todos os hooks usam EventBus (sem setInterval, sem polling)

**Testes antes de avançar:**
1. Montar componente de teste com useDashboard → confirmar que carrega dados
2. Emitir evento `parcel:paid` manualmente → confirmar que useDashboard refaz busca
3. Chamar marcarPago em uma parcela → confirmar status mudou no backend
4. Chamar função de undo → confirmar status voltou
5. Selecionar 3 parcelas via useBatchSelect → marcar lote → confirmar 3 parcelas pagas
6. Verificar que useClients não faz nova chamada quando cache está válido (sem evento)

---

## Fase 5 — Componentes

### Módulo M7: Componentes Base

**Objetivo:** Implementar componentes reutilizáveis simples, sem dependência entre eles.

**Tarefas (cada componente é independente):**

1. **`StatusBadge`** — recebe status + diasAtraso → renderiza badge colorido (pendente=neutro, cobrado=amarelo, pago=verde, pago_parcial=azul, atrasado laranja/vermelho)
2. **`DayBadge`** — recebe número do dia → renderiza badge "Dia 05"
3. **`EmptyState`** — recebe título + descrição opcional → estado vazio amigável
4. **`UndoToast`** — recebe mensagem + onUndo → toast fixo no rodapé, some em 5s
5. **`SearchInput`** — recebe onChange + placeholder → input com debounce de 150ms e ícone de lupa
6. **`CopyButton`** — recebe texto + label → botão que copia para clipboard, mostra "Copiado!" por 2s
7. **`WhatsAppButton`** — recebe telefone + mensagem → botão que abre wa.me link
8. **`DaySelector`** — recebe value + onChange → 6 botões grandes (05, 10, 15, 20, 25, 30), selecionado destaca

**Dependências:** M5 (types), M3 (format.utils)

**Critérios de conclusão:**
- [ ] StatusBadge mostra cor correta para cada status
- [ ] StatusBadge com atrasado 2 dias → laranja; 5 dias → vermelho
- [ ] UndoToast desaparece após 5 segundos
- [ ] UndoToast chama onUndo ao clicar
- [ ] SearchInput só dispara onChange após 150ms sem digitar
- [ ] CopyButton copia texto e mostra "Copiado!" por 2s
- [ ] WhatsAppButton gera link wa.me correto
- [ ] DaySelector mostra 6 botões e destaca o selecionado
- [ ] Todos os componentes aceitam className para estilização customizada
- [ ] Todos os componentes são memoizados (React.memo)

**Testes antes de avançar:**
1. Renderizar cada componente isoladamente com props diferentes
2. Verificar que SearchInput não dispara a cada tecla (debounce)
3. Verificar que UndoToast desaparece sozinho em 5s
4. Verificar que CopyButton realmente copia (testar colar em outro lugar)

---

### Módulo M8: Componentes Compostos

**Objetivo:** Implementar componentes que combinam componentes base e hooks.

**Tarefas:**

1. **`ChargeCard`** — card de parcela no Dashboard
   - Props: parcela, cobranca, cliente, onCobrar, onMarcarPago, onMarcarParcial, onArquivar, onSelecionar, expandido
   - Renderiza: nome cliente, produto, número parcela, valor, status badge, dias atraso
   - Botões: [💬 Cobrar/Reenviar] [✓ Marcar pago]
   - Toque no corpo expande: observações, PIX (com CopyButton), data cobrança enviada, [Arquivar]
   - Círculo de seleção à esquerda (toque seleciona para lote)
   - Menu inline ao clicar [✓ Marcar pago]: "Pagamento total" e "Pagamento parcial"
   - Input inline para valor parcial com máscara de moeda
   - Estados visuais: neutro (pendente hoje), amarelo (cobrado), laranja (atrasado 1-3 dias), vermelho (atrasado 4+ dias), azul (pago parcial)

2. **`ClientAutocomplete`** — busca de cliente com "Recentes"
   - Props: value, onChange, clientes, clientesRecentes
   - Input com debounce, filtra por nome ou telefone
   - Seção "Recentes" no topo (5 clientes)
   - Botão "+ Cadastrar novo cliente" → callback onNewClient

3. **`ProductAutocomplete`** — busca de produto com "Mais vendidos"
   - Props: value, onChange, produtos (já ordenados por vezesUsado)
   - Input com debounce
   - Seção "Mais vendidos" no topo (3-5 produtos)
   - Botão "+ Cadastrar novo serviço" → callback onNewProduct
   - Botão "Venda avulsa" → mostra input "O que foi vendido?" (mín 3 chars)

4. **`PaymentSelector`** — seletores de forma de pagamento
   - 5 botões grandes (PIX, Dinheiro, Cartão Crédito, Cartão Débito, Transferência)
   - Se PIX: campo "PIX utilizado" aparece inline (obrigatório, com autocomplete)
   - Toggle À Vista / Parcelado
   - Se Parcelado: seletor [2][3][4][5][6][7][8][9][10][12] + campo livre

5. **`ParcelPreview`** — pré-visualização de parcelas
   - Recebe array de parcelas calculadas (número, valor, data)
   - Renderiza lista numerada
   - Se >6 parcelas: mostra 5 + "+ N restantes" (expande ao tocar)
   - Recalcula quando props mudam (recibe parcelas já calculadas do parent)

6. **`BatchBar`** — barra de ação em lote
   - Props: quantidadeSelecionada, valorTotal, onMarcarTodas, onCancelar
   - Fixa no rodapé, aparece quando 2+ selecionados

7. **`OnboardingGuide`** — guia de primeiro acesso
   - 3 botões grandes com estado (pendente ✓ / destacado)
   - Callbacks: onCadastrarClientes, onCadastrarServicos, onNovaCobranca

**Dependências:** M7 (componentes base), M5 (types), M3 (format.utils), M4 (whatsapp.service para mensagem)

**Critérios de conclusão:**
- [ ] ChargeCard renderiza todos os estados visuais corretamente
- [ ] ChargeCard menu inline "Marcar pago" abre com "total" e "parcial"
- [ ] ChargeCard input de valor parcial tem máscara de moeda
- [ ] ChargeCard expande ao toque no corpo, mostra PIX com CopyButton
- [ ] ChargeCard tem círculo de seleção que dispara onSelecionar
- [ ] ClientAutocomplete filtra por nome e telefone
- [ ] ClientAutocomplete mostra "Recentes" no topo
- [ ] ProductAutocomplete mostra "Mais vendidos" ordenados por vezesUsado
- [ ] ProductAutocomplete "Venda avulsa" exige mínimo 3 caracteres
- [ ] PaymentSelector mostra 5 botões (sem boleto)
- [ ] PaymentSelector mostra campo PIX apenas quando PIX selecionado
- [ ] PaymentSelector toggle À Vista/Parcelado funciona
- [ ] PaymentSelector seletor de parcelas mostra [2]-[12] + campo livre
- [ ] ParcelPreview mostra lista de parcelas com número, valor e data
- [ ] ParcelPreview com 10 parcelas mostra 5 + "+ 5 restantes" expandível
- [ ] BatchBar aparece com 2+ selecionados e mostra valor total
- [ ] OnboardingGuide mostra 3 botões com estados

**Testes antes de avançar:**
1. Renderizar ChargeCard com parcela atrasada 10 dias → verificar vermelho + "Atrasada há 10 dias"
2. Renderizar ChargeCard com pago_parcial → verificar "R$ 100 de R$ 200"
3. Clicar em "Marcar pago" → verificar menu inline aparece
4. Clicar em "Pagamento parcial" → verificar input com máscara aparece
5. Digitar no ClientAutocomplete → verificar filtro em tempo real
6. Clicar em "Venda avulsa" no ProductAutocomplete → verificar input aparece e não aceita <3 chars
7. Selecionar PIX no PaymentSelector → verificar campo PIX aparece
8. Renderizar ParcelPreview com 10 parcelas → verificar truncamento em 5

---

## Fase 6 — Páginas

### Módulo M9: Página Dashboard

**Objetivo:** Implementar a tela inicial do sistema.

**Tarefas:**
1. Estrutura da página com useDashboard hook
2. Header: data de hoje, contadores (cobranças, valor, atrasadas)
3. Contador de atrasadas é toggle (filtra só atrasadas)
4. Lista de ChargeCards (atrasadas primeiro, depois de hoje)
5. Seção "Próximos vencimentos" (3 linhas clicáveis)
6. SearchInput para filtro (filtra por nome, produto, telefone)
7. BatchBar integrada com useBatchSelect
8. EmptyState quando não há cobranças
9. UndoToast ao marcar como pago
10. Integração com OnboardingGuide (se sistema vazio)

**Dependências:** M6 (hooks), M8 (componentes), M7 (componentes base)

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
- [ ] AC-19: Ação em lote funciona
- [ ] AC-20: Undo em lote com toast único
- [ ] AC-21: Arquivar remove do Dashboard
- [ ] AC-22: Desarquivar volta ao Dashboard
- [ ] Onboarding aparece quando sistema está vazio

**Testes antes de avançar:**
1. Com dados de teste do M1: abrir Dashboard → verificar que parcelas corretas aparecem
2. Clicar em "Cobrar" → verificar WhatsApp abre → clicar "Confirmar envio" → verificar card muda de cor
3. Clicar em "Marcar pago" → "Pagamento total" → verificar card some + undo toast aparece
4. Clicar "Desfazer" no toast → verificar card volta
5. Clicar em "Marcar pago" → "Pagamento parcial" → digitar 100 → verificar "R$ 100 de R$ 200"
6. Selecionar 3 cards → "Marcar todas como pagas" → verificar 3 cards somem + undo toast
7. Digitar na busca → verificar filtro
8. Inativar um cliente → verificar que parcelas somem do Dashboard
9. Arquivar uma parcela → verificar que some do Dashboard
10. Com sistema vazio (sem dados) → verificar Onboarding aparece

---

### Módulo M10: Página Nova Cobrança

**Objetivo:** Implementar o fluxo de 4 passos para registrar vendas.

**Tarefas:**
1. Estado do wizard (passo atual 1-4, dados preenchidos)
2. Barra de progresso (4 pontos)
3. Passo 1: ClientAutocomplete + ProductAutocomplete na mesma tela
   - Ao selecionar cliente: disparar cadastro inteligente (buscar últimas 3 cobranças, pré-preencher se padrão)
   - Mini-form inline para novo cliente
   - Mini-form inline para novo produto
   - Input "Venda avulsa" quando selecionado
4. Passo 2: Valor + PaymentSelector na mesma tela
   - Valor pré-preenchido se produto tem valorPadrao
   - Se PIX: campo PIX com autocomplete aparece inline
   - Toggle À Vista/Parcelado + seletor de parcelas
5. Passo 3: DaySelector + primeiro vencimento + observações + ParcelPreview
   - Primeiro vencimento auto-sugerido
   - Pré-visualização recalcula em tempo real ao alterar dia fixo ou data
6. Passo 4: Resumo + botão "Confirmar cobrança"
   - Não é tela de revisão — mostra apenas resumo compacto + botão
7. Tela de sucesso: "Cobrança registrada! X parcelas criadas." + [Nova cobrança] [Voltar para Hoje]
8. Botão [✕] para cancelar (com confirmação se dados preenchidos)
9. Navegação [Voltar] entre passos sem perder dados

**Dependências:** M6 (hooks), M8 (componentes), M3 (domain para pré-visualização), M4 (api.service)

**Critérios de conclusão:**
- [ ] AC-23: Fluxo tem 4 passos
- [ ] AC-24: Cliente e produto na mesma tela (passo 1)
- [ ] AC-25: Valor e pagamento na mesma tela (passo 2)
- [ ] AC-26: PIX aparece inline quando forma é PIX
- [ ] AC-27: PIX obrigatório quando forma é PIX
- [ ] AC-28: Boleto não aparece (5 opções)
- [ ] AC-29: Venda avulsa exige mínimo 3 chars
- [ ] AC-30: Venda avulsa define produtoServicoId = null
- [ ] AC-31: Primeiro vencimento sugerido automaticamente
- [ ] AC-32: Se dia fixo = hoje, sugere hoje
- [ ] AC-33: Pré-visualização aparece inclusive para 1 parcela
- [ ] AC-34: Pré-visualização recalcula ao alterar dia fixo ou data
- [ ] AC-35: Sem tela de revisão separada
- [ ] AC-36: Sucesso oferece "Nova cobrança" e "Voltar para Hoje"
- [ ] AC-37: Cadastro inteligente pré-preenche para cliente com 2+ cobranças com padrão
- [ ] AC-38: Sem sugestão para cliente novo ou com 1 cobrança
- [ ] AC-39: Produtos ordenados por frequência
- [ ] AC-40: Recentes mostra 5 clientes mais recentes
- [ ] AC-41: Valor >0 e <=999999.99
- [ ] AC-42: Parcelas entre 1 e 60
- [ ] Botão [✕] cancela com confirmação se há dados
- [ ] [Voltar] entre passos não perde dados
- [ ] Após salvar, chama backend function createCobranca
- [ ] Após salvar, emite evento charge:created
- [ ] [Nova cobrança] limpa o wizard e volta ao passo 1

**Testes antes de avançar:**
1. Fluxo completo com cliente existente, produto existente, à vista, PIX → verificar cobranca + 1 parcela criadas
2. Fluxo com cliente novo (cadastrar inline) → verificar cliente criado e cobranca vinculada
3. Fluxo com venda avulsa (sem produto) → verificar nomeProdutoServico preenchido, produtoServicoId = null
4. Fluxo parcelado 10x → verificar 10 parcelas criadas com datas corretas
5. Selecionar cliente com 3 cobranças anteriores usando mesmo PIX → verificar PIX pré-preenchido
6. Selecionar cliente novo → verificar que nada é pré-preenchido
7. Tentar avançar passo 2 sem preencher PIX (forma = PIX) → verificar bloqueio
8. Tentar avançar com valor = 0 → verificar bloqueio
9. Alterar dia fixo no passo 3 → verificar pré-visualização recalcula
10. Salvar → verificar tela de sucesso → clicar "Nova cobrança" → verificar wizard limpo
11. Cancelar no meio → verificar confirmação → confirmar → verificar volta ao Dashboard
12. Voltar do passo 3 para o 1 → verificar dados preservados

---

### Módulo M11: Página Clientes

**Objetivo:** Implementar listagem, busca, edição inline e histórico de clientes.

**Tarefas:**
1. Lista de clientes com useClients hook
2. SearchInput (filtra por nome e telefone)
3. Card de cliente: nome, status (Ativo/Inativo), telefone formatado, contador de cobranças ativas
4. Toque no card expande:
   - Dados editáveis inline (nome, telefone, observações)
   - Toggle Ativo/Inativo (com confirmação ao inativar)
   - Histórico de cobranças (5 recentes via useCharges)
   - Cada cobrança expande mostrando parcelas
   - Botões [Editar] e [Excluir] na cobrança (se permitido)
   - Botão [↺ Desfazer pagamento] em parcelas pagas
5. Botão [＋ Novo] no header → mini-form inline
6. "Ver todas as cobranças (X)" → lista paginada completa
7. Reativação de cliente inativo ao tocar no status

**Dependências:** M6 (hooks), M7 (componentes base), M4 (api.service)

**Critérios de conclusão:**
- [ ] Lista carrega clientes ao montar
- [ ] Busca filtra por nome e telefone em tempo real
- [ ] Card expande ao toque mostrando dados editáveis
- [ ] Edição inline salva ao clicar fora ou em botão
- [ ] Inativação pede confirmação
- [ ] Inativação faz parcelas sumirem do Dashboard (verificar via evento)
- [ ] Reativação faz parcelas voltarem ao Dashboard
- [ ] Histórico mostra 5 cobranças recentes
- [ ] Cada cobrança no histórico expande mostrando parcelas
- [ ] [Editar] só aparece se todas parcelas têm status=pendente
- [ ] [Excluir] só aparece se nenhuma parcela foi paga/parcial
- [ ] [↺ Desfazer pagamento] aparece em parcelas pagas ou parciais
- [ ] Desfazer pagamento restaura status e campos
- [ ] "Ver todas" carrega lista completa paginada
- [ ] Novo cliente cria via mini-form inline

**Testes antes de avançar:**
1. Abrir página → verificar lista de clientes
2. Digitar na busca → verificar filtro
3. Expandir cliente → editar nome → clicar fora → verificar salvou
4. Inativar cliente → confirmar → verificar que some do Dashboard
5. Reativar cliente → verificar que volta ao Dashboard
6. Expandir cliente → expandir cobrança → verificar parcelas
7. Clicar [Editar] em cobrança com todas pendentes → verificar abre fluxo de edição
8. Clicar [Excluir] em cobrança sem pagamentos → confirmar → verificar excluiu
9. Clicar [↺ Desfazer pagamento] → confirmar → verificar status voltou
10. Tentar excluir cobrança com parcela paga → verificar botão não aparece
11. Clicar "Ver todas" → verificar lista completa
12. Clicar [＋ Novo] → preencher → salvar → verificar cliente na lista

---

### Módulo M12: Página Produtos

**Objetivo:** Implementar listagem, edição inline e criação de produtos.

**Tarefas:**
1. Lista de produtos com useProducts hook (ordenados por vezesUsado)
2. Card de produto: nome, valor padrão (ou "Sem valor"), vezes usado
3. Toque no card expande: edição inline (nome, valorPadrao)
4. Botão [＋ Novo] no header → mini-form inline
5. Item "Venda avulsa" no fim da lista (agrupamento visual, não editável)
6. Tentativa de exclusão: verifica se há cobranças referenciando
7. Exclusão permitida → deleta produto
8. Exclusão não permitida → mostra mensagem

**Dependências:** M6 (hooks), M7 (componentes base), M4 (api.service)

**Critérios de conclusão:**
- [ ] Produtos ordenados por vezesUsado (descendente)
- [ ] Produto mais usado tem ⭐ no card
- [ ] Valor padrão formatado como moeda ou "Sem valor"
- [ ] Contador "Usado X vezes" exibido
- [ ] Edição inline salva nome e valorPadrao
- [ ] Novo produto criado aparece no topo (vezesUsado=0, mas novo)
- [ ] "Venda avulsa" aparece como agrupamento (count de cobranças com produtoServicoId=null)
- [ ] "Venda avulsa" não é editável nem excluível
- [ ] Excluir produto com cobranças → bloqueia com mensagem
- [ ] Excluir produto sem cobranças → permite

**Testes antes de avançar:**
1. Abrir página → verificar ordem por vezesUsado
2. Expandir produto → editar valor → verificar salvou
3. Criar novo produto → verificar aparece na lista
4. Tentar excluir produto usado em cobrança → verificar bloqueio
5. Criar produto sem cobranças → excluir → verificar sucesso
6. Verificar "Venda avulsa" mostra contagem correta

---

### Módulo M13: Página Settings

**Objetivo:** Implementar configuração de dias trabalhados.

**Tarefas:**
1. Carregar useConfig hook
2. 7 checkboxes (Dom a Sáb)
3. Botão [Salvar]
4. Texto explicativo

**Dependências:** M6 (useConfig), M7 (componentes base)

**Critérios de conclusão:**
- [ ] Carrega dias trabalhados atuais
- [ ] Default [1,2,3,4,5] se não existe
- [ ] Salvar persiste na entity Configuracao
- [ ] Checkboxes toggle corretamente

**Testes antes de avançar:**
1. Abrir Settings → verificar defaults
2. Desmarcar Segunda → Salvar → recarregar → verificar persistido
3. Remover registro de Configuracao → reabrir → verificar que recria com defaults

---

## Fase 7 — Integração

### Módulo M14: Navegação, Onboarding e Wiring

**Objetivo:** Conectar todas as páginas, implementar navegação, onboarding e ajustes finais.

**Tarefas:**
1. Barra de navegação fixa: [🏠 Hoje] [➕ Nova] [👥 Clientes] [📦 Serviços] [⚙️]
2. Roteamento entre páginas
3. [➕ Nova] é o maior e mais destacado
4. Detecção de primeiro acesso (0 clientes AND 0 produtos AND 0 cobranças)
5. OnboardingGuide no Dashboard quando vazio
6. Onboarding desaparece quando primeira cobrança é criada
7. Verificar que EventBus eventos fluem entre páginas (ex: criar cobrança em Nova → Dashboard atualiza)
8. Fluxo de edição de cobrança: abre M10 com campos pré-preenchidos, título "Editar Cobrança", botão "Salvar alterações"
9. Fluxo de exclusão: confirmação + exclusão + decrementar vezesUsado
10. Responsividade: testar em mobile e desktop

**Dependências:** M9, M10, M11, M12, M13 (todas as páginas)

**Critérios de conclusão:**
- [ ] Barra de navegação fixa com 5 itens
- [ ] [➕ Nova] é visualmente o maior
- [ ] Página inicial é sempre Dashboard
- [ ] Navegação entre páginas funciona
- [ ] Onboarding aparece quando sistema vazio
- [ ] Onboarding desaparece após primeira cobrança
- [ ] Criar cobrança → voltar ao Dashboard → parcelas aparecem (via EventBus)
- [ ] Marcar como pago no Dashboard → ir em Clientes → histórico atualizado
- [ ] Editar cobrança via Clientes → voltar → Dashboard reflete mudança
- [ ] Excluir cobrança → Dashboard atualiza
- [ ] Layout responsivo em mobile (375px) e desktop (1280px)
- [ ] Card expandido funciona em mobile (scroll vertical, sem overflow horizontal)

**Testes antes de avançar:**
1. Sistema vazio → abrir → verificar Onboarding
2. Cadastrar cliente via Onboarding → verificar ✓ no botão 1
3. Cadastrar produto via Onboarding → verificar ✓ no botão 2
4. Criar cobrança via Onboarding → verificar Onboarding desaparece
5. Navegar entre todas as 5 páginas → verificar que não quebra
6. Criar cobrança → ir ao Dashboard → verificar que aparece
7. Marcar pago no Dashboard → ir em Clientes → verificar histórico atualizado
8. Ir em Clientes → editar cobrança → salvar → voltar ao Dashboard → verificar mudança
9. Abrir em mobile (DevTools 375px) → verificar que todos os elementos são usáveis
10. Abrir em desktop → verificar layout

---

## Fase 8 — Validação Final

### Módulo M15: Testes de Integração E2E

**Objetivo:** Validar que o sistema completo atende a todos os critérios de aceitação do PRD v2.0.

**Tarefas:**
1. Limpar todos os dados de teste
2. Executar cenários de teste E2E (simulação de uso real)
3. Validar todos os critérios de aceitação (AC-01 a AC-61)
4. Testar casos especiais (seção 10 do PRD)
5. Testar edge cases

**Dependências:** M14 (sistema completo)

**Cenários de teste E2E:**

**Cenário 1 — Primeiro acesso e migração:**
- [ ] Sistema vazio → Onboarding aparece
- [ ] Cadastrar 5 clientes via Onboarding
- [ ] Cadastrar 3 produtos via Onboarding
- [ ] Criar 5 cobranças (à vista, 3x, 10x, avulsa, dinheiro)
- [ ] Onboarding desaparece
- [ ] Dashboard mostra parcelas corretas

**Cenário 2 — Dia de cobrança:**
- [ ] Abrir Dashboard → ver parcelas de hoje
- [ ] Clicar Cobrar → WhatsApp abre com mensagem correta
- [ ] Confirmar envio → card muda de cor
- [ ] Marcar como pago (total) → card some + undo toast
- [ ] Desfazer → card volta
- [ ] Marcar como pago (parcial) → card mostra "R$ X de R$ Y"
- [ ] Selecionar 3 cards → marcar lote → 3 cards somem
- [ ] Pesquisar por nome → lista filtra

**Cenário 3 — Atrasadas:**
- [ ] Criar parcela com vencimento 10 dias atrás → aparece vermelha "Atrasada há 10 dias"
- [ ] Criar parcela com vencimento 2 dias atrás → aparece laranja "Atrasada há 2 dias"
- [ ] Cobrar atrasada → mensagem diz "venceu no dia" (passado)
- [ ] Confirmar envio → card muda de vermelho/laranja para amarelo
- [ ] Arquivar atrasada → card some do Dashboard
- [ ] Desarquivar via histórico → volta ao Dashboard

**Cenário 4 — Pagamento parcial:**
- [ ] Marcar parcial de R$ 100 em parcela de R$ 200 → "R$ 100 de R$ 200 (pago parcial)"
- [ ] Cobrar parcela parcial → mensagem menciona "R$ 100 pendentes"
- [ ] Complementar com R$ 100 → status = pago, card some
- [ ] Desfazer complemento → volta para pago_parcial com valorPago anterior

**Cenário 5 — Edição e exclusão:**
- [ ] Editar cobrança com todas parcelas pendentes → regenera parcelas
- [ ] Editar cobrança com parcela cobrada → só permite observações/PIX
- [ ] Excluir cobrança sem pagamentos → deleta cobrança + parcelas
- [ ] Excluir cobrança com parcela paga → bloqueia
- [ ] Excluir produto usado em cobrança → bloqueia

**Cenário 6 — Cliente inativo:**
- [ ] Inativar cliente → parcelas somem do Dashboard
- [ ] Histórico do cliente inativo é acessível
- [ ] Reativar cliente → parcelas voltam ao Dashboard

**Cenário 7 — Casos especiais:**
- [ ] Fevereiro com dia 30 → parcela vence 28/02 (ou 29 em bissexto)
- [ ] Abril com dia 31 → parcela vence 30/04
- [ ] Cliente com cobranças em dias diferentes → ambos aparecem no dia correto
- [ ] Produto excluído (se possível forçar) → cobrança mantém nomeProdutoServico
- [ ] PIX sem chave na forma PIX → bloqueio no cadastro
- [ ] Venda avulsa com <3 chars → bloqueio

**Cenário 8 — Performance:**
- [ ] Dashboard carrega em <2s com 50 parcelas
- [ ] Busca responde em <300ms
- [ ] Marcar como pago responde em <500ms (ação otimista)
- [ ] Não há polling ou setInterval em nenhuma página

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

## Matriz de Dependências

```
M1 ──────────────────┬────── M2
                     │
M3 ──────────────────┼────── M5
                     │        │
                     └────── M4
                               │
                               └────── M6
                                        │
M7 ──────────────────────────────────────┤
                                        │
M8 ──────────────────────────────────────┤
                                        │
                    M9 ─ M10 ─ M11 ─ M12 ─ M13
                                        │
                                        └────── M14
                                                 │
                                                 └────── M15
```

| Módulo | Depende de | Bloqueia |
|---|---|---|
| M1 | — | M2, M4 |
| M2 | M1 | M4, M10 |
| M3 | — | M4, M5, M8, M10 |
| M4 | M1, M3, M5 | M6 |
| M5 | M3 | M4, M6, M7, M8 |
| M6 | M4, M5 | M9, M10, M11, M12, M13 |
| M7 | M5, M3 | M8 |
| M8 | M7, M5, M3 | M9, M10 |
| M9 | M6, M8, M7 | M14 |
| M10 | M6, M8, M3, M4 | M14 |
| M11 | M6, M7, M4 | M14 |
| M12 | M6, M7, M4 | M14 |
| M13 | M6, M7 | M14 |
| M14 | M9, M10, M11, M12, M13 | M15 |
| M15 | M14 | — |

---

## Ordem Otimizada de Desenvolvimento (Paralelo Onde Possível)

```
Sprint 1: M1 + M3 + M5 (paralelizáveis — não dependem entre si)
Sprint 2: M2 (depende de M1)
Sprint 3: M4 (depende de M1, M3, M5)
Sprint 4: M6 + M7 (paralelizáveis — M6 depende de M4/M5, M7 depende de M5/M3)
Sprint 5: M8 (depende de M7)
Sprint 6: M9 + M10 (paralelizáveis — dependem de M6/M8)
Sprint 7: M11 + M12 + M13 (paralelizáveis — dependem de M6/M7)
Sprint 8: M14 (depende de todas as páginas)
Sprint 9: M15 (validação final)
```

**Estimativa por sprint:** 1-3 dias dependendo do módulo. Total: ~15-20 dias úteis para 1 desenvolvedor.

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Backend function de createCobranca não atômica | Média | Alto | M2 tem teste de compensação obrigatório antes de avançar |
| EventBus não propaga entre páginas | Baixa | Alto | M14 valida explicitamente que eventos fluem entre páginas |
| Performance do Dashboard com muitas parcelas | Baixa | Médio | M15 cenário 8 valida com 50 parcelas |
| Fuso horário quebrando cálculo de "hoje" | Média | Alto | M3 define hoje() em America/Sao_Paulo, M15 valida |
| Meses curtos (fevereiro) gerando datas inválidas | Alta | Alto | M3 tem testes específicos para fev bissexto e não bissexto |
| Edição de cobrança perdendo dados | Baixa | Alto | M10 testa voltar entre passos sem perder dados |
| UX em mobile com cards expansíveis | Média | Médio | M14 testa em 375px |

---

## Checklist de Não-Avanço

Um módulo **não pode avançar** para a próxima fase se:

1. ❌ Qualquer critério de conclusão não atendido
2. ❌ Qualquer teste obrigatório falhou
3. ❌ Há console.error ou console.warn em operação normal
4. ❌ Há setInterval ou polling em qualquer arquivo
5. ❌ Há referência a `boleto` no enum de pagamento
6. ❌ Há referência ao campo `parcelado` (removido na v2.0)
7. ❌ Há referência a `dataLimite` (regra de atraso simplificada)
8. ❌ Valores monetários não estão em reais com 2 casas decimais
9. ❌ Datas não estão em YYYY-MM-DD sem hora

---

## Fim do Plano
