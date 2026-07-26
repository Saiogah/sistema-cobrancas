# PRD — Sistema de Gerenciamento de Cobranças

**Versão:** 1.0 — Definitiva
**Data:** 25 de julho de 2026
**Status:** Aprovado para desenvolvimento

---

## 1. Objetivo do Produto

Substituir o controle manual de cobranças realizado em documentos do Word por um sistema web simples, rápido e focado exclusivamente em responder a uma pergunta: **quem eu preciso cobrar hoje?**

O sistema não é um ERP financeiro, não emite boletos, não controla caixa, não gerencia assinaturas. É uma ferramenta de produtividade que economiza 30-45 minutos por dia da usuária e elimina cobranças esquecidas.

---

## 2. Perfil da Usuária

- **Quem é:** Mulher empreendedora que gerencia 30-50 clientes com cobranças recorrentes.
- **Conhecimento técnico:** Baixo. Usa Word, WhatsApp e celular. Não sabe o que é um banco de dados.
- **Rotina atual:** Mantém documentos do Word organizados por dia de vencimento (05, 10, 15, 20, 25, 30). Abre o documento no dia de cobrança, lê a lista, envia WhatsApp manualmente para cada cliente, marca quem pagou.
- **Dias trabalhados:** Segunda a sexta. Não cobra aos sábados e domingos.
- **Expectativa:** Abrir o sistema e ver imediatamente quem precisa cobrar. Marcar como pago. Fechar. Sem treinamento.
- **Métrica de sucesso:** Tempo de cobrança diária reduzido de 30-40 minutos para menos de 10 minutos.

---

## 3. Problema que Será Resolvido

| Problema atual (Word) | Impacto |
|---|---|
| Localizar quem cobrar no dia | 1 min/dia procurando seção |
| Saber quem já pagou/falta | 3-5 min/dia relendo lista |
| Esquecer cobranças atrasadas | Receita perdida |
| Digitar mensagem manualmente | 7-9 min/dia |
| Procurar telefone do cliente | 2-5 min/dia |
| Calcular parcelas manualmente | 10-15 min/dia |
| Resetar documento mensal | 20-40 min/mês |
| Cadastrar nova venda | 3-5 min por venda |
| Atualizar dados do cliente | 2-3 min por atualização |
| Consultar histórico | 3-5 min por consulta |
| **Total** | **~30-45 min/dia** |

---

## 4. Escopo do MVP

### O que está incluído

1. Cadastro e gestão de clientes
2. Cadastro e gestão de produtos/serviços
3. Registro de cobranças (vendas) com geração automática de parcelas
4. Dashboard diário de cobranças (hoje + atrasadas + próximos vencimentos)
5. Envio de cobrança via WhatsApp com mensagem automática
6. Marcação de pagamento (total e parcial)
7. Edição e exclusão de cobranças (com regras)
8. Arquivamento de cobranças irrecuperáveis
9. Histórico de cobranças por cliente
10. Configuração de dias trabalhados
11. Pesquisa instantânea de clientes
12. Onboarding no primeiro acesso

### O que está fora do MVP

| Funcionalidade | Justificativa |
|---|---|
| Emissão de boletos | Fora do escopo. Cobrança é por WhatsApp. |
| Controle de fluxo de caixa | Não é ERP. |
| Notas fiscais | Responsabilidade de outro sistema. |
| Conciliação bancária | Usuária marca pagamento manualmente. |
| Gráficos e dashboards analíticos | Não ajudam a cobrar mais rápido. |
| Multi-usuário / permissões | Usuária é única. |
| Notificações push / email | Ela já abre o sistema todo dia. |
| App mobile nativo | Web responsivo atende. |
| Importação de planilhas | 30-50 clientes — cadastro manual é mais rápido. |
| Recorrência automática / assinaturas | Cada venda é cadastrada manualmente. |
| Relatórios exportáveis | Histórico do cliente atende a maioria das dúvidas. |
| Categorização/tags de clientes | Agrupamento é por dia de vencimento. |
| CPF/CNPJ/endereço/email | Não usa esses dados para cobrar. |
| Multi-produto por cobrança | Cada cobrança tem um produto/serviço. |

---

## 5. Arquitetura Aprovada

### Princípios

- Arquitetura modular, separação clara de responsabilidades
- Sem polling, sem setInterval — comunicação baseada em eventos
- Preparada para integrações futuras sem refatoração estrutural

### Estrutura de Diretórios

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ChargeCard/          → Card de parcela no Dashboard
│   ├── DayBadge/            → Badge de dia de vencimento
│   ├── StatusBadge/         → Badge visual de status
│   ├── WhatsAppButton/      → Botão de cobrança WhatsApp
│   ├── CopyButton/         → Botão copiar para clipboard
│   ├── EmptyState/          → Estado vazio
│   ├── UndoToast/           → Toast com ação de desfazer
│   ├── BatchBar/            → Barra de ação em lote
│   ├── SearchInput/         → Input de busca com debounce
│   ├── ClientAutocomplete/  → Autocomplete de clientes
│   ├── ProductAutocomplete/ # Autocomplete de produtos
│   ├── PaymentSelector/     → Seletores de forma de pagamento
│   ├── DaySelector/         → 6 botões de dia fixo
│   ├── ParcelPreview/       # Pré-visualização de parcelas
│   └── OnboardingGuide/     # Guia de primeiro acesso
│
├── pages/               # Páginas
│   ├── Dashboard/          → Tela inicial: cobranças de hoje
│   ├── NewCharge/          → Fluxo de nova cobrança (4 passos)
│   ├── Clients/            → Lista e edição de clientes
│   ├── Products/           → Lista e edição de produtos
│   └── Settings/          → Configuração de dias trabalhados
│
├── services/            # Camada externa
│   ├── api.service.ts      → Wrapper das entities (Base44 SDK)
│   ├── whatsapp.service.ts  → Geração de links wa.me
│   ├── clipboard.service.ts → Cópia para clipboard
│   └── index.ts
│
├── domain/              # Regras de negócio (puro)
│   ├── charge.rules.ts     → Criação de cobrança + validações
│   ├── parcel.rules.ts     → Geração automática de parcelas
│   ├── status.rules.ts     → Máquina de status das parcelas
│   ├── overdue.rules.ts    → Cálculo de atrasados (dias trabalhados)
│   └── billing-cycle.ts    → Cálculo de vencimentos + fevereiro
│
├── hooks/               # Hooks (event-based)
│   ├── useDashboard.ts     → Parcelas de hoje + atrasadas
│   ├── useClients.ts       → Lista de clientes com cache
│   ├── useProducts.ts      → Lista de produtos ordenada por uso
│   ├── useCharges.ts       → Cobranças por cliente
│   ├── useParcelActions.ts # Ações: cobrar, marcar pago, arquivar
│   └── useBatchSelect.ts   # Seleção em lote
│
├── lib/                 # Utilidades
│   ├── date.utils.ts       → Datas, próximo vencimento, formato BR
│   ├── format.utils.ts     → Moeda, telefone
│   ├── validation.utils.ts → Validações
│   ├── event-bus.ts        # EventBus para comunicação desacoplada
│   └── math.utils.ts       # Divisão de parcelas com arredondamento
│
├── types/               # Tipagens
│   ├── client.types.ts
│   ├── product.types.ts
│   ├── charge.types.ts
│   ├── parcel.types.ts
│   └── common.types.ts     → Enums, configs
│
└── config/              # Configurações
    ├── days.config.ts      → Dias de vencimento [5, 10, 15, 20, 25, 30]
    ├── messages.config.ts  → Templates de mensagem WhatsApp
    └── app.config.ts       → Config gerais
