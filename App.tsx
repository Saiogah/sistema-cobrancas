import React, { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { NewChargePage } from './pages/NewChargePage';
import { ClientsPage } from './pages/ClientsPage';
import { ProductsPage } from './pages/ProductsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { AppNavigation } from './components/AppNavigation';
import { OnboardingGuide } from './components/OnboardingGuide';
import { Cliente, ProdutoServico, Cobranca } from './api/entities';
import { supabase } from './api/supabase';
import { eventBus } from './lib/event-bus';

interface OnboardingCounts { clientes: number; produtos: number; cobrancas: number; }

function ProtectedApp({ session }: { session: Session }) {
  const [counts, setCounts] = useState<OnboardingCounts | null>(null);
  const [onboardingAtivo, setOnboardingAtivo] = useState(false);

  const refreshCounts = useCallback(async () => {
    try {
      const [clientes, produtos, cobrancas] = await Promise.all([
        Cliente.list({ limit: 1 }), ProdutoServico.list({ limit: 1 }), Cobranca.list({ limit: 1 }),
      ]);
      setCounts({ clientes: clientes.length, produtos: produtos.length, cobrancas: cobrancas.length });
    } catch {
      setCounts(null);
    }
  }, []);

  useEffect(() => { void refreshCounts(); }, [refreshCounts, session.user.id]);
  useEffect(() => {
    const unsubs = [
      eventBus.on('client:created', () => void refreshCounts()),
      eventBus.on('product:created', () => void refreshCounts()),
      eventBus.on('product:deleted', () => void refreshCounts()),
      eventBus.on('charge:created', () => void refreshCounts()),
      eventBus.on('charge:deleted', () => void refreshCounts()),
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, [refreshCounts]);
  useEffect(() => {
    if (!counts) return;
    if (counts.cobrancas > 0) setOnboardingAtivo(false);
    else if (counts.clientes === 0 && counts.produtos === 0) setOnboardingAtivo(true);
  }, [counts]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' });
  }, []);

  return React.createElement('div', { className: 'min-h-screen bg-background text-foreground' },
    React.createElement(AppNavigation, { onLogout: () => void logout() }),
    React.createElement('main', { className: 'pb-20 md:pb-0' },
      React.createElement(AppRoutes, { counts, onboardingAtivo }),
    ),
  );
}

function AppRoutes({ counts, onboardingAtivo }: { counts: OnboardingCounts | null; onboardingAtivo: boolean }) {
  return React.createElement(Routes, null,
    React.createElement(Route, { path: '/', element: React.createElement(DashboardRoute, { counts, onboardingAtivo }) }),
    React.createElement(Route, { path: '/nova', element: React.createElement(NewChargeRoute) }),
    React.createElement(Route, { path: '/clientes', element: React.createElement(ClientsPage) }),
    React.createElement(Route, { path: '/produtos', element: React.createElement(ProductsPage) }),
    React.createElement(Route, { path: '/config', element: React.createElement(SettingsPage) }),
    React.createElement(Route, { path: '*', element: React.createElement(Navigate, { to: '/', replace: true }) }),
  );
}

function DashboardRoute({ counts, onboardingAtivo }: { counts: OnboardingCounts | null; onboardingAtivo: boolean }) {
  const navigate = useNavigate();
  if (onboardingAtivo && counts) {
    return React.createElement(OnboardingGuide, {
      temClientes: counts.clientes > 0,
      temProdutos: counts.produtos > 0,
      onCadastrarClientes: () => navigate('/clientes'),
      onCadastrarProdutos: () => navigate('/produtos'),
      onNovaCobranca: () => navigate('/nova'),
    });
  }
  return React.createElement(DashboardPage);
}

function NewChargeRoute() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const cobrancaId = params.get('editar') || undefined;
  return React.createElement(NewChargePage, {
    editMode: Boolean(cobrancaId), cobrancaId,
    onVoltarParaHoje: () => navigate('/'), onEditSuccess: () => navigate('/clientes'),
  });
}

function AuthRoutes() {
  const location = useLocation();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (session === undefined) {
    return React.createElement('div', { className: 'flex min-h-screen items-center justify-center' }, 'Carregando...');
  }

  if (!session) {
    if (location.pathname === '/cadastro') return React.createElement(SignUpPage);
    if (location.pathname !== '/login') {
      return React.createElement(Navigate, { to: '/login', replace: true, state: { from: `${location.pathname}${location.search}` } });
    }
    return React.createElement(LoginPage);
  }

  if (location.pathname === '/login' || location.pathname === '/cadastro') {
    return React.createElement(Navigate, { to: '/', replace: true });
  }
  return React.createElement(ProtectedApp, { session });
}

export function App() {
  return React.createElement(BrowserRouter, null, React.createElement(AuthRoutes));
}

export default App;
