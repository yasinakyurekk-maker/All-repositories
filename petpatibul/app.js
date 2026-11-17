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
  if (/basvurular_tekil|duplicate key/i.test(m)) return "Bu ilana zaten başvurdunuz.";
  if (/row-level security|permission/i.test(m)) return "Bu işlem için yetkiniz yok.";
  if (/Failed to fetch|NetworkError/i.test(m)) return "Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.";
  return "Bir sorun oldu: " + m;
}
function secenekler(obj, secili, bosEtiket) {
  return (bosEtiket !== undefined ? `<option value="">${esc(bosEtiket)}</option>` : "") +
    Object.entries(obj).map(([k, v]) => `<option value="${esc(k)}"${k === secili ? " selected" : ""}>${esc(v)}</option>`).join("");
}
function ilSecenekleri(secili, bosEtiket) {
  return (bosEtiket !== undefined ? `<option value="">${esc(bosEtiket)}</option>` : "") +
    ILLER.map(i => `<option${i === secili ? " selected" : ""}>${esc(i)}</option>`).join("");
}
function meta(baslik, aciklama) {
  document.title = baslik ? `${baslik} | ${SITE}` : `${SITE} | Ücretsiz kedi ve köpek sahiplendirme ilanları`;
  if (aciklama) $('meta[name="description"]').setAttribute("content", aciklama);
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
  [/^\/yonetim$/, yonetimSayfasi],
  [/^\/(hakkimizda|sss|kvkk|kullanim-kosullari)$/, metinSayfasi],
];
let yonlendirmeNo = 0;
async function yonlendir() {
  const no = ++yonlendirmeNo;
  const yol = location.pathname.replace(/\/+$/, "") || "/";
  $$(".ana-menu > a").forEach(a => a.removeAttribute("aria-current"));
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

// ---------- ana sayfa ----------
async function anaSayfa() {
  meta("", "Türkiye'nin ücretsiz evcil hayvan sahiplendirme platformu. İline göre kedi, köpek ve kuş sahiplendirme ilanlarını incele, kayıp hayvan ilanı ver.");
  sayfa(`
  <section class="kahraman"><div class="kap kahraman-in">
    <div class="kahraman-yazi">
      <span class="rozet">Satış yok, yalnızca ücretsiz sahiplendirme</span>
      <h1>Bir dost sahiplen,<br>bir hayat değiştir.</h1>
      <p>Yuva arayan kedi, köpek ve diğer dostlarımızı bulunduğun ile göre keşfet. Tüm ilanlar yayına girmeden önce kontrol edilir.</p>
      <form class="arama" id="arama">
        <label><span>Ne arıyorsun?</span><select name="tur">${secenekler(TUR, "", "Tümü")}</select></label>
        <label><span>Hangi il?</span><select name="il">${ilSecenekleri("", "Tüm Türkiye")}</select></label>
        <button class="btn btn-ana" type="submit">${ikon.ara} Ara</button>
      </form>
    </div>
    <div class="kahraman-gorsel" aria-hidden="true"><div></div><div></div><div></div><div></div></div>
  </div></section>

  <section class="kap bolum">
    <div class="bolum-bas"><h2>Kimi arıyorsun?</h2></div>
    <div class="kategoriler">
      ${[["kedi", "Kedi sahiplen", "Yavru ve yetişkin kediler"], ["kopek", "Köpek sahiplen", "Her boyda köpek dostlar"], ["kus", "Kuş sahiplen", "Muhabbet kuşu, kanarya ve diğerleri"], ["diger", "Diğer dostlar", "Tavşan, hamster, kaplumbağa"]]
        .map(([t, a, d]) => `<a class="kategori" href="/${t}-sahiplendirme"><span class="ikon">${ikon.pati}</span><b>${a}</b><span>${d}</span></a>`).join("")}
      <a class="kategori" href="/kayip-ilanlari"><span class="ikon">${ikon.ara}</span><b>Kayıp ve bulunan</b><span>Kaybolan dostlar için ilanlar</span></a>
    </div>
  </section>

  <section class="kap bolum" id="vitrin-bolum" hidden>
    <div class="bolum-bas"><div><h2>Öne çıkan ilanlar</h2><p>Bu ilanlar sahipleri tarafından öne çıkarıldı.</p></div></div>
    <div id="vitrin"></div>
  </section>

  <section class="kap bolum">
    <div class="bolum-bas"><div><h2>Yuvasını bekleyenler</h2><p>En uzun süredir bekleyenler önce gösterilir, böylece her dost görünür olur.</p></div><a href="/sahiplendirme">Tüm ilanları gör</a></div>
    <div id="bekleyenler"><p class="bilgi">Yükleniyor…</p></div>
  </section>

  <section class="kap bolum">
    <div class="bolum-bas"><h2>Sahiplenme nasıl işler?</h2></div>
    <div class="adimlar">
      <div class="adim"><span class="no">1</span><b>Keşfet</b><span>Türe, ile, yaşa ve karaktere göre filtreleyerek sana uygun dostu bul.</span></div>
      <div class="adim"><span class="no">2</span><b>Başvur</b><span>Kısa bir form doldur. Evin ve yaşam düzenin hakkında birkaç soru sorarız.</span></div>
      <div class="adim"><span class="no">3</span><b>Tanış</b><span>İlan sahibi başvurunu inceler ve seninle iletişime geçer. Önce tanışın.</span></div>
      <div class="adim"><span class="no">4</span><b>Yuvaya kavuş</b><span>Sahiplendikten sonra bakım rehberlerimizle yanındayız.</span></div>
    </div>
  </section>

  <section class="kap bolum"><div class="bant bant-kayip">
    <div><span class="ust-yazi">KAYIP VE BULUNAN</span><h2>Dostunu mu kaybettin, sahipsiz birini mi buldun?</h2><p>Fotoğraf ve son görüldüğü yerle ücretsiz ilan ver.</p></div>
    <div class="dugmeler"><a class="btn btn-turuncu" href="/ilan-ver?kategori=kayip">Kayıp ilanı ver</a><a class="btn" href="/ilan-ver?kategori=bulunan">Bulduğum hayvanı bildir</a></div>
  </div></section>

  <section class="kap bolum">
    <div class="bolum-bas"><h2>Neden güvenli?</h2></div>
    <div class="guven">
      <div><span class="tik">${ikon.tik}</span><p style="margin:0"><b>Her ilan kontrol edilir</b><span>İlanlar ekibimiz onaylamadan yayına girmez.</span></p></div>
      <div><span class="tik">${ikon.tik}</span><p style="margin:0"><b>Telefonun gizli kalır</b><span>İletişim bilgin yalnızca başvurduğun ilanın sahibine iletilir.</span></p></div>
      <div><span class="tik">${ikon.tik}</span><p style="margin:0"><b>Satış ve ücret yok</b><span>Para istenen ilanlar kaldırılır. Tek tıkla şikayet edebilirsin.</span></p></div>
    </div>
  </section>`);

  $("#arama").onsubmit = e => {
    e.preventDefault(); const f = new FormData(e.target);
    git(listeYolu({ tur: f.get("tur"), il: f.get("il") }));
  };

  const [v, b] = await Promise.all([
    sb.from("yayindaki_ilanlar").select("*").eq("kategori", "sahiplendirme").eq("one_cikan", true).order("one_cikan_bitis", { ascending: false }).limit(8),
    sb.from("yayindaki_ilanlar").select("*").eq("kategori", "sahiplendirme").eq("one_cikan", false).order("yayin_tarihi", { ascending: true }).limit(8),
  ]);
  if (v.data && v.data.length) { $("#vitrin-bolum").hidden = false; $("#vitrin").innerHTML = izgara(v.data); }
  if (b.error) throw b.error;
  $("#bekleyenler").innerHTML = b.data.length ? izgara(b.data) : `<div class="kutu bos-durum"><h2>Henüz ilan yok</h2><p>İlk ilanı sen ver.</p><p><a class="btn btn-ana" href="/ilan-ver">Ücretsiz ilan ver</a></p></div>`;
}

// ---------- ilan listesi ----------
async function listeSayfasi({ kategori, tur, ilSlug }) {
  const il = ilSlug ? ilBul(ilSlug) : "";
  if (ilSlug && !il) { meta("Sayfa bulunamadı"); sayfa(`<div class="kap bos-durum"><h1>Böyle bir il bulamadık</h1><p><a href="${listeYolu({ kategori, tur })}">Tüm Türkiye'deki ilanlara bak</a></p></div>`); return; }
  $$(".ana-menu > a").forEach(a => { if ((kategori === "sahiplendirme" && a.getAttribute("href") === "/sahiplendirme") || (kategori !== "sahiplendirme" && a.getAttribute("href") === "/kayip-ilanlari")) a.setAttribute("aria-current", "page"); });
  const q = new URLSearchParams(location.search);
  const f = { yas: q.get("yas") || "", cinsiyet: q.get("cinsiyet") || "", sira: q.get("sira") || "bekleyen", sayfa: Math.max(1, parseInt(q.get("sayfa") || "1", 10) || 1) };
  const secOz = Object.keys(OZELLIK).filter(k => q.get(k) === "1");

  const yer = il || "Türkiye";
  let baslik, aciklama;
  if (kategori === "sahiplendirme") {
    baslik = tur ? `${il ? il + " " : ""}${TUR[tur].toLocaleLowerCase("tr")} sahiplendirme ilanları` : `${il ? il + " " : ""}ücretsiz hayvan sahiplendirme ilanları`;
    aciklama = `${yer} genelinde ücretsiz ${tur ? TUR[tur].toLocaleLowerCase("tr") : "kedi ve köpek"} sahiplendirme ilanları. Yaş, cinsiyet ve sağlık durumuna göre filtrele, hemen başvur.`;
  } else {
    baslik = `${il ? il + " " : ""}${kategori === "kayip" ? "kayıp hayvan" : "bulunan hayvan"} ilanları`;
    aciklama = `${yer} genelinde ${kategori === "kayip" ? "kayıp" : "bulunan"} kedi ve köpek ilanları. Bilgin varsa ilan sahibine ulaş.`;
  }
  baslik = baslik.charAt(0).toLocaleUpperCase("tr") + baslik.slice(1);
  meta(baslik, aciklama);

  const yolSorgu = (deg) => {
    const o = { yas: f.yas, cinsiyet: f.cinsiyet, sira: f.sira === "bekleyen" ? "" : f.sira };
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

  $("#il-sec").onchange = e => git(kendi({ sayfa: "" }, { il: e.target.value }));
  $("#sira").onchange = e => git(kendi({ sira: e.target.value === "bekleyen" ? "" : e.target.value, sayfa: "" }));
  $$("[data-oz]").forEach(c => c.onchange = () => {
    const o = {}; $$("[data-oz]").forEach(x => { o[x.dataset.oz] = x.checked ? "1" : ""; });
    git(kendi(Object.assign(o, { sayfa: "" })));
  });

  // Reklam verenler (öne çıkanlar) her zaman önce gelir.
  let s = sb.from("yayindaki_ilanlar").select("*", { count: "exact" }).eq("kategori", kategori);
  if (tur) s = s.eq("tur", tur);
  if (il) s = s.eq("il", il);
  if (f.yas && YAS[f.yas]) s = s.eq("yas_grubu", f.yas);
  if (f.cinsiyet && CINS[f.cinsiyet]) s = s.eq("cinsiyet", f.cinsiyet);
  secOz.forEach(k => { s = s.eq(k, true); });
  s = s.order("one_cikan", { ascending: false }).order("yayin_tarihi", { ascending: f.sira !== "yeni" });
  const bas = (f.sayfa - 1) * SAYFA_BOYU;
  const { data, count, error } = await s.range(bas, bas + SAYFA_BOYU - 1);
  if (error) throw error;

  $("#sayac").textContent = `${yer} · ${count || 0} ilan`;
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

async function basvuruAlani(i, benim, yayinda) {
  const k = $("#basvuru-alani");
  const sahiplendirme = i.kategori === "sahiplendirme";
  if (benim) {
    const vitrin = oneCikan(i);
    k.innerHTML = `<div class="kutu form">
      <h2 style="font-size:22px">Bu senin ilanın</h2>
      <p class="bilgi">Gelen başvuruları Hesabım sayfasından görebilirsin.</p>
      <a class="btn btn-ana" href="/hesabim">Başvuruları gör</a>
      ${["bekliyor", "yayinda"].includes(i.durum) ? (vitrin
        ? `<p class="bilgi">Öne çıkarma ${tarih(i.one_cikan_bitis)} tarihine kadar sürüyor.</p><a class="btn btn-vitrin" href="/one-cikar/${i.id}">Süreyi uzat</a>`
        : `<a class="btn btn-vitrin" href="/one-cikar/${i.id}">İlanı öne çıkar</a>`) : ""}
    </div>`;
    return;
  }
  if (!yayinda) { k.innerHTML = ""; return; }
  const baslik = sahiplendirme ? "Bu dostu sahiplenmek ister misin?" : i.kategori === "kayip" ? "Bu dostu gördün mü?" : "Bu dost senin mi?";
  if (!S.kullanici) {
    k.innerHTML = `<div class="kutu form"><h2 style="font-size:22px">${baslik}</h2>
      <p class="bilgi">${sahiplendirme ? "Başvuru yapmak" : "İlan sahibine ulaşmak"} için ücretsiz üye ol ya da giriş yap.</p>
      <a class="btn btn-ana" href="/giris?devam=${encodeURIComponent(location.pathname)}">Giriş yap / Üye ol</a></div>`;
    return;
  }
  const { data: onceki } = await sb.from("basvurular").select("durum, created_at").eq("ilan_id", i.id).eq("gonderen_id", S.kullanici.id).maybeSingle();
  if (onceki) {
    k.innerHTML = `<div class="kutu form"><h2 style="font-size:22px">${sahiplendirme ? "Başvurun gönderildi" : "Mesajın iletildi"}</h2>
      <p class="bilgi">${tarih(onceki.created_at)} tarihinde gönderdin. Durum: <b>${esc(BASVURU_DURUM[onceki.durum])}</b></p>
      <p class="bilgi">İlan sahibi seninle telefonla iletişime geçecek.</p></div>`;
    return;
  }
  k.innerHTML = `<form class="kutu form" id="basvuru">
    <h2 style="font-size:22px">${baslik}</h2>
    <p class="bilgi">${sahiplendirme ? "Başvurun" : "Mesajın"} yalnızca ilan sahibine iletilir. Telefon numaranı başka kimse görmez.</p>
    <label class="alan">Adın soyadın<input name="ad" required maxlength="80" autocomplete="name"></label>
    <label class="alan">Telefon<input name="telefon" type="tel" required minlength="10" maxlength="20" autocomplete="tel" placeholder="05xx xxx xx xx"></label>
    ${sahiplendirme ? `
    <label class="alan">Yaşadığın il<select name="il" required>${ilSecenekleri(i.il, "Seç")}</select></label>
    <label class="alan">Evin nasıl?<select name="ev_tipi" required><option value="">Seç</option><option>Apartman dairesi</option><option>Bahçeli ev</option><option>Müstakil ev</option><option>Diğer</option></select></label>
    <label class="onay"><input type="checkbox" name="baska_hayvan"> Evde başka evcil hayvan var</label>
    <label class="onay"><input type="checkbox" name="cocuk"> Evde küçük çocuk var</label>
    <label class="alan">Neden sahiplenmek istiyorsun?<textarea name="mesaj" required maxlength="2000"></textarea></label>`
    : `<label class="alan">${i.kategori === "kayip" ? "Nerede ve ne zaman gördün?" : "Bu dostun sana ait olduğunu nasıl anlatırsın?"}<textarea name="mesaj" required maxlength="2000"></textarea></label>`}
    <label class="onay" style="align-items:flex-start"><input type="checkbox" required style="margin-top:2px"> <span style="font-size:14px;color:var(--yazi2)"><a href="/kvkk" target="_blank">KVKK aydınlatma metnini</a> okudum, bilgilerimin ilan sahibiyle paylaşılmasını onaylıyorum.</span></label>
    <button class="btn btn-ana" type="submit">${sahiplendirme ? "Başvuruyu gönder" : "Mesajı gönder"}</button>
    <div class="mesaj" role="status"></div>
    ${sahiplendirme ? `<p class="uyari">Sahiplendirme ücretsizdir. Senden para isteyen olursa lütfen ilanı şikayet et.</p>` : ""}
  </form>`;
  $("#basvuru").onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(e.target), m = $(".mesaj", e.target), btn = $("button[type=submit]", e.target);
    btn.disabled = true;
    const { error } = await sb.from("basvurular").insert({
      ilan_id: i.id, ad: fd.get("ad").trim(), telefon: fd.get("telefon").trim(), il: fd.get("il") || null, ev_tipi: fd.get("ev_tipi") || null,
      baska_hayvan: !!fd.get("baska_hayvan"), cocuk: !!fd.get("cocuk"), mesaj: fd.get("mesaj").trim(),
    });
    btn.disabled = false;
    if (error) return mesaj(m, hataMetni(error), true);
    await basvuruAlani(i, false, true);
    bildir(sahiplendirme ? "Başvurun ilan sahibine iletildi." : "Mesajın ilan sahibine iletildi.");
  };
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
    <p class="bilgi" style="margin-bottom:20px">İlan vermek ve başvuru yapmak ücretsizdir.</p>
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
      yas_grubu: fd.get("yas_grubu") || null, cinsiyet: fd.get("cinsiyet"), il: fd.get("il"), ilce: fd.get("ilce").trim() || null,
      aciklama: fd.get("aciklama").trim() || null, fotolar,
    };
    Object.keys(OZELLIK).forEach(k => { kayit[k] = i.kategori === "sahiplendirme" && !!fd.get(k); });
    if (!fotolar.length && !confirm("Fotoğraf eklemedin. Fotoğraflı ilanlar çok daha hızlı yuva buluyor. Yine de gönderilsin mi?")) return;
    $("#kaydet").disabled = true;
    const sonuc = id ? await sb.from("ilanlar").update(kayit).eq("id", id).select("id").single()
                     : await sb.from("ilanlar").insert(kayit).select("id").single();
    $("#kaydet").disabled = false;
    if (sonuc.error) return mesaj(m, hataMetni(sonuc.error), true);
    bildir(id ? "Değişiklikler kaydedildi." : "İlanın onaya gönderildi. Onaylanınca yayına girecek.");
    git("/hesabim");
  };
}

