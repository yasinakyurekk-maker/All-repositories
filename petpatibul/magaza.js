// petpatibul.com — mama ve ekipman mağazası, sokak hayvanları için bağış ve bunların yönetim ekranları.
// app.js'ten sonra yüklenir; onun yardımcılarını (sb, S, $, esc, tl, git, sayfa, meta, ...) kullanır.
"use strict";

const URUN_KAT = { mama: "Mama", ekipman: "Ekipman", oyuncak: "Oyuncak", bakim: "Bakım ve hijyen" };
const URUN_TUR = { kedi: "Kedi", kopek: "Köpek", kus: "Kuş", diger: "Diğer", hepsi: "Tüm hayvanlar" };
const SIPARIS_DURUM = { bekliyor: "Ödeme bekleniyor", odendi: "Ödendi", hazirlaniyor: "Hazırlanıyor", kargoda: "Kargoda", teslim: "Teslim edildi", iptal: "İptal edildi", basarisiz: "Ödeme başarısız" };
const URUN_ONAY = { bekliyor: "Onay bekliyor", onaylandi: "Onaylandı", reddedildi: "Reddedildi" };
// Petshop (satıcı) bilgileri: herkese açık görünümden okunur, sayfa boyunca saklanır.
const SATICI_ONBELLEK = new Map();
async function saticilariYukle(idler) {
  const eksik = [...new Set(idler.filter(id => id && !SATICI_ONBELLEK.has(id)))];
  if (!eksik.length) return;
  const { data } = await sb.from("saticilar_acik").select("*").in("id", eksik);
  (data || []).forEach(x => SATICI_ONBELLEK.set(x.id, x));
}
const saticiBul = id => (id && SATICI_ONBELLEK.get(id)) || null;
const BAGIS_DURUM = { bekliyor: "Bekliyor", odendi: "Alındı", basarisiz: "Başarısız" };
const BAGIS_TUTARLARI = [50, 100, 250, 500];
ikon.canta = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>';
ikon.kalp = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';

let AYAR_ONBELLEK = null;
async function ayarlar() {
  if (!AYAR_ONBELLEK) {
    const { data } = await sb.from("ayarlar").select("*");
    AYAR_ONBELLEK = { kargo_ucreti: 49.9, ucretsiz_kargo_esigi: 750, en_az_bagis: 10 };
    (data || []).forEach(a => { AYAR_ONBELLEK[a.anahtar] = Number(a.deger); });
  }
  return AYAR_ONBELLEK;
}
function yonetici() {
  if (girisGerekli()) return false;
  if (!S.yonetici) { sayfa(`<div class="kap bos-durum"><h1>Bu sayfa yalnızca yöneticiler içindir</h1></div>`); return false; }
  return true;
}
const baslikH1 = (metin, alt) => `<h1 style="font-size:clamp(30px,4vw,38px);font-weight:900;margin-bottom:8px">${metin}</h1>${alt ? `<p class="bilgi" style="margin-bottom:24px">${alt}</p>` : ""}`;

// ---------- sepet (bu tarayıcıda tutulur) ----------
const SEPET_ANAHTAR = "petpatibul_sepet";
let SEPET = (() => {
  try { const v = JSON.parse(localStorage.getItem(SEPET_ANAHTAR) || "[]"); return Array.isArray(v) ? v.filter(k => k && k.urun_id && k.adet > 0) : []; }
  catch (_) { return []; }
})();
function sepetYaz(liste) {
  SEPET = liste;
  try { localStorage.setItem(SEPET_ANAHTAR, JSON.stringify(liste)); } catch (_) {}
  sepetSayaci();
}
function sepetiBosalt() { sepetYaz([]); }
function sepeteEkle(id, adet) {
  const l = SEPET.map(k => ({ ...k }));
  const k = l.find(x => x.urun_id === id);
  if (k) k.adet = Math.min(99, k.adet + adet); else l.push({ urun_id: id, adet });
  sepetYaz(l);
}
function sepetSayaci() {
  const n = SEPET.reduce((a, k) => a + k.adet, 0), e = $("#sepet-sayi");
  if (e) { e.textContent = String(n); e.hidden = !n; }
}
sepetSayaci();
document.addEventListener("click", e => {
  const b = e.target.closest("[data-sepete]");
  if (!b) return;
  const adetEl = $("#urun-adet");
  sepeteEkle(b.dataset.sepete, adetEl && b.dataset.adetli ? Math.max(1, parseInt(adetEl.value, 10) || 1) : 1);
  bildir("Sepete eklendi.");
});
async function sepetUrunleri() {
  if (!SEPET.length) return [];
  const { data, error } = await sb.from("urunler").select("*").in("id", SEPET.map(k => k.urun_id));
  if (error) throw error;
  const satirlar = [], kalan = [];
  for (const k of SEPET) {
    const u = (data || []).find(x => x.id === k.urun_id);
    if (!u || !u.aktif || u.stok <= 0) continue;
    const adet = Math.min(k.adet, u.stok, 99);
    satirlar.push({ u, adet }); kalan.push({ urun_id: u.id, adet });
  }
  if (kalan.length !== SEPET.length || kalan.some((k, n) => k.adet !== SEPET[n].adet)) {
    sepetYaz(kalan); bildir("Sepetindeki bazı ürünlerin stoğu değişti, sepet güncellendi.");
  }
  return satirlar;
}
// Sepet petshoplara göre bölünür: her petshop kendi kargosunu gönderir ve kendi kargo ücretini uygular.
async function tutarlar(satirlar) {
  const a = await ayarlar();
  await saticilariYukle(satirlar.map(s => s.u.satici_id));
  const yuvarla = n => Math.round(n * 100) / 100, gruplar = [];
  for (const s of satirlar) {
    const sid = s.u.satici_id || null;
    let g = gruplar.find(x => x.sid === sid);
    if (!g) {
      const sat = saticiBul(sid);
      g = { sid, ad: sat ? sat.magaza_adi : "petpatibul", ucret: sat ? Number(sat.kargo_ucreti) : a.kargo_ucreti,
            esik: sat ? Number(sat.ucretsiz_kargo_esigi) : a.ucretsiz_kargo_esigi, ara: 0, satirlar: [] };
      gruplar.push(g);
    }
    g.ara += Number(s.u.fiyat) * s.adet; g.satirlar.push(s);
  }
  gruplar.forEach(g => { g.ara = yuvarla(g.ara); g.kargo = !g.ara || g.ara >= g.esik ? 0 : g.ucret; });
  const ara = yuvarla(gruplar.reduce((t, g) => t + g.ara, 0)), kargo = yuvarla(gruplar.reduce((t, g) => t + g.kargo, 0));
  return { ara, kargo, toplam: yuvarla(ara + kargo), gruplar, esik: gruplar.length === 1 ? gruplar[0].esik : 0 };
}

// ---------- ürün kartı ----------
function urunKart(u) {
  const foto = u.fotolar && u.fotolar[0], yok = u.stok <= 0;
  const indirim = u.eski_fiyat && Number(u.eski_fiyat) > Number(u.fiyat) ? Math.round(100 - Number(u.fiyat) / Number(u.eski_fiyat) * 100) : 0;
  return `<div class="kart urun-kart">
    <a class="urun-foto u-${esc(u.kategori)}" href="/urun/${u.id}" tabindex="-1" aria-hidden="true">
      ${foto ? `<img src="${esc(foto)}" alt="" loading="lazy">` : `<span class="yok">${ikon.canta}</span>`}
      ${indirim ? `<span class="e e-indirim">%${indirim} indirim</span>` : ""}
    </a>
    <div class="kart-govde">
      <span class="kart-yer">${esc(u.marka || URUN_KAT[u.kategori])} · ${esc(URUN_TUR[u.tur])}</span>
      <a class="urun-ad" href="/urun/${u.id}">${esc(u.ad)}</a>
      <div class="fiyat-satir"><b>${tl(u.fiyat)}</b>${indirim ? `<s>${tl(u.eski_fiyat)}</s>` : ""}</div>
      ${saticiBul(u.satici_id) ? `<a class="satici-ad" href="/petshop/${u.satici_id}">${esc(saticiBul(u.satici_id).magaza_adi)}</a>` : ""}
      <button type="button" class="btn btn-kucuk${yok ? "" : " btn-ana"}" ${yok ? "disabled" : `data-sepete="${u.id}"`}>${yok ? "Stokta yok" : "Sepete ekle"}</button>
    </div>
  </div>`;
}