```

### Performance

- **EventBus local**: hooks emitem eventos (`charge:updated`, `parcel:paid`, `client:created`). Outros hooks invalidam cache e re-renderizam apenas o necessário.
- **Cache com invalidação seletiva**: hooks mantêm cache em memória. Só refazem chamada à API quando um evento relevante ocorre.
- **Re-renders minimizados**: `React.memo` em cards, keys estáveis, componentes isolados.
- **Preparado para WebSocket/SSE**: o EventBus é a abstração de entrada. No futuro, plugar WebSocket que emite os mesmos eventos sem mudar componentes.

---

## 6. Modelagem Final de Dados

### Entidade 1 — `Cliente`

| Campo | Tipo | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `nome` | string | sim | — | Nome do cliente |
| `telefone` | string | sim | — | Telefone/WhatsApp (texto puro, sem formatação) |
| `observacoes` | string | não | "" | Anotações livres |
| `ativo` | boolean | não | true | Cliente ativo ou inativo |

**Decisões:**
- `telefone` é string porque tem formato (DDD, máscara). Guardar sem formatação, formatar na exibição.
- `ativo` é booleano. Cliente inativo não aparece no Dashboard mas mantém histórico.
- Não há campo de dia de vencimento no cliente — o vencimento é da cobrança, não do cliente. Permite que o mesmo cliente tenha cobranças em dias diferentes.
- Um telefone por cliente. Caso precise de segundo, anotar em observações. Não adicionar complexidade para caso raro.

### Entidade 2 — `ProdutoServico`

| Campo | Tipo | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `nome` | string | sim | — | Nome do produto ou serviço |
| `valorPadrao` | number | não | null | Valor sugerido ao selecionar este produto |
| `vezesUsado` | number | não | 0 | Contador de uso (para ordenação por frequência) |

**Decisões:**
- `valorPadrao` é opcional. Alguns serviços têm preço variável.
- `vezesUsado` é incrementado a cada cobrança criada com este produto. Usado para ordenar produtos por frequência (favoritos primeiro).
- Produto e serviço são a mesma entidade. A usuária não diferencia.

### Entidade 3 — `Cobranca`

| Campo | Tipo | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `clienteId` | reference → Cliente | sim | — | Quem comprou |
| `produtoServicoId` | reference → ProdutoServico | não | null | Produto/serviço (opcional) |
| `nomeProdutoServico` | string | sim | — | Nome desnormalizado (snapshot) |
| `valor` | number | sim | — | Valor total da venda |
| `formaPagamento` | enum | sim | — | Forma como foi vendido |
| `parcelado` | boolean | não | false | Se é parcelado |
| `quantidadeParcelas` | number | não | 1 | Número de parcelas |
| `primeiroVencimento` | date | sim | — | Data do primeiro vencimento |
| `diaVencimentoFixo` | enum | sim | — | Dia fixo para parcelas subsequentes |
| `pixUtilizado` | string | condicional | null | Qual PIX foi usado |
| `observacoes` | string | não | "" | Notas sobre a venda |

### Enum `formaPagamento`:
- `pix`
- `dinheiro`
- `cartao_credito`
- `cartao_debito`
- `transferencia`

**`boleto` foi removido.** O sistema não emite nem integra boletos. incluir a opção confunde a usuária e não tem função.

**Regra de `pixUtilizado`:** obrigatório quando `formaPagamento = pix`. Opcional nos demais casos. Se a forma é PIX e a chave não é preenchida, o cadastro não pode ser concluído. Isso garante que a mensagem de cobrança sempre tenha a chave quando necessária.

**Decisões:**
- `nomeProdutoServico` é desnormalizado (snapshot do nome no momento da venda). Se o produto for renomeado ou excluído, o histórico da cobrança não perde a informação original.
- `quantidadeParcelas = 1` para à vista. Toda cobrança gera pelo menos uma parcela. Não existe cobrança sem parcela.
- `primeiroVencimento` é data completa. A primeira parcela pode vencer numa data específica e as subsequentes no `diaVencimentoFixo`.

### Entidade 4 — `Parcela`

| Campo | Tipo | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `cobrancaId` | reference → Cobranca | sim | — | Cobrança pai |
| `clienteId` | reference → Cliente | sim | — | Cliente (denormalizado) |
| `numeroParcela` | number | sim | — | Sequencial (1, 2, 3...) |
| `valor` | number | sim | — | Valor desta parcela |
| `valorPago` | number | não | null | Quanto já foi pago |
| `dataVencimento` | date | sim | — | Vencimento |
| `status` | enum | sim | `pendente` | Situação atual |
| `dataPagamento` | date | não | null | Quando foi quitada |
| `dataCobrancaEnviada` | date | não | null | Última cobrança enviada |
| `arquivada` | boolean | não | false | Se foi arquivada |

### Enum `status`:
- `pendente` — ainda não chegou o vencimento, não foi cobrada
- `cobrado` — cobrança foi enviada ao cliente
- `pago` — cliente pagou totalmente (`valorPago >= valor`)
- `pago_parcial` — cliente pagou parte (`0 < valorPago < valor`)
- `arquivado` — usuária desistiu de cobrar (não aparece no Dashboard)

**`atrasado` não é um status persistido.** É um estado derivado calculado em tempo real ao carregar a tela, considerando os dias trabalhados da usuária (ver regras de negócio).

**Decisões:**
- `clienteId` denormalizado para queries rápidas (Dashboard lista parcelas sem join).
- `valorPago` permite pagamento parcial sem observações manuais.
- `valor` é o valor calculado no momento da geração. Não é recalculado dinamicamente.
- `arquivada` é um flag separado do status. Quando `true`, a parcela não aparece no Dashboard, mas aparece no histórico do cliente com o status que tinha quando foi arquivada.

---

## 7. Regras de Negócio Definitivas

### 7.1 Geração Automática de Parcelas

**Gatilho:** criação de cobrança confirmada.

**Regra para à vista (quantidadeParcelas = 1):**
```
Parcela 1:
  numeroParcela = 1
  valor = cobranca.valor
  dataVencimento = cobranca.primeiroVencimento
  status = pendente
```

**Regra para parcelado (quantidadeParcelas = N):**
```
valorBase = cobranca.valor / N

Para i de 1 a N:
  se i == 1:
    dataVencimento = cobranca.primeiroVencimento
  senão:
    dataVencimento = diaVencimentoFixo do mês correspondente
    (mês = mês de cobranca.primeiroVencimento + (i - 1) meses)

  valor = valorBase com arredondamento

  Parcela i:
    numeroParcela = i
    valor = valor (com ajuste na última)
    dataVencimento = dataVencimento
    status = pendente
