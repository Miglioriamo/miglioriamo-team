import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { downloadBinary, getThumbnailBuffer } from "../../../lib/dropbox";
import { trovaLogoCliente } from "../../../lib/logo";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Il PDF va al cliente e spesso viene stampato: fondo bianco, testo scuro,
// arancione MiglioriAmo solo per gli accenti.
const ARANCIO = rgb(0.957, 0.678, 0.082);
const SCURO = rgb(0.09, 0.09, 0.1);
const GRIGIO = rgb(0.45, 0.45, 0.48);
const CHIARO = rgb(0.965, 0.962, 0.955);
const BORDO = rgb(0.89, 0.88, 0.86);
const VERDE = rgb(0.25, 0.63, 0.42);

const A4 = [595.28, 841.89];
const MARGINE = 52;
const LARGHEZZA = A4[0] - MARGINE * 2;

// Il font standard del PDF non conosce le emoji né gli apici tipografici.
function pulisci(s) {
  return String(s || "")
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "")
    .trim();
}

function aCapo(testo, font, corpo, larghezza) {
  const righe = [];
  for (const paragrafo of pulisci(testo).split("\n")) {
    if (!paragrafo.trim()) continue;
    let riga = "";
    for (const parola of paragrafo.trim().split(/\s+/)) {
      const prova = riga ? riga + " " + parola : parola;
      if (font.widthOfTextAtSize(prova, corpo) > larghezza && riga) { righe.push(riga); riga = parola; }
      else riga = prova;
    }
    if (riga) righe.push(riga);
  }
  return righe;
}

async function logoDelCliente(clientPath) {
  try {
    const logo = await trovaLogoCliente(clientPath);
    if (!logo) return null;
    // pdf-lib incorpora solo PNG e JPG: pdf, svg e webp passano dall'anteprima.
    return logo.formato === "png"
      ? await downloadBinary(logo.path)
      : await getThumbnailBuffer(logo.path, { formato: "png", size: "w1024h768" });
  } catch { return null; }
}

