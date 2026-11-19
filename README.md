# Bizden Yayıncılık B2B

Deneme sipariş ve takvim sistemi.

Kurumların deneme siparişi verdiği, yöneticinin tüm kurumların denemelerini tek takvimde gördüğü web sitesi.

- **Yönetici**: kurumları tanımlar (ad + giriş e-postası), gelen siparişleri onaylar veya iptal eder, tüm takvimi görür. Denemeye 1 hafta kala uyarı çıkar.
- **Kurum**: kendi e-postasıyla girer, yalnızca kendi denemelerini görür, sipariş verir. Onaylanana kadar düzenleyip silebilir.
- **Ürün sipariş formu**: fiyat ve katalog yok. Kurum formu doldurur (yetkili, telefon, teslim adresi), ürün adlarını ve adetlerini kendisi yazar, "Satır ekle" ile istediği kadar satır ekler; teslim tarihi ve ödeme şeklini seçer. Sipariş anında yöneticinin "Gelen siparişler" ekranına düşer, yazdırılabilir form olarak açılır (Yazdır / PDF). Yönetici durumu (onaylandı, hazırlanıyor, teslim edildi, iptal) günceller.

> Daha önce SQL'i çalıştırdıysanız, `supabase.sql` dosyasını yeniden çalıştırmanız yeterli; mevcut veriler silinmez.

Veriler Supabase'de durur, site Vercel'de yayınlanır. İkisi de ücretsiz.

## Kurulum

### 1. Supabase (veritabanı)
1. supabase.com > **New project**. Bir ad verin, bir veritabanı şifresi belirleyin, bölge olarak **Frankfurt (eu-central-1)** seçin.
2. Proje açılınca sol menüden **SQL Editor > New query**.
3. Bu depodaki `supabase.sql` dosyasının tamamını yapıştırın. **En alttaki** `yonetici@ornek.com` yerine kendi e-postanızı yazın ve **Run**'a basın.
4. **Authentication > URL Configuration** bölümünde *Site URL* alanına sitenizin adresini yazın (4. adımdan sonra, örn. `https://deneme-takvimi.vercel.app`).

### 2. Ayarlar
**Project Settings > API** sayfasındaki *Project URL* ve *anon public* anahtarını `config.js` dosyasına yapıştırın.
(Bu anahtar herkese açık olabilir; güvenliği veritabanındaki kurallar sağlar.)

### 3. Vercel (yayın)
vercel.com > **Add New > Project** > bu GitHub deposunu seçin > **Deploy**. Ayar gerekmez.

### 4. İlk giriş
- Siteyi açın, **İlk kez giriş** sekmesinde yönetici e-postanızla bir şifre belirleyin. E-postanıza gelen onay bağlantısına tıklayın, sonra giriş yapın.
- **Kurumlar** bölümünden kurumları ekleyin. Her kurum, verdiğiniz e-postayla aynı şekilde "İlk kez giriş" yapar.

Başka yönetici eklemek için Supabase'de **Table Editor > yoneticiler** tablosuna e-postasını küçük harfle ekleyin.

## Logo
Logoyu `logo.png` adıyla deponun ana klasörüne koyun. Dosya yoksa site logosuz, yalnızca adla görünür.