```

**Arredondamento:** `valorBase` arredondado para baixo em 2 casas decimais. A última parcela recebe a diferença: `cobranca.valor - (soma das parcelas anteriores)`. Garante que a soma seja exatamente o valor total.

Exemplo: R$ 100 ÷ 3 → R$ 33,33 / R$ 33,33 / R$ 33,34.

**Tratamento de fevereiro e meses curtos:**

Se `diaVencimentoFixo` não existe no mês alvo:
- Dia 30 em fevereiro → último dia de fevereiro (28 ou 29)
- Dia 31 em qualquer mês com 30 dias → dia 30
- Dia 25 → sempre existe (todos os meses têm pelo menos 28 dias)

Regra geral: se o dia fixo não existe no mês, usar o **último dia do mês**. Isso mantém a cobrança no mês correto.

### 7.2 Máquina de Status das Parcelas

| De | Para | Gatilho | Campos atualizados |
|---|---|---|---|
| `pendente` | `cobrado` | Usuária clica em "Confirmar envio" | `dataCobrancaEnviada = hoje` |
| `cobrado` | `pago` | Usuária marca como pago (total) | `dataPagamento = hoje`, `valorPago = valor` |
| `cobrado` | `pago_parcial` | Usuária registra pagamento parcial | `valorPago = valor recebido` |
| `pago_parcial` | `pago` | Usuária complementa pagamento | `valorPago += valor`, se `>= valor` → `pago` |
| `pago` | `pendente` | Usuária desfaz (Undo ou manual) | `dataPagamento = null`, `valorPago = null` |
| qualquer | `arquivado` | Usuária arquiva | `arquivada = true` |
| `arquivado` | status anterior | Usuária desarquiva | `arquivada = false` |

**Decisão crítica — cobrança vs. confirmação de envio:**

O botão "Cobrar" abre o WhatsApp com a mensagem pronta. O status **não muda automaticamente**. Após clicar em "Cobrar", aparece um segundo botão no card: "✓ Confirmar envio". A usuária clica neste botão após enviar a mensagem no WhatsApp.

**Justificativa técnica:** o sistema não sabe se a mensagem foi realmente enviada. Marcar como cobrado automaticamente cria status falsos positivos. O clique extra é intencional e explícito — garante que o status reflita a realidade.

**Exceção:** se a usuária usar "Copiar mensagem" em vez de abrir o WhatsApp, o mesmo botão "Confirmar envio" aparece. O sistema não distingue o canal — apenas confirma que a usuária enviou a cobrança por algum meio.

### 7.3 Cálculo de Atrasados (Dias Trabalhados)

**Configuração:** a usuária define quais dias da semana trabalha. Default: segunda a sexta.

**Regra de atraso:**

Uma parcela está **atrasada** quando:
1. `status IN (pendente, cobrado, pago_parcial)`
2. `arquivada = false`
3. `dataVencimento < dataLimite`

Onde `dataLimite` = o dia de trabalho mais recente anterior a hoje.

- Se hoje é terça e a parcela venceu segunda → `dataLimite = segunda` → atrasada (1 dia)
- Se hoje é segunda e a parcela venceu sábado → `dataLimite = sexta-feira passada` → atrasada (3 dias, mas visualmente marcada como "atrasada desde sábado")
- Se hoje é segunda e a parcela vence hoje (segunda) → não atrasada, é "hoje"

**Dias de atraso exibidos:** `hoje - dataVencimento` em dias corridos. O card mostra "Atrasada há X dias".

**Gradiente visual de urgência:**
- 1-3 dias: amarelo-avermelhado (laranja)
- 4+ dias: vermelho

### 7.4 Exibição no Dashboard

**Query de parcelas de hoje:**
```
Parcelas onde:
  dataVencimento == hoje
  AND status IN (pendente, cobrado, pago_parcial)
  AND arquivada = false
  AND cliente.ativo = true
```

**Query de atrasadas:**
```
Parcelas onde:
  dataVencimento < dataLimite
  AND status IN (pendente, cobrado, pago_parcial)
  AND arquivada = false
  AND cliente.ativo = true
```

**Ordenação no Dashboard:**
1. Atrasadas (vermelhas primeiro, depois laranjas)
2. Cobradas hoje mas não pagas (amarelas)
3. Pendentes de hoje (neutras)

### 7.5 Edição e Exclusão de Cobranças

**Edição permitida quando:** nenhuma parcela foi paga (status != `pago` e `valorPago = null` em todas).

Ao editar, o sistema **regenera todas as parcelas** com os novos parâmetros.

**Edição limitada quando:** alguma parcela já foi paga ou tem pagamento parcial.

Neste caso, permitir editar apenas: `observacoes`, `pixUtilizado`, `nomeProdutoServico`. Não permitir mudar `valor`, `quantidadeParcelas`, `primeiroVencimento`, `diaVencimentoFixo`.

**Exclusão permitida quando:** nenhuma parcela foi paga. Exclusão deleta a cobrança e todas as parcelas geradas.

**Exclusão não permitida quando:** alguma parcela foi paga. Neste caso, oferecer apenas arquivamento.

**Justificativa técnica:** parcelas pagas são registros financeiros. Excluir uma cobrança com parcela paga apagaria o histórico de pagamento. A integridade do histórico é mais importante que a conveniência de excluir.

### 7.6 Arquivamento de Parcelas

**Gatilho:** usuária clica em "Arquivar" no card expandido.

**Efeito:** `arquivada = true`. A parcela some do Dashboard. Fica no histórico do cliente com o status que tinha quando foi arquivada e a label "Arquivada em DD/MM".

**Desarquivamento:** possível a partir do histórico do cliente. Volta ao Dashboard se continuar atrasada.

**Justificativa técnica:** substitui o "riscar do Word" sem perder o histórico. A usuária limpa o Dashboard de cobranças irrecuperáveis (cliente que não paga há meses) sem mentir (marcar como pago) nem deletar (perder registro).

### 7.7 Produtos Favoritos (Ordenação Inteligente)

**Ordenação:** produtos são ordenados por `vezesUsado` (descendente) na tela de Produtos e no autocomplete de Nova Cobrança.

**Atualização:** `vezesUsado` é incrementado a cada nova cobrança criada com aquele produto.

**Justificativa:** os 3-5 produtos mais usados aparecem no topo sem digitar. A usuária que sempre cobra "Manutenção Mensal" vê ele em primeiro. Economiza 20 segundos por cobrança.

### 7.8 Cadastro Inteligente (Pré-preenchimento)

Ao selecionar um cliente no fluxo de Nova Cobrança, o sistema busca as últimas 3 cobranças daquele cliente:

- Se 2+ cobranças usaram o mesmo produto → esse produto aparece marcado como "Sugerido" no autocomplete.
- Se 2+ cobranças usaram o mesmo PIX → esse PIX aparece pré-preenchido.
- Se 2+ cobranças usaram a mesma quantidade de parcelas → esse número é pré-selecionado se a usuária escolher "Parcelado".

A usuária pode alterar qualquer sugestão. Nada é obrigatório.

### 7.9 Sugestão de Primeiro Vencimento

Ao selecionar o `diaVencimentoFixo`, o sistema calcula o `primeiroVencimento` sugerido:

- Se o dia fixo já passou neste mês → sugere o dia fixo do **próximo mês**.
- Se o dia fixo ainda não chegou neste mês → sugere o dia fixo **deste mês**.

A usuária pode alterar a data. O default acerta na maioria dos casos.

---

## 8. Fluxos Finais

### 8.1 Fluxo de Cobrança Diária (Dashboard)

```
Usuária abre o sistema
  ↓
Dashboard carrega:
  - Topo: data de hoje, contadores (X cobranças, R$ total, Y atrasadas)
  - Lista: atrasadas primeiro (vermelho/laranja), depois as de hoje
  - Seção compacta: próximos 3 dias de vencimento
  ↓
Para cada parcela na lista:
  ↓
  [💬 Cobrar] → WhatsApp abre com mensagem pronta
                → Card mostra botão "✓ Confirmar envio"
                → Usuária confirma → status = cobrado, dataCobrancaEnviada = hoje
                → Card muda de cor (vermelho → amarelo cobrado)
  ↓
  [✓ Marcar pago] → Undo toast aparece: "Maria — R$ 200 pago. [Desfazer]"
                   → Card some com animação
                   → Contador atualiza
  ↓
  [✓ Marcar parcial] → Input inline: "Quanto recebeu?"
                      → Usuária digita valor
                      → status = pago_parcial
                      → Card mostra "R$ 100 de R$ 200"
  ↓
  [Selecionar múltiplos] → Toque no círculo à esquerda do card
                         → Barra no rodapé: "3 selecionadas · [Marcar todas como pagas]"
                         → 1 clique resolve lote
  ↓
  [Tocar no corpo do card] → Expande: observações, PIX, histórico de cobrança, arquivar
```

### 8.2 Fluxo de Nova Cobrança (4 passos)

```
[➕ Nova] na barra de navegação
  ↓
