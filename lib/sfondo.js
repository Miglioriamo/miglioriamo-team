// Rimozione dello sfondo da un logo (gira nel browser, su una <canvas>).
//
// Idea di fondo: lo sfondo di un logo è quasi sempre una tinta unita che tocca
// i BORDI dell'immagine — di solito bianco. Quindi non si cancellano "tutti i
// pixel bianchi" (si bucherebbero le scritte in negativo dentro il marchio):
// si parte dai bordi e si allaga verso l'interno finché il colore resta simile
// a quello di partenza. Il bianco chiuso dentro il logo non viene mai raggiunto.

export const TOLLERANZE = { leggera: 26, media: 46, forte: 78, massima: 115 };

const dist = (r, g, b, c) => Math.sqrt((r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2);

/** Il logo ha già il fondo trasparente? Allora non va toccato. */
export function haGiaTrasparenza(img) {
  const d = img.data;
  let trasparenti = 0;
  for (let p = 3; p < d.length; p += 4) if (d[p] < 250) trasparenti++;
  return trasparenti / (d.length / 4) > 0.02;
}

/** Colore dello sfondo: la tinta più diffusa nei quattro angoli. */
export function coloreSfondo(img, lato = 6) {
  const { data: d, width: w, height: h } = img;
  const conta = new Map();
  const guarda = (x, y) => {
    const p = (y * w + x) * 4;
    const k = `${d[p] >> 3},${d[p + 1] >> 3},${d[p + 2] >> 3}`;
    const v = conta.get(k) || { n: 0, r: 0, g: 0, b: 0 };
    v.n++; v.r += d[p]; v.g += d[p + 1]; v.b += d[p + 2];
    conta.set(k, v);
  };
  for (let y = 0; y < Math.min(lato, h); y++)
    for (let x = 0; x < Math.min(lato, w); x++) {
      guarda(x, y); guarda(w - 1 - x, y); guarda(x, h - 1 - y); guarda(w - 1 - x, h - 1 - y);
    }
  let top = null;
  for (const v of conta.values()) if (!top || v.n > top.n) top = v;
  return [Math.round(top.r / top.n), Math.round(top.g / top.n), Math.round(top.b / top.n)];
}

/**
 * Rende trasparente lo sfondo. Modifica img.data sul posto.
 *
 * opzioni.ancheDentro : toglie il colore di sfondo anche dove è CHIUSO dentro il
 *   logo (i buchi della "O", lo spazio tra marchio e cornice). Va lasciato spento
 *   quando il logo ha scritte bianche in negativo, altrimenti spariscono.
 * opzioni.rifinisci : ripassa i bordi per mangiare l'alone di pixel quasi-sfondo
 *   che la compressione JPEG lascia sempre attorno al marchio.
 */
export function rimuoviSfondo(img, tolleranza = TOLLERANZE.media, opzioni = {}) {
  const { ancheDentro = false, rifinisci = true } = opzioni;
  const { data: d, width: w, height: h } = img;
  const bg = coloreSfondo(img);
  const morbida = tolleranza * 1.8; // fascia di sfumatura: evita i bordi seghettati

  const visti = new Uint8Array(w * h);
  const coda = [];
  const metti = (x, y) => {
    const i = y * w + x;
    if (!visti[i]) { visti[i] = 1; coda.push(i); }
  };
  for (let x = 0; x < w; x++) { metti(x, 0); metti(x, h - 1); }
  for (let y = 0; y < h; y++) { metti(0, y); metti(w - 1, y); }

  while (coda.length) {
    const i = coda.pop();
    const p = i * 4;
    const dd = dist(d[p], d[p + 1], d[p + 2], bg);
    if (dd > morbida) continue; // colore lontano dallo sfondo: qui comincia il logo

    if (dd <= tolleranza) d[p + 3] = 0;
    else d[p + 3] = Math.round(255 * ((dd - tolleranza) / (morbida - tolleranza)));

    const x = i % w, y = (i - x) / w;
    if (x > 0) metti(x - 1, y);
    if (x < w - 1) metti(x + 1, y);
    if (y > 0) metti(x, y - 1);
    if (y < h - 1) metti(x, y + 1);
  }

  // Sfondo racchiuso dentro il logo: si toglie solo se richiesto.
  if (ancheDentro) {
    for (let p = 0; p < d.length; p += 4) {
      if (d[p + 3] === 0) continue;
      const dd = dist(d[p], d[p + 1], d[p + 2], bg);
      if (dd <= tolleranza) d[p + 3] = 0;
      else if (dd <= morbida) {
        const a = Math.round(255 * ((dd - tolleranza) / (morbida - tolleranza)));
        if (a < d[p + 3]) d[p + 3] = a;
      }
    }
  }

  // Rifinitura: chi confina col vuoto ed è ancora vicino al colore di sfondo
  // è alone da compressione, non logo. Due passate bastano.
  if (rifinisci) {
    const soglia = tolleranza * 2.4;
    for (let giro = 0; giro < 2; giro++) {
      const daTogliere = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x, p = i * 4;
          if (d[p + 3] < 20) continue;
          const vicinoVuoto =
            (x > 0 && d[(i - 1) * 4 + 3] === 0) ||
            (x < w - 1 && d[(i + 1) * 4 + 3] === 0) ||
            (y > 0 && d[(i - w) * 4 + 3] === 0) ||
            (y < h - 1 && d[(i + w) * 4 + 3] === 0);
          if (!vicinoVuoto) continue;
          const dd = dist(d[p], d[p + 1], d[p + 2], bg);
          if (dd <= soglia) daTogliere.push(p);
        }
      }
      if (!daTogliere.length) break;
      for (const p of daTogliere) d[p + 3] = 0;
    }
  }

  let rimossi = 0;
  for (let p = 3; p < d.length; p += 4) if (d[p] === 0) rimossi++;
  return { bg, rimossi, percentuale: rimossi / (w * h) };
}
