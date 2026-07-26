# Revisão Técnica do PRD — Visão de Desenvolvedor Sênior

**Documento revisado:** PRD-sistema-cobranca.md (v1.0)
**Revisor:** Desenvolvedor Sênior (simulado)
**Objetivo:** Eliminar ambiguidades, contradições e lacunas que gerariam interpretações diferentes entre desenvolvedores.

---

## Categoria A — Tipagem e Formato de Dados

### A1. Precisão de valores monetários não especificada

**Problema:** Os campos `valor` (Cobranca), `valorPadrao` (ProdutoServico), `valor` e `valorPago` (Parcela) são definidos como `number` sem especificar precisão. Um desenvolvedor pode armazenar em reais (200.00) e outro em centavos (20000). A aritmética de parcelas e o arredondamento dependem disso.

**Redação proposta — adicionar na seção 6, antes da Entidade 1:**

> **Convenção de valores monetários:** Todos os campos monetários (`valor`, `valorPadrao`, `valorPago`) são armazenados como `number` em reais com 2 casas decimais (ex: R$ 200,00 = `200.00`). Não usar centavos inteiros. O arredondamento sempre usa `Math.floor(valor * 100) / 100` para garantir truncate em 2 casas.

---

### A2. `date` vs `datetime` não diferenciado

**Problema:** Os campos `primeiroVencimento` (Cobranca), `dataVencimento`, `dataPagamento`, `dataCobrancaEnviada` (Parcela) são todos `date`. Um desenvolvedor pode usar timestamp com hora (ISO 8601 completo) ou data pura (YYYY-MM-DD). Se usar datetime em UTC, um pagamento registrado às 22:00 no Brasil (UTC-3) seria armazenado como 01:00 do dia seguinte, quebrando a lógica de "hoje".

**Redação proposta — adicionar na seção 6:**

> **Convenção de datas:** Todos os campos do tipo `date` armazenam apenas a data (YYYY-MM-DD), sem hora e sem timezone. As comparações de "hoje", "atrasado" e "vencimento" usam a data local da usuária (America/Sao_Paulo, UTC-3). Ao criar um `date`, sempre zerar as horas (`new Date(year, month, day)`). Nunca usar `new Date().toISOString()` para datas de vencimento/pagamento.

---

### A3. Formato do telefone não definido

**Problema:** O campo `telefone` é descrito como "texto puro, sem formatação" mas não especifica o formato exato. Pode ser "11987654321", "11 98765-4321", "+5511987654321", ou "5511987654321". O link `wa.me/` exige o formato internacional com DDI (55) + DDD + número, sem espaços ou símbolos. Sem padrão definido, o `whatsapp.service.ts` não saberá como formatar.

**Redação proposta — substituir a decisão de `telefone` na Entidade 1:**

> `telefone` é string armazenada no formato: DDI + DDD + número, apenas dígitos, sem espaços ou símbolos. Exemplo: "5511987654321". A máscara "(11) 98765-4321" é aplicada apenas na exibição pelo `format.utils.ts`. A validação no cadastro exige mínimo de 12 dígitos (55 + DDD de 2 + número de 8) e máximo de 13 (55 + DDD de 2 + número de 9). O link WhatsApp é gerado como `wa.me/{telefone}` diretamente, sem transformação.

---

### A4. `diaVencimentoFixo` — enum values não formalizados

**Problema:** O campo `diaVencimentoFixo` em Cobranca é descrito como `enum` mas os valores válidos não estão listados na tabela da entidade. Estão mencionados em `days.config.ts` e no wireframe, mas um desenvolvedor lendo apenas a seção 6 não saberia quais valores são válidos.

**Redação proposta — adicionar após a tabela da Entidade 3:**

> **Enum `diaVencimentoFixo`:** valores válidos são `5`, `10`, `15`, `20`, `25`, `30` (números inteiros). Não existe dia 31. O seletor de UI sempre mostra exatamente estas 6 opções. O `days.config.ts` exporta o array `[5, 10, 15, 20, 25, 30]` como única fonte de verdade para estes valores.

---

### A5. `produtoServicoId` quando venda avulsa não definido

**Problema:** Quando a usuária escolhe "Venda avulsa" e digita um nome livre, não está explicitado se `produtoServicoId` é `null` ou se um ProdutoServico é criado implicitamente. O wireframe da tela de Produtos mostra "Venda avulsa · Usado 3 vezes", sugerindo que é um produto registrado — mas o fluxo de cobrança trata como texto livre.

**Redação proposta — adicionar na seção 7.1 ou criar subseção 7.10:**

> **Venda avulsa:** quando a usuária não seleciona um produto cadastrado, ela digita um nome curto (mínimo 3 caracteres). Neste caso: `produtoServicoId = null` (nenhum ProdutoServico é criado ou atualizado), `nomeProdutoServico = texto digitado`, `vezesUsado` não é incrementado (não há produto para incrementar). O texto "Venda avulsa" que aparece na tela de Produtos NÃO é um produto do sistema — é um agrupamento visual de cobranças onde `produtoServicoId = null`. A contagem "Usado 3 vezes" vem de um `COUNT` de cobranças com `produtoServicoId = null`, não do campo `vezesUsado`.

