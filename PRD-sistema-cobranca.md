# PRD — Sistema de Gerenciamento de Cobranças

**Versão:** 2.0 — Definitiva
**Data:** 25 de julho de 2026
**Status:** Aprovado para desenvolvimento
**Substitui:** v1.0

---

## 0. Changelog v2.0

| # | Problema identificado | Solução aplicada | Motivo | Impacto |
|---|---|---|---|---|
| 1 | Precisão de valores monetários não especificada | Adicionada convenção: reais com 2 casas decimais, truncate via `Math.floor(x*100)/100` | Dois devs poderiam armazenar em reais ou centavos | Técnico |
| 2 | `date` vs `datetime` não diferenciado | Adicionada convenção: datas sempre YYYY-MM-DD sem hora, timezone America/Sao_Paulo | Pagamento às 22h no Brasil seria salvo como dia seguinte em UTC | Técnico |
| 3 | Formato do telefone não definido | Definido: DDI+DDD+número, apenas dígitos (ex: "5511987654321") | Link wa.me exige formato internacional sem símbolos | Técnico |
| 4 | Enum `diaVencimentoFixo` sem valores formalizados | Valores `[5, 10, 15, 20, 25, 30]` explicitados na entidade | Dev precisava procurar no config | Técnico |
| 5 | `produtoServicoId` em venda avulsa não definido | Definido: `null`, nenhum produto criado, `vezesUsado` não incrementa | Wireframe sugeria que venda avulsa era um produto | Regras de Negócio |
| 6 | Aritmética de meses não especificada | Regra geral: se dia não existe no mês, usar último dia do mês | Fev/30 era tratado mas não Abr/31, Fev/31 etc. | Regras de Negócio |
| 7 | Redundância `parcelado` + `quantidadeParcelas` | Campo `parcelado` removido; parcelamento derivado de `quantidadeParcelas > 1` | Risco de inconsistência entre os dois campos | Arquitetura |
| 8 | Status da parcela regenerada não definido | Regeneração deleta parcelas antigas e cria novas com `pendente`; edição com regeneração só permitida se todas as parcelas estão `pendente` | Dev não saberia se regeneração preserva ou não status | Regras de Negócio |
| 9 | `vezesUsado` em edição/exclusão não definido | Regra completa: incrementa em criação, decrementa em exclusão, ajusta em troca de produto | Contador de favoritos ficaria incorreto | Regras de Negócio |
| 10 | `dataLimite` de atrasados ambígua e contraditória | Regra simplificada: atrasado = `dataVencimento < hoje` (em dias corridos); dias trabalhados removidos do cálculo de atraso | Seções 7.3 e 10.4 se contradiziam sobre tolerância | Regras de Negócio, UX |
| 11 | Persistência dos dias trabalhados não definida | Criada Entidade 5 `Configuracao` (singleton) com campo `diasTrabalhados` | Settings não teriam onde salvar | Arquitetura |
| 12 | Próximos vencimentos — definição de "próximo" ambígua | Definido: próximos 3 dias do enum com pelo menos 1 parcela não paga | Dev não saberia se mostrava dias vazios ou não | Regras de Negócio |
| 13 | Undo de `pago` para `pago_parcial` não coberto | Regra: se anterior era `pago_parcial`, restaura `valorPago` anterior; estado anterior em memória | Desfazer zerava `valorPago` perdendo histórico parcial | Regras de Negócio |
| 14 | "Desfazer pagamento" manual não especificado | Definido: botão [↺ Desfazer pagamento] no card de parcela no histórico, com confirmação | Funcionalidade mencionada mas sem UI | UX |
| 15 | Persistência do "Confirmar envio" não definida | Estado intermediário é puramente de UI (não persistido); recarregar reset para estado anterior | Dev não saberia se salvava estado intermediário | Técnico |
| 16 | Validação de valor parcial não definida | Regra: >0 e < saldo devedor; se >= saldo, trata como total; não aceita <=0 | Input aceitaria valores inválidos | Regras de Negócio |
| 17 | Undo em lote não especificado | Um toast para todas; [Desfazer] reverte todas de uma vez | Dev não saberia se desfazia uma ou todas | UX |
| 18 | Arquivamento por cobrança vs parcela não claro | Definido: arquivamento é por parcela individual | Ação no Dashboard é sobre parcelas, não cobranças | Regras de Negócio |
| 19 | Botão "Marcar parcial" ausente do wireframe | Definido: [✓ Marcar pago] abre menu inline com "Pagamento total" e "Pagamento parcial" | Funcionalidade sem acesso na UI | UX |
| 20 | Contador diz "cobranças" mas conta parcelas | Padronizado: UI usa "cobrança" (termo genérico); código opera sobre Parcela | Terminologia confundia dev sobre o que contar | Técnico |
| 21 | Fluxo de edição não detalhado | Definido: reutiliza os 4 passos da Nova Cobrança com campos pré-preenchidos | Dev não saberia se era mesmo fluxo ou tela diferente | UX |
| 22 | `nomeProdutoServico` editável com parcela paga não definido | Definido: somente leitura quando há parcela paga | Lacuna sobre quais campos são editáveis | Regras de Negócio |
| 23 | "Já passou" no primeiro vencimento ambíguo | Definido: `primeiroVencimento = próxima ocorrência do diaVencimentoFixo a partir de hoje (inclusive)` | Dev não saberia se hoje conta como "passado" | Regras de Negócio |
| 24 | Origem do autocomplete de PIX não definida | Definido: `distinct(pixUtilizado)` em cobranças com `formaPagamento = pix`, top 5 por frequência | Dev não saberia de onde vinham as sugestões | Técnico |
| 25 | Cadastro inteligente sem histórico não tratado | Definido: 0 ou 1 cobrança = nenhuma sugestão; regra exige 2+ | Caso de cliente novo não explicitado | Regras de Negócio |
| 26 | Atomicidade cobrança+parcelas não implementável | Definido: usar backend function com compensação em caso de falha | Entities da Base44 não suportam transações ACID | Arquitetura |
| 27 | Comportamento em falha otimista não especificado | Definido: card volta à lista + toast de erro com [Tentar novamente] para cada ação | UX de erro seria diferente entre devs | UX, Técnico |
| 28 | Exclusão de produto não definida | Definida: não permitida se há cobranças referenciando; permitida caso contrário | Sem regra, dev poderia permitir exclusão quebrando histórico | Regras de Negócio |
| 29 | Inativação de cliente sem confirmação/efeito definidos | Definida: confirmação + parcelas somem do Dashboard + reativação restaura | UX de inativação sem definição | UX |
| 30 | Validações mínimas da cobrança não definidas | Definidas: valor >0, parcelas 1-60, primeiroVencimento editável para passado com alerta, PIX obrigatório se forma=PIX, nome ≥3 chars | Sem validações, sistema aceita dados inválidos | Regras de Negócio |
| 31 | "Recentes" no autocomplete — quantos e baseado em quê | Definido: 5 clientes mais recentes em cobranças (por `created_date` da cobrança) | Lista seria diferente entre devs | Técnico |
| 32 | Pré-visualização para à vista não definida | Definida: sempre aparece, inclusive para 1 parcela | Dev poderia omitir pré-visualização para à vista | UX |

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
8. Arquivamento de parcelas irrecuperáveis
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
│   ├── CopyButton/          → Botão copiar para clipboard
│   ├── EmptyState/          → Estado vazio
│   ├── UndoToast/           → Toast com ação de desfazer
│   ├── BatchBar/            → Barra de ação em lote
│   ├── SearchInput/         → Input de busca com debounce
│   ├── ClientAutocomplete/  → Autocomplete de clientes
│   ├── ProductAutocomplete/ # Autocomplete de produtos
│   ├── PaymentSelector/     → Seletores de forma de pagamento
│   ├── DaySelector/         → 6 botões de dia fixo
│   ├── ParcelPreview/       → Pré-visualização de parcelas
│   └── OnboardingGuide/     → Guia de primeiro acesso
│
├── pages/               # Páginas
│   ├── Dashboard/          → Tela inicial: cobranças de hoje
│   ├── NewCharge/          → Fluxo de nova cobrança (4 passos)
│   ├── Clients/            → Lista e edição de clientes
│   ├── Products/           → Lista e edição de produtos
│   └── Settings/           → Configuração de dias trabalhados
│
├── services/            # Camada externa
│   ├── api.service.ts      → Wrapper das entities (Base44 SDK)
│   ├── whatsapp.service.ts → Geração de links wa.me
│   ├── clipboard.service.ts → Cópia para clipboard
│   └── index.ts
│
├── domain/              # Regras de negócio (puro)
│   ├── charge.rules.ts     → Criação de cobrança + validações
│   ├── parcel.rules.ts     → Geração automática de parcelas
│   ├── status.rules.ts     → Máquina de status das parcelas
│   ├── overdue.rules.ts    → Cálculo de atrasados
│   └── billing-cycle.ts    → Cálculo de vencimentos + meses curtos
│
├── hooks/               # Hooks (event-based)
│   ├── useDashboard.ts     → Parcelas de hoje + atrasadas
│   ├── useClients.ts       → Lista de clientes com cache
│   ├── useProducts.ts      → Lista de produtos ordenada por uso
│   ├── useCharges.ts       → Cobranças por cliente
│   ├── useParcelActions.ts → Ações: cobrar, marcar pago, arquivar
│   ├── useBatchSelect.ts    → Seleção em lote
│   └── useConfig.ts        → Configuração (dias trabalhados)
│
├── lib/                 # Utilidades
│   ├── date.utils.ts       → Datas, próximo vencimento, formato BR
│   ├── format.utils.ts     → Moeda, telefone
│   ├── validation.utils.ts → Validações
│   ├── event-bus.ts        → EventBus para comunicação desacoplada
│   └── math.utils.ts       → Divisão de parcelas com arredondamento
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

