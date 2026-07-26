# Revisão Técnica do Plano de Implementação — Visão de Tech Lead

**Documento revisado:** PLANO-IMPLEMENTACAO.md
**Revisor:** Tech Lead (simulado)
**Foco:** Evitar retrabalho, identificar dependências incorretas, módulos grandes demais, e riscos técnicos da Base44

---

## 1. Dependências Incorretas

### 1.1 — Dependência circular entre M3 e M5

**Problema:** O plano diz que M3 (Domain Logic) não tem dependências ("Nenhuma, funções puras"). Mas M3 usa tipos definidos em M5: `CobrancaInput`, `ParcelaInput`, `ParcelaStatus`, `EstadoAnterior`, `AcaoStatus`. Simultaneamente, a matriz de dependências diz que M5 depende de M3. Isso é uma dependência circular.

**Impacto:** Se M3 for construído antes de M5 (como proposto no Sprint 1), o desenvolvedor cria tipos inline em M3. Quando M5 define os tipos "oficiais", M3 precisa ser refatorado para importar de M5. Retrabalho garantido.

**Correção:** Inverter a dependência. M5 (Types e Config) não depende de nada. M3 (Domain Logic) depende de M5.

```
Sprint 1: M1 + M5 (paralelos, sem dependências)
Sprint 2: M3 (depende de M5) + M2 (depende de M1)
```

---

### 1.2 — M2 (backend function) duplica M3 (domain logic)

**Problema:** M2 (createCobranca backend function) precisa calcular parcelas — datas, valores, arredondamento, meses curtos. M3 (domain logic) implementa `gerarParcelas` com a mesma lógica. Em Base44, backend functions são arquivos TypeScript isolados deployed via `deploy_backend_function`. Elas **não podem importar** de `src/domain/` ou `src/lib/`. O código precisa ser autocontido.

**Impacto:** Dois desenvolvedores diferentes implementariam a mesma lógica em dois lugares sem saber. Se a regra de arredondamento muda um dia, um lado é corrigido e o outro não. Parcelas divergentes entre o que a pré-visualização mostra (frontend, M3) e o que é persistido (backend, M2).

**Correção:** Definir explicitamente qual das três estratégias o plano adota:

**Estratégia recomendada:** O frontend (M3) calcula as parcelas para pré-visualização. O backend function (M2) **reimplementa** a mesma lógica de forma independente (não importa de M3), mas ambos são validados contra os **mesmos testes** do M3 (Sprint 2). O backend é a fonte de verdade — o que ele calcula é o que persiste. A pré-visualização do frontend é só visual.

**Justificativa:** Em Base44, backend functions são isoladas por design. Tentar compartilhar código entre frontend e backend adicionaria complexidade (extrair para um pacote, configurar imports) sem benefício real. A duplicação é controlada — os testes do M2 já verificam os mesmos casos do M3 (soma das parcelas, fevereiro, etc.).

**Ação no plano:** Adicionar em M2 uma seção "Duplicação consciente" que lista exatamente quais funções são duplicadas entre M2 e M3, e adicionar um critério de conclusão: "Os testes do M2 cobrem os mesmos casos de arredondamento e data do M3. Se uma regra mudar em M3, o critério de não-avanço exige atualização correspondente em M2."

---

### 1.3 — M4 (services) pode ser desnecessário em Base44

**Problema:** M4 wrapping do Base44 SDK (`api.service.ts`). Em Base44, o SDK já é acessível via `import { EntityName } from '@/api/entities'` no frontend. Uma camada de service que apenas repassa chamadas adiciona um arquivo extra por entidade sem abstração real.

**Impacto:** 20+ funções em `api.service.ts` que são wrappers 1:1 do SDK. Se o SDK muda, a camada de service precisa atualizar também. Trabalho duplicado sem benefício. O desenvolvedor perde tempo escrevendo e testando wrappers.

**Correção:** Eliminar M4 como módulo separado. Em vez disso:

- Os hooks (M6) chamam o SDK diretamente: `Cliente.list()`, `Cliente.create(data)`, etc.
- A única exceção é `criarCobranca`, que chama a backend function via `callBase44BackendFunction` ou o SDK de functions.
- `whatsapp.service.ts` e `clipboard.service.ts` permanecem como serviços (não são wrappers do SDK).

