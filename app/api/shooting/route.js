import { leggiFascicolo, copioniPrecedenti } from "../../../lib/fascicolo";
import { scriviCopioni, hasKey } from "../../../lib/anthropic";
import { elencoPerPrompt, perId } from "../../../lib/formatvideo";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request) {
  if (!hasKey())
    return Response.json({ errore: "Chiave Claude non configurata." }, { status: 503 });

  let d = {};
  try { d = await request.json(); } catch {}
  const cliente = String(d.cliente || "").trim();
  if (!cliente) return Response.json({ errore: "manca il cliente" }, { status: 400 });

  try {
    const fascicolo = await leggiFascicolo(cliente);
    const dati = { obiettivo: d.obiettivo, mese: d.mese, indicazioni: d.indicazioni };

    // Rigenerazione di UN solo copione: gli altri restano dove sono.
    if (d.rigenera != null) {
      const attuali = Array.isArray(d.copioni) ? d.copioni : [];
      const evita = attuali
        .filter((_, i) => i !== Number(d.rigenera))
        .map((c) => c.format)
        .filter(Boolean);
      const [nuovo] = await scriviCopioni({
        clientName: cliente,
        fascicolo,
        dati,
        repertorio: elencoPerPrompt(evita),
        singolo: { evita: evita.join(", "), nota: d.nota || "" },
      });
      return Response.json({ copione: conNome(nuovo) });
    }

    const copioni = await scriviCopioni({
      clientName: cliente,
      fascicolo,
      dati,
      repertorio: elencoPerPrompt(),
      quanti: Number(d.quanti) || 4,
    });

    return Response.json({
      copioni: copioni.map(conNome),
      fascicolo: {
        dossier: Boolean(fascicolo.dossier),
        dati: Boolean(fascicolo.dati),
        cta: Boolean(fascicolo.cta),
        paletti: Boolean(fascicolo.paletti),
      },
      precedenti: await copioniPrecedenti(cliente),
    });
  } catch (e) {
    return Response.json({ errore: String(e && e.message ? e.message : e) }, { status: 502 });
  }
}

// Al posto dell'id tecnico del format mostriamo il nome leggibile.
function conNome(c) {
  const f = perId(c.format);
  return { ...c, formatNome: f ? f.nome : c.format || "" };
}