// ---------- mağaza ----------
async function magazaSayfasi() {
  $$(".ana-menu > a").forEach(a => { if (a.getAttribute("href") === "/magaza") a.setAttribute("aria-current", "page"); });
  const q = new URLSearchParams(location.search);
  const kat = URUN_KAT[q.get("kategori")] ? q.get("kategori") : "", tur = URUN_TUR[q.get("tur")] ? q.get("tur") : "";
  const sira = ["ucuz", "pahali"].includes(q.get("sira")) ? q.get("sira") : "";
  const turAd = tur && tur !== "hepsi" ? TUR[tur] : "";
  const baslik = `${turAd ? turAd + " " : ""}${kat ? (kat === "mama" ? "maması" : URUN_KAT[kat].toLocaleLowerCase("tr")) : "maması ve ekipmanları"}`.trim();
  const tamBaslik = turAd || kat ? baslik.charAt(0).toLocaleUpperCase("tr") + baslik.slice(1) : "Mama ve ekipman mağazası";
  meta(tamBaslik, `${tamBaslik}: kedi ve köpek maması, kum, tasma, taşıma çantası ve oyuncak. Belirli tutar üzeri ücretsiz kargo.`);
  const yol = (deg) => { const o = { kategori: kat, tur, sira, ...deg }; const s = new URLSearchParams(Object.entries(o).filter(([, v]) => v)).toString(); return "/magaza" + (s ? "?" + s : ""); };
  const hap = (etiket, href, secili) => `<a class="hap" href="${esc(href)}"${secili ? ' aria-current="page"' : ""}>${esc(etiket)}</a>`;
  const a = await ayarlar();
  sayfa(`<div class="kap">
    <div class="liste-bas">
      <div><h1>${esc(tamBaslik)}</h1><p>${tl(a.ucretsiz_kargo_esigi)} ve üzeri siparişlerde kargo bedava.</p></div>
      <label class="alan" style="flex-direction:row;align-items:center;gap:8px;font-weight:500;color:var(--soluk)">Sırala
        <select id="m-sira" style="width:auto">
          <option value=""${!sira ? " selected" : ""}>En yeni</option>
          <option value="ucuz"${sira === "ucuz" ? " selected" : ""}>Fiyat: düşükten yükseğe</option>
          <option value="pahali"${sira === "pahali" ? " selected" : ""}>Fiyat: yüksekten düşüğe</option>
        </select>
      </label>
    </div>
    <div class="magaza-filtre">
      <div class="hap-grup" aria-label="Kategori">${hap("Tümü", yol({ kategori: "" }), !kat)}${Object.entries(URUN_KAT).map(([k, v]) => hap(v, yol({ kategori: k }), kat === k)).join("")}</div>
      <div class="hap-grup" aria-label="Hayvan">${hap("Tüm hayvanlar", yol({ tur: "" }), !tur)}${["kedi", "kopek", "kus"].map(k => hap(TUR[k], yol({ tur: k }), tur === k)).join("")}</div>
    </div>
    <div id="urunler"><p class="bilgi">Yükleniyor…</p></div>
    <section class="kutu petshop-davet"><div><b>Petshop musun?</b><span class="bilgi">Ürünlerini petpatibul mağazasında sat. Başvurun onaylanınca kendi panelinden ürün ekleyebilirsin.</span></div>
      <a class="btn" href="/petshop-ol">Mağazada satış yap</a></section>
  </div>`);
  $("#m-sira").onchange = e => git(yol({ sira: e.target.value }));
  let s = sb.from("urunler").select("*").eq("aktif", true);
  if (kat) s = s.eq("kategori", kat);
  if (tur) s = s.in("tur", tur === "hepsi" ? ["hepsi"] : [tur, "hepsi"]);
  s = sira ? s.order("fiyat", { ascending: sira === "ucuz" }) : s.order("created_at", { ascending: false });
  const { data, error } = await s.limit(120);
  if (error) throw error;
  const l = [...data.filter(u => u.stok > 0), ...data.filter(u => u.stok <= 0)];
  await saticilariYukle(l.map(u => u.satici_id));
  $("#urunler").innerHTML = l.length ? `<div class="izgara urun-izgara">${l.map(urunKart).join("")}</div>`
    : `<div class="kutu bos-durum"><h2>Bu kategoride henüz ürün yok</h2><p><a href="/magaza">Tüm ürünlere bak</a></p></div>`;
}

