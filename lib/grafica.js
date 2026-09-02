// Modello unico della grafica: da qui escono SIA il CSS dell'anteprima SIA il
// disegno del file che si scarica. Tenerli separati significherebbe vederli
// divergere alla prima modifica.

// I due tagli che servono davvero: il post quadrato-verticale e il verticale
// pieno di reel e storie. Il disegno è lo stesso, cambia quanto è alto.
export const TAGLI = {
  post: { nome: "Post 4:5", rapporto: 5 / 4, w: 1080, h: 1350, css: "4/5" },
  reel: { nome: "Reel · Storia 9:16", rapporto: 16 / 9, w: 1080, h: 1920, css: "9/16" },
};

export const SERIF = '"Bodoni 72","Didot","Playfair Display",Georgia,serif';
export const COND = '"Haettenschweiler","Arial Narrow","Helvetica Neue",Impact,sans-serif';

// Fondali "fantasia": centro, raggi e colori in percentuale del riquadro.
export const FANTASIE = [
  { cx: 70, cy: 20, rx: 120, ry: 90, stop: [["#6b5836", 0], ["#241a10", 55], ["#0c0906", 100]] },
  { cx: 30, cy: 30, rx: 120, ry: 90, stop: [["#3f5a3a", 0], ["#1c2417", 55], ["#080b06", 100]] },
  { cx: 60, cy: 70, rx: 120, ry: 100, stop: [["#7a3b2a", 0], ["#2a1510", 55], ["#0b0605", 100]] },
  { cx: 50, cy: 20, rx: 120, ry: 90, stop: [["#4a4f63", 0], ["#1c1f2a", 55], ["#07080c", 100]] },
];

// Misure di ogni formato, in cqw (centesimi di larghezza): le stesse del CSS.
export const FORMATI = {
  aperti:  { eyebrow: 4,   title: 15, subtitle: 4.4, mTop: 2,   mBot: 2 },
  offerta: { eyebrow: 3.2, title: 13, subtitle: 3.8, mTop: 3.4, mBot: 2, pillola: true, lsEye: 0.18 },
  menu:    { eyebrow: 3.4, title: 12, subtitle: 3.6, mTop: 2.5, mBot: 2.5, lsEye: 0.3,
             titoloSerif: true, trattini: true, lsSub: 0.06, senzaMaiuscole: true },
  evento:  { eyebrow: 3.6, title: 13, subtitle: 3.6, mTop: 2.4, mBot: 2.4, lsEye: 0.24,
             eyebrowColorata: true, rigaSotto: true, lsSub: 0.2, mSub: 2 },
};

const percentuali = (stop) => stop.map(([c, p]) => `${c} ${p}%`).join(", ");

/** Lo sfondo come stringa CSS, per l'anteprima nella pagina. */
export function sfondoCss({ tipo, foto, inquadratura = 50, col1, col2, dir, fantasia = 0 }) {
  if (tipo === "foto" && foto) return `url("${foto}") 50% ${inquadratura}% / cover no-repeat`;
  if (tipo === "tinta") return col1;
  if (tipo === "sfumatura") {
    if (dir === "radiale") return `radial-gradient(120% 90% at 50% 25%, ${col1} 0%, ${col2} 100%)`;
    if (dir === "diagonale") return `linear-gradient(135deg, ${col1} 0%, ${col2} 100%)`;
    return `linear-gradient(180deg, ${col1} 0%, ${col2} 100%)`;
  }
  const f = FANTASIE[fantasia % FANTASIE.length];
  return `radial-gradient(${f.rx}% ${f.ry}% at ${f.cx}% ${f.cy}%, ${percentuali(f.stop)})`;
}

// ---------------------------------------------------------------- disegno ---

/** Larghezza di un testo tenendo conto della spaziatura tra le lettere. */
function larghezza(ctx, testo, spazio) {
  if (!spazio) return ctx.measureText(testo).width;
  let w = 0;
  for (const ch of testo) w += ctx.measureText(ch).width + spazio;
  return w - spazio;
}

/** Scrive un testo distanziando le lettere (la canvas da sola non lo fa). */
function scrivi(ctx, testo, x, y, spazio) {
  if (!spazio) { ctx.fillText(testo, x, y); return; }
  let cx = x;
  for (const ch of testo) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spazio;
  }
}

function aCapo(ctx, testo, spazio, max) {
  const righe = [];
  let riga = "";
  for (const parola of String(testo || "").split(/\s+/).filter(Boolean)) {
    const prova = riga ? riga + " " + parola : parola;
    if (larghezza(ctx, prova, spazio) > max && riga) { righe.push(riga); riga = parola; }
    else riga = prova;
  }
  if (riga) righe.push(riga);
  return righe.length ? righe : [""];
}

