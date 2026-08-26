import { downloadBinary, getThumbnailBuffer, hasCredentials } from "../../../lib/dropbox";
import { trovaLogoCliente } from "../../../lib/logo";

export const dynamic = "force-dynamic";

// PNG, WEBP e SVG si scaricano tali e quali: possono già avere il fondo
// trasparente e l'anteprima di Dropbox lo appiattirebbe sul bianco.
// JPEG, PDF (e i vettoriali che Dropbox sa aprire) passano invece dall'anteprima,
// che li trasforma in un PNG utilizzabile nella pagina.
const DIRETTI = { png: "image/png", webp: "image/webp", svg: "image/svg+xml" };

export async function GET(request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name");
  if (!name) return Response.json({ error: "manca il nome del cliente" }, { status: 400 });

  if (!hasCredentials())
    return Response.json(
      { trovato: false, motivo: "Dropbox non è collegato: non posso cercare il logo." },
      { status: 503 }
    );

  const base = process.env.DROPBOX_CONTEXTS_PATH || "/MIGLIORIAMO/CLAUDE/Contesto cliente";

  try {
    const logo = await trovaLogoCliente(`${base}/${name}`);
    if (!logo)
      return Response.json(
        { trovato: false, motivo: "Nessun file logo nella cartella di questo cliente." },
        { status: 404 }
      );

    // ?info=1 → solo la scheda del file, senza scaricare niente
    if (url.searchParams.get("info"))
      return Response.json({ trovato: true, nome: logo.nome, formato: logo.formato });

    let buf, tipo;
    if (DIRETTI[logo.formato]) {
      buf = await downloadBinary(logo.path);
      tipo = DIRETTI[logo.formato];
    } else {
      buf = await getThumbnailBuffer(logo.path, { formato: "png", size: "w1024h768" });
      tipo = "image/png";
    }

    if (!buf)
      return Response.json(
        {
          trovato: true,
          nome: logo.nome,
          formato: logo.formato,
          leggibile: false,
          motivo: `Il logo è in ${logo.formato.toUpperCase()}, un formato che non si riesce ad aprire. Serve una versione PNG o JPG nella cartella del cliente.`,
        },
        { status: 415 }
      );

    return new Response(buf, {
      headers: {
        "Content-Type": tipo,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(logo.nome)}`,
        "X-Logo-Formato": logo.formato,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    return Response.json({ errore: String(e && e.message ? e.message : e) }, { status: 502 });
  }
}