async function urunSayfasi(id) {
  const { data: u, error } = await sb.from("urunler").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!u) { meta("Ürün bulunamadı"); sayfa(`<div class="kap bos-durum"><h1>Bu ürün artık satışta değil</h1><p><a href="/magaza">Mağazaya dön</a></p></div>`); return; }
  meta(u.ad, `${u.ad}${u.marka ? " (" + u.marka + ")" : ""}: ${tl(u.fiyat)}. ${(u.aciklama || "").slice(0, 120)}`);
  const a = await ayarlar();
  await saticilariYukle([u.satici_id]);
  const sat = saticiBul(u.satici_id);
  const kUcret = sat ? Number(sat.kargo_ucreti) : a.kargo_ucreti, kEsik = sat ? Number(sat.ucretsiz_kargo_esigi) : a.ucretsiz_kargo_esigi;
  const fotolar = u.fotolar || [], yok = u.stok <= 0;
  const indirim = u.eski_fiyat && Number(u.eski_fiyat) > Number(u.fiyat);
  sayfa(`<div class="kap">
    <nav class="yol" aria-label="Konum"><a href="/magaza">Mağaza</a><span>/</span><a href="/magaza?kategori=${esc(u.kategori)}">${esc(URUN_KAT[u.kategori])}</a><span>/</span><span>${esc(u.ad)}</span></nav>
    <div class="detay">
      <div class="detay-sol">
        <div>
          <div class="galeri-ana urun-foto u-${esc(u.kategori)}" id="galeri-ana" style="aspect-ratio:1;max-height:560px">${fotolar[0] ? `<img src="${esc(fotolar[0])}" alt="${esc(u.ad)}">` : `<span class="yok">${ikon.canta}</span>`}</div>
          ${fotolar.length > 1 ? `<div class="galeri-kucuk">${fotolar.map((f, n) => `<button type="button" data-foto="${n}" aria-pressed="${n === 0}" aria-label="${n + 1}. fotoğraf"><img src="${esc(f)}" alt=""></button>`).join("")}</div>` : ""}
        </div>
        ${u.aciklama ? `<div style="display:flex;flex-direction:column;gap:10px"><h2 style="font-size:24px;font-weight:800">Ürün açıklaması</h2><p class="aciklama">${esc(u.aciklama)}</p></div>` : ""}
      </div>
      <aside class="detay-sag kutu form">
        <span class="kart-yer">${esc(u.marka || "")}${u.marka ? " · " : ""}${esc(URUN_KAT[u.kategori])} · ${esc(URUN_TUR[u.tur])}</span>
        <h1 style="font-size:clamp(26px,3.4vw,32px);font-weight:900">${esc(u.ad)}</h1>
        <div class="fiyat-satir" style="font-size:28px"><b>${tl(u.fiyat)}</b>${indirim ? `<s style="font-size:18px">${tl(u.eski_fiyat)}</s>` : ""}</div>
        <p class="bilgi">${yok ? "Bu ürün şu an stokta yok." : u.stok < 10 ? `Stokta son ${u.stok} adet.` : "Stokta var. 1-3 iş günü içinde kargoda."}</p>
        ${yok ? "" : `<label class="alan">Adet<input id="urun-adet" type="number" min="1" max="${Math.min(99, u.stok)}" value="1" inputmode="numeric" style="max-width:120px"></label>
          <button type="button" class="btn btn-ana" data-sepete="${u.id}" data-adetli="1">Sepete ekle</button>
          <a class="btn" href="/sepet">Sepete git</a>`}
        <p class="bilgi">${sat ? `${esc(sat.magaza_adi)} ürünlerinde ` : ""}${tl(kEsik)} ve üzeri siparişlerde kargo bedava, altında ${tl(kUcret)}.</p>
        ${sat ? `<div class="satici-kutu"><span class="bilgi">Satıcı</span><a href="/petshop/${sat.id}"><b>${esc(sat.magaza_adi)}</b></a><span class="bilgi">${esc(sat.ilce ? sat.ilce + " / " : "")}${esc(sat.il)}</span></div>` : ""}
      </aside>
    </div>
  </div>`);
  $$("[data-foto]").forEach(b => b.onclick = () => {
    $("#galeri-ana").innerHTML = `<img src="${esc(fotolar[+b.dataset.foto])}" alt="${esc(u.ad)}">`;
    $$("[data-foto]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  });
}

function ozetHtml(t, satirlar) {
  const eksik = t.esik - t.ara, cok = t.gruplar.length > 1;
  const kalem = s => `<div class="ozet-satir"><span>${esc(s.u.ad)} × ${s.adet}</span><span>${tl(Number(s.u.fiyat) * s.adet)}</span></div>`;
  return `<div class="ozet">
    ${cok ? `<p class="bilgi" style="margin:0">Sepetinde ${t.gruplar.length} farklı satıcının ürünü var. Her satıcı kendi kargosunu ayrı gönderir.</p>
      ${t.gruplar.map(g => `<div class="ozet-grup"><b>${esc(g.ad)}</b>${satirlar ? g.satirlar.map(kalem).join("") : ""}
        <div class="ozet-satir"><span>Kargo${g.kargo && g.esik - g.ara > 0 ? ` (${tl(g.esik - g.ara)} daha ekle, bedava olsun)` : ""}</span><span>${g.kargo ? tl(g.kargo) : "Bedava"}</span></div></div>`).join("")}`
    : (satirlar ? satirlar.map(kalem).join("") : "")}
    <div class="ozet-satir"><span>Ara toplam</span><span>${tl(t.ara)}</span></div>
    <div class="ozet-satir"><span>Kargo${cok ? " (toplam)" : ""}</span><span>${t.kargo ? tl(t.kargo) : "Bedava"}</span></div>
    <div class="ozet-satir toplam"><span>Toplam</span><span>${tl(t.toplam)}</span></div>
    ${!cok && t.kargo && eksik > 0 ? `<p class="bilgi">${tl(eksik)} daha ekle, kargo bedava olsun.</p>` : ""}
  </div>`;
}

async function sepetSayfasi() {
  meta("Sepetim");
  sayfa(`<div class="kap dar">${baslikH1("Sepetim")}<div id="sepet-icerik"><p class="bilgi">Yükleniyor…</p></div></div>`);
  const ciz = async () => {
    const satirlar = await sepetUrunleri();
    if (!satirlar.length) {
      $("#sepet-icerik").innerHTML = `<div class="kutu bos-durum"><h2>Sepetin boş</h2><p>Mama ve ekipmanlara göz at.</p><p><a class="btn btn-ana" href="/magaza">Mağazaya git</a></p></div>`;
      return;
    }
    const t = await tutarlar(satirlar);
    $("#sepet-icerik").innerHTML = `<div class="kutu">
      ${satirlar.map(s => `<div class="satir">
        <div class="satir-foto">${s.u.fotolar && s.u.fotolar[0] ? `<img src="${esc(s.u.fotolar[0])}" alt="">` : ""}</div>
        <div class="satir-govde"><b><a href="/urun/${s.u.id}">${esc(s.u.ad)}</a></b><span class="bilgi">${tl(s.u.fiyat)} · stokta ${s.u.stok}</span></div>
        <div class="adet-kutu" role="group" aria-label="${esc(s.u.ad)} adedi">
          <button type="button" class="btn btn-kucuk" data-azalt="${s.u.id}" aria-label="Azalt">−</button>
          <span aria-live="polite">${s.adet}</span>
          <button type="button" class="btn btn-kucuk" data-arttir="${s.u.id}" aria-label="Arttır"${s.adet >= Math.min(99, s.u.stok) ? " disabled" : ""}>+</button>
        </div>
        <b style="min-width:96px;text-align:right">${tl(Number(s.u.fiyat) * s.adet)}</b>
        <button type="button" class="link-btn tehlike" data-cikar="${s.u.id}">Çıkar</button>
      </div>`).join("")}
      ${ozetHtml(t)}
      <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-end;margin-top:16px"><a class="btn" href="/magaza">Alışverişe devam et</a><a class="btn btn-ana" href="/siparis-ver">Siparişi tamamla</a></div>
    </div>`;
    const degistir = (id, f) => { sepetYaz(SEPET.map(k => k.urun_id === id ? { ...k, adet: f(k.adet) } : k).filter(k => k.adet > 0)); ciz(); };
    $$("[data-azalt]").forEach(b => b.onclick = () => degistir(b.dataset.azalt, n => n - 1));
    $$("[data-arttir]").forEach(b => b.onclick = () => degistir(b.dataset.arttir, n => Math.min(99, n + 1)));
    $$("[data-cikar]").forEach(b => b.onclick = () => degistir(b.dataset.cikar, () => 0));
  };
  await ciz();
}

async function siparisSayfasi() {
  if (girisGerekli()) return;
  meta("Siparişi tamamla");
  const satirlar = await sepetUrunleri();
  if (!satirlar.length) { git("/sepet", true); return; }
  const t = await tutarlar(satirlar);
  sayfa(`<div class="kap">
    <div style="padding-block:32px 0">${baslikH1("Siparişi tamamla")}</div>
    <div class="detay">
      <div class="detay-sol" id="odeme-alani">
        <form class="kutu form" id="siparis-form">
          <h2 style="font-size:22px">Teslimat bilgileri</h2>
          <div class="form-izgara">
            <label class="alan">Adın soyadın<input name="ad" required maxlength="80" autocomplete="name"></label>
            <label class="alan">Telefon<input name="telefon" type="tel" required minlength="10" maxlength="20" autocomplete="tel" placeholder="05xx xxx xx xx"></label>
            <label class="alan">İl<select name="il" required>${ilSecenekleri("", "Seç")}</select></label>
            <label class="alan">İlçe<input name="ilce" required maxlength="60"></label>
          </div>
          <label class="alan">Açık adres<textarea name="adres" required maxlength="300" rows="3" autocomplete="street-address" placeholder="Mahalle, sokak, bina ve daire no"></textarea></label>
          <label class="onay" style="align-items:flex-start"><input type="checkbox" required style="margin-top:2px"> <span style="font-size:14px;color:var(--yazi2)"><a href="/kullanim-kosullari" target="_blank">Mesafeli satış sözleşmesini ve ön bilgilendirme formunu</a> okudum, kabul ediyorum.</span></label>
          ${A.ODEME_AKTIF ? `<button class="btn btn-ana" type="submit">${tl(t.toplam)} öde</button>` : `<p class="uyari">Online ödeme çok yakında açılacak.</p>`}
          <div class="mesaj" role="status"></div>
          <p class="bilgi">Ödeme PayTR güvenli ödeme sayfasında yapılır. Kart bilgilerin bize ulaşmaz.${t.gruplar.length > 1 ? " Tek ödeme yaparsın; siparişin satıcılara ayrı ayrı iletilir." : ""}</p>
        </form>
      </div>
      <aside class="detay-sag kutu"><h2 style="font-size:22px;margin-bottom:12px">Sipariş özeti</h2>${ozetHtml(t, satirlar)}<p style="margin:12px 0 0"><a href="/sepet">Sepeti düzenle</a></p></aside>
    </div>
  </div>`);
  if (!A.ODEME_AKTIF) return;
  $("#siparis-form").onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(e.target), m = $(".mesaj", e.target), btn = $("button[type=submit]", e.target);
    btn.disabled = true; mesaj(m, "Güvenli ödeme sayfası hazırlanıyor…");
    const { data, error } = await sb.functions.invoke("odeme-baslat", { body: {
      tip: "siparis", sepet: SEPET, ad: fd.get("ad"), telefon: fd.get("telefon"), il: fd.get("il"), ilce: fd.get("ilce"), adres: fd.get("adres"),
    } });
    btn.disabled = false;
    if (error) return mesaj(m, await odemeHatasi(error), true);
    odemeCercevesi($("#odeme-alani"), data.token);
  };
}

// ---------- bağış ----------
function ilerleme(toplanan, hedef) {
  if (!hedef) return `<p class="bilgi"><b style="color:var(--yazi)">${tl(toplanan || 0)}</b> toplandı</p>`;
  const yuzde = Math.min(100, Math.round((toplanan || 0) / hedef * 100));
  return `<div class="ilerleme" role="progressbar" aria-valuenow="${yuzde}" aria-valuemin="0" aria-valuemax="100" aria-label="Hedefin yüzde ${yuzde}'i toplandı"><span style="width:${yuzde}%"></span></div>
    <p class="bilgi"><b style="color:var(--yazi)">${tl(toplanan || 0)}</b> toplandı · hedef ${tl(hedef)} · %${yuzde}</p>`;
}

async function bagisSayfasi(id) {
  $$(".ana-menu > a").forEach(a => { if (a.getAttribute("href") === "/bagis") a.setAttribute("aria-current", "page"); });
  const [kmp, ozet, son, a] = await Promise.all([
    sb.from("bagis_kampanyalari").select("*").eq("aktif", true).order("sira").order("created_at", { ascending: false }),
    sb.from("bagis_ozet").select("*"),
    (id ? sb.from("son_bagislar").select("*").eq("kampanya_id", id) : sb.from("son_bagislar").select("*")).limit(10),
    ayarlar(),
  ]);
  if (kmp.error) throw kmp.error;
  const toplanan = kid => { const o = (ozet.data || []).find(x => (x.kampanya_id || null) === (kid || null)); return o ? Number(o.toplanan) : 0; };
  const genelToplam = (ozet.data || []).reduce((t, o) => t + Number(o.toplanan), 0);
  const kampanya = id ? kmp.data.find(k => k.id === id) : null;
  if (id && !kampanya) { meta("Kampanya bulunamadı"); sayfa(`<div class="kap bos-durum"><h1>Bu kampanya sona erdi</h1><p><a href="/bagis">Diğer kampanyalara bak</a></p></div>`); return; }
  meta(kampanya ? kampanya.baslik : "Sokak hayvanları için bağış", "Sokak hayvanlarının mama, aşı ve tedavi masrafları için bağış yap. Toplanan tutarlar herkese açık.");

  const sonListe = (son.data || []).length ? `<section class="kutu"><h2 style="font-size:20px;margin-bottom:8px">Son bağışlar</h2>${son.data.map(b => `<div class="satir"><div class="satir-govde"><b>${esc(b.ad)}</b>${b.mesaj ? `<span class="bilgi">"${esc(b.mesaj)}"</span>` : ""}</div><b>${tl(b.tutar)}</b></div>`).join("")}</section>` : "";
  sayfa(`<div class="kap">
    ${kampanya ? `<nav class="yol" aria-label="Konum"><a href="/bagis">Bağış</a><span>/</span><span>${esc(kampanya.baslik)}</span></nav>` : ""}
    <div class="detay" style="${kampanya ? "" : "padding-top:32px"}">
      <div class="detay-sol">
        ${kampanya ? `
          ${kampanya.foto ? `<div class="galeri-ana"><img src="${esc(kampanya.foto)}" alt=""></div>` : ""}
          <h1 style="font-size:clamp(30px,4.5vw,42px);font-weight:900">${esc(kampanya.baslik)}</h1>
          <div>${ilerleme(toplanan(kampanya.id), kampanya.hedef ? Number(kampanya.hedef) : 0)}</div>
          <p class="aciklama">${esc(kampanya.aciklama || "")}</p>`
        : `<div style="display:flex;flex-direction:column;gap:12px">
            <span class="rozet" style="background:var(--ana-acik)">Sokak hayvanları için</span>
            <h1 style="font-size:clamp(32px,5vw,48px);font-weight:900">Mama kabı boş kalmasın</h1>
            <p style="margin:0;font-size:18px;color:var(--yazi2)">Bağışların sokaktaki kedi ve köpeklerin mamasına, aşısına, kısırlaştırmasına ve tedavisine gider. Şimdiye kadar toplanan: <b>${tl(genelToplam)}</b></p>
          </div>
          ${kmp.data.length ? `<section><h2 style="font-size:24px;font-weight:800;margin-bottom:16px">Kampanyalar</h2><div class="izgara">${kmp.data.map(k => `<a class="kart" href="/bagis/${k.id}">
            <div class="kart-foto" style="aspect-ratio:16/9">${k.foto ? `<img src="${esc(k.foto)}" alt="" loading="lazy">` : `<span class="yok">${ikon.kalp}</span>`}</div>
            <div class="kart-govde"><b style="font-family:var(--f-baslik);font-size:20px">${esc(k.baslik)}</b>${ilerleme(toplanan(k.id), k.hedef ? Number(k.hedef) : 0)}</div></a>`).join("")}</div></section>` : ""}
          <section class="kutu metin"><h2 style="margin-top:0">Bağışlar nasıl kullanılıyor?</h2>
            <p>Toplanan her bağış bu sayfada görünür. Bağışlar mama alımı, veteriner masrafları ve kısırlaştırma için kullanılır; harcama dökümleri düzenli olarak paylaşılır.</p></section>`}
        ${sonListe}
      </div>
      <aside class="detay-sag" id="odeme-alani">
        ${!A.BAGIS_AKTIF ? `<div class="kutu bos-durum"><h2>Bağış sistemi çok yakında</h2><p>Online bağış kısa süre içinde açılacak.</p></div>` : `
        <form class="kutu form" id="bagis-form">
          <h2 style="font-size:22px">${kampanya ? "Bu kampanyaya bağış yap" : "Genel bağış yap"}</h2>
          <fieldset><legend>Tutar</legend><div class="hap-grup">
            ${BAGIS_TUTARLARI.map((t, n) => `<label class="hap tutar-sec"><input type="radio" name="hazir" value="${t}" class="gizli"${n === 1 ? " checked" : ""}>${tl(t).replace(",00", "")}</label>`).join("")}
          </div></fieldset>
          <label class="alan">Başka bir tutar (TL)<input name="tutar" type="number" min="${a.en_az_bagis}" max="100000" step="1" inputmode="numeric" placeholder="Örn. 150"></label>
          <label class="alan">Adın soyadın<input name="ad" required maxlength="80" autocomplete="name"></label>
          <label class="onay"><input type="checkbox" name="gizli"> Adım bağışçı listesinde görünmesin</label>
          ${S.kullanici ? "" : `<label class="alan">E-posta<input name="email" type="email" required autocomplete="email"><small>Bağış makbuzu bu adrese gönderilir.</small></label>`}
          <label class="alan">Telefon<input name="telefon" type="tel" required minlength="10" maxlength="20" autocomplete="tel"></label>
          <label class="alan">İl<select name="il">${ilSecenekleri("", "Seç")}</select></label>
          <label class="alan">Mesajın (isteğe bağlı)<input name="mesaj" maxlength="300" placeholder="Bağışçı listesinde görünür"></label>
          <button class="btn btn-ana" type="submit" id="bagis-btn">Bağış yap</button>
          <div class="mesaj" role="status"></div>
          <p class="bilgi">Ödeme PayTR güvenli ödeme sayfasında yapılır. Kart bilgilerin bize ulaşmaz.</p>
        </form>`}
      </aside>
    </div>
  </div>`);
  if (!A.BAGIS_AKTIF) return;
  const f = $("#bagis-form");
  const tutarOku = () => { const ozel = parseFloat(f.tutar.value); if (ozel > 0) return ozel; const h = $("input[name=hazir]:checked", f); return h ? Number(h.value) : 0; };
  const guncelle = () => { const t = tutarOku(); $("#bagis-btn").textContent = t ? `${tl(t)} bağış yap` : "Bağış yap"; };
  f.tutar.oninput = () => { if (f.tutar.value) $$("input[name=hazir]", f).forEach(r => { r.checked = false; }); guncelle(); };
  $$("input[name=hazir]", f).forEach(r => r.onchange = () => { f.tutar.value = ""; guncelle(); });
  guncelle();
  f.onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(f), m = $(".mesaj", f), btn = $("#bagis-btn");
    const tutar = tutarOku();
    if (!(tutar >= a.en_az_bagis)) return mesaj(m, `Bağış tutarı en az ${tl(a.en_az_bagis)} olmalı.`, true);
    btn.disabled = true; mesaj(m, "Güvenli ödeme sayfası hazırlanıyor…");
    const { data, error } = await sb.functions.invoke("odeme-baslat", { body: {
      tip: "bagis", kampanya_id: kampanya ? kampanya.id : null, tutar, ad: fd.get("ad"), gizli: !!fd.get("gizli"),
      email: fd.get("email") || null, telefon: fd.get("telefon"), il: fd.get("il"), mesaj: fd.get("mesaj"),
    } });
    btn.disabled = false;
    if (error) return mesaj(m, await odemeHatasi(error), true);
    odemeCercevesi($("#odeme-alani"), data.token);
  };
}

