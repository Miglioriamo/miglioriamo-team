// Il nome di un file può essere informazione ("Banana split con panna.jpg") o
// rumore ("IMG_4471.HEIC"). Qui si separano i due casi, perché dare in pasto
// un codice di macchina fotografica al generatore non aiuta: lo confonde.

// Schemi che NON dicono niente: nomi di camera, telefono, screenshot, export.
const RUMORE = [
  // anche con più gruppi di cifre: "PXL 20260812 101500", "Screenshot 2026 09 01"
  /^(img|dsc|dscn|dscf|pxl|p|gopr|mvimg|vid|mov|movie|photo|foto|image|immagine|screenshot|schermata)([\s_.-]*\d+)+$/i,
  /^whatsapp (image|video)/i,
  /^(signal|telegram)[ _-]/i,
  /^\d{4}[-_]?\d{2}[-_]?\d{2}([ _-]?\d{2}[.:_-]?\d{2}([.:_-]?\d{2})?)?$/, // date e orari
  /^\d{6,}$/,                        // solo cifre
  /^[a-f0-9]{8,}$/i,                 // codici esadecimali
  /^(untitled|senza titolo|nuovo|copia|copy|final|finale|def|definitivo)\d*$/i,
  /^(export|render|output|schermata del)\b/i,
];

/** Toglie estensione, separatori e numerazioni di coda. */
export function ripulisci(nome) {
  return String(nome || "")
    .replace(/\.[a-z0-9]{1,5}$/i, "")      // estensione
    .replace(/[_]+/g, " ")
    .replace(/\s*\((\d+)\)\s*$/, "")       // "nome (1)"
    .replace(/[-\s]*\d{1,3}$/, (m) => (/[a-zA-Z]/.test(m) ? m : ""))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Il nome dice qualcosa? Ritorna il nome ripulito, oppure null.
 * Serve almeno una parola vera di 3+ lettere e nessuno schema da rumore.
 */
export function nomeUtile(nome) {
  const pulito = ripulisci(nome);
  if (!pulito) return null;
  if (RUMORE.some((re) => re.test(pulito))) return null;
  const parole = pulito.split(/[\s.-]+/).filter((p) => /[a-zà-ÿ]{3,}/i.test(p));
  if (!parole.length) return null;
  // "IMG 4471 copia" → resta solo "copia": troppo poco per fidarsi.
  const utili = parole.filter((p) => !/^(copia|copy|def|finale|final|nuovo|ok|buona)$/i.test(p));
  return utili.length ? pulito : null;
}

/** Come sopra per il nome della cartella, che spesso vale più del file. */
export function cartellaUtile(percorso) {
  const nome = String(percorso || "").split("/").filter(Boolean).pop() || "";
  // "Reel 4", "Carosello 2": il numero non aggiunge niente al significato
  const senzaNumero = nome.trim().replace(/[\s_-]*\d+$/, "").trim();
  if (/^(foto|video|contenuti|materiale|shooting|social|instagram|post|reel|caroselli?|scatti)$/i.test(senzaNumero))
    return null; // vera ma non dice cosa c'è dentro
  return nomeUtile(nome);
}

// I project manager scrivono il brief DENTRO il nome del file o della cartella:
//   "Pubblicato.VIDEO SALDI UOMO Nel copy scrivere morbido e comodo lino…"
//   "carosello saldi ragazze. Nel copy scrivere abiti MDM… offertissima €29"
//   "Pubb.carosello donna (Nel copy scrivere in ordine i brand e taggare…)"
// Non è contesto: sono ISTRUZIONI, e vanno seguite come tali.

const ISTRUZIONE = /(?:nel|per il|per|nella)\s+copy[\s,:]*(?:scrivere|scriviamo|mettere|scriv\w*)?\s*[:-]?\s*(.+)$/is;
const STATO = /^\s*(pubblicat[oi]|pubb|da pubblicare|pubblicare)\b[.\s:-]*/i;

/** Il contenuto è già stato pubblicato? Lo dicono loro, nel nome. */
export function giaPubblicato(nome) {
  return /^\s*(pubblicat[oi]|pubb)\b/i.test(String(nome || ""));
}

/**
 * Estrae l'istruzione di copy dal nome, se c'è.
 * Ritorna { istruzione, resto } — `resto` è il nome ripulito da istruzione e
 * marcatori di stato, cioè quello che descrive il contenuto.
 */
export function istruzioneCopy(nome) {
  const senzaEstensione = String(nome || "").replace(/\.[a-z0-9]{1,5}$/i, "");
  const pulito = senzaEstensione.replace(STATO, "").trim();
  const m = pulito.match(ISTRUZIONE);
  if (!m) return { istruzione: null, resto: pulito || null };

  const istruzione = m[1]
    .replace(/^["'“(]+|["'”)]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const resto = pulito.slice(0, m.index).replace(/[.\s(-]+$/, "").trim();
  return { istruzione: istruzione || null, resto: resto || null };
}
