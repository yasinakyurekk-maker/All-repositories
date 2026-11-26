// petpatibul.com — yönetim panelinden düzenlenebilen site içeriği (bannerlar, görseller, metinler, menüler, iletişim, sayfalar).
// İçerik Supabase'deki "site_icerik" tablosunda bölüm bölüm durur. Bir bölüm hiç kaydedilmediyse aşağıdaki varsayılanlar kullanılır.
// app.js'ten sonra yüklenir.
"use strict";

const VARSAYILAN_ICERIK = {
  genel: {
    logo_yazi: "petpatibul",
    logo_gorsel: "",
    ana_renk: "",
    site_basligi: "petpatibul.com | Ücretsiz kedi ve köpek sahiplendirme ilanları",
    site_aciklama: "Türkiye'nin ücretsiz evcil hayvan sahiplendirme platformu. İline göre kedi, köpek ve kuş sahiplendirme ilanlarını incele, kayıp hayvan ilanı ver.",
  },
  duyuru: { aktif: false, metin: "", link: "", renk: "ana" },
  kahraman: {
    rozet: "Hayvan satışı yok, yalnızca ücretsiz sahiplendirme",
    baslik: "Bir dost sahiplen,\nbir hayat değiştir.",
    aciklama: "Yuva arayan kedi, köpek ve diğer dostlarımızı bulunduğun ile göre keşfet. Tüm ilanlar yayına girmeden önce kontrol edilir.",
    arama_goster: true,
    arka_gorsel: "", arka_soluk: "orta",
    gorsel1: "", gorsel2: "", gorsel3: "", gorsel4: "",
  },
  bannerlar: { aktif: true, sure: 6, liste: [] },
  kategoriler: {
    goster: true,
    baslik: "Kimi arıyorsun?",
    liste: [
      { baslik: "Kedi sahiplen", metin: "Yavru ve yetişkin kediler", link: "/kedi-sahiplendirme", gorsel: "" },
      { baslik: "Köpek sahiplen", metin: "Her boyda köpek dostlar", link: "/kopek-sahiplendirme", gorsel: "" },
      { baslik: "Kuş sahiplen", metin: "Muhabbet kuşu, kanarya ve diğerleri", link: "/kus-sahiplendirme", gorsel: "" },
      { baslik: "Diğer dostlar", metin: "Tavşan, hamster, kaplumbağa", link: "/diger-sahiplendirme", gorsel: "" },
      { baslik: "Kayıp ve bulunan", metin: "Kaybolan dostlar için ilanlar", link: "/kayip-ilanlari", gorsel: "" },
    ],
  },
  ilanlar: {
    vitrin_baslik: "Öne çıkan ilanlar",
    vitrin_aciklama: "Bu ilanlar sahipleri tarafından öne çıkarıldı.",
    bekleyen_goster: true,
    bekleyen_baslik: "Yuvasını bekleyenler",
    bekleyen_aciklama: "En uzun süredir bekleyenler önce gösterilir, böylece her dost görünür olur.",
    bekleyen_link_yazi: "Tüm ilanları gör",
    bekleyen_link: "/sahiplendirme",
  },
  adimlar: {
    goster: true,
    baslik: "Sahiplenme nasıl işler?",
    liste: [
      { baslik: "Keşfet", metin: "Türe, ile, yaşa ve karaktere göre filtreleyerek sana uygun dostu bul." },
      { baslik: "Ulaş", metin: "İlan sahibini ara ya da WhatsApp'tan yaz. Numarası ilan sayfasında." },
      { baslik: "Tanış", metin: "İlan sahibiyle konuşun, karar vermeden önce mutlaka tanışın." },
      { baslik: "Yuvaya kavuş", metin: "Sahiplendikten sonra bakım rehberlerimizle yanındayız." },
    ],
  },
  bantlar: {
    liste: [
      { aktif: true, renk: "mavi", ust_yazi: "MAĞAZA", baslik: "Mama ve ekipman", metin: "Yeni dostun için mama, kum, tasma, taşıma çantası ve oyuncak. Belirli tutar üstüne kargo bedava.", gorsel: "",
        buton1_yazi: "Mağazaya git", buton1_link: "/magaza", buton2_yazi: "", buton2_link: "" },
      { aktif: true, renk: "turuncu", ust_yazi: "KAYIP VE BULUNAN", baslik: "Dostunu mu kaybettin, sahipsiz birini mi buldun?", metin: "Fotoğraf ve son görüldüğü yerle ücretsiz ilan ver.", gorsel: "",
        buton1_yazi: "Kayıp ilanı ver", buton1_link: "/ilan-ver?kategori=kayip", buton2_yazi: "Bulduğum hayvanı bildir", buton2_link: "/ilan-ver?kategori=bulunan" },
    ],
  },
  guven: {
    goster: true,
    baslik: "Neden güvenli?",
    liste: [
      { baslik: "Her ilan kontrol edilir", metin: "İlanlar ekibimiz onaylamadan yayına girmez." },
      { baslik: "Aracı yok", metin: "İlan sahibiyle doğrudan konuşursun. Görüşmeye kimse karışmaz, kimse komisyon almaz." },
      { baslik: "Satış ve ücret yok", metin: "Para istenen ilanlar kaldırılır. Tek tıkla şikayet edebilirsin." },
    ],
  },
  menu: {
    ust: [
      { yazi: "Sahiplen", link: "/sahiplendirme" },
      { yazi: "Kayıp ve bulunan", link: "/kayip-ilanlari" },
      { yazi: "Mağaza", link: "/magaza" },
    ],
    cta_yazi: "Ücretsiz ilan ver",
    cta_link: "/ilan-ver",
    sepet_goster: true,
    alt_aciklama: "Türkiye'nin ücretsiz evcil hayvan sahiplendirme platformu. Hayvan satışına izin verilmez.",
    alt: [
      { yazi: "Kedi sahiplendirme", link: "/kedi-sahiplendirme" },
      { yazi: "Köpek sahiplendirme", link: "/kopek-sahiplendirme" },
      { yazi: "Kuş sahiplendirme", link: "/kus-sahiplendirme" },
      { yazi: "Kayıp ilanları", link: "/kayip-ilanlari" },
      { yazi: "Mama ve ekipman", link: "/magaza" },
      { yazi: "Petshop olarak satış yap", link: "/petshop-ol" },
      { yazi: "Hakkımızda", link: "/hakkimizda" },
      { yazi: "Sıkça sorulan sorular", link: "/sss" },
      { yazi: "KVKK", link: "/kvkk" },
      { yazi: "Kullanım koşulları", link: "/kullanim-kosullari" },
    ],
    telif: "",
  },
  iletisim: { telefon: "", eposta: "", whatsapp: "", adres: "", instagram: "", facebook: "", x: "", youtube: "", tiktok: "" },
  sayfalar: {
    hakkimizda: { baslik: "Hakkımızda", metin: "petpatibul.com, sahipsiz ve yuva arayan hayvanları onları sevecek ailelerle buluşturmak için kurulmuş ücretsiz bir sahiplendirme platformudur.\n\nSitemizde hayvan satışına izin verilmez. İlan vermek ve ilan sahiplerine ulaşmak ücretsizdir. İlan sahipleri isterlerse ilanlarını ücretli olarak öne çıkarabilir; bu gelir sitenin işletilmesi için kullanılır." },
    sss: { baslik: "Sıkça sorulan sorular", metin: "## Sahiplenme nasıl işler?\nBeğendiğin ilanda ilan sahibinin telefon numarası yazar. Onu arar ya da WhatsApp'tan yazarsın, tanışırsınız ve sahiplendirmeye birlikte karar verirsiniz. Site görüşmeye aracılık yapmaz.\n\n## Sahiplenmek ücretli mi?\nHayır. Sitemizdeki tüm sahiplendirmeler ücretsizdir. Senden para isteyen bir ilan görürsen lütfen şikayet et.\n\n## İlan vermek ücretli mi?\nHayır, ilan vermek ücretsizdir. İlanını daha çok kişiye göstermek istersen ücretli öne çıkarma paketlerinden birini seçebilirsin.\n\n## Öne çıkarma nedir?\nÖne çıkarılan ilanlar seçilen süre boyunca ana sayfadaki vitrinde ve tüm listelerin en üstünde gösterilir. Ödemeden sonra ekibimiz ilanı kontrol edip onaylar; süre onay anından başlar. Uygun bulunmayan ilanların ücreti iade edilir.\n\n## İlanım neden hemen yayına girmedi?\nSahte ve satış ilanlarını engellemek için her ilan ekibimiz tarafından kontrol edilir. Bu genellikle kısa sürer.\n\n## Kayıp hayvanımı nasıl ilan ederim?\n\"Ücretsiz ilan ver\" sayfasında \"Kaybettim\" seçeneğini seç, fotoğraf ve kaybolduğu yeri ekle.\n\n## Mağazadan aldığım ürün ne zaman gelir?\nSiparişler genellikle 1-3 iş günü içinde kargoya verilir. Kargo takip numarasını Hesabım sayfasında görebilirsin." },
    kvkk: { baslik: "KVKK aydınlatma metni", metin: "[Bu sayfaya bir hukukçu tarafından hazırlanmış KVKK aydınlatma metni eklenecek: hangi kişisel verilerin (e-posta, telefon, ad soyad, ilanlarda yayınlanan iletişim numarası) hangi amaçla işlendiği, kimlerle paylaşıldığı ve kullanıcının hakları.]" },
    "kullanim-kosullari": { baslik: "Kullanım koşulları", metin: "[Bu sayfaya kullanım koşulları ve öne çıkarma paketleri için mesafeli satış sözleşmesi eklenecek. Temel kurallar: hayvan satışı ve ücret talebi yasaktır, ilanlar onaydan geçer, kurallara uymayan ilanlar kaldırılır.]" },
  },
};

