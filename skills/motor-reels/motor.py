#!/usr/bin/env python3
"""Motor da skill de edição de reels.

Comandos:
  python motor.py setup                      instala tudo (uma vez só)
  python motor.py prep VIDEO --estilo NOME   prepara o vídeo (quadros, áudio, legendas)
  python motor.py render PASTA_DO_JOB        gera o mp4 final
  python motor.py stills PASTA_DO_JOB 1.5 4  gera imagens de conferência nesses segundos
  python motor.py diagnostico                mostra o que está instalado

Funciona em macOS, Windows e Linux. Precisa de Python 3.9+ e Node 18+.
"""
import json
import math
import os
import re
import shutil
import subprocess
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
VENV = os.path.join(HERE, ".venv")
IS_WIN = os.name == "nt"
VPY = os.path.join(VENV, "Scripts", "python.exe") if IS_WIN else os.path.join(VENV, "bin", "python")
CONFIG = os.path.join(HERE, ".motor.json")
MODEL = os.path.join(HERE, "models", "u2net_human_seg.onnx")
MODEL_URL = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net_human_seg.onnx"
PY_DEPS = ["faster-whisper>=1.0.3", "onnxruntime>=1.17", "pillow>=10", "numpy>=1.24", "imageio-ffmpeg>=0.5"]
ESTILOS = ["negocios", "ranking", "profundidade", "grade", "painel", "pessoal"]
PRECISA_MASCARA = {"profundidade", "grade"}
FPS = 30


# ---------------------------------------------------------------- utilidades
def say(msg):
    print(msg, flush=True)


def die(msg, code=1):
    print("\nERRO: " + msg, file=sys.stderr, flush=True)
    sys.exit(code)


def in_venv():
    return os.path.abspath(sys.prefix) == os.path.abspath(VENV)


def run_in_venv(argv):
    """Reexecuta este script dentro do ambiente isolado (.venv)."""
    if in_venv():
        return
    if not os.path.exists(VPY):
        die("O motor ainda não foi instalado. Rode primeiro:  python motor.py setup")
    r = subprocess.run([VPY, os.path.abspath(__file__)] + argv)
    sys.exit(r.returncode)


def load_cfg():
    if os.path.exists(CONFIG):
        with open(CONFIG, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cfg(cfg):
    with open(CONFIG, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)


def which_npm():
    for n in (["npm.cmd", "npm"] if IS_WIN else ["npm"]):
        p = shutil.which(n)
        if p:
            return p
    return None


def ffmpeg_exe():
    cfg = load_cfg()
    p = cfg.get("ffmpeg")
    if p and os.path.exists(p):
        return p
    p = shutil.which("ffmpeg")
    if p:
        return p
    try:
        import imageio_ffmpeg  # noqa
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        die("ffmpeg não encontrado. Rode:  python motor.py setup")


def ff(args, quiet=True):
    cmd = [ffmpeg_exe(), "-hide_banner", "-y"] + (["-loglevel", "error"] if quiet else []) + args
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        die("ffmpeg falhou:\n" + (r.stderr or "")[-2000:])
    return r


def ff_stderr(args):
    cmd = [ffmpeg_exe(), "-hide_banner"] + args
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.stderr or ""


def duracao(path):
    m = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", ff_stderr(["-i", path]))
    if not m:
        die("Não consegui ler a duração de " + path)
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)


def tem_audio(path):
    return bool(re.search(r"Stream #.*Audio:", ff_stderr(["-i", path])))


