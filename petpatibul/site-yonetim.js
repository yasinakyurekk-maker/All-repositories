// petpatibul.com — yönetim paneli: Site içeriği (bannerlar, görseller, metinler, menüler, iletişim, sayfalar).
// Her bölüm "site_icerik" tablosuna ayrı satır olarak kaydedilir. icerik.js ve yonetim.js'ten sonra yüklenir.
"use strict";

SEKMELER.splice(1, 0, ["/yonetim/site", "Site içeriği"]);

const SITE_ADRESLERI = [
  ["/", "Ana sayfa"], ["/sahiplendirme", "Tüm sahiplendirme ilanları"], ["/kedi-sahiplendirme", "Kedi ilanları"], ["/kopek-sahiplendirme", "Köpek ilanları"],
  ["/kus-sahiplendirme", "Kuş ilanları"], ["/diger-sahiplendirme", "Diğer hayvan ilanları"], ["/kayip-ilanlari", "Kayıp ilanları"], ["/bulunan-ilanlari", "Bulunan ilanları"],
  ["/ilan-ver", "İlan ver"], ["/ilan-ver?kategori=kayip", "Kayıp ilanı ver"], ["/ilan-ver?kategori=bulunan", "Bulunan ilanı ver"], ["/magaza", "Mağaza"], ["/sepet", "Sepet"],
  ["/hakkimizda", "Hakkımızda"], ["/sss", "Sıkça sorulan sorular"], ["/kvkk", "KVKK"], ["/kullanim-kosullari", "Kullanım koşulları"], ["/giris", "Giriş yap"], ["/hesabim", "Hesabım"],
];

