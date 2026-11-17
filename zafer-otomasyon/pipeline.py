"""Zafer günlük klip sistemi (GitHub Actions sürümü).

Her çalıştırmada:
  1. Ümit Özdağ / Zafer Partisi resmi kanallarından son konuşmaları bulur.
  2. Daha önce kullanılmamış bir videonun Türkçe otomatik altyazısını indirir.
  3. Claude'a transkripti verip 30-60 sn'lik kesintisiz bir bölüm seçtirir.
  4. Bölümü Zafer çerçevesiyle (logo, başlık, altyazı, @hesap) dikey video olarak keser.
  5. zafer-klipler/gunluk/<tarih>/ altına .mp4 + .txt yazar, README'yi günceller.
  Sabah çalıştırmasında ayrıca haber başlıklarından alıntı kartları hazırlar.

Hiçbir şeyi Instagram'a paylaşmaz.
"""

from __future__ import annotations

import datetime as dt
import html
import json
import os
import re
import subprocess
import sys
import textwrap
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

import anthropic
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = Path(__file__).resolve().parent / "assets"
OUT_ROOT = ROOT / "zafer-klipler"
WORK = Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "zafer-work"
USED_FILE = OUT_ROOT / "kullanilanlar.json"

HANDLE = "@haydizafereankara"
IST = dt.timezone(dt.timedelta(hours=3))
OFFICIAL_CHANNEL_HINTS = ("ümit özdağ", "umit ozdag", "zafer partisi")
SEARCH_QUERIES = ["Ümit Özdağ konuşma", "Ümit Özdağ", "Zafer Partisi Ümit Özdağ"]
MODEL = "claude-opus-5-5"

RED = (200, 16, 46)
DARK_RED = (120, 8, 24)
WHITE = (255, 255, 255)
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

W, H = 1080, 1920
VIDEO_TOP = 640          # videonun üst kenarı
VIDEO_MAX_H = 760        # video alanı yüksekliği
SUB_TOP = VIDEO_TOP + VIDEO_MAX_H + 30


def log(msg: str) -> None:
    print(f"[zafer] {msg}", flush=True)


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    log("$ " + " ".join(cmd)[:300])
    return subprocess.run(cmd, check=True, text=True, capture_output=True, **kw)


# ---------------------------------------------------------------- kayıtlar

def load_used() -> dict:
    if USED_FILE.exists():
        return json.loads(USED_FILE.read_text(encoding="utf-8"))
    return {"videos": {}, "quotes": []}


def save_used(used: dict) -> None:
    USED_FILE.parent.mkdir(parents=True, exist_ok=True)
    USED_FILE.write_text(json.dumps(used, ensure_ascii=False, indent=2), encoding="utf-8")


# ---------------------------------------------------------------- video bulma

def ytdlp_base() -> list[str]:
    cmd = ["yt-dlp", "--no-warnings"]
    cookies = os.environ.get("YT_COOKIES_FILE")
    if cookies and Path(cookies).exists() and Path(cookies).stat().st_size > 0:
        cmd += ["--cookies", cookies]
    return cmd


def find_candidates(max_age_days: int) -> list[dict]:
    seen, out = set(), []
    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=max_age_days)
    for q in SEARCH_QUERIES:
        try:
            res = run(ytdlp_base() + ["--flat-playlist", "-J", f"ytsearchdate25:{q}"])
        except subprocess.CalledProcessError as e:
            log(f"arama başarısız: {q}: {e.stderr[-400:]}")
            continue
        for ent in json.loads(res.stdout).get("entries") or []:
            vid = ent.get("id")
            chan = (ent.get("channel") or ent.get("uploader") or "").lower()
            if not vid or vid in seen:
                continue
            if not any(h in chan for h in OFFICIAL_CHANNEL_HINTS):
                continue
            dur = ent.get("duration") or 0
            if dur and dur < 90:  # kısa/short videoları atla
                continue
            seen.add(vid)
            out.append({"id": vid, "title": ent.get("title", ""), "channel": ent.get("channel") or ent.get("uploader"),
                        "url": f"https://www.youtube.com/watch?v={vid}", "timestamp": ent.get("timestamp")})
    # tarih bilgisi varsa eskiyi ele
    fresh = [c for c in out if not c["timestamp"] or dt.datetime.fromtimestamp(c["timestamp"], dt.timezone.utc) >= cutoff]
    return fresh


