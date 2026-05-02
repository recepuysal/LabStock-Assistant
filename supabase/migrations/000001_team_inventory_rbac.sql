-- LabStock: çok kullanıcılı ortak depo + RBAC iskeleti (Supabase / Postgres)
--
-- Profesyonel öneri:
--   • Her kişi kendi hesabıyla girer (e-posta veya kurumsal SSO); aynı `organization` altında buluşur.
--   • Admin, `profiles.permissions` ile silme / adet / ekleme / Excel / kullanıcı yönetimini kısıtlar.
--   • "Tek şirket şifresi" paylaşımı mümkündür ama denetim ve güvenlik açısından zayıftır; mümkünse kişisel hesap kullanın.
--
-- Kurulum özeti:
--   1) Supabase projesinde bu dosyayı çalıştırın (SQL Editor veya `supabase db push`).
--   2) `organizations` tablosuna bir satır ekleyin.
--   3) Auth ile oluşturduğunuz kullanıcıların `auth.users.id` değerlerini `profiles` satırına bağlayın (org_id + role).
--   4) Uygulamada VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlayın.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Kuruluş
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Kullanıcı profili (auth.users ile 1:1)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete restrict,
  display_name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_org_id_idx on public.profiles (org_id);

-- ---------------------------------------------------------------------------
-- Stok satırları (şirket başına)
-- ---------------------------------------------------------------------------
create table if not exists public.parts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  mpn text not null,
  category text not null,
  description text not null default '—',
  quantity integer not null default 0 check (quantity >= 0),
  location text not null default '—',
  footprint text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create unique index if not exists parts_org_mpn_lower_idx on public.parts (org_id, lower(trim(mpn)));
create index if not exists parts_org_id_idx on public.parts (org_id);

-- ---------------------------------------------------------------------------
-- Denetim günlüğü (bulutta da tutulabilir)
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_audit (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  at timestamptz not null default now(),
  actor_id uuid references auth.users (id),
  actor_label text,
  mpn text not null,
  delta integer not null,
  quantity_after integer not null check (quantity_after >= 0),
  action text not null,
  note text
);

create index if not exists inventory_audit_org_at_idx on public.inventory_audit (org_id, at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.parts enable row level security;
alter table public.inventory_audit enable row level security;

-- Yardımcı: oturum açan kullanıcının org_id'si
create or replace function public.current_org_id() returns uuid
language sql stable security definer
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.is_org_admin() returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid() limit 1),
    false
  );
$$;

create or replace function public.profile_permissions() returns jsonb
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select permissions from public.profiles where id = auth.uid() limit 1),
    '{}'::jsonb
  );
$$;

create or replace function public.perm_flag(key text) returns boolean
language sql stable
as $$
  select coalesce((public.profile_permissions() ->> key)::boolean, false);
$$;

-- organizations: yalnızca kendi org okunur
drop policy if exists "org_select_member" on public.organizations;
create policy "org_select_member" on public.organizations
  for select using (id = public.current_org_id());

-- profiles: aynı org içindeki üyeleri görebilir (küçük ekip)
drop policy if exists "profiles_select_same_org" on public.profiles;
create policy "profiles_select_same_org" on public.profiles
  for select using (org_id = public.current_org_id());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- Sadece admin başkasının izinlerini güncelleyebilir (ileride Edge Function ile de yapılabilir)
drop policy if exists "profiles_admin_update_members" on public.profiles;
create policy "profiles_admin_update_members" on public.profiles
  for update using (public.is_org_admin() and org_id = public.current_org_id());

-- parts: org izolasyonu + izin bayrakları
drop policy if exists "parts_select" on public.parts;
create policy "parts_select" on public.parts
  for select using (org_id = public.current_org_id());

drop policy if exists "parts_insert" on public.parts;
create policy "parts_insert" on public.parts
  for insert with check (
    org_id = public.current_org_id()
    and (
      public.is_org_admin()
      or public.perm_flag('addParts')
    )
  );

drop policy if exists "parts_update" on public.parts;
create policy "parts_update" on public.parts
  for update using (org_id = public.current_org_id())
  with check (
    org_id = public.current_org_id()
    and (
      public.is_org_admin()
      or public.perm_flag('adjustQuantity')
    )
  );

drop policy if exists "parts_delete" on public.parts;
create policy "parts_delete" on public.parts
  for delete using (
    org_id = public.current_org_id()
    and (
      public.is_org_admin()
      or public.perm_flag('deleteOrDestructive')
    )
  );

-- audit: org içi okuma; ekleme uygulama veya trigger ile
drop policy if exists "audit_select" on public.inventory_audit;
create policy "audit_select" on public.inventory_audit
  for select using (org_id = public.current_org_id());

drop policy if exists "audit_insert" on public.inventory_audit;
create policy "audit_insert" on public.inventory_audit
  for insert with check (org_id = public.current_org_id());

-- ---------------------------------------------------------------------------
-- updated_at tetikleyicisi
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch
  before update on public.profiles
  for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_parts_touch on public.parts;
create trigger trg_parts_touch
  before update on public.parts
  for each row execute procedure public.touch_updated_at();
