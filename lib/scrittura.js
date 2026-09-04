// Scrittura su Dropbox — l'unico punto dell'app da cui esce roba verso le
// cartelle dei clienti. Tutto passa di qui, così i paletti stanno nel codice e
// non nelle buone intenzioni di chi scriverà il prossimo modulo.
//
// Le tre regole, in ordine di importanza:
//   1. si scrive SOLO dentro la cartella del cliente, in `output/` (i risultati)
//      o in `contesto-generico/` (il fascicolo). Mai altrove.
//   2. in `output/` non si sovrascrive MAI: se il nome esiste, Dropbox ne mette
//      uno accanto rinominato.
//   3. aggiornando il fascicolo, la versione precedente viene messa da parte
//      prima di essere sostituita.

import { uploadFile, copyFile, getMetadata } from "./dropbox.js";

const TIPI = new Set(["copy", "grafica", "report", "shooting", "promo"]);
const FILE_FASCICOLO = new Set(["dossier.md", "dati-operativi.md", "cta.md", "paletti.md"]);

export const base = () =>
  process.env.DROPBOX_CONTEXTS_PATH || "/MIGLIORIAMO/CLAUDE/Contesti per clienti";

/**
 * Interruttore generale. Senza la variabile la scrittura è spenta: è la
 * seconda serratura dopo il token in sola lettura della produzione.
 */
export function scritturaAttiva() {
  return process.env.SCRITTURA_DROPBOX === "1";
}

/** Nome di file innocuo: niente percorsi, niente caratteri che Dropbox rifiuta. */
export function nomePulito(nome) {
  const n = String(nome || "")
    .replace(/[\\/]/g, " ")        // niente cambi di cartella
    .replace(/[:*?"<>|]/g, " ")    // caratteri vietati
    .replace(/\.{2,}/g, ".")       // niente ".."
    .replace(/\s+/g, " ")
    .trim();
  if (!n || n === "." ) throw new Error("nome del file non valido");
  return n.slice(0, 120);
}

/** Nome cliente accettabile: dev'essere una cartella, non un percorso. */
export function clientePulito(cliente) {
  const c = String(cliente || "").trim();
  if (!c) throw new Error("manca il cliente");
  if (/[\\/]/.test(c) || c.includes("..")) throw new Error(`nome cliente non valido: ${c}`);
  return c;
}

export const meseCorrente = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Dove finisce un output. Funzione pura: si può collaudare senza rete. */
export function percorsoOutput({ cliente, tipo, nomeFile, mese }) {
  const c = clientePulito(cliente);
  if (!TIPI.has(tipo)) throw new Error(`tipo non ammesso: ${tipo}`);
  const m = /^\d{4}-\d{2}$/.test(mese || "") ? mese : meseCorrente();
  return `${base()}/${c}/output/${tipo}/${m}/${nomePulito(nomeFile)}`;
}

/** Dove sta un file del fascicolo. Funzione pura. */
export function percorsoFascicolo({ cliente, file }) {
  const c = clientePulito(cliente);
  const f = nomePulito(file);
  if (!FILE_FASCICOLO.has(f)) throw new Error(`file di fascicolo non ammesso: ${f}`);
  return `${base()}/${c}/contesto-generico/${f}`;
}

/**
 * Ultimo controllo prima di toccare Dropbox: il percorso deve stare dentro la
 * cartella di QUEL cliente e in una delle due zone consentite. Se un domani
 * qualcuno costruisse un percorso a mano, si ferma qui.
 */
function dentroIConfini(percorso, cliente) {
  const radice = `${base()}/${cliente}/`;
  if (!percorso.startsWith(radice)) return false;
  const resto = percorso.slice(radice.length);
  return resto.startsWith("output/") || resto.startsWith("contesto-generico/");
}

/** Il cliente deve esistere davvero: un nome sbagliato creerebbe un cliente fantasma. */
async function esiste(cartella) {
  const meta = await getMetadata(cartella);
  return Boolean(meta && (meta[".tag"] === "folder" || meta.tag === "folder" || meta.name));
}

/**
 * Salva un risultato nella cartella del cliente.
 * Ritorna { percorso, nome } oppure lancia un errore parlante.
 */
export async function salvaOutput({ cliente, tipo, nomeFile, contenuto, mese }) {
  if (!scritturaAttiva()) throw new Error("scrittura su Dropbox disattivata su questo ambiente");
  const c = clientePulito(cliente);
  const percorso = percorsoOutput({ cliente: c, tipo, nomeFile, mese });
  if (!dentroIConfini(percorso, c)) throw new Error("percorso fuori dai confini consentiti");

  if (!(await esiste(`${base()}/${c}`)))
    throw new Error(`il cliente "${c}" non esiste nella cartella dei contesti`);

  const out = await uploadFile(percorso, contenuto, { modo: "add" }); // mai sovrascrivere
  if (!out) throw new Error("Dropbox non configurato");
  return { percorso: out.path, nome: out.nome, byte: out.byte };
}

/**
 * Aggiorna un file del fascicolo conservando quello che c'era: la versione
 * precedente finisce in `contesto-generico/_versioni/` con data e ora.
 */
export async function aggiornaFascicolo({ cliente, file, contenuto }) {
  if (!scritturaAttiva()) throw new Error("scrittura su Dropbox disattivata su questo ambiente");
  const c = clientePulito(cliente);
  const percorso = percorsoFascicolo({ cliente: c, file });
  if (!dentroIConfini(percorso, c)) throw new Error("percorso fuori dai confini consentiti");

  let versionePrecedente = null;
  if (await esiste(percorso)) {
    const t = new Date().toISOString().slice(0, 16).replace("T", " ").replace(":", "");
    const f = nomePulito(file);
    const stem = f.replace(/\.md$/i, "");
    versionePrecedente = await copyFile(
      percorso,
      `${base()}/${c}/contesto-generico/_versioni/${stem} ${t}.md`
    );
  }

  const out = await uploadFile(percorso, contenuto, { modo: "overwrite" });
  if (!out) throw new Error("Dropbox non configurato");
  return { percorso: out.path, versionePrecedente };
}
