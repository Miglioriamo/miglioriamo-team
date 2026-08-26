// Helper Dropbox (solo lato server). Legge le cartelle/contesti clienti.
// Auth: con le credenziali dell'app si usa SEMPRE il refresh token (non scade).
// L'access token statico resta solo come ripiego se l'app non è configurata.
// Se non ci sono credenziali, le funzioni ritornano null e l'app usa i dati demo.

const TOKEN_URL = "https://api.dropboxapi.com/oauth2/token";
const RPC = "https://api.dropboxapi.com/2";
const CONTENT = "https://content.dropboxapi.com/2";

let cachedToken = null;
let cachedExp = 0;

function canRefresh() {
  const { DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY, DROPBOX_APP_SECRET } = process.env;
  return Boolean(DROPBOX_REFRESH_TOKEN && DROPBOX_APP_KEY && DROPBOX_APP_SECRET);
}

// force = butta via il token in cache e chiedine uno nuovo (usato dopo un 401).
async function getAccessToken(force = false) {
  if (!canRefresh()) return process.env.DROPBOX_ACCESS_TOKEN || null;

  if (force) {
    cachedToken = null;
    cachedExp = 0;
  }
  if (cachedToken && Date.now() < cachedExp) return cachedToken;

  const auth = Buffer.from(
    `${process.env.DROPBOX_APP_KEY}:${process.env.DROPBOX_APP_SECRET}`
  ).toString("base64");
  const form = () =>
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.DROPBOX_REFRESH_TOKEN,
    });

  let res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: form(),
  });

  // Ripiego: i token nati da un'autorizzazione PKCE si rinnovano con il solo
  // app key nel corpo, senza app secret. Così l'app regge entrambi gli stili.
  if (!res.ok) {
    const body = form();
    body.set("client_id", process.env.DROPBOX_APP_KEY);
    res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  }

  if (!res.ok) throw new Error(`Dropbox token error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  cachedToken = json.access_token;
  // Margine di 5 minuti; se Dropbox non dichiara la durata teniamo il token 1 ora.
  const life = Number(json.expires_in) > 0 ? Number(json.expires_in) : 3600;
  cachedExp = Date.now() + Math.max(life - 300, 60) * 1000;
  return cachedToken;
}

// Per cartelle in uno spazio team serve indicare il namespace root.
function pathRootHeader() {
  if (process.env.DROPBOX_NAMESPACE_ID) {
    return {
      "Dropbox-API-Path-Root": JSON.stringify({
        ".tag": "namespace_id",
        namespace_id: process.env.DROPBOX_NAMESPACE_ID,
      }),
    };
  }
  return {};
}

function send(url, init, token) {
  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
      ...pathRootHeader(),
    },
  });
}

function tokenIsDead(status, body) {
  return status === 401 && /expired_access_token|invalid_access_token/.test(body || "");
}

/**
 * Chiamata a Dropbox con auto-riparazione: se il token risulta scaduto/revocato
 * ne chiede uno nuovo e riprova UNA volta. Ritorna null se mancano le credenziali.
 */
async function call(url, init, label) {
  let token = await getAccessToken();
  if (!token) return null;

  let res = await send(url, init, token);
  if (res.ok) return res;

  const body = await res.text();
  if (tokenIsDead(res.status, body) && canRefresh()) {
    token = await getAccessToken(true);
    res = await send(url, init, token);
    if (res.ok) return res;
    throw new Error(`Dropbox ${label} ${res.status}: ${await res.text()}`);
  }
  throw new Error(`Dropbox ${label} ${res.status}: ${body}`);
}

/**
 * Elenca i figli di una cartella. Ritorna null se mancano le credenziali.
 * Dropbox risponde a pagine: senza seguire il cursore, su una cartella di
 * shooting con centinaia di scatti se ne vedrebbe solo una parte.
 */
export async function listFolder(path, maxEntries = 2000) {
  const res = await call(
    `${RPC}/files/list_folder`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, recursive: false }),
    },
    "list_folder"
  );
  if (!res) return null;

  let json = await res.json();
  const entries = json.entries || [];
  while (json.has_more && entries.length < maxEntries) {
    const next = await call(
      `${RPC}/files/list_folder/continue`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cursor: json.cursor }),
      },
      "list_folder/continue"
    );
    if (!next) break;
    json = await next.json();
    entries.push(...(json.entries || []));
  }
  return entries;
}

/** Scarica un file di testo (es. dossier.md). Ritorna null se mancano le credenziali. */
export async function downloadText(path) {
  const res = await call(
    `${CONTENT}/files/download`,
    {
      method: "POST",
      headers: { "Dropbox-API-Arg": JSON.stringify({ path }) },
    },
    "download"
  );
  if (!res) return null;
  return await res.text();
}

/** Link temporaneo (valido ~4h) a un file — utile per passare un'immagine a Claude. */
export async function getTemporaryLink(path) {
  const res = await call(
    `${RPC}/files/get_temporary_link`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    },
    "get_temporary_link"
  );
  if (!res) return null;
  const json = await res.json();
  return json.link;
}

export function hasCredentials() {
  return Boolean(canRefresh() || process.env.DROPBOX_ACCESS_TOKEN);
}

/**
 * Diagnostica dell'autenticazione: chiede un token NUOVO e verifica l'identità
 * con una chiamata che dipende solo dal token (niente cartelle, niente
 * namespace). Serve a distinguere "token rifiutato" da "problema di percorso".
 * Non espone mai token, segreti o dati dell'account.
 */
export async function diagnose() {
  const out = { modo: authMode() };
  if (!hasCredentials()) return { ...out, ok: false, errore: "nessuna credenziale configurata" };

  try {
    const token = await getAccessToken(true); // forza il rinnovo: token appena nato
    out.tokenRilasciato = {
      ok: Boolean(token),
      tipo: token && token.startsWith("sl.") ? "short-lived (sl.)" : "altro",
      validoPerSecondi: Math.max(0, Math.round((cachedExp - Date.now()) / 1000)),
    };

    const res = await fetch(`${RPC}/users/get_current_account`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    out.identita = { ok: res.ok, status: res.status };
    if (!res.ok) out.identita.errore = (await res.text()).slice(0, 300);
    out.ok = res.ok;
  } catch (e) {
    out.ok = false;
    out.errore = String(e && e.message ? e.message : e);
  }
  return out;
}

/** Come è configurata l'auth (per la diagnostica, senza mai esporre i segreti). */
export function authMode() {
  if (canRefresh()) return "refresh_token";
  if (process.env.DROPBOX_ACCESS_TOKEN) return "access_token_statico";
  return "nessuna";
}

// ---------------------------------------------------------------------------
// Cosa incolla l'utente: può essere un PERCORSO (/CLIENTE/cartella) oppure il
// LINK condiviso della cartella (https://www.dropbox.com/scl/fo/...). Qui sotto
// normalizziamo l'uno e risolviamo l'altro nel percorso corrispondente.
// ---------------------------------------------------------------------------

const IS_LINK = /^https?:\/\//i;

/** Ripulisce l'input: virgolette, spazi, backslash, prefissi del Finder. */
export function cleanFolderInput(raw) {
  let s = String(raw || "").trim().replace(/^["'“«]+|["'”»]+$/g, "").trim();
  if (IS_LINK.test(s)) return s;
  s = s.replace(/\\/g, "/");
  // percorso copiato dal Finder / Esplora risorse: .../Dropbox (MiglioriAmo)/X/Y
  const local = s.match(/\/Dropbox[^/]*\/(.+)$/i);
  if (local) s = `/${local[1]}`;
  if (!s.startsWith("/")) s = `/${s}`;
  return s.replace(/\/+$/, "");
}

/** Metadati di un link condiviso (per risalire al percorso della cartella). */
export async function sharedLinkMetadata(url) {
  const res = await call(
    `${RPC}/sharing/get_shared_link_metadata`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    },
    "get_shared_link_metadata"
  );
  if (!res) return null;
  return await res.json();
}

/** Metadati di un percorso: serve a capire se punta a una cartella o a un file. */
export async function getMetadata(path) {
  const res = await call(
    `${RPC}/files/get_metadata`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    },
    "get_metadata"
  );
  if (!res) return null;
  return await res.json();
}

/**
 * Da quello che incolla l'utente a un bersaglio Dropbox.
 * Accetta quattro forme: percorso di cartella, percorso di file, link condiviso
 * di cartella, link condiviso di un singolo file (es. un video).
 * Ritorna { kind: "folder" | "file", path, name, size }.
 */
export async function resolveTarget(raw) {
  const input = cleanFolderInput(raw);

  if (!IS_LINK.test(input)) {
    let meta = null;
    try {
      meta = await getMetadata(input);
    } catch (e) {
      // Se non si riesce a interrogare il percorso lo si tratta come cartella:
      // il messaggio d'errore utile arriverà dall'elenco.
      if (!/path\/not_found/.test(String(e.message || e))) throw e;
      throw e;
    }
    if (!meta) return { kind: "folder", path: input };
    return {
      kind: meta[".tag"] === "file" ? "file" : "folder",
      path: meta.path_lower || input,
      name: meta.name,
      size: meta.size,
    };
  }

  if (!/(^|\/\/)([a-z0-9-]+\.)?dropbox\.com\//i.test(input))
    throw new Error("Questo non è un link di Dropbox. Incolla il link della cartella su Dropbox, oppure il percorso.");

  let meta;
  try {
    meta = await sharedLinkMetadata(input);
  } catch (e) {
    const t = String((e && e.message) || e);
    if (/shared_link_not_found/.test(t))
      throw new Error("Link non valido o scaduto: riapri Dropbox e copia di nuovo il link della cartella.");
    if (/shared_link_access_denied|invalid_url|unauthorized/.test(t))
      throw new Error("Link protetto o senza accesso: condividi la cartella con l'account Dropbox dell'app, oppure incolla il percorso.");
    if (/required scope|insufficient_scope|missing_scope/.test(t))
      throw new Error(
        "I link condivisi non sono ancora abilitati: manca il permesso “sharing.read” all'app Dropbox. " +
          "Nel frattempo incolla il PERCORSO della cartella (es. “/Angolo di Sara/082026 - NUOVI VIDEO”)."
      );
    throw e;
  }

  if (!meta) throw new Error("Dropbox non è configurato.");

  const path = meta.path_lower || meta.path_display || "";
  if (!path)
    throw new Error("Questo contenuto non è dentro il Dropbox dell'agenzia: incolla il percorso invece del link.");

  return {
    kind: meta[".tag"] === "file" ? "file" : "folder",
    path: path.replace(/\/+$/, ""),
    name: meta.name,
    size: meta.size,
  };
}

/** Traduce gli errori Dropbox in messaggi comprensibili per chi usa l'app. */
export function friendlyError(e) {
  const t = String((e && e.message) || e);
  if (/path\/not_found/.test(t))
    return "Cartella non trovata su Dropbox: controlla il percorso (deve iniziare con “/”) o incolla il link della cartella.";
  if (/path\/not_folder/.test(t)) return "Il percorso indicato è un file, non una cartella.";
  if (/malformed_path|unexpected error occurred/.test(t))
    return "Percorso non valido. Incolla il percorso della cartella (es. “/NORCIA IN TAVOLA/082026 - NUOVI VIDEO”) oppure il link Dropbox della cartella.";
  if (/required scope|insufficient_scope|missing_scope/.test(t))
    return "L'app Dropbox non ha i permessi necessari (files.metadata.read, files.content.read, sharing.read).";
  return t;
}

/**
 * Anteprima JPEG generata da Dropbox. Funziona su foto normali, RAW di macchina
 * fotografica (ARW, CR2, NEF…) e video (restituisce un fotogramma): è il modo per
 * far "vedere" a Claude anche i file che non saprebbe aprire, senza scaricarli.
 * Ritorna una stringa base64, oppure null se Dropbox non sa fare l'anteprima.
 */
export async function getThumbnailBase64(path, size = "w1024h768") {
  const arg = JSON.stringify({
    resource: { ".tag": "path", path },
    format: { ".tag": "jpeg" },
    size: { ".tag": size },
    mode: { ".tag": "strict" },
  });
  let res;
  try {
    res = await call(
      `${CONTENT}/files/get_thumbnail_v2`,
      { method: "POST", headers: { "Dropbox-API-Arg": arg } },
      "get_thumbnail"
    );
  } catch (e) {
    // Formato senza anteprima (o file corrotto): non è un motivo per fermare tutto.
    if (/unsupported_extension|unsupported_image|conversion_error/.test(String(e.message || e)))
      return null;
    throw e;
  }
  if (!res) return null;
  return Buffer.from(await res.arrayBuffer()).toString("base64");
}

