import React from 'react';

export interface OnboardingGuideProps {
  temClientes: boolean;
  temProdutos: boolean;
  onCadastrarClientes: () => void;
  onCadastrarProdutos: () => void;
  onNovaCobranca: () => void;
}

function OnboardingGuideBase({
  temClientes,
  temProdutos,
  onCadastrarClientes,
  onCadastrarProdutos,
  onNovaCobranca,
}: OnboardingGuideProps) {
  const prontoParaCobranca = temClientes && temProdutos;

  const item = (
    numero: number,
    concluido: boolean,
    label: string,
    onClick: () => void,
    destaque = false,
  ) => React.createElement('button', {
    type: 'button',
    onClick,
    className: [
      'flex min-h-14 w-full items-center justify-between rounded-lg border p-4 text-left font-medium transition-colors',
      destaque ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
    ].join(' '),
  },
    React.createElement('span', null, `${numero}. ${label}`),
    concluido ? React.createElement('span', { 'aria-label': 'Concluído' }, '✓') : null,
  );

  return React.createElement('section', {
    className: 'mx-auto max-w-xl p-4',
    'aria-labelledby': 'onboarding-title',
  },
    React.createElement('div', { className: 'rounded-xl border bg-card p-5 shadow-sm space-y-5' },
      React.createElement('div', { className: 'space-y-1' },
        React.createElement('h1', { id: 'onboarding-title', className: 'text-xl font-bold' }, 'Bem-vinda! Vamos começar?'),
        React.createElement('p', { className: 'text-sm text-muted-foreground' }, 'Comece pelos clientes. Leva 2 minutos.'),
      ),
      React.createElement('div', { className: 'space-y-3' },
        item(1, temClientes, '👥 Cadastrar clientes', onCadastrarClientes),
        item(2, temProdutos, '📦 Cadastrar serviços', onCadastrarProdutos),
        item(3, false, '➕ Nova cobrança', onNovaCobranca, prontoParaCobranca),
      ),
    ),
  );
}

export const OnboardingGuide = React.memo(OnboardingGuideBase);