// Alan türleri: yazi, uzun, link, gorsel, onay, sayi, renk, secim, liste
const IE_BOLUMLER = [
  { k: "bannerlar", ad: "Bannerlar", aciklama: "Ana sayfada üst alanın hemen altında kayan büyük görseller. Her banner'a tıklanınca istediğin sayfaya gider. Önerilen görsel boyutu: 1600 × 560 piksel (yatay).",
    alanlar: [
      { k: "aktif", t: "onay", a: "Bannerları ana sayfada göster" },
      { k: "sure", t: "sayi", a: "Kaç saniyede bir geçsin?", min: 2, max: 30 },
      { k: "liste", t: "liste", a: "Bannerlar", ekle: "Banner ekle", oge: "Banner", baslikAlani: "baslik", alanlar: [
        { k: "aktif", t: "onay", a: "Yayında", vars: true },
        { k: "gorsel", t: "gorsel", a: "Görsel" },
        { k: "odak", t: "secim", a: "Telefonda görselin hangi kısmı görünsün?", secim: { orta: "Ortası", sag: "Sağ tarafı", sol: "Sol tarafı" }, y: "Telefon ekranı dar olduğu için görselin bir kısmı kırpılır." },
        { k: "baslik", t: "yazi", a: "Başlık (isteğe bağlı)", y: "Boş bırakırsan görselin üstüne yazı yazılmaz." },
        { k: "metin", t: "uzun", a: "Kısa metin (isteğe bağlı)" },
        { k: "buton", t: "yazi", a: "Düğme yazısı (isteğe bağlı)", y: "Örn. Hemen incele" },
        { k: "link", t: "link", a: "Tıklanınca gideceği adres" },
      ] },
    ] },
  { k: "kahraman", ad: "Ana sayfa üst alan", aciklama: "Siteye girince ilk görünen büyük başlık, yazı ve sağdaki 4 görsel.",
    alanlar: [
      { k: "rozet", t: "yazi", a: "Küçük etiket yazısı" },
      { k: "baslik", t: "uzun", a: "Büyük başlık", y: "Alt satıra geçmek için Enter'a bas.", satir: 2 },
      { k: "aciklama", t: "uzun", a: "Açıklama" },
      { k: "arama_goster", t: "onay", a: "Arama kutusunu göster" },
      { k: "arka_gorsel", t: "gorsel", a: "Arka plan görseli (isteğe bağlı)", y: "Yazıların arkasında soluk görünür. Yatay bir görsel seç." },
      { k: "arka_soluk", t: "secim", a: "Arka plan görseli ne kadar soluk olsun?", secim: { orta: "Orta", cok: "Çok soluk (yazı en okunaklı)", az: "Az soluk (görsel daha belirgin)" } },
      { k: "gorsel1", t: "gorsel", a: "1. görsel (sol üst)" },
      { k: "gorsel2", t: "gorsel", a: "2. görsel (sağ üst)" },
      { k: "gorsel3", t: "gorsel", a: "3. görsel (sol alt)" },
      { k: "gorsel4", t: "gorsel", a: "4. görsel (sağ alt)" },
    ] },
  { k: "duyuru", ad: "Duyuru şeridi", aciklama: "Sitenin en üstünde, her sayfada görünen ince şerit. Kampanya ya da önemli duyuru için.",
    alanlar: [
      { k: "aktif", t: "onay", a: "Duyuru şeridini göster" },
      { k: "metin", t: "yazi", a: "Duyuru yazısı", y: "Örn. 750 TL üzeri siparişlerde kargo bedava!" },
      { k: "link", t: "link", a: "Tıklanınca gideceği adres (isteğe bağlı)" },
      { k: "renk", t: "secim", a: "Renk", secim: { ana: "Yeşil", turuncu: "Turuncu", sari: "Sarı", koyu: "Koyu" } },
    ] },
  { k: "kategoriler", ad: "Kategori kutuları", aciklama: "Ana sayfadaki \"Kimi arıyorsun?\" kutuları.",
    alanlar: [
      { k: "goster", t: "onay", a: "Bu bölümü göster" },
      { k: "baslik", t: "yazi", a: "Bölüm başlığı" },
      { k: "liste", t: "liste", a: "Kutular", ekle: "Kutu ekle", oge: "Kutu", baslikAlani: "baslik", alanlar: [
        { k: "baslik", t: "yazi", a: "Başlık" },
        { k: "metin", t: "yazi", a: "Alt yazı" },
        { k: "link", t: "link", a: "Tıklanınca gideceği adres" },
        { k: "gorsel", t: "gorsel", a: "Görsel (isteğe bağlı)", y: "Boş bırakırsan pati simgesi görünür." },
      ] },
    ] },
  { k: "ilanlar", ad: "İlan bölümleri", aciklama: "Ana sayfadaki \"Öne çıkan ilanlar\" ve \"Yuvasını bekleyenler\" bölümlerinin yazıları.",
    alanlar: [
      { k: "vitrin_baslik", t: "yazi", a: "Öne çıkan ilanlar başlığı" },
      { k: "vitrin_aciklama", t: "yazi", a: "Öne çıkan ilanlar açıklaması" },
      { k: "bekleyen_goster", t: "onay", a: "\"Yuvasını bekleyenler\" bölümünü göster" },
      { k: "bekleyen_baslik", t: "yazi", a: "Bekleyenler başlığı" },
      { k: "bekleyen_aciklama", t: "yazi", a: "Bekleyenler açıklaması" },
      { k: "bekleyen_link_yazi", t: "yazi", a: "Sağdaki bağlantı yazısı" },
      { k: "bekleyen_link", t: "link", a: "Bağlantının gideceği adres" },
    ] },
  { k: "adimlar", ad: "Nasıl işler adımları", aciklama: "Ana sayfadaki numaralı adımlar.",
    alanlar: [
      { k: "goster", t: "onay", a: "Bu bölümü göster" },
      { k: "baslik", t: "yazi", a: "Bölüm başlığı" },
      { k: "liste", t: "liste", a: "Adımlar", ekle: "Adım ekle", oge: "Adım", baslikAlani: "baslik", alanlar: [
        { k: "baslik", t: "yazi", a: "Başlık" }, { k: "metin", t: "uzun", a: "Açıklama" },
      ] },
    ] },
  { k: "bantlar", ad: "Renkli bantlar", aciklama: "Ana sayfadaki renkli tanıtım kutuları (Mağaza, Kayıp ve bulunan gibi). İstediğin kadar ekleyebilir, sırasını değiştirebilirsin.",
    alanlar: [
      { k: "liste", t: "liste", a: "Bantlar", ekle: "Bant ekle", oge: "Bant", baslikAlani: "baslik", alanlar: [
        { k: "aktif", t: "onay", a: "Yayında", vars: true },
        { k: "renk", t: "secim", a: "Renk", secim: { mavi: "Mavi", turuncu: "Turuncu", yesil: "Yeşil", sari: "Sarı" } },
        { k: "ust_yazi", t: "yazi", a: "Küçük üst yazı", y: "Örn. MAĞAZA" },
        { k: "baslik", t: "yazi", a: "Başlık" },
        { k: "metin", t: "uzun", a: "Metin" },
        { k: "gorsel", t: "gorsel", a: "Görsel (isteğe bağlı)" },
        { k: "buton1_yazi", t: "yazi", a: "1. düğme yazısı" },
        { k: "buton1_link", t: "link", a: "1. düğmenin adresi" },
        { k: "buton2_yazi", t: "yazi", a: "2. düğme yazısı (isteğe bağlı)" },
        { k: "buton2_link", t: "link", a: "2. düğmenin adresi" },
      ] },
    ] },
  { k: "guven", ad: "Güven maddeleri", aciklama: "Ana sayfanın altındaki \"Neden güvenli?\" bölümü.",
    alanlar: [
      { k: "goster", t: "onay", a: "Bu bölümü göster" },
      { k: "baslik", t: "yazi", a: "Bölüm başlığı" },
      { k: "liste", t: "liste", a: "Maddeler", ekle: "Madde ekle", oge: "Madde", baslikAlani: "baslik", alanlar: [
        { k: "baslik", t: "yazi", a: "Başlık" }, { k: "metin", t: "uzun", a: "Açıklama" },
      ] },
    ] },
  { k: "menu", ad: "Menü ve alt bilgi", aciklama: "Sitenin üstündeki menü ve en alttaki bağlantılar.",
    alanlar: [
      { k: "ust", t: "liste", a: "Üst menü bağlantıları", ekle: "Menüye bağlantı ekle", oge: "Bağlantı", baslikAlani: "yazi", kucuk: true, alanlar: [
        { k: "yazi", t: "yazi", a: "Yazı" }, { k: "link", t: "link", a: "Adres" },
      ] },
      { k: "cta_yazi", t: "yazi", a: "Sağdaki renkli düğmenin yazısı", y: "Boş bırakırsan düğme gizlenir." },
      { k: "cta_link", t: "link", a: "Renkli düğmenin adresi" },
      { k: "sepet_goster", t: "onay", a: "Menüde sepeti göster" },
      { k: "alt_aciklama", t: "uzun", a: "Alt bilgideki tanıtım yazısı" },
      { k: "alt", t: "liste", a: "Alt bilgi bağlantıları", ekle: "Alt bilgiye bağlantı ekle", oge: "Bağlantı", baslikAlani: "yazi", kucuk: true, alanlar: [
        { k: "yazi", t: "yazi", a: "Yazı" }, { k: "link", t: "link", a: "Adres" },
      ] },
      { k: "telif", t: "yazi", a: "En alttaki küçük yazı (isteğe bağlı)", y: "Örn. © 2026 petpatibul.com" },
    ] },
  { k: "iletisim", ad: "İletişim ve sosyal medya", aciklama: "Doldurduğun bilgiler sitenin en altında görünür. Boş bıraktıkların görünmez.",
    alanlar: [
      { k: "telefon", t: "yazi", a: "Telefon" },
      { k: "whatsapp", t: "yazi", a: "WhatsApp numarası", y: "Ülke koduyla: 905xxxxxxxxx" },
      { k: "eposta", t: "yazi", a: "E-posta" },
      { k: "adres", t: "uzun", a: "Adres" },
      { k: "instagram", t: "link", a: "Instagram adresi", y: "Örn. https://instagram.com/petpatibul" },
      { k: "facebook", t: "link", a: "Facebook adresi" },
      { k: "x", t: "link", a: "X (Twitter) adresi" },
      { k: "youtube", t: "link", a: "YouTube adresi" },
      { k: "tiktok", t: "link", a: "TikTok adresi" },
    ] },
  { k: "sayfalar", ad: "Sayfalar", aciklama: "Hakkımızda, SSS, KVKK ve Kullanım koşulları sayfalarının yazıları. Boş bir satır yeni paragraf başlatır. \"## \" ile başlayan satır ara başlık olur.",
    alanlar: [
      { k: "hakkimizda.baslik", t: "yazi", a: "Hakkımızda: başlık" }, { k: "hakkimizda.metin", t: "uzun", a: "Hakkımızda: metin", satir: 8 },
      { k: "sss.baslik", t: "yazi", a: "SSS: başlık" }, { k: "sss.metin", t: "uzun", a: "SSS: metin", satir: 14 },
      { k: "kvkk.baslik", t: "yazi", a: "KVKK: başlık" }, { k: "kvkk.metin", t: "uzun", a: "KVKK: metin", satir: 10 },
      { k: "kullanim-kosullari.baslik", t: "yazi", a: "Kullanım koşulları: başlık" }, { k: "kullanim-kosullari.metin", t: "uzun", a: "Kullanım koşulları: metin", satir: 10 },
    ] },
  { k: "genel", ad: "Logo, renk ve başlık", aciklama: "Sitenin logosu, ana rengi ve Google'da görünen başlığı.",
    alanlar: [
      { k: "logo_gorsel", t: "gorsel", a: "Logo görseli", y: "Şeffaf arka planlı PNG önerilir. Boş bırakırsan pati simgesi görünür.", logo: true },
      { k: "logo_yazi", t: "yazi", a: "Logo yanındaki yazı", y: "Boş bırakırsan yalnızca logo görünür." },
      { k: "ana_renk", t: "renk", a: "Sitenin ana rengi", y: "Düğmeler ve vurgular bu renkte olur." },
      { k: "site_basligi", t: "yazi", a: "Tarayıcı sekmesinde ve Google'da görünen başlık" },
      { k: "site_aciklama", t: "uzun", a: "Google'da görünen kısa açıklama" },
    ] },
];

