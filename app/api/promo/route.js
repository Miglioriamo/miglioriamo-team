import { listFolder, downloadText } from "../../../lib/dropbox";

export const dynamic = "force-dynamic";

// Legge la cartella /PROMO del cliente e ritorna i file .md generati dall'agente.
export async function GET(request) {
  const name = new URL(request.url).searchParams.get("name");
  if (!name) return Response.json({ error: "missing name" }, { status: 400 });

  const base = process.env.DROPBOX_CONTEXTS_PATH || "/MIGLIORIAMO/CLAUDE/Contesto cliente";
  const clientPath = `${base}/${name}`;

  try {
    const children = await listFolder(clientPath);
    if (!children) return Response.json({ source: "mock", files: [] });

    const promoDir = children.find(
      (e) => e[".tag"] === "folder" && /^promo$/i.test(e.name)
    );
    if (!promoDir) return Response.json({ source: "dropbox", files: [] });

    const promoPath = `${clientPath}/${promoDir.name}`;
    const items = (await listFolder(promoPath)) || [];
    const mds = items
      .filter((e) => e[".tag"] === "file" && /\.md$/i.test(e.name))
      .sort((a, b) => b.name.localeCompare(a.name)); // più recenti prima

    const files = [];
    for (const md of mds) {
      let content = "";
      try {
        content = await downloadText(`${promoPath}/${md.name}`);
      } catch {}
      files.push({ name: md.name, label: labelFromName(md.name), content });
    }
    return Response.json({ source: "dropbox", files });
  } catch (e) {
    return Response.json({ source: "mock", error: String(e && e.message ? e.message : e), files: [] });
  }
}

// "PROMO-IDEE-2026-08.md" -> "Agosto 2026"
const MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
function labelFromName(n) {
  const m = n.match(/(\d{4})-(\d{2})/);
  if (m) {
    const mese = MESI[parseInt(m[2], 10) - 1] || m[2];
    return `${mese} ${m[1]}`;
  }
  return n.replace(/\.md$/i, "");
}