---

## Categoria B — Lógica de Parcelas

### B1. Aritmética de meses não especificada

**Problema:** A regra diz "mês = mês de cobranca.primeiroVencimento + (i - 1) meses" mas não define o comportamento quando o dia do mês não existe. O PRD trata o caso de fevereiro (dia 30 → último dia) mas não define o caso geral. Se `primeiroVencimento = 31/01/2026` e `diaVencimentoFixo = 30`, a parcela 2 seria 30/02 (existe a regra) mas e a parcela 3? 30/03 (existe). E se `primeiroVencimento = 31/01` e `diaVencimentoFixo = 31`? Fevereiro não tem 31 → vira 28/02? Março tem 31 → 31/03?

**Redação proposta — substituir o parágrafo de "Tratamento de fevereiro" na seção 7.1:**

> **Tratamento de meses curtos (regra geral):** ao calcular o vencimento de uma parcela, se o `diaVencimentoFixo` não existir no mês alvo, usar o **último dia do mês**. Exemplos:
> - Dia 30 em fevereiro (28 dias) → 28/02
> - Dia 30 em fevereiro bissexto (29 dias) → 29/02
> - Dia 31 em abril (30 dias) → 30/04
> - Dia 31 em fevereiro → 28/02 (ou 29 em bissexto)
>
> Implementação: `new Date(ano, mesAlvo, diaVencimentoFixo)`. Se a data resultante tiver `getDate() != diaVencimentoFixo` (JavaScript ajusta automaticamente para o mês seguinte quando o dia não existe), usar `new Date(ano, mesAlvo + 1, 0)` que retorna o último dia do mês alvo.

---

### B2. Redundância entre `parcelado` e `quantidadeParcelas`

**Problema:** A Cobranca tem `parcelado` (boolean) e `quantidadeParcelas` (number). Se `quantidadeParcelas = 1`, logicamente `parcelado = false`. Ter ambos cria risco de inconsistência (ex: `parcelado = true, quantidadeParcelas = 1`). Não há regra de validação entre eles.

**Redação proposta — remover o campo `parcelado` da Entidade 3 e adicionar nota:**

> **Campo `parcelado` removido.** A informação de parcelamento é derivada de `quantidadeParcelas`: se `quantidadeParcelas = 1` → à vista; se `quantidadeParcelas > 1` → parcelado. Remover o campo boolean `parcelado` da entidade Cobranca. Na UI, o toggle "À Vista / Parcelado" controla apenas a exibição do seletor de parcelas. Ao salvar: à vista grava `quantidadeParcelas = 1`; parcelado grava `quantidadeParcelas = N`. O toggle nunca é persistido separadamente.

**Tabela atualizada da Entidade 3 — remover linha `parcelado`:**

| Campo | Tipo | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `quantidadeParcelas` | number | sim | 1 | 1 = à vista; >1 = parcelado |

---

### B3. Status da parcela regenerada após edição não definido

**Problema:** A seção 7.5 diz que ao editar uma cobrança sem parcelas pagas, o sistema "regenera todas as parcelas". Mas não define o que acontece com o status e a `dataCobrancaEnviada` das parcelas que já existiam. Se a usuária cobrou a parcela 1 (status = cobrado, dataCobrancaEnviada = ontem) e depois edita a cobrança, a parcela regenerada volta para `pendente`? Perde o histórico de cobrança?

**Redação proposta — adicionar na seção 7.5:**

> **Comportamento da regeneração:** ao regenerar parcelas, as parcelas antigas são **deletadas** e novas parcelas são criadas com `status = pendente`, `valorPago = null`, `dataPagamento = null`, `dataCobrancaEnviada = null`. O histórico de cobrança enviada é perdido. Esta é a行为 esperada: a usuária só pode editar cobranças onde nenhuma parcela foi paga (ou parcialmente paga), indicando que a cobrança ainda não está em andamento real. Se alguma parcela foi cobrada, a edição é limitada a campos que não afetam parcelas.

> **Adicionar validação extra na regra de edição:** a edição com regeneração só é permitida se TODAS as parcelas têm `status = pendente` (não `cobrado`, não `pago_parcial`). Se alguma parcela foi cobrada mas não paga, a edição é limitada (observações e PIX apenas). Justificativa: se a usuária já enviou a cobrança ao cliente com valores/datas específicos, regenerar as parcelas mudaria os dados que o cliente já recebeu.

---

### B4. `vezesUsado` — comportamento em edição e exclusão não definido

**Problema:** O campo `vezesUsado` em ProdutoServico é incrementado a cada nova cobrança. Mas o PRD não define: é decrementado quando a cobrança é excluída? É ajustado quando a cobrança é editada e o produto muda? O produto antigo perde 1 e o novo ganha 1?

**Redação proposta — adicionar na seção 7.7:**

