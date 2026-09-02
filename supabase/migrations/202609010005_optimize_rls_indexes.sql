-- M15: otimizações apontadas pelo Supabase Database Advisor.
-- Sem mudança funcional: índices de FKs e auth.uid() como initplan único por query.

create index if not exists idx_cobrancas_cliente_id
  on public.cobrancas(cliente_id);
create index if not exists idx_cobrancas_produto_servico_id
  on public.cobrancas(produto_servico_id)
  where produto_servico_id is not null;
create index if not exists idx_parcelas_cliente_id
  on public.parcelas(cliente_id);

drop policy if exists clientes_select_own on public.clientes;
drop policy if exists clientes_insert_own on public.clientes;
drop policy if exists clientes_update_own on public.clientes;
create policy clientes_select_own on public.clientes for select
  using (user_id = (select auth.uid()));
create policy clientes_insert_own on public.clientes for insert
  with check (user_id = (select auth.uid()));
create policy clientes_update_own on public.clientes for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists produtos_select_own on public.produtos_servicos;
drop policy if exists produtos_insert_own on public.produtos_servicos;
drop policy if exists produtos_update_own on public.produtos_servicos;
drop policy if exists produtos_delete_own on public.produtos_servicos;
create policy produtos_select_own on public.produtos_servicos for select
  using (user_id = (select auth.uid()));
create policy produtos_insert_own on public.produtos_servicos for insert
  with check (user_id = (select auth.uid()));
create policy produtos_update_own on public.produtos_servicos for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy produtos_delete_own on public.produtos_servicos for delete
  using (user_id = (select auth.uid()));

drop policy if exists cobrancas_select_own on public.cobrancas;
create policy cobrancas_select_own on public.cobrancas for select
  using (user_id = (select auth.uid()));

drop policy if exists parcelas_select_own on public.parcelas;
drop policy if exists parcelas_update_own on public.parcelas;
create policy parcelas_select_own on public.parcelas for select
  using (user_id = (select auth.uid()));
create policy parcelas_update_own on public.parcelas for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists config_select_own on public.configuracoes;
drop policy if exists config_insert_own on public.configuracoes;
drop policy if exists config_update_own on public.configuracoes;
create policy config_select_own on public.configuracoes for select
  using (user_id = (select auth.uid()));
create policy config_insert_own on public.configuracoes for insert
  with check (user_id = (select auth.uid()));
create policy config_update_own on public.configuracoes for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
