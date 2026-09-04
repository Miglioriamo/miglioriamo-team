import { listFolder } from "../../../lib/dropbox";

export const dynamic = "force-dynamic";

// Legge cosa l'app ha già prodotto per un cliente: output/<tipo>/<AAAA-MM>/…
// Serve alla scheda cliente per rispondere alla domanda "cosa gli abbiamo dato".
export async function GET(request) {
  const name = new URL(request.url).searchParams.get("name");
  if (!name) return Response.json({ error: "manca il cliente" }, { status: 400 });

  const base = process.env.DROPBOX_CONTEXTS_PATH || "/MIGLIORIAMO/CLAUDE/Contesti per clienti";
  const radice = `${base}/${name}/output`;

  try {
    const tipi = await listFolder(radice);
    if (!tipi) return Response.json({ lavori: [], conteggi: {} });

    const lavori = [];
    const conteggi = {};
    for (const tipo of tipi.filter((e) => e[".tag"] === "folder")) {
      const mesi = (await listFolder(`${radice}/${tipo.name}`)) || [];
      for (const mese of mesi.filter((e) => e[".tag"] === "folder")) {
        const file = (await listFolder(`${radice}/${tipo.name}/${mese.name}`)) || [];
        for (const f of file.filter((e) => e[".tag"] === "file")) {
          conteggi[tipo.name] = (conteggi[tipo.name] || 0) + 1;
          lavori.push({
            tipo: tipo.name,
            mese: mese.name,
            nome: f.name,
            quando: f.client_modified || f.server_modified || null,
          });
        }
      }
    }
    lavori.sort((a, b) => String(b.quando).localeCompare(String(a.quando)));
    return Response.json({ lavori: lavori.slice(0, 8), totale: lavori.length, conteggi });
  } catch (e) {
    // Nessun output ancora: non è un errore, è un cliente nuovo.
    if (/not_found/.test(String(e && e.message ? e.message : e)))
      return Response.json({ lavori: [], totale: 0, conteggi: {} });
    return Response.json({ errore: String(e && e.message ? e.message : e) }, { status: 502 });
  }
}
