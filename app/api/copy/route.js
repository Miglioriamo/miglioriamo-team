import { listFolder, downloadText, getTemporaryLink } from "../../../lib/dropbox";
import { generateCaption, hasKey } from "../../../lib/anthropic";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const IMG = /\.(png|jpe?g|webp)$/i;
const MAX = 4; // limite foto per giro (tempo/costo)

async function readDossier(clientPath) {
  const children = await listFolder(clientPath);
  if (!children) return null;
  const gen = children.find((e) => e[".tag"] === "folder" && /contesto\s*-?\s*generico/i.test(e.name));
  if (!gen) return null;
  const gc = (await listFolder(`${clientPath}/${gen.name}`)) || [];
  const md = gc.find((e) => e[".tag"] === "file" && /\.md$/i.test(e.name));
  if (!md) return null;
  try {
    return await downloadText(`${clientPath}/${gen.name}/${md.name}`);
  } catch {
    return null;
  }
}

export async function POST(request) {
  if (!hasKey())
    return Response.json({ error: "no_key", message: "Chiave Claude API non configurata (ANTHROPIC_API_KEY su Vercel)." });

  let body = {};
  try { body = await request.json(); } catch {}
  const { name, path } = body;
  if (!name || !path) return Response.json({ error: "Manca il cliente o il percorso cartella." });

  const base = process.env.DROPBOX_CONTEXTS_PATH || "/MIGLIORIAMO/CLAUDE/Contesto cliente";
  try {
    const dossier = await readDossier(`${base}/${name}`);
    const entries = await listFolder(path.trim());
    if (!entries) return Response.json({ error: "Dropbox non raggiungibile." });

    const images = entries.filter((e) => e[".tag"] === "file" && IMG.test(e.name)).slice(0, MAX);
    if (!images.length)
      return Response.json({
        captions: [],
        note: "Nessuna foto (jpg/png) trovata in questa cartella. I video non sono ancora supportati nell'app web (arrivano più avanti).",
      });

    const captions = await Promise.all(
      images.map(async (img) => {
        const full = `${path.trim().replace(/\/$/, "")}/${img.name}`;
        try {
          const imageUrl = await getTemporaryLink(full);
          const caption = await generateCaption({ clientName: name, dossier, imageUrl });
          return { name: img.name, imageUrl, caption };
        } catch (e) {
          return { name: img.name, imageUrl: null, caption: "⚠️ errore: " + (e.message || e) };
        }
      })
    );
    return Response.json({ captions, dossier: Boolean(dossier) });
  } catch (e) {
    return Response.json({ error: String(e && e.message ? e.message : e) });
  }
}
