// Colori dominanti di un'immagine (di solito il logo del cliente).
// Serve a proporre sfondi già coerenti col marchio, senza chiedere a nessuno
// i codici colore: quelli veri stanno dentro il logo.

const KEY = (r, g, b) => ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
const dist = (a, b) => Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
const hex = ([r, g, b]) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();

/**
 * Ritorna fino a `quanti` colori in formato #RRGGBB, dal più presente.
 * Salta i pixel trasparenti (lo sfondo appena rimosso) e, se può, i grigi
 * quasi bianchi o quasi neri: come sfondo non direbbero niente del marchio.
 */
export function estraiColori(img, quanti = 5) {
  const { data: d } = img;
  const secchi = new Map();

  for (let p = 0; p < d.length; p += 4) {
    if (d[p + 3] < 128) continue; // trasparente: non fa parte del logo
    const r = d[p], g = d[p + 1], b = d[p + 2];
    const k = KEY(r, g, b);
    const v = secchi.get(k) || { n: 0, r: 0, g: 0, b: 0 };
    v.n++; v.r += r; v.g += g; v.b += b;
    secchi.set(k, v);
  }
  if (!secchi.size) return [];

  let colori = [...secchi.values()]
    .map((v) => ({ n: v.n, c: [Math.round(v.r / v.n), Math.round(v.g / v.n), Math.round(v.b / v.n)] }))
    .sort((a, b) => b.n - a.n);

  // Accorpa le sfumature dello stesso colore (le ombre e l'antialiasing).
  const scelti = [];
  for (const cand of colori) {
    if (scelti.some((s) => dist(s.c, cand.c) < 62)) continue;
    scelti.push(cand);
    if (scelti.length >= quanti * 3) break;
  }

  const interessante = (c) => {
    const max = Math.max(...c), min = Math.min(...c);
    const grigio = max - min < 26;
    return !(grigio && (max > 232 || max < 30));
  };
  const buoni = scelti.filter((s) => interessante(s.c));
  return (buoni.length ? buoni : scelti).slice(0, quanti).map((s) => hex(s.c));
}

/** Un colore leggibile da abbinare: più scuro se il fondo è chiaro. */
export function scurisci(hexCol, quanto = 0.55) {
  const n = parseInt(hexCol.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - quanto)));
  return hex(c);
}
