// petpatibul.com — ücretsiz evcil hayvan sahiplendirme sitesi (Supabase + düz JavaScript)
"use strict";

// ---------- sabitler ----------
const TUR = { kedi: "Kedi", kopek: "Köpek", kus: "Kuş", diger: "Diğer" };
const TUR_COGUL = { kedi: "kediler", kopek: "köpekler", kus: "kuşlar", diger: "dostlar" };
const YAS = { yavru: "Yavru", genc: "Genç", yetiskin: "Yetişkin", yasli: "Yaşlı" };
const CINS = { disi: "Dişi", erkek: "Erkek", bilinmiyor: "Cinsiyeti bilinmiyor" };
const KAT = { sahiplendirme: "Sahiplendirme", kayip: "Kayıp", bulunan: "Bulunan" };
const ILAN_DURUM = { bekliyor: "Onay bekliyor", yayinda: "Yayında", reddedildi: "Reddedildi", sahiplendi: "Sahiplendi", kaldirildi: "Kaldırıldı" };
const BASVURU_DURUM = { yeni: "Yeni", kabul: "Kabul edildi", red: "Reddedildi" };
const ODEME_DURUM = { bekliyor: "Bekliyor", odendi: "Ödendi", basarisiz: "Başarısız" };
// Öne çıkarma ödemesinin üyeye görünen durumu: ödeme alındıktan sonra yönetici onayı beklenir.
function reklamDurumu(o) {
  if (o.durum !== "odendi") return [o.durum, ODEME_DURUM[o.durum]];
  if (o.onay === "onaylandi") return ["yayinda", `Onaylandı${o.onaylanan_gun ? ` · ${o.onaylanan_gun} gün` : ""}`];
  if (o.onay === "reddedildi") return ["reddedildi", "Reddedildi · ücret iade edilecek"];
  return ["bekliyor", "Ödendi · onay bekleniyor"];
}
const OZELLIK = { asili: "Aşıları tam", kisir: "Kısırlaştırılmış", cocuk_uyumlu: "Çocuklarla uyumlu", hayvan_uyumlu: "Diğer hayvanlarla uyumlu", ozel_bakim: "Özel bakım gerektiriyor" };
const ILLER = ["Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya","Ardahan","Artvin","Aydın","Balıkesir","Bartın","Batman","Bayburt","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul","İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kilis","Kırıkkale","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Mardin","Mersin","Muğla","Muş","Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya","Samsun","Şanlıurfa","Siirt","Sinop","Şırnak","Sivas","Tekirdağ","Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak"];
const SAYFA_BOYU = 24;
const MAKS_FOTO = 6;
const SITE = "petpatibul.com";

const ikon = {
  pati: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="6" cy="9" r="2.2"/><circle cx="10" cy="5.5" r="2.2"/><circle cx="14" cy="5.5" r="2.2"/><circle cx="18" cy="9" r="2.2"/><path d="M12 11c-3 0-6 3.5-6 6.2C6 19.3 7.6 20 9 20c1.3 0 2-.6 3-.6s1.7.6 3 .6c1.4 0 3-.7 3-2.8C18 14.5 15 11 12 11z"/></svg>',
  ara: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  tik: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  konum: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/></svg>',
};