// ---------- hesabım: siparişlerim ----------
async function hesabimEk(el) {
  const uid = S.kullanici.id;
  const sp = await sb.from("magaza_siparisleri").select("*").eq("kullanici_id", uid).neq("durum", "bekliyor").order("created_at", { ascending: false });
  await saticilariYukle((sp.data || []).map(s => s.satici_id));
  el.innerHTML = `
    <section class="kutu" style="margin-bottom:24px"><h2 style="font-size:22px;margin-bottom:8px">Siparişlerim</h2>
      ${(sp.data || []).length ? sp.data.map(s => `<div class="satir"><div class="satir-govde">
          <b>${tarih(s.created_at)} · ${tl(s.toplam)}</b>
          <span class="bilgi">${esc(s.kalemler.map(k => `${k.ad} × ${k.adet}`).join(", "))}</span>
          ${saticiBul(s.satici_id) ? `<span class="bilgi">Satıcı: <a href="/petshop/${s.satici_id}">${esc(saticiBul(s.satici_id).magaza_adi)}</a> · ${esc(saticiBul(s.satici_id).telefon)}</span>` : ""}
          ${s.kargo_takip ? `<span class="bilgi">Kargo: ${esc(s.kargo_firma || "")} ${esc(s.kargo_takip)}</span>` : ""}
        </div><span class="durum d-${s.durum}">${esc(SIPARIS_DURUM[s.durum])}</span></div>`).join("")
      : `<p class="bilgi">Henüz sipariş vermedin. <a href="/magaza">Mağazaya göz at</a></p>`}
    </section>
    ${window.petshopHesapKutusu ? petshopHesapKutusu() : ""}`;
}