const kopya = o => JSON.parse(JSON.stringify(o));
// Kaydedilen bölümü varsayılanın üstüne yazar (listeler olduğu gibi alınır, alanlar tek tek).
function icerikBirlestir(varsayilan, kayit) {
  if (!kayit || typeof kayit !== "object" || Array.isArray(kayit)) return kopya(varsayilan);
  const s = kopya(varsayilan);
  for (const [k, v] of Object.entries(kayit)) {
    if (v && typeof v === "object" && !Array.isArray(v) && s[k] && typeof s[k] === "object" && !Array.isArray(s[k])) s[k] = icerikBirlestir(s[k], v);
    else s[k] = v;
  }
  return s;
}
let C = kopya(VARSAYILAN_ICERIK);
const ICERIK_ONBELLEK = "petpatibul_icerik";
function icerikUygula(satirlar) {
  const yeni = kopya(VARSAYILAN_ICERIK);
  (satirlar || []).forEach(r => { if (yeni[r.anahtar] !== undefined) yeni[r.anahtar] = icerikBirlestir(VARSAYILAN_ICERIK[r.anahtar], r.deger); });
  C = yeni;
}
// Önce bu tarayıcıdaki son kopyayı uygula (sayfa hemen doğru görünsün), sonra güncelini getir.
try { const v = JSON.parse(localStorage.getItem(ICERIK_ONBELLEK) || "null"); if (Array.isArray(v)) icerikUygula(v); } catch (_) {}

