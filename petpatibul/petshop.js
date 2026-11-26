// petpatibul.com — petshoplar (pazaryeri satıcıları): başvuru, petshop paneli, herkese açık petshop sayfası,
// yönetimde petshop onayı ve petshoplara aktarılacak tutarlar (hakediş).
// app.js, magaza.js ve yonetim.js'ten sonra yüklenir.
"use strict";

const SATICI_DURUM = { bekliyor: "Onay bekliyor", onaylandi: "Onaylandı", reddedildi: "Reddedildi", askida: "Askıya alındı" };
SEKMELER.splice(SEKMELER.findIndex(([h]) => h === "/yonetim/urunler") + 1, 0, ["/yonetim/petshoplar", "Mağazalar"]);

// ---------- oturum: kullanıcının petshop kaydı ----------
S.satici = null;
const _oturumYukle = oturumYukle, _oturumMenusu = oturumMenusu;
oturumYukle = async function () {
  const { data } = await sb.auth.getSession();
  S.satici = null;
  if (data.session) {
    const { data: s } = await sb.from("saticilar").select("*").eq("sahip_id", data.session.user.id).maybeSingle();
    S.satici = s || null;
  }
  return _oturumYukle();
};
oturumMenusu = function () {
  _oturumMenusu();
  if (S.kullanici && S.satici && S.satici.durum === "onaylandi") {
    $("#oturum-alani").insertAdjacentHTML("afterbegin", `<a href="/petshop-paneli">Petshop paneli</a>`);
  }
};

const IBAN_DUZ = v => String(v || "").replace(/\s+/g, "").toUpperCase();
const ibanGoster = v => v ? IBAN_DUZ(v).replace(/(.{4})/g, "$1 ").trim() : "";
const yuzde = n => `%${Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`;

// Hesabım sayfasının altında gösterilir.
function petshopHesapKutusu() {
  const s = S.satici;
  if (!s) return `<section class="kutu petshop-davet" style="margin-bottom:24px"><div><b>Petshop musun?</b><span class="bilgi">Ürünlerini petpatibul mağazasında sat.</span></div><a class="btn" href="/petshop-ol">Mağazada satış yap</a></section>`;
  return `<section class="kutu petshop-davet" style="margin-bottom:24px"><div><b>${esc(s.magaza_adi)}</b><span class="bilgi">Petshop başvurun: ${esc(SATICI_DURUM[s.durum])}</span></div>
    <a class="btn${s.durum === "onaylandi" ? " btn-ana" : ""}" href="${s.durum === "onaylandi" ? "/petshop-paneli" : "/petshop-ol"}">${s.durum === "onaylandi" ? "Petshop paneli" : "Başvuruyu gör"}</a></section>`;
}

// Petshop panelindeki sayfalar için: giriş yapılmış ve petshop onaylanmış olmalı.
async function petshopHazir() {
  if (girisGerekli()) return false;
  if (!S.satici || S.satici.durum !== "onaylandi") { git("/petshop-ol", true); return false; }
  return true;
}

