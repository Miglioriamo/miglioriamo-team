import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { downloadBinary, getThumbnailBuffer } from "../../../lib/dropbox";
import { trovaLogoCliente } from "../../../lib/logo";
import { salvaOutput, scritturaAttiva } from "../../../lib/scrittura";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Stesso stile del report: il cliente lo stampa e lo porta sul set.
const ARANCIO = rgb(0.957, 0.678, 0.082);
const SCURO = rgb(0.09, 0.09, 0.1);
const GRIGIO = rgb(0.45, 0.45, 0.48);
const CHIARO = rgb(0.965, 0.962, 0.955);
const BORDO = rgb(0.89, 0.88, 0.86);

const A4 = [595.28, 841.89];
const MARGINE = 52;
const LARGHEZZA = A4[0] - MARGINE * 2;

const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno",
              "luglio","agosto","settembre","ottobre","novembre","dicembre"];

function pulisci(s) {
  return String(s || "")
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "")
    .trim();
}

function aCapo(testo, font, corpo, larghezza) {
  const righe = [];
  for (const par of pulisci(testo).split("\n")) {
    if (!par.trim()) { righe.push(""); continue; }
    let r = "";
    for (const p of par.trim().split(/\s+/)) {
      const prova = r ? r + " " + p : p;
      if (font.widthOfTextAtSize(prova, corpo) > larghezza && r) { righe.push(r); r = p; }
      else r = prova;
    }
    if (r) righe.push(r);
  }
  return righe;
}

function meseDaPeriodo(per) {
  const t = String(per || "").toLowerCase();
  const anno = (t.match(/(20\d\d)/) || [])[1];
  const i = MESI.findIndex((m) => t.includes(m));
  return anno && i >= 0 ? `${anno}-${String(i + 1).padStart(2, "0")}` : null;
}

async function logoPng(clientPath) {
  try {
    const logo = await trovaLogoCliente(clientPath);
    if (!logo) return null;
    return logo.formato === "png"
      ? await downloadBinary(logo.path)
      : await getThumbnailBuffer(logo.path, { formato: "png", size: "w1024h768" });
  } catch { return null; }
}