def download(video: dict) -> tuple[Path, Path, dict]:
    d = WORK / video["id"]
    d.mkdir(parents=True, exist_ok=True)
    run(ytdlp_base() + [
        "-f", "bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720]/b",
        "--merge-output-format", "mp4",
        "--write-auto-subs", "--write-subs", "--sub-langs", "tr.*,tr", "--sub-format", "vtt",
        "--write-info-json",
        "-o", str(d / "src.%(ext)s"), video["url"],
    ])
    mp4 = d / "src.mp4"
    vtts = sorted(d.glob("src*.vtt"))
    if not mp4.exists() or not vtts:
        raise RuntimeError("video ya da Türkçe altyazı indirilemedi")
    info = json.loads((d / "src.info.json").read_text(encoding="utf-8"))
    return mp4, vtts[0], info


# ---------------------------------------------------------------- altyazı

def _ts(s: str) -> float:
    h, m, rest = s.split(":") if s.count(":") == 2 else ("0", *s.split(":"))
    return int(h) * 3600 + int(m) * 60 + float(rest)


def parse_vtt(path: Path) -> list[dict]:
    """YouTube otomatik altyazısındaki tekrar eden (kayan) satırları temizler."""
    cues, prev = [], ""
    for b in path.read_text(encoding="utf-8").split("\n\n"):
        m = re.search(r"(\d[\d:.]+) --> (\d[\d:.]+)", b)
        if not m:
            continue
        lines = [re.sub(r"<[^>]+>", "", ln).strip() for ln in b.splitlines() if "-->" not in ln]
        lines = [html.unescape(ln) for ln in lines if ln]
        if not lines:
            continue
        text = lines[-1]
        if text == prev:
            continue
        prev = text
        text = re.sub(r"\b(e+|ı+|ee+h|hmm+)\b[,.]?\s*", "", text, flags=re.I).strip()
        if text:
            cues.append({"start": _ts(m.group(1)), "end": _ts(m.group(2)), "text": text})
    # kısa süreli geçiş cue'larını birleştir: bitişi bir sonrakinin başlangıcına uzat
    for a, b in zip(cues, cues[1:]):
        a["end"] = max(a["end"], b["start"])
    return cues


def transcript_text(cues: list[dict]) -> str:
    return "\n".join(f"[{c['start']:.1f}-{c['end']:.1f}] {c['text']}" for c in cues)


# ---------------------------------------------------------------- Claude

SELECT_SCHEMA = {
    "type": "object",
    "properties": {
        "uygun": {"type": "boolean"},
        "baslangic": {"type": "number"},
        "bitis": {"type": "number"},
        "baslik": {"type": "string"},
        "aciklama": {"type": "string"},
        "neden": {"type": "string"},
    },
    "required": ["uygun", "baslangic", "bitis", "baslik", "aciklama", "neden"],
    "additionalProperties": False,
}

SELECT_PROMPT = """Aşağıda Ümit Özdağ'ın bir konuşmasının zaman damgalı Türkçe otomatik transkripti var.
Gençlere yönelik bir Instagram sayfası için tek bir Reels bölümü seç.

Kurallar:
- Bölüm 30 ile 60 saniye arasında, kesintisiz tek parça olmalı ve kendi içinde tamamlanan bir fikir anlatmalı.
- Cümlenin ortasından başlama ya da bitirme; başlangıç ve bitişi transkriptteki zaman damgalarından seç.
- Herhangi bir etnik grubu, milleti, dini ya da özel bir kişiyi aşağılayan, insanlıktan çıkaran ya da onlara karşı kışkırtan bölümleri seçme. Politika eleştirisi uygundur.
- Uygun bölüm yoksa "uygun": false döndür.
- "baslik": en fazla 4 kelimelik, BÜYÜK HARFLİ, söylenenden fazlasını iddia etmeyen Türkçe başlık.
- "aciklama": Instagram açıklaması (2-3 cümle + 6-8 hashtag, #ZaferPartisi #ÜmitÖzdağ dahil). Söylenmeyen bir şeyi söylemiş gibi gösterme.
- "neden": seçimin kısa gerekçesi.

Video: {title} ({channel})

Transkript:
{transcript}
"""