// ---------- yardımcılar ----------
const $ = (s, k = document) => k.querySelector(s);
const $$ = (s, k = document) => [...k.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slug = s => String(s).toLocaleLowerCase("tr").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const ilBul = s => ILLER.find(i => slug(i) === s) || null;
const tl = n => Number(n).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
const tarih = s => new Date(s).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
function gunFark(s) { return Math.max(0, Math.floor((Date.now() - new Date(s).getTime()) / 864e5)); }
function bekleme(i) {
  const g = gunFark(i.yayin_tarihi || i.created_at);
  if (i.kategori !== "sahiplendirme") return g === 0 ? "Bugün" : g + " gün önce";
  return g === 0 ? "Bugün eklendi" : g + " gündür bekliyor";
}
const oneCikan = i => !!i.one_cikan_bitis && new Date(i.one_cikan_bitis) > new Date();
function bildir(metin) {
  const b = $("#bildirim"); b.textContent = metin; b.hidden = false;
  clearTimeout(b._t); b._t = setTimeout(() => { b.hidden = true; }, 5000);
}
function mesaj(el, metin, hata) { el.className = "mesaj " + (hata ? "hata" : "tamam"); el.textContent = metin; }
function hataMetni(e) {
  const m = (e && (e.message || e.error_description)) || String(e || "");
  if (/Invalid login/i.test(m)) return "E-posta ya da şifre hatalı.";
  if (/already registered/i.test(m)) return "Bu e-posta zaten kayıtlı. Giriş yapmayı deneyin.";
  if (/Email not confirmed/i.test(m)) return "E-postanıza gelen onay bağlantısına tıklayın, sonra giriş yapın.";
  if (/Password should be/i.test(m)) return "Şifre en az 6 karakter olmalı.";
  if (/basvurular_tekil/i.test(m)) return "Bu ilana zaten başvurdunuz.";
  if (/row-level security|permission|yetkiniz yok/i.test(m)) return "Bu işlem için yetkiniz yok. Hesabın kısıtlandıysa bizimle iletişime geç.";
  if (/arasında olmalı|onay beklemiyor/i.test(m)) return m.replace(/^.*?: /, "") + ".";
  if (/rate limit|over_email_send|429/i.test(m + " " + (e && (e.code || e.status)))) return "Kısa sürede çok fazla e-posta istendi. Lütfen bir saat sonra tekrar deneyin.";
  if (/Failed to fetch|NetworkError/i.test(m)) return "Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.";
  return "Bir sorun oldu: " + m;
}
function secenekler(obj, secili, bosEtiket) {
  return (bosEtiket !== undefined ? `<option value="">${esc(bosEtiket)}</option>` : "") +
    Object.entries(obj).map(([k, v]) => `<option value="${esc(k)}"${k === secili ? " selected" : ""}>${esc(v)}</option>`).join("");
}
// İl seçilince ilçe listesi: aynı formdaki [name=ilce] alanı ilin ilçelerinden seçilen bir listeye dönüşür.
function ilceSecenekleri(il, secili, bosEtiket = "Seç") {
  const liste = (window.ILCELER && ILCELER[il]) || [];
  const ekstra = secili && !liste.includes(secili) ? [secili] : [];
  return `<option value="">${esc(il ? bosEtiket : "Önce il seç")}</option>` +
    [...ekstra, ...liste].map(x => `<option${x === secili ? " selected" : ""}>${esc(x)}</option>`).join("");
}
function ilceBagla(kok = document) {
  if (!window.ILCELER) return;
  $$("[name=ilce]:not([data-ilce-bagli])", kok).forEach(alan => {
    const form = alan.form || alan.closest("form, .form");
    const ilSec = form && $("select[name=il]", form);
    if (!ilSec) return;
    let sec = alan;
    if (alan.tagName !== "SELECT") {
      sec = document.createElement("select");
      sec.name = "ilce"; sec.required = alan.required; if (alan.id) sec.id = alan.id; sec.className = alan.className;
      sec.dataset.deger = alan.value || "";
      alan.replaceWith(sec);
    }
    sec.dataset.ilceBagli = "1";
    const doldur = () => { sec.innerHTML = ilceSecenekleri(ilSec.value, sec.dataset.deger || sec.value); sec.disabled = !ilSec.value; sec.dataset.deger = ""; };
    doldur();
    ilSec.addEventListener("change", doldur);
  });
}
new MutationObserver(() => ilceBagla()).observe(document.documentElement, { childList: true, subtree: true });

function ilSecenekleri(secili, bosEtiket) {
  return (bosEtiket !== undefined ? `<option value="">${esc(bosEtiket)}</option>` : "") +
    ILLER.map(i => `<option${i === secili ? " selected" : ""}>${esc(i)}</option>`).join("");
}
function meta(baslik, aciklama) {
  const genel = (typeof C !== "undefined" && C.genel) || {};
  document.title = baslik ? `${baslik} | ${SITE}` : (genel.site_basligi || `${SITE} | Ücretsiz kedi ve köpek sahiplendirme ilanları`);
  const md = $('meta[name="description"]');
  if (aciklama && md) md.setAttribute("content", aciklama);
}
function sayfa(html) { const m = $("#icerik"); m.innerHTML = html; }

// ---------- Supabase ----------
const A = window.AYAR || {};
if (!A.SUPABASE_URL || /PROJE-KODUNUZ/.test(A.SUPABASE_URL)) {
  sayfa(`<div class="kap bos-durum"><h1>Kurulum eksik</h1><p>config.js dosyasına Supabase adresi ve anahtarı girilmemiş. README'deki 2. adıma bakın.</p></div>`);
  throw new Error("config.js eksik");
}
const sb = supabase.createClient(A.SUPABASE_URL, A.SUPABASE_ANON_KEY);
const S = { kullanici: null, yonetici: false };

async function oturumYukle() {
  const { data } = await sb.auth.getSession();
  S.kullanici = data.session ? data.session.user : null;
  S.yonetici = false;
  if (S.kullanici) {
    const { data: y } = await sb.from("yoneticiler").select("email").limit(1);
    S.yonetici = !!(y && y.length);
  }
  oturumMenusu();
}
function oturumMenusu() {
  const a = $("#oturum-alani");
  if (!S.kullanici) { a.innerHTML = `<a href="/giris">Giriş yap</a>`; return; }
  a.innerHTML = (S.yonetici ? `<a href="/yonetim">Yönetim</a>` : "") + `<a href="/hesabim">Hesabım</a><button type="button" id="cikis">Çıkış</button>`;
  $("#cikis").onclick = async () => { await sb.auth.signOut(); await oturumYukle(); git("/"); };
}
function girisGerekli(yol) {
  if (S.kullanici) return false;
  git("/giris?devam=" + encodeURIComponent(yol || location.pathname + location.search), true);
  return true;
}

// ---------- yönlendirme (gerçek adresler: Google'da çıkabilsin diye) ----------
function git(yol, yerine) {
  if (yerine) history.replaceState(null, "", yol); else history.pushState(null, "", yol);
  yonlendir();
}
document.addEventListener("click", e => {
  const a = e.target.closest("a[href]");
  if (!a || a.target || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  const u = new URL(a.href, location.href);
  if (u.origin !== location.origin || /\.[a-z0-9]+$/i.test(u.pathname)) return;
  if (u.pathname === location.pathname && u.search === location.search && u.hash) return;
  e.preventDefault();
  $("#ana-menu").classList.remove("acik"); $("#menu-btn").setAttribute("aria-expanded", "false");
  git(u.pathname + u.search);
});
window.addEventListener("popstate", () => yonlendir());
$("#menu-btn").onclick = () => {
  const m = $("#ana-menu"), acik = m.classList.toggle("acik");
  $("#menu-btn").setAttribute("aria-expanded", String(acik));
};

const ROTALAR = [
  [/^\/$/, anaSayfa],
  [/^\/sahiplendirme(?:\/([a-z0-9-]+))?$/, (il) => listeSayfasi({ kategori: "sahiplendirme", tur: "", ilSlug: il })],
  [/^\/(kedi|kopek|kus|diger)-sahiplendirme(?:\/([a-z0-9-]+))?$/, (tur, il) => listeSayfasi({ kategori: "sahiplendirme", tur, ilSlug: il })],
  [/^\/(kayip|bulunan)-ilanlari(?:\/([a-z0-9-]+))?$/, (kat, il) => listeSayfasi({ kategori: kat, tur: "", ilSlug: il })],
  [/^\/ilan\/([0-9a-f-]{36})$/, detaySayfasi],
  [/^\/ilan-ver$/, () => ilanFormu(null)],
  [/^\/ilan-duzenle\/([0-9a-f-]{36})$/, (id) => ilanFormu(id)],
  [/^\/giris$/, girisSayfasi],
  [/^\/hesabim$/, hesabimSayfasi],
  [/^\/one-cikar\/([0-9a-f-]{36})$/, oneCikarSayfasi],
  [/^\/odeme\/(basarili|hata)$/, odemeSonucSayfasi],
  [/^\/(hakkimizda|sss|kvkk|kullanim-kosullari)$/, metinSayfasi],
];
let yonlendirmeNo = 0;
async function yonlendir() {
  const no = ++yonlendirmeNo;
  const yol = location.pathname.replace(/\/+$/, "") || "/";
  $$(".ana-menu > a, #menu-linkleri > a").forEach(a => a.removeAttribute("aria-current"));
  for (const [re, fn] of ROTALAR) {
    const m = yol.match(re);
    if (!m) continue;
    try { await fn(...m.slice(1)); }
    catch (e) { if (no === yonlendirmeNo) sayfa(`<div class="kap bos-durum"><h1>Bir sorun oldu</h1><p>${esc(hataMetni(e))}</p><p><a href="/">Ana sayfaya dön</a></p></div>`); console.error(e); }
    if (no === yonlendirmeNo && !location.hash) window.scrollTo(0, 0);
    return;
  }
  meta("Sayfa bulunamadı");
  sayfa(`<div class="kap bos-durum"><h1>Sayfa bulunamadı</h1><p><a href="/">Ana sayfaya dön</a></p></div>`);
}

// ---------- adresler ----------
function listeYolu({ kategori = "sahiplendirme", tur = "", il = "" } = {}, sorgu) {
  let yol = kategori === "sahiplendirme" ? (tur ? `/${tur}-sahiplendirme` : "/sahiplendirme") : `/${kategori}-ilanlari`;
  if (il) yol += "/" + slug(il);
  const q = sorgu ? new URLSearchParams(Object.entries(sorgu).filter(([, v]) => v)).toString() : "";
  return yol + (q ? "?" + q : "");
}

// ---------- ilan kartı ----------
function kart(i) {
  const vitrin = oneCikan(i);
  const foto = i.fotolar && i.fotolar[0];
  const bilgi = [TUR[i.tur], i.irk, i.yas_grubu && YAS[i.yas_grubu]].filter(Boolean).join(" · ");
  const ozler = ["asili", "kisir"].filter(k => i[k]).map(k => `<span class="oz">${OZELLIK[k]}</span>`).join("");
  return `<a class="kart${vitrin ? " vitrinde" : ""}" href="/ilan/${i.id}">
    <div class="kart-foto t-${esc(i.tur)}">
      ${foto ? `<img src="${esc(foto)}" alt="${esc(i.ad)}" loading="lazy">` : `<span class="yok">${ikon.pati}</span>`}
      <div class="etiketler-ust">
        ${vitrin ? `<span class="e e-vitrin">Öne çıkan</span>` : ""}
        ${i.kategori === "kayip" ? `<span class="e e-kayip">Kayıp</span>` : i.kategori === "bulunan" ? `<span class="e e-bulunan">Bulundu</span>` : ""}
        <span class="e">${esc(bekleme(i))}</span>
      </div>
    </div>
    <div class="kart-govde">
      <div class="kart-ad"><b>${esc(i.ad)}</b><span>${esc(i.cinsiyet !== "bilinmiyor" ? CINS[i.cinsiyet] : "")}</span></div>
      <span class="kart-bilgi">${esc(bilgi)}</span>
      <span class="kart-yer">${esc([i.ilce, i.il].filter(Boolean).join(", "))}</span>
      ${ozler ? `<div class="ozellikler">${ozler}</div>` : ""}
    </div>
  </a>`;
}
const izgara = liste => `<div class="izgara">${liste.map(kart).join("")}</div>`;

// ---------- ana sayfa (içerik yönetim panelinden düzenlenir: icerik.js) ----------
function bannerHtml() {
  const B = C.bannerlar;
  const l = (B.liste || []).filter(x => x.aktif !== false && gorselUrl(x.gorsel));
  if (B.aktif === false || !l.length) return "";
  const kare = (x, n) => {
    const yazi = x.baslik || x.metin || x.buton;
    const odak = { sol: "20%", sag: "72%" }[x.odak] || "50%";
    const ic = `<img src="${esc(gorselUrl(x.gorsel))}" alt="${esc(x.baslik || "")}" style="object-position:${odak} 50%"${n ? ' loading="lazy"' : ""}>
      ${yazi ? `<div class="slayt-yazi">${x.baslik ? `<h2>${esc(x.baslik)}</h2>` : ""}${x.metin ? `<p>${satirlar(x.metin)}</p>` : ""}${x.buton ? `<span class="btn btn-ana">${esc(x.buton)}</span>` : ""}</div>` : ""}`;
    const h = guvenliLink(x.link);
    return h ? `<a class="slayt-kare${yazi ? " yazili" : ""}" href="${esc(h)}"${disLink(h) ? ' target="_blank" rel="noopener"' : ""}>${ic}</a>` : `<div class="slayt-kare${yazi ? " yazili" : ""}">${ic}</div>`;
  };
  return `<section class="kap bolum" style="padding-bottom:0"><div class="slayt" id="slayt" aria-roledescription="carousel" aria-label="Kampanyalar">
    <div class="slayt-iz">${l.map(kare).join("")}</div>
    ${l.length > 1 ? `<button type="button" class="slayt-ok sol" data-slayt="-1" aria-label="Önceki">‹</button><button type="button" class="slayt-ok sag" data-slayt="1" aria-label="Sonraki">›</button>
    <div class="slayt-nokta">${l.map((_, n) => `<button type="button" data-slayt-git="${n}" aria-label="${n + 1}. banner"${n === 0 ? ' aria-current="true"' : ""}></button>`).join("")}</div>` : ""}
  </div></section>`;
}
function slaytBaslat() {
  const k = $("#slayt"); if (!k) return;
  const iz = $(".slayt-iz", k), adet = iz.children.length; if (adet < 2) return;
  let n = 0, t;
  const goster = i => {
    n = (i + adet) % adet; iz.style.transform = `translateX(-${n * 100}%)`;
    $$("[data-slayt-git]", k).forEach(b => b.setAttribute("aria-current", String(+b.dataset.slaytGit === n)));
  };
  const zamanla = () => { clearInterval(t); t = setInterval(() => { if (!document.body.contains(k)) return clearInterval(t); goster(n + 1); }, Math.max(2, Number(C.bannerlar.sure) || 6) * 1000); };
  $$("[data-slayt]", k).forEach(b => b.onclick = () => { goster(n + Number(b.dataset.slayt)); zamanla(); });
  $$("[data-slayt-git]", k).forEach(b => b.onclick = () => { goster(+b.dataset.slaytGit); zamanla(); });
  let x0 = null;
  k.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
  k.addEventListener("touchend", e => { if (x0 === null) return; const d = e.changedTouches[0].clientX - x0; if (Math.abs(d) > 40) { goster(n + (d < 0 ? 1 : -1)); zamanla(); } x0 = null; });
  zamanla();
}
function bantHtml(b) {
  const renk = ["mavi", "turuncu", "yesil", "sari"].includes(b.renk) ? b.renk : "mavi";
  const dugme = [[b.buton1_yazi, b.buton1_link, renk === "turuncu" ? "btn btn-turuncu" : "btn"], [b.buton2_yazi, b.buton2_link, "btn"]]
    .filter(([y]) => y).map(([y, l, c]) => aEtiket(l, esc(y), c)).join("");
  const g = gorselUrl(b.gorsel);
  return `<section class="kap bolum"><div class="bant bant-${renk}">
    <div>${b.ust_yazi ? `<span class="ust-yazi">${esc(b.ust_yazi)}</span>` : ""}${b.baslik ? `<h2>${esc(b.baslik)}</h2>` : ""}${b.metin ? `<p>${satirlar(b.metin)}</p>` : ""}</div>
    ${g ? `<div class="bant-gorsel"><img src="${esc(g)}" alt="" loading="lazy"></div>` : ""}
    ${dugme ? `<div class="dugmeler">${dugme}</div>` : ""}
  </div></section>`;
}
async function anaSayfa() {
  meta("", C.genel.site_aciklama);
  const K = C.kahraman, KT = C.kategoriler, IL = C.ilanlar, AD = C.adimlar, G = C.guven;
  const gorseller = [K.gorsel1, K.gorsel2, K.gorsel3, K.gorsel4].map(gorselUrl);
  const arka = gorselUrl(K.arka_gorsel);
  const sol = { cok: [0.9, 0.7], az: [0.7, 0.2] }[K.arka_soluk] || [0.82, 0.45];
  const arkaStil = arka ? ` style="background-image:linear-gradient(90deg,rgba(255,255,255,${sol[0]}),rgba(255,255,255,${sol[1]})),url('${esc(arka).replace(/'/g, "%27")}')"` : "";
  sayfa(`
  <section class="kahraman${arka ? " resimli" : ""}"${arkaStil}><div class="kap kahraman-in">
    <div class="kahraman-yazi">
      ${K.rozet ? `<span class="rozet">${esc(K.rozet)}</span>` : ""}
      ${K.baslik ? `<h1>${satirlar(K.baslik)}</h1>` : ""}
      ${K.aciklama ? `<p>${satirlar(K.aciklama)}</p>` : ""}
      ${K.arama_goster !== false ? `<form class="arama" id="arama">
        <label><span>Ne arıyorsun?</span><select name="tur">${secenekler(TUR, "", "Tümü")}</select></label>
        <label><span>Hangi il?</span><select name="il">${ilSecenekleri("", "Tüm Türkiye")}</select></label>
        <button class="btn btn-ana" type="submit">${ikon.ara} Ara</button>
      </form>` : ""}
    </div>
    <div class="kahraman-gorsel" aria-hidden="true">${gorseller.map(u => `<div>${u ? `<img src="${esc(u)}" alt="">` : ""}</div>`).join("")}</div>
  </div></section>

  ${bannerHtml()}

  ${KT.goster !== false && (KT.liste || []).length ? `<section class="kap bolum">
    ${KT.baslik ? `<div class="bolum-bas"><h2>${esc(KT.baslik)}</h2></div>` : ""}
    <div class="kategoriler">
      ${KT.liste.filter(x => x.baslik).map(x => {
        const g = gorselUrl(x.gorsel);
        const ic = `${g ? `<img class="kategori-foto" src="${esc(g)}" alt="" loading="lazy">` : `<span class="ikon">${/kayip|bulunan/.test(x.link || "") ? ikon.ara : ikon.pati}</span>`}<b>${esc(x.baslik)}</b>${x.metin ? `<span>${esc(x.metin)}</span>` : ""}`;
        return aEtiket(x.link, ic, "kategori");
      }).join("")}
    </div>
  </section>` : ""}

  <section class="kap bolum" id="vitrin-bolum" hidden>
    <div class="bolum-bas"><div><h2>${esc(IL.vitrin_baslik)}</h2>${IL.vitrin_aciklama ? `<p>${esc(IL.vitrin_aciklama)}</p>` : ""}</div></div>
    <div id="vitrin"></div>
  </section>

  ${IL.bekleyen_goster !== false ? `<section class="kap bolum">
    <div class="bolum-bas"><div><h2>${esc(IL.bekleyen_baslik)}</h2>${IL.bekleyen_aciklama ? `<p>${esc(IL.bekleyen_aciklama)}</p>` : ""}</div>${IL.bekleyen_link_yazi ? aEtiket(IL.bekleyen_link, esc(IL.bekleyen_link_yazi)) : ""}</div>
    <div id="bekleyenler"><p class="bilgi">Yükleniyor…</p></div>
  </section>` : ""}

  ${AD.goster !== false && (AD.liste || []).length ? `<section class="kap bolum">
    ${AD.baslik ? `<div class="bolum-bas"><h2>${esc(AD.baslik)}</h2></div>` : ""}
    <div class="adimlar">
      ${AD.liste.map((x, n) => `<div class="adim"><span class="no">${n + 1}</span><b>${esc(x.baslik)}</b><span>${esc(x.metin)}</span></div>`).join("")}
    </div>
  </section>` : ""}

  ${(C.bantlar.liste || []).filter(b => b.aktif !== false).map(bantHtml).join("")}

  ${G.goster !== false && (G.liste || []).length ? `<section class="kap bolum">
    ${G.baslik ? `<div class="bolum-bas"><h2>${esc(G.baslik)}</h2></div>` : ""}
    <div class="guven">
      ${G.liste.map(x => `<div><span class="tik">${ikon.tik}</span><p style="margin:0"><b>${esc(x.baslik)}</b><span>${esc(x.metin)}</span></p></div>`).join("")}
    </div>
  </section>` : ""}`);

  slaytBaslat();
  if ($("#arama")) $("#arama").onsubmit = e => {
    e.preventDefault(); const f = new FormData(e.target);
    git(listeYolu({ tur: f.get("tur"), il: f.get("il") }));
  };

  const [v, b] = await Promise.all([
    sb.from("yayindaki_ilanlar").select("*").eq("kategori", "sahiplendirme").eq("one_cikan", true).order("one_cikan_bitis", { ascending: false }).limit(8),
    sb.from("yayindaki_ilanlar").select("*").eq("kategori", "sahiplendirme").eq("one_cikan", false).order("yayin_tarihi", { ascending: true }).limit(8),
  ]);
  if (v.data && v.data.length) { $("#vitrin-bolum").hidden = false; $("#vitrin").innerHTML = izgara(v.data); }
  if (b.error) throw b.error;
  if ($("#bekleyenler")) $("#bekleyenler").innerHTML = b.data.length ? izgara(b.data) : `<div class="kutu bos-durum"><h2>Henüz ilan yok</h2><p>İlk ilanı sen ver.</p><p><a class="btn btn-ana" href="/ilan-ver">Ücretsiz ilan ver</a></p></div>`;
}

// ---------- ilan listesi ----------
async function listeSayfasi({ kategori, tur, ilSlug }) {
  const il = ilSlug ? ilBul(ilSlug) : "";
  if (ilSlug && !il) { meta("Sayfa bulunamadı"); sayfa(`<div class="kap bos-durum"><h1>Böyle bir il bulamadık</h1><p><a href="${listeYolu({ kategori, tur })}">Tüm Türkiye'deki ilanlara bak</a></p></div>`); return; }
  $$("#menu-linkleri > a").forEach(a => { if ((kategori === "sahiplendirme" && a.getAttribute("href") === "/sahiplendirme") || (kategori !== "sahiplendirme" && a.getAttribute("href") === "/kayip-ilanlari")) a.setAttribute("aria-current", "page"); });
  const q = new URLSearchParams(location.search);
  const f = { ilce: q.get("ilce") || "", yas: q.get("yas") || "", cinsiyet: q.get("cinsiyet") || "", sira: q.get("sira") || "bekleyen", sayfa: Math.max(1, parseInt(q.get("sayfa") || "1", 10) || 1) };
  const secOz = Object.keys(OZELLIK).filter(k => q.get(k) === "1");

  const yer = il || "Türkiye";
  let baslik, aciklama;
  if (kategori === "sahiplendirme") {
    baslik = tur ? `${il ? il + " " : ""}${TUR[tur].toLocaleLowerCase("tr")} sahiplendirme ilanları` : `${il ? il + " " : ""}ücretsiz hayvan sahiplendirme ilanları`;
    aciklama = `${yer} genelinde ücretsiz ${tur ? TUR[tur].toLocaleLowerCase("tr") : "kedi ve köpek"} sahiplendirme ilanları. Yaş, cinsiyet ve sağlık durumuna göre filtrele, ilan sahibine doğrudan ulaş.`;
  } else {
    baslik = `${il ? il + " " : ""}${kategori === "kayip" ? "kayıp hayvan" : "bulunan hayvan"} ilanları`;
    aciklama = `${yer} genelinde ${kategori === "kayip" ? "kayıp" : "bulunan"} kedi ve köpek ilanları. Bilgin varsa ilan sahibine ulaş.`;
  }
  baslik = baslik.charAt(0).toLocaleUpperCase("tr") + baslik.slice(1);
  meta(baslik, aciklama);

  const yolSorgu = (deg) => {
    const o = { ilce: f.ilce, yas: f.yas, cinsiyet: f.cinsiyet, sira: f.sira === "bekleyen" ? "" : f.sira };
    secOz.forEach(k => { o[k] = "1"; });
    Object.assign(o, deg);
    return o;
  };
  const kendi = (deg, yolDeg) => listeYolu(Object.assign({ kategori, tur, il }, yolDeg), yolSorgu(deg));
  const hap = (etiket, href, secili) => `<a class="hap" href="${esc(href)}"${secili ? ' aria-current="page"' : ""}>${esc(etiket)}</a>`;

  sayfa(`<div class="kap">
    <div class="liste-bas">
      <div><h1>${esc(baslik)}</h1><p id="sayac">Yükleniyor…</p></div>
      <label class="alan" style="flex-direction:row;align-items:center;gap:8px;font-weight:500;color:var(--soluk)">Sırala
        <select id="sira" style="width:auto">
          <option value="bekleyen"${f.sira === "bekleyen" ? " selected" : ""}>En uzun bekleyen</option>
          <option value="yeni"${f.sira === "yeni" ? " selected" : ""}>En yeni</option>
        </select>
      </label>
    </div>
    <div class="liste-duzen">
      <aside class="filtre" aria-label="Filtreler">
        <div class="filtre-bas"><b>Filtrele</b><a href="${esc(listeYolu({ kategori, tur }))}" style="font-size:14px">Temizle</a></div>
        <fieldset><legend>İlan türü</legend><div class="hap-grup">
          ${hap("Sahiplendirme", listeYolu({ kategori: "sahiplendirme", tur, il }), kategori === "sahiplendirme")}
          ${hap("Kayıp", listeYolu({ kategori: "kayip", il }), kategori === "kayip")}
          ${hap("Bulunan", listeYolu({ kategori: "bulunan", il }), kategori === "bulunan")}
        </div></fieldset>
        ${kategori === "sahiplendirme" ? `<fieldset><legend>Hayvan</legend><div class="hap-grup">
          ${hap("Tümü", kendi({ sayfa: "" }, { tur: "" }), !tur)}
          ${Object.entries(TUR).map(([k, v]) => hap(v, kendi({ sayfa: "" }, { tur: k }), tur === k)).join("")}
        </div></fieldset>` : ""}
        <label class="alan">İl<select id="il-sec">${ilSecenekleri(il, "Tüm Türkiye")}</select></label>
        ${il ? `<label class="alan">İlçe<select id="ilce-sec">${ilceSecenekleri(il, f.ilce, "Tüm ilçeler")}</select></label>` : ""}
        <fieldset><legend>Yaş</legend><div class="hap-grup">
          ${Object.entries(YAS).map(([k, v]) => hap(v, kendi({ yas: f.yas === k ? "" : k, sayfa: "" }), f.yas === k)).join("")}
        </div></fieldset>
        <fieldset><legend>Cinsiyet</legend><div class="hap-grup">
          ${hap("Dişi", kendi({ cinsiyet: f.cinsiyet === "disi" ? "" : "disi", sayfa: "" }), f.cinsiyet === "disi")}
          ${hap("Erkek", kendi({ cinsiyet: f.cinsiyet === "erkek" ? "" : "erkek", sayfa: "" }), f.cinsiyet === "erkek")}
        </div></fieldset>
        ${kategori === "sahiplendirme" ? `<fieldset><legend>Sağlık ve karakter</legend>
          ${Object.entries(OZELLIK).map(([k, v]) => `<label class="onay"><input type="checkbox" data-oz="${k}"${secOz.includes(k) ? " checked" : ""}> ${esc(v)}</label>`).join("")}
        </fieldset>` : ""}
      </aside>
      <div class="liste-sonuc" id="sonuc"><p class="bilgi">Yükleniyor…</p></div>
    </div>
  </div>`);

  $("#il-sec").onchange = e => git(kendi({ ilce: "", sayfa: "" }, { il: e.target.value }));
  if ($("#ilce-sec")) $("#ilce-sec").onchange = e => git(kendi({ ilce: e.target.value, sayfa: "" }));
  $("#sira").onchange = e => git(kendi({ sira: e.target.value === "bekleyen" ? "" : e.target.value, sayfa: "" }));
  $$("[data-oz]").forEach(c => c.onchange = () => {
    const o = {}; $$("[data-oz]").forEach(x => { o[x.dataset.oz] = x.checked ? "1" : ""; });
    git(kendi(Object.assign(o, { sayfa: "" })));
  });

  // Reklam verenler (öne çıkanlar) her zaman önce gelir.
  let s = sb.from("yayindaki_ilanlar").select("*", { count: "exact" }).eq("kategori", kategori);
  if (tur) s = s.eq("tur", tur);
  if (il) s = s.eq("il", il);
  if (il && f.ilce) s = s.eq("ilce", f.ilce);
  if (f.yas && YAS[f.yas]) s = s.eq("yas_grubu", f.yas);
  if (f.cinsiyet && CINS[f.cinsiyet]) s = s.eq("cinsiyet", f.cinsiyet);
  secOz.forEach(k => { s = s.eq(k, true); });
  s = s.order("one_cikan", { ascending: false }).order("yayin_tarihi", { ascending: f.sira !== "yeni" });
  const bas = (f.sayfa - 1) * SAYFA_BOYU;
  const { data, count, error } = await s.range(bas, bas + SAYFA_BOYU - 1);
  if (error) throw error;

  $("#sayac").textContent = `${il && f.ilce ? f.ilce + ", " : ""}${yer} · ${count || 0} ilan`;
  if (!data.length) {
    $("#sonuc").innerHTML = `<div class="kutu bos-durum"><h2>Bu aramaya uygun ilan yok</h2><p>Filtreleri azaltmayı ya da başka bir ili seçmeyi dene.</p></div>`;
    return;
  }
  const topSayfa = Math.ceil(count / SAYFA_BOYU);
  let sayfalar = "";
  if (topSayfa > 1) {
    const no = [];
    for (let n = 1; n <= topSayfa; n++) if (n === 1 || n === topSayfa || Math.abs(n - f.sayfa) <= 2) no.push(n);
    let onceki = 0;
    sayfalar = `<nav class="sayfalar" aria-label="Sayfalar">` + no.map(n => {
      const ara = n - onceki > 1 ? `<span aria-hidden="true">…</span>` : ""; onceki = n;
      return ara + `<a href="${esc(kendi({ sayfa: n > 1 ? String(n) : "" }))}"${n === f.sayfa ? ' aria-current="page"' : ""}>${n}</a>`;
    }).join("") + `</nav>`;
  }
  $("#sonuc").innerHTML = izgara(data) + sayfalar;
}

// ---------- ilan detayı ----------
async function detaySayfasi(id) {
  const { data: i, error } = await sb.from("ilanlar").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!i) { meta("İlan bulunamadı"); sayfa(`<div class="kap bos-durum"><h1>Bu ilan yayında değil</h1><p>İlan kaldırılmış ya da henüz onaylanmamış olabilir.</p><p><a href="/sahiplendirme">Diğer ilanlara bak</a></p></div>`); return; }

  const benim = S.kullanici && S.kullanici.id === i.sahip_id;
  const yayinda = i.durum === "yayinda";
  const sahiplendirme = i.kategori === "sahiplendirme";
  const bilgi = [TUR[i.tur], i.irk, i.cinsiyet !== "bilinmiyor" && CINS[i.cinsiyet], i.yas_grubu && YAS[i.yas_grubu], [i.ilce, i.il].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
  const fotolar = i.fotolar || [];
  meta(`${i.ad}: ${i.il} ${TUR[i.tur].toLocaleLowerCase("tr")} ${sahiplendirme ? "sahiplendirme" : KAT[i.kategori].toLocaleLowerCase("tr") + " ilanı"}`,
    `${i.ad}, ${bilgi}. ${(i.aciklama || "").slice(0, 120)}`);

  const listeLink = sahiplendirme ? listeYolu({ tur: i.tur }) : listeYolu({ kategori: i.kategori });
  const kunye = sahiplendirme ? [
    ["Yaş", i.yas_grubu ? YAS[i.yas_grubu] : "Belirtilmemiş"],
    ["Aşıları", i.asili ? "Tam" : "Belirtilmemiş"],
    ["Kısırlaştırma", i.kisir ? "Yapıldı" : "Belirtilmemiş"],
    ["Çocuklarla", i.cocuk_uyumlu ? "Uyumlu" : "Belirtilmemiş"],
    ["Diğer hayvanlarla", i.hayvan_uyumlu ? "Uyumlu" : "Belirtilmemiş"],
    ["Özel bakım", i.ozel_bakim ? "Gerekiyor" : "Gerekmiyor"],
  ] : [["İlan türü", KAT[i.kategori]], ["Tarih", tarih(i.yayin_tarihi || i.created_at)], ["Yer", [i.ilce, i.il].filter(Boolean).join(", ")]];

  sayfa(`<div class="kap">
    <nav class="yol" aria-label="Konum"><a href="/">Ana sayfa</a><span>/</span><a href="${esc(listeLink)}">${esc(sahiplendirme ? TUR[i.tur] + " sahiplendirme" : KAT[i.kategori] + " ilanları")}</a><span>/</span><span>${esc(i.ad)}</span></nav>
    ${!yayinda ? `<p class="uyari" style="margin-bottom:20px">Bu ilan şu an herkese açık değil: <b>${esc(ILAN_DURUM[i.durum])}</b>${i.red_notu ? ". Not: " + esc(i.red_notu) : ""}</p>` : ""}
    <div class="detay">
      <div class="detay-sol">
        <div>
          <div class="galeri-ana kart-foto t-${esc(i.tur)}" id="galeri-ana">${fotolar[0] ? `<img src="${esc(fotolar[0])}" alt="${esc(i.ad)}">` : `<span class="yok">${ikon.pati}</span>`}</div>
          ${fotolar.length > 1 ? `<div class="galeri-kucuk">${fotolar.map((u, n) => `<button type="button" data-foto="${n}" aria-pressed="${n === 0}" aria-label="${n + 1}. fotoğraf"><img src="${esc(u)}" alt=""></button>`).join("")}</div>` : ""}
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px">
            <h1 style="font-size:clamp(32px,5vw,44px);font-weight:900">${esc(i.ad)}</h1>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="btn btn-kucuk" id="paylas">Paylaş</button>
              ${benim ? `<a class="btn btn-kucuk" href="/ilan-duzenle/${i.id}">Düzenle</a>` : ""}
            </div>
          </div>
          <p style="margin:0;font-size:17px;color:var(--yazi2)">${esc(bilgi)}</p>
          <div class="ozellikler">
            ${oneCikan(i) ? `<span class="oz" style="background:var(--vitrin-acik);color:var(--vitrin)">Öne çıkan</span>` : ""}
            ${Object.keys(OZELLIK).filter(k => i[k] && k !== "ozel_bakim").map(k => `<span class="oz">${OZELLIK[k]}</span>`).join("")}
          </div>
        </div>
        <div class="kutu kunye">${kunye.map(([a, b]) => `<div><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join("")}</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <h2 style="font-size:24px;font-weight:800">${sahiplendirme ? esc(i.ad) + " hakkında" : "Açıklama"}</h2>
          <p class="aciklama">${esc(i.aciklama || "İlan sahibi açıklama eklememiş.")}</p>
        </div>
        ${!benim && S.kullanici ? `<p style="margin:0"><button type="button" class="link-btn tehlike" id="sikayet-ac">Bu ilanı şikayet et</button></p>
          <form class="kutu form" id="sikayet" hidden>
            <label class="alan">Şikayet nedeni<select name="neden" required>
              <option value="">Seç</option><option>Para isteniyor / satış ilanı</option><option>Sahte ya da yanıltıcı ilan</option><option>Hayvanın sağlığı tehlikede</option><option>Uygunsuz içerik</option><option>Diğer</option>
            </select></label>
            <label class="alan">Açıklama (isteğe bağlı)<textarea name="aciklama" maxlength="1000"></textarea></label>
            <button class="btn" type="submit">Şikayeti gönder</button>
            <div class="mesaj" role="status"></div>
          </form>` : ""}
      </div>
      <aside class="detay-sag" id="basvuru-alani"></aside>
    </div>
    <section class="bolum" id="benzer-bolum" hidden>
      <div class="bolum-bas"><h2>${esc(i.il)} ilindeki diğer dostlar</h2><a href="${esc(listeYolu({ kategori: i.kategori, tur: sahiplendirme ? i.tur : "", il: i.il }))}">Tümünü gör</a></div>
      <div id="benzer"></div>
    </section>
  </div>`);

  $$("[data-foto]").forEach(b => b.onclick = () => {
    $("#galeri-ana").innerHTML = `<img src="${esc(fotolar[+b.dataset.foto])}" alt="${esc(i.ad)}">`;
    $$("[data-foto]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  });
  $("#paylas").onclick = async () => {
    const veri = { title: `${i.ad} yuva arıyor`, text: `${i.ad} | ${bilgi}`, url: location.href };
    try { if (navigator.share) await navigator.share(veri); else { await navigator.clipboard.writeText(location.href); bildir("Bağlantı kopyalandı."); } } catch (_) {}
  };
  if ($("#sikayet-ac")) {
    $("#sikayet-ac").onclick = () => { $("#sikayet").hidden = !$("#sikayet").hidden; };
    $("#sikayet").onsubmit = async e => {
      e.preventDefault(); const fd = new FormData(e.target), m = $(".mesaj", e.target);
      const { error } = await sb.from("sikayetler").insert({ ilan_id: i.id, neden: fd.get("neden"), aciklama: fd.get("aciklama") || null });
      if (error) return mesaj(m, hataMetni(error), true);
      e.target.reset(); mesaj(m, "Teşekkürler. Şikayetini inceleyeceğiz.");
    };
  }
  await basvuruAlani(i, benim, yayinda);

  const { data: benzer } = await sb.from("yayindaki_ilanlar").select("*").eq("kategori", i.kategori).eq("il", i.il).neq("id", i.id)
    .order("one_cikan", { ascending: false }).order("yayin_tarihi", { ascending: true }).limit(4);
  if (benzer && benzer.length) { $("#benzer-bolum").hidden = false; $("#benzer").innerHTML = izgara(benzer); }
}

// Türkiye numarasını WhatsApp biçimine çevirir (905xxxxxxxxx). Geçersizse boş döner.
function waNumara(t) {
  let d = String(t || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = "90" + d.slice(1);
  else if (d.length === 10 && d.startsWith("5")) d = "90" + d;
  return d.length >= 11 && d.length <= 15 ? d : "";
}
function telBicim(t) {
  const d = String(t || "").replace(/\D/g, "");
  const y = d.length === 12 && d.startsWith("90") ? "0" + d.slice(2) : d.length === 10 ? "0" + d : d;
  return y.length === 11 ? `${y.slice(0, 4)} ${y.slice(4, 7)} ${y.slice(7, 9)} ${y.slice(9)}` : String(t || "");
}

async function basvuruAlani(i, benim, yayinda) {
  const k = $("#basvuru-alani");
  const sahiplendirme = i.kategori === "sahiplendirme";
  if (benim) {
    const vitrin = oneCikan(i);
    k.innerHTML = `<div class="kutu form">
      <h2 style="font-size:22px">Bu senin ilanın</h2>
      ${i.telefon ? `<p class="bilgi">İlgilenenler seni <b>${esc(telBicim(i.telefon))}</b> numarasından ${i.whatsapp ? "arayabilir ya da WhatsApp'tan yazabilir" : "arayabilir"}.</p>`
        : `<p class="uyari">İlanında iletişim numarası yok. Numara ekle ki ilgilenenler sana ulaşabilsin.</p>`}
      ${["sahiplendi", "kaldirildi"].includes(i.durum) ? "" : `<a class="btn" href="/ilan-duzenle/${i.id}">${i.telefon ? "İlanı düzenle" : "Numara ekle"}</a>`}
      ${["bekliyor", "yayinda"].includes(i.durum) ? (vitrin
        ? `<p class="bilgi">Öne çıkarma ${tarih(i.one_cikan_bitis)} tarihine kadar sürüyor.</p><a class="btn btn-vitrin" href="/one-cikar/${i.id}">Süreyi uzat</a>`
        : `<a class="btn btn-vitrin" href="/one-cikar/${i.id}">İlanı öne çıkar</a>`) : ""}
    </div>`;
    return;
  }
  if (!yayinda) { k.innerHTML = ""; return; }
  const baslik = sahiplendirme ? "Bu dostu sahiplenmek ister misin?" : i.kategori === "kayip" ? "Bu dostu gördün mü?" : "Bu dost senin mi?";
  const wa = i.whatsapp ? waNumara(i.telefon) : "";
  const tel = String(i.telefon || "").replace(/[^\d+]/g, "");
  const metin = `Merhaba, PetPatiBul'daki "${i.ad}" ilanınız için yazıyorum. ${location.origin}/ilan/${i.id}`;
  k.innerHTML = `<div class="kutu form iletisim-kutu">
    <h2 style="font-size:22px">${baslik}</h2>
    ${tel ? `<p class="bilgi">İlan sahibiyle doğrudan iletişime geç.</p>
      <a class="iletisim-tel" href="tel:${esc(tel)}">${esc(telBicim(i.telefon))}</a>
      ${wa ? `<a class="btn btn-whatsapp" href="https://wa.me/${wa}?text=${encodeURIComponent(metin)}" target="_blank" rel="noopener">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3z"/></svg>
        WhatsApp'tan yaz</a>` : ""}
      <a class="btn" href="tel:${esc(tel)}">Ara</a>`
      : `<p class="bilgi">İlan sahibi henüz bir iletişim numarası eklemedi.</p>`}
    <p class="bilgi" style="font-size:13px">Görüşmeyi ilan sahibiyle kendiniz yürütürsünüz, PetPatiBul aracılık yapmaz. Hayvanla tanışmadan karar vermeyin.</p>
    ${sahiplendirme ? `<p class="uyari">Sahiplendirme ücretsizdir. Senden para isteyen olursa lütfen ilanı şikayet et.</p>` : ""}
  </div>`;
}

// ---------- giriş / üyelik ----------
async function girisSayfasi() {
  const devam = new URLSearchParams(location.search).get("devam");
  const hedef = devam && devam.startsWith("/") && !devam.startsWith("//") ? devam : "/hesabim";
  if (S.kullanici && !/type=recovery/.test(location.hash)) { git(hedef, true); return; }
  meta("Giriş yap");
  let mod = /type=recovery/.test(location.hash) ? "yeni" : "giris";
  sayfa(`<div class="kap cok-dar"><div class="kutu">
    <h1 style="font-size:30px;font-weight:900;margin-bottom:6px" id="g-baslik"></h1>
    <p class="bilgi" style="margin-bottom:20px">İlan vermek ve ilanlara ulaşmak ücretsizdir.</p>
    <div class="sekmeler" role="tablist" id="g-sekmeler">
      <button type="button" role="tab" data-mod="giris">Giriş yap</button>
      <button type="button" role="tab" data-mod="kayit">Üye ol</button>
    </div>
    <form class="form" id="g-form">
      <label class="alan" id="g-email-alan">E-posta<input name="email" type="email" autocomplete="email" required></label>
      <label class="alan">Şifre<input name="sifre" type="password" minlength="6" required id="g-sifre"><small id="g-sifre-not">En az 6 karakter.</small></label>
      <label class="onay" id="g-kvkk" style="align-items:flex-start"><input type="checkbox" style="margin-top:2px"> <span style="font-size:14px;color:var(--yazi2)"><a href="/kullanim-kosullari" target="_blank">Kullanım koşullarını</a> ve <a href="/kvkk" target="_blank">KVKK metnini</a> kabul ediyorum.</span></label>
      <button class="btn btn-ana" type="submit" id="g-btn"></button>
      <div class="mesaj" role="status" id="g-mesaj"></div>
      <button type="button" class="link-btn" id="g-unuttum">Şifremi unuttum</button>
    </form>
  </div></div>`);
  const ayarla = m => {
    mod = m;
    $("#g-baslik").textContent = m === "kayit" ? "Üye ol" : m === "yeni" ? "Yeni şifre belirle" : "Giriş yap";
    $("#g-sekmeler").hidden = m === "yeni";
    $$("#g-sekmeler button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.mod === m)));
    $("#g-email-alan").hidden = m === "yeni"; $("[name=email]").required = m !== "yeni";
    $("#g-kvkk").hidden = m !== "kayit"; $("#g-kvkk input").required = m === "kayit";
    $("#g-sifre-not").hidden = m === "giris";
    $("#g-sifre").autocomplete = m === "giris" ? "current-password" : "new-password";
    $("#g-unuttum").hidden = m !== "giris";
    $("#g-btn").textContent = m === "kayit" ? "Üye ol" : m === "yeni" ? "Şifreyi kaydet" : "Giriş yap";
    $("#g-mesaj").textContent = ""; $("#g-mesaj").className = "mesaj";
  };
  ayarla(mod);
  $$("#g-sekmeler button").forEach(b => b.onclick = () => ayarla(b.dataset.mod));
  $("#g-unuttum").onclick = async () => {
    const email = $("[name=email]").value.trim().toLowerCase();
    if (!email) return mesaj($("#g-mesaj"), "Önce e-posta adresini yaz.", true);
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/giris" });
    if (error) return mesaj($("#g-mesaj"), hataMetni(error), true);
    mesaj($("#g-mesaj"), "Şifre yenileme bağlantısını e-postana gönderdik.");
  };
  $("#g-form").onsubmit = async e => {
    e.preventDefault();
    const email = $("[name=email]").value.trim().toLowerCase(), password = $("#g-sifre").value, m = $("#g-mesaj");
    $("#g-btn").disabled = true;
    try {
      if (mod === "giris") {
        const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error;
        await oturumYukle(); git(hedef, true);
      } else if (mod === "kayit") {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + "/giris?devam=" + encodeURIComponent(hedef) } });
        if (error) throw error;
        if (data.session) { await oturumYukle(); git(hedef, true); }
        else mesaj(m, "E-postana bir onay bağlantısı gönderdik. Bağlantıya tıkladıktan sonra giriş yapabilirsin.");
      } else {
        const { error } = await sb.auth.updateUser({ password }); if (error) throw error;
        history.replaceState(null, "", "/giris"); await oturumYukle(); bildir("Şifren değişti."); git("/hesabim", true);
      }
    } catch (err) { mesaj(m, hataMetni(err), true); }
    $("#g-btn").disabled = false;
  };
}

