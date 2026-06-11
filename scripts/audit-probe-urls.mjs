const candidates = [
  'demo-barberia',
  'demo-estetica',
  'demo-estetica-prueba-mpfvpl5u',
  'demo-gooli-ink',
  'demo-igal-tattz',
  'demo-future-tattoo',
  'demo-future-tattoo-piercing-mq743hl4',
  'demo-dari-inks',
  'demo-marganink',
  'demo-nails',
  'demo-cafeteria',
  'demo-remodelaciones',
  'demo-tattoo',
  'demo-velvet-muse',
  'demo-martellin-mpfwij1m',
  'demo-cafe-aristano-mpfwjz7c',
  'demo-u-as-de-mar-mpfynv07',
  'demo-santi-mq3luclw',
  'demo-pintureria-el-paolo-mpfwkvuh',
  'demo-lekt-grigori-mpyhjweg',
];

const results = await Promise.all(candidates.map(async (sub) => {
  const url = `https://${sub}.arzac.studio`;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 10000);
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctl.signal });
    clearTimeout(t);
    const text = await res.text();
    const title = (text.match(/<title>(.*?)<\/title>/s) || [])[1] || '';
    return `${res.status}  ${sub}  title="${title.trim().slice(0, 60)}"`;
  } catch (e) {
    return `ERR  ${sub}  ${e.message}`;
  }
}));
console.log(results.join('\n'));