# ---------------------------------------------------------------- setup
def cmd_setup(args):
    say("== Instalando o motor de edição (só precisa fazer uma vez) ==")
    if sys.version_info < (3, 9):
        die("Precisa de Python 3.9 ou mais novo. Versão atual: " + sys.version.split()[0])

    # 1) ambiente Python isolado
    if not os.path.exists(VPY):
        say("[1/5] Criando ambiente Python isolado (.venv)...")
        r = subprocess.run([sys.executable, "-m", "venv", VENV])
        if r.returncode != 0:
            die("Não consegui criar o ambiente Python. No Ubuntu/Debian rode: sudo apt install python3-venv")
    else:
        say("[1/5] Ambiente Python já existe.")
    say("      Instalando bibliotecas Python (transcrição e recorte)...")
    r = subprocess.run([VPY, "-m", "pip", "install", "--disable-pip-version-check", "-q", "--upgrade", "pip"])
    r = subprocess.run([VPY, "-m", "pip", "install", "--disable-pip-version-check", "-q"] + PY_DEPS)
    if r.returncode != 0:
        die("Falha ao instalar as bibliotecas Python. Verifique a internet e rode o setup de novo.\n"
            "Se o seu Python for muito novo (3.14 ou mais), instale o Python 3.12, apague a pasta .venv\n"
            "e rode o setup com ele (Windows: py -3.12 motor.py setup | macOS: python3.12 motor.py setup).")

    # 2) ffmpeg
    say("[2/5] Localizando o ffmpeg...")
    sys_ff = shutil.which("ffmpeg")
    if sys_ff:
        ffp = sys_ff
    else:
        r = subprocess.run([VPY, "-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"],
                           capture_output=True, text=True)
        ffp = r.stdout.strip()
    if not ffp or not os.path.exists(ffp):
        die("ffmpeg não encontrado.")
    cfg = load_cfg()
    cfg["ffmpeg"] = ffp
    save_cfg(cfg)
    say("      ffmpeg: " + ffp)

    # 3) modelo de recorte
    say("[3/5] Modelo de recorte da pessoa (176 MB)...")
    if not os.path.exists(MODEL) or os.path.getsize(MODEL) < 100_000_000:
        os.makedirs(os.path.dirname(MODEL), exist_ok=True)
        tmp = MODEL + ".part"
        req = urllib.request.Request(MODEL_URL, headers={"User-Agent": "Mozilla/5.0 skill-edicao-reels"})
        with urllib.request.urlopen(req) as resp, open(tmp, "wb") as out:
            total = int(resp.headers.get("Content-Length") or 0)
            got = 0
            last = -1
            while True:
                buf = resp.read(1 << 20)
                if not buf:
                    break
                out.write(buf)
                got += len(buf)
                if total:
                    pct = int(got * 100 / total)
                    if pct // 10 != last:
                        last = pct // 10
                        say(f"      {pct}%")
        os.replace(tmp, MODEL)
    say("      ok")

    # 4) Node + Playwright
    say("[4/5] Instalando o renderizador (Node + Playwright)...")
    node = shutil.which("node")
    npm = which_npm()
    if not node or not npm:
        die("Node.js não encontrado. Instale o Node 18+ (https://nodejs.org) e rode o setup de novo.\n"
            "  macOS:   brew install node\n  Windows: winget install OpenJS.NodeJS.LTS\n  Linux:   use o gerenciador da sua distro ou nvm")
    v = subprocess.run([node, "-v"], capture_output=True, text=True).stdout.strip().lstrip("v")
    if int((v.split(".") or ["0"])[0] or 0) < 18:
        die("Node " + v + " é antigo demais. Instale o Node 18 ou mais novo.")
    r = subprocess.run([npm, "install", "--no-audit", "--no-fund", "--loglevel=error"], cwd=HERE)
    if r.returncode != 0:
        die("npm install falhou. Rode o setup de novo.")
    browser = None
    r = subprocess.run([node, os.path.join(HERE, "scripts", "render.mjs"), "--check-browser"],
                       capture_output=True, text=True, cwd=HERE)
    if r.returncode == 0:
        browser = r.stdout.strip().splitlines()[-1]
    else:
        say("      Baixando o navegador do renderizador (uma vez só, ~150 MB)...")
        npx = shutil.which("npx.cmd" if IS_WIN else "npx") or shutil.which("npx")
        subprocess.run([npx, "playwright", "install", "chromium"], cwd=HERE)
        r = subprocess.run([node, os.path.join(HERE, "scripts", "render.mjs"), "--check-browser"],
                           capture_output=True, text=True, cwd=HERE)
        if r.returncode != 0:
            die("Não consegui abrir nenhum navegador para renderizar.\n" + (r.stderr or "")[-1500:])
        browser = r.stdout.strip().splitlines()[-1]
    cfg = load_cfg()
    cfg["browser"] = browser
    save_cfg(cfg)
    say("      navegador: " + browser)

    # 5) modelo de transcrição
    modelo = args.get("modelo", "small")
    say(f"[5/5] Baixando o modelo de transcrição '{modelo}' (uma vez só)...")
    r = subprocess.run([VPY, os.path.abspath(__file__), "_baixar_whisper", modelo])
    if r.returncode != 0:
        die("Não consegui baixar o modelo de transcrição.")
    say("\nTudo pronto. Agora é só usar um dos comandos de estilo.")