**Ação no plano:** Remover M4 da matriz de dependências. Os hooks (M6) passam a depender diretamente de M1 (entities) + M5 (types) + M3 (domain). `whatsapp.service.ts` e `clipboard.service.ts` movem para M5 ou para um mini-módulo M4a que contém apenas esses 2 arquivos.

**Nova dependência de M6:** M1 (entities existem) + M3 (domain) + M5 (types + event-bus). Sem M4.

---

## 2. Módulos Grandes Demais

### 2.1 — M3 (Domain Logic) tem 9 arquivos com responsabilidades diferentes

**Problema:** M3 mistura utilidades puras (math, date, format, validation) com regras de domínio (billing-cycle, parcel.rules, status.rules, overdue.rules, charge.rules). São 9 arquivos em um único módulo com critérios de conclusão misturados.

**Impacto:** Um desenvolvedor trava em `billing-cycle.ts` (complexo, meses curtos) e atrasa `format.utils.ts` (trivial, formatação de moeda). O critério de conclusão é binário — o módulo só avança quando tudo está pronto.

**Correção:** Dividir M3 em dois sub-módulos:

- **M3a — Utils (lib/):** `math.utils.ts`, `date.utils.ts`, `format.utils.ts`, `validation.utils.ts`. Funções puras, sem dependência de domain. Depende apenas de M5 (types).
- **M3b — Domain (domain/):** `billing-cycle.ts`, `parcel.rules.ts`, `status.rules.ts`, `overdue.rules.ts`, `charge.rules.ts`. Depende de M3a + M5.

M3a pode ser concluído e testado independentemente. M3b só inicia após M3a. Se M3a trava, o desenvolvedor pode pelo menos confirmar que format e validation estão prontos.

---

### 2.2 — M6 (Hooks) tem 7 hooks com complexidade desigual

**Problema:** `useClients` e `useConfig` são CRUD simples (1 entidade, 1 query). `useDashboard` é complexo (múltiplas queries, cálculo de atrasados, ordenação, contadores). `useParcelActions` tem 6 ações distintas com undo. Agrupar tudo em um módulo com um checkpoint binário.

**Impacto:** O desenvolvedor pode terminar `useClients` em 30 minutos e ficar 2 dias em `useDashboard`. Mas o checkpoint do módulo só passa quando todos os 7 hooks estão prontos. As páginas simples (M11 Clientes, M12 Produtos) ficam bloqueadas esperando `useDashboard` que nem usam.

**Correção:** Dividir M6 em dois sub-módulos:

- **M6a — Hooks básicos:** `useClients`, `useProducts`, `useCharges`, `useConfig`. CRUD simples. Depende de M1 + M3a + M5.
- **M6b — Hooks complexos:** `useDashboard`, `useParcelActions`, `useBatchSelect`. Depende de M6a + M3b.

M11 (Clientes) e M12 (Produtos) só precisam de M6a. Podem começar antes de M6b estar pronto. Isso desbloqueia paralelismo real.

---

### 2.3 — M8 (Componentes Compostos) tem componentes de complexidade muito diferente

**Problema:** `BatchBar` e `OnboardingGuide` são simples (1-2 horas cada). `ChargeCard` é o componente mais complexo do sistema (estados visuais, menu inline, expansão, seleção, CopyButton, WhatsAppButton, ações). Agrupar tudo em um checkpoint.

**Impacto:** M9 (Dashboard) e M10 (Nova Cobrança) ficam bloqueados esperando `OnboardingGuide` que nem usam na funcionalidade principal.

**Correção:** Dividir M8 em dois sub-módulos:

- **M8a — Componentes compostos core:** `ChargeCard`, `ClientAutocomplete`, `ProductAutocomplete`, `PaymentSelector`, `ParcelPreview`. Esses são usados em M9 e M10.
- **M8b — Componentes auxiliares:** `BatchBar`, `OnboardingGuide`. Esses são usados apenas em M9 e M14.

M8b é trivial e pode ser feito junto com M9 ou M14. M8a é o trabalho real e bloqueia as páginas principais.

---

### 2.4 — M10 (Nova Cobrança) é grande demais para um único módulo

**Problema:** M10 tem 4 passos, cadastro inteligente, mini-forms inline (novo cliente, novo produto), venda avulsa, pré-visualização de parcelas, tela de sucesso. São pelo menos 8 sub-fluxos distintos. Os critérios de conclusão têm 20 itens.

