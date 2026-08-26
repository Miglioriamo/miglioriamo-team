import {
  listFolder,
  downloadText,
  getTemporaryLink,
  getThumbnailBase64,
  resolveTarget,
  friendlyError,
} from "../../../lib/dropbox";
import { extractFrames } from "../../../lib/video";
import { generateCaption, hasKey } from "../../../lib/anthropic";

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
async function scriviCaption(full, file, estrai, clientName, dossier) {
  try {
    const { images, preview, kind, seconds, shots } = await estrai(full);
    const caption = await generateCaption({ clientName, dossier, images, kind });
    return { name: file.name, kind, seconds, shots, preview: `data:image/jpeg;base64,${preview}`, caption };
  } catch (e) {
    return {
      name: file.name,
      kind: estrai === fromVideo ? "video" : "foto",
      preview: null,
      caption: "⚠️ " + friendlyError(e),
    };
  }
}

export async function POST(request) {
  if (!hasKey())
    return Response.json({ error: "no_key", message: "Chiave Claude API non configurata (ANTHROPIC_API_KEY su Vercel)." });

  let body = {};
  try { body = await request.json(); } catch {}
  const { name, path, skip } = body;
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

  const base = process.env.DROPBOX_CONTEXTS_PATH || "/MIGLIORIAMO/CLAUDE/Contesto cliente";
  let dossier = null;
  try {
    dossier = await readDossier(`${base}/${name}`);
  } catch {}

  // Un singolo file (tipico: il link di un video preso da Dropbox).
  if (target.kind === "file") {
    const file = { name: target.name || target.path.split("/").pop(), size: target.size };
    const isVideo = VIDEO.test(file.name);
    if (!isVideo && !FOTO.test(file.name) && !RAW.test(file.name))
      return Response.json({
        error: `Questo file non è una foto né un video (${file.name}). Incolla il link di una foto, di un video o della cartella che li contiene.`,
        folder: target.path,
      });
    const solo = await scriviCaption(target.path, file, isVideo ? fromVideo : fromPhoto, name, dossier);
    return Response.json({ captions: [solo], folder: target.path, dossier: Boolean(dossier) });
  }

  let entries;
  try {
    entries = await listFolder(folder);
  } catch (e) {
    return Response.json({ error: friendlyError(e), folder });
  }
  if (!entries) return Response.json({ error: "Dropbox non raggiungibile." });

  const files = entries.filter((e) => e[".tag"] === "file");
  const foto = files.filter((e) => FOTO.test(e.name) || RAW.test(e.name));
  const video = files.filter((e) => VIDEO.test(e.name));

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
      note: "Hai già generato le didascalie per tutti i contenuti di questa cartella.",
    });

  const scrivi = (file, estrai) => scriviCaption(`${folder}/${file.name}`, file, estrai, name, dossier);

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
      dossier: Boolean(dossier),
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
