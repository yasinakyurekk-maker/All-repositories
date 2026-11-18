// petpatibul.com — PayTR ödeme bildirimi (Bildirim URL'si, 2. adım).
// PayTR bu adrese POST atar. Hash doğrulanır; ödeme başarılıysa ilan öne çıkarılır,
// bağış "ödendi" olur ya da mağaza siparişi onaylanıp stok düşülür.
// JWT doğrulaması KAPALI yayınlanmalı:  supabase functions deploy odeme-bildirim --no-verify-jwt
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

async function hmacBase64(key: string, data: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST bekleniyor", { status: 405 });
  const env = (k: string) => Deno.env.get(k) ?? "";
  const MERCHANT_KEY = env("PAYTR_MERCHANT_KEY"), MERCHANT_SALT = env("PAYTR_MERCHANT_SALT");

  const f = new URLSearchParams(await req.text());
  const siparisNo = f.get("merchant_oid") ?? "", durum = f.get("status") ?? "", toplam = f.get("total_amount") ?? "", hash = f.get("hash") ?? "";
  const beklenen = await hmacBase64(MERCHANT_KEY, siparisNo + MERCHANT_SALT + durum + toplam);
  if (!siparisNo || hash !== beklenen) return new Response("PAYTR notification failed: bad hash", { status: 400 });

  const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const basarili = durum === "success";
  const hata = basarili ? null : `${f.get("failed_reason_code") ?? ""} ${f.get("failed_reason_msg") ?? ""}`.trim();
  const { error } = await sb.rpc("odeme_isle", { p_siparis: siparisNo, p_basarili: basarili, p_hata: hata });
  if (error) return new Response("Veritabanı hatası", { status: 500 });   // PayTR bildirimi tekrar dener

  return new Response("OK", { headers: { "Content-Type": "text/plain" } }); // PayTR yalnızca "OK" bekler
});