**Impacto:** Um módulo de 20 critérios é difícil de estimar e rastrear. Se 18 de 20 passam, o módulo está "quase pronto" mas não pode avançar. O desenvolvedor não sabe por onde começar dentro do módulo.

**Correção:** Dividir M10 em 3 sub-módulos sequenciais:

- **M10a — Passo 1+2:** ClientAutocomplete + ProductAutocomplete + Valor + PaymentSelector. O fluxo de seleção. Depende de M8a + M6a.
- **M10b — Passo 3+4:** DaySelector + primeiro vencimento + ParcelPreview + Observações + Sucesso. Depende de M10a.
- **M10c — Cadastro inteligente:** Pré-preenchimento baseado em histórico. Depende de M10a (funciona sem isso, é melhoria). Pode ser feito depois do MVP funcionar.

M10c é opcional para o MVP funcional. O fluxo funciona sem cadastro inteligente — a usuária apenas preenche manualmente. M10c pode ser movido para o Sprint 7 ou 8.

---

## 3. Código Que Ainda Não Existe

### 3.1 — M2 depende de lógica de M3 que não existe no backend

**Problema:** M2 (backend function) precisa de `dividirValor`, `adicionarMeses`, `calcularVencimentoParcela` — todas definidas em M3. Mas M3 é frontend. O backend function é isolado.

**Impacto:** Se M2 é construído no Sprint 2 e M3 no Sprint 2 (paralelo), nenhum dos dois tem a lógica pronta primeiro. O desenvolvedor de M2 implementa do zero, o desenvolvedor de M3 implementa do zero, e os dois têm versões diferentes.

**Correção:** Alterar a ordem: M3a (utils) deve ser concluído antes de M2. M2 copia a lógica de M3a (duplicação consciente, já justificada em 1.2). M3b (domain) pode ser paralelo a M2.

---

### 3.2 — M6 depende de M4 que depende de M1 — cadeia longa

**Problema:** Com a remoção de M4 (seção 1.3), M6 depende diretamente de M1 + M3 + M5. Mas o plano original tem M6 dependendo de M4, que depende de M1, M3, M5. Cadeia de 3 níveis antes de chegar aos hooks.

**Impacto:** Cada nível adiciona tempo de desenvolvimento sem valor. Remover M4 encurta a cadeia.

**Correção:** Aplicada em 1.3. M6 depende de M1 + M3b + M5. Cadeia de 2 níveis.

---

## 4. Risco de Retrabalho Entre Fases

### 4.1 — Dados de teste do M1 com datas relativas

**Problema:** M1 define dados de teste cobrindo "vence hoje, vence amanhã, atrasada 2 dias, atrasada 10 dias". Mas as datas são absolutas no momento da criação. Se os dados são criados no dia 25/07 e os testes do M9 rodam no dia 01/08, as parcelas "de hoje" são da semana passada.

**Impacto:** Todo teste de Dashboard em M9 e M15 falha porque as datas de teste estão desatualizadas. O desenvolvedor precisa recriar dados de teste antes de cada fase. Retrabalho recorrente.

**Correção:** Adicionar em M1 uma função de teste que cria dados com datas calculadas dinamicamente: `const hoje = new Date().toISOString().slice(0, 10)`. Os dados de teste são sempre relativos ao dia atual. Esta função é reutilizada em M9, M10, M14 e M15.

**Ação no plano:** M1 inclui um script `seed-test-data.ts` que cria dados com datas relativas. Cada fase de teste chama este script antes de iniciar.

---

### 4.2 — M9 (Dashboard) e M6b (useDashboard) têm critérios sobrepostos

**Problema:** M6b define critérios como "useDashboard calcula diasAtraso e cor corretamente". M9 define "AC-03: Gradiente laranja/vermelho em atrasadas". Esses são o mesmo critério em dois módulos. Se o hook calcula corretamente mas o componente renderiza errado, ou vice-versa, é ambíguo onde corrigir.

**Impacto:** Dupla contagem de critérios. O desenvolvedor testa em M6b (com mock), passa, depois testa em M9 (com componente real), falha, e não sabe se o problema é do hook ou do componente.

**Correção:** M6b testes são unitários (hook com dados mockados, verifica return values). M9 testes são de integração (hook + componente + dados reais). M6b não testa cor ou renderização — apenas lógica. M9 não testa lógica — apenas que o componente usa o hook corretamente.

