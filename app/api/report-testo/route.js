import { listFolder, downloadText } from "../../../lib/dropbox";
import { scriviReport, hasKey } from "../../../lib/anthropic";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

// Il dossier serve a far parlare il report con la voce del cliente.
async function leggiDossier(clientPath) {
  try {
    const figli = await listFolder(clientPath);
    if (!figli) return null;
    const gen = figli.find((e) => e[".tag"] === "folder" && /contesto\s*-?\s*generico/i.test(e.name));
    if (!gen) return null;
    const dentro = (await listFolder(`${clientPath}/${gen.name}`)) || [];
    const md = dentro.find((e) => e[".tag"] === "file" && /\.md$/i.test(e.name));
    return md ? await downloadText(`${clientPath}/${gen.name}/${md.name}`) : null;
  } catch {
    return null;
  }
}

export async function POST(request) {
  if (!hasKey())
    return Response.json({ errore: "Chiave Claude non configurata (ANTHROPIC_API_KEY su Vercel)." }, { status: 503 });

  let d = {};
  try { d = await request.json(); } catch {}
  const cliente = (d.cliente || "").trim();
  if (!cliente) return Response.json({ errore: "manca il cliente" }, { status: 400 });

  const base = process.env.DROPBOX_CONTEXTS_PATH || "/MIGLIORIAMO/CLAUDE/Contesto cliente";

  try {
    const dossier = await leggiDossier(`${base}/${cliente}`);
    const out = await scriviReport({ clientName: cliente, dossier, dati: d });
    return Response.json({ ...out, conDossier: Boolean(dossier) });
  } catch (e) {
    return Response.json({ errore: String(e && e.message ? e.message : e) }, { status: 502 });
  }
}
