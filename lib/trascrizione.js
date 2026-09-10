// Trascrizione del parlato dei video.
//
// Perché serve un servizio esterno: Claude legge testo e guarda immagini, ma
// non ascolta. E nei video dei clienti il valore sta quasi sempre in ciò che
// viene DETTO (sono copioni recitati davanti alla camera), non in cosa si vede.
//
// Senza la chiave configurata la funzione ritorna null e l'app continua a
// lavorare come prima, sui soli fotogrammi: la trascrizione è un di più, non
// un requisito.

const API = "https://api.openai.com/v1/audio/transcriptions";
const MODELLO = "whisper-1";

export function trascrizioneAttiva() {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Dal buffer audio al testo parlato. Ritorna { testo, secondi } oppure null.
 * Gli errori non fermano il copy: al massimo si resta senza parlato.
 */
export async function trascrivi(audio, { nome = "audio.mp3" } = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !audio || !audio.length) return null;

  const form = new FormData();
  form.append("file", new Blob([audio], { type: "audio/mpeg" }), nome);
  form.append("model", MODELLO);
  form.append("language", "it");        // i clienti parlano italiano
  form.append("response_format", "json");

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) return null;
    const dati = await res.json();
    const testo = String(dati.text || "").trim();
    return testo ? { testo } : null;
  } catch {
    return null;
  }
}
