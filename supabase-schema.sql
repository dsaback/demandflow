-- ================================================================
-- DEMANDFLOW — Execute no Supabase: SQL Editor → New Query → Run
-- ================================================================

create extension if not exists "uuid-ossp";

-- Clientes
create table if not exists clientes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  nome text not null,
  empresa text,
  telefone text,
  email text,
  cor text default '#3B82F6',
  criado_em timestamptz default now()
);

-- Demandas
create table if not exists demandas (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  cliente_nome text not null,
  mensagem text not null,
  canal text default 'Manual',
  urgencia text check (urgencia in ('critica','alta','media','baixa')) default 'media',
  status text check (status in ('pendente','em-andamento','concluido')) default 'pendente',
  tempo_estimado integer default 1,
  tags text[] default '{}',
  resumo_ia text,
  solucoes jsonb default '[]',
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- Eventos
create table if not exists eventos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  cliente_nome text not null,
  titulo text not null,
  descricao text,
  data_inicio timestamptz not null,
  duracao integer default 60,
  urgencia text check (urgencia in ('critica','alta','media','baixa')) default 'media',
  status text check (status in ('pendente','confirmado','em-andamento','concluido','urgente')) default 'pendente',
  criado_em timestamptz default now()
);

-- Segurança: cada usuário vê só seus dados
alter table clientes enable row level security;
alter table demandas enable row level security;
alter table eventos enable row level security;

create policy "usuarios veem seus clientes" on clientes for all using (auth.uid() = user_id);
create policy "usuarios veem suas demandas" on demandas for all using (auth.uid() = user_id);
create policy "usuarios veem seus eventos" on eventos for all using (auth.uid() = user_id);

-- Auto-atualizar atualizado_em
create or replace function update_updated_at()
returns trigger as $$
begin new.atualizado_em = now(); return new; end;
$$ language plpgsql;

create trigger demandas_updated_at before update on demandas
  for each row execute function update_updated_at();