// ---------- ilan ver / düzenle ----------
async function fotoKucult(dosya) {
  const bmp = await createImageBitmap(dosya);
  const oran = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * oran); c.height = Math.round(bmp.height * oran);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise(r => c.toBlob(r, "image/jpeg", 0.85));
}

async function ilanFormu(id) {
  if (girisGerekli()) return;
  let i = { kategori: new URLSearchParams(location.search).get("kategori") || "sahiplendirme", tur: "kedi", cinsiyet: "bilinmiyor", fotolar: [] };
  if (!KAT[i.kategori]) i.kategori = "sahiplendirme";
  if (id) {
    const { data, error } = await sb.from("ilanlar").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data || (data.sahip_id !== S.kullanici.id && !S.yonetici)) { sayfa(`<div class="kap bos-durum"><h1>Bu ilanı düzenleyemezsin</h1><p><a href="/hesabim">Hesabıma dön</a></p></div>`); return; }
    i = data;
  }
  if (!id) {
    const { data: son } = await sb.from("ilanlar").select("telefon, whatsapp").eq("sahip_id", S.kullanici.id).not("telefon", "is", null).order("created_at", { ascending: false }).limit(1);
    if (son && son[0]) { i.telefon = son[0].telefon; i.whatsapp = son[0].whatsapp; }
  }
  meta(id ? "İlanı düzenle" : "Ücretsiz ilan ver");
  let fotolar = [...(i.fotolar || [])];
  const ozler = Object.entries(OZELLIK).map(([k, v]) => `<label class="onay"><input type="checkbox" name="${k}"${i[k] ? " checked" : ""}> ${esc(v)}</label>`).join("");

  sayfa(`<div class="kap dar">
    <h1 style="font-size:clamp(30px,4vw,38px);font-weight:900;margin-bottom:8px">${id ? "İlanı düzenle" : "Ücretsiz ilan ver"}</h1>
    <p class="bilgi" style="margin-bottom:24px">${id && i.durum === "yayinda" ? "Kaydettiğinde ilan kısa bir kontrol için tekrar onaya düşer." : "İlanın ekibimiz kontrol ettikten sonra yayına girer."} Hayvan satışı ve ücret talebi yasaktır.</p>
    <form class="kutu form" id="ilan-form">
      <fieldset><legend>İlan türü</legend><div class="hap-grup" id="kat-sec">
        ${Object.entries(KAT).map(([k, v]) => `<button type="button" class="hap" data-kat="${k}" aria-pressed="${i.kategori === k}">${v === "Sahiplendirme" ? "Sahiplendiriyorum" : v === "Kayıp" ? "Kaybettim" : "Buldum"}</button>`).join("")}
      </div></fieldset>
      <div class="form-izgara">
        <label class="alan">Hayvan<select name="tur" required>${secenekler(TUR, i.tur)}</select></label>
        <label class="alan">Adı<input name="ad" required maxlength="60" value="${esc(i.ad || "")}" placeholder="Bilmiyorsan kısa bir tanım yaz"></label>
        <label class="alan">Irkı (isteğe bağlı)<input name="irk" maxlength="60" value="${esc(i.irk || "")}" placeholder="Örn. Tekir, melez"></label>
        <label class="alan">Yaş<select name="yas_grubu">${secenekler(YAS, i.yas_grubu || "", "Bilmiyorum")}</select></label>
        <label class="alan">Cinsiyet<select name="cinsiyet">${secenekler(CINS, i.cinsiyet)}</select></label>
        <label class="alan">İl<select name="il" required>${ilSecenekleri(i.il || "", "Seç")}</select></label>
        <label class="alan">İlçe<input name="ilce" maxlength="60" value="${esc(i.ilce || "")}"></label>
      </div>
      <fieldset id="ozellik-alani"><legend>Sağlık ve karakter</legend>${ozler}</fieldset>
      <label class="alan">Açıklama<textarea name="aciklama" maxlength="4000" rows="6" placeholder="Karakteri, alışkanlıkları, neden yeni bir yuvaya ihtiyacı olduğu...">${esc(i.aciklama || "")}</textarea></label>
      <fieldset><legend>İletişim</legend>
        <label class="alan">Telefon numaran<input name="telefon" type="tel" required minlength="10" maxlength="20" autocomplete="tel" inputmode="tel" placeholder="05xx xxx xx xx" value="${esc(i.telefon || "")}">
          <small>Bu numara ilan sayfasında herkese görünür. İlgilenenler seni doğrudan arar ya da WhatsApp'tan yazar.</small></label>
        <label class="onay"><input type="checkbox" name="whatsapp"${i.whatsapp === false ? "" : " checked"}> Bu numaradan WhatsApp ile ulaşılabilir</label>
      </fieldset>
      <div class="alan">Fotoğraflar <small>En fazla ${MAKS_FOTO} fotoğraf. İlk fotoğraf kapakta görünür.</small>
        <div class="foto-onizleme" id="foto-liste"></div>
        <label class="btn" style="align-self:flex-start">Fotoğraf ekle<input type="file" accept="image/*" multiple id="foto-sec" class="gizli"></label>
      </div>
      <button class="btn btn-ana" type="submit" id="kaydet">${id ? "Değişiklikleri kaydet" : "İlanı onaya gönder"}</button>
      <div class="mesaj" role="status" id="ilan-mesaj"></div>
    </form>
  </div>`);

  const katGoster = () => { $("#ozellik-alani").hidden = i.kategori !== "sahiplendirme"; };
  katGoster();
  $$("[data-kat]").forEach(b => b.onclick = () => {
    i.kategori = b.dataset.kat; $$("[data-kat]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); katGoster();
  });
  const fotoCiz = () => {
    $("#foto-liste").innerHTML = fotolar.map((u, n) => `<div><img src="${esc(u)}" alt="${n + 1}. fotoğraf"><button type="button" data-sil="${n}" aria-label="${n + 1}. fotoğrafı kaldır">×</button></div>`).join("");
    $$("[data-sil]").forEach(b => b.onclick = () => { fotolar.splice(+b.dataset.sil, 1); fotoCiz(); });
  };
  fotoCiz();
  $("#foto-sec").onchange = async e => {
    const dosyalar = [...e.target.files].slice(0, MAKS_FOTO - fotolar.length);
    const m = $("#ilan-mesaj");
    if (!dosyalar.length) { mesaj(m, `En fazla ${MAKS_FOTO} fotoğraf ekleyebilirsin.`, true); return; }
    $("#kaydet").disabled = true; mesaj(m, "Fotoğraflar yükleniyor…");
    try {
      for (const d of dosyalar) {
        const blob = await fotoKucult(d);
        const yol = `${S.kullanici.id}/${crypto.randomUUID()}.jpg`;
        const { error } = await sb.storage.from("ilan-fotolari").upload(yol, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        fotolar.push(sb.storage.from("ilan-fotolari").getPublicUrl(yol).data.publicUrl);
        fotoCiz();
      }
      m.textContent = ""; m.className = "mesaj";
    } catch (err) { mesaj(m, hataMetni(err), true); }
    $("#kaydet").disabled = false; e.target.value = "";
  };
  $("#ilan-form").onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target), m = $("#ilan-mesaj");
    const kayit = {
      kategori: i.kategori, tur: fd.get("tur"), ad: fd.get("ad").trim(), irk: fd.get("irk").trim() || null,
      yas_grubu: fd.get("yas_grubu") || null, cinsiyet: fd.get("cinsiyet"), il: fd.get("il"), ilce: (fd.get("ilce") || "").trim() || null,
      aciklama: fd.get("aciklama").trim() || null, fotolar,
      telefon: fd.get("telefon").trim(), whatsapp: !!fd.get("whatsapp"),
    };
    if (fd.get("telefon").replace(/\D/g, "").length < 10) return mesaj(m, "Geçerli bir telefon numarası yaz (örn. 0532 123 45 67).", true);
    Object.keys(OZELLIK).forEach(k => { kayit[k] = i.kategori === "sahiplendirme" && !!fd.get(k); });
    if (!fotolar.length && !confirm("Fotoğraf eklemedin. Fotoğraflı ilanlar çok daha hızlı yuva buluyor. Yine de gönderilsin mi?")) return;
    $("#kaydet").disabled = true;
    const sonuc = id ? await sb.from("ilanlar").update(kayit).eq("id", id).select("id").single()
                     : await sb.from("ilanlar").insert(kayit).select("id").single();
    $("#kaydet").disabled = false;
    if (sonuc.error) return mesaj(m, hataMetni(sonuc.error), true);
    bildir(id ? "Değişiklikler kaydedildi." : "İlanın onaya gönderildi. Onaylanınca yayına girecek.");
    git(id && S.yonetici && i.sahip_id !== S.kullanici.id ? "/yonetim/ilanlar?durum=tumu" : "/hesabim");
  };
}