---

### 4.3 — M10 (Nova Cobrança) e M2 (backend function) têm critérios sobrepostos

**Problema:** M2 testa "Criar cobrança 3x R$100 → 3 parcelas (33.33, 33.33, 33.34)". M10 testa "Fluxo completo com cliente existente, produto existente, à vista, PIX → verificar cobranca + 1 parcela criadas". Ambos testam criação de cobrança.

**Impacto:** Se o teste do M10 falha, pode ser problema do M2 (backend) ou do M10 (frontend). Como M2 já passou, o desenvolvedor assume que é M10, mas pode ser que o frontend envie dados no formato errado para o backend.

**Correção:** M10 testa com o backend já validado (M2 passou). O critério de M10 muda de "verificar cobranca + parcela criadas" para "verificar que o payload enviado ao backend contém os campos corretos" + "verificar que a resposta do backend é tratada corretamente (sucesso/erro)".

---

## 5. Funcionalidades Planejadas Cedo Demais

### 5.1 — Cadastro inteligente (M10c / M6 useCharges) no Sprint 6

**Problema:** O cadastro inteligente busca as últimas 3 cobranças do cliente para pré-preencher campos. Isso requer que o hook `useCharges` (M6a) e a lógica de padrão (comparar 3 cobranças, identificar produto/PIX/parcelas repetidos) estejam prontos. Mas o cadastro inteligente é uma otimização, não uma funcionalidade crítica.

**Impacto:** O desenvolvedor gasta tempo no cadastro inteligente antes de ter o fluxo básico funcionando. Se o fluxo básico tem bugs, o cadastro inteligente é retrabalho sobre código instável.

**Correção:** Mover o cadastro inteligente para depois do MVP funcional (pós-M14). O fluxo de Nova Cobrança funciona sem ele — a usuária preenche manualmente. O cadastro inteligente economiza 15-20s por cobrança recorrente, mas só vale a pena implementar depois que o fluxo básico está validado.

---

### 5.2 — useBatchSelect (M6b) no Sprint 4

**Problema:** `useBatchSelect` só é usado no Dashboard (M9). É um hook de seleção múltipla com marcação em lote. Construí-lo no Sprint 4, antes do Dashboard existir, significa testar com mocks e ajustar depois quando o componente real for construído.

**Impacto:** O hook é testado isoladamente, mas a integração com `ChargeCard` (que tem o círculo de seleção) pode revelar que a API do hook não atende às necessidades do componente. Retrabalho na interface do hook.

**Correção:** Mover `useBatchSelect` para dentro do escopo do M9 (Dashboard). O desenvolvedor do Dashboard constrói o hook e o componente juntos, garantindo que a API faz sentido. M6b fica com apenas `useDashboard` e `useParcelActions`.

---

### 5.3 — OnboardingGuide (M8b) no Sprint 5

**Problema:** `OnboardingGuide` depende de saber se o sistema está vazio (0 clientes, 0 produtos, 0 cobranças). É construído no Sprint 5, mas a lógica de "sistema vazio" só é integrada no M14 (integração).

**Impacto:** O componente é construído sem saber exatamente como a detecção de "sistema vazio" funciona na prática. Pode precisar de ajustes quando integrado.

**Correção:** Mover `OnboardingGuide` para M14 (integração). É um componente simples que depende mais da integração (detecção de estado vazio, navegação entre páginas) do que de componentes base. Construí-lo junto com a integração evita retrabalho.

---

## 6. Oportunidades de Paralelização Adicional

### 6.1 — M7 (componentes base) pode começar no Sprint 2

**Problema:** O plano atual coloca M7 no Sprint 4 (após M4 e M6). Mas M7 depende apenas de M5 (types) e M3a (format/utils). Ambos estão prontos no Sprint 1.

**Correção:** M7 começa no Sprint 2, em paralelo com M3b e M2. Um desenvolvedor faz M3b, outro faz M7.

**Novo Sprint 2:** M2 (backend) + M3b (domain) + M7 (componentes base) — 3 módulos paralelos.

---

### 6.2 — M11 (Clientes) e M12 (Produtos) podem começar no Sprint 5

**Problema:** O plano atual coloca M11 e M12 no Sprint 7 (após M9 e M10). Mas M11 e M12 dependem apenas de M6a (hooks básicos) e M7 (componentes base), não de M8 (compostos).

