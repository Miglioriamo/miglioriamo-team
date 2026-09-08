import {
  listFolder,
  getTemporaryLink,
  getThumbnailBase64,
  resolveTarget,
  friendlyError,
} from "../../../lib/dropbox";
import { extractFrames } from "../../../lib/video";
import { scriviDidascalia, hasKey } from "../../../lib/anthropic";
import { leggiFascicolo } from "../../../lib/fascicolo";
import { nomeUtile, cartellaUtile } from "../../../lib/nomi";
import { salvaOutput, aggiornaIndice, leggiIndice, scritturaAttiva } from "../../../lib/scrittura";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Foto "normali" e RAW di macchina fotografica: entrambi si leggono con
// l'anteprima JPEG di Dropbox, perché Claude non sa aprire un file RAW.
const FOTO = /\.(png|jpe?g|webp|heic|heif|tiff?|bmp|gif)$/i;
const RAW = /\.(arw|cr2|cr3|nef|dng|raf|orf|rw2|srw|pef)$/i;
const VIDEO = /\.(mp4|mov|m4v|avi|mkv|webm)$/i;

const MAX_FOTO = 4;
const MAX_VIDEO = 3; // più lenti delle foto: ffmpeg deve cercare dentro il file
const MAX_SUBFOLDERS = 24; // quante sottocartelle ispezionare quando la cartella è "vuota"
const FRAMES = 3;

/** Una foto (o un RAW): l'anteprima di Dropbox è già quello che serve a Claude. */
async function fromPhoto(full) {
  const thumb = await getThumbnailBase64(full);
  if (!thumb) throw new Error("Dropbox non riesce a generare l'anteprima di questo file.");
  return { images: [thumb], preview: thumb, kind: "foto" };
}

/**
 * Un video: ffmpeg legge il file dal link temporaneo di Dropbox e ne preleva
 * qualche fotogramma, senza scaricarlo (pesano anche 200-300 MB).
 * Se ffmpeg non ce la fa si ripiega sull'anteprima di Dropbox: un fotogramma
 * solo, meno preciso, ma meglio che restare senza didascalia.
 */
async function fromVideo(full) {
  const link = await getTemporaryLink(full);
  if (link) {
    try {
      const { frames, seconds } = await extractFrames(link, FRAMES);
      if (frames.length)
        return { images: frames, preview: frames[0], kind: "video", seconds, shots: frames.length };
    } catch {}
  }
  const thumb = await getThumbnailBase64(full);
  if (!thumb) throw new Error("Non si riesce a leggere questo video.");
  return { images: [thumb], preview: thumb, kind: "video", shots: 1 };
}

/** Guarda un contenuto e ne scrive la didascalia; gli errori restano nella scheda. */
async function scriviCaption(full, file, estrai, clientName, fascicolo, indiziBase) {
  try {
    const { images, preview, kind, seconds, shots } = await estrai(full);
    // Il nome del file è informazione gratuita, ma solo se dice qualcosa:
    // "IMG_4471" non aiuta, "Banana split con panna" sì.
    const indizi = { ...indiziBase, nomeFile: nomeUtile(file.name) };
    const { caption, registro, motivo, grezzo, fine } = await scriviDidascalia({
      clientName, fascicolo, images, kind, indizi,
    });
    return {
      name: file.name, kind, seconds, shots,
      preview: `data:image/jpeg;base64,${preview}`,
      caption, registro, motivo, grezzo, fine,
    };
  } catch (e) {
    return {
      name: file.name,
      kind: estrai === fromVideo ? "video" : "foto",
      preview: null,
      caption: "⚠️ " + friendlyError(e),
    };
  }
}

/** Il report dei copy, come lo legge una persona. */
function reportCopy(cliente, cartella, captions) {
  const oggi = new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  const righe = [`# Copy — ${cliente}`, "", `Cartella: ${cartella}`, `Generati il ${oggi}`, ""];
  captions.forEach((c, i) => {
    righe.push(`## ${i + 1}. ${c.name}`);
    if (c.registro) righe.push(`_${c.registro}${c.motivo ? " — " + c.motivo : ""}_`, "");
    righe.push(c.caption || "", "");
  });
  return righe.join("\n");
}