// ---------- yardımcılar ----------
const yolAl = (o, yol) => yol.reduce((x, k) => (x == null ? undefined : x[k]), o);
function yolYaz(o, yol, v) {
  let x = o;
  for (let n = 0; n < yol.length - 1; n++) { if (x[yol[n]] == null) x[yol[n]] = {}; x = x[yol[n]]; }
  x[yol[yol.length - 1]] = v;
}
const yolDiz = (on, k) => [...on, ...String(k).split(".")];

async function siteGorseliYukle(dosya, logo) {
  if (!/^image\//.test(dosya.type)) throw new Error("Lütfen bir görsel dosyası seç (JPG, PNG ya da WEBP).");
  let blob = dosya, tip = dosya.type, uzanti = "jpg";
  // Logoda şeffaflık korunsun diye küçük PNG'ler olduğu gibi yüklenir; diğerleri küçültülüp JPG yapılır.
  if (logo && tip === "image/png" && dosya.size <= 2 * 1024 * 1024) uzanti = "png";
  else if (tip === "image/webp" && dosya.size <= 4 * 1024 * 1024) uzanti = "webp";
  else { blob = await fotoKucult(dosya); tip = "image/jpeg"; }
  const yol = `site/${crypto.randomUUID()}.${uzanti}`;
  const { error } = await sb.storage.from("magaza-fotolari").upload(yol, blob, { contentType: tip });
  if (error) throw error;
  return sb.storage.from("magaza-fotolari").getPublicUrl(yol).data.publicUrl;
}

function ieHataMetni(e) {
  const m = (e && (e.message || e.code)) || "";
  if (/site_icerik|PGRST205|does not exist|schema cache/i.test(m)) return "Veritabanında içerik tablosu henüz kurulmamış. supabase.sql dosyasının son hâli Supabase'de çalıştırılmalı.";
  return hataMetni(e);
}

// ---------- alan çizimi ----------
function ieAlan(a, d, on) {
  const yol = yolDiz(on, a.k), y = JSON.stringify(yol), v = yolAl(d, yol);
  const id = "ie-" + yol.join("-").replace(/[^\w-]/g, "");
  const yard = a.y ? `<small>${esc(a.y)}</small>` : "";
  switch (a.t) {
    case "onay":
      return `<label class="onay"><input type="checkbox" data-yol='${esc(y)}'${v !== false && v !== undefined ? " checked" : ""}> ${esc(a.a)}</label>`;
    case "uzun":
      return `<label class="alan" for="${id}">${esc(a.a)}<textarea id="${id}" rows="${a.satir || 3}" data-yol='${esc(y)}'>${esc(v || "")}</textarea>${yard}</label>`;
    case "sayi":
      return `<label class="alan" for="${id}">${esc(a.a)}<input id="${id}" type="number" min="${a.min ?? ""}" max="${a.max ?? ""}" data-yol='${esc(y)}' data-sayi="1" value="${esc(v ?? "")}">${yard}</label>`;
    case "link":
      return `<label class="alan" for="${id}">${esc(a.a)}<input id="${id}" list="site-adresleri" placeholder="/sayfa ya da https://..." data-yol='${esc(y)}' value="${esc(v || "")}">${yard || `<small>Listeden bir sayfa seç ya da başka bir siteye gidecekse adresi https:// ile yaz.</small>`}</label>`;
    case "renk": {
      const r = /^#[0-9a-f]{6}$/i.test(v || "") ? v : "";
      return `<div class="alan">${esc(a.a)}<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <input type="color" data-yol='${esc(y)}' value="${r || "#0F6E5C"}" style="width:64px;height:44px;padding:2px" aria-label="${esc(a.a)}">
        <span class="bilgi">${r ? esc(r) : "Varsayılan yeşil"}</span>
        ${r ? `<button type="button" class="btn btn-kucuk" data-renk-sifirla='${esc(y)}'>Varsayılan renge dön</button>` : ""}
      </div>${yard}</div>`;
    }
    case "secim":
      return `<label class="alan" for="${id}">${esc(a.a)}<select id="${id}" data-yol='${esc(y)}'>${secenekler(a.secim, v || Object.keys(a.secim)[0])}</select>${yard}</label>`;
    case "gorsel": {
      const u = gorselUrl(v);
      return `<div class="alan">${esc(a.a)}
        <div class="ie-gorsel">
          <div class="onizle">${u ? `<img src="${esc(u)}" alt="">` : "Görsel yok"}</div>
          <div class="ie-gorsel-dugme">
            <label class="btn btn-kucuk btn-ana">${u ? "Görseli değiştir" : "Görsel yükle"}<input type="file" accept="image/*" class="gizli" data-yukle='${esc(y)}'${a.logo ? ' data-logo="1"' : ""}></label>
            ${u ? `<button type="button" class="btn btn-kucuk" data-gorsel-kaldir='${esc(y)}'>Kaldır</button>` : ""}
          </div>
        </div>${yard}</div>`;
    }
    case "liste": {
      const l = Array.isArray(v) ? v : [];
      return `<fieldset class="ie-liste"><legend style="font-weight:700;margin-bottom:8px">${esc(a.a)} (${l.length})</legend>
        ${l.map((o, n) => {
          const ad = o && a.baslikAlani && o[a.baslikAlani] ? `: ${o[a.baslikAlani]}` : "";
          return `<div class="ie-oge">
            <div class="ie-oge-bas"><b>${n + 1}. ${esc(a.oge)}${esc(ad.length > 50 ? ad.slice(0, 50) + "…" : ad)}</b>
              <span class="satir-dugmeler">
                <button type="button" class="btn btn-kucuk" data-tasi='${esc(y)}' data-n="${n}" data-yon="-1"${n === 0 ? " disabled" : ""} aria-label="Yukarı taşı">↑</button>
                <button type="button" class="btn btn-kucuk" data-tasi='${esc(y)}' data-n="${n}" data-yon="1"${n === l.length - 1 ? " disabled" : ""} aria-label="Aşağı taşı">↓</button>
                <button type="button" class="btn btn-kucuk btn-sil" data-oge-sil='${esc(y)}' data-n="${n}">Sil</button>
              </span></div>
            ${a.kucuk ? `<div class="form-izgara">${a.alanlar.map(x => ieAlan(x, d, [...yol, n])).join("")}</div>` : a.alanlar.map(x => ieAlan(x, d, [...yol, n])).join("")}
          </div>`;
        }).join("")}
        <button type="button" class="btn btn-kucuk" style="align-self:flex-start" data-oge-ekle='${esc(y)}'>+ ${esc(a.ekle)}</button>
      </fieldset>`;
    }
    default:
      return `<label class="alan" for="${id}">${esc(a.a)}<input id="${id}" data-yol='${esc(y)}' value="${esc(v || "")}">${yard}</label>`;
  }
}
function listeAlaniBul(alanlar, yol) {
  // yol: ["liste"] ya da ["ust"] gibi; listenin şemasını bulur.
  const k = yol[yol.length - 1];
  return alanlar.find(a => a.t === "liste" && a.k === k);
}

// ---------- sayfa ----------
// Kaydedilmemiş değişiklik varken başka sayfaya geçmeden önce uyar.
let IE_DEGISTI = false;
window.addEventListener("beforeunload", e => { if (IE_DEGISTI && $("#ie-form")) { e.preventDefault(); e.returnValue = ""; } });
document.addEventListener("click", e => {
  const a = e.target.closest("a[href]");
  if (!a || a.target || !IE_DEGISTI || !$("#ie-form")) return;
  if (confirm("Kaydetmediğin değişiklikler var. Sayfadan çıkılsın mı?")) IE_DEGISTI = false;
  else { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
window.addEventListener("popstate", () => { IE_DEGISTI = false; });
async function ySite() {
  if (!yonetici()) return;
  const p = sorgu(), bk = p.get("bolum") || "";
  const bolum = IE_BOLUMLER.find(b => b.k === bk);
  if (!bolum) {
    meta("Yönetim · Site içeriği");
    sayfa(`<div class="kap dar">
      ${yUst("/yonetim/site")}
      <h2 style="font-size:22px;margin-bottom:4px">Site içeriği</h2>
      <p class="bilgi" style="margin-bottom:16px">Sitedeki bannerları, görselleri, yazıları, menüleri ve bağlantıları buradan değiştirebilirsin. Kaydettiğin anda sitede görünür. Düzenlemek istediğin bölümü seç:</p>
      <div class="ozet-izgara">${IE_BOLUMLER.map(b => `<a class="kutu ozet-kart" href="/yonetim/site?bolum=${b.k}"><b style="font-size:20px">${esc(b.ad)}</b><span>${esc(b.aciklama)}</span></a>`).join("")}</div>
      <p class="bilgi" style="margin-top:24px">Ürünleri <a href="/yonetim/urunler">Ürünler</a>, öne çıkarma paketlerini <a href="/yonetim/reklamlar">Reklamlar</a> sekmesinden düzenleyebilirsin.</p>
    </div>`);
    return;
  }
  meta("Yönetim · " + bolum.ad);
  // En güncel hâli veritabanından al.
  const { data: satir, error } = await sb.from("site_icerik").select("deger, guncellendi").eq("anahtar", bolum.k).maybeSingle();
  let tabloYok = false;
  if (error) { if (/site_icerik|PGRST205|does not exist|schema cache/i.test(error.message || "")) tabloYok = true; else throw error; }
  const d = icerikBirlestir(VARSAYILAN_ICERIK[bolum.k], satir && satir.deger);
  IE_DEGISTI = false;

  sayfa(`<div class="kap dar">
    ${yUst("/yonetim/site")}
    <p style="margin:0 0 12px"><a href="/yonetim/site">← Site içeriği bölümleri</a></p>
    <nav class="hap-grup" style="margin-bottom:20px" aria-label="Site içeriği bölümleri">${IE_BOLUMLER.map(b => `<a class="hap" href="/yonetim/site?bolum=${b.k}"${b.k === bolum.k ? ' aria-current="page"' : ""}>${esc(b.ad)}</a>`).join("")}</nav>
    ${tabloYok ? `<p class="uyari" style="margin-bottom:16px">${esc(ieHataMetni({ message: "site_icerik" }))}</p>` : ""}
    <form class="kutu form" id="ie-form">
      <div><h2 style="font-size:24px">${esc(bolum.ad)}</h2><p class="bilgi" style="margin:4px 0 0">${esc(bolum.aciklama)}</p>
        ${satir && satir.guncellendi ? `<p class="bilgi" style="margin:4px 0 0">Son kayıt: ${tarihSaat(satir.guncellendi)}</p>` : ""}</div>
      <div id="ie-alanlar" class="form" style="gap:16px"></div>
      <div class="ie-kaydet">
        <button class="btn btn-ana" type="submit" id="ie-kaydet">Kaydet ve yayınla</button>
        <a class="btn" href="${bolum.k === "sayfalar" ? "/hakkimizda" : "/"}" target="_blank">Siteyi aç</a>
        <button type="button" class="btn btn-kucuk btn-sil" id="ie-sifirla" style="margin-left:auto">Varsayılana dön</button>
        <span class="bilgi" id="ie-durum" style="flex-basis:100%"></span>
      </div>
    </form>
    <datalist id="site-adresleri">${SITE_ADRESLERI.map(([u, a]) => `<option value="${esc(u)}">${esc(a)}</option>`).join("")}</datalist>
  </div>`);

  const durum = (m, hata) => { const s = $("#ie-durum"); s.textContent = m; s.style.color = hata ? "var(--hata)" : ""; };
  const kirli = () => { IE_DEGISTI = true; durum("Kaydedilmemiş değişiklik var. Sitede görünmesi için Kaydet ve yayınla'ya bas."); };
  const ciz = () => {
    const kaydir = window.scrollY;
    $("#ie-alanlar").innerHTML = bolum.alanlar.map(a => ieAlan(a, d, [])).join("");
    window.scrollTo(0, kaydir);
    bagla();
  };
  const listeVeSema = yolJson => {
    const yol = JSON.parse(yolJson);
    let alanlar = bolum.alanlar;
    // iç içe liste yok; listenin şeması en üst düzeyde.
    return [yol, yolAl(d, yol) || [], listeAlaniBul(alanlar, yol)];
  };
  function bagla() {
    $$("[data-yol]", $("#ie-alanlar")).forEach(el => {
      const yol = JSON.parse(el.dataset.yol);
      el.addEventListener(el.type === "checkbox" || el.tagName === "SELECT" || el.type === "color" ? "change" : "input", () => {
        const v = el.type === "checkbox" ? el.checked : el.dataset.sayi ? Number(el.value) : el.value;
        yolYaz(d, yol, v); kirli();
        if (el.type === "color") ciz();
      });
    });
    $$("[data-renk-sifirla]").forEach(b => b.onclick = () => { yolYaz(d, JSON.parse(b.dataset.renkSifirla), ""); kirli(); ciz(); });
    $$("[data-yukle]").forEach(inp => inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      const btn = $("#ie-kaydet"); btn.disabled = true; durum("Görsel yükleniyor…");
      try {
        const url = await siteGorseliYukle(f, !!inp.dataset.logo);
        yolYaz(d, JSON.parse(inp.dataset.yukle), url); ciz(); kirli();
        durum("Görsel yüklendi. Sitede görünmesi için Kaydet ve yayınla'ya bas.");
      } catch (e) { durum(ieHataMetni(e), true); }
      btn.disabled = false;
    });
    $$("[data-gorsel-kaldir]").forEach(b => b.onclick = () => { yolYaz(d, JSON.parse(b.dataset.gorselKaldir), ""); kirli(); ciz(); });
    $$("[data-oge-ekle]").forEach(b => b.onclick = () => {
      const [yol, l, sema] = listeVeSema(b.dataset.ogeEkle);
      const yeni = {}; sema.alanlar.forEach(a => { yolYaz(yeni, a.k.split("."), a.t === "onay" ? (a.vars !== undefined ? a.vars : true) : a.t === "secim" ? Object.keys(a.secim)[0] : ""); });
      l.push(yeni); yolYaz(d, yol, l); kirli(); ciz();
    });
    $$("[data-oge-sil]").forEach(b => b.onclick = () => {
      if (!confirm("Bu öğe silinsin mi? (Kaydet'e basana kadar sitede değişmez.)")) return;
      const [yol, l] = listeVeSema(b.dataset.ogeSil); l.splice(+b.dataset.n, 1); yolYaz(d, yol, l); kirli(); ciz();
    });
    $$("[data-tasi]").forEach(b => b.onclick = () => {
      const [yol, l] = listeVeSema(b.dataset.tasi), n = +b.dataset.n, m = n + Number(b.dataset.yon);
      if (m < 0 || m >= l.length) return;
      [l[n], l[m]] = [l[m], l[n]]; yolYaz(d, yol, l); kirli(); ciz();
    });
  }
  ciz();

  const yerelGuncelle = async () => {
    const { data } = await sb.from("site_icerik").select("anahtar, deger");
    if (data) { icerikUygula(data); try { localStorage.setItem(ICERIK_ONBELLEK, JSON.stringify(data)); } catch (_) {} }
    kabukCiz();
  };
  $("#ie-form").onsubmit = async e => {
    e.preventDefault();
    const btn = $("#ie-kaydet"); btn.disabled = true; durum("Kaydediliyor…");
    const { error: h } = await sb.from("site_icerik").upsert({ anahtar: bolum.k, deger: d, guncellendi: new Date().toISOString() });
    btn.disabled = false;
    if (h) return durum(ieHataMetni(h), true);
    IE_DEGISTI = false; await yerelGuncelle();
    durum("Kaydedildi. Değişiklik sitede yayında."); bildir("Kaydedildi, sitede yayında.");
  };
  $("#ie-sifirla").onclick = async () => {
    if (!confirm(`"${bolum.ad}" bölümündeki tüm değişikliklerin silinip ilk hâline dönsün mü? Bu geri alınamaz.`)) return;
    const { error: h } = await sb.from("site_icerik").delete().eq("anahtar", bolum.k);
    if (h) return durum(ieHataMetni(h), true);
    await yerelGuncelle(); bildir("Bölüm varsayılan hâline döndü."); yonlendir();
  };
}

ROTALAR.push([/^\/yonetim\/site$/, ySite]);