function sfumaturaFantasia(ctx, W, H, f) {
  // La canvas fa cerchi, il CSS ellissi: si deforma il piano e si torna indietro.
  const rx = (f.rx / 100) * W, ry = (f.ry / 100) * H;
  const cx = (f.cx / 100) * W, cy = (f.cy / 100) * H;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  for (const [colore, p] of f.stop) g.addColorStop(p / 100, colore);
  ctx.fillStyle = g;
  ctx.fillRect(-W * 2, -H * 2, W * 4, H * 4);
  ctx.restore();
}

/**
 * Disegna la grafica intera. `cfg.rapporto` decide l'altezza (4:5 o 9:16).
 * `cfg.foto` e `cfg.logo` sono immagini già caricate (o null).
 */
export function disegnaGrafica(ctx, cfg) {
  const W = cfg.larghezza;
  const H = Math.round(W * (cfg.rapporto || 5 / 4));
  const U = W / 100; // 1cqw
  const F = FORMATI[cfg.formato] || FORMATI.aperti;
  const ink = cfg.ink;
  const line = cfg.line;

  // --- sfondo ---
  ctx.clearRect(0, 0, W, H);
  if (cfg.sfondo === "foto" && cfg.foto) {
    const img = cfg.foto;
    const scala = Math.max(W / img.width, H / img.height); // "cover"
    const w = img.width * scala, h = img.height * scala;
    const x = (W - w) / 2;
    const y = (H - h) * ((cfg.inquadratura ?? 50) / 100); // object-position verticale
    ctx.drawImage(img, x, y, w, h);
  } else if (cfg.sfondo === "tinta") {
    ctx.fillStyle = cfg.col1;
    ctx.fillRect(0, 0, W, H);
  } else if (cfg.sfondo === "sfumatura") {
    if (cfg.dir === "radiale") {
      sfumaturaFantasia(ctx, W, H, { cx: 50, cy: 25, rx: 120, ry: 90, stop: [[cfg.col1, 0], [cfg.col2, 100]] });
    } else {
      const g = cfg.dir === "diagonale"
        ? ctx.createLinearGradient(0, 0, W, H)
        : ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, cfg.col1);
      g.addColorStop(1, cfg.col2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  } else {
    sfumaturaFantasia(ctx, W, H, FANTASIE[(cfg.fantasia || 0) % FANTASIE.length]);
  }

  // --- velo scuro ---
  const velo = Number(cfg.velo) || 0;
  if (velo > 0) {
    ctx.fillStyle = `rgba(0,0,0,${velo})`;
    ctx.fillRect(0, 0, W, H);
  }

  // --- velatura fissa che tiene leggibile il testo in basso ---
  const ov = ctx.createLinearGradient(0, 0, 0, H);
  ov.addColorStop(0, "rgba(0,0,0,.25)");
  ov.addColorStop(0.4, "rgba(0,0,0,.15)");
  ov.addColorStop(1, "rgba(0,0,0,.72)");
  ctx.fillStyle = ov;
  ctx.fillRect(0, 0, W, H);

  // --- blocco di testo ---
  const sinistra = cfg.posizione === "bottomleft";
  const padSx = 8 * U;
  const padDx = sinistra ? 16 * U : 8 * U;
  const maxTesto = W - padSx - padDx;
  const maiuscolo = (t) => (F.senzaMaiuscole ? String(t || "") : String(t || "").toUpperCase());

  const eyeSize = F.eyebrow * U;
  const eyeLs = (F.lsEye ?? 0.34) * eyeSize;
  const titleSize = F.title * U;
  const subSize = F.subtitle * U;
  const subLs = (F.lsSub ?? 0.32) * subSize;

  const fontTitolo = F.titoloSerif
    ? `italic 700 ${titleSize}px ${SERIF}`
    : `800 ${titleSize}px ${cfg.fontTitolo || COND}`;

  ctx.font = fontTitolo;
  const titolo = F.senzaMaiuscole ? String(cfg.titolo || "") : String(cfg.titolo || "").toUpperCase();
  const righeTitolo = aCapo(ctx, titolo, -0.01 * titleSize, maxTesto);

  const hEye = cfg.eyebrow ? (F.pillola ? eyeSize * 1.2 + 3.2 * U : eyeSize * 1.2) : 0;
  const hTitolo = righeTitolo.length * titleSize * 0.92;
  const hRiga = F.rigaSotto ? 2.4 * U + 0.9 * U : 0;
  const hSub = cfg.sottotitolo ? subSize * 1.2 + (F.mSub || 0) * U : 0;
  const blocco =
    hEye + (cfg.eyebrow ? F.mTop * U : 0) + hTitolo + hRiga + (cfg.sottotitolo ? F.mBot * U : 0) + hSub;

  let y =
    cfg.posizione === "top" ? 7 * U
    : cfg.posizione === "center" ? (H - blocco) / 2
    : cfg.posizione === "bottom" ? H - 12 * U - blocco
    : H - 11 * U - blocco;

  const centro = padSx + maxTesto / 2;
  const ancora = (larghezzaTesto) => (sinistra ? padSx : centro - larghezzaTesto / 2);

  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  // eyebrow
  if (cfg.eyebrow) {
    const testo = maiuscolo(cfg.eyebrow);
    ctx.font = `${F.pillola ? 800 : 600} ${eyeSize}px ${cfg.fontTesto || COND}`;
    const etichetta = F.trattini ? `— ${testo} —` : testo;
    const wEye = larghezza(ctx, etichetta, eyeLs);
    if (F.pillola) {
      const padX = 3.4 * U, padY = 1.6 * U;
      const wPill = wEye + padX * 2, hPill = eyeSize * 1.2 + padY * 2;
      const xPill = ancora(wPill);
      ctx.fillStyle = line;
      ctx.beginPath();
      ctx.roundRect(xPill, y, wPill, hPill, hPill / 2);
      ctx.fill();
      ctx.fillStyle = "#1A1200";
      scrivi(ctx, etichetta, xPill + padX, y + padY, eyeLs);
    } else {
      ctx.fillStyle = F.eyebrowColorata ? line : ink;
      ctx.globalAlpha = F.eyebrowColorata ? 1 : 0.95;
      scrivi(ctx, etichetta, ancora(wEye), y, eyeLs);
      ctx.globalAlpha = 1;
    }
    y += hEye + F.mTop * U;
  }

  // titolo
  ctx.font = fontTitolo;
  ctx.shadowColor = "rgba(0,0,0,.35)";
  ctx.shadowBlur = 2 * U;
  ctx.shadowOffsetY = 0.2 * U;
  for (const riga of righeTitolo) {
    // nel formato Offerta il prezzo (la parola col €) prende il colore delle linee
    const pezzi = cfg.formato === "offerta" ? riga.split(/(\S*€\S*)/).filter(Boolean) : [riga];
    const wRiga = pezzi.reduce((t, p) => t + larghezza(ctx, p, -0.01 * titleSize), 0);
    let x = ancora(wRiga);
    for (const pezzo of pezzi) {
      ctx.fillStyle = /€/.test(pezzo) && cfg.formato === "offerta" ? line : ink;
      scrivi(ctx, pezzo, x, y, -0.01 * titleSize);
      x += larghezza(ctx, pezzo, -0.01 * titleSize);
    }
    y += titleSize * 0.92;
  }
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // riga decorativa del formato Evento
  if (F.rigaSotto) {
    y += 2.4 * U;
    const wRiga = 16 * U, hR = 0.9 * U;
    const x = sinistra ? padSx : centro - wRiga / 2;
    ctx.fillStyle = line;
    ctx.beginPath();
    ctx.roundRect(x, y, wRiga, hR, hR / 2);
    ctx.fill();
    y += hR;
  }

  // sottotitolo
  if (cfg.sottotitolo) {
    y += F.mBot * U + (F.mSub || 0) * U;
    ctx.font = `${F.senzaMaiuscole ? 400 : 600} ${F.senzaMaiuscole ? "italic " : ""}${subSize}px ${F.senzaMaiuscole ? SERIF : cfg.fontTesto || COND}`;
    const testo = maiuscolo(cfg.sottotitolo);
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.95;
    scrivi(ctx, testo, ancora(larghezza(ctx, testo, subLs)), y, subLs);
    ctx.globalAlpha = 1;
  }

  // --- logo (in alto, oppure in basso se il testo sta in alto) ---
  const inAlto = cfg.posizione !== "top";
  if (cfg.logo) {
    const h = (cfg.logoH || 14) * U;
    const w = Math.min((cfg.logo.width / cfg.logo.height) * h, 60 * U);
    const x = (W - w) / 2;
    const yLogo = inAlto ? 6.5 * U : H - 6 * U - h;
    ctx.shadowColor = "rgba(0,0,0,.45)";
    ctx.shadowBlur = 2 * U;
    ctx.shadowOffsetY = 0.2 * U;
    ctx.drawImage(cfg.logo, x, yLogo, w, h);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  } else if (cfg.logoTesto) {
    const size = 3.4 * U;
    ctx.font = `700 ${size}px ${SERIF}`;
    const testo = String(cfg.logoTesto).toUpperCase();
    const ls = 0.12 * size;
    const w = larghezza(ctx, testo, ls);
    const yLogo = inAlto ? 6.5 * U : H - 6 * U - size * 2.2;
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.95;
    ctx.shadowColor = "rgba(0,0,0,.5)";
    ctx.shadowBlur = 1.2 * U;
    scrivi(ctx, testo, (W - w) / 2, yLogo, ls);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = line;
    ctx.fillRect((W - 9 * U) / 2, yLogo + size * 1.2 + 1.6 * U, 9 * U, 0.55 * U);
    ctx.globalAlpha = 1;
  }
}
