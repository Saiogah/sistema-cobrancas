# Respostas do Chat — Sistema de Gerenciamento de Cobranças

---

## 1. Arquitetura do Projeto

### Visão Geral do Sistema

Um sistema de cobrança focado em **velocidade e simplicidade**. A usuária abre o sistema e imediatamente vê quem precisa ser cobrado hoje, organizado por dia de vencimento (05, 10, 15, 20, 25, 30). Sem dashboards, sem complexidade.

### Modelo de Dados (Entities)

#### `Cliente`
| Campo | Tipo | Descrição |
|---|---|---|
| nome | string | Nome do cliente |
| telefone | string | WhatsApp/telefone para cobrança |
| diaVencimento | number (enum: 5, 10, 15, 20, 25, 30) | Dia fixo de vencimento |
| valorMensal | number | Valor cobrado mensalmente |
| status | enum: `ativo`, `inativo`, `pausado` | Status do cliente |
| observacoes | string | Notas livres |
| diaCobrancaPersonalizado | number (opcional) | Se precisar de um dia fora do padrão |

#### `RegistroCobranca`
| Campo | Tipo | Descrição |
|---|---|---|
| clienteId | reference → Cliente | Qual cliente |
| mesReferencia | string (ex: "2026-07") | Mês/ano da cobrança |
| status | enum: `pago`, `pendente`, `ignorado` | Situação da cobrança |
| dataPagamento | date (opcional) | Quando foi pago |
| valor | number | Valor efetivo (padrão: valorMensal do cliente) |
| observacoes | string | Notas da cobrança |

A entidade `RegistroCobranca` permite rastreabilidade histórica sem virar um sistema financeiro complexo. Cada mês gera automaticamente os registros pendentes para os clientes ativos.

### Páginas (telas)

**3 telas no total.** Simples e diretas.

#### Tela 1 — `Cobranças de Hoje` (página inicial)
- Abre direto nela ao logar
- Mostra apenas os clientes cujo vencimento cai **hoje** (ou no dia mais próximo se hoje não for um dia de vencimento)
- Cada cliente é um card grande clicável com: nome, valor, e botão "Marcar como pago"
- Botão de WhatsApp direto no card (abre conversa com mensagem pré-preenchida)
- Contador no topo: "X cobranças pendentes hoje"
- Se hoje não tem vencimento: mostra "Nenhuma cobrança para hoje. Próximo vencimento: dia XX" com os clientes daquele dia

#### Tela 2 — `Clientes por Dia`
- 6 colunas/cards grandes, uma por dia (05, 10, 15, 20, 25, 30)
- Clica num dia → expande a lista de clientes daquele dia
- Cada linha: nome, valor, status (pago/pendente do mês atual)
- Filtro rápido: mostrar só pendentes / mostrar todos
- Botão flutuante "+" para adicionar cliente

#### Tela 3 — `Cadastro de Cliente`
- Formulário simples: nome, telefone, dia de vencimento (6 botões grandes, não dropdown), valor, observações
- Pré-preenchimento inteligente: se veio da tela "Dia 10", o dia já vem marcado
- Validação mínima: só nome e telefone são obrigatórios

### Estrutura Modular

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ClientCard/          → Card do cliente (usado em várias telas)
│   ├── DayColumn/           → Coluna de um dia de vencimento
│   ├── ChargeStatusBadge/   → Badge visual de status (pago/pendente)
│   ├── WhatsAppButton/     → Botão de WhatsApp com msg pré-preenchida
│   ├── EmptyState/          → Estado vazio amigável
│   └── ConfirmDialog/       → Dialog de confirmação
│
├── pages/               # Páginas da aplicação
│   ├── TodayCharges/        → Tela 1: cobranças de hoje
│   ├── ClientsByDay/       → Tela 2: clientes agrupados por dia
│   └── ClientForm/         → Tela 3: cadastro/edição de cliente
│
├── services/            # Camada de comunicação externa
│   ├── api.service.ts      → Wrapper das chamadas de entity (Base44 SDK)
│   ├── whatsapp.service.ts → Geração de links wa.me com mensagem
│   └── index.ts            → Barrel export
│
├── domain/              # Regras de negócio (puro, sem framework)
│   ├── charge.rules.ts    → Lógica de "quem cobrar hoje", geração de registros mensais
│   ├── client.rules.ts    → Validações de cliente, regras de status
│   └── billing-cycle.ts   → Cálculo de ciclo de cobrança, próximo vencimento
│
├── hooks/               # Hooks customizados (event-based, sem polling)
│   ├── useClients.ts       → Lista de clientes com cache + invalidação por evento
│   ├── useTodayCharges.ts  → Cobranças do dia, recalcula por evento de mudança
│   ├── useChargeRecords.ts → Registros de cobrança por mês
│   └── useChargeActions.ts # Ações: marcar pago, ignorar, reabrir
│
├── lib/                 # Utilidades e infra
│   ├── date.utils.ts       → Manipulação de datas (próximo vencimento, formato BR)
│   ├── format.utils.ts    → Formatação de moeda, telefone
│   ├── validation.utils.ts → Validações de formulário
│   └── event-bus.ts        # EventBus simples para comunicação desacoplada
│
├── types/               # Tipagens TypeScript
│   ├── client.types.ts     → Interface Cliente, DTOs
│   ├── charge.types.ts    # Interface RegistroCobranca, DTOs
│   └── common.types.ts    # Tipos compartilhados (status, enums)
│
└── config/              # Configurações
    ├── days.config.ts      → Dias de vencimento [5, 10, 15, 20, 25, 30]
    ├── messages.config.ts  → Templates de mensagem de WhatsApp
    └── app.config.ts       # Config gerais
