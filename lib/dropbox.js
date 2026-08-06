// Helper Dropbox (solo lato server). Legge le cartelle/contesti clienti.
// Auth: usa il refresh token (consigliato, non scade) oppure un access token statico.
// Se non ci sono credenziali, le funzioni ritornano null e l'app usa i dati demo.

const TOKEN_URL = "https://api.dropboxapi.com/oauth2/token";
const RPC = "https://api.dropboxapi.com/2";
const CONTENT = "https://content.dropboxapi.com/2";

let cachedToken = null;
let cachedExp = 0;

async function getAccessToken() {
  // Access token statico (semplice ma a scadenza)
  if (process.env.DROPBOX_ACCESS_TOKEN) return process.env.DROPBOX_ACCESS_TOKEN;

  const { DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY, DROPBOX_APP_SECRET } = process.env;
  if (!DROPBOX_REFRESH_TOKEN || !DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) return null;

  if (cachedToken && Date.now() < cachedExp) return cachedToken;

  const auth = Buffer.from(`${DROPBOX_APP_KEY}:${DROPBOX_APP_SECRET}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: DROPBOX_REFRESH_TOKEN,
    }),
  });
  if (!res.ok) throw new Error(`Dropbox token error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  cachedToken = json.access_token;
  cachedExp = Date.now() + (json.expires_in - 60) * 1000;
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

/** Elenca i figli di una cartella. Ritorna null se mancano le credenziali. */
export async function listFolder(path) {
  const token = await getAccessToken();
  if (!token) return null;
  const res = await fetch(`${RPC}/files/list_folder`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...pathRootHeader(),
    },
    body: JSON.stringify({ path, recursive: false }),
  });
  if (!res.ok) throw new Error(`Dropbox list_folder ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.entries || [];
}

/** Scarica un file di testo (es. dossier.md). Ritorna null se mancano le credenziali. */
export async function downloadText(path) {
  const token = await getAccessToken();
  if (!token) return null;
  const res = await fetch(`${CONTENT}/files/download`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Dropbox-API-Arg": JSON.stringify({ path }),
      ...pathRootHeader(),
    },
  });
  if (!res.ok) throw new Error(`Dropbox download ${res.status}: ${await res.text()}`);
  return await res.text();
}

export function hasCredentials() {
  return Boolean(
    process.env.DROPBOX_ACCESS_TOKEN ||
      (process.env.DROPBOX_REFRESH_TOKEN &&
        process.env.DROPBOX_APP_KEY &&
        process.env.DROPBOX_APP_SECRET)
  );
}
