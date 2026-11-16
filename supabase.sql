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
  yetkili text,
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
alter table kurumlar add column if not exists yetkili text;
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

-- ---------- ÜRÜNLER VE ÜRÜN SİPARİŞLERİ ----------
create table if not exists urunler (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  kategori text,
  birim text not null default 'adet',
  fiyat numeric(10,2),
  aciklama text,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- kalemler: [{"urun_id": "...", "ad": "...", "birim": "adet", "fiyat": 12.5, "adet": 40}, ...]
create table if not exists siparisler (
  id uuid primary key default gen_random_uuid(),
  kurum_id uuid not null references kurumlar(id) on delete cascade,
  kalemler jsonb not null check (jsonb_typeof(kalemler) = 'array' and jsonb_array_length(kalemler) > 0),
  teslim_tarihi date,
  notlar text,
  durum text not null default 'bekliyor' check (durum in ('bekliyor','onaylandi','hazirlaniyor','teslim','iptal')),
  created_at timestamptz not null default now()
);
create index if not exists siparisler_created on siparisler(created_at desc);

alter table urunler    enable row level security;
alter table siparisler enable row level security;

drop policy if exists u_oku on urunler;
create policy u_oku on urunler for select to authenticated using (aktif or is_admin());
drop policy if exists u_yaz on urunler;
create policy u_yaz on urunler for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists s_oku on siparisler;
create policy s_oku on siparisler for select to authenticated using (is_admin() or kurum_id = benim_kurum());
drop policy if exists s_ekle on siparisler;
create policy s_ekle on siparisler for insert to authenticated
  with check (is_admin() or (kurum_id = benim_kurum() and durum = 'bekliyor'));
drop policy if exists s_guncelle on siparisler;
create policy s_guncelle on siparisler for update to authenticated
  using (is_admin() or (kurum_id = benim_kurum() and durum = 'bekliyor'))
  with check (is_admin() or (kurum_id = benim_kurum() and durum = 'bekliyor'));
drop policy if exists s_sil on siparisler;
create policy s_sil on siparisler for delete to authenticated
  using (is_admin() or (kurum_id = benim_kurum() and durum = 'bekliyor'));

do $$ begin
  alter publication supabase_realtime add table siparisler;
exception when others then null; end $$;

-- ---------- YAYIN TAKVİMİ ----------
-- Yayıncının denemeleri; kurumlar buradan tik atarak sipariş verir.
create table if not exists takvim (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  sinif text not null,
  tarih date not null,
  tur text,
  aciklama text,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists takvim_tarih on takvim(tarih);
alter table denemeler add column if not exists takvim_id uuid references takvim(id) on delete set null;
create unique index if not exists denemeler_kurum_takvim on denemeler(kurum_id, takvim_id) where takvim_id is not null;

alter table takvim enable row level security;
drop policy if exists t_oku on takvim;
create policy t_oku on takvim for select to authenticated using (aktif or is_admin());
drop policy if exists t_yaz on takvim;
create policy t_yaz on takvim for all to authenticated using (is_admin()) with check (is_admin());

-- Yeni kayıtlar yönetici ekranına anında düşsün
do $$ begin
  alter publication supabase_realtime add table denemeler;
exception when others then null; end $$;

-- >>> Kendi e-postanızı yazın <<<
insert into yoneticiler(email) values (lower('yonetici@ornek.com')) on conflict do nothing;
