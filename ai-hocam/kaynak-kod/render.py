"""AI Hocam LGS Reels üretici. Kullanım: python3 render.py script_q1 out.mp4"""
import importlib, math, os, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from avatar import draw_avatar, TEAL, TEAL_D, NAVY, GOLD, CORAL, WHITE

HERE = os.path.dirname(os.path.abspath(__file__))
W, H, FPS = 1080, 1920, 30
B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
TTS = "/tmp/ttsenv/bin/tts"
M = "/tmp/tts/tts_models--tr--common-voice--glow-tts"
V = "/tmp/tts/vocoder_models--tr--common-voice--hifigan"
GAP = 0.45  # sahneler arası sessizlik (sn)

mod = importlib.import_module(sys.argv[1])
OUT = sys.argv[2]
WORK = os.path.join(HERE, "work", mod.META["id"])
os.makedirs(WORK, exist_ok=True)


def font(path, size, _c={}):
    k = (path, size)
    if k not in _c:
        _c[k] = ImageFont.truetype(path, size)
    return _c[k]


# ---------- ses ----------
def synth(i, text):
    p = os.path.join(WORK, f"s{i}.wav")
    if not os.path.exists(p):
        subprocess.run([TTS, "--text", text, "--model_path", f"{M}/model_file.pth", "--config_path",
                        f"{M}/config.json", "--vocoder_path", f"{V}/model_file.pth", "--vocoder_config_path",
                        f"{V}/config.json", "--out_path", p], check=True, capture_output=True)
    pf = p.replace(".wav", "_fast.wav")
    if not os.path.exists(pf):
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", p, "-af", "atempo=1.12", pf], check=True)
    p = pf
    with wave.open(p) as w:
        sr = w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return sr, a


segs, sr = [], None
for i, sc in enumerate(mod.SCENES):
    sr, a = synth(i, sc["tts"])
    segs.append(a)

audio = []
timeline = []  # (start, speech_end, end)
t = 0.4
audio.append(np.zeros(int(0.4 * sr), np.float32))
for sc, a in zip(mod.SCENES, segs):
    a = a / max(1e-6, np.abs(a).max()) * 0.85
    dur = len(a) / sr
    end = t + dur + sc.get("extra_silence", 0) + GAP
    timeline.append((t, t + dur, end))
    audio.append(a)
    audio.append(np.zeros(int((end - t - dur) * sr), np.float32))
    t = end