**Correção:** M11 e M12 começam no Sprint 5, em paralelo com M8a. Um desenvolvedor faz M8a, outro faz M11+M12.

**Novo Sprint 5:** M8a (compostos core) + M6b (hooks complexos) + M11 (Clientes) + M12 (Produtos) — 4 módulos paralelos.

---

### 6.3 — M13 (Settings) pode começar no Sprint 4

**Problema:** M13 é trivial (7 checkboxes + salvar). Depende apenas de M6a (useConfig) e M7 (SearchInput/CopyButton). Mas está no Sprint 7.

**Correção:** M13 pode ser feito no Sprint 4 ou 5, assim que M6a estiver pronto. É 1-2 horas de trabalho.

---

## 7. Critérios de Aceitação Incompletos

### 7.1 — M1 não especifica o método de criação de entities

**Problema:** M1 diz "Criar entity Cliente" mas não especifica se via `manage_entity_schemas` tool ou editando arquivos `base44/entities/Cliente.jsonc`. Em Base44, o método afeta como os enums e defaults são configurados.

**Correção:** Adicionar critério: "Entities criadas via `manage_entity_schemas` com action=create, schema JSON com enum e default conforme PRD v2.0 seção 6."

---

### 7.2 — M2 não especifica qual role do SDK usar

**Problema:** M2 não diz se usa `base44.entities.Cobranca.create()` (user-scoped) ou `base44.asServiceRole.entities.Cobranca.create()` (admin). Isso afeta RLS e quem pode criar cobranças.

**Correção:** Adicionar critério: "Backend function usa `base44.entities` (user-scoped) para criar cobranças e parcelas. `base44.asServiceRole` apenas para incrementar `vezesUsado` do produto se necessário (cross-entity update)."

---

### 7.3 — M6 não define tratamento de erro nos hooks

**Problema:** M6 critérios não incluem o que acontece quando a API falha. O hook retorna `error`, mas o componente como reage?

**Correção:** Adicionar critério: "Todos os hooks expõem `error: string | null` e `loading: boolean`. Em caso de erro, o hook não crasha — retorna dados em cache (se houver) ou lista vazia com `error` preenchido."

---

### 7.4 — M9 não define o que acontece ao clicar em "Próximos vencimentos"

**Problema:** O plano diz "3 linhas clicáveis" mas não define o comportamento. Abre overlay? Navega para outra página? Filtra a lista?

**Correção:** Adicionar critério: "Clicar em um próximo vencimento abre um overlay/modal listando as parcelas daquele dia. Não navega para outra página. Fechar o overlay volta ao Dashboard normal."

---

### 7.5 — M10 não define tratamento de erro do backend

**Problema:** M10 não diz o que acontece se o backend function `createCobranca` retorna erro durante o wizard. A tela de sucesso não aparece, mas o que aparece?

**Correção:** Adicionar critério: "Se o backend retorna erro ao criar cobrança, o wizard permanece no passo 4 com um toast de erro: 'Erro ao registrar cobrança. [Tentar novamente]'. Os dados preenchidos não são perdidos."

---

### 7.6 — M14 não detalha o fluxo de edição tecnicamente

**Problema:** M14 diz "Abre M10 com campos pré-preenchidos" mas não especifica: o wizard recebe um `cobrancaId` como prop? Os passos pulam campos não editáveis? O botão diz "Salvar alterações" em vez de "Confirmar"?

**Correção:** Adicionar critério: "Edição de cobrança: M10 recebe prop `editMode=true` e `cobrancaId`. Passo 1 mostra cliente e produto como somente leitura (não editáveis em cobrança existente). Passo 2 e 3 são editáveis se permitido pelas regras de M3b. Botão final diz 'Salvar alterações'. Ao salvar, chama `editarCobranca` (api.service ou SDK direto), não `createCobranca`."

---

### 7.7 — M15 não testa cadastro inteligente end-to-end

**Problema:** M15 cenários não incluem um teste do cadastro inteligente (pré-preenchimento).

**Correção:** Adicionar cenário: "Criar 3 cobranças para o mesmo cliente com mesmo PIX. Abrir Nova Cobrança, selecionar esse cliente → verificar que PIX é pré-preenchido. Selecionar cliente novo → verificar que nada é pré-preenchido."