PASSO 1 — Cliente + Produto (mesma tela)
  - Autocomplete de cliente (com "Recentes" no topo)
  - Se cliente novo: "+ Cadastrar" → inline (nome + telefone)
  - Autocomplete de produto (com "Mais vendidos" no topo, valor ao lado)
  - Se produto novo: "+ Cadastrar" → inline (nome + valor)
  - Se venda sem produto: "Venda avulsa" → input "O que foi vendido?" (obrigatório, mínimo 3 chars)
  - Seleção de cliente com cadastro inteligente: pré-preenche produto/PIX/parcelas se houver padrão
  ↓
PASSO 2 — Valor + Pagamento (mesma tela)
  - Valor: se produto tem valorPadrao, já preenchido. Editável.
  - 5 botões grandes de forma de pagamento (PIX, Dinheiro, Cartão Crédito, Cartão Débito, Transferência)
  - Se PIX selecionado: campo "PIX utilizado" aparece inline (obrigatório, com autocomplete)
  - Toggle: À Vista / Parcelado
  - Se Parcelado: seletor de parcelas [2][3][4][5][6][7][8][9][10][12] + campo livre
  ↓
PASSO 3 — Vencimento
  - 6 botões grandes de dia fixo (05, 10, 15, 20, 25, 30)
  - Primeiro vencimento: data sugerida automaticamente, editável
  - Observações (opcional)
  - Pré-visualização das parcelas geradas (abaixo, só leitura)
  ↓
PASSO 4 — Salvar
  - Botão grande "✓ Confirmar cobrança" (não é tela de revisão — os dados estão visíveis no passo anterior)
  - Ao confirmar: cria cobrança + gera parcelas
  - Tela de sucesso: "✓ Cobrança registrada! X parcelas criadas."
  - Dois botões: [Nova cobrança] [Voltar para Hoje]
```

**Contagem de cliques (caminho otimista):**

| Passo | Ação | Cliques |
|---|---|---|
| 1 | Cliente (recente) + Produto (mais vendido) | 2 |
| 2 | Valor (preenchido) + PIX + À vista | 2 |
| 3 | Dia fixo + Confirmar data sugerida | 2 |
| 4 | Confirmar cobrança | 1 |
| **Total** | | **7** |

Para venda parcelada recorrente com cadastro inteligente: produto e PIX pré-preenchidos. Pode ser 5 cliques.

### 8.3 Fluxo de Edição de Cobrança

```
[👥 Clientes] → Toca no card do cliente → Histórico expande
  ↓
Toca na cobrança que quer editar → Cobrança expande mostrando parcelas
  ↓
Botão [Editar] (só aparece se nenhuma parcela foi paga)
  ↓
Abre o fluxo de Nova Cobrança com campos preenchidos
  ↓
Usuária altera o que precisa → [Salvar alterações]
  ↓
Sistema regenera parcelas → Mostra "✓ Cobrança atualizada! X parcelas regeneradas."
```

### 8.4 Fluxo de Exclusão de Cobrança

```
[👥 Clientes] → Toca no card → Histórico → Toca na cobrança
  ↓
Botão [Excluir] (só aparece se nenhuma parcela foi paga)
  ↓
Confirmação: "Excluir cobrança de Maria Silva? As X parcelas serão deletadas. [Confirmar] [Cancelar]"
  ↓
Deleta cobrança + parcelas → "✓ Cobrança excluída."
```

### 8.5 Fluxo de Arquivamento de Parcela

```
Dashboard → Toca no card da parcela atrasada → Expande
  ↓
Botão [Arquivar] no card expandido
  ↓
Confirmação: "Arquivar parcela de R$ 200 de Carlos Santos? Ela sairá da lista de cobranças. [Confirmar] [Cancelar]"
  ↓
arquivada = true → Card some do Dashboard → Fica no histórico com "Arquivada em DD/MM"
```

### 8.6 Fluxo de Onboarding (Primeiro Acesso)

```
Sistema detecta: 0 clientes AND 0 cobranças AND 0 produtos
  ↓
Dashboard mostra:
  "Bem-vinda! Vamos começar?

  1. Cadastre seus clientes → [👥 Cadastrar clientes]
  2. Cadastre seus serviços → [📦 Cadastrar serviços]
  3. Registre suas cobranças → [➕ Nova cobrança]

  Comece pelos clientes. Leva 2 minutos."

  ↓
Usuária clica em [Cadastrar clientes]
  ↓
Tela de Clientes com mini-form aberto por padrão
  ↓
Após cadastrar 1+ clientes, o botão 1 fica com check ✓
Após cadastrar 1+ produtos, o botão 2 fica com check ✓
Quando ambos têm ✓, o botão 3 fica destacado
  ↓
Onboarding desaparece quando a primeira cobrança é criada
```

### 8.7 Fluxo de Configuração de Dias Trabalhados

```
[Configuração] (ícone de engrenagem na barra de navegação ou menu)
  ↓
"Dias que você trabalha"
[✓ Seg] [✓ Ter] [✓ Qua] [✓ Qui] [✓ Sex] [☐ Sáb] [☐ Dom]
  ↓
[Salvar]
  ↓
Sistema recalcula atrasados com base nos dias configurados
```

Default: segunda a sexta. A usuária pode alterar a qualquer momento.

---

## 9. Wireframes Textuais das Telas

### Tela 1 — Dashboard

```
┌─────────────────────────────────────────┐
│                                         │
│   HOJE - 15 de Agosto                   │
│                                         │
│   5 cobranças   R$ 1.000,00   2 atrasadas│
│                                         │
├─────────────────────────────────────────┤
│                                         │
│   ┌─────────────────────────────────┐  │
│   │◯ Carlos Santos                  │  │
│   │ Manutenção Mensal · 1/1         │  │
│   │ R$ 200,00                       │  │
│   │ Atrasada há 10 dias              │  │
│   │                                 │  │
│   │  [💬 Cobrar]  [✓ Marcar pago]   │  │
│   └─────────────────────────────────┘  │
│                                         │
│   ┌─────────────────────────────────┐  │
│   │◯ Pedro Oliveira                │  │
│   │ Consultoria · 2/3              │  │
│   │ R$ 100 de R$ 200 (pago parcial)│  │
│   │ Atrasada há 3 dias               │  │
│   │                                 │  │
│   │  [💬 Cobrar]  [✓ Marcar pago]   │  │
│   └─────────────────────────────────┘  │
│                                         │
│   ┌─────────────────────────────────┐  │
│   │◯ Maria Silva                   │  │
│   │ Manutenção Mensal · 1/1         │  │
│   │ R$ 200,00                       │  │
│   │ Vence hoje                       │  │
│   │                                 │  │
│   │  [💬 Cobrar]  [✓ Marcar pago]   │  │
│   └─────────────────────────────────┘  │
│                                         │
│   ┌─────────────────────────────────┐  │
│   │◯ João Pereira                  │  │
│   │ Consultoria · 1/1              │  │
│   │ R$ 150,00                       │  │
│   │ Vence hoje · Cobrado            │  │
│   │                                 │  │
│   │  [💬 Reenviar] [✓ Marcar pago]  │  │
│   └─────────────────────────────────┘  │
│                                         │
│   PRÓXIMOS VENCIMENTOS                  │
│   Dia 20 · 2 cobranças · R$ 400,00     │
│   Dia 25 · 3 cobranças · R$ 600,00     │
│   Dia 30 · 4 cobranças · R$ 800,00     │
│                                         │
└─────────────────────────────────────────┘

  [🏠 Hoje]  [➕ Nova]  [👥 Clientes]  [📦 Serviços]  [⚙️]
