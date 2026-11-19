# Video senaryosu: MEB ÖDSGM 2019-2020 Nisan Ayı LGS Örnek Soruları, Sayısal Bölüm, Matematik Soru 3
# Cevap anahtarı: D
META = {
    "id": "meb-2020-nisan-mat-03",
    "kaynak": "Kaynak: MEB ÖDSGM · 2020 Nisan LGS Örnek Soruları · Mat. S.3",
    "etiket": "LGS MATEMATİK",
}

# her sahne: tts (konuşma metni), title, lines (tahtada sırayla beliren satırlar), extra_silence
SCENES = [
    dict(kind="intro",
         tts="selam! ben ey ay hocam. bugün bir le ge se sorusunu birlikte, adım adım çözüyoruz.",
         title="Bugünün sorusu",
         lines=["EKOK ile paketleme problemi", "Konu: Çarpanlar ve Katlar"]),
    dict(kind="question",
         tts=("bir fabrikada kalın ve ince olmak üzere iki çeşit inşaat demiri üretiliyor. "
              "bir kalın demir otuz beş, bir ince demir yirmi beş kilogram. "
              "demirler, her pakette tek çeşit olacak ve tüm paketlerin kütlesi eşit olacak şekilde paketleniyor. "
              "on sekiz ton yük alabilen bir tıra, bu paketlerden en çok on tane yüklenebiliyor. "
              "ince demir paketindeki demir sayısı ile, kalın demir paketindeki demir sayısı arasındaki fark kaçtır?"),
         title="Soru",
         lines=["Kalın demir: 35 kg", "İnce demir: 25 kg",
                "Her pakette tek çeşit demir var.",
                "Tüm paketlerin kütlesi eşit.",
                "18 tonluk tıra en çok 10 paket yüklenebiliyor.",
                "İnce paketteki demir sayısı ile kalın paketteki demir sayısının farkı kaçtır?",
                "A) 2     B) 10     C) 16     D) 20"]),
    dict(kind="pause",
         tts="videoyu durdur, önce sen çöz ve cevabını yoruma yaz!",
         title="Önce sen çöz!",
         lines=[], extra_silence=2.5),
    dict(kind="step",
         tts=("adım bir. paketlerin kütlesi eşit ve her pakette tek çeşit demir var. "
              "o halde paket kütlesi, hem otuz beşin hem yirmi beşin katı olmalı. "
              "otuz beş ile yirmi beşin ekoku, yüz yetmiş beş. "
              "yani paket kütlesi, yüz yetmiş beşin bir katı."),
         title="1. Adım · Ortak kat",
         say="Eşit paket = ortak kat. EKOK!",
         lines=["Paket kütlesi = P",
                "P hem 35'in hem 25'in katı",
                "35 = 5 · 7      25 = 5 · 5",
                "EKOK(35, 25) = 5 · 5 · 7 = 175",
                "P, 175'in bir katıdır."]),
    dict(kind="step",
         tts=("adım iki. on sekiz ton, on sekiz bin kilogramdır. "
              "tıra on paket sığıyor, on bir paket sığmıyor. "
              "on paket on sekiz bini geçmemeli, yani bir paket en fazla bin sekiz yüz kilogram. "
              "on bir paket ise on sekiz bini geçmeli, yani bir paket bin altı yüz otuz altıdan fazla."),
         title="2. Adım · Tır sınırı",
         say="10 sığar, 11 sığmaz: aralığı bul.",
         lines=["18 ton = 18 000 kg",
                "10 paket sığar:  10 · P ≤ 18 000",
                "→  P ≤ 1800",
                "11 paket sığmaz:  11 · P > 18 000",
                "→  P > 1636,3…",
                "1636,3… < P ≤ 1800"]),
    dict(kind="step",
         tts=("adım üç. yüz yetmiş beşin katlarına bakalım. "
              "bin beş yüz yetmiş beş küçük kalıyor, bin dokuz yüz yirmi beş ise çok büyük. "
              "aralığa düşen tek değer, bin yedi yüz elli. "
              "demek ki bir paket, bin yedi yüz elli kilogram."),
         title="3. Adım · Doğru kat",
         say="Aralıkta tek kat var: 1750",
         lines=["175 · 9  = 1575   ✗  (çok küçük)",
                "175 · 10 = 1750   ✓",
                "175 · 11 = 1925   ✗  (çok büyük)",
                "P = 1750 kg"]),
    dict(kind="step",
         tts=("adım dört. ince demir paketinde, bin yedi yüz elli bölü yirmi beş, yetmiş demir var. "
              "kalın demir paketinde, bin yedi yüz elli bölü otuz beş, elli demir var. "
              "fark, yetmiş eksi elli, yirmi. doğru cevap, de şıkkı!"),
         title="4. Adım · Fark",
         say="Cevap D! Doğru bulduysan yoruma yaz.",
         lines=["İnce:   1750 ÷ 25 = 70 demir",
                "Kalın:  1750 ÷ 35 = 50 demir",
                "Fark:   70 − 50 = 20",
                "Cevap: D) 20"]),
    dict(kind="outro",
         tts=("püf noktası: soru eşit paket diyorsa, ekoku düşün! "
              "takip et, her gün bir le ge se sorusunu birlikte çözelim."),
         title="Püf noktası",
         lines=["\"Eşit paket\" → EKOK'u düşün!",
                "Takip et, her gün 1 LGS sorusu"]),
]