---

## 8. Riscos Técnicos Específicos da Base44

### 8.1 — Backend function sem transações ACID

**Problema:** O plano exige "transação atômica" em M2. Base44 backend functions não suportam transações ACID. A "compensação" (deletar em caso de falha) é frágil — se a function crasha entre criar a cobrança e criar as parcelas, e o código de compensação também falha, ficam registros órfãos.

**Impacto:** Cobranças sem parcelas, ou parcelas sem cobrança pai. Corrompe o Dashboard.

**Mitigação:**
1. A backend function cria parcelas em um único `create_entity_records` batch (uma chamada, N registros). Se falha, nada é criado.
2. Só depois de parcelas criadas com sucesso, incrementa `vezesUsado`. Se isso falha, não é crítico (vezesUsado é cosmético).
3. Compensação: se `create_entity_records` de parcelas falha, deletar a cobrança criada. Se o delete também falha, a function retorna erro e o frontend não considera a operação bem-sucedida. Um job de limpeza manual (ou o próprio sistema na próxima query) detecta cobranças sem parcelas e as marca como órfãs.

**Ação no plano:** Substituir "transação atômica" por "batch create com compensação best-effort". Adicionar critério: "Se a criação de parcelas falha, a cobranca criada é deletada. Se o delete falha, a function retorna erro e o frontend trata a cobrança como não criada."

---

### 8.2 — Enum validation no schema da entity

**Problema:** M1 assume que Base44 valida enums no schema. Se a entity for criada com `"formaPagamento": {"type": "string", "enum": ["pix", "dinheiro", "cartao_credito", "cartao_debito", "transferencia"]}`, o Base44 deve rejeitar valores fora do enum. Mas isso depende da implementação do Base44.

**Impacto:** Se o Base44 não valida enums no schema, registros com `formaPagamento = "boleto"` podem ser criados diretamente via SDK, contornando a validação.

**Mitigação:**
1. M1 inclui teste que tenta criar registro com valor inválido e verifica se é rejeitado.
2. Se o Base44 não rejeita, a validação deve ser feada no backend function (M2) e no frontend (M3 `validarCobranca`). O schema define o enum para documentação, mas a validação real é no código.

**Ação no plano:** Adicionar nota em M1: "Se o Base44 não rejeitar enum inválido no teste 2, registrar como limitação conhecida e garantir que M2 (backend) e M3 (frontend) validam o enum em código."

---

### 8.3 — `vezesUsado` update cross-entity

**Problema:** M2 precisa incrementar `vezesUsado` do `ProdutoServico` ao criar uma `Cobranca`. Isso é um update em uma entidade diferente da que está sendo criada. Em Base44, dentro de uma backend function, isso pode requerer `base44.asServiceRole.entities.ProdutoServico.update()` se RLS impedir o update cross-entity.

**Impacto:** Se RLS bloqueia, o `vezesUsado` nunca incrementa. Produtos favoritos param de funcionar.

**Mitigação:** M2 testa explicitamente: criar cobrança com produto, verificar que `vezesUsado` incrementou. Se não incrementar, investigar se é RLS e usar `asServiceRole`.

**Ação no plano:** Adicionar critério em M2: "Após criar cobrança com produtoServicoId, ler o produto e verificar que vezesUsado incrementou. Se não incrementar (RLS), usar `base44.asServiceRole` para o update."

---

### 8.4 — Editar cobrança regenerando parcelas sem transação

**Problema:** M14 (edição) diz que editar cobrança sem parcelas pagas "regenera parcelas". Em Base44, isso significa: deletar parcelas existentes + criar novas. Sem transação, se o create falha após o delete, as parcelas antigas sumiram e as novas não existem.

**Impacto:** Cobrança fica sem parcelas. Dashboard quebra.

**Mitigação:** A edição de cobrança também deve ser uma backend function (não apenas `createCobranca`, mas `editarCobranca`). Esta function: cria novas parcelas primeiro, depois deleta as antigas, depois atualiza a cobrança. Se criar falha, as antigas continuam existindo.

**Ação no plano:** Adicionar M2b — Backend function `editarCobranca` no mesmo Sprint de M2. Ambas compartilham a lógica de cálculo de parcelas.

---

### 8.5 — `diasTrabalhados` como array no schema da entity

