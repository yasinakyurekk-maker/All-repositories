# PetPatiBul Instagram günlük paylaşım talimatı

Her gün 20:00 (İstanbul) civarında @petpatibul hesabına 1 gönderi paylaşılır.

1. `havuz.json` dosyasını oku (dal: `claude/project-thread-qzxkap`).
2. Sıra:
   - Önce `fotograflar` listesinde `paylasildi` boş olan İLK kayıt. Görsel adresi:
     `https://raw.githubusercontent.com/yasinakyurekk-maker/All-repositories/claude/project-thread-qzxkap/instagram-petpatibul/fotograflar/<dosya>`
     Açıklama olarak kayıttaki `aciklama` metnini aynen kullan.
   - Bunlar bitince `pexels_sirasi` listesinde `paylasildi` boş olan İLK kayıt. `image_url` adresini kullan.
     `konu` alanına göre kısa, sıcak, Türkçe bir açıklama yaz (1-2 cümle, 2-3 emoji, petpatibul.com'a / profildeki bağlantıya davet),
     ardından boş satır ve `📸 Pexels`, sonra boş satır ve hashtagler:
     `#petpatibul #evcilhayvan #patilidostlar #minnoş` + konuya uygun 3-4 tane (#kedi #yavrukedi #köpek #yavruköpek #kittens #puppies gibi).
   - İkisi de bittiyse paylaşım YAPMA, kullanıcıya fotoğrafların bittiğini bildir.
3. Windsor.ai `execute_action` ile paylaş: connector `instagram`, account `17841475688039101`,
   action `create_image_post`, params `{image_url, caption, alt_text}` (alt_text: fotoğrafın kısa Türkçe tarifi).
4. Başarılıysa kaydın `paylasildi` alanına tarihi (YYYY-AA-GG) ve `media_id` yaz, commit edip aynı dala push et.
5. Aynı gün ikinci kez paylaşım yapma: bugünün tarihi zaten bir kayıtta varsa dur.
6. Hata olursa (ör. hesap bağlantısı koptu) tekrar deneme döngüsüne girme; hatayı kısaca bildir.