### Convenções de Dados

**Valores monetários:** todos os campos monetários (`valor`, `valorPadrao`, `valorPago`) são armazenados como `number` em reais com 2 casas decimais (ex: R$ 200,00 = `200.00`). Não usar centavos inteiros. O arredondamento sempre usa `Math.floor(valor * 100) / 100` para garantir truncate em 2 casas.

**Datas:** todos os campos do tipo `date` armazenam apenas a data (YYYY-MM-DD), sem hora e sem timezone. As comparações de "hoje", "atrasado" e "vencimento" usam a data local da usuária (America/Sao_Paulo, UTC-3). Ao criar um `date`, sempre zerar as horas (`new Date(year, month, day)`). Nunca usar `new Date().toISOString()` para datas de vencimento/pagamento.

**Telefone:** string armazenada no formato: DDI + DDD + número, apenas dígitos, sem espaços ou símbolos. Exemplo: "5511987654321". A máscara "(11) 98765-4321" é aplicada apenas na exibição pelo `format.utils.ts`. A validação no cadastro exige mínimo de 12 dígitos (55 + DDD de 2 + número de 8) e máximo de 13 (55 + DDD de 2 + número de 9). O link WhatsApp é gerado como `wa.me/{telefone}` diretamente, sem transformação.

### Entidade 1 — `Cliente`

| Campo | Tipo | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `nome` | string | sim | — | Nome do cliente |
| `telefone` | string | sim | — | Telefone/WhatsApp (DDI+DDD+número, apenas dígitos) |
| `observacoes` | string | não | "" | Anotações livres |
| `ativo` | boolean | não | true | Cliente ativo ou inativo |

**Decisões:**
- `ativo` é booleano. Cliente inativo não aparece no Dashboard mas mantém histórico.
- Não há campo de dia de vencimento no cliente — o vencimento é da cobrança, não do cliente. Permite que o mesmo cliente tenha cobranças em dias diferentes.
- Um telefone por cliente. Caso precise de segundo, anotar em observações. Não adicionar complexidade para caso raro.

**Inativação de cliente:**
- Confirmação: "Inativar Maria Silva? Suas cobranças não aparecerão no Dashboard. [Confirmar] [Cancelar]"
- Efeito: `ativo = false`. Parcelas pendentes/futuras/atrasadas não aparecem no Dashboard.
- Reativação: `ativo = true`. Todas as parcelas que continuam no critério de exibição do Dashboard voltam.
- O histórico do cliente é sempre acessível, independente do status.
- Não há exclusão de cliente — apenas inativação.

### Entidade 2 — `ProdutoServico`

| Campo | Tipo | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `nome` | string | sim | — | Nome do produto ou serviço |
| `valorPadrao` | number | não | null | Valor sugerido ao selecionar este produto (em reais, 2 casas) |
| `vezesUsado` | number | não | 0 | Contador de uso (para ordenação por frequência) |

**Decisões:**
- `valorPadrao` é opcional. Alguns serviços têm preço variável.
- Produto e serviço são a mesma entidade. A usuária não diferencia.

**Ciclo de vida do `vezesUsado`:**
- Criar cobrança com `produtoServicoId != null`: incrementa `vezesUsado` do produto.
- Excluir cobrança com `produtoServicoId != null`: decrementa `vezesUsado` do produto (mínimo 0).
- Editar cobrança mudando de produto A para produto B: decrementa A, incrementa B.
- Editar cobrança mudando de produto A para venda avulsa: decrementa A.
- Editar cobrança mudando de venda avulsa para produto B: incrementa B.
- Venda avulsa (`produtoServicoId = null`): não incrementa nem decrementa nada.

**Exclusão de produto:** não é permitida se o produto está referenciado por alguma cobrança (`produtoServicoId != null` em Cobranca). O sistema mostra: "Este produto está em uso em X cobranças e não pode ser excluído." Se não há cobranças referenciando, a exclusão é permitida. Não há inativação de produto — apenas exclusão.

### Entidade 3 — `Cobranca`

| Campo | Tipo | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `clienteId` | reference → Cliente | sim | — | Quem comprou |
| `produtoServicoId` | reference → ProdutoServico | não | null | Produto/serviço (null em venda avulsa) |
| `nomeProdutoServico` | string | sim | — | Nome desnormalizado (snapshot) |
| `valor` | number | sim | — | Valor total da venda (em reais, 2 casas) |
| `formaPagamento` | enum | sim | — | Forma como foi vendido |
| `quantidadeParcelas` | number | sim | 1 | 1 = à vista; >1 = parcelado |
| `primeiroVencimento` | date | sim | — | Data do primeiro vencimento |
| `diaVencimentoFixo` | enum | sim | — | Dia fixo para parcelas subsequentes |
| `pixUtilizado` | string | condicional | null | Qual PIX foi usado (obrigatório se forma=PIX) |
| `observacoes` | string | não | "" | Notas sobre a venda |

### Enum `formaPagamento`:
- `pix`
- `dinheiro`
- `cartao_credito`
- `cartao_debito`
- `transferencia`

### Enum `diaVencimentoFixo`:
- Valores válidos: `5`, `10`, `15`, `20`, `25`, `30` (números inteiros).
- Não existe dia 31.
- O seletor de UI sempre mostra exatamente estas 6 opções.
- O `days.config.ts` exporta o array `[5, 10, 15, 20, 25, 30]` como única fonte de verdade.

**Regra de `pixUtilizado`:** obrigatório quando `formaPagamento = pix`. O cadastro não pode ser concluído sem preencher. Nos demais casos, é opcional/null.