// ---------- yönetim: ürünler (sitenin kendi ürünleri ve petshop ürünlerinin onayı) ----------
async function yUrunler() {
  if (!yonetici()) return;
  meta("Yönetim · Ürünler");
  const q = new URLSearchParams(location.search), filtre = ["bekliyor", "petshop", "site", "reddedildi"].includes(q.get("f")) ? q.get("f") : "";
  let s = sb.from("urunler").select("*").order("created_at", { ascending: false }).limit(300);
  if (filtre === "bekliyor" || filtre === "reddedildi") s = s.eq("onay", filtre);
  if (filtre === "petshop") s = s.not("satici_id", "is", null);
  if (filtre === "site") s = s.is("satici_id", null);
  const [{ data: l, error }, a, bek, saticiListe] = await Promise.all([s, ayarlar(),
    sb.from("urunler").select("id", { count: "exact", head: true }).eq("onay", "bekliyor"),
    sb.from("saticilar").select("id, magaza_adi")]);
  if (error) throw error;
  const satAd = id => { const x = (saticiListe.data || []).find(v => v.id === id); return x ? x.magaza_adi : "Petshop"; };
  const hap = (k, ad) => `<a class="hap" href="/yonetim/urunler${k ? "?f=" + k : ""}"${filtre === k ? ' aria-current="page"' : ""}>${ad}</a>`;
  sayfa(`<div class="kap dar">
    <h1 style="font-size:36px;font-weight:900;margin-bottom:16px">Yönetim</h1>
    ${yonetimSekmeleri("/yonetim/urunler")}
    <div class="hap-grup" style="margin-bottom:16px">${hap("", "Tümü")}${hap("bekliyor", `Onay bekleyen (${bek.count || 0})`)}${hap("petshop", "Petshop ürünleri")}${hap("site", "Sitenin ürünleri")}${hap("reddedildi", "Reddedilen")}</div>
    <section class="kutu" style="margin-bottom:24px">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px">
        <h2 style="font-size:22px">Ürünler (${l.length})</h2><a class="btn btn-ana btn-kucuk" href="/yonetim/urun/yeni">Yeni ürün ekle</a>
      </div>
      ${l.length ? l.map(u => `<div class="satir" style="align-items:flex-start">
        <div class="satir-foto">${u.fotolar && u.fotolar[0] ? `<img src="${esc(u.fotolar[0])}" alt="">` : ""}</div>
        <div class="satir-govde"><b><a href="/yonetim/urun/${u.id}">${esc(u.ad)}</a></b>
          <span class="bilgi">${u.satici_id ? `<a href="/yonetim/petshop/${u.satici_id}">${esc(satAd(u.satici_id))}</a>` : "Sitenin ürünü"} · ${esc(URUN_KAT[u.kategori])} · ${esc(URUN_TUR[u.tur])} · ${tl(u.fiyat)}</span>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span class="durum ${u.onay === "onaylandi" ? "d-yayinda" : u.onay === "bekliyor" ? "d-bekliyor" : "d-red"}">${esc(URUN_ONAY[u.onay])}</span>
            <span class="durum ${u.stok <= 0 ? "d-red" : u.stok < 10 ? "d-bekliyor" : "d-yayinda"}">Stok: ${u.stok}</span>
            ${u.aktif ? "" : `<span class="durum d-kaldirildi">Satışta değil</span>`}
          </div>
          ${u.red_nedeni ? `<span class="bilgi">Ret nedeni: ${esc(u.red_nedeni)}</span>` : ""}
        </div>
        <div class="satir-dugmeler" style="flex-direction:column;align-items:stretch;min-width:180px">
          ${u.onay !== "onaylandi" ? `<button type="button" class="btn btn-kucuk btn-ana" data-urun-onayla="${u.id}">Onayla</button>` : ""}
          ${u.onay !== "reddedildi" ? `<details><summary class="btn btn-kucuk">Reddet</summary><form class="form" data-urun-reddet="${u.id}" style="margin-top:8px">
            <input name="neden" required maxlength="300" placeholder="Ret nedeni (petshop görür)"><button class="btn btn-kucuk" type="submit">Reddet</button></form></details>` : ""}
          <a class="btn btn-kucuk" href="/yonetim/urun/${u.id}">Düzenle</a>
        </div>
      </div>`).join("") : `<p class="bilgi">Bu listede ürün yok.</p>`}
    </section>
    <form class="kutu form" id="kargo-form">
      <h2 style="font-size:22px">Sitenin kendi ürünleri: kargo ve komisyon</h2>
      <div class="form-izgara">
        <label class="alan">Kargo ücreti (TL)<input name="kargo_ucreti" type="number" min="0" step="0.01" value="${a.kargo_ucreti}" required></label>
        <label class="alan">Bu tutar ve üstü kargo bedava (TL)<input name="ucretsiz_kargo_esigi" type="number" min="0" step="1" value="${a.ucretsiz_kargo_esigi}" required></label>
        <label class="alan">Petshop satışlarında genel komisyon (%)<input name="komisyon_orani" type="number" min="0" max="100" step="0.1" value="${a.komisyon_orani ?? 10}" required><small>Petshop başına farklı oran Petshoplar sekmesinden girilir.</small></label>
      </div>
      <button class="btn" type="submit" style="align-self:flex-start">Kaydet</button>
    </form>
  </div>`);
  $$("[data-urun-onayla]").forEach(b => b.onclick = async () => {
    b.disabled = true;
    const { error: h } = await sb.from("urunler").update({ onay: "onaylandi", red_nedeni: null }).eq("id", b.dataset.urunOnayla);
    if (h) { b.disabled = false; return bildir(hataMetni(h)); }
    bildir("Ürün onaylandı, mağazada görünüyor."); yUrunler();
  });
  $$("[data-urun-reddet]").forEach(f => f.onsubmit = async e => {
    e.preventDefault();
    const { error: h } = await sb.from("urunler").update({ onay: "reddedildi", red_nedeni: new FormData(f).get("neden").trim() }).eq("id", f.dataset.urunReddet);
    if (h) return bildir(hataMetni(h));
    bildir("Ürün reddedildi."); yUrunler();
  });
  $("#kargo-form").onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(e.target);
    const { error: h } = await sb.from("ayarlar").upsert(["kargo_ucreti", "ucretsiz_kargo_esigi", "komisyon_orani"].map(k => ({ anahtar: k, deger: Number(fd.get(k)) })));
    if (h) return bildir(hataMetni(h));
    AYAR_ONBELLEK = null; bildir("Ayarlar kaydedildi.");
  };
}

