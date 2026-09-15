import React from 'react';
import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/', icon: '🏠', label: 'Hoje', end: true },
  { to: '/nova', icon: '➕', label: 'Nova', end: false },
  { to: '/clientes', icon: '👥', label: 'Clientes', end: false },
  { to: '/produtos', icon: '📦', label: 'Produtos', end: false },
  { to: '/cobrancas', icon: '💰', label: 'Cobranças', end: false },
  { to: '/config', icon: '⚙️', label: 'Config', end: false },
] as const;

export interface AppNavigationProps { onLogout?: () => void; }

function AppNavigationBase({ onLogout }: AppNavigationProps) {
  return React.createElement('nav', {
    'aria-label': 'Navegação principal',
    className: 'fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur-xl shadow-[0_-10px_28px_-24px_rgba(15,23,42,.45)] md:sticky md:top-0 md:bottom-auto md:border-t-0 md:border-b md:shadow-[0_10px_28px_-26px_rgba(15,23,42,.45)]',
  },
    React.createElement('div', { className: 'mx-auto flex max-w-5xl items-stretch px-2 md:px-4' },
      React.createElement('div', { className: 'grid flex-1 grid-cols-6' },
        ...ITEMS.map(item => React.createElement(NavLink, {
          key: item.to, to: item.to, end: item.end,
          className: ({ isActive }: { isActive: boolean }) => [
            'relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-all md:min-h-16 md:flex-row md:gap-2 md:px-4',
            'after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-0 after:-translate-x-1/2 after:rounded-full after:bg-primary after:transition-all',
            isActive
              ? 'text-primary after:w-8 md:after:w-10'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
          ].join(' '),
        },
          React.createElement('span', { 'aria-hidden': true, className: 'text-lg leading-none drop-shadow-sm' }, item.icon),
          React.createElement('span', null, item.label),
        )),
      ),
      onLogout ? React.createElement('button', {
        type: 'button', onClick: onLogout,
        className: 'hidden min-h-14 px-3 text-xs font-medium text-muted-foreground hover:text-foreground md:block',
      }, 'Sair') : null,
      onLogout ? React.createElement('button', {
        type: 'button', onClick: onLogout, 'aria-label': 'Sair', title: 'Sair',
        className: 'absolute right-2 top-1 rounded px-2 py-1 text-xs text-muted-foreground md:hidden',
      }, 'Sair') : null,
    ),
  );
}

export const AppNavigation = React.memo(AppNavigationBase);
