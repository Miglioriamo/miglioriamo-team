// Helper Claude API (solo lato server). Genera una didascalia "vedendo" un'immagine.
const API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5"; // veloce e ottimo su vision; cambiabile

// Metodo di scrittura MiglioriAmo (craft trasferibile, NON i contenuti dell'agenzia).
const CRAFT = `Scrivi in stile MiglioriAmo:
- Copy CORTO: 2-3 frasi + una CTA. Semplice e diretto, frasi brevi.
- Niente fuffa: concreto e orientato al RISULTATO (portare clienti, far agire chi legge).
- Struttura: 1 emoji d'apertura → gancio → valore → CTA → 3-5 hashtag.
- Italiano corretto, nessun refuso.
REGOLE DURE:
- Scrivi SOLO su ciò che vedi davvero nell'immagine + il contesto del cliente.
- NON inventare dati: numeri di telefono, link, orari, indirizzi. Se non sono nel contesto, resta generico ("passa in negozio", "scrivici in DM").
- NON attribuire un piatto/prodotto a un luogo sbagliato (es. l'amatriciana NON è "di Norcia"; il nome del brand non è l'origine del piatto).
- Usa la voce del cliente (tono, prodotti, CTA) dal contesto qui sotto.`;

export function hasKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Scrive la didascalia guardando uno o più fotogrammi.
 * `images` = array di JPEG in base64. Per un video sono fotogrammi in ordine
 * cronologico, e va detto a Claude: altrimenti li tratta come scatti separati.
 */
export async function generateCaption({ clientName, dossier, images, kind = "foto" }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY mancante");
  const shots = (images || []).filter(Boolean);
  if (!shots.length) throw new Error("nessuna immagine da guardare");

  const system = `Sei il social media manager di MiglioriAmo. ${CRAFT}

CONTESTO CLIENTE "${clientName}":
${(dossier || "(nessun dossier disponibile — resta prudente e generico)").slice(0, 6000)}`;

  const res = await fetch(API, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      system,
      messages: [
        {
          role: "user",
          content: [
            ...shots.map((data) => ({
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data },
            })),
            {
              type: "text",
              text:
                kind === "video"
                  ? `Queste sono ${shots.length} inquadrature prese in ordine dallo STESSO video (inizio, parte centrale, finale): ricostruisci cosa mostra la clip nel suo insieme e scrivi UNA didascalia per il post video (2-3 frasi + CTA + 3-5 hashtag). Non descrivere i fotogrammi uno per uno. Rispondi SOLO con la didascalia, senza premesse.`
                  : "Guarda questa immagine e scrivi la didascalia (2-3 frasi + CTA + 3-5 hashtag) per il post di questo cliente. Rispondi SOLO con la didascalia, senza premesse.",
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = (json.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  return (
    text ||
    "⚠️ Il contenuto non sembra coerente con il contesto di questo cliente — controlla che la cartella sia la sua."
  );
}
