// /painel-explicativo — explicação animada em cima, você num painel embaixo.
ESTILOS.painel = function (R) {
  const P = R.plano, cor = R.cor, D = R.dur;
  const cenas = (Array.isArray(P.cenas) ? P.cenas : []).map(c => Object.assign({}, c));
  if (!cenas.length) R.err('plano.cenas está vazio. Cada cena tem "em", "tipo" e "titulo".');
  const TIPOS = ['chips', 'barras', 'passos', 'numero', 'texto'];
  cenas.forEach((c, i) => { if (!TIPOS.includes(c.tipo)) R.err(`cena ${i + 1}: "tipo" deve ser um de ${TIPOS.join(', ')}`); });
  R.tempos(cenas, 'em', 0, Math.max(0.5, D * 0.7));
  cenas.sort((a, b) => a.em - b.em);
  if (cenas.length) cenas[0].em = 0;
  cenas.forEach((c, i) => { c.fim = i + 1 < cenas.length ? cenas[i + 1].em : D + 1; });

  R.el('div', 'left:0;top:0;width:1080px;height:1920px;background:#0E0E10', null, null, 'abs');
  R.el('div', 'left:0;top:0;width:1080px;height:1920px;background-image:radial-gradient(#25252b 2px,transparent 2.4px);background-size:40px 40px', null, null, 'abs');
  const blob = R.el('div', `left:-200px;top:-200px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,${cor}5a,transparent 65%)`, null, null, 'abs');

  function titulo(parent, c) {
    const words = (c.titulo || '').split(/\s+/).filter(Boolean);
    const hl = (c.destaque || '').toLowerCase().split(/\s+/).filter(Boolean);
    const el = R.el('div', 'left:60px;top:140px;width:960px;line-height:1.02', parent,
      words.map(w => `<span class=tw style="display:inline-block;margin-right:.22em;${hl.includes(w.toLowerCase().replace(/[^\wÀ-ÿ]/g, '')) ? 'color:' + cor : ''}">${R.esc(w)}</span>`).join(''), 'abs big');
    R.ajusta(el, 960, 88, 44, 280);
    return { el, tws: [...el.querySelectorAll('.tw')] };
  }

  const cont = cenas.map(c => {
    const root = R.el('div', 'left:0;top:0;width:1080px;height:1160px', null, null, 'abs');
    const T = titulo(root, c);
    const y0 = 140 + T.el.offsetHeight + 46;
    const itens = (c.itens || []).slice(0, c.tipo === 'chips' ? 9 : 5);
    const itTempos = itens.map(x => (x && typeof x === 'object' && x.em != null) ? Number(x.em) - c.em : null);
    const itTxt = x => (x && typeof x === 'object') ? (x.texto != null ? x.texto : '') : x;
    const o = { c, root, T, parts: [], itTempos };
    const blk = R.el('div', `left:0;top:${y0}px;width:1080px`, root, null, 'abs');
    let hBlk = 0;
    if (c.tipo === 'chips') {
      const cols = itens.length <= 4 ? 2 : 3, w = cols === 2 ? 470 : 300;
      o.parts = itens.map((x, i) => {
        const e = R.el('div', `left:${60 + (i % cols) * (w + 20)}px;top:${Math.floor(i / cols) * 170}px;width:${w}px;height:148px;border-radius:30px;background:#1d1d21;border:3px solid #34343a;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 16px;font-weight:900;line-height:1`, blk, `<span style="white-space:nowrap">${R.esc(itTxt(x))}</span>`, 'abs');
        R.ajusta(e.firstChild, w - 40, 64, 20);
        return e;
      });
      hBlk = Math.ceil(itens.length / cols) * 170 - 22;
      o.ativos = (c.ativos || []).map(n => Number(n) - 1);
    } else if (c.tipo === 'barras') {
      const card = R.el('div', `left:60px;top:0;width:960px;background:#17171b;border:2px solid #2c2c32;border-radius:32px;padding:30px 44px 40px`, blk,
        (c.rotulo ? `<div class=mono style="font-size:26px;color:#a8a49c">${R.esc(c.rotulo)}</div>` : '') +
        itens.map((x, i) => `<div class=ln style="margin-top:24px"><div style="display:flex;justify-content:space-between;align-items:center;font-size:46px;font-weight:800"><span>${R.esc(itTxt(x))}</span><b class=ck style="width:60px;height:60px;border-radius:50%;background:#16A34A;display:flex;align-items:center;justify-content:center;font-size:34px">✓</b></div><div style="height:26px;border-radius:13px;background:#2a2a2f;overflow:hidden;margin-top:12px"><i style="display:block;height:100%;width:${typeof x === 'object' && x.valor != null ? R.clamp(Number(x.valor) / 100) * 100 : 100 - i * 12}%;background:linear-gradient(90deg,${cor},${cor}bb);border-radius:13px;transform-origin:0 50%"></i></div></div>`).join(''), 'abs');
      o.parts = [...card.querySelectorAll('.ln')];
      o.card = card;
      hBlk = card.offsetHeight;
    } else if (c.tipo === 'passos') {
      o.parts = itens.map((x, i) => {
        const e = R.el('div', `left:60px;top:${i * 150}px;width:960px;height:128px;border-radius:28px;background:#17171b;border:2px solid #2c2c32;display:flex;align-items:center;gap:26px;padding:0 28px`, blk,
          `<b style="flex:none;width:80px;height:80px;border-radius:22px;background:${cor};display:flex;align-items:center;justify-content:center;font-size:46px;font-weight:900">${i + 1}</b><span style="font-size:52px;font-weight:800;white-space:nowrap">${R.esc(itTxt(x))}</span>`, 'abs');
        R.ajusta(e.lastChild, 790, 52, 24);
        return e;
      });
      hBlk = itens.length * 150 - 22;
    } else if (c.tipo === 'numero') {
      const e = R.el('div', `left:60px;top:0;width:960px`, blk, `<div class="big num" style="font-size:320px;white-space:nowrap;color:${cor};text-shadow:0 0 60px ${cor}66"></div><div style="font-size:54px;font-weight:800;margin-top:14px">${R.esc(c.rotulo || '')}</div>`, 'abs');
      o.num = e.querySelector('.num');
      o.alvo = Number(String(c.valor).replace(/\./g, '').replace(',', '.'));
      o.num.textContent = (c.prefixo || '') + String(c.valor) + (c.sufixo || '');
      R.ajusta(o.num, 960, 320, 80);
      R.ajusta(e.lastChild, 960, 54, 26);
      o.parts = [e];
      hBlk = e.offsetHeight;
    } else {
      const e = R.el('div', `left:60px;top:0;width:960px;font-size:72px;font-weight:700;line-height:1.22;color:#e4e0d8`, blk, R.esc(c.texto || ''), 'abs');
      R.ajusta(e, 960, 72, 30, 1120 - y0);
      o.parts = [e];
      hBlk = e.offsetHeight;
    }
    blk.style.top = (y0 + Math.max(0, (1130 - y0 - hBlk) / 2)) + 'px';
    return o;
  });

  const panel = R.el('div', `left:60px;top:1180px;width:960px;height:660px;border-radius:44px;overflow:hidden;border:5px solid ${cor};box-shadow:0 0 60px ${cor}77;z-index:5`, null, null, 'abs');
  const vid = R.caixaVideo(panel, 0, 0, 950, 650);
  const cap = R.el('div', 'top:1780px;font-size:70px', null, null, 'cap');

  return t => {
    let ci = 0; cenas.forEach((c, i) => { if (t >= c.em) ci = i; });
    cont.forEach((o, i) => {
      const vis = i === ci || (i === ci - 1 && t < cenas[ci].em + 0.25);
      o.root.style.display = vis ? 'block' : 'none';
      if (!vis) return;
      const tl = t - o.c.em, dur = o.c.fim - o.c.em;
      const sai = i < ci ? R.P(t, cenas[ci].em, 0.25, R.eIn) : 0;
      R.tf(o.root, 0, -sai * 120, 1, 1 - sai);
      o.T.tws.forEach((w, k) => { const p = R.P(tl, k * 0.08, 0.25, R.eBack); w.style.transform = `translateY(${(1 - p) * 60}px) scale(${R.lerp(0.7, 1, p)})`; w.style.opacity = R.clamp(p * 3); });
      const n = o.parts.length, gap = Math.min(0.5, Math.max(0.12, (dur - 0.8) / Math.max(1, n)));
      if (o.c.tipo === 'chips') {
        o.parts.forEach((e, k) => {
          const a = R.P(tl, o.itTempos[k] != null ? o.itTempos[k] : 0.3 + k * gap, 0.3, R.eBack);
          const on = o.ativos.includes(k) && tl >= 0.3 + n * gap + 0.2;
          e.style.background = on ? cor : '#1d1d21'; e.style.borderColor = on ? cor : '#34343a'; e.style.boxShadow = on ? `0 0 40px ${cor}88` : 'none';
          R.tf(e, 0, 0, R.lerp(0.4, 1, a), R.clamp(a * 3));
        });
      } else if (o.c.tipo === 'barras') {
        const cp = R.P(tl, 0.3, 0.3, R.eBack); R.tf(o.card, 0, (1 - cp) * 60, R.lerp(0.85, 1, cp), R.clamp(cp * 3));
        o.parts.forEach((l, k) => { const at = o.itTempos[k] != null ? o.itTempos[k] : 0.45 + k * gap; l.querySelector('i').style.transform = `scaleX(${R.P(tl, at, 0.4)})`; l.querySelector('.ck').style.transform = `scale(${R.P(tl, at + 0.25, 0.2, R.eBack)})`; });
      } else if (o.c.tipo === 'passos') {
        o.parts.forEach((e, k) => { const p = R.P(tl, o.itTempos[k] != null ? o.itTempos[k] : 0.3 + k * gap, 0.3, R.eBack); R.tf(e, (1 - p) * -200, 0, 1, R.clamp(p * 2)); });
      } else if (o.c.tipo === 'numero') {
        const p = R.eOut(R.clamp((tl - 0.3) / 0.7));
        if (isFinite(o.alvo)) o.num.textContent = (o.c.prefixo || '') + (o.alvo * p).toLocaleString('pt-BR', { maximumFractionDigits: String(o.c.valor).includes(',') ? 1 : 0 }) + (p >= 1 ? (o.c.sufixo || '') : '');
        R.tf(o.parts[0], 0, (1 - R.P(tl, 0.2, 0.3)) * 40, 1, R.P(tl, 0.2, 0.2));
      } else {
        R.tf(o.parts[0], 0, (1 - R.P(tl, 0.3, 0.3)) * 40, 1, R.P(tl, 0.3, 0.3));
      }
    });
    panel.style.transform = `translateY(${(1 - R.P(t, 0, 0.35, R.eBack)) * 120 + Math.sin(t * 2) * 4}px)`;
    blob.style.transform = `translate(${Math.sin(t) * 40}px,${Math.cos(t) * 30}px)`;
    vid.set(t, { foco: 'rosto' });
    R.legenda(cap, t);
  };
};