async function magazaFotosuYukle(dosya, klasor) {
  const blob = await fotoKucult(dosya);
  const yol = `${klasor}/${crypto.randomUUID()}.jpg`;
  const { error } = await sb.storage.from("magaza-fotolari").upload(yol, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  return sb.storage.from("magaza-fotolari").getPublicUrl(yol).data.publicUrl;
}

const yUrunFormu = id => urunFormu(id, "yonetim");

// Ürün formu: yönetici (her ürün) ve petshop (yalnızca kendi ürünleri, kaydedince onaya düşer) ortak kullanır.
async function urunFormu(id, mod) {
  const petshop = mod === "petshop";
  if (petshop ? !(await petshopHazir()) : !yonetici()) return;
  const geri = petshop ? "/petshop-paneli" : "/yonetim/urunler";
  let u = { kategori: "mama", tur: "kedi", stok: 0, aktif: true, fotolar: [] };
  if (id !== "yeni") {
    const { data, error } = await sb.from("urunler").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data || (petshop && data.satici_id !== S.satici.id)) { sayfa(`<div class="kap bos-durum"><h1>Ürün bulunamadı</h1><p><a href="${geri}">Ürünlere dön</a></p></div>`); return; }
    u = data;
  }
  meta(id === "yeni" ? "Yeni ürün" : "Ürünü düzenle");
  let fotolar = [...(u.fotolar || [])];
  const saticiAdi = !petshop && u.satici_id ? ((await sb.from("saticilar").select("magaza_adi").eq("id", u.satici_id).maybeSingle()).data || {}).magaza_adi : "";
  sayfa(`<div class="kap dar">
    <p style="margin:0 0 12px"><a href="${geri}">Ürünlere dön</a></p>
    ${baslikH1(id === "yeni" ? "Yeni ürün" : "Ürünü düzenle", petshop ? "Eklediğin ürünler ve ad, fiyat, açıklama, fotoğraf değişiklikleri yönetici onayından sonra mağazada görünür. Stok ve satışta/değil değişiklikleri hemen geçerli olur." : saticiAdi ? `Bu ürün ${esc(saticiAdi)} petshopuna ait.` : "")}
    ${u.onay === "reddedildi" ? `<p class="uyari">Bu ürün reddedildi${u.red_nedeni ? `: ${esc(u.red_nedeni)}` : "."} Düzeltip kaydedince yeniden onaya gönderilir.</p>` : ""}
    ${petshop && u.onay === "bekliyor" && id !== "yeni" ? `<p class="uyari">Bu ürün yönetici onayı bekliyor.</p>` : ""}
    <form class="kutu form" id="urun-form">
      <label class="alan">Ürün adı<input name="ad" required maxlength="120" value="${esc(u.ad || "")}" placeholder="Örn. Yetişkin kedi maması tavuklu 2 kg"></label>
      <div class="form-izgara">
        <label class="alan">Kategori<select name="kategori">${secenekler(URUN_KAT, u.kategori)}</select></label>
        <label class="alan">Hangi hayvan için<select name="tur">${secenekler(URUN_TUR, u.tur)}</select></label>
        <label class="alan">Marka<input name="marka" maxlength="60" value="${esc(u.marka || "")}"></label>
        <label class="alan">Fiyat (TL)<input name="fiyat" type="number" min="0.01" step="0.01" required value="${esc(u.fiyat ?? "")}"></label>
        <label class="alan">İndirimden önceki fiyat (TL)<input name="eski_fiyat" type="number" min="0.01" step="0.01" value="${esc(u.eski_fiyat ?? "")}"><small>Boş bırakırsan indirim gösterilmez.</small></label>
        <label class="alan">Stok (adet)<input name="stok" type="number" min="0" step="1" required value="${esc(u.stok)}"></label>
      </div>
      <label class="alan">Açıklama<textarea name="aciklama" maxlength="6000" rows="6">${esc(u.aciklama || "")}</textarea></label>
      <div class="alan">Fotoğraflar <small>İlk fotoğraf kapakta görünür.</small>
        <div class="foto-onizleme" id="foto-liste"></div>
        <label class="btn" style="align-self:flex-start">Fotoğraf ekle<input type="file" accept="image/*" multiple id="foto-sec" class="gizli"></label>
      </div>
      <label class="onay"><input type="checkbox" name="aktif"${u.aktif ? " checked" : ""}> Satışta</label>
      <button class="btn btn-ana" type="submit" id="kaydet">${id === "yeni" ? (petshop ? "Onaya gönder" : "Ürünü ekle") : "Kaydet"}</button>
      <div class="mesaj" role="status" id="urun-mesaj"></div>
    </form>
  </div>`);
  const fotoCiz = () => {
    $("#foto-liste").innerHTML = fotolar.map((f, n) => `<div><img src="${esc(f)}" alt="${n + 1}. fotoğraf"><button type="button" data-sil="${n}" aria-label="${n + 1}. fotoğrafı kaldır">×</button></div>`).join("");
    $$("[data-sil]").forEach(b => b.onclick = () => { fotolar.splice(+b.dataset.sil, 1); fotoCiz(); });
  };
  fotoCiz();
  $("#foto-sec").onchange = async e => {
    const m = $("#urun-mesaj"); $("#kaydet").disabled = true; mesaj(m, "Fotoğraflar yükleniyor…");
    try { for (const d of [...e.target.files].slice(0, 8)) { fotolar.push(await magazaFotosuYukle(d, petshop ? `satici/${S.kullanici.id}` : "urunler")); fotoCiz(); } m.textContent = ""; m.className = "mesaj"; }
    catch (err) { mesaj(m, hataMetni(err), true); }
    $("#kaydet").disabled = false; e.target.value = "";
  };
  $("#urun-form").onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(e.target);
    const kayit = {
      ad: fd.get("ad").trim(), kategori: fd.get("kategori"), tur: fd.get("tur"), marka: fd.get("marka").trim() || null,
      fiyat: Number(fd.get("fiyat")), eski_fiyat: fd.get("eski_fiyat") ? Number(fd.get("eski_fiyat")) : null,
      stok: parseInt(fd.get("stok"), 10) || 0, aciklama: fd.get("aciklama").trim() || null, fotolar, aktif: !!fd.get("aktif"),
    };
    if (petshop && id === "yeni") kayit.satici_id = S.satici.id;
    $("#kaydet").disabled = true;
    const r = id === "yeni" ? await sb.from("urunler").insert(kayit).select("id, onay").single() : await sb.from("urunler").update(kayit).eq("id", id).select("id, onay").single();
    $("#kaydet").disabled = false;
    if (r.error) return mesaj($("#urun-mesaj"), hataMetni(r.error), true);
    bildir(petshop && r.data.onay === "bekliyor" ? "Kaydedildi. Ürün yönetici onayından sonra mağazada görünecek." : id === "yeni" ? "Ürün eklendi." : "Ürün kaydedildi.");
    git(geri);
  };
}