```

**Elementos:**
- `◯` = círculo de seleção para ação em lote (toque para selecionar)
- Contador de atrasadas é clicável (toggle: mostrar só atrasadas / mostrar todas)
- "Próximos vencimentos" — cada linha clicável mostra overlay com a lista antecipada
- Card de cobrado hoje (João) é amarelo, não vermelho
- Card de atrasado há 10 dias é vermelho; atrasado há 3 dias é laranja

**Card expandido (ao tocar no corpo):**
```
┌─────────────────────────────────────────┐
│  Carlos Santos                          │
│  Manutenção Mensal · 1/1                │
│  R$ 200,00 · Atrasada há 10 dias        │
│                                          │
│  Forma: PIX (PIX João)   [📋 Copiar]    │
│  Cobrança enviada: 15/07                │
│  Observações: —                          │
│                                          │
│  [💬 Cobrar]  [✓ Marcar pago]           │
│  [Arquivar]                              │
└─────────────────────────────────────────┘
```

**Barra de lote (aparece ao selecionar 2+ cards):**
```
┌─────────────────────────────────────────┐
│  3 selecionadas · R$ 600,00             │
│  [✓ Marcar todas como pagas]  [Cancelar]│
└─────────────────────────────────────────┘
```

**Estado vazio (sem cobranças hoje nem atrasadas):**
```
┌─────────────────────────────────────────┐
│                                         │
│   HOJE - 16 de Agosto                   │
│                                         │
│   0 cobranças · R$ 0,00 · 0 atrasadas   │
│                                         │
│        Nada para cobrar hoje. ✓          │
│                                         │
│    Próximo vencimento: dia 20            │
│    2 cobranças no total                  │
│                                         │
└─────────────────────────────────────────┘
```

**Undo toast (após marcar como pago):**
```
┌─────────────────────────────────────────┐
│  ✓ Maria — R$ 200,00 marcado como pago. │
│                                [Desfazer]│
└─────────────────────────────────────────┘
```
Desaparece após 5 segundos.

### Tela 2 — Nova Cobrança

**Passo 1 — Cliente + Produto:**
```
┌─────────────────────────────────────────┐
│  Nova Cobrança                    [✕]   │
│  ● ● ○ ○                                │
│                                         │
│  Quem comprou?                           │
│  ┌─────────────────────────────────┐   │
│  │ 🔍 Digite o nome...             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  RECENTES                               │
│  ┌─────────────────────────────────┐   │
│  │ Maria Silva    📱 11 98765...   │   │
│  │ João Pereira   📱 11 91234...   │
│  │ Ana Costa      📱 11 99876...   │
│  └─────────────────────────────────┘   │
│  + Cadastrar novo cliente               │
│                                         │
│  O que foi vendido?                      │
│  ┌─────────────────────────────────┐   │
│  │ 🔍 Digite o nome...             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  MAIS VENDIDOS                           │
│  ┌─────────────────────────────────┐   │
│  │ ⭐ Manutenção Mensal   R$ 200  │   │
│  │ Consultoria          R$ 150     │   │
│  │ Hospedagem           R$ 80      │   │
│  └─────────────────────────────────┘   │
│  + Cadastrar novo serviço               │
│  Venda avulsa (digite o nome)           │
│                                         │
│                          [Continuar]     │
└─────────────────────────────────────────┘
```

**Passo 2 — Valor + Pagamento:**
```
┌─────────────────────────────────────────┐
│  Nova Cobrança                    [✕]   │
│  ✓ ● ● ○                                │
│                                         │
│  Valor                                   │
│  ┌─────────────────────────────────┐   │
│  │ R$ 200,00                       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Forma de pagamento                     │
│  ┌────────┐ ┌────────┐ ┌────────┐      │
│  │  PIX   │ │Cartão   │ │Dinheiro│      │
│  │ ✓      │ │Crédito  │ │        │      │
│  └────────┘ └────────┘ └────────┘      │
│  ┌────────┐ ┌────────┐                  │
│  │Cartão   │ │Transf.  │                  │
│  │Débito  │ │Bancária │                  │
│  └────────┘ └────────┘                  │
│                                         │
│  PIX utilizado                          │
│  ┌─────────────────────────────────┐   │
│  │ PIX João                        │   │
│  └─────────────────────────────────┘   │
│  (autocomplete dos PIX já usados)       │
│                                         │
│  É parcelado?                           │
│  ┌──────────┐  ┌──────────┐           │
│  │ À VISTA ✓│  │ PARCELADO │           │
│  └──────────┘  └──────────┘           │
│                                         │
│                          [Continuar]     │
└─────────────────────────────────────────┘
```

**Passo 2 (se Parcelado):**
```
│  Em quantas vezes?                       │
│  [2] [3] [4] [5] [6]                     │
│  [7] [8] [9] [10] [12]                   │
│  Ou digite: [ __ ]                       │
```

**Passo 3 — Vencimento + Pré-visualização:**
```
┌─────────────────────────────────────────┐
│  Nova Cobrança                    [✕]   │
│  ✓ ✓ ●                                   │
│                                         │
│  Dia fixo de vencimento                  │
│  [ 05 ] [ 10 ] [ 15 ✓]                   │
│  [ 20 ] [ 25 ] [ 30 ]                    │
│                                         │
│  Primeiro vencimento                     │
│  ┌─────────────────────────────────┐   │
│  │ 15/08/2026                      │   │
│  └─────────────────────────────────┘   │
│  (sugerido automaticamente)             │
│                                         │
│  Observações (opcional)                  │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  PARCELAS QUE SERÃO GERADAS             │
│  1. R$ 200,00 · 15/08/2026              │
│                                         │
│                          [Continuar]     │
└─────────────────────────────────────────┘
```

**Passo 4 — Salvar:**
```
┌─────────────────────────────────────────┐
│  Nova Cobrança                    [✕]   │
│  ✓ ✓ ✓                                   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ✓ Confirmar cobrança             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Cliente: Maria Silva                    │
│  Produto: Manutenção Mensal              │
│  Valor: R$ 200,00                        │
│  Pagamento: PIX · À vista                │
│  Vencimento: 15/08/2026                  │
│  1 parcela será gerada                   │
│                                         │
└─────────────────────────────────────────┘
```

**Tela de sucesso:**
```
┌─────────────────────────────────────────┐
│                                         │
│       ✓ Cobrança registrada!            │
│       1 parcela criada.                  │
│                                         │
│   [➕ Nova cobrança]                    │
│   [🏠 Voltar para Hoje]                  │
│                                         │
└─────────────────────────────────────────┘
```

### Tela 3 — Clientes

```
┌─────────────────────────────────────────┐
│  Clientes                        [＋ Novo]│
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🔍 Buscar...                    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Maria Silva            Ativo ✓  │   │
│  │ 📱 11 98765-4321                │   │
│  │ 3 cobranças ativas              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ João Pereira           Ativo ✓  │   │
│  │ 📱 11 91234-5678                │   │
│  │ 2 cobranças ativas              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Ana Costa             Inativo   │   │
│  │ 📱 11 99876-5432                │   │
│  │ Tocar para reativar             │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Card expandido com histórico (5 recentes):**
```
┌─────────────────────────────────────────┐
│  Maria Silva                     Ativo ✓│
│  📱 11 98765-4321     [Editar]          │
│  Observações: Cliente desde 2024        │
│                                          │
│  COBRANÇAS (5 recentes)                  │
│  ┌─────────────────────────────────┐   │
│  │ Manutenção Mensal  R$ 600,00    │   │
│  │ PIX · 3 parcelas                │   │
│  │ P1 · R$ 200 · 15/07 · Pago ✓   │   │
│  │ P2 · R$ 200 · 10/08 · Pendente │   │
│  │ P3 · R$ 200 · 10/09 · Pendente │   │
│  │                      [Editar]  │   │
│  ├─────────────────────────────────┤   │
│  │ Consultoria  R$ 300,00          │   │
│  │ Dinheiro · À vista               │   │
│  │ Pago: 15/06/2026 ✓              │   │
│  ├─────────────────────────────────┤   │
│  │ ...                             │   │
│  └─────────────────────────────────┘   │
│  [Ver todas as cobranças (12)]          │
└─────────────────────────────────────────┘
```

### Tela 4 — Produtos/Serviços

