-- M15: corrige trigger monetário genérico que acessava campos ausentes em NEW.
-- Cada tabela usa uma função tipada, preservando truncamento de 2 casas.

create or replace function private.truncate_produto_money()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.valor_padrao is not null then
    new.valor_padrao = trunc(new.valor_padrao, 2);
  end if;
  return new;
end;
$$;

create or replace function private.truncate_cobranca_money()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  new.valor = trunc(new.valor, 2);
  return new;
end;
$$;

create or replace function private.truncate_parcela_money()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  new.valor = trunc(new.valor, 2);
  if new.valor_pago is not null then
    new.valor_pago = trunc(new.valor_pago, 2);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_produtos_money on public.produtos_servicos;
create trigger trg_produtos_money
before insert or update on public.produtos_servicos
for each row execute function private.truncate_produto_money();

drop trigger if exists trg_cobrancas_money on public.cobrancas;
create trigger trg_cobrancas_money
before insert or update on public.cobrancas
for each row execute function private.truncate_cobranca_money();

drop trigger if exists trg_parcelas_money on public.parcelas;
create trigger trg_parcelas_money
before insert or update on public.parcelas
for each row execute function private.truncate_parcela_money();
