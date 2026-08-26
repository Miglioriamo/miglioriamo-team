import { listFolder, downloadText } from "../../../lib/dropbox";
import { trovaLogoCliente } from "../../../lib/logo";

export const dynamic = "force-dynamic";

const EMPTY = { dossier: false, promo: false, cta: false, logo: false };

export async function GET(request) {
  const name = new URL(request.url).searchParams.get("name");
  if (!name) return Response.json({ error: "missing name" }, { status: 400 });

  const base = process.env.DROPBOX_CONTEXTS_PATH || "/MIGLIORIAMO/CLAUDE/Contesto cliente";
  const clientPath = `${base}/${name}`;

  try {
    const children = await listFolder(clientPath);
    if (!children) return Response.json({ source: "mock", have: EMPTY });

    const folders = children.filter((e) => e[".tag"] === "folder");

    const gen = folders.find((f) => /contesto\s*-?\s*generico/i.test(f.name));
    const promoCtx = folders.find((f) => /contesto\s*(per\s*)?-?\s*promo/i.test(f.name));
    const promoDir = folders.find((f) => /^promo$/i.test(f.name));

    let hasDossier = false;
    let hasCta = false;
    let genChildren = null;

    if (gen) {
      const genPath = `${clientPath}/${gen.name}`;
      genChildren = (await listFolder(genPath)) || [];
      const md = genChildren.find((e) => e[".tag"] === "file" && /\.md$/i.test(e.name));
      hasDossier = Boolean(md);
      if (md) {
        try {
          const text = await downloadText(`${genPath}/${md.name}`);
          hasCta = /call to action|\bcta\b/i.test(text || "");
        } catch {}
      }
    }

    // Stessa ricerca usata da /api/logo: così il semaforo e il pulsante
    // "Aggiungi logo" non possono mai dire due cose diverse.
    const logo = await trovaLogoCliente(clientPath, { radice: children, generico: genChildren });

    return Response.json({
      source: "dropbox",
      have: { dossier: hasDossier, promo: Boolean(promoCtx), cta: hasCta, logo: Boolean(logo) },
      logoFile: logo ? { nome: logo.nome, formato: logo.formato } : null,
      promoFiles: Boolean(promoDir),
    });
  } catch (e) {
    return Response.json({
      source: "mock",
      error: String(e && e.message ? e.message : e),
      have: EMPTY,
    });
  }
}