def cmd_baixar_whisper(modelo):
    from faster_whisper import WhisperModel
    WhisperModel(modelo, device="cpu", compute_type="int8")
    say("      ok")


def cmd_diag(_args):
    cfg = load_cfg()
    say("Python do motor: " + ("ok" if os.path.exists(VPY) else "FALTA (rode setup)"))
    say("ffmpeg: " + str(cfg.get("ffmpeg")))
    say("navegador: " + str(cfg.get("browser")))
    say("modelo de recorte: " + ("ok" if os.path.exists(MODEL) else "FALTA (rode setup)"))
    say("node_modules: " + ("ok" if os.path.isdir(os.path.join(HERE, "node_modules", "playwright")) else "FALTA (rode setup)"))
    say("node: " + str(shutil.which("node")))


# ---------------------------------------------------------------- prep
def silencios_para_manter(wav, dur, limiar_db=-35, min_sil=0.35, folga=0.08):
    err = ff_stderr(["-i", wav, "-af", f"silencedetect=noise={limiar_db}dB:d={min_sil}", "-f", "null", "-"])
    starts = [float(x) for x in re.findall(r"silence_start:\s*([\d.]+)", err)]
    ends = [float(x) for x in re.findall(r"silence_end:\s*([\d.]+)", err)]
    sil = []
    for i, s in enumerate(starts):
        e = ends[i] if i < len(ends) else dur
        sil.append((s, e))
    keep = []
    cur = 0.0
    for s, e in sil:
        a, b = cur, min(dur, s + folga)
        if b - a > 0.12:
            keep.append((a, b))
        cur = max(0.0, e - folga)
    if dur - cur > 0.12:
        keep.append((cur, dur))
    return keep or [(0.0, dur)]


def mascara_sessao():
    import onnxruntime as ort
    so = ort.SessionOptions()
    so.intra_op_num_threads = max(1, (os.cpu_count() or 2) - 1)
    so.log_severity_level = 3
    return ort.InferenceSession(MODEL, so, providers=["CPUExecutionProvider"])


def mascara(sess, im):
    import numpy as np
    from PIL import Image
    iname = sess.get_inputs()[0].name
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    x = np.asarray(im.convert("RGB").resize((320, 320), Image.BILINEAR)).astype(np.float32) / 255.0
    mx = x.max()
    if mx > 0:
        x = x / mx
    x = (x - mean) / std
    x = x.transpose(2, 0, 1)[None].astype(np.float32)
    out = sess.run(None, {iname: x})[0][0, 0]
    out = (out - out.min()) / (out.max() - out.min() + 1e-8)
    return out  # 320x320 float 0..1