```

### Arquitetura de Performance (Event-Based)

**Sem polling, sem setInterval.** Toda atualização de dados é orientada a eventos:

- **EventBus local** — Um mini event emitter no `lib/event-bus.ts`. Quando uma ação acontece (ex: marcar como pago), o hook emite um evento `charge:updated`. Todos os hooks ouvindo esse evento invalidam seu cache e re-renderizam apenas o necessário.

- **Cache com invalidação seletiva** — Os hooks mantêm cache em memória e só refazem a chamada à API quando um evento relevante ocorre. Sem refetch automático por timer.

- **Re-renders minimizados** — Componentes separados por responsabilidade. O `ClientCard` não re-renderiza quando outro card muda. Uso de `React.memo` e keys estáveis.

- **Preparado para WebSocket/SSE** — O EventBus é a abstração de entrada. Hoje os eventos são locais (ações do usuário). No futuro, basta plugar um WebSocket que emite os mesmos eventos e a UI atualiza automaticamente, sem mudar nenhum componente.

### Fluxo Principal de Uso

1. A usuária abre o sistema → cai direto em **Cobranças de Hoje**
2. Vê os clientes que vencem hoje (ou no próximo dia de vencimento)
3. Clica no botão de WhatsApp → abre conversa com mensagem pronta ("Olá [nome], seu boleto de R$ [valor] vence hoje. Pode confirmar o pagamento?")
4. Volta pro sistema, clica "Marcar como pago" → card some da lista de pendentes, contador atualiza
5. Repete para o próximo cliente

**Total de cliques por cliente: 2** (WhatsApp + Marcar pago). Esse é o objetivo.

### Preparação para Integrações Futuras

A separação em `services/` e `domain/` garante que:

- Adicionar integração com API de boletos → criar `boleto.service.ts`, chamar de `charge.rules.ts`. Nenhuma tela muda.
- Adicionar notificação automática → criar `notification.service.ts`, plugar no EventBus.
- Adicionar importação de clientes via planilha → criar `import.service.ts`, chamar de `client.rules.ts`.
- Adicionar multi-usuário → camada de `auth.service.ts`, ajustar RLS nas entities.

### Decisões de Interface

- **Dias de vencimento como 6 botões grandes**, não dropdown — um clique seleciona o dia
- **Cards de cliente com altura mínima de 64px** — área de toque confortável
- **Cores semânticas apenas**: verde = pago, amarelo = pendente, cinza = inativo. Sem paletas complexas.
- **Zero abas, zero modais aninhados** — uma ação por vez, sempre visível
- **Feedback imediato** — ao marcar pago, o card anima e some, sem tela de "carregando"
- **Responsivo** — funciona no celular (a usuária pode cobrar pelo WhatsApp direto do celular)

---

## 2. Modelagem de Dados

### Visão Geral dos Relacionamentos

```
Cliente ──< Cobrança ──< Parcela
              ↑
 Produto/Serviço ──┘ (referência opcional)