// ---------- hesabım ----------
async function hesabimSayfasi() {
  if (girisGerekli()) return;
  meta("Hesabım");
  const uid = S.kullanici.id;
  const [il, od] = await Promise.all([
    sb.from("ilanlar").select("*").eq("sahip_id", uid).order("created_at", { ascending: false }),
    sb.from("odemeler").select("*, ilanlar(ad), paketler(ad)").eq("sahip_id", uid).order("created_at", { ascending: false }),
  ]);
  if (il.error) throw il.error;
  const ilanlar = il.data;
  const ilanSatiri = x => {
    const acik = ["bekliyor", "yayinda"].includes(x.durum);
    return `<div class="satir">
      <div class="satir-foto">${x.fotolar && x.fotolar[0] ? `<img src="${esc(x.fotolar[0])}" alt="">` : ""}</div>
      <div class="satir-govde">
        <b><a href="/ilan/${x.id}">${esc(x.ad)}</a></b>
        <span class="bilgi">${esc(KAT[x.kategori])} · ${esc(TUR[x.tur])} · ${esc(x.il)} · ${tarih(x.created_at)}</span>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <span class="durum d-${x.durum}">${esc(ILAN_DURUM[x.durum])}</span>
          ${oneCikan(x) ? `<span class="durum" style="background:var(--vitrin-acik);color:var(--vitrin)">Öne çıkan · ${tarih(x.one_cikan_bitis)}'e kadar</span>` : ""}
          ${!x.telefon && ["bekliyor", "yayinda"].includes(x.durum) ? `<span class="durum d-reddedildi">Telefon eklenmemiş</span>` : ""}
        </div>
        ${x.durum === "reddedildi" && x.red_notu ? `<span class="bilgi">Not: ${esc(x.red_notu)}</span>` : ""}
      </div>
      <div class="satir-dugmeler">
        ${acik ? `<a class="btn btn-kucuk btn-vitrin" href="/one-cikar/${x.id}">${oneCikan(x) ? "Süreyi uzat" : "Öne çıkar"}</a>` : ""}
        ${x.durum !== "sahiplendi" && x.durum !== "kaldirildi" ? `<a class="btn btn-kucuk" href="/ilan-duzenle/${x.id}">Düzenle</a>` : ""}
        ${x.durum === "yayinda" ? `<button class="btn btn-kucuk" data-kapat="${x.id}" data-durum="sahiplendi">${x.kategori === "sahiplendirme" ? "Sahiplendi" : "Kavuştu"}</button>` : ""}
        ${acik || x.durum === "reddedildi" ? `<button class="btn btn-kucuk" data-kapat="${x.id}" data-durum="kaldirildi">Kaldır</button>` : ""}
      </div>
    </div>`;
  };

  sayfa(`<div class="kap dar">
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin-bottom:24px">
      <div><h1 style="font-size:36px;font-weight:900">Hesabım</h1><p class="bilgi">${esc(S.kullanici.email)}</p></div>
      <a class="btn btn-ana" href="/ilan-ver">Yeni ilan ver</a>
    </div>
    <section class="kutu" style="margin-bottom:24px"><h2 style="font-size:22px;margin-bottom:8px">İlanlarım</h2>
      ${ilanlar.length ? ilanlar.map(ilanSatiri).join("") : `<p class="bilgi">Henüz ilan vermedin.</p>`}
    </section>
    <div id="hesabim-ek"></div>
    ${(od.data || []).length ? `<section class="kutu"><h2 style="font-size:22px;margin-bottom:8px">Öne çıkarma ödemelerim</h2>
      ${od.data.map(o => { const [k, a] = reklamDurumu(o); return `<div class="satir"><div class="satir-govde"><b>${esc(o.paketler ? o.paketler.ad : o.paket_kod)}</b><span class="bilgi">${esc(o.ilanlar ? o.ilanlar.ad : "")} · ${tarih(o.created_at)} · ${tl(o.tutar)}</span>${o.onay_notu ? `<span class="bilgi">Not: ${esc(o.onay_notu)}</span>` : ""}</div><span class="durum d-${k}">${esc(a)}</span></div>`; }).join("")}
    </section>` : ""}
  </div>`);

  if (window.hesabimEk) await hesabimEk($("#hesabim-ek"));
  $$("[data-kapat]").forEach(b => b.onclick = async () => {
    const d = b.dataset.durum;
    if (!confirm(d === "sahiplendi" ? "Harika! İlan kapatılacak ve listeden kalkacak. Onaylıyor musun?" : "İlan kaldırılacak. Bu işlem geri alınamaz. Emin misin?")) return;
    const { error } = await sb.from("ilanlar").update({ durum: d }).eq("id", b.dataset.kapat);
    if (error) return bildir(hataMetni(error));
    bildir(d === "sahiplendi" ? "Tebrikler! İlan kapatıldı." : "İlan kaldırıldı."); hesabimSayfasi();
  });
}

// ---------- öne çıkarma (reklam) ve ödeme ----------
async function oneCikarSayfasi(id) {
  if (girisGerekli()) return;
  meta("İlanı öne çıkar");
  const [{ data: i }, { data: paketler }] = await Promise.all([
    sb.from("ilanlar").select("*").eq("id", id).maybeSingle(),
    sb.from("paketler").select("*").eq("aktif", true).order("sira"),
  ]);
  if (!i || i.sahip_id !== S.kullanici.id) { sayfa(`<div class="kap bos-durum"><h1>Bu ilan sana ait değil</h1><p><a href="/hesabim">Hesabıma dön</a></p></div>`); return; }
  if (!["bekliyor", "yayinda"].includes(i.durum)) { sayfa(`<div class="kap bos-durum"><h1>Kapanmış ilan öne çıkarılamaz</h1><p><a href="/hesabim">Hesabıma dön</a></p></div>`); return; }

  sayfa(`<div class="kap dar">
    <h1 style="font-size:clamp(30px,4vw,38px);font-weight:900;margin-bottom:8px">"${esc(i.ad)}" ilanını öne çıkar</h1>
    <p class="bilgi" style="margin-bottom:24px">Öne çıkan ilanlar ana sayfadaki vitrinde ve tüm listelerde en üstte gösterilir.
      Ödemeden sonra ekibimiz ilanını kontrol eder ve onaylar; süre onay anından başlar. Uygun bulunmazsa ücretin iade edilir.
      ${oneCikan(i) ? `Mevcut süren ${tarih(i.one_cikan_bitis)} tarihinde bitiyor; yeni paket bu sürenin üstüne eklenir.` : ""}</p>
    <div id="odeme-alani">
    ${!A.ODEME_AKTIF ? `<div class="kutu bos-durum"><h2>Online ödeme çok yakında</h2><p>Öne çıkarma paketleri kısa süre içinde satın alınabilecek.</p></div>` : `
    <form class="kutu form" id="odeme-form">
      <fieldset><legend>Paket seç</legend><div class="paketler">
        ${(paketler || []).map((p, n) => `<label class="paket"><input type="radio" name="paket" value="${esc(p.kod)}"${n === 0 ? " checked" : ""} required><b>${esc(p.ad)}</b><span class="fiyat">${tl(p.fiyat)}</span><span class="bilgi">${p.gun} gün boyunca en üstte</span></label>`).join("")}
      </div></fieldset>
      <p class="bilgi">Fatura ve ödeme için bilgilerin:</p>
      <div class="form-izgara">
        <label class="alan">Adın soyadın<input name="ad" required maxlength="80" autocomplete="name"></label>
        <label class="alan">Telefon<input name="telefon" type="tel" required minlength="10" maxlength="20" autocomplete="tel"></label>
      </div>
      <label class="alan">Adres<input name="adres" required maxlength="200" autocomplete="street-address"></label>
      <label class="onay" style="align-items:flex-start"><input type="checkbox" required style="margin-top:2px"> <span style="font-size:14px;color:var(--yazi2)"><a href="/kullanim-kosullari" target="_blank">Mesafeli satış ve kullanım koşullarını</a> okudum, kabul ediyorum.</span></label>
      <button class="btn btn-ana" type="submit">Ödemeye geç</button>
      <div class="mesaj" role="status"></div>
      <p class="bilgi">Ödeme PayTR güvenli ödeme sayfasında yapılır. Kart bilgilerin bize ulaşmaz.</p>
    </form>`}
    </div>
  </div>`);
  if (!A.ODEME_AKTIF) return;
  $("#odeme-form").onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(e.target), m = $(".mesaj", e.target), btn = $("button[type=submit]", e.target);
    btn.disabled = true; mesaj(m, "Güvenli ödeme sayfası hazırlanıyor…");
    const { data, error } = await sb.functions.invoke("odeme-baslat", { body: { tip: "one_cikar", ilan_id: i.id, paket: fd.get("paket"), ad: fd.get("ad"), telefon: fd.get("telefon"), adres: fd.get("adres") } });
    btn.disabled = false;
    if (error) return mesaj(m, await odemeHatasi(error), true);
    odemeCercevesi($("#odeme-alani"), data.token);
  };
}

// Ödeme fonksiyonunun hata mesajını okunur hale getirir.
async function odemeHatasi(error) {
  let metin = error.message;
  try { const j = await error.context.json(); if (j && j.hata) metin = j.hata; } catch (_) {}
  return metin;
}
// PayTR güvenli ödeme ekranını verilen alanda açar (öne çıkarma, sipariş ve bağış için ortak).
function odemeCercevesi(el, token) {
  el.innerHTML = `<iframe class="odeme-cerceve" src="https://www.paytr.com/odeme/guvenli/${encodeURIComponent(token)}" title="PayTR güvenli ödeme" allow="payment"></iframe>`;
  el.scrollIntoView({ block: "start" });
}

async function odemeSonucSayfasi(sonuc) {
  meta(sonuc === "basarili" ? "Ödeme alındı" : "Ödeme tamamlanamadı");
  // PayTR bu sayfayı iframe içinde açar; ana pencereye taşı.
  if (window.top !== window.self) { try { window.top.location.href = location.href; return; } catch (_) {} }
  const tip = new URLSearchParams(location.search).get("tip") || "one_cikar";
  if (sonuc === "basarili" && tip === "siparis" && window.sepetiBosalt) sepetiBosalt();
  const T = {
    one_cikar: ["Teşekkürler, ödemen alındı", "Ekibimiz ilanını kontrol edip onayladığında ilanın öne çıkacak. Durumunu Hesabım sayfasında görebilirsin.", "/hesabim", "Hesabıma git"],
    siparis: ["Teşekkürler, siparişin alındı", "Siparişin hazırlanınca kargo takip numarasını Hesabım sayfasında görebilirsin.", "/hesabim", "Siparişlerime git"],
    bagis: ["Bağışın için çok teşekkürler", "Bağışın sokaktaki dostlarımızın mamasına ve tedavisine gidecek. Adın ve mesajın onaylandıktan sonra son bağışlar listesinde görünür.", "/bagis", "Bağış sayfasına dön"],
  }[tip] || ["Teşekkürler, ödemen alındı", "", "/", "Ana sayfaya git"];
  sayfa(sonuc === "basarili"
    ? `<div class="kap bos-durum"><h1>${T[0]}</h1><p>${T[1]}</p><p><a class="btn btn-ana" href="${T[2]}">${T[3]}</a></p></div>`
    : `<div class="kap bos-durum"><h1>Ödeme tamamlanamadı</h1><p>Kartından para çekilmedi. Tekrar deneyebilirsin.</p><p><a class="btn" href="${tip === "siparis" ? "/sepet" : tip === "bagis" ? "/bagis" : "/hesabim"}">Geri dön</a></p></div>`);
}

// Yönetim paneli yonetim.js içindedir.

// ---------- bilgi sayfaları (Yönetim > Site içeriği > Sayfalar bölümünden düzenlenir) ----------
function metinSayfasi(ad) {
  const p = C.sayfalar[ad] || {};
  meta(p.baslik || "");
  sayfa(`<div class="kap dar metin"><h1 style="font-size:36px;font-weight:900;margin-bottom:16px">${esc(p.baslik || "")}</h1>${metinHtml(p.metin)}</div>`);
}

// ---------- başlat ----------
sb.auth.onAuthStateChange((olay) => {
  if (olay === "PASSWORD_RECOVERY") git("/giris#type=recovery", true);
});
// Mağaza ve bağış adresleri magaza.js ile eklenir; sayfa tamamen yüklenince başla.
// Site içeriği (icerik.js) ve oturum birlikte yüklenir.
const baslat = () => Promise.all([oturumYukle(), window.icerikYukle ? icerikYukle() : null]).then(yonlendir);
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", baslat);
else setTimeout(baslat, 0);
