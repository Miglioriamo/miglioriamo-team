// Estrazione fotogrammi da un video (solo lato server).
// Claude non sa aprire un mp4: gli si fanno vedere alcuni fotogrammi presi lungo
// la clip (inizio / metà / finale), così la didascalia racconta il video intero
// e non solo la prima inquadratura.
//
// I video dei clienti pesano anche 200-300 MB: NON si scaricano. ffmpeg legge il
// file direttamente dal link temporaneo di Dropbox e ne preleva solo i pezzi che
// gli servono per arrivare al punto richiesto (richieste HTTP con range).

import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";

function run(args, timeoutMs = 20000) {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    const kill = setTimeout(() => proc.kill("SIGKILL"), timeoutMs);
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("close", (code) => { clearTimeout(kill); resolve({ code, err }); });
    proc.on("error", (e) => { clearTimeout(kill); resolve({ code: -1, err: String(e.message || e) }); });
  });
}

/** Durata in secondi, letta dall'output di ffmpeg (non serve ffprobe). */
async function durationOf(url) {
  const { err } = await run(["-i", url]);
  const m = err.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  if (!m) return 0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/**
 * Fino a `count` fotogrammi (base64 JPEG) presi lungo la clip, in ordine.
 * Se la durata non è leggibile ripiega su un solo fotogramma iniziale.
 */
export async function extractFrames(url, count = 3) {
  const dir = await mkdtemp(path.join(tmpdir(), "studio-frames-"));
  try {
    const seconds = await durationOf(url);
    // Si evitano il primissimo e l'ultimissimo istante: spesso neri o sfocati.
    const points =
      seconds > 1
        ? Array.from({ length: count }, (_, i) =>
            +(seconds * (0.1 + (0.75 * i) / Math.max(1, count - 1))).toFixed(2)
          )
        : [0];

    // In parallelo: ogni processo scarica solo il tratto che gli serve.
    const grabbed = await Promise.all(
      points.map(async (at, i) => {
        const out = path.join(dir, `f${i}.jpg`);
        const { code } = await run([
          "-y", "-ss", String(at), "-i", url,
          "-frames:v", "1", "-q:v", "4",
          "-vf", "scale='min(1024,iw)':-2",
          out,
        ]);
        if (code !== 0) return null;
        try {
          return (await readFile(out)).toString("base64");
        } catch {
          return null;
        }
      })
    );

    return { frames: grabbed.filter(Boolean), seconds };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
