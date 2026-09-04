// Legge tutto quello che sappiamo di un cliente, in un colpo solo.
// Lo usano il generatore dei copioni e (in seguito) il Copy: così i moduli
// pescano dalle stesse fonti e nessuno si inventa la propria strada.

import { listFolder, downloadText } from "./dropbox.js";

const base = () =>
  process.env.DROPBOX_CONTEXTS_PATH || "/MIGLIORIAMO/CLAUDE/Contesti per clienti";

// I copioni già fatti stanno in una cartella a parte, non nei fascicoli.
const ARCHIVIO_SHOOTING = process.env.DROPBOX_SHOOTING_PATH || "/MIGLIORIAMO/SHOOTING";

const senzaAccenti = (t) =>
  String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

async function testo(percorso) {
  try {
    return (await downloadText(percorso)) || null;
  } catch {
    return null;
  }
}

/**
 * Tutto il sapere disponibile su un cliente.
 * Nessun campo è obbligatorio: quello che manca resta null, e chi genera i
 * testi deve restare sul generico invece di inventarselo.
 */
export async function leggiFascicolo(cliente) {
  const cartella = `${base()}/${cliente}`;
  const figli = (await listFolder(cartella)) || [];

  const gen = figli.find(
    (e) => e[".tag"] === "folder" && /contesto\s*-?\s*generico/i.test(e.name)
  );

  let dossier = null, dati = null, cta = null, paletti = null;
  if (gen) {
    const dentro = (await listFolder(`${cartella}/${gen.name}`)) || [];
    const trova = (re) => dentro.find((e) => e[".tag"] === "file" && re.test(e.name));
    const p = (f) => `${cartella}/${gen.name}/${f.name}`;

    const fDati = trova(/^dati[-\s]?operativi\.md$/i);
    const fCta = trova(/^cta\.md$/i);
    const fPaletti = trova(/^paletti\.md$/i);
    // Il dossier ha nomi diversi da cliente a cliente: si prende il .md che
    // resta, escludendo quelli con un ruolo preciso.
    const fDossier =
      trova(/^dossier\.md$/i) ||
      dentro.find(
        (e) =>
          e[".tag"] === "file" &&
          /\.md$/i.test(e.name) &&
          ![fDati, fCta, fPaletti].some((x) => x && x.name === e.name)
      );

    if (fDossier) dossier = await testo(p(fDossier));
    if (fDati) dati = await testo(p(fDati));
    if (fCta) cta = await testo(p(fCta));
    if (fPaletti) paletti = await testo(p(fPaletti));
  }

  // Memoria degli shooting passati, se qualcuno l'ha già scritta.
  let memoria = null;
  const cartMem = figli.find((e) => e[".tag"] === "folder" && /^memoria$/i.test(e.name));
  if (cartMem) memoria = await testo(`${cartella}/memoria/shooting.md`);

  return { dossier, dati, cta, paletti, memoria };
}

/** I copioni già consegnati a questo cliente, cercati per nome del file. */
export async function copioniPrecedenti(cliente) {
  try {
    const file = (await listFolder(ARCHIVIO_SHOOTING)) || [];
    const c = senzaAccenti(cliente).replace(/[^a-z0-9]+/g, " ").trim();
    const parole = c.split(" ").filter((p) => p.length > 2);
    if (!parole.length) return [];
    return file
      .filter((e) => e[".tag"] === "file")
      .map((e) => e.name)
      .filter((n) => {
        const t = senzaAccenti(n);
        return parole.every((p) => t.includes(p)) || t.includes(c);
      });
  } catch {
    return [];
  }
}