**Problema:** `Configuracao` tem `diasTrabalhados` que é um array de números `[1, 2, 3, 4, 5]`. Base44 JSON schema pode ou não suportar arrays de números como campo.

**Impacto:** Se não suporta, a configuração de dias trabalhados não persiste.

**Mitigação:** M1 testa explicitamente: criar Configuracao com `diasTrabalhados: [1,2,3,4,5]`, ler, verificar que o array volta correto. Se não funcionar, armazenar como string `"1,2,3,4,5"` e converter no frontend.

**Ação no plano:** Adicionar critério em M1: "Criar Configuracao com diasTrabalhados = [1,2,3,4,5], ler, verificar array persiste. Se não persistir como array, armazenar como string separada por vírgulas."

---

## 9. Cronograma Atualizado

### Problemas do cronograma original

- Sprint 1 paralela M1 + M3 + M5, mas M3 depende de M5 (circular)
- Sprint 2 tem apenas M2 (subutilizado)
- Sprint 4 tem M6 + M7 mas M7 poderia começar antes
- Sprint 6 tem M9 + M10 mas M11 + M12 + M13 poderiam começar antes
- Cadastro inteligente está no caminho crítico mas é opcional

### Novo cronograma

```
Sprint 1 (2 dias): M1 (entities) + M5 (types/config/event-bus)
                   Paralelos, sem dependências

Sprint 2 (3 dias): M3a (utils: math, date, format, validation)
                   + M7 (componentes base)
                   Paralelos. M3a depende de M5, M7 depende de M5+M3a(format apenas)

Sprint 3 (2 dias): M2 (backend createCobranca) + M2b (backend editarCobranca)
                   + M3b (domain: billing, parcel, status, overdue, charge)
                   Paralelos. M2 copia lógica de M3a. M3b depende de M3a+M5.

Sprint 4 (2 dias): M6a (hooks básicos: useClients, useProducts, useCharges, useConfig)
                   + M13 (Settings — trivial)
                   Paralelos. M6a depende de M1+M3a+M5. M13 depende de M6a.

Sprint 5 (3 dias): M6b (hooks complexos: useDashboard, useParcelActions)
                   + M8a (compostos core: ChargeCard, autocompletes, PaymentSelector, ParcelPreview)
                   + M11 (Clientes) + M12 (Produtos)
                   4 módulos paralelos. M6b depende de M3b+M6a. M8a depende de M7+M3. M11/M12 dependem de M6a+M7.

Sprint 6 (3 dias): M9 (Dashboard) + M10a (Nova Cobrança passos 1+2)
                   Paralelos. M9 depende de M6b+M8a. M10a depende de M8a+M6a.

Sprint 7 (2 dias): M10b (Nova Cobrança passos 3+4+sucesso)
                   Depende de M10a. Sequencial.

Sprint 8 (2 dias): M14 (integração, navegação, onboarding, edição)
                   Depende de M9, M10b, M11, M12, M13.

Sprint 9 (1 dia):  M15 (validação E2E)
                   Depende de M14.

Sprint 10 (1 dia): M10c (cadastro inteligente — pós-MVP)
                   Depende de M14. Pode ser feito depois do MVP funcionar.
```

### Comparação

| | Original | Atualizado |
|---|---|---|
| Sprints | 9 | 10 (mas Sprint 10 é opcional/pós-MVP) |
| Módulos | 15 | 21 (divisões + M2b + M10c) |
| Paralelismo máx. | 3 (Sprint 1) | 4 (Sprint 5) |
| Caminho crítico | M1→M2→M4→M6→M8→M10→M14→M15 | M1→M3a→M3b→M6b→M9→M14→M15 |
| Estimativa total | 15-20 dias | 18-22 dias (mas MVP funcional em ~16) |

### Caminho crítico atualizado

```
M1 → M3a → M3b → M6b → M9 → M14 → M15
     ↓        ↓
     M5 ────→ M6a → M8a → M10a → M10b → M14
```

O caminho crítico é: M1 (Sprint 1) → M3a (Sprint 2) → M3b (Sprint 3) → M6b (Sprint 5) → M9 (Sprint 6) → M14 (Sprint 8) → M15 (Sprint 9) = 9 sprints, ~16 dias úteis.

### Matriz de dependências atualizada

