// /reel-profundidade — janelas e interfaces flutuando atrás da sua cabeça, você recortado na frente.
ESTILOS.profundidade = function (R) {
  const P = R.plano, cor = R.cor, D = R.dur;
  const jan = (Array.isArray(P.janelas) ? P.janelas : []).slice(0, 8).map(j => Object.assign({}, j));
  if (!jan.length) R.err('plano.janelas está vazio. Liste de 2 a 6 janelas ({"tipo","titulo","em", ...}).');
  const TIPOS = ['campos', 'terminal', 'status', 'mensagem', 'lista', 'grafico', 'imagem'];
  jan.forEach((j, i) => { if (!TIPOS.includes(j.tipo)) R.err(`janela ${i + 1}: "tipo" deve ser um de ${TIPOS.join(', ')}`); });
  R.tempos(jan, 'em', 0.1, Math.max(0.5, D * 0.5));

  const bg = R.el('canvas', '', null, null, 'abs'); bg.width = 1080; bg.height = 1920; const bctx = bg.getContext('2d');
  const glow = R.el('div', `left:90px;top:200px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,${cor}88,transparent 65%)`, null, null, 'abs');
  const mid = R.el('div', 'left:0;top:0;width:1080px;height:1920px;perspective:1400px', null, null, 'abs');
  const SLOTS = [[50, 300, 460, -6], [570, 280, 460, 7], [40, 640, 410, -5], [630, 660, 410, 5], [310, 270, 460, 3], [40, 970, 370, -6], [670, 990, 370, 6], [340, 1200, 400, -3]];
  const tb = n => `<div class=tb><i style="background:#F87171"></i><i style="background:#FBBF24"></i><i style="background:#34D399"></i><span style="margin-left:10px">${R.esc(n || '')}</span></div>`;

  const W = jan.map((j, i) => {
    const [x, y, w, ry] = SLOTS[(j.posicao != null ? j.posicao - 1 : i) % SLOTS.length];
    const el = R.el('div', `left:${x}px;top:${y}px;width:${w}px`, mid, null, 'win');
    const o = { j, el, ry, i };
    if (j.tipo === 'campos') {
      const campos = (j.campos || ['Campo 1', 'Campo 2', 'Campo 3']).slice(0, 4);
      el.innerHTML = tb(j.titulo) + campos.map(c => `<div class=fld style="margin:16px 24px 0;border:2px solid rgba(255,255,255,.12);border-radius:16px;padding:12px 18px"><div style="font-size:23px;color:#b3afa7;font-weight:600">${R.esc(c)}</div><div class=v style="font-family:'JetBrains Mono';font-size:26px;color:#e9e5dc;margin-top:6px;min-height:32px;white-space:nowrap;overflow:hidden"></div></div>`).join('') + '<div style="height:22px"></div>';
      const flds = [...el.querySelectorAll('.fld')], vals = [...el.querySelectorAll('.v')];
      o.upd = tl => flds.forEach((f, k) => {
        const at = 0.35 + k * 0.55, on = tl >= at;
        f.style.borderColor = on ? cor : 'rgba(255,255,255,.12)'; f.style.background = on ? cor + '28' : 'transparent';
        const val = (j.valores && j.valores[k]) || '••••••••••••••';
        vals[k].textContent = val.slice(0, Math.floor(R.clamp((tl - at + 0.15) / 0.5) * val.length));
      });
    } else if (j.tipo === 'terminal') {
      el.innerHTML = tb(j.titulo || 'terminal') + `<div class=tl style="padding:20px 24px;font-family:'JetBrains Mono';font-size:25px;line-height:1.6;color:#cfcac0;min-height:150px"></div>`;
      const tl0 = el.querySelector('.tl'), L = (j.linhas || ['$ ...']).slice(0, 6);
      o.upd = tl => {
        const nl = Math.min(L.length, Math.floor(R.clamp(tl / Math.max(0.4, L.length * 0.45)) * (L.length + 1)));
        tl0.innerHTML = L.slice(0, nl).map(l => R.esc(l).replace(/(200 OK|OK|✓|sucesso|pronto)/gi, '<span style="color:#34D399">$1</span>')).join('<br>') + `<span style="opacity:${Math.floor(tl * 4) % 2}">▍</span>`;
      };
    } else if (j.tipo === 'status') {
      el.innerHTML = `<div style="padding:24px 30px;display:flex;align-items:center;gap:18px;font-size:34px;font-weight:800"><b class=ck style="flex:none;width:54px;height:54px;border-radius:50%;background:#16A34A;display:flex;align-items:center;justify-content:center">✓</b><span>${R.esc(j.texto || j.titulo || '')}</span></div>`;
      el.style.width = 'auto';
      const ck = el.querySelector('.ck');
      o.upd = tl => { ck.style.transform = `scale(${R.P(tl, 0.25, 0.25, R.eBack)})`; };
    } else if (j.tipo === 'mensagem') {
      el.innerHTML = tb(j.titulo || 'mensagem') + `<div style="padding:20px 24px"><div class=bl style="display:inline-block;background:${cor};color:#fff;border-radius:22px 22px 22px 6px;padding:16px 22px;font-size:28px;line-height:1.35;font-weight:600">${R.esc(j.texto || '')}</div></div>`;
      const bl = el.querySelector('.bl');
      o.upd = tl => { const p = R.P(tl, 0.3, 0.3, R.eBack); R.tf(bl, 0, (1 - p) * 30, R.lerp(0.7, 1, p), p); };
    } else if (j.tipo === 'lista') {
      el.innerHTML = tb(j.titulo) + `<div style="padding:12px 26px 22px">${(j.itens || []).slice(0, 5).map(x => `<div class=it style="display:flex;align-items:center;gap:14px;margin-top:12px;font-size:28px;font-weight:700"><b style="flex:none;width:38px;height:38px;border-radius:50%;background:${cor};display:flex;align-items:center;justify-content:center;font-size:22px">✓</b><span>${R.esc(x)}</span></div>`).join('')}</div>`;
      const its = [...el.querySelectorAll('.it')];
      o.upd = tl => its.forEach((it, k) => { const p = R.P(tl, 0.3 + k * 0.35, 0.25, R.eBack); R.tf(it, (1 - p) * -40, 0, 1, p); });
    } else if (j.tipo === 'grafico') {
      const v = (j.valores || [3, 5, 4, 7, 6, 9]).slice(0, 8).map(Number), mx = Math.max(...v, 1);
      el.innerHTML = tb(j.titulo) + `<div class=gb style="display:flex;align-items:flex-end;gap:12px;height:200px;padding:20px 26px 24px"></div>`;
      const bars = v.map(x => R.el('div', `flex:1;height:${(x / mx) * 160}px;border-radius:10px 10px 4px 4px;background:linear-gradient(180deg,${cor},${cor}88);transform-origin:50% 100%`, el.querySelector('.gb')));
      o.upd = tl => bars.forEach((b, k) => { b.style.transform = `scaleY(${R.P(tl, 0.25 + k * 0.08, 0.35, R.eBack)})`; });
    } else if (j.tipo === 'imagem') {
      el.innerHTML = (j.titulo ? tb(j.titulo) : '') + `<img style="display:block;width:100%;height:${R.num(j.altura, 300)}px;object-fit:cover">`;
      R.setImg(el.querySelector('img'), R.arquivo(j.src));
      if (!j.src) R.err(`janela ${i + 1} (imagem): falta "src" com o caminho da imagem`);
      o.upd = () => {};
    } else o.upd = () => {};
    return o;
  });

  const fg = R.el('canvas', '', null, null, 'abs'); fg.width = 1080; fg.height = 1920; const fctx = fg.getContext('2d');
  const cap = R.el('div', 'top:1450px;font-size:78px', null, null, 'cap');
  const escala = R.num(P.escala_pessoa, 1);

  return t => {
    const im = R.getImg(R.frame(t));
    const r = R.cover(1080, 1920);
    const rect = R.pessoaRect(R.num(P.topo_cabeca, 760), escala);
    const desenhaPessoa = R.pessoa(fctx, t, rect);
    W.forEach(o => {
      const tl = t - o.j.em, p = R.P(t, o.j.em, 0.45, R.eOut);
      const sai = o.j.ate != null ? R.P(t, Number(o.j.ate), 0.35) : 0;
      const dx = Math.sin(t * 1.4 + o.i * 1.7) * 16, dy = Math.cos(t * 1.1 + o.i) * 12;
      o.el.style.transform = `translate(${dx}px,${dy - sai * 80}px) scale(${R.lerp(0.55, 1, p) * R.num(P.escala_janelas, 1.15)}) rotateY(${o.ry * (1 - p) + Math.sin(t + o.i) * 3}deg)`;
      o.el.style.opacity = p * (1 - sai);
      o.el.style.filter = `blur(${(1 - p) * 12 + sai * 8}px)`;
      o.el.style.display = p > 0 && sai < 1 ? 'block' : 'none';
      if (p > 0) o.upd(tl);
    });
    glow.style.opacity = 0.7 + 0.3 * Math.sin(t * 3);
    return () => {
      bctx.filter = 'blur(18px) brightness(.28)';
      bctx.drawImage(im, r.x - 120, r.y - 200, r.w + 240, r.h + 400);
      bctx.filter = 'none';
      fctx.clearRect(0, 0, 1080, 1920);
      desenhaPessoa();
      R.legenda(cap, t);
    };
  };
};
