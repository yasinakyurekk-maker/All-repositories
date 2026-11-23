# petpatibul.com

Ücretsiz evcil hayvan sahiplendirme sitesi. Kayıp ve bulunan hayvan ilanları da verilebilir.

- **Ziyaretçi**: ilanları il, tür, yaş, cinsiyet ve sağlık durumuna göre filtreler. Her il ve tür için ayrı adres vardır (`/kedi-sahiplendirme/istanbul` gibi), böylece Google'da "İstanbul kedi sahiplendirme" aramasında çıkabilir.
- **Üye**: e-postayla üye olur, fotoğraflı ilan verir, ilanlara başvurur. Başvuranın telefonu yalnızca ilan sahibine görünür.
- **İlan sahibi**: gelen başvuruları Hesabım sayfasında görür, kabul eder ya da reddeder, ilanı "Sahiplendi" olarak kapatır. İsterse ilanını ücretli olarak **öne çıkarır**. Ödeme alınınca ilan hemen öne çıkmaz; yönetici ödeyeni görür, süreyi belirleyip onaylar.
- **Öne çıkan (reklam veren) ilanlar**: ana sayfadaki vitrinde ve tüm listelerin en üstünde gösterilir. Süre bitince kendiliğinden normale döner.
- **Mağaza** (`/magaza`): mama, ekipman, oyuncak ve bakım ürünleri. Sepet bu tarayıcıda tutulur, ödeme PayTR ile alınır. Ödeme onaylanınca stok kendiliğinden düşer. Belirli tutarın üstünde kargo bedava.
- **Bağış** (`/bagis`): sokak hayvanları için genel bağış ya da kampanyaya bağış (örn. kış maması, kısırlaştırma fonu). Toplanan tutarlar ve son bağışçılar herkese açık; bağışçı isterse adını gizleyebilir.
- **Yönetici** (`/yonetim`): sitede hiçbir şey onun onayı olmadan yayına girmez. Özet sayfasında onayını bekleyen her şey sayılarla görünür.
  - *İlanlar*: tüm ilanları durumuna göre listeler, arar, onaylar, reddeder, kaldırır, düzenler, kalıcı siler; istediği ilanı ödemesiz olarak istediği gün kadar öne çıkarır.
  - *Reklamlar*: öne çıkarma için ödeme yapanın adını, telefonunu, e-postasını, adresini görür; kaç gün öne çıkacağını kendisi belirleyip onaylar ya da reddeder (iade PayTR panelinden). Öne çıkan ilanların bitiş tarihini değiştirir, paket ekler, fiyat ve gün değiştirir.
  - *Başvurular*, *Şikayetler*: tüm başvuruları ve şikayetleri görür, karar verir.
  - *Üyeler*: üyeleri listeler, engeller (engelli üye ilan, başvuru, şikayet gönderemez; ilanları da kaldırılabilir), başka yönetici ekler ya da çıkarır.
  - *Ürünler*, *Siparişler*, *Bağışlar*: ürün ve stok, sipariş durumu ve kargo takip numarası, bağış kampanyaları. Bağışçının adı ve mesajı yönetici onaylayınca listede görünür.

Veriler Supabase'de durur, site Vercel'de yayınlanır, ödemeler PayTR ile alınır.

## Kurulum

### 1. Supabase (veritabanı)
1. supabase.com > **New project**. Bölge olarak **Frankfurt (eu-central-1)** seçin.
2. **SQL Editor > New query**: bu klasördeki `supabase.sql` dosyasının tamamını yapıştırın. (Dosya güncellenince aynı şekilde tekrar çalıştırın; veriler silinmez.) **En alttaki** `yonetici@ornek.com` yerine kendi e-postanızı yazın, **Run**'a basın.
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
Aynı PayTR hesabı mağaza siparişleri ve bağışlar için de kullanılır; ek kurulum gerekmez. Kargo ücreti (başlangıç 49,90 TL) ve ücretsiz kargo sınırı (750 TL) **Yönetim > Ürünler** sayfasından değiştirilir.

### 6. Bağış (önemli)
Türkiye'de halktan bağış toplamak 2860 sayılı Yardım Toplama Kanunu'na tabidir: bağışı bir **dernek veya vakıf** toplamalı ya da valilikten/kaymakamlıktan **yardım toplama izni** alınmalıdır. Şahıs veya şirket olarak izinsiz bağış toplamak suç sayılabilir. Bu yüzden bağış bölümü kapalı gelir.

Seçenekler:
- Bir hayvan hakları derneği kurmak ya da var olan bir dernekle anlaşıp ödemeleri derneğin PayTR hesabına almak (önerilen).
- Yardım toplama izni almak.

Hukuki durum netleşince `config.js` içinde `BAGIS_AKTIF: true` yapın. Bağış kampanyalarını **Yönetim > Bağışlar** sayfasından açabilirsiniz.

### 7. Mağaza için yasal gereklilikler
Ürün satışı için şirket (en azından şahıs şirketi), e-fatura/e-arşiv, mesafeli satış sözleşmesi ve ön bilgilendirme formu gerekir. Mama satıyorsanız ürünlerin Tarım ve Orman Bakanlığı kayıtlı olması gerekir.

## Dosyalar
| Dosya | Ne işe yarar |
|---|---|
| `index.html`, `style.css`, `app.js` | Sitenin kendisi: sahiplendirme, ilanlar, hesap ve ilan yönetimi |
| `magaza.js` | Mağaza, sepet, bağış sayfaları ve bunların yönetim ekranları |
| `yonetim.js` | Yönetim paneli: özet, ilanlar, reklam onayı, başvurular, şikayetler, üyeler |
| `config.js` | Supabase adresi ve ödeme anahtarı (açık/kapalı) |
| `supabase.sql` | Tablolar, güvenlik kuralları, fotoğraf deposu |
| `supabase/functions/odeme-baslat` | PayTR ödeme sayfasını açar (öne çıkarma, sipariş, bağış); tutarı veritabanından hesaplar |
| `supabase/functions/odeme-bildirim` | PayTR ödemeyi onaylayınca ilanı öne çıkarır, siparişi onaylayıp stoğu düşer ya da bağışı kaydeder |
| `vercel.json` | Tüm adreslerin siteye yönlenmesi |

## Yayın öncesi yapılacaklar
- `/kvkk` ve `/kullanim-kosullari` sayfalarına bir hukukçunun hazırladığı metinleri ekleyin (`app.js` içinde `metinSayfasi`). Ücretli paket sattığınız için mesafeli satış sözleşmesi de gerekir.
- Logo ve ana sayfadaki görseller için gerçek fotoğraflar ekleyin.
