import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { downloadBinary, getThumbnailBuffer } from "../../../lib/dropbox";
import { trovaLogoCliente } from "../../../lib/logo";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Colori del brand MiglioriAmo. Il PDF va al cliente e spesso viene stampato:
// fondo bianco, testo scuro, arancione solo per gli accenti.
const ARANCIO = rgb(0.957, 0.678, 0.082);
const SCURO = rgb(0.09, 0.09, 0.1);
const GRIGIO = rgb(0.45, 0.45, 0.48);
const CHIARO = rgb(0.965, 0.962, 0.955);
const VERDE = rgb(0.25, 0.63, 0.42);

const A4 = [595.28, 841.89];
const MARGINE = 52;

// Il font standard del PDF non conosce le emoji né certi apici tipografici.
function pulisci(s) {
  return String(s || "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
    .trim();
}

function aCapo(testo, font, corpo, larghezza) {
  const righe = [];
  let riga = "";
  for (const parola of pulisci(testo).split(/\s+/)) {
    const prova = riga ? riga + " " + parola : parola;
    if (font.widthOfTextAtSize(prova, corpo) > larghezza && riga) {
      righe.push(riga);
      riga = parola;
    } else riga = prova;
  }
  if (riga) righe.push(riga);
  return righe;
}

async function logoDelCliente(clientPath) {
  try {
    const logo = await trovaLogoCliente(clientPath);
    if (!logo) return null;
    // pdf-lib sa incorporare solo PNG e JPG: per tutto il resto (pdf, svg, webp)
    // si usa l'anteprima di Dropbox, che restituisce un PNG.
    return logo.formato === "png"
      ? await downloadBinary(logo.path)
      : await getThumbnailBuffer(logo.path, { formato: "png", size: "w1024h768" });
  } catch {
    return null;
  }
}

export async function POST(request) {
  let d = {};
  try { d = await request.json(); } catch {}
  const cliente = pulisci(d.cliente) || "Cliente";

  const pdf = await PDFDocument.create();
  const pagina = pdf.addPage(A4);
  const [L, A] = A4;
  const normale = await pdf.embedFont(StandardFonts.Helvetica);
  const neretto = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = A - MARGINE;

  // Logo del cliente in alto a sinistra (se ce l'ha)
  const base = process.env.DROPBOX_CONTEXTS_PATH || "/MIGLIORIAMO/CLAUDE/Contesto cliente";
  const png = d.cliente ? await logoDelCliente(`${base}/${d.cliente}`) : null;
  if (png) {
    try {
      const img = await pdf.embedPng(png);
      const h = 46;
      const w = (img.width / img.height) * h;
      pagina.drawImage(img, { x: MARGINE, y: y - h, width: Math.min(w, 190), height: h });
      y -= h + 22;
    } catch {
      y -= 6; // logo illeggibile: si prosegue senza
    }
  }

  pagina.drawText("REPORT ANDAMENTO SOCIAL", {
    x: MARGINE, y, size: 10, font: neretto, color: GRIGIO,
  });
  y -= 30;
  pagina.drawText(cliente, { x: MARGINE, y, size: 26, font: neretto, color: SCURO });
  y -= 20;
  pagina.drawText(pulisci(d.per), { x: MARGINE, y, size: 13, font: normale, color: GRIGIO });
  y -= 22;
  pagina.drawRectangle({ x: MARGINE, y, width: L - MARGINE * 2, height: 3, color: ARANCIO });
  y -= 40;

  // Quattro numeri in evidenza
  const tiles = [
    ["Copertura", d.reach, d.reachd],
    ["Nuovi follower", d.fol],
    ["Interazioni", d.int],
    ["Visite al profilo", d.vis],
  ];
  const larghezzaTile = (L - MARGINE * 2 - 3 * 12) / 4;
  const altezzaTile = 84;
  tiles.forEach(([etichetta, valore, delta], i) => {
    const x = MARGINE + i * (larghezzaTile + 12);
    pagina.drawRectangle({
      x, y: y - altezzaTile, width: larghezzaTile, height: altezzaTile,
      color: CHIARO, borderColor: rgb(0.89, 0.88, 0.86), borderWidth: 1,
    });
    pagina.drawText(pulisci(etichetta), { x: x + 12, y: y - 22, size: 8.5, font: neretto, color: GRIGIO });
    pagina.drawText(pulisci(valore) || "-", { x: x + 12, y: y - 50, size: 19, font: neretto, color: SCURO });
    if (delta)
      pagina.drawText(pulisci(delta), { x: x + 12, y: y - 68, size: 9, font: neretto, color: VERDE });
  });
  y -= altezzaTile + 40;

  // Commento
  pagina.drawText("COSA È SUCCESSO", { x: MARGINE, y, size: 10, font: neretto, color: GRIGIO });
  y -= 22;
  const testo =
    `A ${pulisci(d.per).toLowerCase()} il profilo di ${cliente} ha raggiunto ${pulisci(d.reach)} persone ` +
    `(${pulisci(d.reachd)} rispetto al periodo precedente), con ${pulisci(d.fol)} nuovi follower, ` +
    `${pulisci(d.int)} interazioni e ${pulisci(d.vis)} visite al profilo. ` +
    `Il contenuto che ha funzionato meglio è stato: ${pulisci(d.top)}.`;
  for (const riga of aCapo(testo, normale, 11.5, L - MARGINE * 2)) {
    pagina.drawText(riga, { x: MARGINE, y, size: 11.5, font: normale, color: SCURO });
    y -= 17;
  }
  y -= 16;

  // Prossimo passo, dentro un riquadro
  const passo =
    pulisci(d.passo) ||
    "Prossimo passo: proporre altri contenuti sul filone che ha generato interazioni e sostenere la copertura con una campagna nei periodi forti del cliente.";
  const righePasso = aCapo(passo, normale, 11, L - MARGINE * 2 - 28);
  const hBox = righePasso.length * 16 + 26;
  pagina.drawRectangle({ x: MARGINE, y: y - hBox + 12, width: L - MARGINE * 2, height: hBox, color: CHIARO });
  pagina.drawRectangle({ x: MARGINE, y: y - hBox + 12, width: 4, height: hBox, color: ARANCIO });
  let yy = y - 4;
  for (const riga of righePasso) {
    pagina.drawText(riga, { x: MARGINE + 16, y: yy, size: 11, font: normale, color: SCURO });
    yy -= 16;
  }

  // Piede
  pagina.drawText("Realizzato da MiglioriAmo - Agenzia di marketing con l'AI - miglioriamo.com", {
    x: MARGINE, y: 42, size: 8.5, font: normale, color: GRIGIO,
  });

  const bytes = await pdf.save();
  // Si tolgono solo i caratteri che i sistemi non accettano nei nomi file:
  // gli accenti vanno benissimo e nei nomi dei clienti ci sono.
  const nomeFile = `Report ${cliente} ${pulisci(d.per)}`.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim() + ".pdf";

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(nomeFile)}`,
      "Cache-Control": "no-store",
    },
  });
}
