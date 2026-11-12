-- Kurum Deneme Takvimi — veritabanı kurulumu
-- Supabase panelinde: SQL Editor > New query > bu dosyanın tamamını yapıştırın.
-- EN ALTTAKİ satırda yonetici@ornek.com yerine kendi e-postanızı yazın, sonra "Run".

create table if not exists yoneticiler (
  email text primary key check (email = lower(email))
);

create table if not exists kurumlar (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  email text not null unique check (email = lower(email)),
  telefon text,
  created_at timestamptz not null default now()
);

create table if not exists denemeler (
  id uuid primary key default gen_random_uuid(),
  kurum_id uuid not null references kurumlar(id) on delete cascade,
  tarih date not null,
  ad text,
  sinif text,
  ogrenci integer,
  notlar text,
  durum text not null default 'bekliyor' check (durum in ('bekliyor','onaylandi','iptal')),
  created_at timestamptz not null default now()
);
create index if not exists denemeler_tarih on denemeler(tarih);

-- Giriş yapan kişinin e-postası
create or replace function oturum_email() returns text
language sql stable as $$ select lower(coalesce(auth.jwt()->>'email','')) $$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from yoneticiler where email = oturum_email())
$$;

create or replace function benim_kurum() returns uuid
language sql stable security definer set search_path = public as $$
  select id from kurumlar where email = oturum_email()
$$;

alter table yoneticiler enable row level security;
alter table kurumlar    enable row level security;
alter table denemeler   enable row level security;

drop policy if exists y_oku on yoneticiler;
create policy y_oku on yoneticiler for select to authenticated using (is_admin());

drop policy if exists k_oku on kurumlar;
create policy k_oku on kurumlar for select to authenticated using (is_admin() or id = benim_kurum());
drop policy if exists k_yaz on kurumlar;
create policy k_yaz on kurumlar for all to authenticated using (is_admin()) with check (is_admin());

-- Yönetici her şeyi yapar. Kurum yalnızca kendi denemelerini görür;
-- ekleyebilir, onaylanmadan önce düzenleyip silebilir.
drop policy if exists d_oku on denemeler;
create policy d_oku on denemeler for select to authenticated
  using (is_admin() or kurum_id = benim_kurum());
drop policy if exists d_ekle on denemeler;
create policy d_ekle on denemeler for insert to authenticated
  with check (is_admin() or (kurum_id = benim_kurum() and durum = 'bekliyor'));
drop policy if exists d_guncelle on denemeler;
create policy d_guncelle on denemeler for update to authenticated
  using (is_admin() or (kurum_id = benim_kurum() and durum = 'bekliyor'))
  with check (is_admin() or (kurum_id = benim_kurum() and durum = 'bekliyor'));
drop policy if exists d_sil on denemeler;
create policy d_sil on denemeler for delete to authenticated
  using (is_admin() or (kurum_id = benim_kurum() and durum = 'bekliyor'));

-- Yeni kayıtlar yönetici ekranına anında düşsün
do $$ begin
  alter publication supabase_realtime add table denemeler;
exception when others then null; end $$;

-- >>> Kendi e-postanızı yazın <<<
insert into yoneticiler(email) values (lower('yonetici@ornek.com')) on conflict do nothing;