> **Ciclo de vida do `vezesUsado`:**
> - **Criar cobrança** com `produtoServicoId != null`: incrementa `vezesUsado` do produto.
> - **Excluir cobrança** com `produtoServicoId != null`: decrementa `vezesUsado` do produto (mínimo 0).
> - **Editar cobrança** mudando de produto A para produto B: decrementa A, incrementa B.
> - **Editar cobrança** mudando de produto A para venda avulsa: decrementa A.
> - **Editar cobrança** mudando de venda avulsa para produto B: incrementa B.
> - **Venda avulsa** (produtoServicoId = null): não incrementa nem decrementa nada.

---

## Categoria C — Atrasados e Dias Trabalhados

### C1. Definição de `dataLimite` é ambígua e contraditória

**Problema:** A seção 7.3 diz: `dataLimite = o dia de trabalho mais recente anterior a hoje`. Mas "anterior a hoje" exclui hoje. Se hoje é terça (dia trabalhado), `dataLimite = segunda`. Uma parcela que venceu hoje (terça) teria `dataVencimento (terça) < dataLimite (segunda) = false` → não atrasada. Correto. Mas uma parcela que venceu segunda: `dataVencimento (segunda) < dataLimite (segunda) = false` → não atrasada. Errado — venceu ontem e não foi paga, deveria ser atrasada.

A seção 10.4 diz ainda: "Só vira atrasada se não for resolvida até o final do próximo dia trabalhado", o que sugere que a parcela tem um dia de tolerância. Mas 7.3 não menciona tolerância.

**Redação proposta — substituir integralmente a seção 7.3:**

> ### 7.3 Cálculo de Atrasados (Dias Trabalhados)
>
> **Configuração:** a usuária define quais dias da semana trabalha. Default: segunda a sexta. Armazenado como um array de inteiros de 0 (domingo) a 6 (sábado). Ex: `[1, 2, 3, 4, 5]` = seg-sex.
>
> **Definição de atrasado:**
>
> Uma parcela está **atrasada** quando:
> 1. `status IN (pendente, cobrado, pago_parcial)`
> 2. `arquivada = false`
> 3. `dataVencimento < hoje`
>
> A comparação é estritamente de **data** (sem hora), na timezone da usuária (America/Sao_Paulo).
>
> **O papel dos dias trabalhados:** os dias trabalhados NÃO afetam a definição de atrasado. Eles afetam apenas a **exibição no Dashboard**:
>
> - Se hoje é um dia trabalhado: o Dashboard mostra todas as parcelas que vencem hoje + todas as atrasadas.
> - Se hoje NÃO é um dia trabalhado (sábado/domingo): o Dashboard mostra as parcelas que vencem hoje (sem destacá-las como atrasadas, mesmo que `dataVencimento < hoje`) e mostra as atrasadas reais (vencidas em dias trabalhados anteriores não resolvidas). Na prática, a usuária provavelmente não abre o sistema em dias não trabalhados, então este caso é raro.
>
> **Dias de atraso exibidos:** `diasAtraso = hoje - dataVencimento` em dias corridos. Se a parcela venceu no sábado e hoje é segunda, `diasAtraso = 2`. O card mostra "Atrasada há 2 dias".
>
> **Gradiente visual:**
> - 1-3 dias: laranja
> - 4+ dias: vermelho
>
> **Removida a regra de tolerância.** A seção 10.4 é substituída por esta. Não há tolerância de "próximo dia trabalhado". A parcela está atrasada quando `dataVencimento < hoje`, independente de fins de semana. O que muda é apenas o destaque visual: parcelas que venceram no fim de semana aparecem na segunda como atrasadas há 1-2 dias (laranja), não como atrasadas há muito tempo (vermelho). O gradiente natural do tempo já comunica a urgência sem precisar de lógica complexa de dias trabalhados.

**Redação proposta — substituir a seção 10.4:**

> ### 10.4 Fim de semana
>
> **Cenário:** parcela vence no sábado, usuária não trabalha sábados.
>
> **Regra:** a parcela é considerada atrasada a partir de domingo (`dataVencimento < hoje`). Na segunda-feira, quando a usuária abre o sistema, a parcela aparece como "Atrasada há 2 dias" em laranja. Não há tratamento especial para fins de semana — o gradiente de cores (1-3 dias laranja, 4+ vermelho) já diferencia um atraso de fim de semana (2 dias, laranja) de um atraso real (10 dias, vermelho). A usuária não precisa configurar nada para que isso funcione corretamente.

---

### C2. Onde os dias trabalhados são persistidos não definido

**Problema:** A configuração de dias trabalhados precisa ser persistida, mas o PRD não diz onde. Não é uma entity (não está na modelagem). Pode ser localStorage, user settings, ou uma entity de configuração.

**Redação proposta — adicionar na seção 6 uma quinta entidade ou definir como configuração local:**

> ### Entidade 5 — `Configuracao` (singleton)
>
> Armazena configurações do sistema. Existe um único registro por usuário.
>
> | Campo | Tipo | Obrigatório | Default | Descrição |
> |---|---|---|---|---|
> | `diasTrabalhados` | array de int (0-6) | não | [1,2,3,4,5] | Dias da semana trabalhados (0=Dom, 6=Sáb) |
>
> **Implementação:** criar como entity com RLS. O hook `useConfig` carrega o único registro. Se não existir, cria com defaults. A tela de Settings edita este registro.