```

- **Cliente** tem várias **Cobranças** (1:N)
- **Cobrança** tem várias **Parcelas** (1:N) — geradas automaticamente
- **Produto/Serviço** é referenciado por **Cobranças** (1:N), mas é opcional — a usuária pode vender algo avulso sem cadastrar produto

### Entidade 1 — `Cliente`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `nome` | string | sim | Nome do cliente |
| `telefone` | string | sim | Telefone/WhatsApp para cobrança |
| `observacoes` | string | não | Anotações livres da usuária |
| `ativo` | boolean | não (default: true) | Se o cliente está ativo ou inativo |

**Decisões:**

- O campo `ativo` é um booleano simples, não um enum. O cliente pode ser inativado sem ser deletado, preservando o histórico de cobranças e parcelas ligadas a ele.
- `telefone` é string (não number) porque telefone tem formato, pode ter DDD, pode ter WhatsApp com máscara. Guardar como texto puro, formatar só na exibição.
- Não há campo de "dia de vencimento" no cliente — o vencimento passou a ser da **cobrança**, não do cliente. Isso permite que o mesmo cliente tenha cobranças com dias diferentes (ex: comprou um serviço que vence dia 10, outro que vence dia 25).

### Entidade 2 — `ProdutoServico`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `nome` | string | sim | Nome do produto ou serviço |
| `valorPadrao` | number | não | Valor sugerido ao selecionar este produto |

**Decisões:**

- `valorPadrao` é opcional porque alguns serviços podem ter preço variável (a usuária define na hora da venda).
- Quando a usuária seleciona um produto ao criar a cobrança, o campo `valor` da cobrança é **pré-preenchido** com `valorPadrao`, mas pode ser alterado. Economiza digitação sem travar o valor.
- O nome é "Produto ou Serviço" como uma entidade única — a usuária não precisa diferenciar. O nome dela já diz o que é ("Manutenção Mensal", "Consultoria", etc.).

### Entidade 3 — `Cobranca`

Cada cobrança representa **uma venda realizada** para um cliente.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `clienteId` | reference → Cliente | sim | Quem comprou |
| `produtoServicoId` | reference → ProdutoServico | não | O que foi vendido (opcional — pode ser venda avulsa) |
| `nomeProdutoServico` | string | sim | Nome do produto/serviço **desnormalizado** |
| `valor` | number | sim | Valor total da venda |
| `formaPagamento` | enum | sim | Como foi vendido |
| `parcelado` | boolean | sim (default: false) | Se é parcelado |
| `quantidadeParcelas` | number | sim (default: 1) | Número de parcelas (1 se à vista) |
| `primeiroVencimento` | date | sim | Data do primeiro vencimento |
| `diaVencimentoFixo` | number (enum: 5, 10, 15, 20, 25, 30) | sim | Dia fixo para vencimentos subsequentes |
| `pixUtilizado` | string | não | Qual PIX foi usado (chave, nome, etc.) |
| `observacoes` | string | não | Notas sobre esta venda |

### Enum `formaPagamento`:
- `pix`
- `dinheiro`
- `cartao_credito`
- `cartao_debito`
- `transferencia`
- `boleto`

**Decisões:**

- **`nomeProdutoServico` desnormalizado**: mesmo que a referência `produtoServicoId` exista, guardamos o nome do produto como string na cobrança. Motivo: se o produto for renomeado ou excluído no futuro, o histórico da cobrança não perde a informação original. A cobrança é um registro factual de venda — precisa ser imutável em relação ao que foi vendido.

- **`primeiroVencimento` é uma data completa**, não apenas um mês. A primeira parcela pode vencer numa data específica (ex: 15 de julho) e as subsequentes caem no `diaVencimentoFixo` (ex: sempre dia 10). Isso cobre o caso onde alguém compra no dia 15 mas combina de pagar dia 10 a partir do mês seguinte.

- **`quantidadeParcelas` = 1 para à vista**: uma venda à vista gera **uma parcela** com vencimento = `primeiroVencimento`. Isso simplifica a regra de negócio — toda cobrança gera pelo menos uma parcela, não existe cobrança sem parcela.

- **`pixUtilizado` como string livre**: a usuária pode anotar "PIX João", "PIX da empresa", a chave PIX, ou deixar vazio. Não é um enum porque cada pessoa organiza isso do seu jeito.

### Entidade 4 — `Parcela`

As parcelas **nunca** são cadastradas manualmente. São geradas automaticamente quando a cobrança é criada.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `cobrancaId` | reference → Cobranca | sim | Cobrança a que pertence |
| `clienteId` | reference → Cliente | sim | Cliente (denormalizado para queries rápidas) |
| `numeroParcela` | number | sim | Número sequencial (1, 2, 3...) |
| `valor` | number | sim | Valor desta parcela |
| `dataVencimento` | date | sim | Data de vencimento |
| `status` | enum | sim (default: `pendente`) | Situação atual |
| `dataPagamento` | date | não | Quando foi paga |
| `dataCobrancaEnviada` | date | não | Quando a cobrança foi enviada ao cliente |

### Enum `status`:
- `pendente` — ainda não chegou o vencimento, não foi cobrada
- `cobrado` — a cobrança foi enviada ao cliente
- `pago` — cliente pagou
- `atrasado` — passou do vencimento sem pagamento

**Decisões:**

- **`clienteId` denormalizado em Parcela**: para a tela "Cobranças de Hoje" listar as parcelas do dia, não precisamos fazer um join com Cobrança → Cliente. A query é direta: `Parcela.where(dataVencimento == hoje && clienteId == X)`. Isso é performance.

- **`numeroParcela`**: número sequencial dentro da cobrança. Útil para exibir "Parcela 2/6" e para ordenação.

- **`valor` por parcela**: calculado como `cobranca.valor / cobranca.quantidadeParcelas`. Guardamos o valor calculado, não recalculamos dinamicamente, porque o valor da cobrança pode ser editado e as parcelas já geradas não devem mudar retroativamente.

### Lógica de Geração Automática de Parcelas

Quando uma cobrança é criada, o sistema executa:

#### Cenário 1 — Venda à vista (`parcelado = false` ou `quantidadeParcelas = 1`)

Gera **1 parcela**:
```
numeroParcela: 1
valor: cobranca.valor (valor total)
dataVencimento: cobranca.primeiroVencimento
status: pendente
```

#### Cenário 2 — Venda parcelada (`parcelado = true`, `quantidadeParcelas = N`)

Gera **N parcelas**:

```
valorPorParcela = cobranca.valor / cobranca.quantidadeParcelas
```

Para cada parcela `i` (de 1 a N):

```
numeroParcela: i
valor: valorPorParcela
status: pendente
```

**Cálculo do vencimento:**

- **Parcela 1**: `cobranca.primeiroVencimento` (data exata)
- **Parcelas 2 a N**: `diaVencimentoFixo` no mês correspondente

Exemplo prático:
```
cobranca.valor = R$ 600
quantidadeParcelas = 3
primeiroVencimento = 2026-07-15
diaVencimentoFixo = 10
```

Gera:
| # | Valor | Vencimento |
|---|---|---|
| 1 | R$ 200 | 15/07/2026 (primeiroVencimento) |
| 2 | R$ 200 | 10/08/2026 (dia 10 do mês seguinte) |
| 3 | R$ 200 | 10/09/2026 (dia 10 do mês seguinte) |

**Tratamento de arredondamento**: se o valor não divide igualmente (ex: R$ 100 ÷ 3), as duas primeiras parcelas recebem o valor arredondado para baixo e a **última parcela** recebe o restante (ajuste de centavos). Isso garante que a soma das parcelas seja sempre igual ao valor total da cobrança.

Exemplo: R$ 100 ÷ 3 → R$ 33,33 / R$ 33,33 / R$ 33,34

### Máquina de Status das Parcelas

```
                    ┌──────────────────────────┐
                    │                          │
                    ▼                          │
  PENDENTE ──envia cobrança──► COBRADO ──paga──► PAGO
     │                           │
     │ venceu sem pago            │ venceu sem pago
     ▼                           ▼
  ATRASADO ──envia cobrança──► COBRADO
