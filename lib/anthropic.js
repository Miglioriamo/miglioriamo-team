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

/**
 * Trasforma gli appunti dell'operatore nel testo del report al cliente.
 * Restituisce { racconto, proposta }: il racconto di cosa è stato fatto e,
 * se richiesta, la proposta per il periodo che viene.
 *
 * Due paletti che contano più della bella scrittura:
 * - si scrive SOLO su ciò che c'è negli appunti e nei numeri forniti;
 * - se il cliente non investe in advertising, la parola non compare mai.
 */
export async function scriviReport({ clientName, dossier, dati }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY mancante");

  const adv = Boolean(dati.adv);
  const conProposta = Boolean(dati.conProposta);

  const system = `Sei il project manager di MiglioriAmo e stai scrivendo il report periodico a un cliente:
un'attività locale (negozio, ristorante, salone). Il cliente lo legge per capire una cosa sola:
"cosa avete fatto per me e cosa mi porta".

COME SCRIVERE
- Parla al cliente dandogli del tu, al plurale per l'agenzia ("abbiamo pubblicato", "ti proponiamo").
- Frasi brevi, italiano semplice e corretto. Niente parole da agenzia (engagement, brand awareness, storytelling).
- Concreto e orientato al risultato: le persone raggiunte servono a far entrare gente in negozio.
- Tono di chi c'è: sereno, sicuro, mai trionfalistico. Nessuna emoji, nessun titolo, nessun elenco puntato.

REGOLE DURE
- Usa SOLO le attività e i numeri che ti vengono dati. Non aggiungere attività non elencate.
- Non inventare numeri, date, nomi di campagne, risultati commerciali (incassi, prenotazioni) che non ti sono stati dati.
- Se gli appunti sono poveri, scrivi poco: meglio tre frasi vere che dieci gonfiate.
${adv
  ? `- Questo cliente INVESTE in advertising. Nel racconto parlane solo se è negli appunti.${conProposta ? " Nella PROPOSTA invece devi dedicare una frase a come useremo l'advertising nel periodo che viene (su quali contenuti spingere e con che obiettivo), senza inventare budget, numeri o risultati passati." : ""}`
  : "- Questo cliente NON investe in advertising: non nominare MAI campagne, sponsorizzate, budget, inserzioni o advertising in nessuna forma. Resta sull'organico."}`;

  const richiesta = `CLIENTE: ${clientName}
PERIODO: ${dati.per || "(non indicato)"}

NUMERI DEL PERIODO
- copertura: ${dati.reach || "-"}${dati.reachd ? ` (${dati.reachd})` : ""}
- nuovi follower: ${dati.fol || "-"}
- interazioni: ${dati.int || "-"}
- visite al profilo: ${dati.vis || "-"}
- contenuto migliore: ${dati.top || "-"}

APPUNTI DELL'OPERATORE SU COSA È STATO FATTO (materiale grezzo, da riscrivere):
${(dati.attivita || "").trim() || "(nessun appunto)"}

${conProposta ? `APPUNTI SULLA PROPOSTA per il periodo che viene (se vuoti, proponi tu qualcosa di coerente con i numeri e con ciò che è stato fatto):
${(dati.passo || "").trim() || "(nessun appunto)"}` : "Non serve la proposta."}

Rispondi ESATTAMENTE in questo formato, senza premesse e senza altro testo:

[RACCONTO]
4-6 frasi che raccontano cosa abbiamo fatto nel periodo, in un discorso unico e scorrevole.
${conProposta ? `
[PROPOSTA]
2-3 frasi su cosa proponiamo per il periodo che viene.` : ""}`;

  const res = await fetch(API, {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 900,
      system: `${system}

CONTESTO CLIENTE "${clientName}" (per tono e attività, non per inventare):
${(dossier || "(nessun dossier disponibile — resta prudente e generico)").slice(0, 5000)}`,
      messages: [{ role: "user", content: richiesta }],
    }),
  });

  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const testo = (json.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();

  // Due marcatori invece del JSON: un testo con virgolette o accapo dentro
  // farebbe fallire il JSON, e il report uscirebbe con le parentesi in mezzo.
  const sezione = (nome) => {
    const m = testo.match(new RegExp(`\\[${nome}\\]\\s*([\\s\\S]*?)(?=\\n\\s*\\[[A-Z]+\\]|$)`, "i"));
    return m ? m[1].trim() : "";
  };
  const racconto = sezione("RACCONTO");
  const proposta = sezione("PROPOSTA");
  // Se i marcatori mancassero, meglio il testo intero che niente.
  return { racconto: racconto || testo.replace(/\[[A-Z]+\]/g, "").trim(), proposta };
}