---

### C3. "Próximos vencimentos" — definição de "próximo" ambígua

**Problema:** O Dashboard mostra "Próximos vencimentos" com 3 linhas. Mas não define: são os próximos 3 dias do enum `[5, 10, 15, 20, 25, 30]` que têm parcelas? Ou os próximos 3 dias cronologicamente com parcelas? Se hoje é dia 6, os próximos dias do enum são 10, 15, 20. Mas e se o dia 10 não tem nenhuma parcela? Mostra "Dia 10 · 0 cobranças · R$ 0"? Ou pula para o próximo dia com parcelas?

**Redação proposta — adicionar na seção 8.1 ou 7.4:**

> **Próximos vencimentos:** mostra os próximos 3 dias do enum `[5, 10, 15, 20, 25, 30]` (cronologicamente após hoje) que têm **pelo menos 1 parcela não paga e não arquivada**. Dias sem parcelas não aparecem. Se hoje é dia 6 e o dia 10 tem 0 parcelas, o sistema mostra o dia 15 como primeiro, dia 20 como segundo, dia 25 como terceiro. Se houver menos de 3 dias futuros com parcelas, mostra apenas os que existem. A contagem inclui parcelas com status `pendente`, `cobrado` e `pago_parcial`. Cada linha mostra: dia do vencimento, quantidade de parcelas e soma dos valores.

---

## Categoria D — Status e Transições

### D1. Undo de `pago` para `pago_parcial` não coberto

**Problema:** A seção 10.7 diz que ao desfazer um `pago`, o status volta para `pendente` (ou `cobrado`) e `valorPago = null`. Mas se a parcela era `pago_parcial` antes de ser marcada como `pago` (o usuário complementou o pagamento), desfazer deveria voltar para `pago_parcial` com `valorPago` anterior. A regra atual zera `valorPago`, perdendo o histórico do pagamento parcial.

**Redação proposta — substituir a regra de undo na seção 10.7:**

> - Ao clicar [Desfazer]:
>   - Se o status anterior era `pendente`: volta para `pendente`, `dataPagamento = null`, `valorPago = null`
>   - Se o status anterior era `cobrado`: volta para `cobrado`, `dataPagamento = null`, `valorPago = null`
>   - Se o status anterior era `pago_parcial`: volta para `pago_parcial`, `dataPagamento = null`, `valorPago = {valor anterior ao complemento}`
> - O sistema armazena o estado anterior em memória (frontend) no momento da ação. O undo só funciona dentro da sessão atual e dentro dos 5 segundos. Após 5 segundos, o toast desaparece. Para desfazer após isso, a usuária vai no histórico do cliente, encontra a parcela, e clica em "Desfazer pagamento" (ação manual disponível no card expandido da parcela).

---

### D2. "Desfazer pagamento" manual não especificado

**Problema:** A seção 10.7 menciona que "a usuária pode ir no histórico e desfazer manualmente" mas não define como isso funciona na interface. Onde está o botão? Qual o fluxo?

**Redação proposta — adicionar na seção 8 ou 9:**

> **Desfazer pagamento manual (histórico do cliente):** no histórico do cliente, ao expandir uma cobrança e ver as parcelas, cada parcela com status `pago` ou `pago_parcial` tem um botão pequeno [↺ Desfazer pagamento]. Ao clicar:
> 1. Se `pago`: volta para `pendente` (ou `cobrado` se `dataCobrancaEnviada` existe), `dataPagamento = null`, `valorPago = null`.
> 2. Se `pago_parcial`: volta para `pendente` (ou `cobrado`), `dataPagamento = null`, `valorPago = null`.
> 3. Confirmação: "Desfazer pagamento de R$ 200 de Maria Silva? [Confirmar] [Cancelar]"
> 4. A parcela volta ao Dashboard se ainda estiver dentro do critério de exibição.

> **Diferença do undo do toast:** o undo do toast é sem confirmação (ação rápida). O desfazer manual tem confirmação porque é uma ação deliberada com mais potencial de confusão (a usuária pode ter clicado por engano).

---

### D3. "Confirmar envio" — persistência do estado intermediário não definida

**Problema:** Após clicar "Cobrar", o WhatsApp abre e o card mostra um botão "Confirmar envio". Se a usuária fecha o navegador sem clicar em "Confirmar envio", o que acontece? Ao reabrir, o botão "Confirmar envio" ainda está lá? Ou resetou?

**Redação proposta — adicionar na seção 7.2:**

> **Estado intermediário "aguardando confirmação de envio":** este estado não é persistido no banco. É puramente de UI (estado do componente do card). Se a usuária recarrega a página, o botão "Confirmar envio" desaparece e a parcela volta ao estado anterior (`pendente` ou `atrasado`). O status no banco só muda quando a usuária clica em "Confirmar envio". Se ela clicou "Cobrar" mas não confirmou e recarregou, o sistema não sabe que ela enviou — e isso é correto: se não confirmou, o sistema não deve assumir que enviou.