```
┌─────────────────────────────────────────┐
│  Produtos & Serviços            [＋ Novo]│
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ⭐ Manutenção Mensal   R$ 200  │   │
│  │ Usado 15 vezes                   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Consultoria           R$ 150     │   │
│  │ Usado 8 vezes                    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Hospedagem            R$ 80      │   │
│  │ Usado 5 vezes                    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Venda avulsa          Sem valor │   │
│  │ Usado 3 vezes                    │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Tela 5 — Configuração de Dias Trabalhados

```
┌─────────────────────────────────────────┐
│  Configurações                     [✕]  │
│                                         │
│  Dias que você trabalha                  │
│                                         │
│  [✓ Seg] [✓ Ter] [✓ Qua] [✓ Qui]        │
│  [✓ Sex] [☐ Sáb] [☐ Dom]                │
│                                         │
│  As cobranças que vencerem em dias       │
│  não trabalhados aparecerão no          │
│  próximo dia trabalhado.                │
│                                         │
│                          [Salvar]        │
└─────────────────────────────────────────┘
```

### Tela de Onboarding (Primeiro Acesso)

```
┌─────────────────────────────────────────┐
│                                         │
│   Bem-vinda! Vamos começar?              │
│                                         │
│   1. Cadastre seus clientes              │
│      [👥 Cadastrar clientes]             │
│                                         │
│   2. Cadastre seus serviços              │
│      [📦 Cadastrar serviços]             │
│                                         │
│   3. Registre suas cobranças             │
│      [➕ Nova cobrança]                  │
│                                         │
│   Comece pelos clientes. Leva 2 minutos. │
│                                         │
└─────────────────────────────────────────┘
```

---

## 10. Casos Especiais

### 10.1 Fevereiro e meses curtos

**Cenário:** `diaVencimentoFixo = 30`, parcela cai em fevereiro.

**Regra:** se o dia fixo não existe no mês alvo, usar o último dia do mês.

- Dia 30 em fevereiro (28 dias) → vencimento 28/02
- Dia 30 em fevereiro bissexto (29 dias) → vencimento 29/02
- Dia 31 em meses com 30 dias → vencimento 30

**Implementação:** função em `billing-cycle.ts` que verifica se o dia existe no mês antes de criar a data. Se não existir, usar `new Date(ano, mes + 1, 0)` que retorna o último dia do mês.

### 10.2 Pagamento parcial

**Cenário:** cliente paga R$ 100 de uma parcela de R$ 200.

**Regra:**
- `valorPago = 100`, `status = pago_parcial`
- Card no Dashboard mostra "R$ 100 de R$ 200 (pago parcial)"
- Card continua na lista de cobranças (ainda falta R$ 100)
- Mensagem de cobrança menciona o saldo: "Sua parcela de R$ 200 tem R$ 100 pendentes"

**Complemento:** cliente paga os R$ 100 restantes.
- `valorPago = 200` (100 + 100), `status = pago`, `dataPagamento = hoje`
- Card some do Dashboard

### 10.3 Cliente inativo

**Cenário:** usuária marca cliente como inativo.

**Regra:**
- Parcelas deste cliente não aparecem no Dashboard
- Parcelas continuam no histórico do cliente
- Se a usuária reativa o cliente, parcelas pendentes/atrasadas voltam ao Dashboard
- Não há exclusão de cliente — apenas inativação

### 10.4 Fim de semana

**Cenário:** parcela vence no sábado, usuária não trabalha sábados.

**Regra:**
- No sábado, a parcela aparece no Dashboard como "Vence hoje (sábado)" mas não é marcada como atrasada
- Na segunda-feira, a parcela aparece como "Venceu no sábado" com status amarelo (não vermelho de atraso)
- Só vira atrasada (laranja/vermelho) se não for resolvida até o final do próximo dia trabalhado

### 10.5 Feriados

**Cenário:** parcela vence em um feriado.

**Regra do MVP:** feriados não são considerados. A usuária trata feriados manualmente (não abre o sistema no feriado, e no dia seguinte as cobranças aparecem como atrasadas desde o feriado).

**Justificativa:** manter uma tabela de feriados adicionaria complexidade para benefício marginal. Feriados variam por cidade e ano. A usuária sabe quais são seus feriados.

### 10.6 Cliente com cobranças em dias diferentes

**Cenário:** Maria tem uma cobrança que vence dia 10 e outra que vence dia 25.

**Regra:** cada cobrança tem seu próprio `diaVencimentoFixo` e `primeiroVencimento`. O cliente não tem dia de vencimento. As parcelas das duas cobranças aparecem independentemente no Dashboard nos dias 10 e 25.

### 10.7 Undo de marcação de pago

**Cenário:** usuária marca parcela como paga por engano.

**Regra:**
- Após marcar como pago, aparece um toast: "Maria — R$ 200 pago. [Desfazer]"
- O toast fica visível por 5 segundos
- Ao clicar [Desfazer]: `status = pendente` (ou `cobrado` se já tinha sido cobrado), `dataPagamento = null`, `valorPago = null`
- O card volta à lista com animação reversa
- Após 5 segundos, o toast desaparece e o undo não está mais disponível (mas a usuária pode ir no histórico e desfazer manualmente)

### 10.8 Cobrança com produto excluído

**Cenário:** usuária cadastrou cobrança com produto "Consultoria", depois excluiu o produto.

**Regra:** a cobrança mantém `nomeProdutoServico = "Consultoria"` (snapshot desnormalizado). A cobrança não quebra. O produto aparece na mensagem e no histórico normalmente. A referência `produtoServicoId` fica inválida mas não é usada para exibição.

---

## 11. Critérios de Aceitação

### 11.1 Dashboard

| # | Critério | Como verificar |
|---|---|---|
| AC-01 | Ao abrir o sistema, o Dashboard mostra apenas parcelas que vencem hoje + atrasadas | Criar parcelas com vencimento hoje, amanhã e ontem. Apenas hoje + ontem aparecem |
| AC-02 | Atrasadas aparecem acima das de hoje | Verificar ordem visual |
| AC-03 | Atrasadas têm gradiente: 1-3 dias laranja, 4+ dias vermelho | Criar parcelas com diferentes datas de vencimento |
| AC-04 | Contadores (cobranças, valor, atrasadas) refletem a lista atual | Marcar como pago e verificar se contadores atualizam |
| AC-05 | Se nenhuma cobrança hoje nem atrasadas, mostra estado vazio com próximo vencimento | Limpar todas as parcelas |
| AC-06 | Próximos 3 dias de vencimento aparecem na seção inferior | Verificar seção "Próximos vencimentos" |
| AC-07 | Parcelas de clientes inativos não aparecem | Inativar um cliente com parcela vencendo hoje |
| AC-08 | Parcelas arquivadas não aparecem | Arquivar uma parcela |
| AC-09 | Pesquisa instantânea filtra por nome, produto ou telefone | Digitar na busca e verificar resultados |

### 11.2 Cobrança (ação do Dashboard)

| # | Critério | Como verificar |
|---|---|---|
| AC-10 | Botão "Cobrar" abre WhatsApp com mensagem formatada | Clicar e verificar mensagem |
| AC-11 | Status só muda para cobrado ao clicar "Confirmar envio" | Clicar Cobrar, verificar que status não mudou. Clicar Confirmar envio, verificar mudança |
| AC-12 | Após confirmar envio, card muda de cor | Verificar transição visual |
| AC-13 | Botão "Marcar pago" marca sem dialog de confirmação | Clicar e verificar que não há dialog |
| AC-14 | Toast de undo aparece após marcar pago | Verificar toast por 5 segundos |
| AC-15 | "Marcar parcial" permite digitar valor recebido | Selecionar parcial, digitar valor |
| AC-16 | Card de pago parcial mostra "R$ X de R$ Y" | Verificar exibição |
| AC-17 | Ação em lote: selecionar 2+ cards e marcar todos como pagos | Usar círculos de seleção |
| AC-18 | Arquivar remove do Dashboard mas mantém no histórico | Arquivar e verificar histórico |

### 11.3 Nova Cobrança

| # | Critério | Como verificar |
|---|---|---|
| AC-19 | Fluxo tem 4 passos, não 6 | Verificar barra de progresso |
| AC-20 | Cliente e produto estão na mesma tela (passo 1) | Verificar passo 1 |
| AC-21 | Valor e pagamento estão na mesma tela (passo 2) | Verificar passo 2 |
| AC-22 | PIX utilizado aparece inline quando forma é PIX | Selecionar PIX e verificar campo |
| AC-23 | PIX é obrigatório quando forma é PIX | Tentar avançar sem preencher |
| AC-24 | "Boleto" não aparece nas opções de pagamento | Verificar botões |
| AC-25 | "Venda avulsa" exige nome mínimo de 3 caracteres | Clicar em venda avulsa, digitar 2 caracteres |
| AC-26 | Primeiro vencimento é sugerido automaticamente | Selecionar dia fixo e verificar data sugerida |
| AC-27 | Pré-visualização das parcelas aparece no passo 3 | Verificar lista de parcelas |
| AC-28 | Não há tela de revisão separada | Passo 4 é o botão de salvar |
| AC-29 | Após salvar, tela de sucesso oferece "Nova cobrança" e "Voltar para Hoje" | Verificar botões |
| AC-30 | Cadastro inteligente pré-preenche produto/PIX/parcelas para cliente recorrente | Selecionar cliente com histórico |
| AC-31 | Produtos aparecem ordenados por frequência de uso | Verificar ordem no autocomplete |

### 11.4 Geração de Parcelas

| # | Critério | Como verificar |
|---|---|---|
| AC-32 | Venda à vista gera 1 parcela | Criar cobrança à vista |
| AC-33 | Venda parcelada gera N parcelas | Criar cobrança em 3x |
| AC-34 | Soma das parcelas é igual ao valor da cobrança | Verificar com R$ 100 em 3x |
| AC-35 | Última parcela recebe ajuste de arredondamento | R$ 100 em 3x → 33,33 + 33,33 + 33,34 |
| AC-36 | Dia 30 em fevereiro vira 28 (ou 29) | Criar parcela com dia 30 passando por fevereiro |
| AC-37 | Primeira parcela usa primeiroVencimento | Verificar data da parcela 1 |
| AC-38 | Parcelas subsequentes usam diaVencimentoFixo | Verificar datas das parcelas 2+ |

### 11.5 Clientes

| # | Critério | Como verificar |
|---|---|---|
| AC-39 | Busca filtra por nome ou telefone em tempo real | Digitar na busca |
| AC-40 | Toque no card expande para edição inline | Tocar no card |
| AC-41 | Histórico mostra 5 cobranças recentes | Cliente com 6+ cobranças |
| AC-42 | "Ver todas" mostra lista paginada | Clicar no botão |
| AC-43 | Cliente inativo some do Dashboard mas mantém histórico | Inativar e verificar |

### 11.6 Produtos

| # | Critério | Como verificar |
|---|---|---|
| AC-44 | Produtos ordenados por frequência de uso | Verificar ordem |
| AC-45 | Valor padrão é opcional | Criar produto sem valor |
| AC-46 | Toque no card permite edição inline | Tocar no card |

### 11.7 Edição/Exclusão de Cobranças

| # | Critério | Como verificar |
|---|---|---|
| AC-47 | Editar cobrança sem parcelas pagas regenera parcelas | Editar e verificar |
| AC-48 | Editar cobrança com parcela paga só permite editar observações/PIX | Tentar editar valor |
| AC-49 | Excluir cobrança sem parcelas pagas deleta tudo | Excluir e verificar |
| AC-50 | Excluir cobrança com parcela paga não é permitido | Tentar excluir |
| AC-51 | Botão Editar não aparece se há parcela paga | Verificar histórico |

### 11.8 Mensagens WhatsApp

| # | Critério | Como verificar |
|---|---|---|
| AC-52 | Mensagem de vencimento hoje usa "vence em" | Verificar mensagem |
| AC-53 | Mensagem de atrasada usa "venceu em" (passado) | Verificar mensagem |
| AC-54 | Mensagem inclui nome, produto, valor, data | Verificar campos |
| AC-55 | Mensagem inclui PIX apenas se forma é PIX e chave existe | Verificar com e sem PIX |
| AC-56 | Mensagem de pago parcial menciona saldo devedor | Verificar mensagem |
| AC-57 | Botão "Copiar mensagem" copia texto para clipboard | Clicar e colar |

### 11.9 Configuração e Onboarding

| # | Critério | Como verificar |
|---|---|---|
| AC-58 | Onboarding aparece quando não há dados | Acessar sistema zerado |
| AC-59 | Onboarding some após primeira cobrança | Criar cobrança e verificar |
| AC-60 | Configuração de dias trabalhados afeta cálculo de atrasados | Mudar config e verificar Dashboard |
| AC-61 | Default de dias trabalhados é seg-sex | Verificar config inicial |

---

## 12. Requisitos Não Funcionais

### 12.1 Performance

- Dashboard carrega em menos de 1 segundo com 50 parcelas
- Autocomplete responde em menos de 200ms após digitação (debounce de 150ms)
- Ações de marcar pago/cobrar são otimistas: UI atualiza imediatamente, API confirma em background
- Sem polling, sem setInterval. Atualizações por EventBus local
- Re-renders minimizados com React.memo e keys estáveis

### 12.2 Responsividade

- Funciona em mobile (320px+) e desktop (1280px+)
- Cards têm altura mínima de 80px no mobile (área de toque confortável)
- Botões têm altura mínima de 48px no mobile
- Barra de navegação fixa no rodapé no mobile, no topo no desktop

### 12.3 Acessibilidade

- Contraste mínimo WCAG AA em todos os elementos
- Navegação por teclado funcional (tab, enter, esc)
- Foco visível em elementos interativos
- Labels em todos os campos de formulário

### 12.4 Segurança

- Row-level security nas entities (escopo por usuário)
- Validação de input no frontend e backend
- Telefone e dados de cliente são privados (não expostos em URLs públicas)
- Links de WhatsApp usam wa.me (não expõem dados além do telefone e mensagem)

### 12.5 Confiabilidade

- Se API falha ao marcar como pago (ação otimista), o card volta à lista com toast de erro
- Se API falha ao criar cobrança, nenhuma parcela é criada (transação atômica)
- Dados em cache são invalidados ao detectar erro de API

---

## 13. Decisões de UX

### 13.1 Remoção do dialog de confirmação "Marcar pago"

**Decisão:** ao clicar "Marcar pago", a ação acontece imediatamente. Um toast com [Desfazer] aparece por 5 segundos.

**Justificativa:** em 30 dias de uso simulado, a confirmação gerou 60-80 cliques desnecessários. A ação é reversível. O padrão Undo ( Gmail, Google Docs) é mais rápido para o caso comum (99%) e ainda permite correção.

### 13.2 Confirmação de envio de cobrança (2 cliques)

**Decisão:** o botão "Cobrar" abre o WhatsApp. Um segundo botão "Confirmar envio" aparece no card. O status só muda ao clicar neste segundo botão.

**Justificativa:** o sistema não sabe se a mensagem foi enviada. Marcar automaticamente cria status falsos. O clique extra é intencional — garante que o status reflita a realidade. Prevenção de erro > velocidade neste caso.

### 13.3 Gradiente visual de atraso

**Decisão:** atrasadas 1-3 dias são laranjas. Atrasadas 4+ dias são vermelhas.

**Justificativa:** com todos os atrasados na mesma cor, a usuária não consegue priorizar. O gradiente comunica urgência sem números. Vermelho = agir agora. Laranja = ficar de olho.

### 13.4 Card muda de cor após confirmar envio

**Decisão:** após confirmar envio de cobrança atrasada, o card muda de vermelho/laranja para amarelo (cobrado). Só volta a ser vermelho/laranja se passar 48h sem pagamento.

**Justificativa:** na simulação de 30 dias, o card que não muda de cor após cobrar foi o atrito mais frequente e irritante. A usuária cobra e não sabe se funcionou. A mudança de cor confirma visualmente que a ação foi registrada.

### 13.5 Fluxo de 4 passos (não 6)

**Decisão:** 4 passos: (1) Cliente+Produto, (2) Valor+Pagamento, (3) Vencimento, (4) Salvar.

**Justificativa:** 6 passos com transições de tela para campos que já estão preenchidos (valor com produto) geram cliques inúteis ("Continuar"). A tela de revisão é redundante — a usuária já viu cada campo. 4 passos reduzem cliques em 43% no caminho otimista sem perda de informação.

### 13.6 "Salvar e cadastrar outra" na tela de sucesso

**Decisão:** a tela de sucesso da cobrança tem dois botões: [Nova cobrança] e [Voltar para Hoje]. Sem auto-retorno.

**Justificativa:** na simulação, a usuária frequentemente cadastra 2-3 vendas seguidas. O auto-retorno ao Dashboard força navegação extra. Dar a escolha elimina a fricção sem forçar comportamento.

### 13.7 Onboarding no primeiro acesso

**Decisão:** quando o sistema está vazio (0 clientes, 0 produtos, 0 cobranças), o Dashboard mostra 3 botões grandes guiando o cadastro.

**Justificativa:** sem isso, a usuária abre um sistema vazio e não sabe por onde começar. Tentar criar cobrança sem clientes gera frustração. O guia é não-bloqueante (a usuária pode ignorar) mas dá um caminho claro.

### 13.8 Configuração de dias trabalhados

**Decisão:** a usuária configura quais dias da semana trabalha. O cálculo de atrasados respeita essa configuração.

**Justificativa:** na simulação, falsos atrasados de fim de semana descredibilizaram o sistema em 2 semanas. Sem essa configuração, o sistema falha para qualquer pessoa que não trabalha fins de semana. É o problema #1 de adoção.

### 13.9 "Venda avulsa" exige nome

**Decisão:** se a usuária não seleciona um produto, deve digitar um nome curto para a venda (mínimo 3 caracteres).

**Justificativa:** sem nome, a mensagem de WhatsApp fica com frase quebrada ("referente a vence hoje"). O nome garante que 100% das mensagens saiam corretas. O custo é 5 segundos de digitação para vendas sem produto cadastrado.

### 13.10 PIX obrigatório quando forma é PIX

**Decisão:** se a forma de pagamento é PIX, o campo `pixUtilizado` é obrigatório.

**Justificativa:** sem a chave, a mensagem fica com "Chave:" vazio. O cliente pergunta qual é a chave e gera troca de mensagens desnecessária. Tornar obrigatório previne a mensagem quebrada.

### 13.11 Forma de pagamento na mensagem apenas quando acionável

**Decisão:** a mensagem de WhatsApp inclui "Forma de pagamento: PIX / Chave: X" apenas quando a forma é PIX. Para as demais formas (dinheiro, cartão, transferência), a mensagem não menciona forma de pagamento.

**Justificativa:** a forma de pagamento na mensagem só tem valor prático quando inclui informação acionável (a chave PIX). Para as demais, a informação é redundante — o cliente já sabe como vai pagar. Mensagens mais curtas são mais eficazes.

### 13.12 Histórico limitado a 5 recentes + ver mais

**Decisão:** o card expandido do cliente mostra as 5 cobranças mais recentes. Um botão "Ver todas (X)" abre a lista completa paginada.

**Justificativa:** para clientes ativos há 2 anos com cobranças mensais, a lista inline teria 24+ cobranças. Isso inunda a tela e dificulta encontrar uma cobrança específica. 5 recentes cobrem 90% das consultas. O resto fica a 1 clique.

---

## 14. Roadmap Futuro

### Pós-MVP — Em ordem de prioridade

| # | Funcionalidade | Quando | Justificativa |
|---|---|---|---|
| 1 | Feriados nacionais/estaduais | Após 3 meses de uso | Reduz falsos atrasados em feriados. Requer tabela de feriados. |
| 2 | Exportação de histórico em PDF | Após 3 meses | Para enviar comprovação de pagamento ao cliente. |
| 3 | Segundo telefone por cliente | Após 6 meses | Para clientes com WhatsApp e fixo. |
| 4 | Notificação no dia de vencimento | Após 6 meses | Push ou email se a usuária não abrir o sistema. |
| 5 | Relatório mensal simples | Após 6 meses | Total cobrado, total recebido, total em aberto. Sem gráficos. |
| 6 | Importação de clientes via planilha | Quando ultrapassar 100 clientes | Para migração de bases maiores. |
| 7 | Multi-usuário | Quando houver 2+ pessoas cobrando | Com permissões e RLS por usuário. |
| 8 | Integração com gateway de boletos | Se a usuária começar a emitir boletos | Criar `boleto.service.ts`, plugar em `charge.rules.ts`. |
| 9 | WebSocket para atualização em tempo real | Quando houver multi-usuário | Plugar no EventBus existente. Sem mudança de componentes. |
| 10 | App mobile nativo | Se a usuária solicitar | PWA atende até então. |

**Princípio do roadmap:** cada item só entra quando responder "sim" a: "Isso faz a usuária cobrar mais rápido ou com menos erros?"

---

## 15. Templates de Mensagem WhatsApp

### Vencimento hoje (não atrasada)

```
Olá [Nome]!