```

### Transições:

| De | Para | Gatilho |
|---|---|---|
| `pendente` → `cobrado` | Usuária envia cobrança (clica no WhatsApp) | Registra `dataCobrancaEnviada` |
| `pendente` → `atrasado` | `dataVencimento < hoje` e `status = pendente` | Automático ao carregar a tela |
| `cobrado` → `pago` | Usuária marca como pago | Registra `dataPagamento` |
| `cobrado` → `atrasado` | `dataVencimento < hoje` e `status = cobrado` | Automático ao carregar a tela |
| `atrasado` → `cobrado` | Usuária reenvia cobrança | Atualiza `dataCobrancaEnviada` |
| `atrasado` → `pago` | Usuária marca como pago | Registra `dataPagamento` |
| `pago` → `pendente` | Usuária desfaz pagamento (caso raro) | Limpa `dataPagamento` |

**O status `atrasado` é derivado, não persistido permanentemente.** Na prática, ao carregar a tela, o sistema verifica parcelas com status `pendente` ou `cobrado` cujo `dataVencimento < hoje` e as marca visualmente como atrasadas. Isso evita jobs em background e mantém o status sempre correto sem cron.

### Como "Cobranças de Hoje" Funciona

A tela principal consulta **Parcelas**, não Cobranças:

```
Parcelas onde:
  dataVencimento == hoje
  AND status IN (pendente, cobrado, atrasado)
  AND cliente.ativo == true
```

A usuária abre o sistema, vê as parcelas que vencem hoje, clica no WhatsApp, marca como pago. O fluxo de 2 cliques por cliente se mantém.

### Resumo da Modelagem

| Entidade | Relação | Campos-chave | Geração |
|---|---|---|---|
| Cliente | raiz | nome, telefone, ativo | manual |
| ProdutoServico | independente | nome, valorPadrao | manual |
| Cobranca | Cliente + ProdutoServico | valor, parcelas, vencimento | manual |
| Parcela | Cobranca + Cliente (denormalizado) | valor, vencimento, status | **automática ao criar cobrança** |

---

## 3. Experiência do Usuário

### Fluxo Completo do Usuário

O sistema tem **4 telas**. Nada mais.

```
[Dashboard] ←─ tela inicial ao abrir
     │
     ├──► [Nova Cobrança] ←─ registro de venda
     │
     ├──► [Clientes] ←─ cadastro/edição de clientes
     │
     └──► [Produtos/Serviços] ←─ cadastro/edição de produtos
