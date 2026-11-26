// petpatibul.com — PayTR ödemesini başlatır (iFrame API, 1. adım).
// Üç tür ödeme var; tutarlar her zaman burada, veritabanından hesaplanır:
//   { tip: "one_cikar", ilan_id, paket, ad, telefon, adres }                 (giriş gerekli)
//   { tip: "siparis", sepet: [{urun_id, adet}], ad, telefon, adres, il, ilce } (giriş gerekli)
//   { tip: "bagis", kampanya_id?, tutar, ad, gizli, email?, telefon, il, mesaj } (girişsiz de olur)
// Döner: { token } → site https://www.paytr.com/odeme/guvenli/<token> adresini iframe içinde açar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

async function hmacBase64(key: string, data: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}
const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const temiz = (s: unknown, n = 200) => String(s ?? "").trim().slice(0, n);
const yeniNo = (onek: string) => onek + crypto.randomUUID().replace(/-/g, "");   // PayTR: yalnızca harf ve rakam
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ hata: "Yalnızca POST" }, 405);

  const env = (k: string) => Deno.env.get(k) ?? "";
  const MERCHANT_ID = env("PAYTR_MERCHANT_ID"), MERCHANT_KEY = env("PAYTR_MERCHANT_KEY"), MERCHANT_SALT = env("PAYTR_MERCHANT_SALT");
  const SITE_URL = env("SITE_URL").replace(/\/$/, "");
  const TEST_MODE = env("PAYTR_TEST_MODE") === "0" ? "0" : "1";
  if (!MERCHANT_ID || !MERCHANT_KEY || !MERCHANT_SALT || !SITE_URL) return json({ hata: "Ödeme ayarları eksik (PayTR anahtarları veya SITE_URL)." }, 500);

  let g: Record<string, unknown>;
  try { g = await req.json(); } catch { return json({ hata: "Geçersiz istek." }, 400); }
  const tip = String(g.tip ?? "one_cikar");

  const yetki = req.headers.get("Authorization") ?? "";
  const kullaniciSb = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: yetki } } });
  const { data: { user } } = await kullaniciSb.auth.getUser().catch(() => ({ data: { user: null } }));
  if (tip !== "bagis" && (!user || !user.email)) return json({ hata: "Önce giriş yapın." }, 401);

  const ad = temiz(g.ad, 80), telefon = String(g.telefon ?? "").replace(/[^\d+]/g, "");
  if (!ad || telefon.length < 10) return json({ hata: "Ad ve telefon zorunlu." }, 400);

  const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const ayar = async (k: string, varsayilan: number) => {
    const { data } = await sb.from("ayarlar").select("deger").eq("anahtar", k).maybeSingle();
    return data ? Number(data.deger) : varsayilan;
  };

  let siparisNo = "", tutar = 0, email = "", adres = "", sepet: [string, string, number][] = [], donus = "";
  let kaydet: () => Promise<{ error: unknown }>;

  if (tip === "one_cikar") {
    adres = temiz(g.adres);
    if (!adres) return json({ hata: "Adres zorunlu." }, 400);
    const { data: ilan } = await sb.from("ilanlar").select("id, ad, sahip_id, durum").eq("id", String(g.ilan_id ?? "")).maybeSingle();
    if (!ilan || ilan.sahip_id !== user!.id) return json({ hata: "Bu ilan size ait değil." }, 403);
    if (!["bekliyor", "yayinda"].includes(ilan.durum)) return json({ hata: "Kapanmış ilan öne çıkarılamaz." }, 400);
    const { data: paket } = await sb.from("paketler").select("kod, ad, gun, fiyat, aktif").eq("kod", String(g.paket ?? "")).maybeSingle();
    if (!paket || !paket.aktif) return json({ hata: "Paket bulunamadı." }, 400);
    siparisNo = yeniNo("PP"); tutar = Number(paket.fiyat); email = user!.email!; donus = "one_cikar";
    sepet = [[`${paket.ad} - ${ilan.ad}`, tutar.toFixed(2), 1]];
    kaydet = () => sb.from("odemeler").insert({ siparis_no: siparisNo, ilan_id: ilan.id, sahip_id: user!.id, paket_kod: paket.kod, gun: paket.gun, tutar, ad, telefon, email, adres });

  } else if (tip === "siparis") {
    const il = temiz(g.il, 40), ilce = temiz(g.ilce, 60);
    adres = temiz(g.adres, 300);
    if (!adres || !il) return json({ hata: "Teslimat adresi ve il zorunlu." }, 400);
    const istek = Array.isArray(g.sepet) ? g.sepet as { urun_id?: string; adet?: number }[] : [];
    const adetler = new Map<string, number>();
    for (const k of istek) {
      const n = Math.floor(Number(k.adet));
      if (k.urun_id && n > 0 && n <= 99) adetler.set(String(k.urun_id), (adetler.get(String(k.urun_id)) ?? 0) + n);
    }
    if (!adetler.size) return json({ hata: "Sepetiniz boş." }, 400);
    const { data: urunler } = await sb.from("urunler").select("id, ad, fiyat, stok, aktif, onay, satici_id").in("id", [...adetler.keys()]);
    const saticiIdler = [...new Set((urunler ?? []).map((u) => u.satici_id).filter(Boolean))];
    const { data: saticilar } = saticiIdler.length
      ? await sb.from("saticilar").select("id, durum, kargo_ucreti, ucretsiz_kargo_esigi, komisyon_orani").in("id", saticiIdler)
      : { data: [] as { id: string; durum: string; kargo_ucreti: number; ucretsiz_kargo_esigi: number; komisyon_orani: number | null }[] };
    const genelKargo = await ayar("kargo_ucreti", 49.9), genelEsik = await ayar("ucretsiz_kargo_esigi", 750), genelKomisyon = await ayar("komisyon_orani", 10);
    const yuvarla = (n: number) => Math.round(n * 100) / 100;
    // Sepet satıcılara göre bölünür; her satıcı için ayrı sipariş, hepsi tek PayTR ödemesine (odeme_no) bağlı.
    const gruplar = new Map<string, { satici_id: string | null; kalemler: unknown[]; ara: number }>();
    for (const [id, adet] of adetler) {
      const u = (urunler ?? []).find((x) => x.id === id);
      const sat = u?.satici_id ? (saticilar ?? []).find((x) => x.id === u.satici_id) : null;
      if (!u || !u.aktif || u.onay !== "onaylandi" || (u.satici_id && (!sat || sat.durum !== "onaylandi")))
        return json({ hata: "Sepetteki bir ürün artık satışta değil. Sepeti yenileyin." }, 409);
      if (u.stok < adet) return json({ hata: `"${u.ad}" için stokta yalnızca ${u.stok} adet var.` }, 409);
      const fiyat = Number(u.fiyat), anahtar = u.satici_id ?? "site";
      if (!gruplar.has(anahtar)) gruplar.set(anahtar, { satici_id: u.satici_id ?? null, kalemler: [], ara: 0 });
      const g = gruplar.get(anahtar)!;
      g.kalemler.push({ urun_id: u.id, ad: u.ad, fiyat, adet });
      g.ara += fiyat * adet;
      sepet.push([u.ad, fiyat.toFixed(2), adet]);
    }
    siparisNo = yeniNo("SP"); email = user!.email!; donus = "siparis";
    const kayitlar = [];
    for (const g of gruplar.values()) {
      const sat = g.satici_id ? (saticilar ?? []).find((x) => x.id === g.satici_id)! : null;
      const ara = yuvarla(g.ara);
      const kargo = ara >= Number(sat ? sat.ucretsiz_kargo_esigi : genelEsik) ? 0 : Number(sat ? sat.kargo_ucreti : genelKargo);
      if (kargo > 0) sepet.push(["Kargo", kargo.toFixed(2), 1]);
      const oran = sat ? Number(sat.komisyon_orani ?? genelKomisyon) : 0;
      const komisyon = sat ? yuvarla(ara * oran / 100) : 0;
      const toplam = yuvarla(ara + kargo);
      tutar += toplam;
      kayitlar.push({
        siparis_no: gruplar.size === 1 ? siparisNo : yeniNo("SP"), odeme_no: siparisNo, satici_id: g.satici_id,
        kullanici_id: user!.id, kalemler: g.kalemler, ara_toplam: ara, kargo, toplam,
        komisyon, satici_hakedis: sat ? yuvarla(toplam - komisyon) : 0,
        ad, telefon, email, adres, il, ilce: ilce || null,
      });
    }
    tutar = yuvarla(tutar);
    kaydet = () => sb.from("magaza_siparisleri").insert(kayitlar);

  } else if (tip === "bagis") {
    tutar = Math.round(Number(g.tutar) * 100) / 100;
    const enAz = await ayar("en_az_bagis", 10);
    if (!(tutar >= enAz) || tutar > 100000) return json({ hata: `Bağış tutarı en az ${enAz} TL olmalı.` }, 400);
    email = user?.email ?? temiz(g.email, 120).toLowerCase();
    if (!EMAIL.test(email)) return json({ hata: "Geçerli bir e-posta adresi yazın." }, 400);
    adres = temiz(g.il, 40) || "Türkiye";
    let kampanyaId: string | null = null, baslik = "Sokak hayvanları genel bağış";
    if (g.kampanya_id) {
      const { data: k } = await sb.from("bagis_kampanyalari").select("id, baslik, aktif").eq("id", String(g.kampanya_id)).maybeSingle();
      if (!k || !k.aktif) return json({ hata: "Bu kampanya artık bağış kabul etmiyor." }, 400);
      kampanyaId = k.id; baslik = k.baslik;
    }
    siparisNo = yeniNo("BG"); donus = "bagis";
    sepet = [[`Bağış - ${baslik}`, tutar.toFixed(2), 1]];
    kaydet = () => sb.from("bagislar").insert({
      siparis_no: siparisNo, kampanya_id: kampanyaId, kullanici_id: user?.id ?? null,
      ad, gizli: !!g.gizli, email, mesaj: temiz(g.mesaj, 300) || null, tutar,
    });

  } else {
    return json({ hata: "Bilinmeyen ödeme türü." }, 400);
  }

  const { error: e1 } = await kaydet();
  if (e1) return json({ hata: "Ödeme kaydı açılamadı." }, 500);

  const kurus = String(Math.round(tutar * 100));
  const userIp = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "127.0.0.1";
  const sepetB64 = b64(JSON.stringify(sepet));
  const noInstallment = "1", maxInstallment = "0", currency = "TL";
  const hashStr = MERCHANT_ID + userIp + siparisNo + email + kurus + sepetB64 + noInstallment + maxInstallment + currency + TEST_MODE;
  const paytrToken = await hmacBase64(MERCHANT_KEY, hashStr + MERCHANT_SALT);

  const form = new URLSearchParams({
    merchant_id: MERCHANT_ID, user_ip: userIp, merchant_oid: siparisNo, email,
    payment_amount: kurus, paytr_token: paytrToken, user_basket: sepetB64, debug_on: TEST_MODE,
    no_installment: noInstallment, max_installment: maxInstallment,
    user_name: ad, user_address: adres, user_phone: telefon,
    merchant_ok_url: `${SITE_URL}/odeme/basarili?tip=${donus}`, merchant_fail_url: `${SITE_URL}/odeme/hata?tip=${donus}`,
    timeout_limit: "30", currency, test_mode: TEST_MODE, lang: "tr",
  });
  const r = await fetch("https://www.paytr.com/odeme/api/get-token", { method: "POST", body: form });
  const sonuc = await r.json().catch(() => ({ status: "failed", reason: "PayTR yanıtı okunamadı" }));
  if (sonuc.status !== "success") {
    await sb.rpc("odeme_isle", { p_siparis: siparisNo, p_basarili: false, p_hata: String(sonuc.reason ?? "") });
    return json({ hata: "Ödeme başlatılamadı: " + (sonuc.reason ?? "bilinmeyen hata") }, 502);
  }
  return json({ token: sonuc.token, siparis_no: siparisNo });
});