Sua parcela de R$ [Valor] referente a [Produto] vence hoje ([Data]).

[Se PIX:]
Forma de pagamento: PIX
Chave: [PIX]

Obrigada!
```

### Atrasada

```
Olá [Nome]!

Sua parcela de R$ [Valor] referente a [Produto] venceu no dia [Data] e ainda não foi recebida.

[Se PIX:]
Forma de pagamento: PIX
Chave: [PIX]

Pode verificar o pagamento?

Obrigada!
```

### Pago parcial

```
Olá [Nome]!

Sua parcela de R$ [ValorTotal] referente a [Produto] tem R$ [SaldoDevedor] pendentes.

[Se PIX:]
Forma de pagamento: PIX
Chave: [PIX]

Pode verificar o pagamento?

Obrigada!
```

**Regras de template:**
- `[Data]` usa formato DD/MM (ex: "05/07")
- `[Produto]` usa o `nomeProdutoServico` desnormalizado da cobrança
- Se a forma não é PIX, as linhas "Forma de pagamento" e "Chave" são omitidas
- `[SaldoDevedor]` = `valor - valorPago` (formatado em moeda)

---

## 16. Resumo de Economia de Tempo (Pós-Implementação)

| Funcionalidade | Economia/dia |
|---|---|
| Dashboard abre com quem cobrar hoje | 2-3 min |
| Próximos vencimentos visíveis | 1-2 min |
| Atrasadas separadas e priorizadas | 5-10 min |
| Pesquisa instantânea | 5 min |
| Produtos favoritos primeiro | 3-5 min |
| Cadastro inteligente | 5-10 min |
| Geração automática de parcelas | 5-10 min |
| Mensagem pronta (WhatsApp + copiar) | 10-20 min |
| Histórico do cliente em 1 toque | 3-5 min |
| Sem dialog de confirmação (Undo) | 2-3 min |
| Ação em lote | 1-2 min |
| Fluxo de 4 passos | 1-2 min |
| **Total estimado** | **~45-75 min/dia** |

---

## Fim do Documento

Este PRD é a única fonte de verdade para o desenvolvimento. Qualquer mudança de escopo durante o desenvolvimento deve atualizar este documento com nova versão e data.
