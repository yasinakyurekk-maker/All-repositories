// petpatibul.com — yönetim paneli: özet, ilanlar, reklamlar (öne çıkarma onayı), başvurular, şikayetler, üyeler.
// Ürünler, siparişler ve bağışlar magaza.js içindedir. app.js ve magaza.js'ten sonra yüklenir.
"use strict";

const ONAY_DURUM = { bekliyor: "Onayını bekliyor", onaylandi: "Onaylandı", reddedildi: "Reddedildi" };
const SEKMELER = [
  ["/yonetim", "Özet"], ["/yonetim/ilanlar", "İlanlar"], ["/yonetim/reklamlar", "Reklamlar"], ["/yonetim/basvurular", "Başvurular"],
  ["/yonetim/sikayetler", "Şikayetler"], ["/yonetim/uyeler", "Üyeler"], ["/yonetim/urunler", "Ürünler"], ["/yonetim/siparisler", "Siparişler"],
];
function yonetimSekmeleri(aktif) {
  return `<nav class="hap-grup" aria-label="Yönetim bölümleri" style="margin-bottom:24px">${SEKMELER
    .map(([h, a]) => `<a class="hap" href="${h}"${h === aktif ? ' aria-current="page"' : ""}>${a}</a>`).join("")}</nav>`;
}
const yUst = aktif => `<h1 style="font-size:36px;font-weight:900;margin-bottom:16px">Yönetim</h1>${yonetimSekmeleri(aktif)}`;
const h2 = (metin, ek) => `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px"><h2 style="font-size:22px">${metin}</h2>${ek || ""}</div>`;
const kalanGun = s => Math.max(0, Math.ceil((new Date(s).getTime() - Date.now()) / 864e5));
const tarihSaat = s => new Date(s).toLocaleString("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
const sorgu = () => new URLSearchParams(location.search);
const telLink = t => t ? `<a href="tel:${esc(String(t).replace(/[^\d+]/g, ""))}">${esc(t)}</a>` : "";

let UYELER = null;
async function uyeListesi(yenile) {
  if (!UYELER || yenile) {
    const { data, error } = await sb.rpc("uye_listesi");
    if (error) throw error;
    UYELER = data || [];
  }
  return UYELER;
}
const uyeEposta = id => { const u = (UYELER || []).find(x => x.id === id); return u ? u.email : ""; };

// Ortak: bir işlemi yap, hata varsa göster, yoksa mesajı göster ve sayfayı yenile.
async function yap(istek, metin) {
  const { error } = await istek;
  if (error) { bildir(hataMetni(error)); return false; }
  bildir(metin); yonlendir(); return true;
}

// ---------- özet: senin onayını bekleyen her şey ----------
async function yOzet() {
  if (!yonetici()) return;
  meta("Yönetim");
  const say = q => q.then(r => r.count || 0);
  const t = () => ({ count: "exact", head: true });
  const [ilan, reklam, sikayet, siparis, bagis, basvuru, yayinda, vitrin, uyeler] = await Promise.all([
    say(sb.from("ilanlar").select("id", t()).eq("durum", "bekliyor")),
    say(sb.from("odemeler").select("id", t()).eq("durum", "odendi").eq("onay", "bekliyor")),
    say(sb.from("sikayetler").select("id", t()).eq("cozuldu", false)),
    say(sb.from("magaza_siparisleri").select("id", t()).in("durum", ["odendi", "hazirlaniyor"])),
    say(sb.from("bagislar").select("id", t()).eq("durum", "odendi").eq("listede", false)),
    say(sb.from("basvurular").select("id", t()).eq("durum", "yeni")),
    say(sb.from("ilanlar").select("id", t()).eq("durum", "yayinda")),
    say(sb.from("ilanlar").select("id", t()).gt("one_cikan_bitis", new Date().toISOString())),
    uyeListesi(true).then(l => l.length),
  ]);
  const kart = (sayi, ad, yol, acil) => `<a class="kutu ozet-kart${acil && sayi ? " acil" : ""}" href="${yol}"><b>${sayi}</b><span>${ad}</span></a>`;
  const bekleyen = ilan + reklam + sikayet + siparis;
  sayfa(`<div class="kap dar">
    ${yUst("/yonetim")}
    <h2 style="font-size:22px;margin-bottom:4px">Senin onayını bekleyenler</h2>
    <p class="bilgi" style="margin-bottom:16px">${bekleyen ? "Sitede hiçbir şey sen onaylamadan yayına girmez. Bekleyenlere tıklayıp karar verebilirsin." : "Şu an onayını bekleyen bir şey yok."}</p>
    <div class="ozet-izgara" style="margin-bottom:32px">
      ${kart(ilan, "Onay bekleyen ilan", "/yonetim/ilanlar", true)}
      ${kart(reklam, "Ödemesi yapılmış, onay bekleyen reklam", "/yonetim/reklamlar", true)}
      ${kart(sikayet, "Açık şikayet", "/yonetim/sikayetler", true)}
      ${kart(siparis, "Hazırlanacak sipariş", "/yonetim/siparisler", true)}
    </div>
    <h2 style="font-size:22px;margin-bottom:16px">Site geneli</h2>
    <div class="ozet-izgara">
      ${kart(yayinda, "Yayındaki ilan", "/yonetim/ilanlar?durum=yayinda")}
      ${kart(vitrin, "Şu an öne çıkan ilan", "/yonetim/reklamlar")}
      ${kart(basvuru, "Yanıt bekleyen başvuru", "/yonetim/basvurular")}
      ${kart(uyeler, "Üye", "/yonetim/uyeler")}
    </div>
  </div>`);
}

// ---------- ilanlar: tüm ilanlar, her durumda ----------
async function yIlanlar() {
  if (!yonetici()) return;
  meta("Yönetim · İlanlar");
  const p = sorgu(), durum = p.get("durum") || "bekliyor", ara = (p.get("q") || "").trim(), uye = p.get("uye") || "";
  let q = sb.from("ilanlar").select("*").order("created_at", { ascending: false }).limit(100);
  if (ILAN_DURUM[durum]) q = q.eq("durum", durum);
  if (uye) q = q.eq("sahip_id", uye);
  if (ara) q = q.ilike("ad", `%${ara.replace(/[%_,()]/g, "")}%`);
  const [{ data: l, error }] = await Promise.all([q, uyeListesi()]);
  if (error) throw error;
  const hap = (k, a) => { const u = new URLSearchParams({ durum: k }); if (ara) u.set("q", ara); if (uye) u.set("uye", uye); return `<a class="hap" href="/yonetim/ilanlar?${u}"${durum === k ? ' aria-current="page"' : ""}>${a}</a>`; };
  sayfa(`<div class="kap dar">
    ${yUst("/yonetim/ilanlar")}
    <div class="hap-grup" style="margin-bottom:12px">${hap("bekliyor", "Onay bekleyenler")}${hap("yayinda", "Yayında")}${hap("reddedildi", "Reddedilen")}${hap("sahiplendi", "Sahiplenilen")}${hap("kaldirildi", "Kaldırılan")}${hap("tumu", "Tümü")}</div>
    <form class="arama-satir" id="ilan-ara" style="margin-bottom:16px">
      <input name="q" value="${esc(ara)}" placeholder="İlan adına göre ara" aria-label="İlan ara">
      <button class="btn btn-kucuk" type="submit">Ara</button>
      ${uye ? `<span class="bilgi">Üye: ${esc(uyeEposta(uye))} · <a href="/yonetim/ilanlar?durum=${durum}">filtreyi kaldır</a></span>` : ""}
    </form>
    <section class="kutu">
      ${l.length ? l.map(x => `<div class="satir" style="align-items:flex-start">
        <div class="satir-foto">${x.fotolar && x.fotolar[0] ? `<img src="${esc(x.fotolar[0])}" alt="">` : ""}</div>
        <div class="satir-govde">
          <b><a href="/ilan/${x.id}" target="_blank">${esc(x.ad)}</a></b>
          <span class="bilgi">${esc(KAT[x.kategori])} · ${esc(TUR[x.tur])} · ${esc(x.il)}${x.ilce ? " / " + esc(x.ilce) : ""} · ${(x.fotolar || []).length} fotoğraf · ${tarih(x.created_at)}</span>
          <span class="bilgi">İlan sahibi: <a href="/yonetim/uyeler?q=${encodeURIComponent(uyeEposta(x.sahip_id))}">${esc(uyeEposta(x.sahip_id) || "bilinmiyor")}</a></span>
          ${x.aciklama ? `<span class="bilgi" style="white-space:pre-line">${esc(x.aciklama.slice(0, 300))}</span>` : ""}
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span class="durum d-${x.durum}">${esc(ILAN_DURUM[x.durum])}</span>
            ${oneCikan(x) ? `<span class="durum d-bekliyor">Öne çıkan · ${tarih(x.one_cikan_bitis)}'e kadar</span>` : ""}
          </div>
          ${x.red_notu ? `<span class="bilgi">Ret notu: ${esc(x.red_notu)}</span>` : ""}
        </div>
        <div class="satir-dugmeler" style="flex-direction:column;align-items:stretch;min-width:200px">
          ${x.durum === "bekliyor" ? `<button class="btn btn-kucuk btn-ana" data-ilan="${x.id}" data-yap="yayinda">Onayla ve yayınla</button><button class="btn btn-kucuk" data-ilan="${x.id}" data-yap="reddedildi">Reddet</button>` : ""}
          ${x.durum === "yayinda" ? `<button class="btn btn-kucuk" data-ilan="${x.id}" data-yap="kaldirildi">Yayından kaldır</button>` : ""}
          ${["reddedildi", "kaldirildi"].includes(x.durum) ? `<button class="btn btn-kucuk" data-ilan="${x.id}" data-yap="yayinda">Yayına al</button>` : ""}
          <a class="btn btn-kucuk" href="/ilan-duzenle/${x.id}">Düzenle</a>
          <form class="vitrin-form" data-vitrin="${x.id}"><input name="gun" type="number" min="1" max="365" value="7" aria-label="Gün"><button class="btn btn-kucuk btn-vitrin" type="submit">${oneCikan(x) ? "Gün ekle" : "Öne çıkar"}</button></form>
          ${oneCikan(x) ? `<button class="btn btn-kucuk" data-vitrin-bitir="${x.id}">Öne çıkarmayı bitir</button>` : ""}
          <button class="btn btn-kucuk btn-sil" data-ilan-sil="${x.id}">Kalıcı sil</button>
        </div>
      </div>`).join("") : `<p class="bilgi">Bu listede ilan yok.</p>`}
    </section>
  </div>`);
  $("#ilan-ara").onsubmit = e => { e.preventDefault(); const u = new URLSearchParams({ durum }); const v = new FormData(e.target).get("q").trim(); if (v) u.set("q", v); if (uye) u.set("uye", uye); git("/yonetim/ilanlar?" + u); };
  ilanDugmeleri(l);
}
function ilanDugmeleri(l) {
  $$("[data-ilan]").forEach(b => b.onclick = async () => {
    const d = b.dataset.yap, deg = { durum: d };
    if (d === "reddedildi") { const not = prompt("Ret nedeni (ilan sahibi görecek):"); if (not === null) return; deg.red_notu = not || null; }
    if (d === "yayinda") deg.red_notu = null;
    if (d === "kaldirildi" && !confirm("İlan yayından kaldırılsın mı?")) return;
    await yap(sb.from("ilanlar").update(deg).eq("id", b.dataset.ilan), { yayinda: "İlan yayında.", reddedildi: "İlan reddedildi.", kaldirildi: "İlan kaldırıldı." }[d]);
  });
  $$("[data-vitrin]").forEach(f => f.onsubmit = async e => {
    e.preventDefault();
    const gun = parseInt(new FormData(f).get("gun"), 10);
    if (!(gun >= 1 && gun <= 365)) return bildir("Süre 1 ile 365 gün arasında olmalı.");
    const x = l.find(i => i.id === f.dataset.vitrin);
    const bas = oneCikan(x) ? new Date(x.one_cikan_bitis).getTime() : Date.now();
    await yap(sb.from("ilanlar").update({ one_cikan_bitis: new Date(bas + gun * 864e5).toISOString() }).eq("id", x.id), `İlan ${gun} gün öne çıkarıldı.`);
  });
  $$("[data-vitrin-bitir]").forEach(b => b.onclick = async () => {
    if (!confirm("Öne çıkarma şimdi bitirilsin mi?")) return;
    await yap(sb.from("ilanlar").update({ one_cikan_bitis: null }).eq("id", b.dataset.vitrinBitir), "Öne çıkarma bitirildi.");
  });
  $$("[data-ilan-sil]").forEach(b => b.onclick = async () => {
    if (!confirm("İlan, başvuruları ve şikayetleriyle birlikte kalıcı olarak silinecek. Emin misin?")) return;
    await yap(sb.from("ilanlar").delete().eq("id", b.dataset.ilanSil), "İlan silindi.");
  });
}

// ---------- reklamlar: ödeme yapanı gör, süreyi belirle, onayla ----------
async function yReklamlar() {
  if (!yonetici()) return;
  meta("Yönetim · Reklamlar");
  const [bek, aktif, pak, gec] = await Promise.all([
    sb.from("odemeler").select("*, ilanlar(id, ad, durum, il, fotolar, one_cikan_bitis), paketler(ad)").eq("durum", "odendi").eq("onay", "bekliyor").order("created_at", { ascending: true }),
    sb.from("ilanlar").select("*").gt("one_cikan_bitis", new Date().toISOString()).order("one_cikan_bitis", { ascending: true }),
    sb.from("paketler").select("*").order("sira"),
    sb.from("odemeler").select("*, ilanlar(id, ad), paketler(ad)").neq("durum", "bekliyor").order("created_at", { ascending: false }).limit(50),
    uyeListesi(),
  ]);
  if (bek.error) throw bek.error;
  const odemeDurumu = o => o.durum !== "odendi" ? ODEME_DURUM[o.durum] : ONAY_DURUM[o.onay] + (o.onay === "onaylandi" && o.onaylanan_gun ? ` · ${o.onaylanan_gun} gün` : "");
  const odemeSinifi = o => o.durum !== "odendi" ? o.durum : { bekliyor: "bekliyor", onaylandi: "yayinda", reddedildi: "reddedildi" }[o.onay];
  sayfa(`<div class="kap dar">
    ${yUst("/yonetim/reklamlar")}
    <section class="kutu" style="margin-bottom:24px">
      ${h2(`Onayını bekleyen ödemeler (${bek.data.length})`)}
      <p class="bilgi" style="margin-bottom:8px">Ödeme alındı ama ilan sen onaylayana kadar öne çıkmaz. Süreyi istediğin gibi değiştirebilirsin; süre onayladığın andan başlar. Reddedersen ücreti PayTR Mağaza Paneli'nden iade etmeyi unutma.</p>
      ${bek.data.length ? bek.data.map(o => { const i = o.ilanlar || {}; return `<form class="satir reklam-onay" data-odeme="${o.id}" style="align-items:flex-start">
        <div class="satir-foto">${i.fotolar && i.fotolar[0] ? `<img src="${esc(i.fotolar[0])}" alt="">` : ""}</div>
        <div class="satir-govde">
          <b>${i.id ? `<a href="/ilan/${i.id}" target="_blank">${esc(i.ad)}</a>` : "Silinmiş ilan"} ${i.durum ? `<span class="durum d-${i.durum}">${esc(ILAN_DURUM[i.durum])}</span>` : ""}</b>
          <span><b>${esc(o.paketler ? o.paketler.ad : o.paket_kod)}</b> · ${tl(o.tutar)} · ${tarihSaat(o.odendi_at || o.created_at)}</span>
          <dl class="odeyen">
            <dt>Ödeyen</dt><dd>${esc(o.ad || "")}</dd>
            <dt>Telefon</dt><dd>${telLink(o.telefon)}</dd>
            <dt>E-posta</dt><dd>${esc(o.email || uyeEposta(o.sahip_id))}</dd>
            <dt>Adres</dt><dd>${esc(o.adres || "")}</dd>
            <dt>Sipariş no</dt><dd>${esc(o.siparis_no)}</dd>
          </dl>
          ${i.one_cikan_bitis && oneCikan(i) ? `<span class="bilgi">Bu ilan zaten ${tarih(i.one_cikan_bitis)} tarihine kadar öne çıkıyor; onaylarsan süre bunun üstüne eklenir.</span>` : ""}
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;min-width:220px">
          <label class="alan">Kaç gün öne çıksın?<input name="gun" type="number" min="1" max="365" value="${o.gun}" required><small>Paket: ${o.gun} gün</small></label>
          ${i.durum === "bekliyor" ? `<label class="onay"><input type="checkbox" name="yayinla" checked> İlanı da onaylayıp yayınla</label>` : ""}
          <button class="btn btn-kucuk btn-ana" type="submit">Onayla ve öne çıkar</button>
          <label class="alan">Ret notu (isteğe bağlı)<input name="not" maxlength="200"></label>
          <button class="btn btn-kucuk" type="button" data-reddet="${o.id}">Reddet</button>
        </div>
      </form>`; }).join("") : `<p class="bilgi">Onay bekleyen ödeme yok.</p>`}
    </section>
    <section class="kutu" style="margin-bottom:24px">
      ${h2(`Şu an öne çıkan ilanlar (${(aktif.data || []).length})`)}
      <p class="bilgi" style="margin-bottom:8px">Bitiş tarihini değiştirebilir ya da hemen bitirebilirsin. Ödemesiz öne çıkarmak için İlanlar sekmesini kullan.</p>
      ${(aktif.data || []).length ? aktif.data.map(x => `<form class="satir" data-bitis="${x.id}">
        <div class="satir-govde"><b><a href="/ilan/${x.id}" target="_blank">${esc(x.ad)}</a></b>
          <span class="bilgi">${esc(x.il)} · ${esc(uyeEposta(x.sahip_id))} · ${kalanGun(x.one_cikan_bitis)} gün kaldı</span></div>
        <label class="alan" style="flex-direction:row;align-items:center;gap:8px">Bitiş<input name="bitis" type="date" value="${new Date(x.one_cikan_bitis).toISOString().slice(0, 10)}" required></label>
        <div class="satir-dugmeler"><button class="btn btn-kucuk" type="submit">Kaydet</button><button class="btn btn-kucuk" type="button" data-vitrin-bitir="${x.id}">Bitir</button></div>
      </form>`).join("") : `<p class="bilgi">Şu an öne çıkan ilan yok.</p>`}
    </section>
    <section class="kutu" style="margin-bottom:24px">
      ${h2("Öne çıkarma paketleri")}
      ${(pak.data || []).map(p => `<form class="satir paket-satir" data-paket="${esc(p.kod)}">
        <label class="alan">Paket adı<input name="ad" required maxlength="60" value="${esc(p.ad)}"></label>
        <label class="alan">Gün<input name="gun" type="number" min="1" max="365" required value="${esc(p.gun)}"></label>
        <label class="alan">Fiyat (TL)<input name="fiyat" type="number" min="1" step="0.01" required value="${esc(p.fiyat)}"></label>
        <label class="onay"><input type="checkbox" name="aktif"${p.aktif ? " checked" : ""}> Satışta</label>
        <button class="btn btn-kucuk" type="submit">Kaydet</button>
      </form>`).join("")}
      <form class="satir paket-satir" id="yeni-paket">
        <label class="alan">Yeni paket adı<input name="ad" required maxlength="60" placeholder="Örn. 14 gün öne çıkar"></label>
        <label class="alan">Gün<input name="gun" type="number" min="1" max="365" required></label>
        <label class="alan">Fiyat (TL)<input name="fiyat" type="number" min="1" step="0.01" required></label>
        <button class="btn btn-kucuk btn-ana" type="submit">Paket ekle</button>
      </form>
    </section>
    <section class="kutu">
      ${h2("Ödeme geçmişi")}
      ${(gec.data || []).length ? gec.data.map(o => `<div class="satir"><div class="satir-govde">
          <b>${o.ilanlar ? `<a href="/ilan/${o.ilanlar.id}" target="_blank">${esc(o.ilanlar.ad)}</a>` : "Silinmiş ilan"} · ${tl(o.tutar)}</b>
          <span class="bilgi">${esc(o.ad || uyeEposta(o.sahip_id))}${o.telefon ? " · " + telLink(o.telefon) : ""} · ${esc(o.paketler ? o.paketler.ad : o.paket_kod)} · ${tarih(o.created_at)} · ${esc(o.siparis_no)}</span>
          ${o.onay_notu ? `<span class="bilgi">Not: ${esc(o.onay_notu)}</span>` : ""}
        </div><span class="durum d-${odemeSinifi(o)}">${esc(odemeDurumu(o))}</span></div>`).join("") : `<p class="bilgi">Henüz ödeme yok.</p>`}
    </section>
  </div>`);

  $$("[data-odeme]").forEach(f => f.onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(f), gun = parseInt(fd.get("gun"), 10);
    if (!confirm(`İlan ${gun} gün öne çıkarılacak. Onaylıyor musun?`)) return;
    await yap(sb.rpc("reklam_onayla", { p_odeme: f.dataset.odeme, p_gun: gun, p_yayinla: !!fd.get("yayinla") }), `Onaylandı. İlan ${gun} gün öne çıkıyor.`);
  });
  $$("[data-reddet]").forEach(b => b.onclick = async () => {
    const f = b.closest("form");
    if (!confirm("Ödeme reddedilecek ve ilan öne çıkmayacak. Ücreti PayTR panelinden iade etmen gerekir. Devam edilsin mi?")) return;
    await yap(sb.rpc("reklam_reddet", { p_odeme: f.dataset.odeme, p_not: new FormData(f).get("not") || null }), "Ödeme reddedildi. İadeyi PayTR panelinden yapmayı unutma.");
  });
  $$("[data-bitis]").forEach(f => f.onsubmit = async e => {
    e.preventDefault(); const g = new FormData(f).get("bitis");
    const bitis = new Date(g + "T23:59:00");
    if (bitis <= new Date()) return bildir("Bitiş tarihi bugünden sonra olmalı. Hemen bitirmek için Bitir'e bas.");
    await yap(sb.from("ilanlar").update({ one_cikan_bitis: bitis.toISOString() }).eq("id", f.dataset.bitis), "Bitiş tarihi güncellendi.");
  });
  $$("[data-vitrin-bitir]").forEach(b => b.onclick = async () => {
    if (!confirm("Öne çıkarma şimdi bitirilsin mi?")) return;
    await yap(sb.from("ilanlar").update({ one_cikan_bitis: null }).eq("id", b.dataset.vitrinBitir), "Öne çıkarma bitirildi.");
  });
  const paketDeger = fd => ({ ad: fd.get("ad").trim(), gun: parseInt(fd.get("gun"), 10), fiyat: Number(fd.get("fiyat")) });
  $$("[data-paket]").forEach(f => f.onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(f);
    await yap(sb.from("paketler").update({ ...paketDeger(fd), aktif: !!fd.get("aktif") }).eq("kod", f.dataset.paket), "Paket güncellendi.");
  });
  $("#yeni-paket").onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(e.target), d = paketDeger(fd);
    const sira = Math.max(0, ...(pak.data || []).map(p => p.sira)) + 1;
    await yap(sb.from("paketler").insert({ ...d, kod: "vitrin" + d.gun + "-" + Date.now().toString(36), sira, aktif: true }), "Paket eklendi.");
  };
}

