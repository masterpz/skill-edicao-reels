// Renderizador: abre o player HTML num navegador sem janela, fotografa cada quadro
// e monta o mp4 final com o áudio original.
// Uso: node render.mjs PASTA_DO_JOB [--stills 1,4.5] [--saida arquivo.mp4] [--workers N]
//      node render.mjs --check-browser
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PLAYER = path.join(ROOT, 'runtime', 'player.html');
const W = 1080, H = 1920;

async function launch(pref) {
  const tries = [];
  if (pref && pref !== 'chromium') tries.push(pref);
  tries.push('chromium', 'chrome', 'msedge');
  let last;
  for (const t of [...new Set(tries)]) {
    try {
      const b = await chromium.launch(t === 'chromium' ? {} : { channel: t });
      return { b, name: t };
    } catch (e) { last = e; }
  }
  throw last;
}

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

function ffmpegPath() {
  const p = process.env.MOTOR_FFMPEG;
  if (p && fs.existsSync(p)) return p;
  return 'ffmpeg';
}

function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d; });
    p.on('close', c => c === 0 ? res() : rej(new Error(err.slice(-2000))));
  });
}

async function openPage(browser, job, plano, jobDir) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(pathToFileURL(PLAYER).href);
  await page.waitForFunction(() => window.MOTOR_PRONTO === true, null, { timeout: 30000 });
  const urls = {
    frames: pathToFileURL(path.join(jobDir, job.frames)).href,
    mascaras: job.mascaras ? pathToFileURL(path.join(jobDir, job.mascaras)).href : null,
    job: pathToFileURL(jobDir).href,
  };
  const res = await page.evaluate(([j, p, u]) => window.iniciar(j, p, u), [job, plano, urls]);
  if (errs.length) throw new Error('Erro no player: ' + errs.join(' | '));
  return { page, res, errs };
}

async function main() {
  if (process.argv.includes('--check-browser')) {
    const { b, name } = await launch(process.env.MOTOR_BROWSER);
    const p = await b.newPage();
    await p.setContent('<p>ok</p>');
    await b.close();
    console.log(name);
    return;
  }
  const jobDir = path.resolve(process.argv[2] || '.');
  const job = JSON.parse(fs.readFileSync(path.join(jobDir, 'job.json'), 'utf8'));
  const planoPath = path.join(jobDir, 'plano.json');
  let plano = {};
  if (fs.existsSync(planoPath)) {
    try { plano = JSON.parse(fs.readFileSync(planoPath, 'utf8')); }
    catch (e) { console.error('ERRO: plano.json não é um JSON válido: ' + e.message); process.exit(2); }
  } else if (job.estilo !== 'pessoal') {
    console.error('ERRO: falta o plano.json na pasta do job. Veja PLANOS.md.');
    process.exit(2);
  }

  const { b: browser, name } = await launch(process.env.MOTOR_BROWSER);
  const fps = job.fps || 30;
  const total = Math.round(job.duracao * fps);

  // checagem do plano
  const first = await openPage(browser, job, plano, jobDir);
  if (first.res && first.res.erros && first.res.erros.length) {
    console.error('ERRO no plano.json:\n- ' + first.res.erros.join('\n- '));
    await browser.close();
    process.exit(3);
  }
  if (first.res && first.res.avisos && first.res.avisos.length) console.log('Avisos:\n- ' + first.res.avisos.join('\n- '));

  const stills = arg('stills');
  if (stills) {
    const outDir = path.join(jobDir, 'conferencia');
    fs.mkdirSync(outDir, { recursive: true });
    for (const s of stills.split(',').map(Number).filter(x => !isNaN(x))) {
      await first.page.evaluate(t => window.renderizar(t), Math.min(s, job.duracao - 0.01));
      const f = path.join(outDir, `quadro_${s.toFixed(2)}s.jpg`);
      await first.page.screenshot({ path: f, type: 'jpeg', quality: 85 });
      console.log(f);
    }
    await browser.close();
    return;
  }

  const nW = Math.max(1, Math.min(Number(arg('workers', 0)) || Math.min(4, Math.max(1, Math.floor(os.cpus().length / 2))), 6));
  const per = Math.ceil(total / nW);
  const pages = [first.page];
  for (let k = 1; k < nW; k++) pages.push((await openPage(browser, job, plano, jobDir)).page);
  const tmpDir = path.join(jobDir, '_render');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  const ff = ffmpegPath();
  let done = 0, lastPct = -1;
  const t0 = Date.now();
  console.log(`Renderizando ${total} quadros (${(total / fps).toFixed(1)}s) com ${nW} processo(s) em ${name}...`);

  async function worker(k) {
    const a = k * per, z = Math.min(total, a + per);
    if (a >= z) return null;
    const out = path.join(tmpDir, `parte_${k}.mp4`);
    const p = spawn(ff, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-maxrate', '14M', '-bufsize', '28M', '-pix_fmt', 'yuv420p', '-r', String(fps), '-g', String(fps * 2), out],
      { stdio: ['pipe', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d; });
    const closed = new Promise(r => p.on('close', r));
    const page = pages[k];
    for (let f = a; f < z; f++) {
      await page.evaluate(t => window.renderizar(t), f / fps);
      const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!p.stdin.write(buf)) await new Promise(r => p.stdin.once('drain', r));
      done++;
      const pct = Math.floor(done * 100 / total);
      if (pct % 5 === 0 && pct !== lastPct) {
        lastPct = pct;
        const el = (Date.now() - t0) / 1000;
        const eta = done ? el / done * (total - done) : 0;
        console.log(`  ${pct}%  (faltam ~${Math.ceil(eta / 60)} min)`);
      }
    }
    p.stdin.end();
    const code = await closed;
    if (code !== 0) throw new Error('ffmpeg falhou: ' + err.slice(-1500));
    return out;
  }

  const parts = (await Promise.all(pages.map((_, k) => worker(k)))).filter(Boolean);
  await browser.close();

  const list = path.join(tmpDir, 'lista.txt');
  fs.writeFileSync(list, parts.map(p => `file '${p.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'));
  const video = path.join(tmpDir, 'video.mp4');
  await run(ff, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);
  const saida = path.resolve(arg('saida', job.saida || path.join(jobDir, 'final.mp4')));
  await run(ff, ['-hide_banner', '-loglevel', 'error', '-y', '-i', video, '-i', path.join(jobDir, job.audio),
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', 'apad', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', saida]);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`\nPronto em ${Math.round((Date.now() - t0) / 1000)}s: ${saida}`);
}

main().catch(e => { console.error('ERRO: ' + (e && e.message ? e.message : e)); process.exit(1); });