// ---------- yönetim: siparişler ----------
async function ySiparisler() {
  if (!yonetici()) return;
  meta("Yönetim · Siparişler");
  const filtre = new URLSearchParams(location.search).get("durum") || "acik";
  let s = sb.from("magaza_siparisleri").select("*").order("created_at", { ascending: false }).limit(100);
  if (filtre === "acik") s = s.in("durum", ["odendi", "hazirlaniyor"]);
  else if (SIPARIS_DURUM[filtre]) s = s.eq("durum", filtre);
  const [{ data: l, error }, saticiListe] = await Promise.all([s, sb.from("saticilar").select("id, magaza_adi")]);
  if (error) throw error;
  const satAd = id => { const x = (saticiListe.data || []).find(v => v.id === id); return x ? x.magaza_adi : "Petshop"; };
  const hap = (k, a) => `<a class="hap" href="/yonetim/siparisler${k === "acik" ? "" : "?durum=" + k}"${filtre === k ? ' aria-current="page"' : ""}>${a}</a>`;
  sayfa(`<div class="kap dar">
    <h1 style="font-size:36px;font-weight:900;margin-bottom:16px">Yönetim</h1>
    ${yonetimSekmeleri("/yonetim/siparisler")}
    <div class="hap-grup" style="margin-bottom:16px">${hap("acik", "Hazırlanacaklar")}${hap("kargoda", "Kargoda")}${hap("teslim", "Teslim edildi")}${hap("iptal", "İptal")}${hap("tumu", "Tümü")}</div>
    <p class="bilgi" style="margin-bottom:16px">Petshop siparişlerini petshop kendisi hazırlar ve kargolar; sen burada takip edebilir, gerekirse iptal edebilirsin. Petshoplara aktarılacak tutarlar Petshoplar sekmesindedir.</p>
    <section class="kutu">
      ${l.length ? l.map(x => `<form class="satir" data-siparis="${x.id}" style="align-items:flex-start">
        <div class="satir-govde">
          <b>${esc(x.ad)} · ${tl(x.toplam)}</b>
          <span class="bilgi">${x.satici_id ? `Satıcı: <a href="/yonetim/petshop/${x.satici_id}">${esc(satAd(x.satici_id))}</a> · komisyon ${tl(x.komisyon)} · petshopa ${tl(x.satici_hakedis)}${x.hakedis_odendi_at ? " (aktarıldı)" : ""}` : "Sitenin kendi siparişi"}</span>
          <span class="bilgi">${tarih(x.created_at)} · ${esc(x.siparis_no)}</span>
          <span>${esc(x.kalemler.map(k => `${k.ad} × ${k.adet}`).join(", "))}</span>
          <span class="bilgi">${esc(x.telefon)} · ${esc(x.email)}</span>
          <span class="bilgi">${esc(x.adres)}, ${esc(x.ilce || "")} / ${esc(x.il)}</span>
          ${x.kargo_takip ? `<span class="bilgi">Kargo: ${esc(x.kargo_firma || "")} ${esc(x.kargo_takip)}</span>` : ""}
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;min-width:220px">
          <span class="durum d-${x.durum}">${esc(SIPARIS_DURUM[x.durum])}</span>
          ${["bekliyor", "basarisiz"].includes(x.durum) ? "" : `
          <label class="alan">Durum<select name="durum">${secenekler(Object.fromEntries(["odendi", "hazirlaniyor", "kargoda", "teslim", "iptal"].map(k => [k, SIPARIS_DURUM[k]])), x.durum)}</select></label>
          <label class="alan">Kargo firması<input name="kargo_firma" maxlength="40" value="${esc(x.kargo_firma || "")}"></label>
          <label class="alan">Takip no<input name="kargo_takip" maxlength="60" value="${esc(x.kargo_takip || "")}"></label>
          <button class="btn btn-kucuk" type="submit">Kaydet</button>`}
        </div>
      </form>`).join("") : `<p class="bilgi">Bu listede sipariş yok.</p>`}
    </section>
  </div>`);
  $$("[data-siparis]").forEach(f => f.onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(f);
    if (fd.get("durum") === "iptal" && !confirm("Sipariş iptal edilecek. Kart ödemesinin iadesini PayTR panelinden ayrıca yapman gerekir. Devam edilsin mi?")) return;
    const { error: h } = await sb.from("magaza_siparisleri").update({ durum: fd.get("durum"), kargo_firma: fd.get("kargo_firma") || null, kargo_takip: fd.get("kargo_takip") || null }).eq("id", f.dataset.siparis);
    if (h) return bildir(hataMetni(h));
    bildir("Sipariş güncellendi."); ySiparisler();
  });
}

