-- ============================================
-- ניהול בניית בית - סכמת מסד נתונים מלאה
-- ============================================

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'הבית שלי',
  address text,
  total_budget numeric(12,2) default 0,
  start_date date,
  target_end_date date,
  status text default 'active' check (status in ('planning','active','completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists budget_categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  allocated_amount numeric(12,2) default 0,
  color text default '#389168',
  icon text default 'folder',
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  category_id uuid references budget_categories(id) on delete set null,
  professional_id uuid,
  title text not null,
  amount numeric(12,2) not null,
  expense_date date not null default current_date,
  invoice_number text,
  receipt_url text,
  notes text,
  status text default 'paid' check (status in ('pending','paid','cancelled')),
  created_at timestamptz default now()
);

create table if not exists professionals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  role text not null,
  phone text,
  email text,
  company text,
  contract_amount numeric(12,2),
  paid_amount numeric(12,2) default 0,
  contract_url text,
  start_date date,
  end_date date,
  status text default 'active' check (status in ('pending','active','completed','cancelled')),
  rating int check (rating between 1 and 5),
  notes text,
  created_at timestamptz default now()
);

alter table expenses
  add constraint fk_expenses_professional
  foreign key (professional_id) references professionals(id) on delete set null;

create table if not exists stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  description text,
  start_date date,
  end_date date,
  actual_start date,
  actual_end date,
  status text default 'pending' check (status in ('pending','in_progress','completed','delayed')),
  progress_pct int default 0 check (progress_pct between 0 and 100),
  color text default '#389168',
  sort_order int default 0,
  depends_on uuid references stages(id),
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  stage_id uuid references stages(id) on delete cascade,
  professional_id uuid references professionals(id) on delete set null,
  title text not null,
  description text,
  due_date date,
  completed_at timestamptz,
  status text default 'todo' check (status in ('todo','in_progress','done','blocked')),
  priority text default 'normal' check (priority in ('low','normal','high','urgent')),
  created_at timestamptz default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  category text not null check (category in ('permit','contract','invoice','blueprint','insurance','inspection','other')),
  title text not null,
  file_url text,
  file_name text,
  file_size int,
  issued_date date,
  expiry_date date,
  issuer text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  stage_id uuid references stages(id) on delete set null,
  url text not null,
  thumbnail_url text,
  caption text,
  location_in_house text,
  taken_at date default current_date,
  created_at timestamptz default now()
);

create table if not exists daily_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  log_date date not null default current_date,
  summary text not null,
  workers_on_site text,
  weather text,
  created_at timestamptz default now()
);

create or replace function create_default_categories(p_project_id uuid)
returns void language plpgsql as $$
begin
  insert into budget_categories (project_id, name, color, icon, sort_order) values
    (p_project_id, 'עבודות עפר ויסודות', '#8B5CF6', 'shovel', 1),
    (p_project_id, 'שלד ובנייה', '#EF4444', 'building', 2),
    (p_project_id, 'גגות ואיטום', '#F59E0B', 'home', 3),
    (p_project_id, 'חשמל', '#F59E0B', 'zap', 4),
    (p_project_id, 'אינסטלציה', '#3B82F6', 'droplets', 5),
    (p_project_id, 'טיח וצבע', '#EC4899', 'paintbrush', 6),
    (p_project_id, 'ריצוף וחיפוי', '#14B8A6', 'grid', 7),
    (p_project_id, 'נגרות ואלומיניום', '#8B5CF6', 'door-open', 8),
    (p_project_id, 'מטבח', '#F97316', 'chef-hat', 9),
    (p_project_id, 'מיזוג אוויר', '#06B6D4', 'wind', 10),
    (p_project_id, 'גינון וחוץ', '#22C55E', 'tree-pine', 11),
    (p_project_id, 'ריהוט ועיצוב', '#A855F7', 'sofa', 12),
    (p_project_id, 'אדריכלות ופיקוח', '#6366F1', 'pencil-ruler', 13),
    (p_project_id, 'היתרים ואגרות', '#64748B', 'file-text', 14),
    (p_project_id, 'שונות', '#94A3B8', 'ellipsis', 15);
end;
$$;

create or replace function create_default_stages(p_project_id uuid)
returns void language plpgsql as $$
begin
  insert into stages (project_id, name, status, sort_order, color) values
    (p_project_id, 'תכנון ואישורים', 'pending', 1, '#6366F1'),
    (p_project_id, 'עבודות עפר ויסודות', 'pending', 2, '#8B5CF6'),
    (p_project_id, 'שלד ובנייה', 'pending', 3, '#EF4444'),
    (p_project_id, 'גג ואיטום', 'pending', 4, '#F59E0B'),
    (p_project_id, 'חשמל ואינסטלציה גלמי', 'pending', 5, '#3B82F6'),
    (p_project_id, 'טיח פנים', 'pending', 6, '#EC4899'),
    (p_project_id, 'ריצוף וחיפוי', 'pending', 7, '#14B8A6'),
    (p_project_id, 'נגרות ואלומיניום', 'pending', 8, '#8B5CF6'),
    (p_project_id, 'מטבח ושירותים', 'pending', 9, '#F97316'),
    (p_project_id, 'חשמל ואינסטלציה גמר', 'pending', 10, '#3B82F6'),
    (p_project_id, 'צבע וגמר', 'pending', 11, '#EC4899'),
    (p_project_id, 'מיזוג וחימום', 'pending', 12, '#06B6D4'),
    (p_project_id, 'גינון וחוץ', 'pending', 13, '#22C55E'),
    (p_project_id, 'ניקיון וכניסה', 'pending', 14, '#389168');
end;
$$;

alter table projects enable row level security;
alter table budget_categories enable row level security;
alter table expenses enable row level security;
alter table professionals enable row level security;
alter table stages enable row level security;
alter table tasks enable row level security;
alter table documents enable row level security;
alter table photos enable row level security;
alter table daily_logs enable row level security;

create policy "allow_all_projects" on projects for all using (true);
create policy "allow_all_budget_categories" on budget_categories for all using (true);
create policy "allow_all_expenses" on expenses for all using (true);
create policy "allow_all_professionals" on professionals for all using (true);
create policy "allow_all_stages" on stages for all using (true);
create policy "allow_all_tasks" on tasks for all using (true);
create policy "allow_all_documents" on documents for all using (true);
create policy "allow_all_photos" on photos for all using (true);
create policy "allow_all_daily_logs" on daily_logs for all using (true);

insert into storage.buckets (id, name, public) values
  ('documents', 'documents', false),
  ('photos', 'photos', true),
  ('receipts', 'receipts', false)
on conflict do nothing;
