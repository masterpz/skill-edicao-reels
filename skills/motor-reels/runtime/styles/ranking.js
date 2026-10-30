// /formato-ranking — ranking em cima que preenche um card por vez; você embaixo.
ESTILOS.ranking = function (R) {
  const P = R.plano, cor = R.cor, D = R.dur;
  const itens = (Array.isArray(P.itens) ? P.itens : []).slice(0, 6).map(it => typeof it === 'string' ? { titulo: it } : Object.assign({}, it));
  if (itens.length < 2) R.err('plano.itens precisa de 2 a 6 itens, cada um com "titulo" (e opcionalmente "sub" e "em").');
  itens.forEach((it, i) => { if (!it.titulo) R.err(`item ${i + 1} está sem "titulo"`); });
  R.tempos(itens, 'em', 0.6, Math.max(1.2, D * 0.6));
  const venc = P.vencedor ? Number(P.vencedor) - 1 : -1;
  if (venc >= itens.length) R.err('plano.vencedor aponta para um item que não existe');
  const seloEm = R.num(P.selo_em, itens.length ? itens[itens.length - 1].em + 1.2 : 2);
  const claro = P.tema !== 'escuro';
  const C = claro
    ? { bg: '#F3F1EC', grid: '#E7E4DD', tx: '#151515', card: '#fff', sub: '#6E6A63' }
    : { bg: '#141416', grid: '#232327', tx: '#F3F1EC', card: '#1f1f23', sub: '#a5a19a' };
  const pal = ['#DC2626', '#F59E0B', '#2160E0', '#7C3AED', '#0EA5E9', '#DB2777'];

  const area = R.el('div', `left:0;top:0;width:1080px;height:1060px;background:${C.bg};background-image:linear-gradient(${C.grid} 2px,transparent 2px),linear-gradient(90deg,${C.grid} 2px,transparent 2px);background-size:60px 60px;overflow:hidden`, null, null, 'abs');
  const ttl = R.el('div', `left:70px;top:260px;width:940px;color:${C.tx};line-height:1.02;transform-origin:0 50%`, area, R.destaque(P.titulo || '', P.destaque, cor), 'abs big');
  R.ajusta(ttl, 940, 76, 40, 160);
  const tb = 260 + ttl.offsetHeight + 30, avail = 930 - tb, n = Math.max(1, itens.length), gap = 22;
  const ch = Math.min(196, (avail - gap * (n - 1)) / n), k = ch / 196;
  const cards = itens.map((it, i) => {
    const c = R.el('div', `left:70px;top:${tb + i * (ch + gap)}px;width:940px;height:${ch}px;border-radius:${32 * k}px;background:${C.card};color:${C.tx};display:flex;align-items:center;gap:${30 * k}px;padding:0 ${34 * k}px;box-shadow:0 18px 44px rgba(0,0,0,.14);transform-origin:50% 50%`, area,
      `<div style="width:${124 * k}px;height:${124 * k}px;border-radius:${30 * k}px;flex:none;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:${76 * k}px;color:#fff;background:${i === venc ? '#16A34A' : (it.cor || pal[i % pal.length])}">${it.numero != null ? R.esc(it.numero) : i + 1}</div>
       <div style="min-width:0;flex:1"><div class=big style="font-size:${54 * k}px;letter-spacing:-.025em;white-space:nowrap">${R.esc(it.titulo)}</div>${it.sub ? `<div style="font-size:${30 * k}px;color:${C.sub};margin-top:${6 * k}px;white-space:nowrap">${R.esc(it.sub)}</div>` : ''}</div>`, 'abs');
    const tw = 940 - 68 * k - 124 * k - 30 * k - 20;
    R.ajusta(c.querySelector('.big'), tw, 54 * k, 24);
    if (c.querySelector('.big').nextSibling) R.ajusta(c.querySelector('.big').nextSibling, tw, 30 * k, 16);
    return c;
  });
  const seloTxt = P.selo || (venc >= 0 ? 'O MELHOR ✓' : '');
  const selo = seloTxt && venc >= 0 ? R.el('div', `right:90px;top:${tb + venc * (ch + gap) + ch - 40}px;left:auto;font-weight:900;font-size:58px;color:#16A34A;border:7px solid #16A34A;border-radius:18px;padding:2px 22px 6px;background:rgba(255,255,255,.94);transform-origin:50% 50%;z-index:3`, area, R.esc(seloTxt), 'abs') : null;
  const linha = R.el('div', `left:0;top:1060px;width:1080px;height:8px;background:${C.tx};z-index:3`, null, null, 'abs');
  const vid = R.caixaVideo(null, 0, 1068, 1080, 852);
  const cap = R.el('div', 'top:995px;font-size:70px', null, null, 'cap');

  return t => {
    const tp = R.P(t, 0, 0.3, R.eBack);
    R.tf(ttl, 0, 0, R.lerp(1.12, 1, tp), R.clamp(tp * 3));
    const g = venc >= 0 ? R.P(t, seloEm, 0.25) : 0;
    cards.forEach((c, i) => {
      const a = R.P(t, itens[i].em, 0.32, R.eBack);
      let o = R.clamp(a * 3), sc = R.lerp(0.85, 1, a);
      if (venc >= 0) {
        if (i !== venc) o *= R.lerp(1, 0.42, g);
        else { sc *= 1 + 0.035 * g; c.style.boxShadow = `0 0 0 ${7 * g}px #16A34A, 0 20px 60px rgba(22,163,74,${0.35 * g})`; }
      }
      R.tf(c, (1 - R.P(t, itens[i].em, 0.28)) * -220, 0, sc, o);
    });
    if (selo) { const sp = R.P(t, seloEm + 0.1, 0.22, R.eBack); R.tf(selo, 0, 0, R.lerp(2.4, 1, sp), R.clamp(sp * 4), R.lerp(-30, -9, sp)); }
    const [sx, sy] = selo ? R.tremida(t, [seloEm + 0.18], 14, 0.2) : [0, 0];
    R.stage.style.transform = `translate(${sx}px,${sy}px)`;
    vid.set(t, { foco: 'rosto', punch: 1 + 0.03 * Math.sin(t * 1.2) });
    R.legenda(cap, t);
  };
};