---

### D4. Validação do valor de pagamento parcial não definida

**Problema:** Ao marcar pagamento parcial, a usuária digita um valor. O PRD não define: o que acontece se o valor é maior que o valor da parcela? Se é zero? Se é negativo?

**Redação proposta — adicionar na seção 10.2:**

> **Validação do valor parcial:**
> - O valor digitado deve ser maior que 0 e menor que (`valor - valorPago`).
> - Se o valor digitado for >= (`valor - valorPago`): trata como pagamento total, não parcial. `status = pago`, `valorPago = valor`, `dataPagamento = hoje`.
> - Se o valor digitado for <= 0: o input não aceita e mostra mensagem inline "Digite um valor maior que zero".
> - O input aceita no máximo 2 casas decimais. Máscara automática de moeda.

---

### D5. Ação em lote — undo não especificado

**Problema:** Quando a usuária seleciona 3 parcelas e clica "Marcar todas como pagas", aparece um toast de undo? Se sim, desfaz todas ou uma por vez?

**Redação proposta — adicionar na seção 8.1:**

> **Undo em lote:** ao marcar múltiplas parcelas como pagas em lote, aparece um único toast: "3 parcelas marcadas como pagas. [Desfazer]". O botão [Desfazer] reverte todas as 3 de uma vez. Se o usuário não clicar em 5 segundos, o toast desaparece e as 3 marcações ficam permanentes (até desfazer manual).

---

### D6. Arquivamento por cobrança vs por parcela não claro

**Problema:** O arquivamento é definido por parcela (flag `arquivada` na entidade Parcela). Mas a simulação de uso fala em "arquivar cobrança". Se uma cobrança tem 3 parcelas e a usuária quer arquivar tudo, ela precisa arquivar 3 parcelas individualmente?

**Redação proposta — adicionar na seção 7.6:**

> **Granularidade do arquivamento:** o arquivamento é por **parcela**, não por cobrança. Se uma cobrança tem 3 parcelas e a usuária quer arquivar todas, ela arquiva cada parcela individualmente no card expandido de cada uma. No Dashboard, o botão [Arquivar] aparece no card expandido de cada parcela atrasada.
>
> **Justificativa:** a parcela é a unidade que aparece no Dashboard. Arquivar por cobrança exigiria definir o que acontece com parcelas já pagas da mesma cobrança — complexidade sem benefício. A usuária arquiva o que ela não vai mais cobrar: parcelas individuais.

---

## Categoria E — Fluxos e Interface

### E1. "Marcar parcial" — onde está o botão?

**Problema:** O fluxo do Dashboard menciona "[✓ Marcar parcial]" mas o wireframe do card mostra apenas [💬 Cobrar] e [✓ Marcar pago]. Não há botão "Marcar parcial" visível. O usuário não sabe como acessar esta funcionalidade.

**Redação proposta — adicionar na descrição do card na seção 9:**

> **Botões do card (estado colapsado):**
> - [💬 Cobrar] — abre WhatsApp
> - [✓ Marcar pago] — menu dropdown com 2 opções: "Pagamento total" e "Pagamento parcial"
>
> Ao clicar em [✓ Marcar pago], abre um pequeno menu inline com as duas opções. "Pagamento total" executa imediatamente com undo toast. "Pagamento parcial" abre o input de valor inline.
>
> No card expandido, os botões [💬 Cobrar] e [✓ Marcar pago] continuam visveis, e o menu de "Marcar parcial" também está acessível.

---

### E2. Contador do Dashboard conta "cobranças" mas lista parcelas

**Problema:** O Dashboard diz "5 cobranças" mas a query retorna parcelas. Se um cliente tem uma cobrança em 3x e todas as 3 parcelas vencem hoje, o contador mostra "3 cobranças" ou "1 cobrança (3 parcelas)"? A terminologia confunde o desenvolvedor sobre o que contar.

**Redação proposta — padronizar a terminologia em todo o documento:**

> **Terminologia padronizada:** o Dashboard conta e exibe **parcelas**, não cobranças. O contador "5 cobranças" deve ser lido como "5 parcelas". Alterar todos os textos da UI para usar "parcela" ou o termo genérico "cobrança" (que no contexto do Dashboard significa "parcela a cobrar"). No código, as queries e contadores sempre operam sobre a entidade Parcela.
>
> **Redação do contador:** "X cobranças · R$ Y,ZZ · Z atrasadas" onde X = número de parcelas do dia (hoje + atrasadas), Y = soma dos valores dessas parcelas, Z = número de parcelas atrasadas. O termo "cobrança" na UI é intencionalmente genérico para a usuária — ela não sabe o que é uma "parcela", mas entende "cobrança" como "alguém que preciso cobrar".

---

### E3. Fluxo de edição de cobrança não detalhado

**Problema:** A seção 8.3 diz "Abre o fluxo de Nova Cobrança com campos preenchidos" mas não especifica se o usuário percorre os mesmos 4 passos ou se há uma tela de edição diferente. O fluxo de Nova Cobrança tem autocompletes e pré-visualização de parcelas — a edição usa os mesmos componentes?

