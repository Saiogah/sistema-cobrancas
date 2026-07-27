// functions/editarCobranca.ts — Backend function: edita cobrança, regenera parcelas quando permitido (M2b)
//
// Estratégia criar-antes-de-deletar: se criar novas parcelas falha, as antigas continuam existindo.
// Duplicação consciente de M3a (mesmas funções de createCobranca.ts).

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const input = await req.json();
    const { cobrancaId } = input;

    if (!cobrancaId) {
      return new Response(JSON.stringify({
        sucesso: false,
        erro: "cobrancaId é obrigatório",
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ===== BUSCAR COBRANÇA E PARCELAS EXISTENTES =====
    const cobranca = await base44.entities.Cobranca.get(cobrancaId);
    if (!cobranca) {
      return new Response(JSON.stringify({
        sucesso: false,
        erro: "Cobrança não encontrada",
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Listar todas as parcelas e filtrar por cobrancaId manualmente
    // (o filter da SDK pode não funcionar como esperado no backend)
    const todasParcelas = await base44.entities.Parcela.list({ limit: 500 });
    const parcelasExistentes = todasParcelas.filter((p: any) => p.cobrancaId === cobrancaId);

    // ===== VERIFICAR PERMISSÃO DE EDIÇÃO =====
    // Plano v2.0: permite regeneração se todas estão pendente OU cobrado
    // PRD v2.0 seção 7.5: permite apenas se todas estão pendente
    // Esta implementação segue o Plano v2.0 (aprovado). Pendente de confirmação definitiva.
    const todasEditaveis = parcelasExistentes.every(
      (p: any) => p.status === "pendente" || p.status === "cobrado"
    );

    const algumPagamento = parcelasExistentes.some(
      (p: any) => p.status === "pago" || p.status === "pago_parcial" || p.valorPago !== null
    );

    if (!todasEditaveis || algumPagamento) {
      // ===== EDIÇÃO LIMITADA: apenas observacoes e pixUtilizado =====
      const updateData: any = {};
      if (input.observacoes !== undefined) updateData.observacoes = input.observacoes;
      if (input.pixUtilizado !== undefined) updateData.pixUtilizado = input.pixUtilizado;

      await base44.entities.Cobranca.update(cobrancaId, updateData);

      return new Response(JSON.stringify({
        sucesso: true,
        cobrancaId: cobrancaId,
        edicaoLimitada: true,
        mensagem: "Apenas observações e PIX foram atualizados. Existem parcelas com pagamentos registrados.",
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ===== EDIÇÃO COMPLETA COM REGENERAÇÃO =====

    const novoValor = input.valor !== undefined ? input.valor : cobranca.valor;
    const novaQtdParcelas = input.quantidadeParcelas !== undefined ? input.quantidadeParcelas : cobranca.quantidadeParcelas;
    const novoPrimeiroVencimento = input.primeiroVencimento !== undefined ? input.primeiroVencimento : cobranca.primeiroVencimento;
    const novoDiaVencimentoFixo = input.diaVencimentoFixo !== undefined ? input.diaVencimentoFixo : cobranca.diaVencimentoFixo;

    const erros: string[] = [];
    if (novoValor <= 0 || novoValor > 999999.99) erros.push("Valor deve ser maior que zero e menor ou igual a 999999.99");
    if (!Number.isInteger(novaQtdParcelas) || novaQtdParcelas < 1 || novaQtdParcelas > 60) erros.push("Quantidade de parcelas deve ser entre 1 e 60");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(novoPrimeiroVencimento)) erros.push("Primeiro vencimento deve ser uma data válida");
    if (![5, 10, 15, 20, 25, 30].includes(novoDiaVencimentoFixo)) erros.push("Dia de vencimento fixo inválido");

    if (erros.length > 0) {
      return new Response(JSON.stringify({ sucesso: false, erros }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ===== FUNÇÕES DUPLICADAS DE M3a =====
    function dividirValor(valor: number, parcelas: number) {
      const valorBase = Math.floor((valor / parcelas) * 100) / 100;
      const valorUltima = Math.round((valor - (valorBase * (parcelas - 1))) * 100) / 100;
      return { valorBase, valorUltima };
    }

    function adicionarMeses(data: string, meses: number): string {
      const [y, m, d] = data.split("-").map(Number);
      let year = y;
      let month = m + meses;
      while (month > 12) { month -= 12; year += 1; }
      while (month < 1) { month += 12; year -= 1; }
      const maxDay = new Date(year, month, 0).getDate();
      const day = Math.min(d, maxDay);
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    function mesAlvoExisteDia(ano: number, mes: number, dia: number): boolean {
      const d = new Date(ano, mes - 1, dia);
      return d.getFullYear() === ano && (d.getMonth() + 1) === mes && d.getDate() === dia;
    }

    function calcularVencimentoParcela(primeiroVencimento: string, diaVencimentoFixo: number, numeroParcela: number): string {
      if (numeroParcela === 1) return primeiroVencimento;
      const base = adicionarMeses(primeiroVencimento, numeroParcela - 1);
      const [ano, mes] = base.split("-").map(Number);
      if (mesAlvoExisteDia(ano, mes, diaVencimentoFixo)) {
        return `${ano}-${String(mes).padStart(2, "0")}-${String(diaVencimentoFixo).padStart(2, "0")}`;
      }
      const lastDay = new Date(ano, mes, 0).getDate();
      return `${ano}-${String(mes).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    }

    // ===== CALCULAR NOVAS PARCELAS =====
    const { valorBase, valorUltima } = dividirValor(novoValor, novaQtdParcelas);

    const novasParcelas = [];
    for (let i = 1; i <= novaQtdParcelas; i++) {
      const valorParcela = i === novaQtdParcelas ? valorUltima : valorBase;
      const dataVencimento = calcularVencimentoParcela(novoPrimeiroVencimento, novoDiaVencimentoFixo, i);
      novasParcelas.push({
        cobrancaId: cobrancaId,
        clienteId: cobranca.clienteId,
        numeroParcela: i,
        valor: valorParcela,
        valorPago: null,
        dataVencimento: dataVencimento,
        status: "pendente",
        dataPagamento: null,
        dataCobrancaEnviada: null,
        arquivada: false,
      });
    }

    // ===== ESTRATÉGIA CRIAR-ANTES-DELETAR =====

    // 1. Criar novas parcelas
    try {
      const parcelasCriadas = await Promise.all(
        novasParcelas.map((p) => base44.entities.Parcela.create(p))
      );

      // 2. Se sucesso, deletar parcelas antigas (uma a uma)
      const errosDelete: string[] = [];
      for (const p of parcelasExistentes) {
        try {
          await base44.entities.Parcela.delete(p.id);
        } catch (e) {
          errosDelete.push(`Falha ao deletar parcela ${p.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      // 3. Atualizar cobrança
      const updateData: any = {
        valor: novoValor,
        quantidadeParcelas: novaQtdParcelas,
        primeiroVencimento: novoPrimeiroVencimento,
        diaVencimentoFixo: novoDiaVencimentoFixo,
      };
      if (input.observacoes !== undefined) updateData.observacoes = input.observacoes;
      if (input.pixUtilizado !== undefined) updateData.pixUtilizado = input.pixUtilizado;

      await base44.entities.Cobranca.update(cobrancaId, updateData);

      return new Response(JSON.stringify({
        sucesso: true,
        cobrancaId: cobrancaId,
        parcelas: parcelasCriadas.map((p) => ({
          numeroParcela: p.numeroParcela,
          valor: p.valor,
          dataVencimento: p.dataVencimento,
        })),
        avisos: errosDelete.length > 0 ? errosDelete : undefined,
      }), {
        headers: { "Content-Type": "application/json" },
      });

    } catch (batchError) {
      // Se criar novas falha, as antigas continuam existindo
      return new Response(JSON.stringify({
        sucesso: false,
        erro: "Falha ao criar novas parcelas. Parcelas originais preservadas.",
        detalhe: batchError instanceof Error ? batchError.message : String(batchError),
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({
      sucesso: false,
      erro: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