// ---------- petshop bilgileri formu (başvuru ve düzenleme ortak) ----------
function saticiFormu(s, yeni) {
  return `<form class="kutu form" id="satici-form">
    <h2 style="font-size:22px">Petshop bilgileri</h2>
    <div class="form-izgara">
      <label class="alan">Petshop adı<input name="magaza_adi" required minlength="2" maxlength="80" value="${esc(s.magaza_adi || "")}"><small>Mağazada ürünlerinin yanında görünür.</small></label>
      <label class="alan">Yetkili adı soyadı<input name="yetkili" required minlength="2" maxlength="80" value="${esc(s.yetkili || "")}" autocomplete="name"></label>
      <label class="alan">Telefon<input name="telefon" type="tel" required minlength="10" maxlength="20" value="${esc(s.telefon || "")}" autocomplete="tel"><small>Petshop sayfanda müşterilere görünür.</small></label>
      <label class="alan">E-posta<input name="email" type="email" required maxlength="120" value="${esc(s.email || (S.kullanici && S.kullanici.email) || "")}" autocomplete="email"></label>
      <label class="alan">İl<select name="il" required>${ilSecenekleri(s.il || "", "Seç")}</select></label>
      <label class="alan">İlçe<input name="ilce" maxlength="60" value="${esc(s.ilce || "")}"></label>
    </div>
    <label class="alan">Açık adres<textarea name="adres" required maxlength="300" rows="2">${esc(s.adres || "")}</textarea></label>
    <label class="alan">Petshopun hakkında (isteğe bağlı)<textarea name="aciklama" maxlength="2000" rows="3" placeholder="Ne satıyorsunuz, kaç yıldır hizmet veriyorsunuz?">${esc(s.aciklama || "")}</textarea></label>
    <div class="alan">Logo (isteğe bağlı)<div class="foto-onizleme" id="logo-alan"></div>
      <label class="btn" style="align-self:flex-start">Logo seç<input type="file" accept="image/*" id="logo-sec" class="gizli"></label></div>
    <h2 style="font-size:22px;margin-top:8px">Fatura ve ödeme</h2>
    <div class="form-izgara">
      <label class="alan">Vergi dairesi<input name="vergi_dairesi" maxlength="60" value="${esc(s.vergi_dairesi || "")}"></label>
      <label class="alan">Vergi no / TC kimlik no<input name="vergi_no" maxlength="20" inputmode="numeric" value="${esc(s.vergi_no || "")}"></label>
      <label class="alan">IBAN<input name="iban" required maxlength="34" value="${esc(ibanGoster(s.iban))}" placeholder="TR00 0000 0000 0000 0000 0000 00"><small>Satışlarından kalan tutar bu hesaba aktarılır.</small></label>
      <label class="alan">Hesap sahibi<input name="hesap_sahibi" required maxlength="80" value="${esc(s.hesap_sahibi || "")}"></label>
    </div>
    <h2 style="font-size:22px;margin-top:8px">Kargo</h2>
    <div class="form-izgara">
      <label class="alan">Kargo ücreti (TL)<input name="kargo_ucreti" type="number" min="0" step="0.01" required value="${esc(s.kargo_ucreti ?? 49.9)}"></label>
      <label class="alan">Bu tutar ve üstü kargo bedava (TL)<input name="ucretsiz_kargo_esigi" type="number" min="0" step="1" required value="${esc(s.ucretsiz_kargo_esigi ?? 750)}"></label>
    </div>
    ${yeni ? `<label class="onay" style="align-items:flex-start"><input type="checkbox" required style="margin-top:2px"> <span style="font-size:14px;color:var(--yazi2)">Ürünlerimin ve bilgilerimin yönetici onayından geçeceğini, ödemeyi petpatibul'un alıp her satıştan komisyon düşerek kalanını IBAN'ıma aktaracağını ve <a href="/kullanim-kosullari" target="_blank">kullanım koşullarını</a> kabul ediyorum.</span></label>` : ""}
    <button class="btn btn-ana" type="submit" id="satici-kaydet">${yeni ? "Başvuruyu gönder" : "Kaydet"}</button>
    <div class="mesaj" role="status" id="satici-mesaj"></div>
  </form>`;
}
function saticiFormuBagla(s, kayitSonrasi) {
  let logo = s.logo || null;
  const logoCiz = () => {
    $("#logo-alan").innerHTML = logo ? `<div><img src="${esc(logo)}" alt="Logo"><button type="button" id="logo-kaldir" aria-label="Logoyu kaldır">×</button></div>` : "";
    if (logo) $("#logo-kaldir").onclick = () => { logo = null; logoCiz(); };
  };
  logoCiz();
  $("#logo-sec").onchange = async e => {
    const m = $("#satici-mesaj"); $("#satici-kaydet").disabled = true;
    try { if (e.target.files[0]) { logo = await magazaFotosuYukle(e.target.files[0], `satici/${S.kullanici.id}`); logoCiz(); } }
    catch (err) { mesaj(m, hataMetni(err), true); }
    $("#satici-kaydet").disabled = false; e.target.value = "";
  };
  $("#satici-form").onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(e.target), m = $("#satici-mesaj");
    const iban = IBAN_DUZ(fd.get("iban"));
    if (!/^TR\d{24}$/.test(iban)) return mesaj(m, "IBAN TR ile başlamalı ve 26 karakter olmalı.", true);
    const kayit = {
      magaza_adi: fd.get("magaza_adi").trim(), yetkili: fd.get("yetkili").trim(), telefon: fd.get("telefon").trim(), email: fd.get("email").trim(),
      il: fd.get("il"), ilce: (fd.get("ilce") || "").trim() || null, adres: fd.get("adres").trim(), aciklama: fd.get("aciklama").trim() || null, logo,
      vergi_dairesi: fd.get("vergi_dairesi").trim() || null, vergi_no: fd.get("vergi_no").trim() || null, iban, hesap_sahibi: fd.get("hesap_sahibi").trim(),
      kargo_ucreti: Number(fd.get("kargo_ucreti")), ucretsiz_kargo_esigi: Number(fd.get("ucretsiz_kargo_esigi")),
    };
    $("#satici-kaydet").disabled = true;
    const r = s.id ? await sb.from("saticilar").update(kayit).eq("id", s.id).select("*").single()
                   : await sb.from("saticilar").insert({ ...kayit, sahip_id: S.kullanici.id }).select("*").single();
    $("#satici-kaydet").disabled = false;
    if (r.error) return mesaj(m, hataMetni(r.error), true);
    S.satici = r.data; oturumMenusu(); kayitSonrasi(r.data);
  };
}

