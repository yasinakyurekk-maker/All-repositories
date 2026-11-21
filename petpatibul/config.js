// Supabase panelinde: Project Settings > API bölümündeki iki değeri buraya yapıştırın.
// (anon anahtarı herkese açık olabilir; güvenliği veritabanındaki kurallar sağlar.)
window.AYAR = {
  SUPABASE_URL: "https://PROJE-KODUNUZ.supabase.co",
  SUPABASE_ANON_KEY: "BURAYA-anon-public-ANAHTARI",
  // PayTR hesabınız onaylanıp ödeme fonksiyonları kurulunca true yapın (README > 5. adım).
  ODEME_AKTIF: false,
  // Bağış toplamak için dernek/vakıf olmanız ya da yardım toplama izni almanız gerekir (README > Bağış).
  BAGIS_AKTIF: false
};
