"""AI Hocam karakteri: tablet-ekran yüzlü, gözlüklü, mezuniyet kepli, papyonlu sevimli robot öğretmen."""
from PIL import Image, ImageDraw, ImageFilter

TEAL = (20, 184, 166)
TEAL_D = (13, 116, 108)
NAVY = (15, 23, 42)
SCREEN = (8, 30, 48)
GLOW = (110, 255, 230)
CORAL = (251, 113, 133)
GOLD = (250, 204, 21)
WHITE = (255, 255, 255)


def draw_avatar(size=600, mouth=0.0, blink=False, look=0.0, cap=True):
    """mouth: 0..1 ağız açıklığı, blink: göz kırpma, look: -1..1 göz yönü."""
    S = size * 2  # supersample
    im = Image.new("RGBA", (S, int(S * 1.15)), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    u = S / 100.0
    cx = S / 2

    # gövde + papyon
    d.rounded_rectangle([cx - 30 * u, 86 * u, cx + 30 * u, 115 * u], radius=12 * u, fill=TEAL_D)
    d.rounded_rectangle([cx - 24 * u, 92 * u, cx + 24 * u, 115 * u], radius=8 * u, fill=WHITE)
    d.polygon([(cx, 96 * u), (cx - 9 * u, 91 * u), (cx - 9 * u, 101 * u)], fill=CORAL)
    d.polygon([(cx, 96 * u), (cx + 9 * u, 91 * u), (cx + 9 * u, 101 * u)], fill=CORAL)
    d.ellipse([cx - 2.5 * u, 93.5 * u, cx + 2.5 * u, 98.5 * u], fill=(225, 80, 100))
    # boyun
    d.rectangle([cx - 7 * u, 80 * u, cx + 7 * u, 90 * u], fill=(148, 163, 184))

    # anten + ampul
    d.line([cx, 14 * u, cx, 24 * u], fill=(148, 163, 184), width=int(2 * u))
    glow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([cx - 7 * u, 4 * u, cx + 7 * u, 18 * u], fill=GOLD + (160,))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(3 * u)))
    d.ellipse([cx - 4.5 * u, 6.5 * u, cx + 4.5 * u, 15.5 * u], fill=GOLD)

    # kafa
    d.rounded_rectangle([cx - 36 * u, 22 * u, cx + 36 * u, 82 * u], radius=18 * u, fill=TEAL)
    d.rounded_rectangle([cx - 36 * u, 22 * u, cx + 36 * u, 40 * u], radius=18 * u, fill=(45, 212, 191))
    d.rectangle([cx - 36 * u, 31 * u, cx + 36 * u, 40 * u], fill=TEAL)
    # kulaklar
    for sx in (-1, 1):
        x = cx + sx * 39 * u
        d.rounded_rectangle([x - 5 * u, 44 * u, x + 5 * u, 62 * u], radius=4 * u, fill=TEAL_D)
    # ekran yüz
    d.rounded_rectangle([cx - 29 * u, 30 * u, cx + 29 * u, 75 * u], radius=12 * u, fill=SCREEN)

    # gözler
    ex = look * 2.5 * u
    for sx in (-1, 1):
        x = cx + sx * 12 * u + ex
        y = 47 * u
        if blink:
            d.rounded_rectangle([x - 6 * u, y - 1 * u, x + 6 * u, y + 1.5 * u], radius=1 * u, fill=GLOW)
        else:
            d.ellipse([x - 5.5 * u, y - 6.5 * u, x + 5.5 * u, y + 6.5 * u], fill=GLOW)
            d.ellipse([x - 1 * u + 1.5 * u, y - 4 * u, x + 3 * u, y], fill=WHITE)
    # yanaklar
    for sx in (-1, 1):
        x = cx + sx * 21 * u
        d.ellipse([x - 4 * u, 57 * u, x + 4 * u, 61 * u], fill=(244, 114, 182, 140))
    # gözlük
    for sx in (-1, 1):
        x = cx + sx * 12 * u
        d.rounded_rectangle([x - 9.5 * u, 39 * u, x + 9.5 * u, 55 * u], radius=5 * u,
                            outline=WHITE, width=int(1.6 * u))
    d.line([cx - 2.5 * u, 45 * u, cx + 2.5 * u, 45 * u], fill=WHITE, width=int(1.6 * u))

    # ağız
    my = 64 * u
    if mouth < 0.08:
        d.arc([cx - 8 * u, my - 6 * u, cx + 8 * u, my + 3 * u], 20, 160, fill=GLOW, width=int(1.8 * u))
    else:
        h = 2 + mouth * 7
        d.rounded_rectangle([cx - 7 * u, my - 1 * u, cx + 7 * u, my - 1 * u + h * u],
                            radius=min(h, 7) * u / 2, fill=GLOW)
        if h > 4:
            d.rounded_rectangle([cx - 4 * u, my + (h - 3) * u, cx + 4 * u, my + (h - 1.2) * u],
                                radius=1 * u, fill=CORAL)

    # mezuniyet kepi
    if cap:
        d.polygon([(cx - 30 * u, 22 * u), (cx + 4 * u, 12 * u), (cx + 38 * u, 22 * u), (cx + 4 * u, 31 * u)],
                  fill=NAVY)
        d.rectangle([cx - 16 * u, 22 * u, cx + 20 * u, 28 * u], fill=NAVY)
        d.line([cx + 4 * u, 21 * u, cx + 30 * u, 24 * u, cx + 30 * u, 34 * u], fill=GOLD, width=int(1.2 * u))
        d.ellipse([cx + 28 * u, 33 * u, cx + 32 * u, 38 * u], fill=GOLD)

    return im.resize((size, int(size * 1.15)), Image.LANCZOS)


