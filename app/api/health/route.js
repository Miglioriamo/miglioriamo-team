import { listFolder, authMode, diagnose } from "../../../lib/dropbox";

export const dynamic = "force-dynamic";

// Diagnostica: dice in un colpo solo se l'app parla davvero con Dropbox.
// Non espone MAI token o segreti, solo "c'è / non c'è" e i conteggi.
export async function GET() {
  const base = process.env.DROPBOX_CONTEXTS_PATH || "/MIGLIORIAMO/CLAUDE/Contesto cliente";

  const env = {
    refreshToken: Boolean(process.env.DROPBOX_REFRESH_TOKEN),
    appKey: Boolean(process.env.DROPBOX_APP_KEY),
    appSecret: Boolean(process.env.DROPBOX_APP_SECRET),
    accessTokenStatico: Boolean(process.env.DROPBOX_ACCESS_TOKEN),
    namespaceId: process.env.DROPBOX_NAMESPACE_ID || null,
    contextsPath: base,
    chiaveClaude: Boolean(process.env.ANTHROPIC_API_KEY),
  };

  const checks = {};
  let firstClient = null;

  // 0) autenticazione: il token viene rilasciato? e viene accettato?
  checks.autenticazione = await diagnose();

  // 1) elenco clienti (cartella radice dei contesti)
  try {
    const entries = await listFolder(base);
    if (!entries) {
      checks.elencoClienti = { ok: false, errore: "nessuna credenziale Dropbox configurata" };
    } else {
      const folders = entries.filter((e) => e[".tag"] === "folder");
      firstClient = folders[0] ? folders[0].name : null;
      checks.elencoClienti = { ok: true, clienti: folders.length };
    }
  } catch (e) {
    checks.elencoClienti = { ok: false, errore: msg(e) };
  }

  // 2) cartella di un singolo cliente (è il punto che si era rotto)
  if (firstClient) {
    try {
      const children = await listFolder(`${base}/${firstClient}`);
      checks.cartellaCliente = { ok: true, cliente: firstClient, elementi: (children || []).length };
    } catch (e) {
      checks.cartellaCliente = { ok: false, cliente: firstClient, errore: msg(e) };
    }
  }

  const ok = Object.values(checks).every((c) => c.ok);
  return Response.json({ ok, auth: authMode(), env, checks }, { status: ok ? 200 : 500 });
}

function msg(e) {
  return String(e && e.message ? e.message : e);
}
