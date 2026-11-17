-- petpatibul.com — veritabanı kurulumu
-- Supabase panelinde: SQL Editor > New query > bu dosyanın tamamını yapıştırın > Run.
-- EN ALTTAKİ satırda yonetici@ornek.com yerine kendi e-postanızı yazın.
-- Dosya tekrar çalıştırılabilir; mevcut veriler silinmez.

-- ---------- YÖNETİCİLER ----------
create table if not exists yoneticiler (
  email text primary key check (email = lower(email))
);

create or replace function oturum_email() returns text
language sql stable as $$ select lower(coalesce(auth.jwt()->>'email','')) $$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from yoneticiler where email = oturum_email())
$$;

-- Ödeme bildirimi gibi sunucu işlemleri "service_role" anahtarıyla çalışır.
create or replace function is_servis() returns boolean
language sql stable as $$ select coalesce(auth.jwt()->>'role','') = 'service_role' $$;

alter table yoneticiler enable row level security;
drop policy if exists y_oku on yoneticiler;
create policy y_oku on yoneticiler for select to authenticated using (is_admin());

-- ---------- İLANLAR ----------
create table if not exists ilanlar (
  id uuid primary key default gen_random_uuid(),
  sahip_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kategori text not null default 'sahiplendirme' check (kategori in ('sahiplendirme','kayip','bulunan')),
  tur text not null check (tur in ('kedi','kopek','kus','diger')),
  ad text not null check (char_length(ad) between 1 and 60),
  irk text,
  yas_grubu text check (yas_grubu in ('yavru','genc','yetiskin','yasli')),
  cinsiyet text not null default 'bilinmiyor' check (cinsiyet in ('disi','erkek','bilinmiyor')),
  il text not null,
  ilce text,
  aciklama text check (char_length(aciklama) <= 4000),
  asili boolean not null default false,
  kisir boolean not null default false,
  cocuk_uyumlu boolean not null default false,
  hayvan_uyumlu boolean not null default false,
  ozel_bakim boolean not null default false,
  fotolar text[] not null default '{}',
  durum text not null default 'bekliyor'
    check (durum in ('bekliyor','yayinda','reddedildi','sahiplendi','kaldirildi')),
  red_notu text,
  one_cikan_bitis timestamptz,         -- reklam (öne çıkarma) bitiş zamanı
  yayin_tarihi timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ilanlar_durum on ilanlar(durum, il, tur);
create index if not exists ilanlar_sahip on ilanlar(sahip_id);

-- Kullanıcı kendi ilanını onaylayamaz ve kendine ücretsiz reklam veremez:
-- bu alanları yalnızca yönetici veya ödeme sistemi değiştirir.
create or replace function ilan_koru() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if is_admin() or is_servis() then
    if new.durum = 'yayinda' and new.yayin_tarihi is null then new.yayin_tarihi := now(); end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.sahip_id := auth.uid();
    new.durum := 'bekliyor';
    new.one_cikan_bitis := null;
    new.yayin_tarihi := null;
    new.red_notu := null;
    return new;
  end if;
  -- güncelleme (ilan sahibi)
  new.sahip_id := old.sahip_id;
  new.one_cikan_bitis := old.one_cikan_bitis;
  new.yayin_tarihi := old.yayin_tarihi;
  new.red_notu := old.red_notu;
  if new.durum in ('sahiplendi','kaldirildi') and old.durum <> new.durum then
    return new;                                   -- sahibi ilanı kapatabilir
  end if;
  if old.durum in ('sahiplendi','kaldirildi') then
    new.durum := old.durum;                       -- kapanmış ilan geri açılamaz
    return new;
  end if;
  new.durum := 'bekliyor';                        -- içerik değişti: yeniden onaya düşer
  return new;
end $$;
drop trigger if exists ilan_koru on ilanlar;
create trigger ilan_koru before insert or update on ilanlar for each row execute function ilan_koru();

alter table ilanlar enable row level security;
drop policy if exists i_oku on ilanlar;
create policy i_oku on ilanlar for select to anon, authenticated
  using (durum = 'yayinda' or sahip_id = auth.uid() or is_admin());
drop policy if exists i_ekle on ilanlar;
create policy i_ekle on ilanlar for insert to authenticated with check (auth.uid() is not null);
drop policy if exists i_guncelle on ilanlar;
create policy i_guncelle on ilanlar for update to authenticated
  using (sahip_id = auth.uid() or is_admin()) with check (sahip_id = auth.uid() or is_admin());
drop policy if exists i_sil on ilanlar;
create policy i_sil on ilanlar for delete to authenticated using (is_admin());

-- Yayındaki ilanlar: reklam verenler (öne çıkanlar) önce gelsin diye hesaplı alan.
drop view if exists yayindaki_ilanlar;
create view yayindaki_ilanlar with (security_invoker = true) as
  select i.*, coalesce(i.one_cikan_bitis > now(), false) as one_cikan
  from ilanlar i where i.durum = 'yayinda';
grant select on yayindaki_ilanlar to anon, authenticated;

-- ---------- BAŞVURULAR (sahiplenme başvurusu / kayıp ilanına bilgi) ----------
create table if not exists basvurular (
  id uuid primary key default gen_random_uuid(),
  ilan_id uuid not null references ilanlar(id) on delete cascade,
  gonderen_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ad text not null,
  telefon text not null,
  il text,
  ev_tipi text,
  baska_hayvan boolean not null default false,
  cocuk boolean not null default false,
  mesaj text check (char_length(mesaj) <= 2000),
  durum text not null default 'yeni' check (durum in ('yeni','kabul','red')),
  created_at timestamptz not null default now()
);
create index if not exists basvurular_ilan on basvurular(ilan_id);
create unique index if not exists basvurular_tekil on basvurular(ilan_id, gonderen_id);

create or replace function ilan_sahibi(i uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select sahip_id from ilanlar where id = i
$$;

alter table basvurular enable row level security;
drop policy if exists b_oku on basvurular;
create policy b_oku on basvurular for select to authenticated
  using (gonderen_id = auth.uid() or ilan_sahibi(ilan_id) = auth.uid() or is_admin());
drop policy if exists b_ekle on basvurular;
create policy b_ekle on basvurular for insert to authenticated
  with check (gonderen_id = auth.uid() and durum = 'yeni'
    and exists(select 1 from ilanlar where id = ilan_id and durum = 'yayinda' and sahip_id <> auth.uid()));
drop policy if exists b_guncelle on basvurular;
create policy b_guncelle on basvurular for update to authenticated
  using (ilan_sahibi(ilan_id) = auth.uid() or is_admin())
  with check (ilan_sahibi(ilan_id) = auth.uid() or is_admin());

-- ---------- ŞİKAYETLER ----------
create table if not exists sikayetler (
  id uuid primary key default gen_random_uuid(),
  ilan_id uuid not null references ilanlar(id) on delete cascade,
  gonderen_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  neden text not null,
  aciklama text check (char_length(aciklama) <= 1000),
  cozuldu boolean not null default false,
  created_at timestamptz not null default now()
);
alter table sikayetler enable row level security;
drop policy if exists s_ekle on sikayetler;
create policy s_ekle on sikayetler for insert to authenticated with check (gonderen_id = auth.uid() and not cozuldu);
drop policy if exists s_yonet on sikayetler;
create policy s_yonet on sikayetler for all to authenticated using (is_admin()) with check (is_admin());

-- ---------- REKLAM (ÖNE ÇIKARMA) PAKETLERİ ----------
create table if not exists paketler (
  kod text primary key,
  ad text not null,
  gun integer not null check (gun > 0),
  fiyat numeric(10,2) not null check (fiyat > 0),
  aktif boolean not null default true,
  sira integer not null default 0
);
alter table paketler enable row level security;
drop policy if exists p_oku on paketler;
create policy p_oku on paketler for select to anon, authenticated using (aktif or is_admin());
drop policy if exists p_yaz on paketler;
create policy p_yaz on paketler for all to authenticated using (is_admin()) with check (is_admin());

-- Örnek fiyatlar: Table Editor > paketler tablosundan değiştirebilirsiniz.
insert into paketler(kod, ad, gun, fiyat, sira) values
  ('vitrin7',  '7 gün öne çıkar',  7,  99.00, 1),
  ('vitrin30', '30 gün öne çıkar', 30, 299.00, 2)
on conflict (kod) do nothing;

-- ---------- ÖDEMELER ----------
-- Satırları yalnızca ödeme fonksiyonları (service_role) yazar.
create table if not exists odemeler (
  id uuid primary key default gen_random_uuid(),
  siparis_no text not null unique,       -- PayTR merchant_oid
  ilan_id uuid not null references ilanlar(id) on delete cascade,
  sahip_id uuid not null references auth.users(id) on delete cascade,
  paket_kod text not null references paketler(kod),
  gun integer not null,
  tutar numeric(10,2) not null,
  durum text not null default 'bekliyor' check (durum in ('bekliyor','odendi','basarisiz')),
  hata text,
  created_at timestamptz not null default now(),
  odendi_at timestamptz
);
alter table odemeler enable row level security;
drop policy if exists o_oku on odemeler;
create policy o_oku on odemeler for select to authenticated using (sahip_id = auth.uid() or is_admin());

-- Ödeme onaylanınca ilanı öne çıkarır (süre üst üste eklenir). Tekrar gelen bildirimi yok sayar.
create or replace function odeme_onayla(p_siparis text, p_basarili boolean, p_hata text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o odemeler;
begin
  select * into o from odemeler where siparis_no = p_siparis for update;
  if not found or o.durum <> 'bekliyor' then return; end if;
  if p_basarili then
    update odemeler set durum = 'odendi', odendi_at = now() where id = o.id;
    update ilanlar
      set one_cikan_bitis = greatest(coalesce(one_cikan_bitis, now()), now()) + make_interval(days => o.gun)
      where id = o.ilan_id;
  else
    update odemeler set durum = 'basarisiz', hata = p_hata where id = o.id;
  end if;
end $$;
revoke all on function odeme_onayla(text, boolean, text) from public, anon, authenticated;
grant execute on function odeme_onayla(text, boolean, text) to service_role;

-- ---------- FOTOĞRAFLAR (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ilan-fotolari', 'ilan-fotolari', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists f_yukle on storage.objects;
create policy f_yukle on storage.objects for insert to authenticated
  with check (bucket_id = 'ilan-fotolari' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists f_sil on storage.objects;
create policy f_sil on storage.objects for delete to authenticated
  using (bucket_id = 'ilan-fotolari' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));

-- >>> Kendi e-postanızı yazın <<<
insert into yoneticiler(email) values (lower('yonetici@ornek.com')) on conflict do nothing;
