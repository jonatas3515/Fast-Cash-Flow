-- Tabela de Regras de Automação
create table if not exists automation_rules (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references companies(id) on delete cascade not null,
  name text not null,
  description text,
  
  -- Gatilho (QUANDO acontece)
  trigger_type text not null, -- ex: 'payment_due', 'goal_reached'
  trigger_config jsonb default '{}'::jsonb, -- ex: { "days_before": 1 }
  
  -- Ação (O QUE fazer)
  action_type text not null, -- ex: 'whatsapp_message'
  action_config jsonb default '{}'::jsonb, -- ex: { "template_id": "cobranca_v1" }
  
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índices
create index if not exists idx_automation_rules_company on automation_rules(company_id);
create index if not exists idx_automation_rules_trigger on automation_rules(trigger_type);

-- Tabela de Logs de Notificação
create table if not exists notification_logs (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references companies(id) on delete cascade not null,
  rule_id uuid references automation_rules(id) on delete set null,
  
  provider text not null, -- ex: 'custom_api', 'evolution_api'
  recipient text not null,
  content text,
  
  status text not null, -- 'sent', 'failed', 'delivered'
  external_id text, -- ID na plataforma externa
  error_message text,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_notification_logs_company on notification_logs(company_id);
create index if not exists idx_notification_logs_created on notification_logs(created_at);

-- RLS (Security)
alter table automation_rules enable row level security;
alter table notification_logs enable row level security;

-- Policy: Apenas usuários da empresa podem ver/editar
create policy "Users can view own company rules" on automation_rules
  for select using (auth.uid() in (select user_id from company_members where company_id = automation_rules.company_id));

create policy "Users can insert own company rules" on automation_rules
  for insert with check (auth.uid() in (select user_id from company_members where company_id = automation_rules.company_id));

create policy "Users can update own company rules" on automation_rules
  for update using (auth.uid() in (select user_id from company_members where company_id = automation_rules.company_id));

create policy "Users can delete own company rules" on automation_rules
  for delete using (auth.uid() in (select user_id from company_members where company_id = automation_rules.company_id));

-- Policy Logs (Read Only geralmente, mas insert pelo sistema)
create policy "Users can view own company logs" on notification_logs
  for select using (auth.uid() in (select user_id from company_members where company_id = notification_logs.company_id));