**Venda avulsa:** quando a usuária não seleciona um produto cadastrado, ela digita um nome curto (mínimo 3 caracteres). Neste caso: `produtoServicoId = null` (nenhum ProdutoServico é criado ou atualizado), `nomeProdutoServico = texto digitado`, `vezesUsado` não é incrementado. O agrupamento visual "Venda avulsa" que aparece na tela de Produtos NÃO é um produto do sistema — é um agrupamento de cobranças onde `produtoServicoId = null`. A contagem "Usado X vezes" vem de um `COUNT` de cobranças com `produtoServicoId = null`, não do campo `vezesUsado`.

### Entidade 4 — `Parcela`

| Campo | Tipo | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `cobrancaId` | reference → Cobranca | sim | — | Cobrança pai |
| `clienteId` | reference → Cliente | sim | — | Cliente (denormalizado) |
| `numeroParcela` | number | sim | — | Sequencial (1, 2, 3...) |
| `valor` | number | sim | — | Valor desta parcela (em reais, 2 casas) |
| `valorPago` | number | não | null | Quanto já foi pago (em reais, 2 casas) |
| `dataVencimento` | date | sim | — | Vencimento (YYYY-MM-DD) |
| `status` | enum | sim | `pendente` | Situação atual |
| `dataPagamento` | date | não | null | Quando foi quitada (YYYY-MM-DD) |
| `dataCobrancaEnviada` | date | não | null | Última cobrança enviada (YYYY-MM-DD) |
| `arquivada` | boolean | não | false | Se foi arquivada |

### Enum `status`:
- `pendente` — ainda não chegou o vencimento, não foi cobrada
- `cobrado` — cobrança foi enviada ao cliente
- `pago` — cliente pagou totalmente (`valorPago >= valor`)
- `pago_parcial` — cliente pagou parte (`0 < valorPago < valor`)
- `arquivado` — usuária desistiu de cobrar (não aparece no Dashboard)

**`atrasado` não é um status persistido.** É um estado derivado calculado em tempo real ao carregar a tela (ver seção 7.3).

**Decisões:**
- `clienteId` denormalizado para queries rápidas (Dashboard lista parcelas sem join).
- `valorPago` permite pagamento parcial sem observações manuais.
- `valor` é o valor calculado no momento da geração. Não é recalculado dinamicamente.
- `arquivada` é um flag separado do status. Quando `true`, a parcela não aparece no Dashboard, mas aparece no histórico do cliente com o status que tinha e a label "Arquivada em DD/MM".

### Entidade 5 — `Configuracao` (singleton)

Armazena configurações do sistema. Existe um único registro por usuário.

| Campo | Tipo | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `diasTrabalhados` | array de int (0-6) | não | [1,2,3,4,5] | Dias da semana trabalhados (0=Dom, 1=Seg, 6=Sáb) |

**Implementação:** criar como entity com RLS. O hook `useConfig` carrega o único registro. Se não existir, cria com defaults. A tela de Settings edita este registro.

---

## 7. Regras de Negócio Definitivas

### 7.1 Geração Automática de Parcelas

**Gatilho:** criação de cobrança confirmada (via backend function — ver seção 12.5).

**Validações da cobrança antes de gerar parcelas:**
- `valor`: número positivo maior que 0. Máximo: R$ 999.999,99.
- `quantidadeParcelas`: inteiro entre 1 e 60.
- `primeiroVencimento`: data válida. Pode ser no passado (a usuária pode registrar venda já ocorrida) — o sistema alerta visualmente mas não bloqueia.
- `pixUtilizado`: obrigatório e não vazio se `formaPagamento = pix`.
- `nomeProdutoServico`: mínimo 3 caracteres.

**Regra para à vista (`quantidadeParcelas = 1`):**
```
Parcela 1:
  numeroParcela = 1
  valor = cobranca.valor
  dataVencimento = cobranca.primeiroVencimento
  status = pendente
```

**Regra para parcelado (`quantidadeParcelas = N`):**
```
valorBase = Math.floor((cobranca.valor / N) * 100) / 100

Para i de 1 a N:
  se i == 1:
    dataVencimento = cobranca.primeiroVencimento
  senão:
    mesAlvo = mês de cobranca.primeiroVencimento + (i - 1) meses
    dataVencimento = diaVencimentoFixo no mesAlvo (com regra de meses curtos)

  se i < N:
    valor = valorBase
  se i == N:
    valor = cobranca.valor - (valorBase * (N - 1))  // ajuste de arredondamento

  Parcela i:
    numeroParcela = i
    valor = valor (com ajuste na última)
    dataVencimento = dataVencimento
    status = pendente
```

**Arredondamento:** `valorBase` é truncado em 2 casas decimais via `Math.floor((valor/N) * 100) / 100`. A última parcela recebe a diferença: `cobranca.valor - (valorBase * (N - 1))`. Garante que a soma seja exatamente o valor total.

Exemplo: R$ 100 ÷ 3 → valorBase = 33.33 → parcelas 33.33, 33.33, 33.34.

**Tratamento de meses curtos (regra geral):** ao calcular o vencimento de uma parcela, se o `diaVencimentoFixo` não existir no mês alvo, usar o **último dia do mês**. Exemplos:
- Dia 30 em fevereiro (28 dias) → 28/02
- Dia 30 em fevereiro bissexto (29 dias) → 29/02
- Dia 31 em abril (30 dias) → 30/04
- Dia 31 em fevereiro → 28/02 (ou 29 em bissexto)

Implementação: `new Date(ano, mesAlvo, diaVencimentoFixo)`. Se a data resultante tiver `getDate() != diaVencimentoFixo` (JavaScript ajusta para o mês seguinte quando o dia não existe), usar `new Date(ano, mesAlvo + 1, 0)` que retorna o último dia do mês alvo.

### 7.2 Máquina de Status das Parcelas

| De | Para | Gatilho | Campos atualizados |
|---|---|---|---|
| `pendente` | `cobrado` | Usuária clica em "Confirmar envio" | `dataCobrancaEnviada = hoje` |
| `cobrado` | `pago` | Usuária marca pagamento total | `dataPagamento = hoje`, `valorPago = valor` |
| `cobrado` | `pago_parcial` | Usuária registra pagamento parcial | `valorPago = valor recebido` |
| `pago_parcial` | `pago` | Usuária complementa pagamento e `valorPago >= valor` | `dataPagamento = hoje` |
| `pago_parcial` | `pago_parcial` | Usuária registra novo pagamento parcial | `valorPago += valor recebido` |
| `pago` | `pendente` ou `cobrado` | Usuária desfaz (undo toast ou manual) | `dataPagamento = null`, `valorPago = null` (ver regra de undo) |
| `pago_parcial` | `pendente` ou `cobrado` | Usuária desfaz manualmente | `dataPagamento = null`, `valorPago = null` |
| qualquer | `arquivado` | Usuária arquiva | `arquivada = true` |
| `arquivado` | status anterior | Usuária desarquiva | `arquivada = false` |

**Botão "Cobrar" vs "Confirmar envio":**

O botão "Cobrar" abre o WhatsApp com a mensagem pronta. O status **não muda automaticamente**. Após clicar em "Cobrar", aparece um botão no card: "✓ Confirmar envio". A usuária clica neste botão após enviar a mensagem. O status muda para `cobrado` e `dataCobrancaEnviada = hoje`.

O mesmo botão "Confirmar envio" aparece se a usuária usar "Copiar mensagem" em vez de abrir o WhatsApp. O sistema não distingue o canal — apenas confirma que a usuária enviou a cobrança por algum meio.

