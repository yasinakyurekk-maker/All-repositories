-- petpatibul.com — veritabanı kurulumu (sahiplendirme, öne çıkarma, mağaza, bağış)
-- Supabase panelinde: SQL Editor > New query > bu dosyanın tamamını yapıştırın > Run.
-- EN ALTTAKİ satırda petpatibul@gmail.com yerine kendi e-postanızı yazın.
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
drop policy if exists y_yaz on yoneticiler;
create policy y_yaz on yoneticiler for all to authenticated using (is_admin()) with check (is_admin());

-- ---------- ENGELLİ ÜYELER ----------
-- Yönetici bir üyeyi engelleyince o üye ilan veremez, başvuru ve şikayet gönderemez.
create table if not exists engelliler (
  uid uuid primary key references auth.users(id) on delete cascade,
  neden text,
  created_at timestamptz not null default now()
);
alter table engelliler enable row level security;
drop policy if exists e_yonet on engelliler;
create policy e_yonet on engelliler for all to authenticated using (is_admin()) with check (is_admin());

create or replace function engelli() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from engelliler where uid = auth.uid())
$$;

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
create policy i_ekle on ilanlar for insert to authenticated with check (auth.uid() is not null and not engelli());
drop policy if exists i_guncelle on ilanlar;
create policy i_guncelle on ilanlar for update to authenticated
  using (sahip_id = auth.uid() or is_admin()) with check ((sahip_id = auth.uid() and not engelli()) or is_admin());
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
  with check (gonderen_id = auth.uid() and durum = 'yeni' and not engelli()
    and exists(select 1 from ilanlar where id = ilan_id and durum = 'yayinda' and sahip_id <> auth.uid()));
drop policy if exists b_guncelle on basvurular;
create policy b_guncelle on basvurular for update to authenticated
  using (ilan_sahibi(ilan_id) = auth.uid() or is_admin())
  with check (ilan_sahibi(ilan_id) = auth.uid() or is_admin());
drop policy if exists b_sil on basvurular;
create policy b_sil on basvurular for delete to authenticated using (is_admin());

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
create policy s_ekle on sikayetler for insert to authenticated with check (gonderen_id = auth.uid() and not cozuldu and not engelli());
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

-- Ödeyenin bilgileri ve yönetici onayı. Ödeme alınınca ilan KENDİLİĞİNDEN öne çıkmaz:
-- yönetici ödemeyi görür, süreyi belirler ve onaylar.
alter table odemeler add column if not exists ad text;
alter table odemeler add column if not exists telefon text;
alter table odemeler add column if not exists email text;
alter table odemeler add column if not exists adres text;
-- Bu sütun ilk eklendiğinde eski (zaten uygulanmış) ödemeler "onaylandi" sayılır; yeniler "bekliyor" başlar.
alter table odemeler add column if not exists onay text not null default 'onaylandi'
  check (onay in ('bekliyor','onaylandi','reddedildi'));
alter table odemeler alter column onay set default 'bekliyor';
alter table odemeler add column if not exists onaylanan_gun integer;
alter table odemeler add column if not exists onay_notu text;
alter table odemeler add column if not exists onay_at timestamptz;

