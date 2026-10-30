// /reel-pessoal — cortes rápidos (silêncios removidos), zoom que muda a cada batida e legenda de uma palavra.
ESTILOS.pessoal = function (R) {
  const P = R.plano;
  const hot = (Array.isArray(P.destaques) ? P.destaques : []).map(x => String(x).toLowerCase());
  const isHot = w => { const x = w.toLowerCase().replace(/[^\wÀ-ÿ$%]/g, ''); return x && hot.some(h => x === h.replace(/[^\wÀ-ÿ$%]/g, '') || (h.length > 4 && x.startsWith(h))); };
  const cortes = R.job.cortes || [];
  // batidas: cortes de silêncio + início de cada frase curta + palavras de destaque
  const bat = new Set(cortes.map(c => Math.round(c * 100) / 100));
  R.chunks(3, 16).forEach(c => bat.add(Math.round(Math.max(0, c.ws[0].s - 0.03) * 100) / 100));
  R.palavras.forEach(w => { if (isHot(w.w)) bat.add(Math.round((w.s - 0.03) * 100) / 100); });
  const batidas = [...bat].filter(x => x >= 0).sort((a, b) => a - b);
  const FR = [[1, 0, 0], [1.2, 0, 0], [1.08, -30, 0], [1.26, 20, 0], [1.12, 25, 0], [1.22, -20, 0], [1.04, 0, 0], [1.16, -25, 0]];

  const vid = R.caixaVideo(null, 0, 0, 1080, 1920);
  R.el('div', 'left:0;top:0;width:1080px;height:1920px;background:radial-gradient(ellipse at 50% 40%,transparent 50%,rgba(0,0,0,.6) 100%)', null, null, 'abs');
  const word = R.el('div', 'left:0;top:1330px;width:1080px;text-align:center;text-transform:uppercase;z-index:20;transform-origin:50% 50%', null, null, 'abs big');
  const inner = R.el('span', 'display:inline-block;padding:0 .12em;border-radius:20px;letter-spacing:-.05em', word);
  const flash = R.el('div', 'left:0;top:0;width:1080px;height:1920px;background:#fff;z-index:40;opacity:0', null, null, 'abs');
  const grao = R.granulado();

  return t => {
    let bi = 0; batidas.forEach((b, i) => { if (t >= b) bi = i; });
    const b0 = batidas[bi] || 0;
    const f = FR[bi % FR.length];
    const wi = R.palavraAtual(t), w = R.palavras[wi];
    const txt = w ? w.w.replace(/[,.;:…]+$/, '') : '';
    const h = w ? isHot(w.w) : false;
    const pb = R.P(t, b0, 0.16, R.eOut);
    const [sx, sy] = h ? R.tremida(t, [w.s - 0.03], 18, 0.22) : [0, 0];
    vid.set(t, { punch: f[0] * (1 + 0.08 * (1 - pb)) });
    vid.img.style.transform += ` translate(${f[1] + sx}px,${sy}px)`;
    const visivel = w && t < w.e + 0.35 && P.legendas !== false;
    word.style.display = visivel ? 'block' : 'none';
    if (visivel) {
      inner.textContent = txt;
      word.style.fontSize = Math.min(190, Math.floor(900 / (Math.max(1, txt.length) * 0.72))) + 'px';
      inner.style.background = h ? '#FFD23F' : 'transparent';
      inner.style.color = h ? '#111' : '#fff';
      inner.style.webkitTextStroke = h ? '0' : '14px #000';
      inner.style.paintOrder = 'stroke fill';
      const pp = R.P(t, w.s - 0.03, 0.12, R.eBack);
      word.style.filter = h ? `drop-shadow(-6px 0 0 rgba(255,45,85,${0.8 * (1 - pp)})) drop-shadow(6px 0 0 rgba(0,212,255,${0.8 * (1 - pp)}))` : 'none';
      word.style.transform = `scale(${R.lerp(1.3, 1, pp)}) rotate(${h ? R.lerp(-6, -2, pp) : 0}deg)`;
      word.style.opacity = R.clamp(pp * 4);
    }
    flash.style.opacity = R.flashEm(t, cortes, 0.034) * 0.45;
    grao(t);
  };
};