**Estado intermediário "aguardando confirmação de envio":** este estado não é persistido no banco. É puramente de UI (estado do componente do card). Se a usuária recarrega a página, o botão "Confirmar envio" desaparece e a parcela volta ao estado anterior (`pendente` ou atrasada). O status no banco só muda quando a usuária clica em "Confirmar envio".

### 7.3 Cálculo de Atrasados

**Definição de atrasado:**

Uma parcela está **atrasada** quando:
1. `status IN (pendente, cobrado, pago_parcial)`
2. `arquivada = false`
3. `dataVencimento < hoje`

A comparação é estritamente de **data** (sem hora), na timezone da usuária (America/Sao_Paulo).

**Dias de atraso exibidos:** `diasAtraso = hoje - dataVencimento` em dias corridos. Se a parcela venceu no sábado e hoje é segunda, `diasAtraso = 2`. O card mostra "Atrasada há X dias".

**Gradiente visual:**
- 1-3 dias: laranja
- 4+ dias: vermelho

**O papel dos dias trabalhados:** os dias trabalhados (configurados na Entidade 5) NÃO afetam a definição de atrasado. Eles não são usados no cálculo de atraso. O gradiente natural do tempo (1-3 dias laranja, 4+ vermelho) já diferencia um atraso de fim de semana (2 dias, laranja) de um atraso real (10 dias, vermelho) sem precisar de lógica complexa de dias trabalhados.

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
  dataVencimento < hoje
  AND status IN (pendente, cobrado, pago_parcial)
  AND arquivada = false
  AND cliente.ativo = true
```

**Ordenação no Dashboard:**
1. Atrasadas (vermelhas 4+ dias primeiro, depois laranjas 1-3 dias)
2. Cobradas hoje mas não pagas (amarelas)
3. Pendentes de hoje (neutras)

**Próximos vencimentos:** mostra os próximos 3 dias do enum `[5, 10, 15, 20, 25, 30]` (cronologicamente após hoje) que têm pelo menos 1 parcela não paga e não arquivada. Dias sem parcelas não aparecem. Se houver menos de 3 dias futuros com parcelas, mostra apenas os que existem. A contagem inclui parcelas com status `pendente`, `cobrado` e `pago_parcial`. Cada linha mostra: dia do vencimento, quantidade de parcelas e soma dos valores.

**Terminologia:** o Dashboard conta e exibe **parcelas**, não cobranças. O contador na UI diz "X cobranças" (termo genérico para a usuária), mas o código opera sobre a entidade Parcela. Se um cliente tem uma cobrança em 3x e todas as 3 parcelas vencem hoje, o contador mostra "3 cobranças" (3 parcelas).

### 7.5 Edição e Exclusão de Cobranças

**Edição com regeneração (todas as parcelas têm `status = pendente`):**

Ao editar, o sistema **deleta as parcelas antigas** e **cria novas parcelas** com os parâmetros atualizados. As novas parcelas têm `status = pendente`, `valorPago = null`, `dataPagamento = null`, `dataCobrancaEnviada = null`. O histórico de cobrança enviada é perdido.

Esta edição é permitida apenas se **TODAS as parcelas** têm `status = pendente`. Se alguma parcela foi cobrada (`cobrado`), paga (`pago`) ou tem pagamento parcial (`pago_parcial`), a edição com regeneração não é permitida.

Justificativa: se a usuária já enviou a cobrança ao cliente com valores/datas específicos, regenerar as parcelas mudaria os dados que o cliente já recebeu.

**Edição limitada (alguma parcela tem `status != pendente`):**

Permitir editar apenas: `observacoes` e `pixUtilizado`. Os campos `nomeProdutoServico`, `valor`, `quantidadeParcelas`, `primeiroVencimento`, `diaVencimentoFixo`, `formaPagamento`, `clienteId`, `produtoServicoId` são **somente leitura**.

**Exclusão permitida:** quando nenhuma parcela foi paga (`status != pago` e `valorPago = null` em todas). Exclusão deleta a cobrança e todas as parcelas geradas. Se `produtoServicoId != null`, decrementa `vezesUsado` do produto.

**Exclusão não permitida:** quando alguma parcela foi paga ou tem pagamento parcial. Neste caso, oferecer apenas arquivamento das parcelas individualmente.

Justificativa técnica: parcelas pagas são registros financeiros. Excluir uma cobrança com parcela paga apagaria o histórico de pagamento. A integridade do histórico é mais importante que a conveniência de excluir.

### 7.6 Arquivamento de Parcelas

**Granularidade:** o arquivamento é por **parcela**, não por cobrança. Se uma cobrança tem 3 parcelas e a usuária quer arquivar todas, ela arquiva cada parcela individualmente no card expandido de cada uma.

**Gatilho:** usuária clica em "Arquivar" no card expandido da parcela.

**Efeito:** `arquivada = true`. A parcela some do Dashboard. Fica no histórico do cliente com o status que tinha quando foi arquivada e a label "Arquivada em DD/MM".

**Desarquivamento:** possível a partir do histórico do cliente. Botão "Desarquivar" no card da parcela arquivada. Volta ao Dashboard se continuar atendendo ao critério de exibição (`dataVencimento == hoje` ou `dataVencimento < hoje` com status não-pago).

**Confirmação:** "Arquivar parcela de R$ 200 de Carlos Santos? Ela sairá da lista de cobranças. [Confirmar] [Cancelar]"

Justificativa técnica: substitui o "riscar do Word" sem perder o histórico. A usuária limpa o Dashboard de parcelas irrecuperáveis sem mentir (marcar como pago) nem deletar (perder registro).

### 7.7 Produtos Favoritos (Ordenação Inteligente)

**Ordenação:** produtos são ordenados por `vezesUsado` (descendente) na tela de Produtos e no autocomplete de Nova Cobrança.

**Atualização:** `vezesUsado` é incrementado/decrementado conforme o ciclo de vida definido na Entidade 2.

### 7.8 Cadastro Inteligente (Pré-preenchimento)

Ao selecionar um cliente no fluxo de Nova Cobrança, o sistema busca as últimas 3 cobranças daquele cliente:

- Se 2+ cobranças usaram o mesmo produto → esse produto aparece marcado como "Sugerido" no autocomplete.
- Se 2+ cobranças usaram o mesmo PIX → esse PIX aparece pré-preenchido.
- Se 2+ cobranças usaram a mesma quantidade de parcelas → esse número é pré-selecionado se a usuária escolher "Parcelado".

Se o cliente tem 0 ou 1 cobrança, nenhuma sugestão é feita. A regra exige no mínimo 2 cobranças com o mesmo valor para identificar padrão.

A usuária pode alterar qualquer sugestão. Nada é obrigatório.

**Autocomplete de PIX:** o autocomplete busca valores distintos de `pixUtilizado` em todas as cobranças existentes onde `formaPagamento = pix` e `pixUtilizado != null`. Ordenado por frequência (mais usado primeiro). Mostra no máximo 5 sugestões.

### 7.9 Sugestão de Primeiro Vencimento

Ao selecionar o `diaVencimentoFixo`, o sistema calcula o `primeiroVencimento` sugerido:

`primeiroVencimento = próxima ocorrência do diaVencimentoFixo a partir de hoje (inclusive)`

- Se hoje é o dia `D` e o dia fixo escolhido é `D`: sugere **hoje**.
- Se o dia fixo escolhido é maior que hoje: sugere o dia fixo **deste mês**.
- Se o dia fixo escolhido é menor que hoje: sugere o dia fixo do **próximo mês**.
- Se hoje é dia 28 e o dia fixo é 30: sugere 30 deste mês.
- Se hoje é dia 31 e o dia fixo é 30: sugere 30 do próximo mês.

A usuária pode alterar a data.

### 7.10 Pagamento Parcial

**Regra:**
- `valorPago = valor recebido`, `status = pago_parcial`
- Card no Dashboard mostra "R$ X de R$ Y (pago parcial)"
- Card continua na lista de cobranças (ainda falta o saldo)
- Mensagem de cobrança menciona o saldo devedor

**Validação do valor parcial:**
- O valor digitado deve ser maior que 0 e menor que (`valor - valorPago`).
- Se o valor digitado for >= (`valor - valorPago`): trata como pagamento total. `status = pago`, `valorPago = valor`, `dataPagamento = hoje`.
- Se o valor digitado for <= 0: o input não aceita e mostra mensagem inline "Digite um valor maior que zero".
- O input aceita no máximo 2 casas decimais. Máscara automática de moeda.

**Complemento:** cliente paga o restante.
- `valorPago += valor recebido`. Se `valorPago >= valor`: `status = pago`, `dataPagamento = hoje`. Card some do Dashboard.
- Se `valorPago < valor`: continua `pago_parcial`.

---

## 8. Fluxos Finais

### 8.1 Fluxo de Cobrança Diária (Dashboard)

```
Usuária abre o sistema
  ↓