async function icerikYukle() {
  try {
    const { data, error } = await sb.from("site_icerik").select("anahtar, deger");
    if (!error && data) {
      icerikUygula(data);
      try { localStorage.setItem(ICERIK_ONBELLEK, JSON.stringify(data)); } catch (_) {}
    }
  } catch (_) {}
  kabukCiz();
}

// Bağlantılar yalnızca site içi adres, http(s), e-posta ya da telefon olabilir.
function guvenliLink(u) {
  u = String(u || "").trim();
  if (!u) return "";
  if (u.startsWith("/") && !u.startsWith("//")) return u;
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(u)) return "https://" + u;
  return "";
}
const disLink = u => /^https?:/i.test(u) && !u.startsWith(location.origin);
const aEtiket = (u, ic, sinif) => {
  const h = guvenliLink(u);
  if (!h) return sinif ? `<span class="${sinif}">${ic}</span>` : ic;
  return `<a href="${esc(h)}"${sinif ? ` class="${sinif}"` : ""}${disLink(h) ? ' target="_blank" rel="noopener"' : ""}>${ic}</a>`;
};
const gorselUrl = u => { u = String(u || "").trim(); return /^https:\/\//i.test(u) || (u.startsWith("/") && !u.startsWith("//")) ? u : ""; };
const satirlar = s => esc(s).replace(/\n/g, "<br>");
// Sayfa metni: boş satır yeni paragraf, "## " ile başlayan satır ara başlık.
function metinHtml(m) {
  return String(m || "").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => {
    const sat = p.split("\n"); let h = "";
    while (sat.length && sat[0].startsWith("## ")) h += `<h2>${esc(sat.shift().slice(3))}</h2>`;
    return h + (sat.length ? `<p>${satirlar(sat.join("\n"))}</p>` : "");
  }).join("");
}

