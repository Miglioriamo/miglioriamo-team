import { listFolder, downloadText } from "../../../lib/dropbox";

export const dynamic = "force-dynamic";

const IMG = /\.(png|jpe?g|webp|svg)$/i;
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

    const isLogo = (arr) =>
      arr.some((e) => e[".tag"] === "file" && IMG.test(e.name) && /logo/i.test(e.name));

    let hasDossier = false;
    let hasLogo = Boolean(brandTop) || isLogo(files);
    let hasCta = false;

    if (gen) {
      const genPath = `${clientPath}/${gen.name}`;
      const genChildren = (await listFolder(genPath)) || [];
      const md = genChildren.find((e) => e[".tag"] === "file" && /\.md$/i.test(e.name));
      hasDossier = Boolean(md);
      if (!hasLogo) {
        hasLogo =
          isLogo(genChildren) ||
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