audio = np.concatenate(audio)
total = len(audio) / sr
wav_path = os.path.join(WORK, "voice.wav")
with wave.open(wav_path, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((np.clip(audio, -1, 1) * 32767).astype(np.int16).tobytes())

nframes = int(total * FPS) + 1
hop = sr // FPS
rms = np.array([np.sqrt(np.mean(audio[f * hop:(f + 1) * hop] ** 2)) if f * hop < len(audio) else 0
                for f in range(nframes)])
mouth = np.clip(rms / (np.percentile(rms[rms > 0.01], 90) if (rms > 0.01).any() else 1), 0, 1)
mouth = np.convolve(mouth, [0.25, 0.5, 0.25], mode="same")


# ---------- statik katmanlar ----------
def background():
    im = Image.new("RGB", (W, H))
    top, bot = np.array((11, 18, 38)), np.array((14, 64, 62))
    g = np.linspace(0, 1, H)[:, None]
    arr = (top * (1 - g) + bot * g).astype(np.uint8)
    im = Image.fromarray(np.repeat(arr[:, None, :], W, axis=1).reshape(H, W, 3))
    d = ImageDraw.Draw(im)
    for y in range(0, H, 48):
        for x in range(0, W, 48):
            d.point((x, y), fill=(40, 80, 90))
    # başlık
    d.rounded_rectangle([60, 95, 430, 165], radius=35, fill=TEAL)
    d.text((245, 130), mod.META["etiket"], font=font(B, 34), fill=NAVY, anchor="mm")
    av = draw_avatar(90, mouth=0.0)
    im.paste(av, (W - 360, 78), av)
    d.text((W - 260, 130), "AI Hocam", font=font(B, 46), fill=WHITE, anchor="lm")
    d.text((W / 2, 225), mod.META["kaynak"], font=font(R, 27), fill=(153, 246, 228), anchor="mm")
    return im


BG = background()
BX0, BY0, BX1, BY1 = 50, 280, 1030, 1240


def wrap(text, f, maxw):
    words, rows, cur = text.split(" "), [], ""
    for wd in words:
        tryl = (cur + " " + wd).strip() if wd else cur + " "
        if f.getlength(tryl) <= maxw:
            cur = tryl
        else:
            rows.append(cur); cur = wd
    rows.append(cur)
    return rows


def board_layout(sc):
    kind = sc["kind"]
    size = 54 if kind != "question" else 46
    f = font(B if kind in ("intro", "outro") else R, size + (6 if kind in ("intro", "outro") else 0))
    rows = []  # (line_index, text)
    for li, line in enumerate(sc["lines"]):
        for r in wrap(line, f, BX1 - BX0 - 110):
            rows.append((li, r))
    return f, rows, int(size * 1.75)


def is_answer(sc, line):
    return line.startswith("Cevap") or line.startswith("P = ") or line.startswith("1636,3… <") \
        or ("EKOK" in line and "=" in line)


def draw_board(base, sc, sidx, t_in, t_speech):
    d = ImageDraw.Draw(base, "RGBA")
    d.rounded_rectangle([BX0, BY0, BX1, BY1], radius=36, fill=(16, 42, 44), outline=TEAL, width=5)
    # adım noktaları
    steps = [i for i, s in enumerate(mod.SCENES) if s["kind"] == "step"]
    if steps:
        for k, si in enumerate(steps):
            x = BX1 - 60 - (len(steps) - 1 - k) * 40
            on = sidx >= si
            d.ellipse([x - 11, BY0 + 49, x + 11, BY0 + 71], fill=GOLD if on else (60, 90, 95))
    d.text((BX0 + 55, BY0 + 60), sc["title"], font=font(B, 50), fill=GOLD, anchor="lm")
    d.line([BX0 + 55, BY0 + 105, BX1 - 55, BY0 + 105], fill=(45, 120, 115), width=3)

    if sc["kind"] == "pause":
        # geri sayım
        el = t_in - t_speech
        n = 3 - int(max(0, el) / (sc.get("extra_silence", 2.5) / 3))
        cy = (BY0 + BY1) / 2 + 40
        d.ellipse([W / 2 - 190, cy - 190, W / 2 + 190, cy + 190], outline=TEAL, width=10)
        txt = str(max(1, n)) if el > 0 else "⏸"
        d.text((W / 2, cy), txt, font=font(B, 200), fill=WHITE, anchor="mm")
        return

    f, rows, lh = board_layout(sc)
    nlines = max(1, len(sc["lines"]))
    reveal_span = (t_speech) * (0.7 if sc["kind"] == "question" else 0.88)
    y = BY0 + 160
    if sc["kind"] in ("intro", "outro"):
        y = BY0 + 330
    for li, r in rows:
        appear = reveal_span * li / nlines
        a = min(1.0, max(0.0, (t_in - appear) / 0.35))
        if a <= 0:
            y += lh
            continue
        dy = int((1 - a) * 18)
        line = sc["lines"][li]
        hi = is_answer(sc, line)
        x = BX0 + 55
        if sc["kind"] in ("intro", "outro"):
            x = W / 2
        col = (GOLD if hi else (236, 253, 245)) + (int(255 * a),)
        if hi and a >= 1 and line.startswith("Cevap"):
            tw = f.getlength(r)
            d.rounded_rectangle([x - 20, y - 12 + dy, x + tw + 20, y + lh - 30 + dy], radius=18,
                                fill=(250, 204, 21, 45), outline=GOLD, width=3)
        d.text((x, y + dy), r, font=f, fill=col, anchor="ma" if x == W / 2 else "la")
        y += lh


BUBBLES = {"intro": "Selam! Ben AI Hocam.", "question": "Soruyu dikkatle oku.",
           "pause": "Videoyu durdur, önce sen dene!", "outro": "Takip et, her gün 1 LGS sorusu!"}


def bubble_text(sc):
    if sc.get("say"):
        return sc["say"]
    if sc["kind"] == "step":
        return sc["title"].split("·")[-1].strip() + "…"
    return BUBBLES[sc["kind"]]


def draw_bubble(base, txt):
    d = ImageDraw.Draw(base)
    x0, y0, x1, y1 = 470, 1320, 1020, 1500
    d.rounded_rectangle([x0, y0, x1, y1], radius=36, fill=WHITE)
    d.polygon([(x0 + 5, y0 + 70), (x0 - 40, y0 + 120), (x0 + 5, y0 + 110)], fill=WHITE)
    f = font(B, 40)
    rows = wrap(txt, f, x1 - x0 - 70)
    yy = (y0 + y1) / 2 - (len(rows) - 1) * 26
    for r in rows:
        d.text(((x0 + x1) / 2, yy), r, font=f, fill=NAVY, anchor="mm")
        yy += 52


# avatar kareleri önbellek
AV = {}


def avatar_img(m, blink):
    k = (round(m * 6) / 6, blink)
    if k not in AV:
        AV[k] = draw_avatar(400, mouth=k[0], blink=blink)
    return AV[k]


def scene_at(tt):
    for i, (s, se, e) in enumerate(timeline):
        if tt < e:
            return i
    return len(timeline) - 1


proc = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s",
                         f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", wav_path, "-c:v", "libx264", "-preset",
                         "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar",
                         "44100", "-shortest", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)

cache = {}
for fr in range(nframes):
    tt = fr / FPS
    si = scene_at(tt)
    s, se, e = timeline[si]
    sc = mod.SCENES[si]
    t_in = tt - s
    # sahne çizimi (aynı içerikte önbellek)
    f_, rows, _ = (None, [], None) if sc["kind"] == "pause" else board_layout(sc)
    key = (si, round(t_in * FPS) if (t_in < (se - s) * 0.9 + 0.5 or sc["kind"] == "pause") else -1)
    if key not in cache:
        if len(cache) > 3:
            cache.clear()
        im = BG.copy()
        draw_board(im, sc, si, max(0, t_in), se - s)
        draw_bubble(im, bubble_text(sc))
        cache[key] = im
    frame = cache[key].copy()
    blink = (tt % 3.7) < 0.12
    m = mouth[fr] if s <= tt <= se else 0.0
    av = avatar_img(m, blink)
    bob = int(math.sin(tt * 2.2) * 8)
    frame.paste(av, (40, 1250 + bob), av)
    # ilerleme çubuğu
    d = ImageDraw.Draw(frame)
    d.rectangle([0, 0, int(W * tt / total), 10], fill=TEAL)
    proc.stdin.write(frame.tobytes())
proc.stdin.close()
proc.wait()
print("OK", OUT, f"{total:.1f}s", nframes, "frames")