if __name__ == "__main__":
    import sys
    out = sys.argv[1]
    # karakter kartı
    W, H = 1080, 1350
    card = Image.new("RGB", (W, H), (240, 253, 250))
    d = ImageDraw.Draw(card)
    from PIL import ImageFont
    B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    d.rounded_rectangle([40, 40, W - 40, H - 40], radius=40, fill=WHITE, outline=TEAL, width=6)
    av = draw_avatar(520, mouth=0.5)
    card.paste(av, ((W - av.width) // 2, 80), av)
    f1 = ImageFont.truetype(B, 84)
    d.text((W / 2, 720), "AI Hocam", font=f1, fill=TEAL_D, anchor="mm")
    f2 = ImageFont.truetype(R, 36)
    d.text((W / 2, 790), "LGS sorularını adım adım çözen robot öğretmen", font=f2, fill=NAVY, anchor="mm")
    lines = [
        ("Görünüm", "Ekran yüz, gözlük, kep, papyon"),
        ("Renkler", "Turkuaz, lacivert, mercan"),
        ("Tarzı", "Samimi, sakin, cesaret veren"),
        ("Açılış", "\"Selam! Ben AI Hocam.\""),
        ("Kapanış", "\"Takip et, her gün bir LGS sorusu!\""),
    ]
    f3b = ImageFont.truetype(B, 32)
    f3 = ImageFont.truetype(R, 30)
    y = 870
    for k, v in lines:
        d.text((110, y), k, font=f3b, fill=TEAL_D)
        d.text((330, y), v, font=f3, fill=NAVY)
        y += 72
    card.save(out)
    # sprite örnekleri
    sheet = Image.new("RGB", (1600, 520), (240, 253, 250))
    for i, (m, b) in enumerate([(0, False), (0.5, False), (1, False), (0, True)]):
        a = draw_avatar(400, mouth=m, blink=b)
        sheet.paste(a, (i * 400, 30), a)
    sheet.save(out.replace(".png", "_ifadeler.png"))
