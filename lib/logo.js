// Dove sta il logo di un cliente, e quale file scegliere.
// Le cartelle dei clienti sono disordinate: il logo può stare nella radice,
// dentro "contesto-generico" o in una sottocartella "brand".

import { listFolder } from "./dropbox.js";

export const LOGO_FILE = /\.(png|jpe?g|webp|svg|pdf|ai|eps)$/i;
export const LOGO_NAME = /logo|marchio|brand/i;

// A parità di nome si preferisce il formato più utile per una grafica:
// prima quelli che possono già avere il fondo trasparente, poi i vettoriali,
// per ultimi i JPEG (fondo bianco sicuro) e i formati che nessuno sa aprire.
const PREFERENZA = ["png", "svg", "webp", "pdf", "jpeg", "jpg", "ai", "eps"];

export const formatoDi = (nome) => (nome.split(".").pop() || "").toLowerCase();

/** Sceglie il file logo migliore in un elenco di elementi Dropbox. */
export function scegliLogo(entries) {
  const candidati = (entries || []).filter(
    (e) => e[".tag"] === "file" && LOGO_FILE.test(e.name) && LOGO_NAME.test(e.name)
  );
  if (!candidati.length) return null;
  candidati.sort((a, b) => {
    const pa = PREFERENZA.indexOf(formatoDi(a.name));
    const pb = PREFERENZA.indexOf(formatoDi(b.name));
    return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb);
  });
  return candidati[0];
}

/**
 * Cerca il logo nelle tre posizioni possibili. Chi ha già l'elenco della
 * cartella può passarlo, per non chiedere due volte la stessa cosa a Dropbox.
 */
export async function trovaLogoCliente(clientPath, opzioni = {}) {
  const radice = opzioni.radice || (await listFolder(clientPath)) || [];
  const cartelle = radice.filter((e) => e[".tag"] === "folder");

  const posti = [{ path: clientPath, entries: radice }];

  const brand = cartelle.find((f) => /^brand$/i.test(f.name));
  if (brand) posti.push({ path: `${clientPath}/${brand.name}`, entries: null });

  const gen = cartelle.find((f) => /contesto\s*-?\s*generico/i.test(f.name));
  if (gen) {
    const genPath = `${clientPath}/${gen.name}`;
    const genEntries = opzioni.generico || null;
    posti.push({ path: genPath, entries: genEntries });
    posti.push({ path: `${genPath}/brand`, entries: null, opzionale: true });
  }

  for (const posto of posti) {
    let entries = posto.entries;
    if (!entries) {
      try {
        entries = (await listFolder(posto.path)) || [];
      } catch {
        continue; // cartella "brand" inesistente: si passa oltre
      }
    }
    const file = scegliLogo(entries);
    if (file) {
      return { path: `${posto.path}/${file.name}`, nome: file.name, formato: formatoDi(file.name) };
    }
  }
  return null;
}
