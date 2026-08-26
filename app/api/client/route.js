import { listFolder, downloadText } from "../../../lib/dropbox";

export const dynamic = "force-dynamic";

// Un logo può essere consegnato in molti formati: i vettoriali (pdf/ai/eps) sono
// anzi l'originale "buono" da cui si ricavano gli altri. Vanno riconosciuti tutti,
// altrimenti l'app dice "manca il logo" mentre il file è lì.
const LOGO_FILE = /\.(png|jpe?g|webp|svg|pdf|ai|eps)$/i;
const LOGO_NAME = /logo|marchio|brand/i;
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
    const files = children.filter((e) => e[".tag"] === "file");

    const gen = folders.find((f) => /contesto\s*-?\s*generico/i.test(f.name));
    const promoCtx = folders.find((f) => /contesto\s*(per\s*)?-?\s*promo/i.test(f.name));
    const promoDir = folders.find((f) => /^promo$/i.test(f.name));
    const brandTop = folders.find((f) => /^brand$/i.test(f.name));

    const findLogo = (arr) =>
      arr.find(
        (e) => e[".tag"] === "file" && LOGO_FILE.test(e.name) && LOGO_NAME.test(e.name)
      ) || null;

    let hasDossier = false;
    let logoFile = findLogo(files);
    let hasLogo = Boolean(brandTop) || Boolean(logoFile);
    let hasCta = false;

    if (gen) {
      const genPath = `${clientPath}/${gen.name}`;
      const genChildren = (await listFolder(genPath)) || [];
      const md = genChildren.find((e) => e[".tag"] === "file" && /\.md$/i.test(e.name));
      hasDossier = Boolean(md);
      if (!logoFile) logoFile = findLogo(genChildren);
      if (!hasLogo) {
        hasLogo =
          Boolean(logoFile) ||
          genChildren.some((e) => e[".tag"] === "folder" && /^brand$/i.test(e.name));
      }
      if (md) {
        try {
          const text = await downloadText(`${genPath}/${md.name}`);
          hasCta = /call to action|\bcta\b/i.test(text || "");
        } catch {}
      }
    }

    return Response.json({
      source: "dropbox",
      have: { dossier: hasDossier, promo: Boolean(promoCtx), cta: hasCta, logo: hasLogo },
      logoFile: logoFile
        ? { nome: logoFile.name, formato: logoFile.name.split(".").pop().toLowerCase() }
        : null,
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