export async function POST(request) {
  // Archiviazione: arriva dopo, quando chi lavora ha riletto e approvato.
  // Solo allora i contenuti entrano nella memoria del "già fatto".
  try {
    const body = await request.clone().json();
    if (body && body.archivia) {
      if (!scritturaAttiva())
        return Response.json({ ok: false, motivo: "L'archiviazione non è attiva su questo indirizzo." }, { status: 503 });
      const captions = (body.captions || []).filter((c) => c && c.caption && !String(c.caption).startsWith("⚠️"));
      if (!captions.length) return Response.json({ ok: false, motivo: "Non c'è niente da archiviare." }, { status: 400 });
      const cartella = body.folder || "";
      const nomeFile = `Copy ${new Date().toISOString().slice(0, 10)} ${cartella.split("/").filter(Boolean).pop() || ""}`.trim() + ".md";
      const salvato = await salvaOutput({
        cliente: body.name, tipo: "copy", nomeFile,
        contenuto: reportCopy(body.name, cartella, captions),
      });
      const quanti = await aggiornaIndice(body.name, captions.map((c) => ({
        file: c.name, cartella, quando: new Date().toISOString(), registro: c.registro || null,
      })));
      return Response.json({ ok: true, percorso: salvato.percorso, inMemoria: quanti });
    }
  } catch (e) {
    return Response.json({ ok: false, motivo: String(e && e.message ? e.message : e) }, { status: 502 });
  }

  if (!hasKey())
    return Response.json({ error: "no_key", message: "Chiave Claude API non configurata (ANTHROPIC_API_KEY su Vercel)." });

  let body = {};
  try { body = await request.json(); } catch {}
  const { name, path, skip, commento } = body;
  const da = { foto: Math.max(0, Number(skip?.foto) || 0), video: Math.max(0, Number(skip?.video) || 0) };
  if (!name || !path) return Response.json({ error: "Manca il cliente o la cartella." });

  // Quattro forme accettate: percorso o link, di una cartella o di un singolo file.
  let target;
  try {
    target = await resolveTarget(path);
  } catch (e) {
    return Response.json({ error: friendlyError(e) });
  }
  const folder = target.kind === "file" ? target.path.replace(/\/[^/]*$/, "") : target.path;

  let fascicolo = {};
  try {
    fascicolo = (await leggiFascicolo(name)) || {};
  } catch {}
  const dossier = Boolean(fascicolo.dossier);
  // Il commento dell'operatore vale per tutto il gruppo: trenta secondi di
  // appunti coprono venti contenuti.
  const indiziBase = { commento: (commento || "").trim() || null, nomeCartella: cartellaUtile(folder) };

  // Un singolo file (tipico: il link di un video preso da Dropbox).
  if (target.kind === "file") {
    const file = { name: target.name || target.path.split("/").pop(), size: target.size };
    const isVideo = VIDEO.test(file.name);
    if (!isVideo && !FOTO.test(file.name) && !RAW.test(file.name))
      return Response.json({
        error: `Questo file non è una foto né un video (${file.name}). Incolla il link di una foto, di un video o della cartella che li contiene.`,
        folder: target.path,
      });
    const solo = await scriviCaption(target.path, file, isVideo ? fromVideo : fromPhoto, name, fascicolo, indiziBase);
    return Response.json({ captions: [solo], folder: target.path, dossier, fascicolo: stato(fascicolo) });
  }

  let entries;
  try {
    entries = await listFolder(folder);
  } catch (e) {
    return Response.json({ error: friendlyError(e), folder });
  }
  if (!entries) return Response.json({ error: "Dropbox non raggiungibile." });

  const files = entries.filter((e) => e[".tag"] === "file");
  let foto = files.filter((e) => FOTO.test(e.name) || RAW.test(e.name));
  let video = files.filter((e) => VIDEO.test(e.name));

  // La memoria del cliente: i contenuti già consegnati si saltano, così ogni
  // giro lavora solo il materiale nuovo invece di rifare sempre i primi quattro.
  let saltati = 0;
  if (!body.rifaiTutti) {
    try {
      const indice = await leggiIndice(name);
      const fatti = new Set(
        (indice.contenuti || [])
          .filter((x) => (x.cartella || "").toLowerCase() === folder.toLowerCase())
          .map((x) => String(x.file).toLowerCase())
      );
      if (fatti.size) {
        const prima = foto.length + video.length;
        foto = foto.filter((f) => !fatti.has(f.name.toLowerCase()));
        video = video.filter((v) => !fatti.has(v.name.toLowerCase()));
        saltati = prima - (foto.length + video.length);
      }
    } catch {}
  }

  if (!foto.length && !video.length) {
    // Le cartelle di shooting tengono i contenuti dentro le sottocartelle
    // ("Carosello 4", "Reel 4"…): invece di rimandare l'utente su Dropbox,
    // si guarda dentro e gli si propongono quelle che hanno davvero materiale.
    const dirs = entries.filter((e) => e[".tag"] === "folder").slice(0, MAX_SUBFOLDERS);
    const dentro = await Promise.all(
      dirs.map(async (d) => {
        const sub = `${folder}/${d.name}`;
        try {
          const kids = (await listFolder(sub)) || [];
          const f = kids.filter((k) => k[".tag"] === "file" && (FOTO.test(k.name) || RAW.test(k.name))).length;
          const v = kids.filter((k) => k[".tag"] === "file" && VIDEO.test(k.name)).length;
          return f || v ? { name: d.name, path: sub, foto: f, video: v } : null;
        } catch {
          return null;
        }
      })
    );
    const conMateriale = dentro.filter(Boolean);

    return Response.json({
      captions: [],
      folder,
      subfolders: conMateriale,
      note: conMateriale.length
        ? "Qui dentro non ci sono file, ma nelle sottocartelle sì: scegli quale usare."
        : "Nessuna foto né video in questa cartella, né nelle sue sottocartelle." +
          (dirs.length ? " Controlla di aver preso la cartella giusta." : ""),
    });
  }

  // `skip` permette di riprendere da dove si era arrivati: una cartella con 19
  // scatti si smaltisce in più giri invece di rigenerare sempre i primi quattro.
  const fotoDaFare = foto.slice(da.foto, da.foto + MAX_FOTO);
  const videoDaFare = video.slice(da.video, da.video + MAX_VIDEO);

  if (!fotoDaFare.length && !videoDaFare.length)
    return Response.json({
      captions: [],
      folder,
      saltati,
      note: saltati
        ? `Tutti i ${saltati} contenuti di questa cartella hanno già un copy archiviato. Se vuoi rifarli, usa "rifai anche i già fatti".`
        : "Hai già generato le didascalie per tutti i contenuti di questa cartella.",
    });

  const scrivi = (file, estrai) => scriviCaption(`${folder}/${file.name}`, file, estrai, name, fascicolo, indiziBase);

  try {
    // Le foto sono leggere: tutte insieme. I video no: uno per volta, per non
    // saturare memoria e tempo della funzione.
    const daFoto = await Promise.all(fotoDaFare.map((f) => scrivi(f, fromPhoto)));
    const daVideo = [];
    for (const v of videoDaFare) daVideo.push(await scrivi(v, fromVideo));

    const next = { foto: da.foto + fotoDaFare.length, video: da.video + videoDaFare.length };
    const restano = [];
    if (foto.length > next.foto) restano.push(`${foto.length - next.foto} foto`);
    if (video.length > next.video) restano.push(`${video.length - next.video} video`);

    return Response.json({
      captions: [...daFoto, ...daVideo],
      folder,
      dossier,
      saltati,
      fascicolo: stato(fascicolo),
      next: restano.length ? next : undefined,
      restano: restano.length ? restano.join(" e ") : undefined,
      note: restano.length
        ? `Fatti ${fotoDaFare.length ? `${fotoDaFare.length} foto` : ""}${fotoDaFare.length && videoDaFare.length ? " e " : ""}${videoDaFare.length ? `${videoDaFare.length} video` : ""}. Restano ${restano.join(" e ")}: il pulsante qui sotto riprende da lì.`
        : undefined,
    });
  } catch (e) {
    return Response.json({ error: friendlyError(e), folder });
  }
}

// Cosa c'era nel fascicolo: serve a spiegare perché un copy è uscito generico.
function stato(f) {
  return {
    dossier: Boolean(f.dossier),
    dati: Boolean(f.dati),
    cta: Boolean(f.cta),
    paletti: Boolean(f.paletti),
  };
}