Dashboard carrega:
  - Topo: data de hoje, contadores (X cobranças, R$ total, Y atrasadas)
  - Lista: atrasadas primeiro (vermelhas 4+dias, laranjas 1-3 dias), depois as de hoje
  - Seção compacta: próximos 3 dias de vencimento com parcelas
  ↓
Para cada parcela na lista:
  ↓
  [💬 Cobrar] → WhatsApp abre com mensagem pronta
                → Card mostra botão "✓ Confirmar envio"
                → Usuária confirma → status = cobrado, dataCobrancaEnviada = hoje
                → Card muda de cor (vermelho/laranja → amarelo cobrado)
  ↓
  [✓ Marcar pago] → Abre menu inline com 2 opções:
                    "Pagamento total" → Undo toast: "Maria — R$ 200 pago. [Desfazer]"
                                     → Card some com animação, contador atualiza
                    "Pagamento parcial" → Input inline: "Quanto recebeu?"
                                        → Usuária digita valor
                                        → status = pago_parcial
                                        → Card mostra "R$ 100 de R$ 200"
  ↓
  [Selecionar múltiplos] → Toque no círculo à esquerda do card
                         → Barra no rodapé: "3 selecionadas · [Marcar todas como pagas]"
                         → 1 clique resolve lote (pagamento total)
                         → Undo toast único: "3 parcelas marcadas como pagas. [Desfazer]"
  ↓
  [Tocar no corpo do card] → Expande: observações, PIX, histórico de cobrança, arquivar
```

### 8.2 Fluxo de Nova Cobrança (4 passos)

```
[➕ Nova] na barra de navegação
  ↓
PASSO 1 — Cliente + Produto (mesma tela)
  - Autocomplete de cliente (com "Recentes" no topo: 5 clientes mais recentes em cobranças,
    ordenados por created_date da cobrança descendente)
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
  - Observações (opcional — campo da cobrança)
  - Pré-visualização das parcelas geradas (abaixo, só leitura, sempre aparece inclusive para 1 parcela)
  ↓
PASSO 4 — Salvar
  - Botão grande "✓ Confirmar cobrança" (não é tela de revisão — os dados estão visíveis no passo anterior)
  - Ao confirmar: cria cobrança + gera parcelas (via backend function)
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

### 8.3 Fluxo de Edição de Cobrança

A edição reutiliza os mesmos 4 passos do fluxo de Nova Cobrança, com todos os campos pré-preenchidos com os dados atuais da cobrança. O título muda de "Nova Cobrança" para "Editar Cobrança". O botão final muda de "✓ Confirmar cobrança" para "✓ Salvar alterações".

```
[👥 Clientes] → Toca no card do cliente → Histórico expande
  ↓
Toca na cobrança que quer editar → Cobrança expande mostrando parcelas
  ↓
Botão [Editar] (só aparece se TODAS as parcelas têm status = pendente)
  ↓
Passo 1: cliente pré-selecionado, produto pré-selecionado (ou nome avulso preenchido)
Passo 2: valor preenchido, forma de pagamento selecionada, PIX preenchido se aplicável
Passo 3: dia fixo selecionado, primeiro vencimento preenchido, observações preenchidas, pré-visualização
Passo 4: [✓ Salvar alterações]
  ↓
Sistema deleta parcelas antigas e gera novas → "✓ Cobrança atualizada! X parcelas regeneradas."
  ↓
Volta para a tela de Clientes (histórico do cliente)
```

### 8.4 Fluxo de Exclusão de Cobrança

```
[👥 Clientes] → Toca no card → Histórico → Toca na cobrança
  ↓
Botão [Excluir] (só aparece se nenhuma parcela foi paga ou tem pagamento parcial)
  ↓
Confirmação: "Excluir cobrança de Maria Silva? As X parcelas serão deletadas. [Confirmar] [Cancelar]"
  ↓
Deleta cobrança + parcelas + decrementa vezesUsado do produto se aplicável
→ "✓ Cobrança excluída."
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

### 8.6 Fluxo de Desfazer Pagamento Manual

No histórico do cliente, ao expandir uma cobrança e ver as parcelas, cada parcela com status `pago` ou `pago_parcial` tem um botão [↺ Desfazer pagamento].

```
[👥 Clientes] → Toca no card → Histórico → Toca na cobrança → Vê parcelas
  ↓
Botão [↺ Desfazer pagamento] na parcela
  ↓
Confirmação: "Desfazer pagamento de R$ 200 de Maria Silva? [Confirmar] [Cancelar]"
  ↓
status = pendente (ou cobrado se dataCobrancaEnviada existe)
dataPagamento = null, valorPago = null
→ A parcela volta ao Dashboard se ainda estiver no critério de exibição
```

### 8.7 Fluxo de Onboarding (Primeiro Acesso)

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

### 8.8 Fluxo de Configuração de Dias Trabalhados

```
[⚙️] na barra de navegação
  ↓
"Dias que você trabalha"
[✓ Seg] [✓ Ter] [✓ Qua] [✓ Qui] [✓ Sex] [☐ Sáb] [☐ Dom]
  ↓
[Salvar]
  ↓
Sistema salva na entidade Configuracao (singleton)
```

Default: segunda a sexta `[1,2,3,4,5]`. A usuária pode alterar a qualquer momento.

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
- [✓ Marcar pago] ao ser clicado abre menu inline com "Pagamento total" e "Pagamento parcial"

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

**Menu inline "Marcar pago":**
```
┌─────────────────────────────┐
│  Pagamento total             │
│  Pagamento parcial           │
└─────────────────────────────┘
```
Ao clicar "Pagamento total": executa imediatamente com undo toast.
Ao clicar "Pagamento parcial": abre input inline "Quanto recebeu?" com máscara de moeda.

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
│  │ Maria Silva    📱 (11) 98765... │   │
│  │ João Pereira   📱 (11) 91234... │   │
│  │ Ana Costa      📱 (11) 99876... │   │
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
│  1 parcela de R$ 200,00 vencendo em 15/08/2026 │
│                                         │
│                          [Continuar]     │
└─────────────────────────────────────────┘
```

Para parcelado (ex: 3 parcelas):
```
│  PARCELAS QUE SERÃO GERADAS             │
│  1. R$ 200,00 · 15/08/2026              │
│  2. R$ 200,00 · 10/09/2026              │
│  3. R$ 200,00 · 10/10/2026              │
```

