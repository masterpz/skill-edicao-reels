// /grade-recorte — você recortado no centro de 4 blocos que viram juntos a cada troca.
ESTILOS.grade = function (R) {
  const P = R.plano, cor = R.cor, D = R.dur;
  const sets = (Array.isArray(P.conjuntos) ? P.conjuntos : []).map(c => Object.assign({}, c));
  if (!sets.length) R.err('plano.conjuntos está vazio. Cada conjunto tem "em" e "blocos" (4 blocos).');
  sets.forEach((c, i) => {
    if (!Array.isArray(c.blocos) || c.blocos.length !== 4) R.err(`conjunto ${i + 1}: precisa de exatamente 4 blocos`);
  });
  R.tempos(sets, 'em', 0, Math.max(0.5, D * 0.7));
  sets.sort((a, b) => a.em - b.em);
  if (sets.length) sets[0].em = 0;
  const pal = [[cor, '#fff'], ['#151515', '#fff'], ['#F3F1EC', '#151515'], ['#2160E0', '#fff']];
  const claro = c => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (!m) return false; const n = parseInt(m[1], 16); return ((n >> 16) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) > 160; };

  const wrap = R.el('div', `left:0;top:0;width:1080px;height:1920px;perspective:1600px;background:${P.fundo || cor}`, null, null, 'abs');
  const tiles = [0, 1, 2, 3].map(i => {
    const d = R.el('div', `left:${(i % 2) * 540}px;top:${Math.floor(i / 2) * 960}px;width:540px;height:960px;overflow:hidden;display:flex;flex-direction:column;padding:${i < 2 ? 150 : 40}px 40px 60px;backface-visibility:hidden;transform-origin:${i % 2 ? '0% 50%' : '100% 50%'};align-items:${i % 2 ? 'flex-end' : 'flex-start'};text-align:${i % 2 ? 'right' : 'left'}`, wrap,
      `<img style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none"><div class=mono style="position:relative;font-size:24px;opacity:.85"></div><div class=big style="position:relative;margin-top:12px;line-height:.98"></div>`, 'abs');
    return { d, img: d.querySelector('img'), k: d.querySelector('.mono'), t: d.querySelector('.big'), i };
  });
  // pré-monta o conteúdo de cada conjunto para medir o tamanho do texto uma vez
  sets.forEach(c => {
    c._b = (c.blocos || []).slice(0, 4).map((b, i) => {
      b = typeof b === 'string' ? { texto: b } : (b || {});
      const [bgc, txc] = pal[i % 4];
      const fundo = b.cor || bgc;
      return { fundo, texto: b.corTexto || (b.cor ? (claro(b.cor) ? '#151515' : '#fff') : txc), rotulo: b.rotulo || '', t: b.texto || '', img: b.imagem ? R.arquivo(b.imagem) : null };
    });
  });
  const tamanhos = sets.map(c => c._b.map((b, i) => {
    const tt = tiles[i].t; tt.textContent = b.t;
    tt.style.maxWidth = (i < 2 ? 450 : 250) + 'px';
    return R.ajusta(tt, i < 2 ? 450 : 250, i < 2 ? 84 : 52, 24, i < 2 ? 420 : 200);
  }));
  const cv = R.el('canvas', '', null, null, 'abs'); cv.width = 1080; cv.height = 1920; const ctx = cv.getContext('2d');
  const cap = R.el('div', 'top:1560px;font-size:78px', null, null, 'cap');
  const trocas = sets.map(s => s.em).filter(x => x > 0.05);

  return t => {
    let si = 0; sets.forEach((s, i) => { if (t >= s.em) si = i; });
    const S = sets[si];
    if (S) tiles.forEach((tl, i) => {
      const b = S._b[i] || { fundo: '#222', texto: '#fff', rotulo: '', t: '' };
      const fp = si === 0 ? R.P(t, 0.02 * i, 0.25, R.eOut) : R.P(t, S.em + i * 0.05, 0.28, R.eBack);
      tl.d.style.background = b.fundo; tl.d.style.color = b.texto;
      tl.k.textContent = b.rotulo; tl.t.textContent = b.t;
      tl.t.style.fontSize = tamanhos[si][i] + 'px';
      if (b.img) { tl.img.style.display = 'block'; R.setImg(tl.img, b.img); } else tl.img.style.display = 'none';
      tl.d.style.transform = `rotateY(${(i % 2 ? -1 : 1) * 90 * (1 - fp)}deg)`;
    });
    const pulse = trocas.reduce((a, s) => a + 0.035 * Math.max(0, 1 - Math.abs(t - s - 0.12) / 0.15), 0);
    const base = R.pessoaRect(R.num(P.topo_cabeca, 860), R.num(P.escala_pessoa, 1));
    const sc = 1 + pulse;
    const rect = { x: 540 - (540 - base.x) * sc, y: 1920 - (1920 - base.y) * sc, w: base.w * sc, h: base.h * sc };
    const draw = R.pessoa(ctx, t, rect, { contorno: 12, sombra: true, corContorno: P.contorno || '#fff' });
    const [sx, sy] = R.tremida(t, trocas, 12, 0.2);
    R.stage.style.transform = `translate(${sx}px,${sy}px)`;
    return () => { ctx.clearRect(0, 0, 1080, 1920); draw(); R.legenda(cap, t); };
  };
};