// ---------- hesabım ----------
async function hesabimSayfasi() {
  if (girisGerekli()) return;
  meta("Hesabım");
  const uid = S.kullanici.id;
  const [il, gon, od] = await Promise.all([
    sb.from("ilanlar").select("*").eq("sahip_id", uid).order("created_at", { ascending: false }),
    sb.from("basvurular").select("*, ilanlar(id, ad, il, tur)").eq("gonderen_id", uid).order("created_at", { ascending: false }),
    sb.from("odemeler").select("*, ilanlar(ad), paketler(ad)").eq("sahip_id", uid).order("created_at", { ascending: false }),
  ]);
  if (il.error) throw il.error;
  const ilanlar = il.data;
  let gelen = [];
  if (ilanlar.length) {
    const r = await sb.from("basvurular").select("*").in("ilan_id", ilanlar.map(x => x.id)).order("created_at", { ascending: false });
    gelen = r.data || [];
  }
  const ilanSatiri = x => {
    const b = gelen.filter(g => g.ilan_id === x.id);
    const yeni = b.filter(g => g.durum === "yeni").length;
    const acik = ["bekliyor", "yayinda"].includes(x.durum);
    return `<div class="satir">
      <div class="satir-foto">${x.fotolar && x.fotolar[0] ? `<img src="${esc(x.fotolar[0])}" alt="">` : ""}</div>
      <div class="satir-govde">
        <b><a href="/ilan/${x.id}">${esc(x.ad)}</a></b>
        <span class="bilgi">${esc(KAT[x.kategori])} · ${esc(TUR[x.tur])} · ${esc(x.il)} · ${tarih(x.created_at)}</span>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <span class="durum d-${x.durum}">${esc(ILAN_DURUM[x.durum])}</span>
          ${oneCikan(x) ? `<span class="durum" style="background:var(--vitrin-acik);color:var(--vitrin)">Öne çıkan · ${tarih(x.one_cikan_bitis)}'e kadar</span>` : ""}
          ${yeni ? `<span class="durum d-yeni">${yeni} yeni başvuru</span>` : ""}
        </div>
        ${x.durum === "reddedildi" && x.red_notu ? `<span class="bilgi">Not: ${esc(x.red_notu)}</span>` : ""}
      </div>
      <div class="satir-dugmeler">
        ${acik ? `<a class="btn btn-kucuk btn-vitrin" href="/one-cikar/${x.id}">${oneCikan(x) ? "Süreyi uzat" : "Öne çıkar"}</a>` : ""}
        ${x.durum !== "sahiplendi" && x.durum !== "kaldirildi" ? `<a class="btn btn-kucuk" href="/ilan-duzenle/${x.id}">Düzenle</a>` : ""}
        ${x.durum === "yayinda" ? `<button class="btn btn-kucuk" data-kapat="${x.id}" data-durum="sahiplendi">${x.kategori === "sahiplendirme" ? "Sahiplendi" : "Kavuştu"}</button>` : ""}
        ${acik || x.durum === "reddedildi" ? `<button class="btn btn-kucuk" data-kapat="${x.id}" data-durum="kaldirildi">Kaldır</button>` : ""}
      </div>
      ${b.length ? `<details style="flex-basis:100%"><summary style="cursor:pointer;font-weight:600;min-height:32px">Başvurular (${b.length})</summary>
        <div style="display:grid;gap:10px;margin-top:10px">${b.map(g => `<div class="basvuru">
          <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>${esc(g.ad)}</b><span class="durum d-${g.durum}">${esc(BASVURU_DURUM[g.durum])}</span></div>
          <span>Telefon: <a href="tel:${esc(g.telefon.replace(/[^\d+]/g, ""))}">${esc(g.telefon)}</a>${g.il ? " · " + esc(g.il) : ""}${g.ev_tipi ? " · " + esc(g.ev_tipi) : ""}${g.baska_hayvan ? " · Evde başka hayvan var" : ""}${g.cocuk ? " · Evde çocuk var" : ""}</span>
          <span style="white-space:pre-line">${esc(g.mesaj || "")}</span>
          <span class="bilgi">${tarih(g.created_at)}</span>
          ${g.durum === "yeni" ? `<div class="satir-dugmeler"><button class="btn btn-kucuk btn-ana" data-basvuru="${g.id}" data-karar="kabul">Kabul et</button><button class="btn btn-kucuk" data-basvuru="${g.id}" data-karar="red">Reddet</button></div>` : ""}
        </div>`).join("")}</div></details>` : ""}
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
    <section class="kutu" style="margin-bottom:24px"><h2 style="font-size:22px;margin-bottom:8px">Gönderdiğim başvurular</h2>
      ${(gon.data || []).length ? gon.data.map(g => `<div class="satir"><div class="satir-govde"><b>${g.ilanlar ? `<a href="/ilan/${g.ilanlar.id}">${esc(g.ilanlar.ad)}</a>` : "Kaldırılmış ilan"}</b><span class="bilgi">${tarih(g.created_at)}</span></div><span class="durum d-${g.durum}">${esc(BASVURU_DURUM[g.durum])}</span></div>`).join("") : `<p class="bilgi">Henüz başvuru yapmadın.</p>`}
    </section>
    ${(od.data || []).length ? `<section class="kutu"><h2 style="font-size:22px;margin-bottom:8px">Ödemelerim</h2>
      ${od.data.map(o => `<div class="satir"><div class="satir-govde"><b>${esc(o.paketler ? o.paketler.ad : o.paket_kod)}</b><span class="bilgi">${esc(o.ilanlar ? o.ilanlar.ad : "")} · ${tarih(o.created_at)} · ${tl(o.tutar)}</span></div><span class="durum d-${o.durum}">${esc(ODEME_DURUM[o.durum])}</span></div>`).join("")}
    </section>` : ""}
  </div>`);

  $$("[data-kapat]").forEach(b => b.onclick = async () => {
    const d = b.dataset.durum;
    if (!confirm(d === "sahiplendi" ? "Harika! İlan kapatılacak ve listeden kalkacak. Onaylıyor musun?" : "İlan kaldırılacak. Bu işlem geri alınamaz. Emin misin?")) return;
    const { error } = await sb.from("ilanlar").update({ durum: d }).eq("id", b.dataset.kapat);
    if (error) return bildir(hataMetni(error));
    bildir(d === "sahiplendi" ? "Tebrikler! İlan kapatıldı." : "İlan kaldırıldı."); hesabimSayfasi();
  });
  $$("[data-basvuru]").forEach(b => b.onclick = async () => {
    const { error } = await sb.from("basvurular").update({ durum: b.dataset.karar }).eq("id", b.dataset.basvuru);
    if (error) return bildir(hataMetni(error));
    bildir(b.dataset.karar === "kabul" ? "Başvuru kabul edildi. Başvuranı telefonla arayabilirsin." : "Başvuru reddedildi."); hesabimSayfasi();
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
      ${oneCikan(i) ? `Mevcut süren ${tarih(i.one_cikan_bitis)} tarihinde bitiyor; yeni paket bu sürenin üstüne eklenir.` : ""}
      ${i.durum === "bekliyor" ? "İlanın onaylandığında öne çıkmış olarak yayına girer." : ""}</p>
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
    const { data, error } = await sb.functions.invoke("odeme-baslat", { body: { ilan_id: i.id, paket: fd.get("paket"), ad: fd.get("ad"), telefon: fd.get("telefon"), adres: fd.get("adres") } });
    btn.disabled = false;
    if (error) {
      let metin = error.message;
      try { const j = await error.context.json(); if (j && j.hata) metin = j.hata; } catch (_) {}
      return mesaj(m, metin, true);
    }
    $("#odeme-alani").innerHTML = `<iframe class="odeme-cerceve" src="https://www.paytr.com/odeme/guvenli/${encodeURIComponent(data.token)}" title="PayTR güvenli ödeme" allow="payment"></iframe>`;
  };
}

async function odemeSonucSayfasi(sonuc) {
  meta(sonuc === "basarili" ? "Ödeme alındı" : "Ödeme tamamlanamadı");
  // PayTR bu sayfayı iframe içinde açar; ana pencereye taşı.
  if (window.top !== window.self) { try { window.top.location.href = location.href; return; } catch (_) {} }
  sayfa(sonuc === "basarili"
    ? `<div class="kap bos-durum"><h1>Teşekkürler, ödemen alındı</h1><p>İlanın birkaç dakika içinde öne çıkmış olarak görünecek.</p><p><a class="btn btn-ana" href="/hesabim">Hesabıma git</a></p></div>`
    : `<div class="kap bos-durum"><h1>Ödeme tamamlanamadı</h1><p>Kartından para çekilmedi. Tekrar deneyebilirsin.</p><p><a class="btn" href="/hesabim">Hesabıma dön</a></p></div>`);
}

// ---------- yönetim ----------
async function yonetimSayfasi() {
  if (girisGerekli()) return;
  if (!S.yonetici) { sayfa(`<div class="kap bos-durum"><h1>Bu sayfa yalnızca yöneticiler içindir</h1></div>`); return; }
  meta("Yönetim");
  const [bek, sik, pak, od] = await Promise.all([
    sb.from("ilanlar").select("*").eq("durum", "bekliyor").order("created_at", { ascending: true }),
    sb.from("sikayetler").select("*, ilanlar(id, ad, durum)").eq("cozuldu", false).order("created_at", { ascending: true }),
    sb.from("paketler").select("*").order("sira"),
    sb.from("odemeler").select("*, ilanlar(ad)").order("created_at", { ascending: false }).limit(20),
  ]);
  if (bek.error) throw bek.error;
  sayfa(`<div class="kap dar">
    <h1 style="font-size:36px;font-weight:900;margin-bottom:24px">Yönetim</h1>
    <section class="kutu" style="margin-bottom:24px"><h2 style="font-size:22px;margin-bottom:8px">Onay bekleyen ilanlar (${bek.data.length})</h2>
      ${bek.data.length ? bek.data.map(x => `<div class="satir">
        <div class="satir-foto">${x.fotolar && x.fotolar[0] ? `<img src="${esc(x.fotolar[0])}" alt="">` : ""}</div>
        <div class="satir-govde"><b><a href="/ilan/${x.id}" target="_blank">${esc(x.ad)}</a></b>
          <span class="bilgi">${esc(KAT[x.kategori])} · ${esc(TUR[x.tur])} · ${esc(x.il)} · ${x.fotolar.length} fotoğraf · ${tarih(x.created_at)}</span>
          <span class="bilgi" style="white-space:pre-line">${esc((x.aciklama || "").slice(0, 300))}</span></div>
        <div class="satir-dugmeler"><button class="btn btn-kucuk btn-ana" data-onay="${x.id}">Yayınla</button><button class="btn btn-kucuk" data-red="${x.id}">Reddet</button></div>
      </div>`).join("") : `<p class="bilgi">Bekleyen ilan yok.</p>`}
    </section>
    <section class="kutu" style="margin-bottom:24px"><h2 style="font-size:22px;margin-bottom:8px">Şikayetler (${(sik.data || []).length})</h2>
      ${(sik.data || []).length ? sik.data.map(s => `<div class="satir"><div class="satir-govde">
          <b>${s.ilanlar ? `<a href="/ilan/${s.ilanlar.id}" target="_blank">${esc(s.ilanlar.ad)}</a> <span class="durum d-${s.ilanlar.durum}">${esc(ILAN_DURUM[s.ilanlar.durum])}</span>` : "Silinmiş ilan"}</b>
          <span>${esc(s.neden)}</span>${s.aciklama ? `<span class="bilgi">${esc(s.aciklama)}</span>` : ""}<span class="bilgi">${tarih(s.created_at)}</span></div>
        <div class="satir-dugmeler">${s.ilanlar && s.ilanlar.durum === "yayinda" ? `<button class="btn btn-kucuk" data-kaldir="${s.ilanlar.id}" data-sikayet="${s.id}">İlanı kaldır</button>` : ""}<button class="btn btn-kucuk" data-coz="${s.id}">Çözüldü</button></div>
      </div>`).join("") : `<p class="bilgi">Açık şikayet yok.</p>`}
    </section>
    <section class="kutu" style="margin-bottom:24px"><h2 style="font-size:22px;margin-bottom:8px">Öne çıkarma paketleri</h2>
      ${(pak.data || []).map(p => `<form class="satir" data-paket="${esc(p.kod)}">
        <div class="satir-govde"><b>${esc(p.ad)}</b><span class="bilgi">${p.gun} gün</span></div>
        <label class="alan" style="flex-direction:row;align-items:center;gap:8px">Fiyat (TL)<input name="fiyat" type="number" min="1" step="0.01" value="${esc(p.fiyat)}" style="width:120px"></label>
        <label class="onay"><input type="checkbox" name="aktif"${p.aktif ? " checked" : ""}> Satışta</label>
        <button class="btn btn-kucuk" type="submit">Kaydet</button>
      </form>`).join("")}
    </section>
    <section class="kutu"><h2 style="font-size:22px;margin-bottom:8px">Son ödemeler</h2>
      ${(od.data || []).length ? od.data.map(o => `<div class="satir"><div class="satir-govde"><b>${esc(o.ilanlar ? o.ilanlar.ad : "")}</b><span class="bilgi">${esc(o.paket_kod)} · ${tl(o.tutar)} · ${tarih(o.created_at)} · ${esc(o.siparis_no)}</span></div><span class="durum d-${o.durum}">${esc(ODEME_DURUM[o.durum])}</span></div>`).join("") : `<p class="bilgi">Henüz ödeme yok.</p>`}
    </section>
  </div>`);
  const guncelle = async (tablo, deg, id, metin) => {
    const { error } = await sb.from(tablo).update(deg).eq(tablo === "paketler" ? "kod" : "id", id);
    if (error) { bildir(hataMetni(error)); return false; }
    bildir(metin); return true;
  };
  $$("[data-onay]").forEach(b => b.onclick = async () => { if (await guncelle("ilanlar", { durum: "yayinda", red_notu: null }, b.dataset.onay, "İlan yayına alındı.")) yonetimSayfasi(); });
  $$("[data-red]").forEach(b => b.onclick = async () => {
    const not = prompt("Ret nedeni (ilan sahibi görecek):"); if (not === null) return;
    if (await guncelle("ilanlar", { durum: "reddedildi", red_notu: not || null }, b.dataset.red, "İlan reddedildi.")) yonetimSayfasi();
  });
  $$("[data-kaldir]").forEach(b => b.onclick = async () => {
    if (!confirm("İlan yayından kaldırılsın mı?")) return;
    if (await guncelle("ilanlar", { durum: "kaldirildi" }, b.dataset.kaldir, "İlan kaldırıldı.") && await guncelle("sikayetler", { cozuldu: true }, b.dataset.sikayet, "İlan kaldırıldı.")) yonetimSayfasi();
  });
  $$("[data-coz]").forEach(b => b.onclick = async () => { if (await guncelle("sikayetler", { cozuldu: true }, b.dataset.coz, "Şikayet kapatıldı.")) yonetimSayfasi(); });
  $$("[data-paket]").forEach(f => f.onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(f);
    await guncelle("paketler", { fiyat: Number(fd.get("fiyat")), aktif: !!fd.get("aktif") }, f.dataset.paket, "Paket güncellendi.");
  });
}

// ---------- bilgi sayfaları ----------
function metinSayfasi(ad) {
  const M = {
    hakkimizda: ["Hakkımızda", `<p>petpatibul.com, sahipsiz ve yuva arayan hayvanları onları sevecek ailelerle buluşturmak için kurulmuş ücretsiz bir sahiplendirme platformudur.</p>
      <p>Sitemizde hayvan satışına izin verilmez. İlan vermek ve başvuru yapmak ücretsizdir. İlan sahipleri isterlerse ilanlarını ücretli olarak öne çıkarabilir; bu gelir sitenin işletilmesi için kullanılır.</p>`],
    sss: ["Sıkça sorulan sorular", `<h2>Sahiplenme nasıl işler?</h2><p>Beğendiğin ilanda başvuru formunu doldurursun. Başvurun yalnızca ilan sahibine iletilir. İlan sahibi seni telefonla arar, tanışırsınız ve sahiplendirmeye birlikte karar verirsiniz.</p>
      <h2>Sahiplenmek ücretli mi?</h2><p>Hayır. Sitemizdeki tüm sahiplendirmeler ücretsizdir. Senden para isteyen bir ilan görürsen lütfen şikayet et.</p>
      <h2>İlan vermek ücretli mi?</h2><p>Hayır, ilan vermek ücretsizdir. İlanını daha çok kişiye göstermek istersen ücretli öne çıkarma paketlerinden birini seçebilirsin.</p>
      <h2>Öne çıkarma nedir?</h2><p>Öne çıkarılan ilanlar seçilen süre boyunca ana sayfadaki vitrinde ve tüm listelerin en üstünde gösterilir.</p>
      <h2>İlanım neden hemen yayına girmedi?</h2><p>Sahte ve satış ilanlarını engellemek için her ilan ekibimiz tarafından kontrol edilir. Bu genellikle kısa sürer.</p>
      <h2>Kayıp hayvanımı nasıl ilan ederim?</h2><p>"Ücretsiz ilan ver" sayfasında "Kaybettim" seçeneğini seç, fotoğraf ve kaybolduğu yeri ekle.</p>`],
    kvkk: ["KVKK aydınlatma metni", `<p class="uyari">[Bu sayfaya bir hukukçu tarafından hazırlanmış KVKK aydınlatma metni eklenecek: hangi kişisel verilerin (e-posta, telefon, ad soyad, başvuru bilgileri) hangi amaçla işlendiği, kimlerle paylaşıldığı ve kullanıcının hakları.]</p>`],
    "kullanim-kosullari": ["Kullanım koşulları", `<p class="uyari">[Bu sayfaya kullanım koşulları ve öne çıkarma paketleri için mesafeli satış sözleşmesi eklenecek. Temel kurallar: hayvan satışı ve ücret talebi yasaktır, ilanlar onaydan geçer, kurallara uymayan ilanlar kaldırılır.]</p>`],
  };
  const [baslik, govde] = M[ad];
  meta(baslik);
  sayfa(`<div class="kap dar metin"><h1 style="font-size:36px;font-weight:900;margin-bottom:16px">${baslik}</h1>${govde}</div>`);
}

// ---------- başlat ----------
sb.auth.onAuthStateChange((olay) => {
  if (olay === "PASSWORD_RECOVERY") git("/giris#type=recovery", true);
});
oturumYukle().then(yonlendir);