-- PayTR bildirimi: yalnızca ödemenin alındığını kaydeder. Tekrar gelen bildirimi yok sayar.
create or replace function odeme_onayla(p_siparis text, p_basarili boolean, p_hata text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o odemeler;
begin
  select * into o from odemeler where siparis_no = p_siparis for update;
  if not found or o.durum <> 'bekliyor' then return; end if;
  if p_basarili then
    update odemeler set durum = 'odendi', odendi_at = now(), onay = 'bekliyor' where id = o.id;
  else
    update odemeler set durum = 'basarisiz', hata = p_hata where id = o.id;
  end if;
end $$;
revoke all on function odeme_onayla(text, boolean, text) from public, anon, authenticated;
grant execute on function odeme_onayla(text, boolean, text) to service_role;

-- Yönetici ödemeyi onaylar: ilanı belirlediği gün kadar öne çıkarır (varsa kalan sürenin üstüne).
-- İlan henüz onaylanmamışsa istenirse aynı anda yayına da alır.
create or replace function reklam_onayla(p_odeme uuid, p_gun integer, p_yayinla boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare o odemeler;
begin
  if not is_admin() then raise exception 'Bu işlem için yetkiniz yok'; end if;
  if p_gun is null or p_gun < 1 or p_gun > 365 then raise exception 'Süre 1 ile 365 gün arasında olmalı'; end if;
  select * into o from odemeler where id = p_odeme for update;
  if not found or o.durum <> 'odendi' or o.onay <> 'bekliyor' then raise exception 'Bu ödeme onay beklemiyor'; end if;
  update odemeler set onay = 'onaylandi', onaylanan_gun = p_gun, onay_at = now(), onay_notu = null where id = o.id;
  update ilanlar
    set one_cikan_bitis = greatest(coalesce(one_cikan_bitis, now()), now()) + make_interval(days => p_gun),
        durum = case when p_yayinla and durum = 'bekliyor' then 'yayinda' else durum end,
        red_notu = case when p_yayinla and durum = 'bekliyor' then null else red_notu end
    where id = o.ilan_id;
end $$;

-- Yönetici ödemeyi reddeder (ücret PayTR panelinden iade edilir).
create or replace function reklam_reddet(p_odeme uuid, p_not text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Bu işlem için yetkiniz yok'; end if;
  update odemeler set onay = 'reddedildi', onay_notu = nullif(trim(p_not), ''), onay_at = now()
    where id = p_odeme and durum = 'odendi' and onay = 'bekliyor';
  if not found then raise exception 'Bu ödeme onay beklemiyor'; end if;
end $$;
revoke all on function reklam_onayla(uuid, integer, boolean) from public, anon;
revoke all on function reklam_reddet(uuid, text) from public, anon;
grant execute on function reklam_onayla(uuid, integer, boolean), reklam_reddet(uuid, text) to authenticated;

-- ---------- ÜYELER (yalnızca yönetici) ----------
create or replace function uye_listesi()
returns table(id uuid, email text, created_at timestamptz, son_giris timestamptz,
              engelli boolean, engel_nedeni text, yonetici boolean, ilan_sayisi bigint)
language plpgsql stable security definer set search_path = public, auth as $$
#variable_conflict use_column
begin
  if not is_admin() then raise exception 'Bu işlem için yetkiniz yok'; end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at,
           e.uid is not null, e.neden,
           exists(select 1 from yoneticiler y where y.email = lower(u.email)),
           (select count(*) from ilanlar i where i.sahip_id = u.id)
    from auth.users u left join engelliler e on e.uid = u.id
    order by u.created_at desc;
end $$;
revoke all on function uye_listesi() from public, anon;
grant execute on function uye_listesi() to authenticated;

-- Üyeyi engeller ya da engelini kaldırır; istenirse yayındaki/bekleyen ilanlarını da kaldırır.
create or replace function uye_engelle(p_uid uuid, p_engelle boolean, p_neden text default null, p_ilanlari_kaldir boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Bu işlem için yetkiniz yok'; end if;
  if p_engelle then
    insert into engelliler(uid, neden) values (p_uid, nullif(trim(p_neden), ''))
      on conflict (uid) do update set neden = excluded.neden;
    if p_ilanlari_kaldir then
      update ilanlar set durum = 'kaldirildi' where sahip_id = p_uid and durum in ('bekliyor','yayinda');
    end if;
  else
    delete from engelliler where uid = p_uid;
  end if;
end $$;
revoke all on function uye_engelle(uuid, boolean, text, boolean) from public, anon;
grant execute on function uye_engelle(uuid, boolean, text, boolean) to authenticated;

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

-- ---------- AYARLAR (kargo ücreti, en az bağış vb.) ----------
create table if not exists ayarlar (
  anahtar text primary key,
  deger numeric not null
);
alter table ayarlar enable row level security;
drop policy if exists a_oku on ayarlar;
create policy a_oku on ayarlar for select to anon, authenticated using (true);
drop policy if exists a_yaz on ayarlar;
create policy a_yaz on ayarlar for all to authenticated using (is_admin()) with check (is_admin());
insert into ayarlar(anahtar, deger) values
  ('kargo_ucreti', 49.90),          -- TL
  ('ucretsiz_kargo_esigi', 750),    -- bu tutar ve üstü kargo bedava
  ('en_az_bagis', 10)               -- TL
on conflict (anahtar) do nothing;

-- ---------- MAĞAZA: mama ve ekipman ----------
create table if not exists urunler (
  id uuid primary key default gen_random_uuid(),
  ad text not null check (char_length(ad) between 1 and 120),
  kategori text not null check (kategori in ('mama','ekipman','oyuncak','bakim')),
  tur text not null default 'hepsi' check (tur in ('kedi','kopek','kus','diger','hepsi')),
  marka text,
  aciklama text check (char_length(aciklama) <= 6000),
  fiyat numeric(10,2) not null check (fiyat > 0),
  eski_fiyat numeric(10,2) check (eski_fiyat is null or eski_fiyat > 0),
  stok integer not null default 0 check (stok >= 0),
  fotolar text[] not null default '{}',
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists urunler_kategori on urunler(aktif, kategori, tur);
alter table urunler enable row level security;
drop policy if exists ur_oku on urunler;
create policy ur_oku on urunler for select to anon, authenticated using (aktif or is_admin());
drop policy if exists ur_yaz on urunler;
create policy ur_yaz on urunler for all to authenticated using (is_admin()) with check (is_admin());

-- Siparişleri yalnızca ödeme fonksiyonu açar; fiyatlar sunucuda veritabanından hesaplanır.
create table if not exists magaza_siparisleri (
  id uuid primary key default gen_random_uuid(),
  siparis_no text not null unique,
  kullanici_id uuid references auth.users(id) on delete set null,
  kalemler jsonb not null check (jsonb_typeof(kalemler) = 'array' and jsonb_array_length(kalemler) > 0),
  ara_toplam numeric(10,2) not null,
  kargo numeric(10,2) not null default 0,
  toplam numeric(10,2) not null,
  ad text not null, telefon text not null, email text not null,
  adres text not null, il text not null, ilce text,
  durum text not null default 'bekliyor'
    check (durum in ('bekliyor','odendi','hazirlaniyor','kargoda','teslim','iptal','basarisiz')),
  kargo_firma text, kargo_takip text, hata text,
  created_at timestamptz not null default now(),
  odendi_at timestamptz
);
create index if not exists magaza_siparisleri_tarih on magaza_siparisleri(created_at desc);
alter table magaza_siparisleri enable row level security;
drop policy if exists ms_oku on magaza_siparisleri;
create policy ms_oku on magaza_siparisleri for select to authenticated using (kullanici_id = auth.uid() or is_admin());
drop policy if exists ms_guncelle on magaza_siparisleri;
create policy ms_guncelle on magaza_siparisleri for update to authenticated using (is_admin()) with check (is_admin());

-- ---------- SOKAK HAYVANLARI İÇİN BAĞIŞ ----------
create table if not exists bagis_kampanyalari (
  id uuid primary key default gen_random_uuid(),
  baslik text not null check (char_length(baslik) between 1 and 120),
  aciklama text check (char_length(aciklama) <= 6000),
  hedef numeric(12,2) check (hedef is null or hedef > 0),
  foto text,
  aktif boolean not null default true,
  sira integer not null default 0,
  created_at timestamptz not null default now()
);
alter table bagis_kampanyalari enable row level security;
drop policy if exists bk_oku on bagis_kampanyalari;
create policy bk_oku on bagis_kampanyalari for select to anon, authenticated using (aktif or is_admin());
drop policy if exists bk_yaz on bagis_kampanyalari;
create policy bk_yaz on bagis_kampanyalari for all to authenticated using (is_admin()) with check (is_admin());

create table if not exists bagislar (
  id uuid primary key default gen_random_uuid(),
  siparis_no text not null unique,
  kampanya_id uuid references bagis_kampanyalari(id) on delete set null,   -- boş: genel bağış
  kullanici_id uuid references auth.users(id) on delete set null,
  ad text, gizli boolean not null default false,
  email text not null,
  mesaj text check (char_length(mesaj) <= 300),
  tutar numeric(10,2) not null check (tutar > 0),
  durum text not null default 'bekliyor' check (durum in ('bekliyor','odendi','basarisiz')),
  hata text,
  created_at timestamptz not null default now(),
  odendi_at timestamptz
);
alter table bagislar enable row level security;
drop policy if exists bg_oku on bagislar;
create policy bg_oku on bagislar for select to authenticated using (kullanici_id = auth.uid() or is_admin());
drop policy if exists bg_guncelle on bagislar;
create policy bg_guncelle on bagislar for update to authenticated using (is_admin()) with check (is_admin());
-- Bağışçının adı ve mesajı, yönetici onaylayınca "son bağışlar" listesinde görünür.
-- İlk eklendiğinde eski bağışlar görünür kalır; yeniler onay bekler.
alter table bagislar add column if not exists listede boolean not null default true;
alter table bagislar alter column listede set default false;

-- Herkese açık özetler: toplanan tutarlar ve son bağışçılar (e-posta gösterilmez).
drop view if exists bagis_ozet;
create view bagis_ozet as
  select kampanya_id, sum(tutar)::numeric(12,2) as toplanan, count(*) as adet
  from bagislar where durum = 'odendi' group by kampanya_id;
drop view if exists son_bagislar;
create view son_bagislar as
  select id, kampanya_id,
         case when gizli or coalesce(trim(ad), '') = '' then 'İsimsiz bağışçı' else ad end as ad,
         tutar, mesaj, odendi_at
  from bagislar where durum = 'odendi' and listede order by odendi_at desc limit 30;
grant select on bagis_ozet, son_bagislar to anon, authenticated;

-- ---------- ÖDEME BİLDİRİMİ: öne çıkarma (PP), bağış (BG), mağaza siparişi (SP) ----------
create or replace function odeme_isle(p_siparis text, p_basarili boolean, p_hata text default null)
returns void language plpgsql security definer set search_path = public as $$
declare s magaza_siparisleri; k jsonb;
begin
  if p_siparis like 'PP%' then
    perform odeme_onayla(p_siparis, p_basarili, p_hata);
  elsif p_siparis like 'BG%' then
    update bagislar
      set durum = case when p_basarili then 'odendi' else 'basarisiz' end,
          odendi_at = case when p_basarili then now() end,
          hata = case when p_basarili then null else p_hata end
      where siparis_no = p_siparis and durum = 'bekliyor';
  elsif p_siparis like 'SP%' then
    select * into s from magaza_siparisleri where siparis_no = p_siparis for update;
    if not found or s.durum <> 'bekliyor' then return; end if;
    if not p_basarili then
      update magaza_siparisleri set durum = 'basarisiz', hata = p_hata where id = s.id;
      return;
    end if;
    update magaza_siparisleri set durum = 'odendi', odendi_at = now() where id = s.id;
    for k in select * from jsonb_array_elements(s.kalemler) loop
      update urunler set stok = greatest(stok - (k->>'adet')::int, 0) where id = (k->>'urun_id')::uuid;
    end loop;
  end if;
end $$;
revoke all on function odeme_isle(text, boolean, text) from public, anon, authenticated;
grant execute on function odeme_isle(text, boolean, text) to service_role;

-- ---------- ÜRÜN VE KAMPANYA FOTOĞRAFLARI (yalnızca yönetici yükler) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('magaza-fotolari', 'magaza-fotolari', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists mf_yukle on storage.objects;
create policy mf_yukle on storage.objects for insert to authenticated with check (bucket_id = 'magaza-fotolari' and is_admin());
drop policy if exists mf_sil on storage.objects;
create policy mf_sil on storage.objects for delete to authenticated using (bucket_id = 'magaza-fotolari' and is_admin());

-- ---------- SİTE İÇERİĞİ (bannerlar, görseller, metinler, menüler, iletişim) ----------
-- Yönetim > Site içeriği sayfasından düzenlenir. Her bölüm ayrı satırdır; herkes okur, yalnızca yönetici yazar.
-- Görseller magaza-fotolari deposunun site/ klasörüne yüklenir (yalnızca yönetici yükleyebilir).
create table if not exists site_icerik (
  anahtar text primary key check (char_length(anahtar) between 1 and 40),
  deger jsonb not null default '{}'::jsonb,
  guncellendi timestamptz not null default now()
);
alter table site_icerik enable row level security;
drop policy if exists si_oku on site_icerik;
create policy si_oku on site_icerik for select to anon, authenticated using (true);
drop policy if exists si_yaz on site_icerik;
create policy si_yaz on site_icerik for all to authenticated using (is_admin()) with check (is_admin());
grant select on site_icerik to anon, authenticated;
grant insert, update, delete on site_icerik to authenticated;

-- >>> Kendi e-postanızı yazın <<<
insert into yoneticiler(email) values (lower('petpatibul@gmail.com')) on conflict do nothing;
