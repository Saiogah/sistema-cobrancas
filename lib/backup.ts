// lib/backup.ts — Exportar/importar/limpar dados (backup local IndexedDB)
import { Cliente, ProdutoServico, Cobranca, Parcela, Configuracao } from '../api/entities';

export interface BackupData {
  version: string;
  timestamp: string;
  data: {
    clientes: any[];
    produtosServicos: any[];
    cobranca: any[];
    parcelas: any[];
    configuracoes: any[];
  };
}

/**
 * Lê todos os registros de todas as entidades via a API de entidades,
 * agrupa em um objeto JSON com timestamp e versão, e dispara o download do navegador.
 * CR-02 fix: falhas na leitura agora lançam erro em vez de silenciosamente retornar [].
 */
export async function exportarDados(): Promise<void> {
  const [clientes, produtosServicos, cobrancas, parcelas, configuracoes] = await Promise.all([
    Cliente.list(),
    ProdutoServico.list(),
    Cobranca.list(),
    Parcela.list(),
    Configuracao.list(),
  ]);

  const data: BackupData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    data: {
      clientes: clientes || [],
      produtosServicos: produtosServicos || [],
      cobranca: cobrancas || [],
      parcelas: parcelas || [],
      configuracoes: configuracoes || [],
    },
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sistema-cobrancas-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Apaga TODOS os registros de todas as entidades (nuclear reset).
 * CR-02 fix: usa transação direta do IndexedDB em vez de Parcela.delete/Cobranca.delete
 * que têm regras de negócio que impedem a limpeza.
 */
export async function limparDados(): Promise<void> {
  // Importa o driver raw do IndexedDB — precisamos de acesso direto para limpar stores
  // sem passar pelas regras de negócio (que bloqueiam delete de parcelas, etc.)
  const { clearAllStores } = await import('./backup-driver');
  await clearAllStores();
}

/**
 * Analisa a string JSON, valida se possui o formato esperado,
 * limpa os dados existentes e importa todos os registros do backup.
 * CR-02 fix: preserva IDs originais, status, valorPago, arquivamento, etc.
 * Usa put direto no IndexedDB em vez de create() que regenera parcelas.
 */
export async function importarDados(jsonStr: string): Promise<void> {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('Arquivo JSON inválido.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Estrutura de backup inválida.');
  }

  const dataPayload = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;

  const clientes = Array.isArray(dataPayload.clientes) ? dataPayload.clientes : [];
  const produtosServicos = Array.isArray(dataPayload.produtosServicos)
    ? dataPayload.produtosServicos
    : Array.isArray(dataPayload.produtos)
    ? dataPayload.produtos
    : [];
  // Aceita tanto "cobrancas" quanto "cobranca" como chave
  const cobrancas = Array.isArray(dataPayload.cobrancas) ? dataPayload.cobrancas
    : Array.isArray(dataPayload.cobranca) ? dataPayload.cobranca
    : [];
  const parcelas = Array.isArray(dataPayload.parcelas) ? dataPayload.parcelas : [];
  const configuracoes = Array.isArray(dataPayload.configuracoes)
    ? dataPayload.configuracoes
    : Array.isArray(dataPayload.configuracao)
    ? dataPayload.configuracao
    : [];

  const temCamposValidos =
    Boolean(parsed.version) ||
    Boolean(parsed.timestamp) ||
    'clientes' in dataPayload ||
    'produtosServicos' in dataPayload ||
    'produtos' in dataPayload ||
    'cobrancas' in dataPayload ||
    'cobranca' in dataPayload ||
    'parcelas' in dataPayload ||
    'configuracoes' in dataPayload;

  if (!temCamposValidos) {
    throw new Error('O arquivo de backup não contém um formato de dados reconhecido.');
  }

  // Importa o driver raw para fazer put preservando IDs
  const { putRecord, clearAllStores } = await import('./backup-driver');

  // Apaga dados existentes
  await clearAllStores();

  // Importa preservando IDs e estado original (status, valorPago, etc.)
  for (const item of clientes) {
    if (item?.id) {
      try { await putRecord('clientes', item); } catch { /* skip invalid */ }
    }
  }

  for (const item of produtosServicos) {
    if (item?.id) {
      try { await putRecord('produtos_servicos', item); } catch { /* skip invalid */ }
    }
  }

  for (const item of cobrancas) {
    if (item?.id) {
      try { await putRecord('cobrancas', item); } catch { /* skip invalid */ }
    }
  }

  for (const item of parcelas) {
    if (item?.id) {
      try { await putRecord('parcelas', item); } catch { /* skip invalid */ }
    }
  }

  for (const item of configuracoes) {
    if (item?.id) {
      try { await putRecord('configuracoes', item); } catch { /* skip invalid */ }
    }
  }
}