// ---------- yönetim: bağışlar ----------
async function yBagislar() {
  if (!yonetici()) return;
  meta("Yönetim · Bağışlar");
  const [kmp, bg, ozet, a] = await Promise.all([
    sb.from("bagis_kampanyalari").select("*").order("sira").order("created_at", { ascending: false }),
    sb.from("bagislar").select("*, bagis_kampanyalari(baslik)").eq("durum", "odendi").order("created_at", { ascending: false }).limit(100),
    sb.from("bagis_ozet").select("*"),
    ayarlar(),
  ]);
  if (kmp.error) throw kmp.error;
  const toplanan = kid => { const o = (ozet.data || []).find(x => (x.kampanya_id || null) === (kid || null)); return o ? Number(o.toplanan) : 0; };
  const toplam = (ozet.data || []).reduce((t, o) => t + Number(o.toplanan), 0);
  const adet = (ozet.data || []).reduce((t, o) => t + Number(o.adet), 0);
  sayfa(`<div class="kap dar">
    <h1 style="font-size:36px;font-weight:900;margin-bottom:16px">Yönetim</h1>
    ${yonetimSekmeleri("/yonetim/bagislar")}
    <section class="kutu kunye" style="margin-bottom:24px">
      <div><span>Toplanan bağış</span><b style="font-size:24px">${tl(toplam)}</b></div>
      <div><span>Bağış sayısı</span><b style="font-size:24px">${adet}</b></div>
      <div><span>Genel bağış (kampanyasız)</span><b style="font-size:24px">${tl(toplanan(null))}</b></div>
    </section>
    <section class="kutu" style="margin-bottom:24px">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px">
        <h2 style="font-size:22px">Kampanyalar</h2><a class="btn btn-ana btn-kucuk" href="/yonetim/kampanya/yeni">Yeni kampanya</a>
      </div>
      ${kmp.data.length ? kmp.data.map(k => `<div class="satir">
        <div class="satir-govde"><b><a href="/bagis/${k.id}" target="_blank">${esc(k.baslik)}</a></b>
          ${ilerleme(toplanan(k.id), k.hedef ? Number(k.hedef) : 0)}
          ${k.aktif ? "" : `<span class="durum d-kaldirildi">Kapalı</span>`}</div>
        <div class="satir-dugmeler"><a class="btn btn-kucuk" href="/yonetim/kampanya/${k.id}">Düzenle</a></div>
      </div>`).join("") : `<p class="bilgi">Henüz kampanya yok. Kampanya olmadan da genel bağış alınabilir.</p>`}
    </section>
    ${(() => {
      const satir = b => `<div class="satir"><div class="satir-govde">
        <b>${esc(b.ad || "")}${b.gizli ? " (adı gizli)" : ""} · ${tl(b.tutar)}</b>
        <span class="bilgi">${esc(b.bagis_kampanyalari ? b.bagis_kampanyalari.baslik : "Genel bağış")} · ${tarih(b.created_at)} · ${esc(b.email)}</span>
        ${b.mesaj ? `<span class="bilgi">"${esc(b.mesaj)}"</span>` : ""}
      </div><div class="satir-dugmeler">${b.listede
        ? `<span class="durum d-yayinda">Listede</span><button class="btn btn-kucuk" data-listede="${b.id}" data-deger="0">Listeden kaldır</button>`
        : `<button class="btn btn-kucuk btn-ana" data-listede="${b.id}" data-deger="1">Listede göster</button>`}</div></div>`;
      const bek = (bg.data || []).filter(b => !b.listede), gos = (bg.data || []).filter(b => b.listede);
      return `<section class="kutu" style="margin-bottom:24px"><h2 style="font-size:22px;margin-bottom:4px">Listede gösterilmeyi bekleyenler (${bek.length})</h2>
        <p class="bilgi" style="margin-bottom:8px">Bağış tutarı toplama hemen eklenir. Bağışçının adı ve mesajı ise sen onaylayınca bağış sayfasındaki "Son bağışlar" listesinde görünür.</p>
        ${bek.length ? bek.map(satir).join("") : `<p class="bilgi">Bekleyen yok.</p>`}</section>
      <section class="kutu" style="margin-bottom:24px"><h2 style="font-size:22px;margin-bottom:8px">Son bağışlar</h2>
        ${gos.length ? gos.map(satir).join("") : `<p class="bilgi">Henüz bağış yok.</p>`}</section>`;
    })()}
    <form class="kutu form" id="bagis-ayar">
      <h2 style="font-size:22px">Ayarlar</h2>
      <label class="alan">En az bağış tutarı (TL)<input name="en_az_bagis" type="number" min="1" step="1" value="${a.en_az_bagis}" required style="max-width:200px"></label>
      <button class="btn" type="submit" style="align-self:flex-start">Kaydet</button>
    </form>
  </div>`);
  $$("[data-listede]").forEach(b => b.onclick = async () => {
    const { error: h } = await sb.from("bagislar").update({ listede: b.dataset.deger === "1" }).eq("id", b.dataset.listede);
    if (h) return bildir(hataMetni(h));
    bildir(b.dataset.deger === "1" ? "Bağış listede gösteriliyor." : "Bağış listeden kaldırıldı."); yBagislar();
  });
  $("#bagis-ayar").onsubmit = async e => {
    e.preventDefault();
    const { error: h } = await sb.from("ayarlar").upsert({ anahtar: "en_az_bagis", deger: Number(new FormData(e.target).get("en_az_bagis")) });
    if (h) return bildir(hataMetni(h));
    AYAR_ONBELLEK = null; bildir("Kaydedildi.");
  };
}

async function yKampanyaFormu(id) {
  if (!yonetici()) return;
  let k = { aktif: true, sira: 0 };
  if (id !== "yeni") {
    const { data } = await sb.from("bagis_kampanyalari").select("*").eq("id", id).maybeSingle();
    if (!data) { sayfa(`<div class="kap bos-durum"><h1>Kampanya bulunamadı</h1><p><a href="/yonetim/bagislar">Bağışlara dön</a></p></div>`); return; }
    k = data;
  }
  meta(id === "yeni" ? "Yeni kampanya" : "Kampanyayı düzenle");
  let foto = k.foto || null;
  sayfa(`<div class="kap dar">
    <p style="margin:0 0 12px"><a href="/yonetim/bagislar">Bağışlara dön</a></p>
    ${baslikH1(id === "yeni" ? "Yeni bağış kampanyası" : "Kampanyayı düzenle")}
    <form class="kutu form" id="kampanya-form">
      <label class="alan">Başlık<input name="baslik" required maxlength="120" value="${esc(k.baslik || "")}" placeholder="Örn. Kadıköy sokak kedileri kış maması"></label>
      <label class="alan">Açıklama<textarea name="aciklama" maxlength="6000" rows="6" placeholder="Bağışlar neye harcanacak, kimler yürütüyor?">${esc(k.aciklama || "")}</textarea></label>
      <div class="form-izgara">
        <label class="alan">Hedef tutar (TL)<input name="hedef" type="number" min="1" step="1" value="${esc(k.hedef ?? "")}"><small>Boş bırakırsan hedef gösterilmez.</small></label>
        <label class="alan">Sıra<input name="sira" type="number" step="1" value="${esc(k.sira)}"><small>Küçük sayı önce gösterilir.</small></label>
      </div>
      <div class="alan">Kapak fotoğrafı<div class="foto-onizleme" id="foto-liste"></div>
        <label class="btn" style="align-self:flex-start">Fotoğraf seç<input type="file" accept="image/*" id="foto-sec" class="gizli"></label></div>
      <label class="onay"><input type="checkbox" name="aktif"${k.aktif ? " checked" : ""}> Bağış kabul ediyor</label>
      <button class="btn btn-ana" type="submit" id="kaydet">${id === "yeni" ? "Kampanyayı aç" : "Kaydet"}</button>
      <div class="mesaj" role="status" id="k-mesaj"></div>
    </form>
  </div>`);
  const fotoCiz = () => {
    $("#foto-liste").innerHTML = foto ? `<div><img src="${esc(foto)}" alt="Kapak fotoğrafı"><button type="button" id="foto-kaldir" aria-label="Fotoğrafı kaldır">×</button></div>` : "";
    if (foto) $("#foto-kaldir").onclick = () => { foto = null; fotoCiz(); };
  };
  fotoCiz();
  $("#foto-sec").onchange = async e => {
    const m = $("#k-mesaj"); $("#kaydet").disabled = true;
    try { if (e.target.files[0]) { foto = await magazaFotosuYukle(e.target.files[0], "kampanyalar"); fotoCiz(); } }
    catch (err) { mesaj(m, hataMetni(err), true); }
    $("#kaydet").disabled = false; e.target.value = "";
  };
  $("#kampanya-form").onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(e.target);
    const kayit = { baslik: fd.get("baslik").trim(), aciklama: fd.get("aciklama").trim() || null, hedef: fd.get("hedef") ? Number(fd.get("hedef")) : null, sira: parseInt(fd.get("sira"), 10) || 0, foto, aktif: !!fd.get("aktif") };
    const r = id === "yeni" ? await sb.from("bagis_kampanyalari").insert(kayit).select("id").single() : await sb.from("bagis_kampanyalari").update(kayit).eq("id", id).select("id").single();
    if (r.error) return mesaj($("#k-mesaj"), hataMetni(r.error), true);
    bildir("Kampanya kaydedildi."); git("/yonetim/bagislar");
  };
}

// ---------- adresler ----------
ROTALAR.push(
  [/^\/magaza$/, magazaSayfasi],
  [/^\/urun\/([0-9a-f-]{36})$/, urunSayfasi],
  [/^\/sepet$/, sepetSayfasi],
  [/^\/siparis-ver$/, siparisSayfasi],
  [/^\/yonetim\/urunler$/, yUrunler],
  [/^\/yonetim\/urun\/(yeni|[0-9a-f-]{36})$/, yUrunFormu],
  [/^\/yonetim\/siparisler$/, ySiparisler],
);
