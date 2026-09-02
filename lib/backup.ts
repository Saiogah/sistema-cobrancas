import { Cliente, ProdutoServico, Cobranca, Parcela, Configuracao } from '../api/entities';

export interface BackupData {
  version: string;
  timestamp: string;
  data: {
    clientes: any[];
    produtosServicos: any[];
    cobrancas: any[];
    parcelas: any[];
    configuracoes: any[];
  };
}

/**
 * Lê todos os registros de todas as entidades (Cliente, ProdutoServico, Cobranca, Parcela, Configuracao)
 * via a API de entidades, agrupa em um objeto JSON com timestamp e versão,
 * e dispara o download do navegador.
 */
export async function exportarDados(): Promise<void> {
  const [clientes, produtosServicos, cobrancas, parcelas, configuracoes] = await Promise.all([
    Cliente.list().catch(() => []),
    ProdutoServico.list().catch(() => []),
    Cobranca.list().catch(() => []),
    Parcela.list().catch(() => []),
    Configuracao.list().catch(() => []),
  ]);

  const data: BackupData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    data: {
      clientes: clientes || [],
      produtosServicos: produtosServicos || [],
      cobrancas: cobrancas || [],
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
 */
export async function limparDados(): Promise<void> {
  const [clientes, produtosServicos, cobrancas, parcelas, configuracoes] = await Promise.all([
    Cliente.list().catch(() => []),
    ProdutoServico.list().catch(() => []),
    Cobranca.list().catch(() => []),
    Parcela.list().catch(() => []),
    Configuracao.list().catch(() => []),
  ]);

  // Apaga parcelas
  for (const item of parcelas) {
    if (item?.id) {
      try {
        await Parcela.delete(item.id);
      } catch {
        // Ignora erros caso delete individual não seja permitido
      }
    }
  }

  // Apaga cobranças
  for (const item of cobrancas) {
    if (item?.id) {
      try {
        await Cobranca.delete(item.id);
      } catch {
        // Ignora erros
      }
    }
  }

  // Apaga produtos e serviços
  for (const item of produtosServicos) {
    if (item?.id) {
      try {
        await ProdutoServico.delete(item.id);
      } catch {
        // Ignora erros
      }
    }
  }

  // Apaga clientes
  for (const item of clientes) {
    if (item?.id) {
      try {
        await Cliente.delete(item.id);
      } catch {
        // Ignora erros
      }
    }
  }

  // Apaga configurações
  for (const item of configuracoes) {
    if (item?.id) {
      try {
        await Configuracao.delete(item.id);
      } catch {
        // Ignora erros
      }
    }
  }
}

/**
 * Analisa a string JSON, valida se possui o formato esperado,
 * limpa os dados existentes e importa todos os registros do backup.
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
  const cobrancas = Array.isArray(dataPayload.cobrancas) ? dataPayload.cobrancas : [];
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
    'parcelas' in dataPayload ||
    'configuracoes' in dataPayload;

  if (!temCamposValidos) {
    throw new Error('O arquivo de backup não contém um formato de dados reconhecido.');
  }

  // Apaga dados existentes
  await limparDados();

  // Importa Clientes
  for (const item of clientes) {
    try {
      await Cliente.create(item);
    } catch {
      // Ignora se não for possível criar
    }
  }

  // Importa Produtos e Serviços
  for (const item of produtosServicos) {
    try {
      await ProdutoServico.create(item);
    } catch {
      // Ignora erro
    }
  }

  // Importa Configurações
  for (const item of configuracoes) {
    try {
      if (item.diasTrabalhados) {
        await Configuracao.create({ diasTrabalhados: item.diasTrabalhados });
      }
    } catch {
      // Ignora erro
    }
  }

  // Importa Cobranças
  for (const item of cobrancas) {
    try {
      await Cobranca.create(item);
    } catch {
      // Ignora erro
    }
  }

  // Importa Parcelas
  for (const item of parcelas) {
    try {
      await Parcela.create(item);
    } catch {
      // Ignora erro
    }
  }
}
