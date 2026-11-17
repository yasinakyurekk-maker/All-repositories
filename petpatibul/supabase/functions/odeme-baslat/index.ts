// petpatibul.com — öne çıkarma ödemesini başlatır (PayTR iFrame API, 1. adım).
// Giriş yapmış kullanıcı çağırır: { ilan_id, paket, ad, telefon, adres }
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ hata: "Yalnızca POST" }, 405);

  const env = (k: string) => Deno.env.get(k) ?? "";
  const MERCHANT_ID = env("PAYTR_MERCHANT_ID"), MERCHANT_KEY = env("PAYTR_MERCHANT_KEY"), MERCHANT_SALT = env("PAYTR_MERCHANT_SALT");
  const SITE_URL = env("SITE_URL").replace(/\/$/, "");
  const TEST_MODE = env("PAYTR_TEST_MODE") === "0" ? "0" : "1";
  if (!MERCHANT_ID || !MERCHANT_KEY || !MERCHANT_SALT || !SITE_URL) return json({ hata: "Ödeme ayarları eksik (PayTR anahtarları veya SITE_URL)." }, 500);

  const yetki = req.headers.get("Authorization") ?? "";
  const kullaniciSb = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: yetki } } });
  const { data: { user } } = await kullaniciSb.auth.getUser();
  if (!user || !user.email) return json({ hata: "Önce giriş yapın." }, 401);

  let g: { ilan_id?: string; paket?: string; ad?: string; telefon?: string; adres?: string };
  try { g = await req.json(); } catch { return json({ hata: "Geçersiz istek." }, 400); }
  const ad = (g.ad ?? "").trim(), telefon = (g.telefon ?? "").replace(/[^\d+]/g, ""), adres = (g.adres ?? "").trim();
  if (!g.ilan_id || !g.paket || !ad || telefon.length < 10 || !adres) return json({ hata: "Ad, telefon ve adres zorunlu." }, 400);

  const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const { data: ilan } = await sb.from("ilanlar").select("id, ad, sahip_id, durum").eq("id", g.ilan_id).maybeSingle();
  if (!ilan || ilan.sahip_id !== user.id) return json({ hata: "Bu ilan size ait değil." }, 403);
  if (!["bekliyor", "yayinda"].includes(ilan.durum)) return json({ hata: "Kapanmış ilan öne çıkarılamaz." }, 400);
  const { data: paket } = await sb.from("paketler").select("kod, ad, gun, fiyat, aktif").eq("kod", g.paket).maybeSingle();
  if (!paket || !paket.aktif) return json({ hata: "Paket bulunamadı." }, 400);

  const siparisNo = "PP" + crypto.randomUUID().replace(/-/g, "");       // PayTR: yalnızca harf ve rakam
  const tutar = Number(paket.fiyat);
  const kurus = String(Math.round(tutar * 100));
  const { error: e1 } = await sb.from("odemeler").insert({
    siparis_no: siparisNo, ilan_id: ilan.id, sahip_id: user.id, paket_kod: paket.kod, gun: paket.gun, tutar,
  });
  if (e1) return json({ hata: "Ödeme kaydı açılamadı." }, 500);

  const userIp = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "127.0.0.1";
  const sepet = b64(JSON.stringify([[`${paket.ad} - ${ilan.ad}`, tutar.toFixed(2), 1]]));
  const noInstallment = "1", maxInstallment = "0", currency = "TL";
  const hashStr = MERCHANT_ID + userIp + siparisNo + user.email + kurus + sepet + noInstallment + maxInstallment + currency + TEST_MODE;
  const paytrToken = await hmacBase64(MERCHANT_KEY, hashStr + MERCHANT_SALT);

  const form = new URLSearchParams({
    merchant_id: MERCHANT_ID, user_ip: userIp, merchant_oid: siparisNo, email: user.email,
    payment_amount: kurus, paytr_token: paytrToken, user_basket: sepet, debug_on: TEST_MODE,
    no_installment: noInstallment, max_installment: maxInstallment,
    user_name: ad, user_address: adres, user_phone: telefon,
    merchant_ok_url: `${SITE_URL}/odeme/basarili`, merchant_fail_url: `${SITE_URL}/odeme/hata`,
    timeout_limit: "30", currency, test_mode: TEST_MODE, lang: "tr",
  });
  const r = await fetch("https://www.paytr.com/odeme/api/get-token", { method: "POST", body: form });
  const sonuc = await r.json().catch(() => ({ status: "failed", reason: "PayTR yanıtı okunamadı" }));
  if (sonuc.status !== "success") {
    await sb.rpc("odeme_onayla", { p_siparis: siparisNo, p_basarili: false, p_hata: String(sonuc.reason ?? "") });
    return json({ hata: "Ödeme başlatılamadı: " + (sonuc.reason ?? "bilinmeyen hata") }, 502);
  }
  return json({ token: sonuc.token, siparis_no: siparisNo });
});
