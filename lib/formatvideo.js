// Repertorio dei format video MiglioriAmo, estratto dai copioni già fatti
// (cartella Dropbox /MIGLIORIAMO/SHOOTING). Non è una lista di idee: è
// l'elenco degli SCHEMI che funzionano, con dentro perché funzionano.
//
// A cosa serve: il generatore sceglie da qui invece di inventare a caso, e
// scarta gli schemi già usati per quel cliente. Così la novità è una
// conseguenza della struttura, non una speranza affidata all'AI.

export const FORMAT = [
  // --- identità -----------------------------------------------------------
  { id: "presentazione", gruppo: "identità", nome: "Presentazione",
    cosa: "Benvenuto: chi siamo, cosa trovi qui, chiusura con dove siamo." },
  { id: "manifesto", gruppo: "identità", nome: "Manifesto",
    cosa: "Perché esistiamo, tono alto ed emozionale, niente elenco di prodotti." },
  { id: "storia", gruppo: "identità", nome: "La nostra storia",
    cosa: "Come è nata l'attività, in prima persona dal titolare." },
  { id: "perche-noi", gruppo: "identità", nome: "Perché sceglierci",
    cosa: "Tre o quattro motivi concreti, uno dietro l'altro." },
  { id: "team", gruppo: "identità", nome: "Il team",
    cosa: "Chi lavora qui e come lavora: crea fiducia prima dell'acquisto." },
  { id: "credenziali", gruppo: "identità", nome: "Anni ed esperienza",
    cosa: "Anzianità, numeri veri, certificazioni. Solo dati certi." },
  // --- educativi ----------------------------------------------------------
  { id: "lo-sapevi", gruppo: "educativi", nome: "Lo sapevi che…",
    cosa: "Problema → causa → soluzione → invito alla consulenza." },
  { id: "falso-mito", gruppo: "educativi", nome: "Vero o falso",
    cosa: "Domande fuori campo, risposte secche che smontano i luoghi comuni." },
  { id: "lista-errori", gruppo: "educativi", nome: "I 3 errori / le 5 domande",
    cosa: "Lista numerata di errori comuni o domande da farsi prima di scegliere." },
  { id: "confronto", gruppo: "educativi", nome: "A o B?",
    cosa: "Due opzioni a confronto, spiegando quando conviene l'una o l'altra." },
  { id: "processo-invisibile", gruppo: "educativi", nome: "Quello che non si vede",
    cosa: "Il lavoro dietro le quinte che il cliente paga senza vederlo." },
  { id: "reframe", gruppo: "educativi", nome: "Noi vediamo altro",
    cosa: "\"Molti vedono X, noi vediamo tutto quello che c'è dietro\": autorevolezza." },
  { id: "novita-normativa", gruppo: "educativi", nome: "È cambiata una regola",
    cosa: "Una novità di legge o di settore che riguarda il cliente finale." },
  // --- prodotto e servizio ------------------------------------------------
  { id: "novita-prodotto", gruppo: "prodotto", nome: "Novità in arrivo",
    cosa: "Lancio di un prodotto nuovo, ritmo staccato: frasi brevissime." },
  { id: "carrellata", gruppo: "prodotto", nome: "Carrellata di proposte",
    cosa: "Tre o quattro prodotti in fila, nome a schermo per ciascuno." },
  { id: "prodotto-del-mese", gruppo: "prodotto", nome: "Il consiglio del mese",
    cosa: "Un solo prodotto consigliato, con motivo e a chi serve." },
  { id: "kit-box", gruppo: "prodotto", nome: "Kit, box e confezioni",
    cosa: "Un insieme pronto, anche come idea regalo." },
  { id: "servizio-per-fascia", gruppo: "prodotto", nome: "Un video per momento",
    cosa: "Colazione, pranzo, aperitivo: un contenuto per ogni fascia di giornata." },
  { id: "caso-realizzato", gruppo: "prodotto", nome: "Un lavoro che abbiamo fatto",
    cosa: "Un progetto realizzato raccontato come prova concreta." },
  { id: "per-occasione", gruppo: "prodotto", nome: "Declinato per occasione",
    cosa: "Lo stesso prodotto per matrimonio, laurea, compleanno, battesimo." },
  // --- commerciali --------------------------------------------------------
  { id: "prezzo-chiaro", gruppo: "commerciali", nome: "Prezzo chiaro",
    cosa: "Quanto costa e cosa comprende, senza giri di parole." },
  { id: "promo", gruppo: "commerciali", nome: "Promozione con scadenza",
    cosa: "Meccanica precisa e data di fine: senza scadenza non muove nessuno." },
  { id: "obiezione-prezzo", gruppo: "commerciali", nome: "Non scegliere solo per il prezzo",
    cosa: "Smonta l'obiezione più comune spostando il discorso sul valore." },
  { id: "servizio-senza-vincoli", gruppo: "commerciali", nome: "Come funziona da noi",
    cosa: "Comodato, assistenza, garanzie: togliere attrito prima dell'acquisto." },
  // --- interattivi --------------------------------------------------------
  { id: "quiz", gruppo: "interattivi", nome: "Quiz al pubblico",
    cosa: "Domanda con risposta nei commenti: fa interagire e allarga la portata." },
  { id: "serie", gruppo: "interattivi", nome: "Puntata con seguito",
    cosa: "Prima parte e soluzioni nel contenuto successivo: fa tornare." },
  { id: "intervista-raffica", gruppo: "interattivi", nome: "Intervista a raffica",
    cosa: "Voce fuori campo che fa domande, risposte anche solo con un cenno." },
  { id: "sketch", gruppo: "interattivi", nome: "Scenetta",
    cosa: "Piccola messa in scena con sovrimpressioni, chiusura col prodotto." },
  { id: "dietro-le-quinte", gruppo: "interattivi", nome: "Dietro le quinte",
    cosa: "Un ordine vero in preparazione: porta contatti più di quanto sembri." },
  { id: "rubrica", gruppo: "interattivi", nome: "Rubrica ricorrente",
    cosa: "Un appuntamento fisso col nome di chi lo conduce." },
  { id: "tutorial", gruppo: "interattivi", nome: "Tutorial",
    cosa: "Come si fa, passo passo, con invito a salvare il contenuto." },
  // --- relazione e stagionalità -------------------------------------------
  { id: "stagionale", gruppo: "stagionali", nome: "Legato alla stagione",
    cosa: "Il problema tipico di questo periodo dell'anno e come risolverlo." },
  { id: "ricorrenza", gruppo: "stagionali", nome: "Ricorrenza",
    cosa: "Festa o data speciale con una proposta dedicata." },
  { id: "evento", gruppo: "stagionali", nome: "Evento o corso",
    cosa: "Data, orario, costo, posti limitati, come prenotare." },
  { id: "consiglio-personale", gruppo: "stagionali", nome: "Cosa farei io",
    cosa: "Consiglio in prima persona, tono confidenziale." },
  { id: "testimonianze", gruppo: "stagionali", nome: "Testimonianze e prima/dopo",
    cosa: "Parole dei clienti o risultati mostrati, senza promesse." },
  { id: "emergenza", gruppo: "stagionali", nome: "Salva il nostro numero",
    cosa: "Per servizi che servono nel momento del bisogno." },
  { id: "nuovo-spazio", gruppo: "stagionali", nome: "Nuova sede o spazio rinnovato",
    cosa: "Un cambiamento fisico dell'attività, raccontato come crescita." },
  { id: "atmosfera", gruppo: "stagionali", nome: "Solo atmosfera",
    cosa: "Nessun parlato: indicazioni su cosa deve far sentire il video." },
];

export const perId = (id) => FORMAT.find((f) => f.id === id) || null;

/** Il repertorio in forma compatta, da mettere nel prompt. */
export function elencoPerPrompt(escludi = []) {
  const fuori = new Set(escludi);
  return FORMAT.filter((f) => !fuori.has(f.id))
    .map((f) => `- ${f.id} — ${f.nome}: ${f.cosa}`)
    .join("\n");
}