**Redação proposta — substituir a seção 8.3:**

> ### 8.3 Fluxo de Edição de Cobrança
>
> A edição reutiliza os mesmos 4 passos do fluxo de Nova Cobrança, com todos os campos pré-preenchidos com os dados atuais da cobrança. O título da tela muda de "Nova Cobrança" para "Editar Cobrança". O botão final muda de "✓ Confirmar cobrança" para "✓ Salvar alterações".
>
> ```
> [👥 Clientes] → Toca no card do cliente → Histórico expande
>   ↓
> Toca na cobrança que quer editar → Cobrança expande mostrando parcelas
>   ↓
> Botão [Editar] (só aparece se nenhuma parcela tem status != pendente)
>   ↓
> Passo 1: cliente pré-selecionado, produto pré-selecionado (ou nome avulso preenchido)
> Passo 2: valor preenchido, forma de pagamento selecionada, PIX preenchido se aplicável
> Passo 3: dia fixo selecionado, primeiro vencimento preenchido, observações preenchidas, pré-visualização de parcelas
> Passo 4: [✓ Salvar alterações]
>   ↓
> Sistema deleta parcelas antigas e gera novas → "✓ Cobrança atualizada! X parcelas regeneradas."
>   ↓
> Volta para a tela de Clientes (historico do cliente)
> ```

---

### E4. `nomeProdutoServico` — editável em cobrança com parcela paga?

**Problema:** A seção 7.5 diz que cobranças com parcela paga só permitem editar `observacoes` e `pixUtilizado`. Mas `nomeProdutoServico` não é mencionado. Pode ser editado ou não?

**Redação proposta — adicionar na seção 7.5:**

> **Campos editáveis quando há parcela paga:** `observacoes` e `pixUtilizado` apenas. Os campos `nomeProdutoServico`, `valor`, `quantidadeParcelas`, `primeiroVencimento`, `diaVencimentoFixo`, `formaPagamento`, `clienteId`, `produtoServicoId` são **somente leitura**.

---

### E5. Sugestão de primeiro vencimento — "já passou" é ambíguo

**Problema:** A seção 7.9 diz "Se o dia fixo já passou neste mês → sugere o próximo mês". Se hoje é dia 10 e o dia fixo é 10, "já passou"? Ou "é hoje"? Isso determina se a sugestão é para hoje ou para o próximo mês.

**Redação proposta — substituir a seção 7.9:**

> ### 7.9 Sugestão de Primeiro Vencimento
>
> Ao selecionar o `diaVencimentoFixo`, o sistema calcula o `primeiroVencimento` sugerido:
>
> - Se hoje é o dia `D` e o dia fixo escolhido é `D`: sugere **hoje** (a cobrança vence hoje).
> - Se o dia fixo escolhido é maior que hoje: sugere o dia fixo **deste mês**.
> - Se o dia fixo escolhido é menor que hoje: sugere o dia fixo do **próximo mês**.
> - Se hoje é dia 28 e o dia fixo é 30: sugere 30 deste mês.
> - Se hoje é dia 31 e o dia fixo é 30: sugere 30 do próximo mês (30 já passou).
>
> A usuária pode alterar a data. A regra é: `primeiroVencimento = próxima ocorrência do diaVencimentoFixo a partir de hoje (inclusive)`.

---

### E6. PIX autocomplete — origem dos dados não definida

**Problema:** O fluxo de Nova Cobrança diz que o campo PIX tem "autocomplete dos PIX já usados". Mas de onde vêm esses dados? Não há uma entidade de PIX. É um distinct de `pixUtilizado` em cobranças existentes?

**Redação proposta — adicionar na seção 7.8 ou 8.2:**

> **Autocomplete de PIX:** o autocomplete busca valores distintos de `pixUtilizado` em todas as cobranças existentes onde `formaPagamento = pix` e `pixUtilizado != null`. Ordenado por frequência (mais usado primeiro). A query é um `aggregate` na entidade Cobranca: `$group` por `pixUtilizado`, `$sum: 1`, ordenar por contagem descendente. O autocomplete mostra no máximo 5 sugestões.

---

### E7. Cadastro inteligente — cliente sem histórico não tratado

**Problema:** A seção 7.8 diz que o sistema busca as últimas 3 cobranças do cliente. Se o cliente é novo (0 cobranças), não há sugestões. Isso não é explicitado.

**Redação proposta — adicionar na seção 7.8:**

> Se o cliente tem 0 cobranças (cliente novo), nenhuma sugestão é feita. Todos os campos começam vazios/com defaults. Se o cliente tem 1 cobrança, não há padrão a inferir (precisa de 2+ para identificar padrão), então nenhuma sugestão é feita. A regra "2+ cobranças usaram o mesmo X" exige no mínimo 2 cobranças com o mesmo valor para acionar a sugestão.

---

## Categoria F — Transações e Confiabilidade

### F1. Atomicidade da criação de cobrança + parcelas não implementável como descrita