export async function POST(request) {
  let d = {};
  try { d = await request.json(); } catch {}
  const cliente = pulisci(d.cliente) || "Cliente";
  const periodo = pulisci(d.per);

  const pdf = await PDFDocument.create();
  const normale = await pdf.embedFont(StandardFonts.Helvetica);
  const neretto = await pdf.embedFont(StandardFonts.HelveticaBold);
  const corsivo = await pdf.embedFont(StandardFonts.HelveticaOblique);

  // Logo del cliente (una sola lettura, serve sia alla misura sia al disegno)
  const base = process.env.DROPBOX_CONTEXTS_PATH || "/MIGLIORIAMO/CLAUDE/Contesto cliente";
  const png = d.cliente ? await logoDelCliente(`${base}/${d.cliente}`) : null;
  let logo = null;
  if (png) { try { logo = await pdf.embedPng(png); } catch { logo = null; } }

  const tiles = [
    ["Copertura", d.reach, d.reachd],
    ["Nuovi follower", d.fol],
    ["Interazioni", d.int],
    ["Visite al profilo", d.vis],
  ].filter(([, v]) => pulisci(v));

  const sintesi = pulisci(d.sintesi) ||
    (d.reach ? `${pulisci(d.reach)} persone raggiunte${d.reachd ? ` (${pulisci(d.reachd)})` : ""}${d.fol ? `, ${pulisci(d.fol)} nuovi follower` : ""}.` : "");

  const lettura = tiles.length
    ? `A ${periodo.toLowerCase()} il profilo di ${cliente} ha raggiunto ${pulisci(d.reach)} persone` +
      `${d.reachd ? ` (${pulisci(d.reachd)} rispetto al periodo precedente)` : ""}` +
      `${d.fol ? `, con ${pulisci(d.fol)} nuovi follower` : ""}` +
      `${d.int ? ` e ${pulisci(d.int)} interazioni` : ""}. ` +
      `Le visite al profilo${d.vis ? ` (${pulisci(d.vis)})` : ""} sono il segnale più vicino al negozio: ` +
      `sono le persone che, dopo aver visto un contenuto, hanno voluto sapere chi siete.`
    : "";

  const voci = pulisci(d.attivita).split("\n").map((v) => v.trim()).filter(Boolean);
  const passo = pulisci(d.passo);
  const nota = pulisci(d.nota);
  const firma = pulisci(d.firma);

  /**
   * Compone il documento. Con prova=true non disegna: misura soltanto, per
   * sapere se serve stringere. k è il fattore che comprime gli spazi (mai i
   * caratteri: il testo resta della stessa dimensione, cambia solo l'aria).
   */
  function componi(k, prova) {
    let pagina = prova ? null : pdf.addPage(A4);
    let y = A4[1] - MARGINE;
    let sforato = false;
    const sp = (v) => v * k;

    const spazio = (quanto) => {
      if (y - quanto < MARGINE + 34) {
        sforato = true;
        if (!prova) { pagina = pdf.addPage(A4); y = A4[1] - MARGINE; }
      }
    };
    const testo = (t, { font = normale, corpo = 11.5, colore = SCURO, x = MARGINE, larghezza = LARGHEZZA } = {}) => {
      const interlinea = sp(16.5);
      for (const riga of aCapo(t, font, corpo, larghezza)) {
        spazio(interlinea);
        if (!prova) pagina.drawText(riga, { x, y, size: corpo, font, color: colore });
        y -= interlinea;
      }
    };
    const titoletto = (t) => {
      spazio(sp(34));
      y -= sp(14);
      if (!prova) pagina.drawText(pulisci(t).toUpperCase(), { x: MARGINE, y, size: 9.5, font: neretto, color: GRIGIO });
      y -= sp(20);
    };

    // intestazione
    if (logo) {
      const h = 52;
      const w = Math.min((logo.width / logo.height) * h, 200);
      if (!prova) pagina.drawImage(logo, { x: MARGINE, y: y - h, width: w, height: h });
      y -= h + sp(20);
    }
    if (!prova) pagina.drawText("REPORT ANDAMENTO SOCIAL", { x: MARGINE, y, size: 9.5, font: neretto, color: GRIGIO });
    y -= sp(30);
    if (!prova) pagina.drawText(cliente, { x: MARGINE, y, size: 26, font: neretto, color: SCURO });
    y -= sp(20);
    if (!prova) pagina.drawText(periodo, { x: MARGINE, y, size: 13, font: normale, color: GRIGIO });
    y -= sp(20);
    if (!prova) pagina.drawRectangle({ x: MARGINE, y, width: LARGHEZZA, height: 3, color: ARANCIO });
    y -= sp(34);

    if (sintesi) { testo(sintesi, { font: neretto, corpo: 14 }); y -= sp(14); }

    if (tiles.length) {
      const hT = sp(84);
      spazio(hT + sp(10));
      const wT = (LARGHEZZA - (tiles.length - 1) * 12) / tiles.length;
      if (!prova)
        tiles.forEach(([et, val, delta], i) => {
          const x = MARGINE + i * (wT + 12);
          pagina.drawRectangle({ x, y: y - hT, width: wT, height: hT, color: CHIARO, borderColor: BORDO, borderWidth: 1 });
          pagina.drawText(pulisci(et), { x: x + 12, y: y - sp(22), size: 8.5, font: neretto, color: GRIGIO });
          pagina.drawText(pulisci(val), { x: x + 12, y: y - hT + sp(34), size: 19, font: neretto, color: SCURO });
          if (delta) pagina.drawText(pulisci(delta), { x: x + 12, y: y - hT + sp(16), size: 9, font: neretto, color: VERDE });
        });
      y -= hT + sp(12);
    }

    if (voci.length) {
      titoletto("Cosa abbiamo fatto");
      for (const voce of voci) {
        const righe = aCapo(voce, normale, 11, LARGHEZZA - 22);
        const interlinea = sp(16);
        spazio(righe.length * interlinea + sp(4));
        if (!prova) pagina.drawCircle({ x: MARGINE + 4, y: y + 4, size: 2.6, color: ARANCIO });
        for (const riga of righe) {
          if (!prova) pagina.drawText(riga, { x: MARGINE + 18, y, size: 11, font: normale, color: SCURO });
          y -= interlinea;
        }
        y -= sp(4);
      }
    }

    if (pulisci(d.top)) {
      titoletto("Il contenuto che ha funzionato meglio");
      testo(d.top);
    }

    if (lettura) {
      titoletto("Come leggiamo questi numeri");
      testo(lettura);
    }

    if (passo) {
      titoletto("Cosa proponiamo adesso");
      const righe = aCapo(passo, normale, 11, LARGHEZZA - 32);
      const interlinea = sp(16);
      const h = righe.length * interlinea + sp(20);
      spazio(h + sp(8));
      if (!prova) {
        pagina.drawRectangle({ x: MARGINE, y: y - h + sp(20), width: LARGHEZZA, height: h, color: CHIARO });
        pagina.drawRectangle({ x: MARGINE, y: y - h + sp(20), width: 4, height: h, color: ARANCIO });
        let yy = y - sp(4);
        for (const riga of righe) { pagina.drawText(riga, { x: MARGINE + 18, y: yy, size: 11, font: normale, color: SCURO }); yy -= interlinea; }
      }
      y -= h + sp(6);
    }

    if (nota) {
      titoletto("Una nota per te");
      testo(nota, { font: corsivo });
      if (firma) { y -= sp(4); testo(firma, { font: neretto, corpo: 10.5, colore: GRIGIO }); }
    }

    return { sforato, finale: y };
  }

  // Prima si misura. Se sfora di poco, si stringe l'aria quanto basta per
  // stare in una pagina: meglio un foglio pieno che due mezzi vuoti.
  const misura = componi(1, true);
  let k = 1;
  if (misura.sforato) {
    const usato = A4[1] - MARGINE - misura.finale;          // altezza richiesta
    const disponibile = A4[1] - MARGINE * 2 - 34;
    const serve = disponibile / usato;
    if (serve >= 0.74) k = Math.max(serve * 0.985, 0.74);   // un filo di margine
  }
  componi(k, false);

  // piede su tutte le pagine
  const oggi = new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  pdf.getPages().forEach((p, i, tutte) => {
    p.drawRectangle({ x: MARGINE, y: 62, width: LARGHEZZA, height: 1, color: BORDO });
    p.drawText("Realizzato da MiglioriAmo - Agenzia di marketing con l'AI - miglioriamo.com", {
      x: MARGINE, y: 46, size: 8.5, font: normale, color: GRIGIO,
    });
    const destra = pulisci(`${oggi}${tutte.length > 1 ? `  -  pagina ${i + 1} di ${tutte.length}` : ""}`);
    p.drawText(destra, {
      x: A4[0] - MARGINE - normale.widthOfTextAtSize(destra, 8.5), y: 46, size: 8.5, font: normale, color: GRIGIO,
    });
  });

  const bytes = await pdf.save();
  const nomeFile = `Report ${cliente} ${periodo}`.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim() + ".pdf";

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(nomeFile)}`,
      "Cache-Control": "no-store",
    },
  });
}