// ---------- başvurular: sitedeki tüm sahiplenme başvuruları ----------
async function yBasvurular() {
  if (!yonetici()) return;
  meta("Yönetim · Başvurular");
  const durum = sorgu().get("durum") || "tumu";
  let q = sb.from("basvurular").select("*, ilanlar(id, ad, sahip_id)").order("created_at", { ascending: false }).limit(100);
  if (BASVURU_DURUM[durum]) q = q.eq("durum", durum);
  const [{ data: l, error }] = await Promise.all([q, uyeListesi()]);
  if (error) throw error;
  const hap = (k, a) => `<a class="hap" href="/yonetim/basvurular${k === "tumu" ? "" : "?durum=" + k}"${durum === k ? ' aria-current="page"' : ""}>${a}</a>`;
  sayfa(`<div class="kap dar">
    ${yUst("/yonetim/basvurular")}
    <div class="hap-grup" style="margin-bottom:16px">${hap("tumu", "Tümü")}${hap("yeni", "Yanıt bekleyen")}${hap("kabul", "Kabul edilen")}${hap("red", "Reddedilen")}</div>
    <section class="kutu">
      <p class="bilgi" style="margin-bottom:8px">Başvurulara normalde ilan sahibi karar verir. Gerekirse buradan sen de karar verebilir ya da uygunsuz başvuruyu silebilirsin.</p>
      ${l.length ? l.map(g => `<div class="satir" style="align-items:flex-start"><div class="satir-govde">
          <b>${esc(g.ad)} → ${g.ilanlar ? `<a href="/ilan/${g.ilanlar.id}" target="_blank">${esc(g.ilanlar.ad)}</a>` : "Silinmiş ilan"}</b>
          <span class="bilgi">Başvuran: ${esc(uyeEposta(g.gonderen_id))} · ${telLink(g.telefon)}${g.il ? " · " + esc(g.il) : ""}${g.ev_tipi ? " · " + esc(g.ev_tipi) : ""} · ${tarih(g.created_at)}</span>
          ${g.ilanlar ? `<span class="bilgi">İlan sahibi: ${esc(uyeEposta(g.ilanlar.sahip_id))}</span>` : ""}
          ${g.mesaj ? `<span style="white-space:pre-line">${esc(g.mesaj)}</span>` : ""}
          <span class="durum d-${g.durum}">${esc(BASVURU_DURUM[g.durum])}</span>
        </div>
        <div class="satir-dugmeler">
          ${g.durum !== "kabul" ? `<button class="btn btn-kucuk" data-basvuru="${g.id}" data-karar="kabul">Kabul</button>` : ""}
          ${g.durum !== "red" ? `<button class="btn btn-kucuk" data-basvuru="${g.id}" data-karar="red">Reddet</button>` : ""}
          <button class="btn btn-kucuk btn-sil" data-basvuru-sil="${g.id}">Sil</button>
        </div></div>`).join("") : `<p class="bilgi">Bu listede başvuru yok.</p>`}
    </section>
  </div>`);
  $$("[data-basvuru]").forEach(b => b.onclick = () => yap(sb.from("basvurular").update({ durum: b.dataset.karar }).eq("id", b.dataset.basvuru), "Başvuru güncellendi."));
  $$("[data-basvuru-sil]").forEach(b => b.onclick = async () => {
    if (!confirm("Başvuru kalıcı olarak silinsin mi?")) return;
    await yap(sb.from("basvurular").delete().eq("id", b.dataset.basvuruSil), "Başvuru silindi.");
  });
}