```

Não há menu lateral complexo. Não há subníveis. Quatro destinos, todos acessíveis pela barra inferior fixa no mobile ou pelo topo no desktop.

### Tela 1 — Dashboard (Tela Inicial)

#### O que aparece ao abrir o sistema

A usuária abre e vê **apenas 3 números** no topo e **a lista de baixo**:

- **HOJE - 06 Julho**
- **5 cobranças | R$ 1.200,00 | 2 atrasadas**
- Lista de cards das parcelas que vencem hoje + atrasadas

Atrasadas aparecem primeiro, acima das do dia, destacadas em vermelho suave.

**Quando não há cobranças no dia:**
- "Nada para cobrar hoje. ✓"
- "Próximo vencimento: dia XX | X cobranças no total"

#### Ações no card

Cada card tem **2 botões grandes**, lado a lado:

**[💬 Cobrar]**
- Abre o WhatsApp com mensagem pré-preenchida
- Marca a parcela como `cobrado` e registra `dataCobrancaEnviada = hoje`
- O botão muda para "💬 Reenviar"

**[✓ Marcar pago]**
- Abre um mini-dialog de confirmação
- Ao confirmar: `status = pago`, `dataPagamento = hoje`
- O card **some da lista com uma animação suave** (fade + slide)
- O contador de cobranças no topo atualiza

**Toque no corpo do card** (fora dos botões):
- Expande para mostrar detalhes: observações, PIX utilizado, histórico de cobranças enviadas
- Segundo toque recolhe

### Tela 2 — Nova Cobrança

Meta: **30 segundos do início ao fim.**

A tela não é um formulário longo. É uma **sequência de passos** — um campo ou seletor por vez, grandes e fáceis.

#### Passo 1 — Cliente (autocomplete)
- Campo de busca com autocomplete em tempo real
- Seção "Recentes" mostra os 5 clientes mais usados
- Se o cliente não existe: botão "+ Cadastrar novo cliente" → mini-form inline (só nome + telefone)
- Cliques: 1 (se for recente) ou 2 (buscar + selecionar)

#### Passo 2 — Produto/Serviço (autocomplete com valor)
- Mesma lógica de autocomplete
- Cada item mostra o valor padrão ao lado do nome
- Se o produto tem `valorPadrao`, ao selecionar, o Passo 3 (valor) já vem preenchido
- "+ Cadastrar novo serviço" → mini-form inline
- Pode pular (venda avulsa)
- Cliques: 1 (se for dos mais vendidos)

#### Passo 3 — Valor
- Se veio de produto com valor padrão: **já está preenchido**, só apertar Continuar
- Teclado numérico grande (mobile) ou campo editável (desktop)
- Máscara automática: digita "200" → mostra "R$ 200,00"
- Cliques: 0 (se preenchido) ou digita + 1

#### Passo 4 — Forma de Pagamento
- **6 botões grandes** para forma de pagamento — 1 clique seleciona
- Toggle À Vista / Parcelado — 2 botões grandes
- Se parcelado: seletor de parcelas (botões 2-12 + campo livre)
- Cliques: 2 (forma + à vista/parcelado) ou 3 (forma + parcelado + quantidade)

#### Passo 5 — Vencimento
- **6 botões grandes** para dia fixo (05, 10, 15, 20, 25, 30) — 1 clique
- Primeiro vencimento: calendário simples com default inteligente (próximo dia do dia fixo escolhido)
- PIX utilizado: campo opcional, só aparece se forma de pagamento for PIX, com autocomplete dos PIX já usados
- Cliques: 1 a 2

#### Passo 6 — Revisar e Salvar
- Resumo visual de tudo preenchido
- Pré-visualização das parcelas geradas
- Observações opcional
- Botão grande de confirmação
- Ao confirmar: cria Cobrança + gera Parcelas + mostra sucesso + volta para Dashboard
- Cliques: 1

#### Contagem total (caso otimista)

| Passo | Cliques |
|---|---|
| Cliente (recente) | 1 |
| Produto (mais vendido) | 1 |
| Valor (já preenchido) | 0 |
| Pagamento (PIX + à vista) | 2 |
| Vencimento (dia fixo + confirmar) | 2 |
| Confirmar | 1 |
| **Total** | **7 cliques** |

7 cliques em 6 telas sequenciais, sem rolagem, sem digitação obrigatória. **Atinge a meta de 30 segundos.**

### Tela 3 — Clientes

Lista simples com busca.
- Cada card: nome, status, telefone, quantas cobranças ativas tem
- **Tocar no card** → abre edição inline (nome, telefone, observações, toggle ativo/inativo)
- Busca filtra em tempo real por nome ou telefone
- [＋ Novo] → mini-form inline

### Tela 4 — Produtos/Serviços

Mesma estrutura, mais simples.
- Cada card: nome, valor padrão (ou "Sem valor"), quantas vezes foi usado
- **Tocar no card** → edição inline (nome + valor)
- [＋ Novo] → mini-form inline

### Barra de Navegação

Sempre visível, fixa na parte inferior (mobile) ou topo (desktop):
- 4 itens: [🏠 Hoje] [➕ Nova] [👥 Clientes] [📦 Serviços]
- O botão [➕ Nova] é o maior e mais destacado — é a ação principal

### Detalhes de Interação que Economizam Tempo

1. **Pré-preenchimento de data inteligente** — sugere o próximo dia do dia fixo escolhido
2. **Autocomplete de clientes recentes** — 5 mais usados sem digitar
3. **Valor vem do produto** — passo de valor é só apertar Continuar
4. **PIX com autocomplete** — sugere os PIX já digitados
5. **Animação de card pago** — some com transição suave, sem refresh
6. **Sem telas de loading** — ações otimistas, UI atualiza imediatamente
7. **WhatsApp com mensagem pronta** — 1 clique, mensagem completa

### Mensagens do WhatsApp

Para vencimento do dia:
> "Olá [Nome], sua parcela de R$ [Valor] do(a) [Produto] vence hoje ([Data]). Pode confirmar o pagamento? Obrigada!"

Para atrasadas:
> "Olá [Nome], sua parcela de R$ [Valor] do(a) [Produto] venceu em [DataVencimento] e ainda não foi recebida. Pode verificar o pagamento?"

### Resumo das Telas

| Tela | Função | Cliques para tarefa principal |
|---|---|---|
| Dashboard | Ver e agir sobre cobranças do dia | 2 (cobrar + pagar) |
| Nova Cobrança | Registrar venda | 7 (fluxo otimizado) |
| Clientes | Gerenciar clientes | 1 (editar inline) |
| Produtos/Serviços | Gerenciar produtos | 1 (editar inline) |

---

## 4. Funcionalidades que Reduzem o Tempo Diário

### 1. Cobranças de Hoje (Tela Inicial Automática)
- Ao abrir, query busca parcelas onde `dataVencimento == hoje` E `status != pago` E `cliente.ativo == true`
- Atrasadas aparecem primeiro
- **Economia: 2-3 minutos por dia só de busca.**

### 2. Próximos Vencimentos
- Seção compacta no Dashboard mostrando os próximos 3 dias de vencimento
- Cada linha clicável mostra a lista antecipada (overlay, sem trocar de página)
- **Economia: 1-2 minutos de procura + reduce esquecimento.**

### 3. Cobranças Atrasadas (Separação Automática)
- Parcelas com `dataVencimento < hoje` E `status IN (pendente, cobrado)` marcadas como atrasadas ao carregar
- Topo do Dashboard, visualmente distintas
- Mensagem de cobrança diferente (menciona atraso)
- **Economia: 5-10 minutos por dia + recupera receita perdida.**

### 4. Pesquisa Instantânea
- Campo de busca com debounce de 150ms
- Busca por nome do cliente, nome do produto, telefone
- Resultados substituem a lista atual — não abre nova página
- **Economia: 30 segundos por busca. 10 buscas/dia = 5 minutos.**

### 5. Produtos Favoritos (Ordem Inteligente)
- Produtos ordenados por frequência de uso
- Mais usados aparecem primeiro, sem digitar
- Recalcula a cada nova cobrança
- **Economia: 20 segundos por cobrança.**

### 6. Cadastro Inteligente (Preenchimento Automático)
- Ao selecionar cliente: busca as últimas 3 cobranças dele
- Se 2+ usaram o mesmo produto → sugere como "Sugerido"
- Se 2+ usaram o mesmo PIX → pré-seleciona
- Se 2+ usaram a mesma quantidade de parcelas → sugere como default
- **Economia: 15-20 segundos por cobrança recorrente.**

### 7. Geração Automática de Parcelas
- Usuária nunca vê formulário de parcela
- Pré-visualização no passo de revisão (só leitura)
- Se algo errado: ajusta a cobrança, nunca a parcela individual
- **Economia: 3-5 minutos para venda em 6x.**

### 8. Mensagem Pronta com Cópia Fácil
- Botão "Cobrar" → WhatsApp direto com mensagem formatada
- Botão "📋 Copiar mensagem" no card expandido
- Mensagem inclui: nome, produto, valor, PIX, data
- Feedback visual "Copiado!" por 2 segundos
- **Economia: 1-2 minutos por cliente. 10 clientes/dia = 10-20 minutos.**

Templates da mensagem:

Para vencimento normal:
```
Olá [Nome]!

