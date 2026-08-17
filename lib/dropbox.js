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
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.DROPBOX_REFRESH_TOKEN,
    }),
  });
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

/** Elenca i figli di una cartella. Ritorna null se mancano le credenziali. */
export async function listFolder(path) {
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
  const json = await res.json();
  return json.entries || [];
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