// ---------- şikayetler ----------
async function ySikayetler() {
  if (!yonetici()) return;
  meta("Yönetim · Şikayetler");
  const tumu = sorgu().get("durum") === "tumu";
  let q = sb.from("sikayetler").select("*, ilanlar(id, ad, durum, sahip_id)").order("created_at", { ascending: false }).limit(100);
  if (!tumu) q = q.eq("cozuldu", false);
  const [{ data: l, error }] = await Promise.all([q, uyeListesi()]);
  if (error) throw error;
  sayfa(`<div class="kap dar">
    ${yUst("/yonetim/sikayetler")}
    <div class="hap-grup" style="margin-bottom:16px"><a class="hap" href="/yonetim/sikayetler"${tumu ? "" : ' aria-current="page"'}>Açık</a><a class="hap" href="/yonetim/sikayetler?durum=tumu"${tumu ? ' aria-current="page"' : ""}>Tümü</a></div>
    <section class="kutu">
      ${l.length ? l.map(s => `<div class="satir" style="align-items:flex-start"><div class="satir-govde">
          <b>${s.ilanlar ? `<a href="/ilan/${s.ilanlar.id}" target="_blank">${esc(s.ilanlar.ad)}</a> <span class="durum d-${s.ilanlar.durum}">${esc(ILAN_DURUM[s.ilanlar.durum])}</span>` : "Silinmiş ilan"}</b>
          <span>${esc(s.neden)}</span>${s.aciklama ? `<span class="bilgi">${esc(s.aciklama)}</span>` : ""}
          <span class="bilgi">Şikayet eden: ${esc(uyeEposta(s.gonderen_id))} · ${tarih(s.created_at)}${s.ilanlar ? " · İlan sahibi: " + esc(uyeEposta(s.ilanlar.sahip_id)) : ""}</span>
          ${s.cozuldu ? `<span class="durum d-yayinda">Çözüldü</span>` : ""}
        </div>
        <div class="satir-dugmeler">
          ${s.ilanlar && s.ilanlar.durum === "yayinda" ? `<button class="btn btn-kucuk" data-kaldir="${s.ilanlar.id}" data-sikayet="${s.id}">İlanı kaldır</button>` : ""}
          ${s.ilanlar ? `<a class="btn btn-kucuk" href="/yonetim/uyeler?q=${encodeURIComponent(uyeEposta(s.ilanlar.sahip_id))}">İlan sahibini gör</a>` : ""}
          ${s.cozuldu ? "" : `<button class="btn btn-kucuk" data-coz="${s.id}">Çözüldü</button>`}
        </div></div>`).join("") : `<p class="bilgi">${tumu ? "Hiç şikayet yok." : "Açık şikayet yok."}</p>`}
    </section>
  </div>`);
  $$("[data-kaldir]").forEach(b => b.onclick = async () => {
    if (!confirm("İlan yayından kaldırılsın ve şikayet kapatılsın mı?")) return;
    const { error } = await sb.from("ilanlar").update({ durum: "kaldirildi" }).eq("id", b.dataset.kaldir);
    if (error) return bildir(hataMetni(error));
    await yap(sb.from("sikayetler").update({ cozuldu: true }).eq("id", b.dataset.sikayet), "İlan kaldırıldı, şikayet kapatıldı.");
  });
  $$("[data-coz]").forEach(b => b.onclick = () => yap(sb.from("sikayetler").update({ cozuldu: true }).eq("id", b.dataset.coz), "Şikayet kapatıldı."));
}