**Problema:** A seção 12.5 diz "Se API falha ao criar cobrança, nenhuma parcela é criada (transação atômica)". Mas o sistema usa entities da Base44, que não suportam transações ACID multi-entity. A criação da cobrança e das parcelas são chamadas separadas. Se a cobrança é criada mas a criação da primeira parcela falha, fica uma cobrança órfã sem parcelas.

**Redação proposta — substituir o item na seção 12.5:**

> **Criação de cobrança e parcelas:** a criação deve ser feita via **backend function** que recebe todos os dados da cobrança, cria a cobrança e as parcelas em sequência, e se qualquer passo falhar, deleta a cobrança e quaisquer parcelas já criadas (compensação). O frontend chama a backend function em uma única requisição HTTP. Se a função retornar erro, nada foi criado. Se retornar sucesso, cobrança e parcelas foram criadas.
>
> Alternativamente, se não for viável criar uma backend function, a cobrança deve ser criada primeiro e as parcelas em seguida. Se a criação de parcelas falhar, o frontend deve tentar novamente (retry com exponencial backoff, máximo 3 tentativas). Se ainda falhar, a cobrança fica sem parcelas e um toast de erro aparece: "Erro ao criar parcelas. Tente novamente." com um botão "Tentar criar parcelas" que reexecuta apenas a criação das parcelas. A cobrança sem parcelas não aparece no Dashboard (não há parcelas para exibir).

---

### F2. Ação otimista — comportamento em falha não especificado para cobrança

**Problema:** A seção 12.5 diz que se a API falha ao marcar como pago, o card volta à lista com toast de erro. Mas o comportamento exato não é definido: o toast diz o quê? Quanto tempo fica? Tem botão de retry?

**Redação proposta — substituir os itens de confiabilidade na seção 12.5:**

> ### 12.5 Confiabilidade
>
> **Marcar como pago (ação otimista):**
> 1. UI remove o card imediatamente e mostra toast de undo.
> 2. API é chamada em background.
> 3. Se sucesso: nada mais acontece (o card já foi removido).
> 4. Se erro: o card volta à lista com animação, o toast de undo é substituído por um toast de erro: "Erro ao marcar como pago. [Tentar novamente]". O botão [Tentar novamente] reexecuta a ação.
>
> **Cobrar (confirmar envio):**
> 1. UI muda a cor do card e atualiza o botão.
> 2. API é chamada em background.
> 3. Se erro: o card volta ao estado anterior e aparece toast: "Erro ao registrar cobrança enviada. [Tentar novamente]".
>
> **Criar cobrança:** ver seção F1 acima.
>
> **Arquivar parcela:**
> 1. UI remove o card do Dashboard.
> 2. API é chamada.
> 3. Se erro: o card volta e aparece toast: "Erro ao arquivar. [Tentar novamente]".

---

## Categoria G — Lacunas Menores

### G1. Exclusão de produto não definida

**Problema:** O PRD não menciona o que acontece quando a usuária exclui um produto que está referenciado por cobranças. A seção 10.8 diz que a cobrança mantém o `nomeProdutoServico` (snapshot), mas não define se a exclusão de produto é permitida.

**Redação proposta — adicionar na seção 7.7 ou 10:**

> **Exclusão de produto:** não é permitida se o produto está referenciado por alguma cobrança (`produtoServicoId != null` em Cobranca). O sistema mostra mensagem: "Este produto está em uso em X cobranças e não pode ser excluído." Se não há cobranças referenciando, a exclusão é permitida e deleta o produto. Não há "inativação" de produto — apenas exclusão.

---

### G2. Exclusão de cliente não definida

**Problema:** O PRD diz "Não há exclusão de cliente — apenas inativação" (seção 10.3) mas não define se a inativação tem confirmação e o que acontece com cobranças ativas (parcelas futuras não vencidas).

**Redação proposta — adicionar na seção 10.3:**

> **Inativação de cliente:**
> - Confirmação: "Inativar Maria Silva? Suas cobranças não aparecerão no Dashboard. [Confirmar] [Cancelar]"
> - Efeito: `ativo = false`. Parcelas pendentes/futuras não aparecem no Dashboard. Parcelas atrasadas também não aparecem.
> - Reativação: `ativo = true`. Todas as parcelas que continuam no critério de exibição do Dashboard voltam.
> - O histórico do cliente é sempre acessível, independente do status.

---

### G3. Validação mínima de campos na cobrança

**Problema:** O PRD define `nome` e `telefone` como obrigatórios no Cliente, mas não define validações para a Cobrança. Qual é o valor mínimo de `valor`? Pode ser 0? Negativo? Qual o máximo de `quantidadeParcelas`?

**Redação proposta — adicionar na seção 7.1 ou 8.2:**