Sua parcela de R$ [Valor] referente a [Produto] vence em [Data].

Forma de pagamento: PIX
Chave: [PIX]

Obrigada!
```

Para atrasadas:
```
Olá [Nome]!

Sua parcela de R$ [Valor] referente a [Produto] venceu em [Data] e ainda não foi recebida.

Forma de pagamento: PIX
Chave: [PIX]

Pode verificar o pagamento?

Obrigada!
```

Sem PIX:
```
Olá [Nome]!

Sua parcela de R$ [Valor] referente a [Produto] vence em [Data].

Obrigada!
```

### 9. Histórico do Cliente
- Na tela de Clientes, toque no card expande para mostrar histórico de cobranças
- Lista ordenada por data (mais recente primeiro)
- Cada cobrança: produto, valor, forma de pagamento, parcelamento, status de cada parcela
- Toque numa cobrança → expande para ver todas as parcelas individuais
- Tudo inline, não é página separada
- **Economia: 3-5 minutos quando cliente pergunta "já paguei?"**

### 10. Interface Minimalista

#### Dashboard
- **Tem:** contador, lista de parcelas, próximos vencimentos, busca
- **Não tem:** gráficos, relatórios, exportações, filtros avançados

#### Nova Cobrança
- **Tem:** 6 passos sequenciais, autocompletes, pré-preenchimento
- **Não tem:** formulário longo, campos avançados, configurações de recorrência

#### Clientes
- **Tem:** lista, busca, edição inline, histórico
- **Não tem:** foto, avatar, tags, categorias, CPF/CNPJ, email, endereço

#### Produtos/Serviços
- **Tem:** lista ordenada por uso, edição inline, valor padrão
- **Não tem:** categoria, descrição longa, SKUs, estoque, fotos

### Resumo de Economia de Tempo

| Funcionalidade | Tempo economizado por dia |
|---|---|
| Cobranças de Hoje | 2-3 min |
| Próximos Vencimentos | 1-2 min |
| Atrasadas Automáticas | 5-10 min |
| Pesquisa Instantânea | 5 min |
| Produtos Favoritos | 3-5 min |
| Cadastro Inteligente | 5-10 min |
| Geração de Parcelas | 5-10 min |
| Mensagem Pronta | 10-20 min |
| Histórico do Cliente | 3-5 min |
| Interface Minimalista | 5-10 min |
| **Total estimado** | **~45-75 min/dia** |

---

## 5. Análise da Rotina Manual

### A Rotina Manual Atual (Word)

A usuária tem cerca de 30-50 clientes ativos. Cada cliente tem um dia de vencimento fixo (05, 10, 15, 20, 25 ou 30). Ela mantém um documento do Word com os clientes organizados por dia.

No dia de cobrança, ela:
1. Abre o documento do Word
2. Rola até a seção do dia
3. Lê a lista de clientes daquele dia
4. Para cada cliente: abre WhatsApp, digita mensagem manualmente, envia, volta para o Word, marca que enviou
5. Ao receber pagamento: volta no Word, marca que pagou
6. No fim do mês: "reseta" o documento — apaga marcações, reescreve datas

### Problema 1 — Localizar quem cobrar no dia

**Problema:** Abre o documento e precisa rolar (ou Ctrl+F) até a seção do dia. Se são vários documentos, precisa achar o documento certo. Pode ter 10-50 páginas.

**Solução:** O sistema abre direto na lista de cobranças do dia. Primeira tela já é "quem preciso cobrar hoje".

**Economia: 1 minuto por dia.**

### Problema 2 — Identificar quem já pagou e quem ainda falta

**Problema:** Marcações de "pago" são manuais e inconsistentes no Word (negrito, cor, ✓, apagar o nome). Fica confuso saber quem foi cobrado, quem pagou, quem falta. Se interrompe e volta, perde o contexto.

**Solução:** Cada parcela tem status visual claro (pendente/cobrado/pago). Ao marcar como pago, o card desaparece. A lista só mostra o que falta.

**Economia: 3-5 minutos por dia.**

### Problema 3 — Esquecer cobranças atrasadas

**Problema:** Se uma cobrança do dia 10 não foi paga e hoje é dia 15, ela está na seção do dia 15. A atrasada do dia 10 está em outra seção, esquecida. Atrasos se acumulam e viram perda de receita.

**Solução:** Parcelas atrasadas aparecem automaticamente no topo do Dashboard, acima das do dia, destacadas em vermelho. Impossível ignorar.

**Economia: recuperação de receita que seria perdida.**

### Problema 4 — Digitar a mensagem de cobrança para cada cliente

**Problema:** Para cada cliente, digita manualmente a mensagem com nome, valor, PIX, data. 30-60 segundos por cliente. Risco de errar valor, esquecer PIX, mandar para cliente errado.

**Solução:** Botão "Cobrar" gera a mensagem automaticamente com todos os dados e abre o WhatsApp. 1 clique.

**Economia: 7-9 minutos por dia (para 10 clientes).**

### Problema 5 — Procurar o telefone do cliente

**Problema:** O telefone pode não estar visível no Word. Precisa procurar na agenda, copiar, ir para o WhatsApp, colar.

**Solução:** Telefone está no cadastro. Botão de cobrança já sabe o número e abre o WhatsApp.

**Economia: 2-5 minutos por dia (para 10 clientes).**

### Problema 6 — Recalcular datas de parcelas todo mês

**Problema:** Para venda parcelada em 6x, precisa saber qual parcela vence este mês. Controle manual: anota "1/6 - 10/07", "2/6 - 10/08"... precisa lembrar qual já venceu. Se perde, cobra parcela errada.

**Solução:** Sistema gera todas as parcelas automaticamente no cadastro. No Dashboard, só aparece a parcela que vence naquele dia. Vê "Parcela 2/6" no card.

**Economia: 10-15 minutos por dia (para 5 clientes parcelados).**

### Problema 7 — Resetar o documento a cada mês

**Problema:** No fim/início do mês, precisa "limpar" o documento: apagar marcações de pago, atualizar datas, verificar clientes novos/saídos. Processo manual propenso a erro.

**Solução:** Não existe "reset". Parcelas são registros individuais com data. No dia 01 do mês seguinte, Dashboard mostra cobranças do novo mês. Pagas ficam no histórico.

**Economia: 20-40 minutos por mês.**

### Problema 8 — Cadastrar uma nova venda

**Problema:** Copia a linha de um cliente similar, muda nome, muda valor, calcula parcelas, anota datas. Manual e repetitivo.

**Solução:** Fluxo de Nova Cobrança com 6 passos, autocomplete de cliente e produto, geração automática de parcelas. Sistema aprende padrões e pré-preenche.

**Economia: 45-60 minutos por mês (para 15 vendas).**

### Problema 9 — Atualizar dados do cliente

**Problema:** Se cliente muda telefone ou status, precisa editar o Word manualmente. Se tem cobranças em dias diferentes, duplica o nome em duas seções.

**Solução:** Cliente é entidade única. Telefone e status editados inline (1 toque). Novo telefone usado automaticamente em todas as cobranças futuras. Inativo → some do Dashboard. Cobranças em dias diferentes sem duplicação.

**Economia: 10-15 minutos por mês (para 5 atualizações).**

### Problema 10 — Responder "já paguei aquela parcela?"

**Problema:** Cliente pergunta se já pagou. Precisa procurar no Word, achar cliente, achar parcela, ver se marcou. Se a marcação foi apagada no reset, não tem como saber.

**Solução:** Tela de Clientes → toque no card → histórico completo com status e datas de pagamento. Responde em 10 segundos.

**Economia: 15-25 minutos por mês (para 5 consultas).**

### Resumo Consolidado

| # | Problema | Economia/dia | Solução |
|---|---|---|---|
| 1 | Localizar quem cobrar | 1 min | Dashboard abre no dia automaticamente |
| 2 | Saber quem já pagou/falta | 3-5 min | Status visual + lista se auto-limpa |
| 3 | Esquecer atrasadas | Recupera receita | Atrasadas no topo, impossível ignorar |
| 4 | Digitar mensagem | 7-9 min | Mensagem pronta com 1 clique |
| 5 | Procurar telefone | 2-5 min | Telefone no cadastro, WhatsApp direto |
| 6 | Calcular parcelas | 10-15 min | Geração automática de parcelas |
| 7 | Resetar documento mensal | 1-2 min | Não existe reset — automático |
| 8 | Cadastrar nova venda | 2 min | Fluxo de 30s com autocomplete |
| 9 | Atualizar dados do cliente | 0,5 min | Edição inline em 1 toque |
| 10 | Consultar histórico | 1 min | Histórico completo em 1 toque |
| | **Total diário** | **~28-41 min** | |

### O Que NÃO Vai No Sistema (e Por Quê)

| Funcionalidade descartada | Por quê não |
|---|---|
| Emissão de boletos | Ela não emite boletos. Cobra por WhatsApp. |
| Controle de fluxo de caixa | Precisa saber quem cobrar, não de relatório de entradas/saídas. |
| Gestão de estoque | Não vende produtos físicos. Os "produtos" são serviços. |
| NF-e / notas fiscais | Não é ERP. Nota fiscal é responsabilidade de outro sistema. |
| Conciliação bancária | Ela marca manualmente como pago quando recebe. |
| Dashboard com gráficos | Gráficos não ajudam a cobrar mais rápido. |
| Multi-usuário / permissões | Ela é a única usuária. |
| Notificações push / email | Ela já abre o sistema todo dia. |
| App mobile nativo | Interface web responsiva atende. |
| Importação de planilhas | Migração inicial é pequena. Cadastrar manualmente é mais rápido. |
| Categorização de clientes | Tags não ajudam a cobrar. Agrupamento é por dia. |
| Campos de CPF/CNPJ/endereço | Não usa esses dados para cobrar. |
| Recorrência automática (assinaturas) | Ela cadastra cada venda manualmente. Não é sistema de assinatura. |
| Relatórios exportáveis | O histórico do cliente já atende a maioria das dúvidas. |

### Princípio Orientador

Cada funcionalidade que entra no sistema precisa responder **sim** a esta pergunta:

> "Isso faz a usuária cobrar mais rápido?"

Se a resposta for não, a funcionalidade não entra. O sistema existe para substituir o documento do Word e economizar os 30-40 minutos diários mapeados. Qualquer coisa além disso é escopo crescente e complexidade desnecessária.