// ---------- üst menü, alt bilgi, duyuru bandı, logo, renk ----------
function kabukCiz() {
  const g = C.genel, m = C.menu, il = C.iletisim, d = C.duyuru;
  // renk
  const kok = document.documentElement.style;
  if (/^#[0-9a-f]{6}$/i.test(g.ana_renk || "")) {
    kok.setProperty("--ana", g.ana_renk);
    kok.setProperty("--ana-koyu", `color-mix(in srgb, ${g.ana_renk} 78%, black)`);
    kok.setProperty("--ana-acik", `color-mix(in srgb, ${g.ana_renk} 10%, white)`);
  } else ["--ana", "--ana-koyu", "--ana-acik"].forEach(k => kok.removeProperty(k));
  // logo
  const logo = gorselUrl(g.logo_gorsel);
  $$(".logo-yazi").forEach(x => { x.textContent = g.logo_yazi || ""; x.hidden = !g.logo_yazi; });
  const li = $(".ust .logo-ikon");
  if (li) li.innerHTML = logo ? `<img src="${esc(logo)}" alt="">` : ikon.pati.replace('width="24" height="24"', 'width="22" height="22"');
  if (li) li.classList.toggle("resimli", !!logo);
  // duyuru
  let du = $("#duyuru");
  if (!du) { du = document.createElement("div"); du.id = "duyuru"; document.body.insertBefore(du, $(".ust")); }
  du.className = "duyuru d-renk-" + (d.renk || "ana");
  du.hidden = !(d.aktif && d.metin);
  du.innerHTML = d.aktif && d.metin ? `<div class="kap">${aEtiket(d.link, esc(d.metin))}</div>` : "";
  // üst menü
  const ml = $("#menu-linkleri");
  if (ml) ml.innerHTML = (m.ust || []).filter(x => x.yazi).map(x => aEtiket(x.link, esc(x.yazi))).join("");
  const cta = $("#menu-cta");
  if (cta) { cta.textContent = m.cta_yazi || ""; cta.hidden = !m.cta_yazi; cta.setAttribute("href", guvenliLink(m.cta_link) || "/ilan-ver"); }
  const sp = $(".sepet-link"); if (sp) sp.hidden = m.sepet_goster === false;
  // alt bilgi
  const aa = $("#alt-aciklama"); if (aa) aa.textContent = m.alt_aciklama || "";
  const am = $("#alt-menu"); if (am) am.innerHTML = (m.alt || []).filter(x => x.yazi).map(x => aEtiket(x.link, esc(x.yazi))).join("");
  const ai = $("#alt-iletisim");
  if (ai) {
    const wp = String(il.whatsapp || "").replace(/[^\d]/g, "");
    const sosyal = [["instagram", "Instagram"], ["facebook", "Facebook"], ["x", "X"], ["youtube", "YouTube"], ["tiktok", "TikTok"]]
      .filter(([k]) => guvenliLink(il[k])).map(([k, a]) => aEtiket(il[k], a)).join("");
    const satir = [
      il.telefon ? `<a href="tel:${esc(String(il.telefon).replace(/[^\d+]/g, ""))}">${esc(il.telefon)}</a>` : "",
      wp ? `<a href="https://wa.me/${esc(wp)}" target="_blank" rel="noopener">WhatsApp</a>` : "",
      il.eposta ? `<a href="mailto:${esc(il.eposta)}">${esc(il.eposta)}</a>` : "",
      il.adres ? `<span>${satirlar(il.adres)}</span>` : "",
    ].filter(Boolean).join("");
    ai.innerHTML = satir || sosyal ? `${satir}${sosyal ? `<div class="sosyal">${sosyal}</div>` : ""}` : "";
    ai.hidden = !(satir || sosyal);
  }
  const t = $("#alt-telif"); if (t) { t.textContent = m.telif || ""; t.hidden = !m.telif; }
}