// ---------- /petshop-ol: başvuru ve başvuru durumu ----------
async function petshopOlSayfasi() {
  meta("Petshop olarak satış yap", "Petshopunun ürünlerini petpatibul.com mağazasında sat. Ödemeyi biz alırız, kalanını hesabına aktarırız.");
  const a = await ayarlar();
  const tanitim = `<div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px">
    ${baslikH1("Petshop olarak satış yap")}
    <div class="adimlar">
      <div class="adim"><span class="no">1</span><b>Başvur</b><span>Petshop, fatura ve IBAN bilgilerini gir.</span></div>
      <div class="adim"><span class="no">2</span><b>Onay</b><span>Ekibimiz başvurunu inceler ve onaylar.</span></div>
      <div class="adim"><span class="no">3</span><b>Ürün ekle</b><span>Panelinden ürünlerini ekle; her ürün kontrol edilip mağazaya çıkar.</span></div>
      <div class="adim"><span class="no">4</span><b>Sat ve kazan</b><span>Müşteri kartla öder, sen kargolarsın. Teslim edilen siparişlerden ${yuzde(a.komisyon_orani ?? 10)} komisyon düşülür, kalanı IBAN'ına aktarılır.</span></div>
    </div></div>`;
  if (!S.kullanici) {
    sayfa(`<div class="kap dar">${tanitim}<div class="kutu bos-durum"><h2>Başvurmak için giriş yap</h2><p>Hesabın yoksa birkaç saniyede oluşturabilirsin.</p><p><a class="btn btn-ana" href="/giris?devam=%2Fpetshop-ol">Giriş yap veya üye ol</a></p></div></div>`);
    return;
  }
  const s = S.satici;
  if (!s) {
    sayfa(`<div class="kap dar">${tanitim}${saticiFormu({}, true)}</div>`);
    saticiFormuBagla({}, () => { bildir("Başvurun alındı."); petshopOlSayfasi(); });
    return;
  }
  const durumKutusu = {
    bekliyor: `<p class="uyari">Başvurun inceleniyor. Onaylanınca bu sayfada ve menüde "Petshop paneli" görünecek. Bu sırada bilgilerini düzeltebilirsin.</p>`,
    onaylandi: `<p class="uyari" style="background:var(--ana-acik)">Petshopun onaylandı. <a href="/petshop-paneli">Petshop paneline git</a></p>`,
    reddedildi: `<p class="uyari">Başvurun reddedildi${s.red_nedeni ? `: ${esc(s.red_nedeni)}` : "."} Bilgilerini düzeltip kaydedersen yeniden incelemeye alınır.</p>`,
    askida: `<p class="uyari">Petshopun askıya alındı${s.red_nedeni ? `: ${esc(s.red_nedeni)}` : "."} Ürünlerin şu an mağazada görünmüyor. Bizimle iletişime geç.</p>`,
  }[s.durum];
  sayfa(`<div class="kap dar">${baslikH1(esc(s.magaza_adi), `Başvuru durumu: ${esc(SATICI_DURUM[s.durum])}`)}${durumKutusu}${s.durum === "onaylandi" ? "" : saticiFormu(s, false)}</div>`);
  if (s.durum !== "onaylandi") saticiFormuBagla(s, () => { bildir("Kaydedildi."); petshopOlSayfasi(); });
}

// ---------- petshop paneli ----------
const panelSekmeleri = aktif => `<nav class="hap-grup" aria-label="Petshop paneli" style="margin-bottom:24px">${[
  ["/petshop-paneli", "Ürünlerim"], ["/petshop-paneli/siparisler", "Siparişler"], ["/petshop-paneli/kazanc", "Kazancım"], ["/petshop-paneli/bilgiler", "Petshop bilgileri"],
].map(([h, a]) => `<a class="hap" href="${h}"${h === aktif ? ' aria-current="page"' : ""}>${a}</a>`).join("")}<a class="hap" href="/petshop/${S.satici.id}" target="_blank">Mağaza sayfamı gör</a></nav>`;
const panelUst = aktif => `<div style="padding-top:32px">${baslikH1(esc(S.satici.magaza_adi), "Petshop paneli")}</div>${panelSekmeleri(aktif)}`;

