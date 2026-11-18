# Zafer günlük klip sistemi

Bilgisayar kapalıyken de çalışır: GitHub Actions her gün İstanbul saatiyle 09:30, 11:30 ve 16:30'da başlar.
Ümit Özdağ'ın ve Zafer Partisi'nin resmi YouTube kanallarındaki yeni konuşmalardan 30–60 saniyelik kesintisiz
bir bölüm seçer, Zafer çerçevesiyle dikey video olarak keser ve `zafer-klipler/gunluk/<tarih>/` klasörüne koyar.
Sabah çalıştırması ayrıca haber başlıklarındaki alıntılardan en fazla 2 kart hazırlar.

**Hiçbir şey Instagram'a otomatik paylaşılmaz.**

## Kurulum (bir kez)

1. Depo > Settings > Secrets and variables > Actions > **New repository secret**
   - `ANTHROPIC_API_KEY`: console.anthropic.com'dan alınan API anahtarı (bölüm seçimi ve başlık için).
   - `YT_COOKIES` (isteğe bağlı): YouTube, GitHub sunucularını "bot" diye engellerse tarayıcıdan alınan
     cookies.txt içeriği. Ayrı, boş bir Google hesabı kullanın.
2. Actions sekmesinde "Zafer günlük klip" > **Run workflow** ile bir deneme yapın.

## Durdurmak

Actions > Zafer günlük klip > sağ üstteki "..." > **Disable workflow**.