| Módulo | Depende de | Bloqueia | Sprint |
|---|---|---|---|
| M1 | — | M2, M2b, M6a | 1 |
| M5 | — | M3a, M7, M6a | 1 |
| M3a | M5 | M3b, M2, M7, M6a | 2 |
| M7 | M5, M3a | M8a, M11, M12, M13 | 2 |
| M2 | M1, M3a | M10a | 3 |
| M2b | M1, M3a | M14 | 3 |
| M3b | M3a, M5 | M6b, M8a, M10 | 3 |
| M6a | M1, M3a, M5 | M6b, M11, M12, M13, M10a | 4 |
| M13 | M6a, M7 | M14 | 4 |
| M6b | M6a, M3b | M9 | 5 |
| M8a | M7, M3, M5 | M9, M10a | 5 |
| M11 | M6a, M7 | M14 | 5 |
| M12 | M6a, M7 | M14 | 5 |
| M9 | M6b, M8a, M7 | M14 | 6 |
| M10a | M8a, M6a, M2 | M10b | 6 |
| M10b | M10a | M14 | 7 |
| M14 | M9, M10b, M11, M12, M13 | M15 | 8 |
| M15 | M14 | — | 9 |
| M10c | M14 | — | 10 (opcional) |

---

## 10. Resumo dos Riscos Críticos

| # | Risco | Severidade | Mitigação |
|---|---|---|---|
| R1 | Dependência circular M3↔M5 | Alta | Inverter: M5 primeiro, M3 depende de M5 |
| R2 | Duplicação de lógica entre M2 (backend) e M3 (frontend) | Alta | Duplicação consciente com testes compartilhados |
| R3 | M4 (services) desnecessário em Base44 | Média | Eliminar M4, hooks chamam SDK diretamente |
| R4 | Sem transações ACID em backend function | Alta | Batch create + compensação best-effort |
| R5 | Edição de cobrança sem transação pode perder parcelas | Alta | Adicionar M2b (editarCobranca backend function) |
| R6 | Enum validation pode não funcionar no schema | Média | Testar em M1, fallback em código |
| R7 | vezesUsado cross-entity update pode falhar com RLS | Média | Testar em M2, usar asServiceRole se necessário |
| R8 | diasTrabalhados como array pode não persistir | Baixa | Testar em M1, fallback para string |
| R9 | Dados de teste com datas absolutas | Média | Script seed com datas relativas |
| R10 | Cadastro inteligente no caminho crítico | Baixa | Mover para pós-MVP (M10c, Sprint 10) |

---

## 11. Mudanças Aplicadas ao Plano (Resumo)

| # | Mudança | Motivo |
|---|---|---|
| 1 | M5 antes de M3 (inverter dependência) | Eliminar dependência circular |
| 2 | M3 dividido em M3a (utils) e M3b (domain) | Módulo grande demais, desbloqueia paralelismo |
| 3 | M4 removido, hooks chamam SDK diretamente | Camada desnecessária em Base44 |
| 4 | M6 dividido em M6a (básicos) e M6b (complexos) | Desbloqueia M11/M12 antes do Dashboard |
| 5 | M8 dividido em M8a (core) e M8b (auxiliares) | OnboardingGuide e BatchBar não bloqueiam páginas |
| 6 | M10 dividido em M10a, M10b, M10c | Reduzir módulo de 20 critérios |
| 7 | M2b (editarCobranca backend function) adicionado | Evitar perda de parcelas em edição |
| 8 | M10c (cadastro inteligente) movido para pós-MVP | Não é crítico para o MVP funcionar |
| 9 | useBatchSelect movido de M6b para M9 | Só é usado no Dashboard |
| 10 | OnboardingGuide movido de M8b para M14 | Depende mais de integração que de componentes |
| 11 | M7 movido do Sprint 4 para o Sprint 2 | Depende apenas de M5+M3a, pode começar antes |
| 12 | M11+M12+M13 movidos do Sprint 7 para o Sprint 5 | Dependem de M6a+M7, não de M8a |
| 13 | Script seed-test-data.ts com datas relativas | Evitar retrabalho de dados de teste |
| 14 | M2 especifica base44.entities vs asServiceRole | Evitar ambiguidade de RLS |
| 15 | M9 define comportamento do clique em próximos vencimentos | Critério incompleto |
| 16 | M10 define tratamento de erro do backend | Critério incompleto |
| 17 | M14 detalha fluxo de edição tecnicamente | Critério incompleto |