async function petshopUrunlerim() {
  if (!(await petshopHazir())) return;
  meta("Petshop paneli · Ürünlerim");
  const { data: l, error } = await sb.from("urunler").select("*").eq("satici_id", S.satici.id).order("created_at", { ascending: false });
  if (error) throw error;
  sayfa(`<div class="kap dar">${panelUst("/petshop-paneli")}
    <section class="kutu">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px">
        <h2 style="font-size:22px">Ürünlerim (${l.length})</h2><a class="btn btn-ana btn-kucuk" href="/petshop-paneli/urun/yeni">Yeni ürün ekle</a>
      </div>
      ${l.length ? l.map(u => `<div class="satir">
        <div class="satir-foto">${u.fotolar && u.fotolar[0] ? `<img src="${esc(u.fotolar[0])}" alt="">` : ""}</div>
        <div class="satir-govde"><b><a href="/petshop-paneli/urun/${u.id}">${esc(u.ad)}</a></b>
          <span class="bilgi">${esc(URUN_KAT[u.kategori])} · ${esc(URUN_TUR[u.tur])} · ${tl(u.fiyat)}</span>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span class="durum ${u.onay === "onaylandi" ? "d-yayinda" : u.onay === "bekliyor" ? "d-bekliyor" : "d-red"}">${esc(URUN_ONAY[u.onay])}</span>
            <span class="durum ${u.stok <= 0 ? "d-red" : u.stok < 10 ? "d-bekliyor" : "d-yayinda"}">Stok: ${u.stok}</span>
            ${u.aktif ? "" : `<span class="durum d-kaldirildi">Satışta değil</span>`}
          </div>
          ${u.onay === "reddedildi" && u.red_nedeni ? `<span class="bilgi">Ret nedeni: ${esc(u.red_nedeni)}</span>` : ""}
        </div>
        <div class="satir-dugmeler"><a class="btn btn-kucuk" href="/petshop-paneli/urun/${u.id}">Düzenle</a></div>
      </div>`).join("") : `<p class="bilgi">Henüz ürün eklemedin. İlk ürününü ekle; onaylanınca mağazada görünür.</p>`}
    </section></div>`);
}

async function petshopSiparisleri() {
  if (!(await petshopHazir())) return;
  meta("Petshop paneli · Siparişler");
  const filtre = new URLSearchParams(location.search).get("durum") || "acik";
  let s = sb.from("magaza_siparisleri").select("*").eq("satici_id", S.satici.id).neq("durum", "bekliyor").neq("durum", "basarisiz").order("created_at", { ascending: false }).limit(100);
  if (filtre === "acik") s = s.in("durum", ["odendi", "hazirlaniyor"]);
  else if (SIPARIS_DURUM[filtre]) s = s.eq("durum", filtre);
  const { data: l, error } = await s;
  if (error) throw error;
  const hap = (k, a) => `<a class="hap" href="/petshop-paneli/siparisler${k === "acik" ? "" : "?durum=" + k}"${filtre === k ? ' aria-current="page"' : ""}>${a}</a>`;
  sayfa(`<div class="kap dar">${panelUst("/petshop-paneli/siparisler")}
    <div class="hap-grup" style="margin-bottom:16px">${hap("acik", "Hazırlanacaklar")}${hap("kargoda", "Kargoda")}${hap("teslim", "Teslim edildi")}${hap("iptal", "İptal")}${hap("tumu", "Tümü")}</div>
    <p class="bilgi" style="margin-bottom:16px">Ödemesi alınmış siparişler burada görünür. Ürünü kargoya verince takip numarasını gir ve durumu "Kargoda" yap; müşteri Hesabım sayfasında görür. İptal veya iade gerekirse bizimle iletişime geç.</p>
    <section class="kutu">
      ${l.length ? l.map(x => `<form class="satir" data-p-siparis="${x.id}" style="align-items:flex-start">
        <div class="satir-govde">
          <b>${esc(x.ad)} · ${tl(x.toplam)}</b>
          <span class="bilgi">${tarih(x.created_at)} · ${esc(x.siparis_no)}</span>
          <span>${esc(x.kalemler.map(k => `${k.ad} × ${k.adet}`).join(", "))}</span>
          <span class="bilgi">${esc(x.telefon)}</span>
          <span class="bilgi">${esc(x.adres)}, ${esc(x.ilce || "")} / ${esc(x.il)}</span>
          <span class="bilgi">Komisyon ${tl(x.komisyon)} · sana aktarılacak ${tl(x.satici_hakedis)}${x.hakedis_odendi_at ? " (aktarıldı)" : ""}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;min-width:220px">
          <span class="durum d-${x.durum}">${esc(SIPARIS_DURUM[x.durum])}</span>
          ${["odendi", "hazirlaniyor", "kargoda"].includes(x.durum) ? `
          <label class="alan">Durum<select name="durum">${secenekler(Object.fromEntries([...(x.durum === "odendi" ? ["odendi"] : []), "hazirlaniyor", "kargoda", "teslim"].map(k => [k, SIPARIS_DURUM[k]])), x.durum)}</select></label>
          <label class="alan">Kargo firması<input name="kargo_firma" maxlength="40" value="${esc(x.kargo_firma || "")}"></label>
          <label class="alan">Takip no<input name="kargo_takip" maxlength="60" value="${esc(x.kargo_takip || "")}"></label>
          <button class="btn btn-kucuk" type="submit">Kaydet</button>` : x.kargo_takip ? `<span class="bilgi">Kargo: ${esc(x.kargo_firma || "")} ${esc(x.kargo_takip)}</span>` : ""}
        </div>
      </form>`).join("") : `<p class="bilgi">Bu listede sipariş yok.</p>`}
    </section></div>`);
  $$("[data-p-siparis]").forEach(f => f.onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(f);
    const { error: h } = await sb.from("magaza_siparisleri").update({ durum: fd.get("durum"), kargo_firma: fd.get("kargo_firma") || null, kargo_takip: fd.get("kargo_takip") || null }).eq("id", f.dataset.pSiparis);
    if (h) return bildir(hataMetni(h));
    bildir("Sipariş güncellendi."); petshopSiparisleri();
  });
}