// ---------- üyeler: engelle, yönetici yap ----------
async function yUyeler() {
  if (!yonetici()) return;
  meta("Yönetim · Üyeler");
  const ara = (sorgu().get("q") || "").trim().toLocaleLowerCase("tr");
  const hepsi = await uyeListesi(true);
  const l = ara ? hepsi.filter(u => (u.email || "").toLowerCase().includes(ara)) : hepsi;
  const ben = (S.kullanici.email || "").toLowerCase();
  sayfa(`<div class="kap dar">
    ${yUst("/yonetim/uyeler")}
    <form class="arama-satir" id="uye-ara" style="margin-bottom:16px">
      <input name="q" value="${esc(ara)}" placeholder="E-postaya göre ara" aria-label="Üye ara">
      <button class="btn btn-kucuk" type="submit">Ara</button>
      <span class="bilgi">${hepsi.length} üye · ${hepsi.filter(u => u.engelli).length} engelli</span>
    </form>
    <section class="kutu">
      ${l.length ? l.map(u => `<div class="satir" style="align-items:flex-start"><div class="satir-govde">
          <b>${esc(u.email)}</b>
          <span class="bilgi">Üyelik: ${tarih(u.created_at)}${u.son_giris ? " · Son giriş: " + tarih(u.son_giris) : ""} · <a href="/yonetim/ilanlar?durum=tumu&uye=${u.id}">${u.ilan_sayisi} ilan</a></span>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${u.yonetici ? `<span class="durum d-sahiplendi">Yönetici</span>` : ""}
            ${u.engelli ? `<span class="durum d-reddedildi">Engelli${u.engel_nedeni ? ": " + esc(u.engel_nedeni) : ""}</span>` : ""}
          </div>
        </div>
        <div class="satir-dugmeler" style="flex-direction:column;align-items:stretch;min-width:220px">
          ${u.engelli ? `<button class="btn btn-kucuk" data-engel-kaldir="${u.id}">Engeli kaldır</button>`
            : u.email.toLowerCase() === ben ? "" : `<form data-engelle="${u.id}" style="display:flex;flex-direction:column;gap:6px">
              <input name="neden" maxlength="120" placeholder="Engelleme nedeni" aria-label="Engelleme nedeni">
              <label class="onay"><input type="checkbox" name="kaldir" checked> İlanlarını da kaldır</label>
              <button class="btn btn-kucuk btn-sil" type="submit">Engelle</button></form>`}
          ${u.email.toLowerCase() === ben ? `<span class="bilgi">Bu sensin</span>`
            : u.yonetici ? `<button class="btn btn-kucuk" data-yonetici-cikar="${esc(u.email.toLowerCase())}">Yöneticilikten çıkar</button>`
            : `<button class="btn btn-kucuk" data-yonetici-yap="${esc(u.email.toLowerCase())}">Yönetici yap</button>`}
        </div></div>`).join("") : `<p class="bilgi">Üye bulunamadı.</p>`}
    </section>
  </div>`);
  $("#uye-ara").onsubmit = e => { e.preventDefault(); const v = new FormData(e.target).get("q").trim(); git("/yonetim/uyeler" + (v ? "?q=" + encodeURIComponent(v) : "")); };
  $$("[data-engelle]").forEach(f => f.onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(f);
    if (!confirm("Üye engellenecek: ilan veremeyecek, başvuru ve şikayet gönderemeyecek. Devam edilsin mi?")) return;
    await yap(sb.rpc("uye_engelle", { p_uid: f.dataset.engelle, p_engelle: true, p_neden: fd.get("neden") || null, p_ilanlari_kaldir: !!fd.get("kaldir") }), "Üye engellendi.");
  });
  $$("[data-engel-kaldir]").forEach(b => b.onclick = () => yap(sb.rpc("uye_engelle", { p_uid: b.dataset.engelKaldir, p_engelle: false }), "Engel kaldırıldı. Kaldırılan ilanları İlanlar sekmesinden geri yayına alabilirsin."));
  $$("[data-yonetici-yap]").forEach(b => b.onclick = async () => {
    if (!confirm(`${b.dataset.yoneticiYap} yönetici olacak ve tüm paneli görecek. Emin misin?`)) return;
    await yap(sb.from("yoneticiler").insert({ email: b.dataset.yoneticiYap }), "Yönetici eklendi.");
  });
  $$("[data-yonetici-cikar]").forEach(b => b.onclick = async () => {
    if (!confirm(`${b.dataset.yoneticiCikar} yöneticilikten çıkarılsın mı?`)) return;
    await yap(sb.from("yoneticiler").delete().eq("email", b.dataset.yoneticiCikar), "Yöneticilikten çıkarıldı.");
  });
}

ROTALAR.push(
  [/^\/yonetim$/, yOzet],
  [/^\/yonetim\/ilanlar$/, yIlanlar],
  [/^\/yonetim\/reklamlar$/, yReklamlar],
  [/^\/yonetim\/basvurular$/, yBasvurular],
  [/^\/yonetim\/sikayetler$/, ySikayetler],
  [/^\/yonetim\/uyeler$/, yUyeler],
);