> **Validações da cobrança:**
> - `valor`: número positivo maior que 0. Máximo: R$ 999.999,99.
> - `quantidadeParcelas`: inteiro entre 1 e 60.
> - `primeiroVencimento`: data válida, não anterior a hoje. (Permitir cadastrar cobrança com primeiro vencimento no passado? **Sim**, porque a usuária pode estar registrando uma venda que já ocorreu. Mas o sistema alerta visualmente se a data é no passado.)
> - `pixUtilizado`: obrigatório e não vazio se `formaPagamento = pix`.
> - `nomeProdutoServico`: obrigatório, mínimo 3 caracteres. Se produto selecionado, vem do nome do produto. Se venda avulsa, vem do input.

---

### G4. "Recentes" no autocomplete — quantos e baseado em quê?

**Problema:** O autocomplete de cliente mostra "Recentes" no topo. Mas "recentes" baseado em quê? Últimos clientes cadastrados? Últimos clientes que receberam cobrança? Quantos?

**Redação proposta — adicionar na seção 8.2:**

> **"Recentes" no autocomplete de cliente:** mostra os 5 clientes mais recentemente usados em cobranças (ordenados por `created_date` da cobrança, descendente). Se o sistema tem menos de 5 cobranças, mostra todos os clientes usados. Se o cliente nunca recebeu cobrança, não aparece em "Recentes" (mas aparece na busca normal). A query é: `Cobranca.distinct(clienteId).sort(-created_date).limit(5)`.

---

### G5. Pré-visualização de parcelas no passo 3 — para à vista

**Problema:** O wireframe do passo 3 mostra a pré-visualização com 1 parcela (caso à vista). Mas não define se a pré-visualização aparece para à vista ou apenas para parcelado. Para à vista, mostrar "1. R$ 200,00 · 15/08/2026" é útil ou é redundância?

**Redação proposta — adicionar na seção 8.2:**

> **Pré-visualização de parcelas (passo 3):** sempre aparece, inclusive para à vista. Para 1 parcela, mostra "1 parcela de R$ 200,00 vencendo em 15/08/2026". Para N parcelas, mostra a lista completa com número, valor e data de cada uma. Para mais de 6 parcelas, mostra as 5 primeiras e um resumo "+ N parcelas restantes" (expande ao tocar). A pré-visualização recalcula em tempo real se a usuária altera o dia fixo ou o primeiro vencimento.

---

## Resumo — Prioridade das Correções

### 🔴 Bloqueantes (dois desenvolvedores implementariam coisas diferentes)

| # | Problema | Impacto se não corrigido |
|---|---|---|
| A1 | Precisão de valores monetários | Cálculos errados, arredondamento inconsistente |
| A2 | date vs datetime | Comparações de "hoje" quebram em UTC |
| A3 | Formato do telefone | Link do WhatsApp não funciona |
| C1 | dataLimite e regra de atraso | Atrasados calculados de forma diferente |
| F1 | Atomicidade cobrança+parcelas | Cobranças órfãs sem parcelas |
| B2 | Redundância parcelado/quantidadeParcelas | Inconsistência de dados |
| B3 | Status da parcela regenerada | Perda ou não de histórico de cobrança |
| A5 | Venda avulsa e produtoServicoId | Tela de produtos mostra coisa errada |
| E1 | Botão "Marcar parcial" ausente do wireframe | Funcionalidade sem acesso na UI |

### 🟡 Importantes (geram dúvida mas não quebram o sistema)

| # | Problema | Impacto |
|---|---|---|
| B1 | Aritmética de meses | Edge cases de data não cobertos |
| B4 | vezesUsado em edição/exclusão | Contador de favoritos incorreto |
| C2 | Persistência dos dias trabalhados | Settings não salvam |
| C3 | Próximos vencimentos — definição | Lista mostra dias vazios ou não |
| D1 | Undo de pago→pago_parcial | Perda do valor parcial ao desfazer |
| D3 | Persistência do "confirmar envio" | Estado intermediário ambíguo |
| D4 | Validação de valor parcial | Aceita valores inválidos |
| D5 | Undo em lote | Undo não funciona ou desfaz errado |
| E3 | Fluxo de edição não detalhado | UI de edição diferente entre devs |
| E5 | "Já passou" no primeiro vencimento | Sugestão de data errada |
| E6 | Origem do autocomplete de PIX | Query não definida |
| F2 | Comportamento em falha otimista | UX de erro diferente |
| G3 | Validações da cobrança | Aceita dados inválidos |

### 🟢 Menores (boa prática definir, mas não bloqueia)

| # | Problema | Impacto |
|---|---|---|
| A4 | Enum values do diaVencimentoFixo | Dev precisa procurar no config |
| D2 | Desfazer manual no histórico | Funcionalidade sem UI definida |
| D6 | Granularidade do arquivamento | Dev não sabe se é por cobrança ou parcela |
| E2 | Terminologia cobrança vs parcela | Apenas semântica |
| E4 | nomeProdutoServico editável com pago | Lacuna menor |
| E7 | Cadastro inteligente sem histórico | Caso óbvio mas não explicitado |
| G1 | Exclusão de produto | Sem regra definida |
| G2 | Confirmação de inativação | Sem UX definida |
| G4 | "Recentes" — quantos e baseado em quê | Lista diferente entre devs |
| G5 | Pré-visualização para à vista | Redundância ou omissão |