async function petshopKazanc() {
  if (!(await petshopHazir())) return;
  meta("Petshop paneli · Kazancım");
  const [{ data: h }, a] = await Promise.all([sb.from("satici_hakedisleri").select("*").eq("satici_id", S.satici.id).maybeSingle(), ayarlar()]);
  const o = h || { odenebilir: 0, yolda: 0, aktarilan: 0, komisyon_toplam: 0 };
  const oran = S.satici.komisyon_orani ?? a.komisyon_orani ?? 10;
  sayfa(`<div class="kap dar">${panelUst("/petshop-paneli/kazanc")}
    <section class="kutu kunye" style="margin-bottom:24px">
      <div><span>Aktarılmayı bekleyen (teslim edilmiş)</span><b style="font-size:24px">${tl(o.odenebilir)}</b></div>
      <div><span>Teslim bekleyen siparişlerden</span><b style="font-size:24px">${tl(o.yolda)}</b></div>
      <div><span>Bugüne kadar aktarılan</span><b style="font-size:24px">${tl(o.aktarilan)}</b></div>
      <div><span>Toplam komisyon</span><b style="font-size:24px">${tl(o.komisyon_toplam)}</b></div>
    </section>
    <section class="kutu metin"><h2 style="margin-top:0">Nasıl hesaplanıyor?</h2>
      <p>Müşteri ödemeyi kartla petpatibul'a yapar. Her siparişte ürün tutarından ${yuzde(oran)} komisyon düşülür; kargo ücretinin tamamı sana kalır. Sipariş "Teslim edildi" olunca tutar aktarılmayı bekleyenlere geçer ve ${esc(ibanGoster(S.satici.iban) || "kayıtlı IBAN'ına")} hesabına aktarılır.</p></section>
  </div>`);
}

async function petshopBilgileri() {
  if (!(await petshopHazir())) return;
  meta("Petshop paneli · Bilgiler");
  sayfa(`<div class="kap dar">${panelUst("/petshop-paneli/bilgiler")}${saticiFormu(S.satici, false)}</div>`);
  saticiFormuBagla(S.satici, () => { bildir("Petshop bilgilerin kaydedildi."); petshopBilgileri(); });
}