export async function POST(request) {
  let d = {};
  try { d = await request.json(); } catch {}
  const cliente = pulisci(d.cliente) || "Cliente";
  const periodo = pulisci(d.mese);
  const copioni = Array.isArray(d.copioni) ? d.copioni : [];
  if (!copioni.length) return Response.json({ errore: "nessun copione da mettere nel PDF" }, { status: 400 });

  const pdf = await PDFDocument.create();
  const N = await pdf.embedFont(StandardFonts.Helvetica);
  const B = await pdf.embedFont(StandardFonts.HelveticaBold);
  const I = await pdf.embedFont(StandardFonts.HelveticaOblique);

  let pagina = pdf.addPage(A4);
  let y = A4[1] - MARGINE;
  const spazio = (h) => { if (y - h < MARGINE + 40) { pagina = pdf.addPage(A4); y = A4[1] - MARGINE; } };
  const scrivi = (t, { font = N, corpo = 11, colore = SCURO, x = MARGINE, larghezza = LARGHEZZA, interlinea = 15.5 } = {}) => {
    for (const r of aCapo(t, font, corpo, larghezza)) {
      spazio(interlinea);
      if (r) pagina.drawText(r, { x, y, size: corpo, font, color: colore });
      y -= interlinea;
    }
  };
  // `seguito` = quanto spazio serve DOPO l'etichetta: senza, il titoletto
  // resta orfano in fondo alla pagina e il testo va a capo pagina da solo.
  const etichetta = (t, seguito = 0) => {
    spazio(26 + seguito);
    pagina.drawText(pulisci(t).toUpperCase(), { x: MARGINE, y, size: 8.5, font: B, color: GRIGIO });
    y -= 15;
  };

  // intestazione
  const base = process.env.DROPBOX_CONTEXTS_PATH || "/MIGLIORIAMO/CLAUDE/Contesti per clienti";
  const png = d.cliente ? await logoPng(`${base}/${d.cliente}`) : null;
  if (png) {
    try {
      const img = await pdf.embedPng(png);
      const h = 48, w = Math.min((img.width / img.height) * h, 190);
      pagina.drawImage(img, { x: MARGINE, y: y - h, width: w, height: h });
      y -= h + 18;
    } catch { y -= 4; }
  }
  pagina.drawText("COPIONI PER LO SHOOTING", { x: MARGINE, y, size: 9.5, font: B, color: GRIGIO });
  y -= 28;
  pagina.drawText(cliente, { x: MARGINE, y, size: 25, font: B, color: SCURO });
  y -= 19;
  if (periodo) { pagina.drawText(periodo, { x: MARGINE, y, size: 12.5, font: N, color: GRIGIO }); y -= 18; }
  pagina.drawRectangle({ x: MARGINE, y, width: LARGHEZZA, height: 3, color: ARANCIO });
  y -= 26;
  if (pulisci(d.obiettivo)) {
    scrivi(`Obiettivo: ${pulisci(d.obiettivo)}`, { font: B, corpo: 11.5 });
    y -= 8;
  }

  // i copioni
  copioni.forEach((c, i) => {
    spazio(120);
    y -= 10;
    pagina.drawRectangle({ x: MARGINE, y: y - 2, width: 22, height: 20, color: ARANCIO });
    pagina.drawText(String(i + 1), { x: MARGINE + 8, y: y + 3, size: 11, font: B, color: rgb(0.1, 0.07, 0) });
    // il nome del format sta in fondo alla riga del titolo, non sotto
    const nomeFormat = pulisci(c.formatNome);
    const wFormat = nomeFormat ? B.widthOfTextAtSize(nomeFormat, 8.5) + 14 : 0;
    const titolo = aCapo(c.titolo, B, 14, LARGHEZZA - 34 - wFormat);
    titolo.forEach((r, k) => {
      pagina.drawText(r, { x: MARGINE + 32, y: y + 3 - k * 17, size: 14, font: B, color: SCURO });
    });
    if (nomeFormat)
      pagina.drawText(nomeFormat, {
        x: A4[0] - MARGINE - B.widthOfTextAtSize(nomeFormat, 8.5),
        y: y + 6, size: 8.5, font: B, color: ARANCIO,
      });
    y -= 10 + titolo.length * 17;

    const alto = (t, font, corpo, larghezza = LARGHEZZA, interlinea = 15.5) =>
      aCapo(t, font, corpo, larghezza).length * interlinea;

    if (pulisci(c.gancio)) {
      etichetta("Gancio", alto(c.gancio, B, 11.5));
      scrivi(c.gancio, { font: B, corpo: 11.5 }); y -= 6;
    }
    if (pulisci(c.script)) {
      // per lo script basta garantire le prime righe: se è lungo può proseguire
      etichetta("Script", Math.min(alto(c.script, N, 11), 62));
      scrivi(c.script, { corpo: 11 }); y -= 6;
    }
    if (pulisci(c.riprese)) {
      etichetta("Riprese", alto(c.riprese, I, 10.5));
      scrivi(c.riprese, { font: I, corpo: 10.5, colore: GRIGIO }); y -= 6;
    }
    if (pulisci(c.cta)) {
      const righe = aCapo(c.cta, N, 11, LARGHEZZA - 32);
      const h = righe.length * 15.5 + 18;
      etichetta("Call to action", h + 8);
      const cima = y + 6;
      pagina.drawRectangle({ x: MARGINE, y: cima - h, width: LARGHEZZA, height: h, color: CHIARO });
      pagina.drawRectangle({ x: MARGINE, y: cima - h, width: 4, height: h, color: ARANCIO });
      let yy = cima - 16;
      righe.forEach((r) => { pagina.drawText(r, { x: MARGINE + 18, y: yy, size: 11, font: N, color: SCURO }); yy -= 15.5; });
      y = cima - h - 10;
    }
    y -= 10;
  });

  // piede
  const oggi = new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  pdf.getPages().forEach((p, i, tutte) => {
    p.drawRectangle({ x: MARGINE, y: 62, width: LARGHEZZA, height: 1, color: BORDO });
    p.drawText("MiglioriAmo - copioni pronti da girare", { x: MARGINE, y: 46, size: 8.5, font: N, color: GRIGIO });
    const t = pulisci(`${oggi}  -  ${i + 1} di ${tutte.length}`);
    p.drawText(t, { x: A4[0] - MARGINE - N.widthOfTextAtSize(t, 8.5), y: 46, size: 8.5, font: N, color: GRIGIO });
  });

  const bytes = await pdf.save();
  const nomeFile = `Copioni ${cliente} ${periodo}`.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim() + ".pdf";

  if (d.archivia) {
    if (!scritturaAttiva())
      return Response.json({ ok: false, motivo: "L'archiviazione non è attiva su questo indirizzo." }, { status: 503 });
    try {
      const salvato = await salvaOutput({
        cliente: d.cliente, tipo: "shooting", nomeFile,
        contenuto: Buffer.from(bytes), mese: meseDaPeriodo(periodo),
      });
      return Response.json({ ok: true, percorso: salvato.percorso, nome: salvato.nome });
    } catch (e) {
      return Response.json({ ok: false, motivo: String(e && e.message ? e.message : e) }, { status: 502 });
    }
  }

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(nomeFile)}`,
      "Cache-Control": "no-store",
    },
  });
}