Para mais de 6 parcelas, mostra as 5 primeiras e "+ N parcelas restantes" (expande ao tocar). A pré-visualização recalcula em tempo real se a usuária altera o dia fixo ou o primeiro vencimento.

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
│  │ 📱 (11) 98765-4321              │   │
│  │ 3 cobranças ativas              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ João Pereira           Ativo ✓  │   │
│  │ 📱 (11) 91234-5678              │   │
│  │ 2 cobranças ativas              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Ana Costa             Inativo   │   │
│  │ 📱 (11) 99876-5432              │   │
│  │ Tocar para reativar             │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Card expandido com histórico (5 recentes):**
```
┌─────────────────────────────────────────┐
│  Maria Silva                     Ativo ✓│
│  📱 (11) 98765-4321     [Editar]          │
│  Observações: Cliente desde 2024        │
│                                          │
│  COBRANÇAS (5 recentes)                  │
│  ┌─────────────────────────────────┐   │
│  │ Manutenção Mensal  R$ 600,00    │   │
│  │ PIX · 3 parcelas                │   │
│  │ P1 · R$ 200 · 15/07 · Pago ✓   │   │
│  │ P2 · R$ 200 · 10/08 · Pendente │   │
│  │ P3 · R$ 200 · 10/09 · Pendente │   │
│  │              [Editar] [Excluir] │   │
│  ├─────────────────────────────────┤   │
│  │ Consultoria  R$ 300,00          │   │
│  │ Dinheiro · À vista               │   │
│  │ Pago: 15/06/2026 ✓              │   │
│  │         [↺ Desfazer pagamento]  │   │
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

Nota: "Venda avulsa" não é um produto. É um agrupamento visual de cobranças onde `produtoServicoId = null`. A contagem "Usado 3 vezes" vem de um `COUNT` de cobranças com `produtoServicoId = null`. Não é editável nem excluível.

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

### 10.1 Pagamento parcial

**Cenário:** cliente paga R$ 100 de uma parcela de R$ 200.

**Regra:**
- `valorPago = 100`, `status = pago_parcial`
- Card no Dashboard mostra "R$ 100 de R$ 200 (pago parcial)"
- Card continua na lista de cobranças (ainda falta R$ 100)
- Mensagem de cobrança menciona o saldo: "Sua parcela de R$ 200 tem R$ 100 pendentes"

**Complemento:** cliente paga os R$ 100 restantes.
- `valorPago = 200` (100 + 100), `status = pago`, `dataPagamento = hoje`
- Card some do Dashboard

### 10.2 Cliente inativo

**Cenário:** usuária marca cliente como inativo.

**Regra:**
- Parcelas deste cliente não aparecem no Dashboard
- Parcelas continuam no histórico do cliente
- Reativação: parcelas que continuam no critério de exibição voltam ao Dashboard
- Não há exclusão de cliente — apenas inativação

### 10.3 Fim de semana

**Cenário:** parcela vence no sábado, usuária não trabalha sábados.

**Regra:** a parcela é considerada atrasada a partir de domingo (`dataVencimento < hoje`). Na segunda-feira, aparece como "Atrasada há 2 dias" em laranja. O gradiente de cores (1-3 dias laranja, 4+ vermelho) já diferencia um atraso de fim de semana (2 dias) de um atraso real (10 dias). A usuária não precisa configurar nada para que isso funcione corretamente.

### 10.4 Feriados

**Regra do MVP:** feriados não são considerados. A usuária trata feriados manualmente. Justificativa: manter uma tabela de feriados adicionaria complexidade para benefício marginal. Feriados variam por cidade e ano.

### 10.5 Cliente com cobranças em dias diferentes

**Regra:** cada cobrança tem seu próprio `diaVencimentoFixo` e `primeiroVencimento`. As parcelas das duas cobranças aparecem independentemente no Dashboard nos dias correspondentes.

### 10.6 Undo de marcação de pago

**Regra:**
- Após marcar como pago, aparece um toast: "Maria — R$ 200 pago. [Desfazer]"
- O toast fica visível por 5 segundos
- Ao clicar [Desfazer]:
  - Se o status anterior era `pendente`: volta para `pendente`, `dataPagamento = null`, `valorPago = null`
  - Se o status anterior era `cobrado`: volta para `cobrado`, `dataPagamento = null`, `valorPago = null`
  - Se o status anterior era `pago_parcial`: volta para `pago_parcial`, `dataPagamento = null`, `valorPago = {valor anterior ao complemento}`
- O sistema armazena o estado anterior em memória (frontend) no momento da ação
- O undo só funciona dentro da sessão atual e dentro dos 5 segundos
- Após 5 segundos, o toast desaparece e o undo não está mais disponível (mas a usuária pode ir no histórico e desfazer manualmente — ver seção 8.6)

**Undo em lote:** ao marcar múltiplas parcelas como pagas em lote, aparece um único toast: "3 parcelas marcadas como pagas. [Desfazer]". O botão [Desfazer] reverte todas de uma vez.

### 10.7 Cobrança com produto excluído

**Regra:** a cobrança mantém `nomeProdutoServico` (snapshot desnormalizado). A cobrança não quebra. O produto aparece na mensagem e no histórico normalmente. A referência `produtoServicoId` fica inválida mas não é usada para exibição.

Nota: a exclusão de produto é bloqueada se há cobranças referenciando (ver Entidade 2), então este caso só ocorre se o produto foi excluído antes desta regra existir (migração) ou por erro do sistema.

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
| AC-06 | Próximos 3 dias de vencimento com parcelas aparecem na seção inferior | Verificar seção "Próximos vencimentos" |
| AC-07 | Dias do enum sem parcelas não aparecem nos próximos vencimentos | Verificar que dias vazios são omitidos |
| AC-08 | Parcelas de clientes inativos não aparecem | Inativar um cliente com parcela vencendo hoje |
| AC-09 | Parcelas arquivadas não aparecem | Arquivar uma parcela |
| AC-10 | Pesquisa instantânea filtra por nome, produto ou telefone | Digitar na busca e verificar resultados |

### 11.2 Cobrança (ação do Dashboard)

| # | Critério | Como verificar |
|---|---|---|
| AC-11 | Botão "Cobrar" abre WhatsApp com mensagem formatada | Clicar e verificar mensagem |
| AC-12 | Status só muda para cobrado ao clicar "Confirmar envio" | Clicar Cobrar, verificar que status não mudou. Clicar Confirmar envio, verificar mudança |
| AC-13 | Após confirmar envio, card muda de cor | Verificar transição visual |
| AC-14 | Botão "Marcar pago" abre menu inline com "Pagamento total" e "Pagamento parcial" | Clicar e verificar menu |
| AC-15 | "Pagamento total" executa sem dialog de confirmação, com undo toast | Clicar e verificar toast por 5 segundos |
| AC-16 | "Pagamento parcial" abre input de valor com máscara de moeda | Selecionar parcial, digitar valor |
| AC-17 | Valor parcial >0 e <saldo devedor; se >= saldo, trata como total | Digitar valor igual ao saldo e verificar status=pago |
| AC-18 | Card de pago parcial mostra "R$ X de R$ Y" | Verificar exibição |
| AC-19 | Ação em lote: selecionar 2+ cards e marcar todos como pagos | Usar círculos de seleção |
| AC-20 | Undo em lote mostra toast único e desfaz todas | Clicar Desfazer no toast |
| AC-21 | Arquivar remove do Dashboard mas mantém no histórico | Arquivar e verificar histórico |
| AC-22 | Desarquivar do histórico volta ao Dashboard se critério atendido | Desarquivar e verificar |

### 11.3 Nova Cobrança

| # | Critério | Como verificar |
|---|---|---|
| AC-23 | Fluxo tem 4 passos | Verificar barra de progresso |
| AC-24 | Cliente e produto estão na mesma tela (passo 1) | Verificar passo 1 |
| AC-25 | Valor e pagamento estão na mesma tela (passo 2) | Verificar passo 2 |
| AC-26 | PIX utilizado aparece inline quando forma é PIX | Selecionar PIX e verificar campo |
| AC-27 | PIX é obrigatório quando forma é PIX | Tentar avançar sem preencher |
| AC-28 | "Boleto" não aparece nas opções de pagamento | Verificar botões (5 opções) |
| AC-29 | "Venda avulsa" exige nome mínimo de 3 caracteres | Clicar em venda avulsa, digitar 2 caracteres |
| AC-30 | Venda avulsa define produtoServicoId = null | Verificar entidade após criar |
| AC-31 | Primeiro vencimento é sugerido automaticamente | Selecionar dia fixo e verificar data sugerida |
| AC-32 | Se dia fixo = hoje, sugere hoje | Selecionar dia fixo igual ao dia atual |
| AC-33 | Pré-visualização das parcelas aparece no passo 3 (inclusive para 1 parcela) | Verificar lista de parcelas em venda à vista |
| AC-34 | Pré-visualização recalcula ao alterar dia fixo ou primeiro vencimento | Alterar e verificar atualização |
| AC-35 | Não há tela de revisão separada | Passo 4 é o botão de salvar |
| AC-36 | Após salvar, tela de sucesso oferece "Nova cobrança" e "Voltar para Hoje" | Verificar botões |
| AC-37 | Cadastro inteligente pré-preenche para cliente com 2+ cobranças com padrão | Selecionar cliente com histórico |
| AC-38 | Cadastro inteligente não sugere nada para cliente novo ou com 1 cobrança | Selecionar cliente sem histórico |
| AC-39 | Produtos aparecem ordenados por frequência de uso | Verificar ordem no autocomplete |
| AC-40 | "Recentes" mostra 5 clientes mais recentes em cobranças | Verificar lista |
| AC-41 | Valor da cobrança >0 e <=999999.99 | Tentar valor 0 e valor 1000000 |
| AC-42 | Quantidade de parcelas entre 1 e 60 | Tentar 0 e 61 |

### 11.4 Geração de Parcelas

| # | Critério | Como verificar |
|---|---|---|
| AC-43 | Venda à vista gera 1 parcela | Criar cobrança à vista |
| AC-44 | Venda parcelada gera N parcelas | Criar cobrança em 3x |
| AC-45 | Soma das parcelas é igual ao valor da cobrança | Verificar com R$ 100 em 3x |
| AC-46 | Última parcela recebe ajuste de arredondamento | R$ 100 em 3x → 33,33 + 33,33 + 33,34 |
| AC-47 | Dia 30 em fevereiro vira 28 (ou 29) | Criar parcela com dia 30 passando por fevereiro |
| AC-48 | Dia 31 em abril vira 30 | Criar parcela com dia 31 passando por abril |
| AC-49 | Primeira parcela usa primeiroVencimento | Verificar data da parcela 1 |
| AC-50 | Parcelas subsequentes usam diaVencimentoFixo | Verificar datas das parcelas 2+ |

### 11.5 Clientes

| # | Critério | Como verificar |
|---|---|---|
| AC-51 | Busca filtra por nome ou telefone em tempo real | Digitar na busca |
| AC-52 | Toque no card expande para edição inline | Tocar no card |
| AC-53 | Histórico mostra 5 cobranças recentes | Cliente com 6+ cobranças |
| AC-54 | "Ver todas" mostra lista paginada | Clicar no botão |
| AC-55 | Cliente inativo some do Dashboard mas mantém histórico | Inativar e verificar |
| AC-56 | Inativação pede confirmação | Clicar para inativar e verificar dialog |
| AC-57 | Reativação restaura parcelas no Dashboard | Reativar e verificar |
| AC-58 | Telefone armazenado apenas em dígitos com DDI | Cadastrar e verificar entidade |
| AC-59 | Telefone exibido com máscara (XX) XXXXX-XXXX | Verificar exibição |

### 11.6 Produtos

| # | Critério | Como verificar |
|---|---|---|
| AC-60 | Produtos ordenados por frequência de uso | Verificar ordem |
| AC-61 | Valor padrão é opcional | Criar produto sem valor |
| AC-62 | Toque no card permite edição inline | Tocar no card |
| AC-63 | Exclusão bloqueada se há cobranças referenciando | Tentar excluir produto em uso |
| AC-64 | "Venda avulsa" aparece como agrupamento, não como produto editável | Verificar que não tem botão editar/excluir |

### 11.7 Edição/Exclusão de Cobranças

| # | Critério | Como verificar |
|---|---|---|
| AC-65 | Editar cobrança (todas parcelas pendentes) regenera parcelas | Editar e verificar |
| AC-66 | Editar cobrança (alguma parcela cobrada) só permite observações e PIX | Tentar editar valor |
| AC-67 | Botão Editar só aparece se TODAS as parcelas têm status=pendente | Verificar histórico com parcela cobrada |
| AC-68 | Excluir cobrança sem parcelas pagas deleta tudo | Excluir e verificar |
| AC-69 | Excluir cobrança com parcela paga não é permitido | Tentar excluir |
| AC-70 | Excluir decrementa vezesUsado do produto | Verificar contador após exclusão |
| AC-71 | Desfazer pagamento manual disponível no histórico | Verificar botão na parcela paga |

### 11.8 Mensagens WhatsApp

| # | Critério | Como verificar |
|---|---|---|
| AC-72 | Mensagem de vencimento hoje usa "vence em" | Verificar mensagem |
| AC-73 | Mensagem de atrasada usa "venceu em" (passado) | Verificar mensagem |
| AC-74 | Mensagem inclui nome, produto, valor, data | Verificar campos |
| AC-75 | Mensagem inclui PIX apenas se forma é PIX e chave existe | Verificar com e sem PIX |
| AC-76 | Mensagem de pago parcial menciona saldo devedor | Verificar mensagem |
| AC-77 | Botão "Copiar mensagem" copia texto para clipboard | Clicar e colar |
| AC-78 | Link WhatsApp usa wa.me/{telefone} com telefone em dígitos | Verificar URL gerada |

### 11.9 Configuração e Onboarding

| # | Critério | Como verificar |
|---|---|---|
| AC-79 | Onboarding aparece quando não há dados | Acessar sistema zerado |
| AC-80 | Onboarding some após primeira cobrança | Criar cobrança e verificar |
| AC-81 | Configuração de dias trabalhados salva na entidade Configuracao | Salvar e verificar entidade |
| AC-82 | Default de dias trabalhados é seg-sex [1,2,3,4,5] | Verificar config inicial |

### 11.10 Confiabilidade

| # | Critério | Como verificar |
|---|---|---|
| AC-83 | Se API falha ao marcar pago, card volta à lista com toast de erro | Simular erro de API |
| AC-84 | Toast de erro tem botão "Tentar novamente" | Verificar toast |
| AC-85 | Se API falha ao criar cobrança, nenhuma parcela é criada | Simular erro na backend function |
| AC-86 | Estado intermediário de "Confirmar envio" não persiste no recarregamento | Clicar Cobrar, recarregar, verificar |

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

**Criação de cobrança e parcelas:** a criação deve ser feita via **backend function** que recebe todos os dados da cobrança, cria a cobrança e as parcelas em sequência, e se qualquer passo falhar, deleta a cobrança e quaisquer parcelas já criadas (compensação). O frontend chama a backend function em uma única requisição HTTP. Se a função retornar erro, nada foi criado. Se retornar sucesso, cobrança e parcelas foram criadas.

**Marcar como pago (ação otimista):**
1. UI remove o card imediatamente e mostra toast de undo.
2. API é chamada em background.
3. Se sucesso: nada mais acontece (o card já foi removido).
4. Se erro: o card volta à lista com animação, o toast de undo é substituído por um toast de erro: "Erro ao marcar como pago. [Tentar novamente]". O botão [Tentar novamente] reexecuta a ação.

**Cobrar (confirmar envio):**
1. UI muda a cor do card e atualiza o botão.
2. API é chamada em background.
3. Se erro: o card volta ao estado anterior e aparece toast: "Erro ao registrar cobrança enviada. [Tentar novamente]".

**Arquivar parcela:**
1. UI remove o card do Dashboard.
2. API é chamada.
3. Se erro: o card volta e aparece toast: "Erro ao arquivar. [Tentar novamente]".

**Estado intermediário "Confirmar envio":** não persistido no banco. Se a página é recarregada, o botão "Confirmar envio" desaparece e a parcela volta ao estado anterior. O status no banco só muda ao clicar explicitamente em "Confirmar envio".

---

## 13. Decisões de UX

### 13.1 Remoção do dialog de confirmação "Marcar pago"

**Decisão:** ao clicar "Marcar pago", um menu inline oferece "Pagamento total" e "Pagamento parcial". "Pagamento total" executa imediatamente com toast de undo. "Pagamento parcial" abre input de valor. Sem dialog de confirmação em nenhum caso.

**Justificativa:** em 30 dias de uso simulado, a confirmação gerou 60-80 cliques desnecessários. A ação é reversível via undo (5 segundos) ou desfazer manual no histórico.

### 13.2 Confirmação de envio de cobrança (2 cliques)

**Decisão:** o botão "Cobrar" abre o WhatsApp. Um segundo botão "Confirmar envio" aparece no card. O status só muda ao clicar neste segundo botão.

**Justificativa:** o sistema não sabe se a mensagem foi enviada. Marcar automaticamente cria status falsos. O clique extra é intencional — garante que o status reflita a realidade.

### 13.3 Gradiente visual de atraso

**Decisão:** atrasadas 1-3 dias são laranjas. Atrasadas 4+ dias são vermelhas.

**Justificativa:** o gradiente comunica urgência sem números. Vermelho = agir agora. Laranja = ficar de olho. Diferencia atraso de fim de semana (2 dias) de atraso real (10 dias) sem precisar de lógica de dias trabalhados.

### 13.4 Card muda de cor após confirmar envio

**Decisão:** após confirmar envio de cobrança atrasada, o card muda de vermelho/laranja para amarelo (cobrado).

**Justificativa:** a usuária cobra e precisa ver que o sistema registrou. A mudança de cor confirma visualmente a ação.

### 13.5 Fluxo de 4 passos (não 6)

**Decisão:** 4 passos: (1) Cliente+Produto, (2) Valor+Pagamento, (3) Vencimento, (4) Salvar.

**Justificativa:** 6 passos com transições para campos já preenchidos geram cliques inúteis. 4 passos reduzem cliques em 43% sem perda de informação.

### 13.6 "Salvar e cadastrar outra" na tela de sucesso

**Decisão:** a tela de sucesso tem dois botões: [Nova cobrança] e [Voltar para Hoje]. Sem auto-retorno.

**Justificativa:** a usuária frequentemente cadastra 2-3 vendas seguidas. O auto-retorno força navegação extra.

### 13.7 Onboarding no primeiro acesso

**Decisão:** quando o sistema está vazio (0 clientes, 0 produtos, 0 cobranças), o Dashboard mostra 3 botões grandes guiando o cadastro.

**Justificativa:** sem isso, a usuária abre um sistema vazio e não sabe por onde começar.

### 13.8 Configuração de dias trabalhados

**Decisão:** a usuária configura quais dias da semana trabalha. Persistido na entidade Configuracao.

**Justificativa:** permite personalizar a experiência. Os dias trabalhados não afetam o cálculo de atraso (que é puramente `dataVencimento < hoje`), mas a configuração existe para uso futuro (ex: notificações, relatórios) e para que a usuária sinta que o sistema "conhece" sua rotina.

### 13.9 "Venda avulsa" exige nome

**Decisão:** se a usuária não seleciona um produto, deve digitar um nome curto (mínimo 3 caracteres).

**Justificativa:** sem nome, a mensagem de WhatsApp fica com frase quebrada. O nome garante que 100% das mensagens saiam corretas.

### 13.10 PIX obrigatório quando forma é PIX

**Decisão:** se a forma de pagamento é PIX, o campo `pixUtilizado` é obrigatório.

**Justificativa:** sem a chave, a mensagem fica incompleta. Tornar obrigatório previne a mensagem quebrada.

### 13.11 Forma de pagamento na mensagem apenas quando acionável

**Decisão:** a mensagem inclui "Forma de pagamento: PIX / Chave: X" apenas quando a forma é PIX. Para as demais, a mensagem não menciona forma de pagamento.

**Justificativa:** a forma de pagamento na mensagem só tem valor quando inclui informação acionável (a chave PIX).

### 13.12 Histórico limitado a 5 recentes + ver mais

**Decisão:** o card expandido do cliente mostra as 5 cobranças mais recentes. Um botão "Ver todas (X)" abre a lista completa paginada.

**Justificativa:** para clientes ativos há 2 anos, a lista inline teria 24+ cobranças. 5 recentes cobrem 90% das consultas.

### 13.13 Menu inline para "Marcar pago"

**Decisão:** o botão [✓ Marcar pago] ao ser clicado abre um menu inline com "Pagamento total" e "Pagamento parcial".

**Justificativa:** o pagamento parcial precisa estar acessível sem adicionar um segundo botão ao card (que aumentaria a carga visual). O menu inline mantém o card limpo e oferece as duas opções.

---

## 14. Roadmap Futuro

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
- `[Valor]` e `[ValorTotal]` = `valor` da parcela (formatado em moeda)

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

## 17. Verificação de Consistência Final

| Verificação | Status |
|---|---|
| Nenhuma referência ao campo `parcelado` (removido) | ✓ Conformidade |
| Nenhuma referência a `boleto` no enum de pagamento | ✓ Conformidade |
| Nenhuma referência a `dataLimite` (regra de atraso simplificada) | ✓ Conformidade |
| Nenhuma referência a "tolerância de fim de semana" no atraso | ✓ Conformidade |
| Todas as seções referenciam a convenção de valores em reais | ✓ Conformidade |
| Todas as seções referenciam datas em YYYY-MM-DD sem hora | ✓ Conformidade |
| Entidade Configuracao referenciada em Settings e hooks | ✓ Conformidade |
| `useConfig.ts` presente na estrutura de hooks | ✓ Conformidade |
| Backend function referenciada para criação de cobrança | ✓ Conformidade |
| Venda avulsa descrita consistentemente (null, não-produto) | ✓ Conformidade |
| `vezesUsado` tem regra completa de ciclo de vida | ✓ Conformidade |
| Menu inline "Marcar pago" descrito em wireframe e fluxo | ✓ Conformidade |
| Undo em lote descrito em fluxo e caso especial | ✓ Conformidade |
| Desfazer manual descrito em fluxo (8.6) e caso especial (10.6) | ✓ Conformidade |
| Nenhum conflito entre seções 7.3 e 10.3 (ambas usam `dataVencimento < hoje`) | ✓ Conformidade |
| Critérios de aceitação cobrem todas as regras novas | ✓ Conformidade |
| Nenhuma funcionalidade nova adicionada além das correções | ✓ Conformidade |

---

## Fim do Documento

Este PRD v2.0 é a única fonte de verdade para o desenvolvimento. Substitui integralmente a v1.0. Qualquer mudança de escopo durante o desenvolvimento deve atualizar este documento com nova versão e data.