// ---------- /petshop/<id>: herkese açık petshop sayfası ----------
async function petshopSayfasi(id) {
  const [{ data: s }, { data: l, error }] = await Promise.all([
    sb.from("saticilar_acik").select("*").eq("id", id).maybeSingle(),
    sb.from("urunler").select("*").eq("satici_id", id).eq("aktif", true).eq("onay", "onaylandi").order("created_at", { ascending: false }).limit(200),
  ]);
  if (error) throw error;
  if (!s) { meta("Petshop bulunamadı"); sayfa(`<div class="kap bos-durum"><h1>Bu petshop şu an mağazada değil</h1><p><a href="/magaza">Mağazaya dön</a></p></div>`); return; }
  SATICI_ONBELLEK.set(s.id, s);
  meta(s.magaza_adi, `${s.magaza_adi} (${s.il}): mama ve ekipman ürünleri petpatibul.com mağazasında.`);
  const urunler = [...l.filter(u => u.stok > 0), ...l.filter(u => u.stok <= 0)];
  sayfa(`<div class="kap">
    <nav class="yol" aria-label="Konum"><a href="/magaza">Mağaza</a><span>/</span><span>${esc(s.magaza_adi)}</span></nav>
    <section class="kutu petshop-bas">
      ${s.logo ? `<img src="${esc(s.logo)}" alt="" class="petshop-logo">` : `<span class="petshop-logo yok">${ikon.canta}</span>`}
      <div style="display:flex;flex-direction:column;gap:6px">
        <h1 style="font-size:clamp(28px,4vw,36px);font-weight:900">${esc(s.magaza_adi)}</h1>
        <span class="bilgi">${esc(s.ilce ? s.ilce + " / " : "")}${esc(s.il)} · ${esc(s.telefon)}</span>
        <span class="bilgi">${tl(s.ucretsiz_kargo_esigi)} ve üzeri siparişlerde kargo bedava, altında ${tl(s.kargo_ucreti)}.</span>
        ${s.aciklama ? `<p class="aciklama" style="margin:4px 0 0">${esc(s.aciklama)}</p>` : ""}
      </div>
    </section>
    <div style="padding-block:24px 64px">
      ${urunler.length ? `<div class="izgara urun-izgara">${urunler.map(urunKart).join("")}</div>` : `<div class="kutu bos-durum"><h2>Henüz ürün yok</h2></div>`}
    </div>
  </div>`);
}

// ---------- yönetim: petshoplar ----------
async function yPetshoplar() {
  if (!yonetici()) return;
  meta("Yönetim · Mağazalar");
  const filtre = new URLSearchParams(location.search).get("durum") || "";
  let q = sb.from("saticilar").select("*").order("created_at", { ascending: false });
  if (SATICI_DURUM[filtre]) q = q.eq("durum", filtre);
  const [{ data: l, error }, { data: h }, { data: ur }] = await Promise.all([q, sb.from("satici_hakedisleri").select("*"),
    sb.from("urunler").select("satici_id, onay, aktif").limit(5000)]);
  const say = (id, f) => (ur || []).filter(u => (u.satici_id || null) === id && (!f || f(u))).length;
  const sayilar = id => {
    const t = say(id), y = say(id, u => u.onay === "onaylandi" && u.aktif), b = say(id, u => u.onay === "bekliyor"), r = say(id, u => u.onay === "reddedildi");
    return `<div class="sayi-satir"><span>${t} ürün</span><span class="durum d-yayinda">${y} yayında</span>${b ? `<span class="durum d-bekliyor">${b} onay bekliyor</span>` : ""}${r ? `<span class="durum d-red">${r} reddedilen/kaldırılan</span>` : ""}</div>`;
  };
  if (error) throw error;
  const hak = id => (h || []).find(x => x.satici_id === id) || { odenebilir: 0, yolda: 0, aktarilan: 0, komisyon_toplam: 0 };
  const bek = l.filter(s => s.durum === "bekliyor").length;
  const odenecek = (h || []).reduce((t, x) => t + Number(x.odenebilir), 0), komisyon = (h || []).reduce((t, x) => t + Number(x.komisyon_toplam), 0);
  const hap = (k, a) => `<a class="hap" href="/yonetim/petshoplar${k ? "?durum=" + k : ""}"${filtre === k ? ' aria-current="page"' : ""}>${a}</a>`;
  sayfa(`<div class="kap dar">
    <h1 style="font-size:36px;font-weight:900;margin-bottom:16px">Yönetim</h1>
    ${yonetimSekmeleri("/yonetim/petshoplar")}
    <section class="kutu kunye" style="margin-bottom:24px">
      <div><span>Petshoplara aktarılacak (teslim edilmiş)</span><b style="font-size:24px">${tl(odenecek)}</b></div>
      <div><span>Toplam komisyon geliri</span><b style="font-size:24px">${tl(komisyon)}</b></div>
    </section>
    <div class="hap-grup" style="margin-bottom:16px">${hap("", "Tümü")}${hap("bekliyor", `Onay bekleyen (${bek})`)}${hap("onaylandi", "Onaylı")}${hap("reddedildi", "Reddedilen")}${hap("askida", "Askıda")}</div>
    <p class="bilgi" style="margin-bottom:12px">Bir mağazaya tıklayınca tüm ürünlerini görür, uygunsuz olanı yayından kaldırabilirsin.</p>
    <section class="kutu">
      ${!filtre && say(null) ? `<a class="satir magaza-satir" href="/yonetim/urunler?m=site">
        <div class="satir-foto"><span class="petshop-logo-kucuk">${ikon.canta}</span></div>
        <div class="satir-govde"><b>Sitenin ürünleri</b><span class="bilgi">PetPatiBul'un kendi sattığı ürünler</span>${sayilar(null)}</div>
        <div class="satir-dugmeler"><span class="btn btn-kucuk btn-ana">Ürünleri gör</span></div></a>` : ""}
      ${l.length ? l.map(s => `<div class="satir">
        <div class="satir-foto">${s.logo ? `<img src="${esc(s.logo)}" alt="">` : ""}</div>
        <div class="satir-govde"><b><a href="/yonetim/urunler?m=${s.id}">${esc(s.magaza_adi)}</a></b>
          <span class="bilgi">${esc(s.yetkili)} · ${esc(s.ilce ? s.ilce + " / " : "")}${esc(s.il)} · ${tarih(s.created_at)}</span>
          <div style="display:flex;gap:6px;flex-wrap:wrap"><span class="durum ${s.durum === "onaylandi" ? "d-yayinda" : s.durum === "bekliyor" ? "d-bekliyor" : "d-red"}">${esc(SATICI_DURUM[s.durum])}</span>
            ${Number(hak(s.id).odenebilir) > 0 ? `<span class="durum d-bekliyor">Aktarılacak ${tl(hak(s.id).odenebilir)}</span>` : ""}</div>
          ${sayilar(s.id)}
        </div>
        <div class="satir-dugmeler" style="flex-direction:column;align-items:stretch;min-width:160px">
          <a class="btn btn-kucuk btn-ana" href="/yonetim/urunler?m=${s.id}">Ürünleri gör</a>
          <a class="btn btn-kucuk" href="/yonetim/petshop/${s.id}">${s.durum === "bekliyor" ? "Başvuruyu incele" : "Mağaza bilgileri"}</a></div>
      </div>`).join("") : `<p class="bilgi">Bu listede petshop yok. Petshoplar /petshop-ol sayfasından başvurur.</p>`}
    </section>
  </div>`);
}

