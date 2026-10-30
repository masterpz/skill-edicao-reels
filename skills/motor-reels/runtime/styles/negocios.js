// /reel-negocios — alterna tela cheia, tela dividida e animação, com tranco e flash a cada corte.
ESTILOS.negocios = function (R) {
  const P = R.plano, cor = R.cor, D = R.dur;
  const segs = (Array.isArray(P.segmentos) ? P.segmentos : []).map(s => Object.assign({}, s, { ini: R.num(s.ini, null), fim: R.num(s.fim, null) }));
  if (!segs.length) R.err('plano.segmentos está vazio. Liste os trechos com modo "cheia", "dividida" ou "animacao".');
  segs.forEach((s, i) => {
    if (s.ini == null || s.fim == null || s.fim <= s.ini) R.err(`segmento ${i + 1}: precisa de "ini" e "fim" em segundos (fim maior que ini)`);
    if (!['cheia', 'dividida', 'animacao'].includes(s.modo)) R.err(`segmento ${i + 1}: "modo" deve ser cheia, dividida ou animacao`);
  });
  segs.sort((a, b) => a.ini - b.ini);
  const cortes = [...new Set(segs.flatMap(s => [s.ini, s.fim]).filter(x => x > 0.05 && x < D - 0.05))];

  const vid = R.caixaVideo(null, 0, 0, 1080, 1920);
  const topo = R.el('div', `left:0;top:0;width:1080px;height:960px;overflow:hidden;background:radial-gradient(ellipse at 25% 15%, ${cor}55 0%, #111214 62%)`, null, null, 'abs');
  const linha = R.el('div', `left:0;top:956px;width:1080px;height:8px;background:${cor};z-index:6`, null, null, 'abs');

  function cardDividida(s) {
    const el = R.el('div', 'left:64px;top:150px;width:952px;height:780px', topo, null, 'abs');
    const tipo = s.tipo || (s.valor != null ? 'numero' : (Array.isArray(s.itens) ? 'lista' : 'texto'));
    if (tipo === 'numero') {
      const alvo = Number(String(s.valor).replace(/\./g, '').replace(',', '.'));
      el.innerHTML = `<div class=mono style="font-size:26px;color:#b0aca4">${R.esc(s.rotulo || '')}</div>
        <div class="big num" style="font-size:230px;letter-spacing:-.055em;margin-top:10px;white-space:nowrap;text-shadow:0 0 60px ${cor}88"></div>
        ${s.legenda ? `<div style="margin-top:14px"><span style="display:inline-block;background:#16A34A;border-radius:12px;padding:8px 18px;font-weight:800;font-size:32px">✓ ${R.esc(s.legenda)}</span></div>` : ''}
        <div class=bars style="display:flex;align-items:flex-end;gap:14px;height:230px;margin-top:36px"></div>`;
      const num = el.querySelector('.num');
      R.ajusta(num, 952, 230, 90);
      const bv = [.28, .4, .36, .52, .47, .63, .58, .76, .84, 1];
      const bars = bv.map(() => R.el('div', `width:82px;height:230px;border-radius:14px 14px 6px 6px;background:linear-gradient(180deg,${cor},${cor}aa);transform-origin:50% 100%;transform:scaleY(0)`, el.querySelector('.bars')));
      return {
        el, upd(tl) {
          const p = R.eOut(R.clamp((tl - 0.1) / 0.6));
          if (isFinite(alvo)) {
            const v = alvo * p, dec = String(s.valor).includes(',') ? 1 : 0;
            num.textContent = (s.prefixo || '') + v.toLocaleString('pt-BR', { maximumFractionDigits: dec, minimumFractionDigits: p >= 1 ? dec : 0 }) + (p >= 1 ? (s.sufixo || '') : '');
          } else num.textContent = (s.prefixo || '') + s.valor + (s.sufixo || '');
          num.style.transform = `scale(${1 + 0.06 * Math.sin(Math.PI * R.clamp((tl - 0.7) / 0.14))})`; num.style.transformOrigin = '0 50%';
          bars.forEach((b, i) => { b.style.transform = `scaleY(${bv[i] * R.P(tl, 0.15 + i * 0.05, 0.3, R.eBack)})`; });
          R.tf(el, 0, (1 - R.P(tl, 0, 0.2)) * 40, 1, 1);
        }
      };
    }
    if (tipo === 'lista') {
      const itens = (s.itens || []).slice(0, 5);
      el.innerHTML = `<div class=big style="font-size:78px;line-height:1.02">${R.destaque(s.titulo || '', s.destaque, cor)}</div><div class=li style="margin-top:34px"></div>`;
      R.ajusta(el.firstChild, 952, 78, 40, 170);
      const rows = itens.map(it => R.el('div', 'display:flex;align-items:center;gap:24px;margin-top:26px;font-size:58px;font-weight:800',
        el.querySelector('.li'), `<b style="flex:none;width:72px;height:72px;border-radius:50%;background:${cor};display:flex;align-items:center;justify-content:center;font-size:42px">✓</b><span>${R.esc(it)}</span>`));
      rows.forEach(r => R.ajusta(r.lastChild, 850, 58, 28));
      return {
        el, upd(tl, dur) {
          const gap = Math.min(0.6, Math.max(0.2, (dur - 0.6) / Math.max(1, rows.length)));
          rows.forEach((r, i) => { const p = R.P(tl, 0.3 + i * gap, 0.3, R.eBack); R.tf(r, (1 - p) * -120, 0, 1, p); });
          R.tf(el.firstChild, 0, 0, R.lerp(1.1, 1, R.P(tl, 0, 0.25, R.eBack)), R.P(tl, 0, 0.15));
        }
      };
    }
    el.innerHTML = `<div class=mono style="font-size:26px;color:#b0aca4">${R.esc(s.rotulo || '')}</div><div class=big style="font-size:120px;margin-top:20px;line-height:1">${R.destaque(s.texto || s.titulo || '', s.destaque, cor)}</div>`;
    R.ajusta(el.lastChild, 952, 130, 48, 640);
    return { el, upd(tl) { R.tf(el.lastChild, 0, (1 - R.P(tl, 0, 0.3, R.eBack)) * 60, R.lerp(0.85, 1, R.P(tl, 0, 0.3, R.eBack)), R.P(tl, 0, 0.12)); } };
  }

  function cardAnimacao(s) {
    const el = R.el('div', `left:0;top:0;width:1080px;height:1920px;background:${s.cor || cor};overflow:hidden;z-index:8`, null, null, 'abs');
    const stripes = R.el('div', 'left:-400px;top:-400px;width:2000px;height:2800px;background-image:repeating-linear-gradient(-30deg,rgba(255,255,255,.09) 0 60px,transparent 60px 140px)', el, null, 'abs');
    let pals = Array.isArray(s.palavras) && s.palavras.length ? s.palavras.slice(0, 4).map((w, i) => ({ w: String(w), t: null })) : null;
    if (!pals) {
      pals = R.palavras.filter(w => w.s >= s.ini - 0.05 && w.s < s.fim && w.w.replace(/[^\wÀ-ÿ$%]/g, '').length >= 3).slice(0, 4).map(w => ({ w: w.w.replace(/[,.;:…!?]+$/, ''), t: w.s - s.ini }));
      if (!pals.length) pals = [{ w: '…', t: 0 }];
    }
    const n = pals.length, dur = s.fim - s.ini;
    pals.forEach((p, i) => { if (p.t == null) p.t = 0.05 + i * Math.min(0.35, dur / (n + 1)); });
    const H = 1300 / n;
    const lines = pals.map((p, i) => {
      const e = R.el('div', `left:60px;top:${310 + i * H}px;width:960px;white-space:nowrap;text-transform:uppercase;color:${i % 2 ? '#141414' : '#fff'};transform-origin:30% 60%`, el, R.esc(p.w), 'abs big');
      R.ajusta(e, 960, Math.min(340, H * 0.95), 60);
      return e;
    });
    return {
      el, upd(tl) {
        stripes.style.transform = `translateX(${tl * 300}px)`;
        lines.forEach((e, i) => { const p = R.P(tl, pals[i].t, 0.22, R.eBack); R.tf(e, i % 2 ? (1 - R.P(tl, pals[i].t, 0.15)) * 300 : 0, 0, R.lerp(1.6, 1, p), R.P(tl, pals[i].t, 0.06), R.lerp(i % 2 ? 4 : -6, 0, p)); });
      }
    };
  }

  segs.forEach(s => {
    if (s.modo === 'dividida') s._c = cardDividida(s);
    if (s.modo === 'animacao') s._k = cardAnimacao(s);
  });
  const flash = R.el('div', 'left:0;top:0;width:1080px;height:1920px;background:#fff;z-index:40;opacity:0', null, null, 'abs');
  const cap = R.el('div', '', null, null, 'cap');

  return t => {
    const seg = segs.find(s => t >= s.ini && t < s.fim);
    const modo = seg ? seg.modo : 'cheia';
    topo.style.display = linha.style.display = modo === 'dividida' ? 'block' : 'none';
    segs.forEach(s => {
      if (s._c) s._c.el.style.display = s === seg ? 'block' : 'none';
      if (s._k) s._k.el.style.display = s === seg ? 'block' : 'none';
    });
    vid.box.style.display = modo === 'animacao' ? 'none' : 'block';
    cap.style.fontSize = '88px';
    if (modo === 'cheia') {
      const t0 = seg ? seg.ini : 0;
      vid.place(0, 0, 1080, 1920);
      vid.set(t, { punch: R.lerp(1.1, 1.0, R.P(t, t0, 0.4)) + 0.04 * R.clamp((t - t0) / 6) });
      cap.style.top = '1400px'; R.legenda(cap, t);
    } else if (modo === 'dividida') {
      vid.place(0, 964, 1080, 956);
      vid.set(t, { foco: 'rosto', punch: R.lerp(1.12, 1, R.P(t, seg.ini, 0.3)) });
      seg._c.upd(t - seg.ini, seg.fim - seg.ini);
      cap.style.top = '1790px'; cap.style.fontSize = '76px'; R.legenda(cap, t);
    } else {
      seg._k.upd(t - seg.ini);
      cap.style.opacity = 0;
    }
    const [sx, sy] = R.tremida(t, cortes, 22, 0.22);
    R.stage.style.transform = `translate(${sx}px,${sy}px)`;
    flash.style.opacity = R.flashEm(t, cortes, 0.07) * 0.85;
  };
};