def enquadramento(frames_dir, n, sess):
    """Descobre onde a pessoa está (centro horizontal e topo da cabeça), 0..1."""
    import numpy as np
    from PIL import Image
    xs, tops = [], []
    for k in range(5):
        idx = 1 + int((n - 1) * (k + 0.5) / 5)
        f = os.path.join(frames_dir, f"f_{idx:05d}.jpg")
        if not os.path.exists(f):
            continue
        m = mascara(sess, Image.open(f))
        b = m > 0.5
        if b.sum() < 200:
            continue
        cols = b.sum(axis=0)
        # centro da parte de cima do corpo (cabeça/ombros) = mais estável
        rows = np.where(b.any(axis=1))[0]
        top = rows.min()
        upper = b[top: top + 120]
        ucols = upper.sum(axis=0)
        cx = (np.arange(320) * ucols).sum() / max(1, ucols.sum())
        xs.append(cx / 320.0)
        tops.append(top / 320.0)
    if not xs:
        return 0.5, 0.12
    xs.sort()
    tops.sort()
    return float(xs[len(xs) // 2]), float(tops[len(tops) // 2])


def transcrever(wav16, idioma, modelo, vocab):
    import wave
    import numpy as np
    from faster_whisper import WhisperModel
    w = wave.open(wav16)
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    m = WhisperModel(modelo, device="cpu", compute_type="int8")
    segs, _ = m.transcribe(a, beam_size=5, language=idioma or None, word_timestamps=True,
                           initial_prompt=vocab or None, vad_filter=False)
    words = []
    for s in segs:
        for x in (s.words or []):
            t = x.word.strip()
            if t:
                words.append([round(x.start, 2), round(x.end, 2), t])
    return words


def cmd_prep(args):
    video = args.get("_pos", [None])[0]
    if not video or not os.path.exists(video):
        die("Informe o caminho do vídeo:  python motor.py prep CAMINHO_DO_VIDEO --estilo NOME")
    video = os.path.abspath(video)
    estilo = args.get("estilo")
    if estilo not in ESTILOS:
        die("Use --estilo com um destes: " + ", ".join(ESTILOS))
    stem = os.path.splitext(os.path.basename(video))[0]
    job = os.path.abspath(args.get("saida") or os.path.join(os.path.dirname(video), f"{stem}_{estilo}_job"))
    os.makedirs(job, exist_ok=True)
    frames_dir = os.path.join(job, "frames")
    if os.path.isdir(frames_dir):
        shutil.rmtree(frames_dir)
    os.makedirs(frames_dir)
    if not tem_audio(video):
        die("Esse vídeo não tem áudio. A skill precisa da sua fala para sincronizar a edição.")

    say(f"== Preparando '{os.path.basename(video)}' no estilo {estilo} ==")
    ini = float(args.get("inicio", 0) or 0)
    fim = args.get("fim")
    cortar = args.get("cortar-silencios", estilo == "pessoal")
    cortar = cortar not in (False, "nao", "não", "0", "false")

    # 1) normaliza: corte de trecho, 30 fps, lado menor 1080
    say("[1/5] Normalizando o vídeo...")
    base = os.path.join(job, "fonte.mp4")
    trim = ["-ss", str(ini)] + (["-to", str(fim)] if fim else [])
    vf = f"fps={FPS},scale='if(gt(iw,ih),-2,1080)':'if(gt(iw,ih),1080,-2)':flags=lanczos,setsar=1"
    ff(trim + ["-i", video, "-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "16",
               "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", base])
    dur = duracao(base)

    # 2) cortes de silêncio (jump cuts)
    cortes = []
    if cortar:
        say("[2/5] Cortando os silêncios...")
        tmpwav = os.path.join(job, "_tmp.wav")
        ff(["-i", base, "-vn", "-ac", "1", "-ar", "16000", tmpwav])
        keep = silencios_para_manter(tmpwav, dur)
        os.remove(tmpwav)
        if len(keep) > 1:
            sel = "+".join(f"between(t,{a:.3f},{b:.3f})" for a, b in keep)
            cut = os.path.join(job, "fonte_cortada.mp4")
            ff(["-i", base, "-vf", f"select='{sel}',setpts=N/FRAME_RATE/TB",
                "-af", f"aselect='{sel}',asetpts=N/SR/TB",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "192k", cut])
            os.replace(cut, base)
            acc = 0.0
            for a, b in keep[:-1]:
                acc += b - a
                cortes.append(round(acc, 3))
            say(f"      {len(keep) - 1} cortes, {dur - duracao(base):.1f}s de silêncio removidos")
            dur = duracao(base)
    else:
        say("[2/5] Sem corte de silêncios.")

    # 3) quadros e áudio
    say("[3/5] Extraindo quadros e áudio...")
    ff(["-i", base, "-q:v", "3", os.path.join(frames_dir, "f_%05d.jpg")])
    ff(["-i", base, "-vn", "-ac", "2", "-ar", "48000", os.path.join(job, "audio.wav")])
    wav16 = os.path.join(job, "audio16.wav")
    ff(["-i", base, "-vn", "-ac", "1", "-ar", "16000", wav16])
    n = len([f for f in os.listdir(frames_dir) if f.endswith(".jpg")])
    from PIL import Image
    w, h = Image.open(os.path.join(frames_dir, "f_00001.jpg")).size

    # 4) transcrição
    modelo = args.get("modelo", "small")
    say(f"[4/5] Transcrevendo a fala (modelo {modelo})...")
    words = transcrever(wav16, args.get("idioma", "pt"), modelo, args.get("vocab"))
    with open(os.path.join(job, "transcricao.txt"), "w", encoding="utf-8") as f:
        f.write("# início  fim  palavra   (segundos no vídeo final)\n")
        for s, e, t in words:
            f.write(f"{s:7.2f} {e:7.2f}  {t}\n")
        f.write("\n# texto corrido:\n" + " ".join(x[2] for x in words) + "\n")

    # 5) enquadramento + máscaras
    say("[5/5] Localizando a pessoa no quadro" + (" e recortando (pode levar alguns minutos)..." if estilo in PRECISA_MASCARA else "..."))
    sess = mascara_sessao()
    px, ptop = enquadramento(frames_dir, n, sess)
    masks_dir = None
    if estilo in PRECISA_MASCARA:
        import numpy as np
        masks_dir = os.path.join(job, "mascaras")
        os.makedirs(masks_dir, exist_ok=True)
        mw, mh = (w // 2, h // 2)
        prog = -1
        for i in range(1, n + 1):
            out = os.path.join(masks_dir, f"f_{i:05d}.png")
            if not os.path.exists(out):
                im = Image.open(os.path.join(frames_dir, f"f_{i:05d}.jpg"))
                m = mascara(sess, im)
                mi = Image.fromarray((m * 255).astype(np.uint8)).resize((mw, mh), Image.BILINEAR)
                a = Image.new("RGBA", (mw, mh), (255, 255, 255, 0))
                a.putalpha(mi)
                a.save(out, optimize=False, compress_level=1)
            p = int(i * 10 / n)
            if p != prog:
                prog = p
                say(f"      recorte {p * 10}%")

    jobj = {
        "versao": 1, "estilo": estilo, "fps": FPS, "duracao": round(dur, 3), "n_frames": n,
        "w": w, "h": h, "pessoa_x": round(px, 4), "pessoa_topo": round(ptop, 4),
        "frames": "frames", "mascaras": "mascaras" if masks_dir else None, "audio": "audio.wav",
        "palavras": words, "cortes": cortes, "video_original": video,
        "saida": os.path.join(os.path.dirname(video), f"{stem}_{estilo}.mp4"),
    }
    with open(os.path.join(job, "job.json"), "w", encoding="utf-8") as f:
        json.dump(jobj, f, ensure_ascii=False)
    say(f"\nPronto. Duração: {dur:.1f}s · {n} quadros · {len(words)} palavras")
    say("Pasta do job: " + job)
    say("Transcrição: " + os.path.join(job, "transcricao.txt"))
    say("Próximo passo: escrever plano.json nessa pasta (veja PLANOS.md) e rodar  python motor.py render \"" + job + "\"")


# ---------------------------------------------------------------- render
def node_render(job, extra):
    node = shutil.which("node")
    if not node:
        die("Node.js não encontrado. Rode o setup.")
    if not os.path.isdir(os.path.join(HERE, "node_modules", "playwright")):
        die("Renderizador não instalado. Rode:  python motor.py setup")
    env = dict(os.environ)
    env["MOTOR_FFMPEG"] = ffmpeg_exe()
    env["MOTOR_BROWSER"] = load_cfg().get("browser", "chromium")
    r = subprocess.run([node, os.path.join(HERE, "scripts", "render.mjs"), job] + extra, env=env, cwd=HERE)
    sys.exit(r.returncode)


def cmd_render(args):
    job = os.path.abspath((args.get("_pos") or [None])[0] or "")
    if not os.path.exists(os.path.join(job, "job.json")):
        die("Pasta do job inválida (não achei job.json): " + job)
    extra = []
    if args.get("saida"):
        extra += ["--saida", os.path.abspath(args["saida"])]
    if args.get("workers"):
        extra += ["--workers", str(args["workers"])]
    node_render(job, extra)


def cmd_stills(args):
    pos = args.get("_pos") or []
    if not pos:
        die("Uso: python motor.py stills PASTA_DO_JOB 1.5 4 8")
    job = os.path.abspath(pos[0])
    ts = pos[1:] or ["1"]
    node_render(job, ["--stills", ",".join(ts)])


# ---------------------------------------------------------------- main
def parse(argv):
    out = {"_pos": []}
    i = 0
    while i < len(argv):
        a = argv[i]
        if a.startswith("--"):
            k = a[2:]
            if i + 1 < len(argv) and not argv[i + 1].startswith("--"):
                out[k] = argv[i + 1]
                i += 2
            else:
                out[k] = True
                i += 1
        else:
            out["_pos"].append(a)
            i += 1
    return out


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    cmd, rest = sys.argv[1], sys.argv[2:]
    args = parse(rest)
    if cmd == "setup":
        cmd_setup(args)
    elif cmd == "_baixar_whisper":
        cmd_baixar_whisper(rest[0] if rest else "small")
    elif cmd in ("diagnostico", "diag"):
        cmd_diag(args)
    elif cmd == "prep":
        run_in_venv(sys.argv[1:])
        cmd_prep(args)
    elif cmd == "render":
        cmd_render(args)
    elif cmd == "stills":
        cmd_stills(args)
    else:
        print(__doc__)
        die("Comando desconhecido: " + cmd)


if __name__ == "__main__":
    main()
