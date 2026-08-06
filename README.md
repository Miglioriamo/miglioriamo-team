# MiglioriAmo Studio

Ambiente di lavoro interno dell'agenzia: scelto un cliente, si accede ai suoi **contesti** (letti da Dropbox) e agli **strumenti AI** (copy, promo, grafica, report). Le web app **Foto Studio** e **Idee Shooting** si aprono da qui via link.

Stack: **Next.js (App Router)** — pensato per il deploy su **Vercel**.

---

## Stato: Fase 1 (fondamenta)

Cosa fa già:
- **Hub** con sidebar clienti + scheda cliente + griglia strumenti.
- **Lettura clienti da Dropbox** (`/api/clients`): elenca le sottocartelle della cartella dei contesti. Senza credenziali gira in **modalità demo** con clienti finti.
- **Foto/Shooting** collegati alle web app esistenti.

Prossime fasi (da costruire): lettura contesto/dossier + indicatore "cosa manca", modulo **Copy** (Claude + vision), **Promo** (legge `/PROMO`), **Grafica**, **Report**, contatori/checklist condivisi (database).

---

## Avvio in locale

Serve **Node.js 18+** (installa da https://nodejs.org).

```bash
npm install
cp .env.local.example .env.local   # poi compila i valori (vedi sotto)
npm run dev                        # apre http://localhost:3000
```

Senza `.env.local` l'app parte comunque, in **modalità demo**.

---

## Variabili d'ambiente

Vedi `.env.local.example`. Le principali:

| Variabile | A cosa serve |
|---|---|
| `DROPBOX_REFRESH_TOKEN` + `DROPBOX_APP_KEY` + `DROPBOX_APP_SECRET` | Auth Dropbox consigliata (non scade). |
| `DROPBOX_ACCESS_TOKEN` | Alternativa semplice (scade ~4h). |
| `DROPBOX_CONTEXTS_PATH` | Cartella dei contesti, es. `/MIGLIORIAMO/CLAUDE/Contesto cliente`. |
| `DROPBOX_NAMESPACE_ID` | Solo se la cartella è in uno spazio **team** (es. `2969074113`). |
| `ANTHROPIC_API_KEY` | Chiave Claude API (serve dalla Fase 2 per generare). |

### Come ottenere le credenziali Dropbox
1. Crea un'app su https://www.dropbox.com/developers/apps (tipo "Scoped access", permessi almeno `files.metadata.read` e `files.content.read`).
2. Prendi **App key** e **App secret**.
3. Genera un **refresh token** (flusso OAuth con `token_access_type=offline`).
4. Metti i valori nelle variabili d'ambiente.

---

## Deploy su Vercel
1. Carica questa cartella in un repo GitHub.
2. Su https://vercel.com → **New Project** → importa il repo.
3. In **Settings → Environment Variables** inserisci le variabili qui sopra.
4. Deploy. Poi **Settings → Domains** → collega `studio.miglioriamo.com` (aggiungi il record DNS che Vercel indica).

Non serve Node in locale per il deploy: Vercel compila da solo.

---

## Struttura
```
app/
  layout.js            layout + stile globale
  page.js              hub (sidebar clienti + scheda + strumenti)
  globals.css          stile brand (dark, arancione #F4AD15)
  api/clients/route.js API: elenco clienti da Dropbox (fallback demo)
lib/
  dropbox.js           helper Dropbox (auth + list_folder + download)
```