async function yPetshop(id) {
  if (!yonetici()) return;
  const [{ data: s }, { data: h }, { data: sip }, { count: urunSay }, a] = await Promise.all([
    sb.from("saticilar").select("*").eq("id", id).maybeSingle(),
    sb.from("satici_hakedisleri").select("*").eq("satici_id", id).maybeSingle(),
    sb.from("magaza_siparisleri").select("*").eq("satici_id", id).eq("durum", "teslim").is("hakedis_odendi_at", null).order("created_at"),
    sb.from("urunler").select("id", { count: "exact", head: true }).eq("satici_id", id),
    ayarlar(),
  ]);
  if (!s) { sayfa(`<div class="kap bos-durum"><h1>Petshop bulunamadı</h1><p><a href="/yonetim/petshoplar">Petshoplara dön</a></p></div>`); return; }
  meta("Yönetim · " + s.magaza_adi);
  const o = h || { odenebilir: 0, yolda: 0, aktarilan: 0, komisyon_toplam: 0 };
  const satir = (ad, deger) => deger ? `<div><span>${ad}</span><b>${deger}</b></div>` : "";
  sayfa(`<div class="kap dar">
    <p style="margin:0 0 12px"><a href="/yonetim/petshoplar">Petshoplara dön</a></p>
    ${baslikH1(esc(s.magaza_adi), `${esc(SATICI_DURUM[s.durum])} · başvuru ${tarih(s.created_at)} · ${urunSay || 0} ürün`)}
    ${s.red_nedeni ? `<p class="uyari">Not: ${esc(s.red_nedeni)}</p>` : ""}
    <section class="kutu kunye" style="margin-bottom:24px">
      ${satir("Yetkili", esc(s.yetkili))}${satir("Telefon", esc(s.telefon))}${satir("E-posta", esc(s.email))}
      ${satir("Adres", `${esc(s.adres)}, ${esc(s.ilce || "")} / ${esc(s.il)}`)}
      ${satir("Vergi dairesi / no", esc([s.vergi_dairesi, s.vergi_no].filter(Boolean).join(" / ")))}
      ${satir("IBAN", esc(ibanGoster(s.iban)))}${satir("Hesap sahibi", esc(s.hesap_sahibi))}
      ${satir("Kargo", `${tl(s.kargo_ucreti)} · ${tl(s.ucretsiz_kargo_esigi)} üstü bedava`)}
    </section>
    ${s.aciklama ? `<section class="kutu" style="margin-bottom:24px"><p class="aciklama" style="margin:0">${esc(s.aciklama)}</p></section>` : ""}
    <section class="kutu form" style="margin-bottom:24px">
      <h2 style="font-size:22px">Karar</h2>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${s.durum !== "onaylandi" ? `<button type="button" class="btn btn-ana" data-satici-durum="onaylandi">Onayla</button>` : ""}
        ${s.durum === "bekliyor" ? `<button type="button" class="btn" data-satici-durum="reddedildi">Reddet</button>` : ""}
        ${s.durum === "onaylandi" ? `<button type="button" class="btn" data-satici-durum="askida">Askıya al</button>` : ""}
        <a class="btn" href="/yonetim/urunler?m=${s.id}">Ürünlerini gör</a>
      </div>
      <label class="alan">Ret veya askıya alma nedeni (petshop görür)<input id="satici-neden" maxlength="300" value="${esc(s.red_nedeni || "")}"></label>
      <label class="alan">Bu petshop için komisyon (%)<input id="satici-komisyon" type="number" min="0" max="100" step="0.1" value="${esc(s.komisyon_orani ?? "")}" placeholder="Boşsa genel oran: ${esc(a.komisyon_orani ?? 10)}" style="max-width:240px"></label>
      <button type="button" class="btn" id="komisyon-kaydet" style="align-self:flex-start">Komisyonu kaydet</button>
    </section>
    <section class="kutu" style="margin-bottom:24px">
      <h2 style="font-size:22px;margin-bottom:4px">Aktarılacak tutar: ${tl(o.odenebilir)}</h2>
      <p class="bilgi" style="margin-bottom:8px">Teslim edilmiş ve henüz aktarılmamış siparişler. Tutarı ${esc(ibanGoster(s.iban))} (${esc(s.hesap_sahibi || "")}) hesabına bankadan gönderdikten sonra "Aktarıldı" olarak işaretle. Teslim bekleyenlerden ${tl(o.yolda)} daha gelecek; bugüne kadar ${tl(o.aktarilan)} aktarıldı.</p>
      ${(sip || []).length ? `${sip.map(x => `<div class="satir"><div class="satir-govde"><b>${esc(x.siparis_no)} · ${tl(x.satici_hakedis)}</b>
        <span class="bilgi">${tarih(x.created_at)} · toplam ${tl(x.toplam)} · komisyon ${tl(x.komisyon)}</span></div></div>`).join("")}
        <button type="button" class="btn btn-ana" id="hakedis-ode" style="margin-top:12px">${tl(o.odenebilir)} aktarıldı olarak işaretle</button>` : `<p class="bilgi">Aktarılacak sipariş yok.</p>`}
    </section>
  </div>`);
  $$("[data-satici-durum]").forEach(b => b.onclick = async () => {
    const durum = b.dataset.saticiDurum, neden = $("#satici-neden").value.trim();
    if (durum !== "onaylandi" && !neden) return bildir("Lütfen nedeni yaz; petshop görecek.");
    const { error } = await sb.from("saticilar").update({ durum, red_nedeni: durum === "onaylandi" ? null : neden }).eq("id", id);
    if (error) return bildir(hataMetni(error));
    bildir({ onaylandi: "Petshop onaylandı.", reddedildi: "Başvuru reddedildi.", askida: "Petshop askıya alındı; ürünleri mağazadan kalktı." }[durum]); yPetshop(id);
  });
  $("#komisyon-kaydet").onclick = async () => {
    const v = $("#satici-komisyon").value;
    const { error } = await sb.from("saticilar").update({ komisyon_orani: v === "" ? null : Number(v) }).eq("id", id);
    if (error) return bildir(hataMetni(error));
    bildir("Komisyon kaydedildi. Yeni siparişlerde geçerli olur.");
  };
  const ode = $("#hakedis-ode");
  if (ode) ode.onclick = async () => {
    if (!confirm(`${tl(o.odenebilir)} tutarını petshopun hesabına gönderdiğini onaylıyor musun?`)) return;
    const { error } = await sb.from("magaza_siparisleri").update({ hakedis_odendi_at: new Date().toISOString() }).in("id", sip.map(x => x.id));
    if (error) return bildir(hataMetni(error));
    bildir("Aktarım kaydedildi."); yPetshop(id);
  };
}

// ---------- adresler ----------
ROTALAR.push(
  [/^\/petshop-ol$/, petshopOlSayfasi],
  [/^\/petshop-paneli$/, petshopUrunlerim],
  [/^\/petshop-paneli\/siparisler$/, petshopSiparisleri],
  [/^\/petshop-paneli\/kazanc$/, petshopKazanc],
  [/^\/petshop-paneli\/bilgiler$/, petshopBilgileri],
  [/^\/petshop-paneli\/urun\/(yeni|[0-9a-f-]{36})$/, id => urunFormu(id, "petshop")],
  [/^\/petshop\/([0-9a-f-]{36})$/, petshopSayfasi],
  [/^\/yonetim\/petshoplar$/, yPetshoplar],
  [/^\/yonetim\/petshop\/([0-9a-f-]{36})$/, yPetshop],
);
