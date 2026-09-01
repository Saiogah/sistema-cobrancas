import React from 'react';
import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/', icon: '🏠', label: 'Hoje', end: true },
  { to: '/nova', icon: '➕', label: 'Nova', end: false },
  { to: '/clientes', icon: '👥', label: 'Clientes', end: false },
  { to: '/produtos', icon: '📦', label: 'Produtos', end: false },
  { to: '/config', icon: '⚙️', label: 'Config', end: false },
] as const;

function AppNavigationBase() {
  return React.createElement('nav', {
    'aria-label': 'Navegação principal',
    className: 'fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:sticky md:top-0 md:bottom-auto md:border-t-0 md:border-b',
  },
    React.createElement('div', { className: 'mx-auto grid max-w-3xl grid-cols-5' },
      ...ITEMS.map(item => React.createElement(NavLink, {
        key: item.to,
        to: item.to,
        end: item.end,
        className: ({ isActive }: { isActive: boolean }) => [
          'flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors md:min-h-14 md:flex-row md:gap-2 md:px-3',
          isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        ].join(' '),
      },
        React.createElement('span', { 'aria-hidden': true, className: 'text-lg leading-none' }, item.icon),
        React.createElement('span', null, item.label),
      )),
    ),
  );
}

export const AppNavigation = React.memo(AppNavigationBase);
