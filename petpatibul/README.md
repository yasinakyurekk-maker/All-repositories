# petpatibul.com

Ücretsiz evcil hayvan sahiplendirme sitesi. Kayıp ve bulunan hayvan ilanları da verilebilir.

- **Ziyaretçi**: ilanları il, tür, yaş, cinsiyet ve sağlık durumuna göre filtreler. Her il ve tür için ayrı adres vardır (`/kedi-sahiplendirme/istanbul` gibi), böylece Google'da "İstanbul kedi sahiplendirme" aramasında çıkabilir.
- **Üye**: e-postayla üye olur, fotoğraflı ilan verir, ilanlara başvurur. Başvuranın telefonu yalnızca ilan sahibine görünür.
- **İlan sahibi**: gelen başvuruları Hesabım sayfasında görür, kabul eder ya da reddeder, ilanı "Sahiplendi" olarak kapatır. İsterse ilanını ücretli olarak **öne çıkarır**.
- **Öne çıkan (reklam veren) ilanlar**: ana sayfadaki vitrinde ve tüm listelerin en üstünde gösterilir. Süre bitince kendiliğinden normale döner.
- **Yönetici**: ilanları yayına alır veya reddeder, şikayetleri inceler, öne çıkarma paketlerinin fiyatlarını değiştirir, ödemeleri görür.

Veriler Supabase'de durur, site Vercel'de yayınlanır, ödemeler PayTR ile alınır.

## Kurulum

### 1. Supabase (veritabanı)
1. supabase.com > **New project**. Bölge olarak **Frankfurt (eu-central-1)** seçin.
2. **SQL Editor > New query**: bu klasördeki `supabase.sql` dosyasının tamamını yapıştırın. **En alttaki** `yonetici@ornek.com` yerine kendi e-postanızı yazın, **Run**'a basın.
3. **Authentication > URL Configuration**: *Site URL* alanına `https://petpatibul.com` yazın; *Redirect URLs* listesine `https://petpatibul.com/**` ekleyin.

### 2. Ayarlar
**Project Settings > API** sayfasındaki *Project URL* ve *anon public* anahtarını `config.js` dosyasına yapıştırın.

### 3. Vercel (yayın)
vercel.com > **Add New > Project** > bu depoyu seçin. **Root Directory** olarak `petpatibul` klasörünü seçin > **Deploy**.
Sonra **Settings > Domains** bölümünden `petpatibul.com` alan adını ekleyin ve alan adı firmanızdaki DNS kayıtlarını Vercel'in gösterdiği gibi girin.

### 4. İlk giriş
Sitede **Giriş yap > Üye ol** ile yönetici e-postanızla üye olun. Menüde **Yönetim** bağlantısı görünür. Başka yönetici eklemek için Supabase'de **Table Editor > yoneticiler** tablosuna e-postasını küçük harfle ekleyin.

### 5. Ödeme (PayTR) — öne çıkarma paketleri
Ödeme almak için şirket veya şahıs şirketi ile **PayTR** mağaza başvurusu gerekir (paytr.com). Hesap onaylanınca:

1. PayTR Mağaza Paneli > **Bilgi** sayfasından *Mağaza No*, *Mağaza Parola* ve *Mağaza Gizli Anahtar* değerlerini alın.
2. Bilgisayarınıza [Supabase CLI](https://supabase.com/docs/guides/cli) kurun, bu klasörde:
   ```
   supabase login
   supabase link --project-ref PROJE-KODUNUZ
   supabase secrets set PAYTR_MERCHANT_ID=... PAYTR_MERCHANT_KEY=... PAYTR_MERCHANT_SALT=... SITE_URL=https://petpatibul.com PAYTR_TEST_MODE=1
   supabase functions deploy odeme-baslat
   supabase functions deploy odeme-bildirim --no-verify-jwt
   ```
3. PayTR Mağaza Paneli > **Destek & Kurulum > Ayarlar** bölümünde *Bildirim URL* olarak şunu girin:
   `https://PROJE-KODUNUZ.supabase.co/functions/v1/odeme-bildirim`
4. `config.js` içinde `ODEME_AKTIF: true` yapın.
5. Test kartlarıyla deneyin. Her şey çalışınca `PAYTR_TEST_MODE=0` yapıp `supabase secrets set` komutunu tekrar çalıştırın.

Paket fiyatları **Yönetim** sayfasından ya da Supabase'de `paketler` tablosundan değiştirilir. Başlangıç değerleri: 7 gün 99 TL, 30 gün 299 TL.

## Dosyalar
| Dosya | Ne işe yarar |
|---|---|
| `index.html`, `style.css`, `app.js` | Sitenin kendisi |
| `config.js` | Supabase adresi ve ödeme anahtarı (açık/kapalı) |
| `supabase.sql` | Tablolar, güvenlik kuralları, fotoğraf deposu |
| `supabase/functions/odeme-baslat` | PayTR ödeme sayfasını açar |
| `supabase/functions/odeme-bildirim` | PayTR ödemeyi onaylayınca ilanı öne çıkarır |
| `vercel.json` | Tüm adreslerin siteye yönlenmesi |

## Yayın öncesi yapılacaklar
- `/kvkk` ve `/kullanim-kosullari` sayfalarına bir hukukçunun hazırladığı metinleri ekleyin (`app.js` içinde `metinSayfasi`). Ücretli paket sattığınız için mesafeli satış sözleşmesi de gerekir.
- Logo ve ana sayfadaki görseller için gerçek fotoğraflar ekleyin.
