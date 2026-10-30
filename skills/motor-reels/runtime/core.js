// Núcleo do player: utilidades compartilhadas pelos 6 estilos.
(function () {
  const R = (window.R = {});
  window.ESTILOS = {};

  R.clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  R.lerp = (a, b, p) => a + (b - a) * p;
  R.eOut = p => 1 - Math.pow(1 - p, 3);
  R.eIn = p => p * p * p;
  R.eIO = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  R.eBack = p => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
  R.P = (t, s, d, e = R.eOut) => e(R.clamp((t - s) / Math.max(0.0001, d)));
  R.stage = document.getElementById('stage');
  R.erros = [];
  R.avisos = [];
  R.err = m => R.erros.push(m);
  R.aviso = m => R.avisos.push(m);
  R.esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  R.num = (x, d) => { const n = Number(x); return isFinite(n) ? n : d; };
  R.pad = i => String(i).padStart(5, '0');

  R.el = function (tag, css, parent, html, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (css) e.style.cssText = css;
    if (html != null) e.innerHTML = html;
    (parent || R.stage).appendChild(e);
    return e;
  };
  R.tf = function (e, x = 0, y = 0, s = 1, o = 1, r = 0) {
    e.style.transform = `translate(${x}px,${y}px) scale(${s}) rotate(${r}deg)`;
    e.style.opacity = R.clamp(o);
  };

  // ---- imagens (quadros do vídeo e máscaras)
  R.pend = [];
  R.setImg = function (img, src) {
    if (img.getAttribute('src') !== src) { img.setAttribute('src', src); R.pend.push(img.decode().catch(() => {})); }
  };
  const cache = new Map();
  R.getImg = function (src) {
    let im = cache.get(src);
    if (!im) {
      im = new Image(); im.src = src; cache.set(src, im);
      if (cache.size > 40) { const k = cache.keys().next().value; cache.delete(k); }
    }
    R.pend.push(im.decode().catch(() => {}));
    return im;
  };
  R.idx = t => Math.max(1, Math.min(R.job.n_frames, Math.floor(t * R.job.fps) + 1));
  R.frame = t => `${R.urls.frames}/f_${R.pad(R.idx(t))}.jpg`;
  R.mask = t => `${R.urls.mascaras}/f_${R.pad(R.idx(t))}.png`;
  R.arquivo = p => {
    if (!p) return '';
    if (/^(https?|file|data):/.test(p)) return p;
    if (/^([a-zA-Z]:[\\/]|\/)/.test(p)) return 'file:///' + encodeURI(p.replace(/\\/g, '/').replace(/^\/+/, ''));
    return R.urls.job + '/' + encodeURI(p.replace(/\\/g, '/'));
  };

  // Retângulo para "cobrir" uma caixa com o quadro do vídeo, centrado na pessoa.
  // opt.foco: 'corpo' (padrão) ou 'rosto' (para painéis mais largos). opt.zoom > 1 aproxima.
  R.cover = function (bw, bh, opt = {}) {
    const J = R.job;
    const s = Math.max(bw / J.w, bh / J.h) * (opt.zoom || (opt.foco === 'rosto' ? 1.28 : 1));
    const w = J.w * s, h = J.h * s;
    let x = bw / 2 - J.pessoa_x * w + (opt.dx || 0);
    x = Math.min(0, Math.max(bw - w, x));
    const rosto = opt.foco === 'rosto';
    const fy = rosto ? Math.min(0.6, (J.pessoa_topo || 0.1) + 0.2) : 0.5;
    let y = bh * (rosto ? 0.45 : 0.5) - fy * h + (opt.dy || 0);
    y = Math.min(0, Math.max(bh - h, y));
    return { x, y, w, h };
  };

  // Retângulo do quadro inteiro para desenhar a pessoa recortada, apoiada na base da tela,
  // com o topo da cabeça na altura topoY. escala multiplica o tamanho final.
  R.pessoaRect = function (topoY, escala = 1) {
    const J = R.job;
    const topo = Math.min(0.5, Math.max(0.02, J.pessoa_topo || 0.1));
    let h = (1920 - topoY) / (1 - topo) * escala;
    h = Math.max(h, 900);
    const w = h * (J.w / J.h);
    return { x: 540 - J.pessoa_x * w, y: 1920 - h, w, h };
  };

  // Caixa com o vídeo da pessoa (img posicionada para cobrir a caixa).
  R.caixaVideo = function (parent, x, y, w, h, css) {
    const box = R.el('div', `left:${x}px;top:${y}px;width:${w}px;height:${h}px;${css || ''}`, parent, null, 'box');
    const img = R.el('img', '', box);
    const o = { box, img, w, h };
    o.set = function (t, opt = {}) {
      R.setImg(img, R.frame(t));
      const r = R.cover(o.w, o.h, opt);
      img.style.left = r.x + 'px'; img.style.top = r.y + 'px';
      img.style.width = r.w + 'px'; img.style.height = r.h + 'px';
      const z = opt.punch || 1;
      img.style.transformOrigin = `${R.job.pessoa_x * r.w}px ${Math.min(0.6, (R.job.pessoa_topo || 0.1) + 0.15) * r.h}px`;
      img.style.transform = `scale(${z})`;
    };
    o.place = function (nx, ny, nw, nh) {
      o.w = nw; o.h = nh;
      Object.assign(box.style, { left: nx + 'px', top: ny + 'px', width: nw + 'px', height: nh + 'px' });
    };
    return o;
  };

  // Desenha só a pessoa (recortada) num canvas. rect = onde fica o quadro inteiro.
  let off = null;
  R.pessoa = function (ctx, t, rect, opt = {}) {
    if (!R.urls.mascaras) { R.err('Este estilo precisa das máscaras de recorte. Rode o prep de novo com o --estilo correto.'); return () => {}; }
    const im = R.getImg(R.frame(t)), mk = R.getImg(R.mask(t));
    return () => {
      if (!off) { off = document.createElement('canvas'); off.width = 1080; off.height = 1920; }
      const a = off.getContext('2d');
      a.globalCompositeOperation = 'source-over';
      a.clearRect(0, 0, 1080, 1920);
      if (opt.contorno || opt.sombra) {
        a.drawImage(mk, rect.x, rect.y, rect.w, rect.h);
        a.globalCompositeOperation = 'source-in';
        if (opt.sombra) {
          a.fillStyle = 'rgba(0,0,0,.5)'; a.fillRect(0, 0, 1080, 1920);
          ctx.save(); ctx.filter = 'blur(22px)'; ctx.drawImage(off, 10, 30); ctx.restore();
        }
        if (opt.contorno) {
          a.fillStyle = opt.corContorno || '#fff'; a.fillRect(0, 0, 1080, 1920);
          for (let k = 0; k < 20; k++) { const an = k / 20 * 6.283; ctx.drawImage(off, Math.cos(an) * opt.contorno, Math.sin(an) * opt.contorno); }
        }
        a.globalCompositeOperation = 'source-over';
        a.clearRect(0, 0, 1080, 1920);
      }
      a.drawImage(im, rect.x, rect.y, rect.w, rect.h);
      a.globalCompositeOperation = 'destination-in';
      a.drawImage(mk, rect.x, rect.y, rect.w, rect.h);
      a.globalCompositeOperation = 'source-over';
      ctx.drawImage(off, 0, 0);
    };
  };

  // ---- palavras / legendas
  function montarPalavras() {
    const corr = R.plano.correcoes || {};
    const keys = Object.keys(corr);
    const out = [];
    (R.job.palavras || []).forEach(([s, e, w]) => {
      let txt = String(w);
      keys.forEach(k => {
        const m = txt.match(/^(.*?)([.,!?;:…]*)$/);
        if (m && (m[1] === k || (k.length >= 4 && m[1].toLowerCase() === k.toLowerCase()))) txt = corr[k] + m[2];
      });
      if (out.length && (/^[^\wÀ-ÿ]/.test(txt) || (/^\d/.test(txt) && /[$]$/.test(out[out.length - 1].w)))) {
        const last = out[out.length - 1];
        last.w += (/^[^\wÀ-ÿ]/.test(txt) ? '' : ' ') + txt; last.e = e;
      } else out.push({ s, e, w: txt });
    });
    // frases inteiras corrigidas: "trocar": [["texto errado","texto certo"]] não é suportado; use correcoes por palavra
    return out;
  }
  R.chunks = function (max = 3, maxChars = 16) {
    if (R._chunks && R._chunks.max === max) return R._chunks.list;
    const W = R.palavras, out = [];
    let cur = [];
    W.forEach((x, i) => {
      const len = cur.map(c => c.w).join(' ').length + (cur.length ? 1 : 0) + x.w.length;
      if (cur.length && (cur.length >= max || len > maxChars || x.s - cur[cur.length - 1].e > 0.45)) { out.push(cur); cur = []; }
      cur.push(x);
      if (/[.,!?;:…]$/.test(x.w)) { out.push(cur); cur = []; }
    });
    if (cur.length) out.push(cur);
    const list = out.map((c, i) => {
      const s = c[0].s - 0.04, last = c[c.length - 1].e;
      const nx = out[i + 1] ? out[i + 1][0].s - 0.04 : last + 0.6;
      return { ws: c, s, e: Math.min(nx, last + 0.6) };
    });
    R._chunks = { max, list };
    return list;
  };
  const limpa = w => w.replace(/[,.;:…]+$/, '');
  R.legenda = function (el, t, opt = {}) {
    if (R.plano.legendas === false) { el.style.opacity = 0; return; }
    const cs = R.chunks(opt.max || 3, opt.maxChars || 16);
    const c = cs.find(c => t >= c.s && t < c.e);
    if (!c) { el.style.opacity = 0; el._k = null; return; }
    if (el._k !== c) {
      el._k = c;
      el.innerHTML = c.ws.map(w => `<span>${R.esc(limpa(w.w))}</span>`).join(' ');
    }
    let on = 0; c.ws.forEach((w, k) => { if (t >= w.s - 0.04) on = k; });
    [...el.children].forEach((s, k) => { s.className = k === on ? 'on' : ''; });
    const p = R.P(t, c.s, 0.14, R.eBack);
    el.style.opacity = 1;
    el.style.transform = `translateY(-50%) scale(${R.lerp(0.82, 1, p)})`;
  };
  R.palavraAtual = function (t) {
    let wi = -1; R.palavras.forEach((w, i) => { if (t >= w.s - 0.03) wi = i; });
    return wi;
  };

  // ---- efeitos
  R.tremida = function (t, tempos, amp = 20, dur = 0.24) {
    let x = 0, y = 0;
    for (const t0 of tempos) {
      const p = (t - t0) / dur;
      if (p >= 0 && p <= 1) { const a = amp * (1 - p); x += a * Math.sin(t * 95); y += a * Math.cos(t * 83); }
    }
    return [x, y];
  };
  R.flashEm = (t, tempos, larg = 0.07) => Math.max(0, 1 - Math.min(99, ...tempos.map(c => Math.abs(t - c))) / larg);
  // Reduz a fonte até caber. Sem maxH: uma linha só (mede a largura do conteúdo).
  // Com maxH: texto quebra em linhas dentro da largura do elemento e precisa caber na altura.
  R.ajusta = function (el, maxW, maxPx, minPx = 24, maxH) {
    let s = maxPx;
    el.style.fontSize = s + 'px';
    const prevW = el.style.width, prevMax = el.style.maxWidth;
    if (!maxH) { el.style.width = 'max-content'; el.style.maxWidth = 'none'; }
    const over = () => maxH
      ? (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > maxH + 1)
      : (el.getBoundingClientRect().width > maxW + 1);
    while (s > minPx && over()) { s -= 3; el.style.fontSize = s + 'px'; }
    if (!maxH) { el.style.width = prevW; el.style.maxWidth = prevMax; }
    return s;
  };
  R.destaque = function (texto, destaque, cor) {
    const t = R.esc(texto || '');
    if (!destaque) return t;
    const d = R.esc(destaque);
    const i = t.toLowerCase().indexOf(d.toLowerCase());
    if (i < 0) return t + ` <span style="color:${cor}">${d}</span>`;
    return t.slice(0, i) + `<span style="color:${cor}">${t.slice(i, i + d.length)}</span>` + t.slice(i + d.length);
  };
  R.granulado = function () {
    const c = document.createElement('canvas'); c.width = 540; c.height = 960;
    const x = c.getContext('2d'); const d = x.createImageData(540, 960);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 14; }
    x.putImageData(d, 0, 0);
    const g = R.el('div', `left:-60px;top:-60px;width:1200px;height:2100px;background-image:url(${c.toDataURL()});background-size:540px 960px;z-index:45;pointer-events:none;mix-blend-mode:overlay`, null, null, 'abs');
    return t => { const f = Math.floor(t * 15); g.style.transform = `translate(${-(f * 37) % 120}px,${-(f * 53) % 140}px)`; };
  };
  // distribui tempos que faltarem ao longo de um intervalo
  R.tempos = function (lista, campo, ini, fim) {
    const n = lista.length;
    lista.forEach((it, i) => {
      if (it[campo] == null || !isFinite(Number(it[campo]))) it[campo] = R.lerp(ini, fim, n > 1 ? i / (n - 1) : 0);
      else it[campo] = Number(it[campo]);
    });
  };

  // ---- entrada do renderizador
  window.iniciar = function (job, plano, urls) {
    R.job = job; R.plano = plano || {}; R.urls = urls;
    R.cor = R.plano.cor || '#E8622C';
    R.dur = job.duracao;
    R.palavras = montarPalavras();
    const f = window.ESTILOS[job.estilo];
    if (!f) { R.err('Estilo desconhecido: ' + job.estilo); return { erros: R.erros, avisos: R.avisos }; }
    try { R.upd = f(R); } catch (e) { R.err('Falha ao montar o estilo: ' + e.message); }
    if (!R.upd) R.upd = () => {};
    return { erros: R.erros, avisos: R.avisos };
  };
  window.renderizar = function (t) {
    R.pend.length = 0;
    let after = null;
    try { after = R.upd(t); } catch (e) { console.error(e); throw e; }
    return Promise.all(R.pend.slice()).then(() => { if (typeof after === 'function') after(); });
  };
})();
