import { listFolder } from "../../../lib/dropbox";

// Clienti demo usati quando non ci sono ancora le credenziali Dropbox.
const MOCK = [
  "Chez Soi", "Wally's", "Barber Club 45", "Caffè Kirkas", "Optica Shop",
  "Terrazza Lincei", "Rosini Arredamenti", "Idee per la Testa", "Gnavolini",
  "Sali Estetica", "Norcia in Tavola", "Belardi Abbigliamento",
];

export const dynamic = "force-dynamic"; // sempre fresco (nessuna cache statica)

export async function GET() {
  const base = process.env.DROPBOX_CONTEXTS_PATH || "/MIGLIORIAMO/CLAUDE/Contesto cliente";
  try {
    const entries = await listFolder(base);
    if (!entries) {
      // Nessuna credenziale: dati demo
      return Response.json({ source: "mock", clients: MOCK.map((name) => ({ name })) });
    }
    const clients = entries
      .filter((e) => e[".tag"] === "folder")
      .map((e) => ({ name: e.name, path: e.path_display }))
      .sort((a, b) => a.name.localeCompare(b.name, "it"));
    return Response.json({ source: "dropbox", clients });
  } catch (e) {
    // In caso di errore (path/namespace da sistemare) non blocchiamo l'app: mostriamo i demo.
    return Response.json({
      source: "mock",
      error: String(e && e.message ? e.message : e),
      clients: MOCK.map((name) => ({ name })),
    });
  }
}