def choose_segment(video: dict, cues: list[dict]) -> dict | None:
    client = anthropic.Anthropic()
    prompt = SELECT_PROMPT.format(title=video["title"], channel=video["channel"], transcript=transcript_text(cues))
    with client.beta.messages.stream(
        model=MODEL,
        max_tokens=16000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        output_config={"effort": "medium", "format": {"type": "json_schema", "schema": SELECT_SCHEMA}},
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        msg = stream.get_final_message()
    if msg.stop_reason == "refusal":
        log("model bu videoyu reddetti")
        return None
    text = next((b.text for b in msg.content if b.type == "text"), "")
    data = json.loads(text)
    if not data["uygun"]:
        log(f"uygun bölüm yok: {data['neden']}")
        return None
    dur = data["bitis"] - data["baslangic"]
    if not 25 <= dur <= 65:
        log(f"süre geçersiz ({dur:.1f}s)")
        return None
    return data


# ---------------------------------------------------------------- tasarım

def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def draw_frame(headline: str, out: Path, size=(W, H)) -> None:
    w, h = size
    img = Image.new("RGB", size, RED)
    px = ImageDraw.Draw(img)
    for y in range(h):  # dikey degrade
        t = y / h
        px.line([(0, y), (w, y)], fill=tuple(int(RED[i] * (1 - t) + DARK_RED[i] * t) for i in range(3)))
    for x in range(-h, w, 60):  # hafif çapraz çizgiler
        px.line([(x, 0), (x + h, h)], fill=(215, 40, 66), width=2)

    # logo kartı
    logo = Image.open(ASSETS / "logo.png").convert("RGBA")
    gray = logo.convert("L").point(lambda v: 255 if v < 235 else 0)
    logo = logo.crop(gray.getbbox())  # beyaz kenar boşluğunu kırp
    lh = 300
    logo = logo.resize((int(logo.width * lh / logo.height), lh), Image.LANCZOS)
    cw = max(lh, logo.width) + 80
    card = Image.new("RGBA", (cw, lh + 50), (255, 255, 255, 0))
    ImageDraw.Draw(card).rounded_rectangle([0, 0, cw - 1, lh + 49], radius=36, fill=WHITE)
    card.paste(logo, ((cw - logo.width) // 2, 25), logo)
    img.paste(card, ((w - card.width) // 2, 50), card)

    # başlık kutusu
    f = font(FONT_BOLD, 64)
    lines = textwrap.wrap(headline, 22)[:2]
    box_h = 40 + 78 * len(lines)
    top = 430
    px.rounded_rectangle([60, top, w - 60, top + box_h], radius=20, fill=WHITE)
    for i, ln in enumerate(lines):
        tw = px.textlength(ln, font=f)
        px.text(((w - tw) / 2, top + 22 + 78 * i), ln, font=f, fill=RED)

    if size == (W, H):
        # alt bant
        f2 = font(FONT_BOLD, 44)
        tw = px.textlength(HANDLE, font=f2)
        px.text(((w - tw) / 2, h - 170), HANDLE, font=f2, fill=WHITE)
        f3 = font(FONT_REG, 28)
        src = "Kaynak: Prof. Dr. Ümit Özdağ – resmi yayınlar"
        tw = px.textlength(src, font=f3)
        px.text(((w - tw) / 2, h - 100), src, font=f3, fill=(255, 220, 220))
    img.save(out)


def ass_time(t: float) -> str:
    t = max(0.0, t)
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def write_ass(cues: list[dict], start: float, end: float, out: Path) -> str:
    events, quote = [], []
    for c in cues:
        if c["end"] <= start or c["start"] >= end:
            continue
        a, b = max(c["start"], start) - start, min(c["end"], end) - start
        txt = c["text"].replace("{", "").replace("}", "")
        quote.append(c["text"])
        events.append(f"Dialogue: 0,{ass_time(a)},{ass_time(b)},Alt,,0,0,0,,{txt}")
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Alt,DejaVu Sans,54,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,3,0,8,70,70,{SUB_TOP},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    out.write_text(header + "\n".join(events) + "\n", encoding="utf-8")
    return " ".join(quote)


def render(src: Path, frame: Path, ass: Path, start: float, end: float, out: Path) -> None:
    dur = end - start
    filt = (
        f"[1:v]scale={W - 40}:{VIDEO_MAX_H - 12}:force_original_aspect_ratio=decrease,pad=iw+12:ih+12:6:6:white[v];"
        f"[0:v][v]overlay=(W-w)/2:{VIDEO_TOP}+({VIDEO_MAX_H}-h)/2,ass={ass}[out]"
    )
    run([
        "ffmpeg", "-y", "-loop", "1", "-i", str(frame),
        "-ss", f"{start:.2f}", "-t", f"{dur:.2f}", "-i", str(src),
        "-filter_complex", filt, "-map", "[out]", "-map", "1:a?",
        "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p", "-r", "30",
        "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", str(out),
    ])


def slugify(s: str) -> str:
    tr = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")
    return re.sub(r"[^a-z0-9]+", "-", s.translate(tr).lower()).strip("-")[:40] or "klip"


# ---------------------------------------------------------------- haber alıntı kartları

def news_quote_cards(day_dir: Path, used: dict, limit: int = 2) -> list[str]:
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode(
        {"q": "Ümit Özdağ when:1d", "hl": "tr", "gl": "TR", "ceid": "TR:tr"})
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            root = ET.fromstring(r.read())
    except Exception as e:  # noqa: BLE001
        log(f"haber akışı okunamadı: {e}")
        return []
    made = []
    for item in root.iter("item"):
        if len(made) >= limit:
            break
        title = html.unescape(item.findtext("title") or "")
        link = item.findtext("link") or ""
        source = item.findtext("source") or ""
        date = item.findtext("pubDate") or ""
        m = re.search(r"[\"“'‘]([^\"”'’]{15,140})[\"”'’]", title)
        if not m or "Özdağ" not in title:
            continue
        quote = m.group(1).strip()
        if quote in used["quotes"]:
            continue
        headline = textwrap.shorten(quote.upper(), 34, placeholder="…")
        name = f"alinti_{len(made) + 1}_{slugify(quote)}"
        img_path = day_dir / f"{name}.jpg"
        draw_quote_card(headline, quote, source, date, img_path)
        (day_dir / f"{name}.txt").write_text(
            f"Alıntı: \"{quote}\"\nHaber başlığı: {title}\nKaynak: {source}\nTarih: {date}\nLink: {link}\n"
            "Not: Alıntı haber başlığında birebir geçiyor. Paylaşmadan önce haberin kendisini okuyun.\n",
            encoding="utf-8")
        used["quotes"].append(quote)
        made.append(img_path.name)
    return made


def draw_quote_card(headline: str, quote: str, source: str, date: str, out: Path) -> None:
    tmp = out.with_suffix(".png")
    draw_frame(headline, tmp, size=(1080, 1350))
    img = Image.open(tmp).convert("RGB")
    px = ImageDraw.Draw(img)
    f = font(FONT_BOLD, 52)
    y = 640
    for ln in textwrap.wrap(f"“{quote}”", 30)[:6]:
        tw = px.textlength(ln, font=f)
        px.text(((1080 - tw) / 2, y), ln, font=f, fill=WHITE)
        y += 70
    f2 = font(FONT_REG, 30)
    meta = f"Ümit Özdağ · {source} · {date[:16]}"
    tw = px.textlength(meta, font=f2)
    px.text(((1080 - tw) / 2, 1180), meta, font=f2, fill=(255, 220, 220))
    f3 = font(FONT_BOLD, 38)
    tw = px.textlength(HANDLE, font=f3)
    px.text(((1080 - tw) / 2, 1250), HANDLE, font=f3, fill=WHITE)
    img.save(out, quality=92)
    tmp.unlink()


# ---------------------------------------------------------------- README

def update_readme() -> None:
    lines = ["# Zafer klipleri", "",
             "Günlük olarak otomatik hazırlanan klipler ve alıntı kartları. Hiçbiri otomatik paylaşılmaz.", ""]
    gunluk = OUT_ROOT / "gunluk"
    for day in sorted(gunluk.glob("*"), reverse=True) if gunluk.exists() else []:
        lines.append(f"## {day.name}")
        for f in sorted(day.iterdir()):
            if f.suffix in (".mp4", ".jpg", ".txt"):
                lines.append(f"- [{f.name}](gunluk/{day.name}/{urllib.parse.quote(f.name)})")
        lines.append("")
    (OUT_ROOT / "README.md").write_text("\n".join(lines), encoding="utf-8")


# ---------------------------------------------------------------- ana akış

def main() -> int:
    now = dt.datetime.now(IST)
    slot = os.environ.get("SLOT") or {6: "1000", 7: "1000", 8: "1200", 9: "1200"}.get(
        dt.datetime.now(dt.timezone.utc).hour, "1700")
    day_dir = OUT_ROOT / "gunluk" / now.strftime("%Y-%m-%d")
    day_dir.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)
    used = load_used()

    if slot == "1000":
        cards = news_quote_cards(day_dir, used)
        log(f"alıntı kartları: {cards}")

    made = False
    for max_age in (7, 30):
        for video in find_candidates(max_age):
            if used["videos"].get(video["id"], {}).get("tukendi"):
                continue
            try:
                src, vtt, info = download(video)
                cues = parse_vtt(vtt)
                # daha önce kullanılan aralıkları transkriptten çıkar
                taken = used["videos"].get(video["id"], {}).get("araliklar", [])
                cues = [c for c in cues if not any(a <= c["start"] < b for a, b in taken)]
                if len(cues) < 10:
                    used["videos"].setdefault(video["id"], {})["tukendi"] = True
                    continue
                seg = choose_segment(video, cues)
                if not seg:
                    used["videos"].setdefault(video["id"], {})["tukendi"] = True
                    continue
                name = f"{slot}_{slugify(seg['baslik'])}"
                frame = WORK / f"{name}_frame.png"
                ass = WORK / f"{name}.ass"
                draw_frame(seg["baslik"], frame)
                quote = write_ass(cues, seg["baslangic"], seg["bitis"], ass)
                render(src, frame, ass, seg["baslangic"], seg["bitis"], day_dir / f"{name}.mp4")
                upload = info.get("upload_date", "")
                (day_dir / f"{name}.txt").write_text(
                    f"Başlık: {seg['baslik']}\nKaynak: {video['title']} ({video['channel']}, {upload})\n"
                    f"Link: {video['url']}&t={int(seg['baslangic'])}s\n"
                    f"Aralık: {seg['baslangic']:.1f}s – {seg['bitis']:.1f}s\n\n"
                    f"Alıntı (otomatik transkript, paylaşmadan önce sesle kontrol edin):\n{quote}\n\n"
                    f"Önerilen açıklama:\n{seg['aciklama']}\n",
                    encoding="utf-8")
                used["videos"].setdefault(video["id"], {}).setdefault("araliklar", []).append(
                    [seg["baslangic"] - 30, seg["bitis"] + 30])
                made = True
                break
            except Exception as e:  # noqa: BLE001
                log(f"{video['id']} atlandı: {e}")
                continue
        if made:
            break

    if not made:
        (day_dir / f"{slot}_NOT.txt").write_text(
            "Bu saat için uygun yeni konuşma bulunamadı ya da indirilemedi. Ayrıntı için Actions günlüğüne bakın.\n",
            encoding="utf-8")
    save_used(used)
    update_readme()
    return 0


if __name__ == "__main__":
    sys.exit(main())
