"use client";

import { useEffect, useRef, useState } from "react";
import Copy from "../components/Copy";
import Promo from "../components/Promo";
import Grafica from "../components/Grafica";
import Report from "../components/Report";

const EXTERNAL = {
  foto: "https://foto-studio-miglioriamo.netlify.app",
  shooting: "https://shooting-app-three.vercel.app",
};

export default function Home() {
  const [clients, setClients] = useState([]);
  const [source, setSource] = useState("");
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeModule, setActiveModule] = useState(null);
  const [lavori, setLavori] = useState(null);
  const [q, setQ] = useState(""); // filtro sull'elenco clienti
  const [menu, setMenu] = useState(false); // su cellulare l'elenco parte chiuso
  const modRef = useRef(null);

  // Su cellulare il modulo nasce sotto sei schede: senza questo bisognerebbe
  // scorrere parecchio per capire che qualcosa è successo.
  useEffect(() => {
    if (!activeModule || !modRef.current) return;
    modRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeModule]);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => {
        setClients(d.clients || []);
        setSource(d.source || "");
        if (d.clients && d.clients.length) setCurrent(d.clients[0].name);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!current) return;
    setActiveModule(null);
    setDetailLoading(true);
    setDetail(null);
    fetch(`/api/client?name=${encodeURIComponent(current)}`)
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));

    // Cosa abbiamo già prodotto per questo cliente (legge output/ su Dropbox).
    setLavori(null);
    fetch(`/api/lavori?name=${encodeURIComponent(current)}`)
      .then((r) => r.json())
      .then((d) => setLavori(d.lavori ? d : { lavori: [], totale: 0 }))
      .catch(() => setLavori({ lavori: [], totale: 0 }));
  }, [current]);

  const visibili = q.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()))
    : clients;

  const scegli = (nome) => {
    setCurrent(nome);
    setMenu(false); // su cellulare l'elenco si richiude e si vede subito il cliente
  };

  return (
    <div className="app">
      <aside className={"side" + (menu ? " open" : "")}>
        <div className="brand">
          <div className="mark">M</div>
          <div>
            <div className="bname">MiglioriAmo Studio</div>
            <div className="bsub">Ambiente di lavoro</div>
          </div>
          {/* solo su cellulare: apre/chiude l'elenco clienti */}
          <button className="menuBtn" onClick={() => setMenu(!menu)} aria-expanded={menu}>
            {menu ? "Chiudi" : current || "Scegli cliente"} <span aria-hidden="true">{menu ? "▲" : "▼"}</span>
          </button>
        </div>

        <div className="clientsWrap">
          <div className="navlabel">
            I tuoi clienti · {clients.length}
            {source === "mock" ? " (demo)" : ""}
          </div>
          <input
            className="csearch"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca cliente…"
            aria-label="Cerca cliente"
          />
          <ul className="clients">
            {visibili.map((c) => (
              <li key={c.name}>
                <button
                  className={"cbtn" + (c.name === current ? " active" : "")}
                  onClick={() => scegli(c.name)}
                >
                  <span className="dot" />
                  <span className="cname">{c.name}</span>
                </button>
              </li>
            ))}
            {!visibili.length && <li className="nores">Nessun cliente con questo nome.</li>}
          </ul>
        </div>

        <div className="sidefoot">
          <div className="mark sm">M</div>
          <div>
            <div className="footname">MiglioriAmo</div>
            <div className="footsub">Agenzia di marketing con l&apos;AI</div>
          </div>
        </div>
      </aside>

      <main className="main">
        {loading ? (
          <p className="note">Caricamento clienti…</p>
        ) : current ? (
          <>
            <div className="chead">
              <div className="cheadTop">
                {detail?.have?.logo ? (
                  <img className="avatar avatarImg" src={`/api/logo?name=${encodeURIComponent(current)}`} alt="" />
                ) : (
                  <div className="avatar">{current[0]}</div>
                )}
                <div>
                  <div className="ctitle">{current}</div>
                  <div className="cmeta">Cliente · contesto letto da Dropbox</div>
                </div>
              </div>
              <Missing detail={detail} loading={detailLoading} />
            </div>

            <div className="sech">Strumenti</div>
            <div className="tools">
              <Tool icon="✍️" t="Copy" d="Didascalie dai contenuti nuovi (foto e video)" mod="copy" active={activeModule} onSelect={setActiveModule} />
              <Tool icon="🏷️" t="Promo" d="Idee promo dell'agente (cartella /PROMO)" mod="promo" active={activeModule} onSelect={setActiveModule} />
              <Tool icon="🎨" t="Grafica" d="Copertine e visual col brand del cliente" mod="grafica" active={activeModule} onSelect={setActiveModule} />
              <Tool icon="📊" t="Report" d="Andamento dai numeri di Business Suite" mod="report" active={activeModule} onSelect={setActiveModule} />
              <Tool icon="📸" t="Foto Studio ↗" d="Migliora le foto grezze per i social" href={EXTERNAL.foto} />
              <Tool icon="🎬" t="Idee Shooting ↗" d="Idee di scatto + brief PDF" href={EXTERNAL.shooting} />
            </div>

            <div ref={modRef} style={{ scrollMarginTop: 76 }}>
              {activeModule === "copy" && <Copy clientName={current} />}
              {activeModule === "promo" && <Promo clientName={current} />}
              {activeModule === "grafica" && <Grafica clientName={current} />}
              {activeModule === "report" && <Report clientName={current} />}
            </div>

            {!activeModule && <Lavori dati={lavori} cliente={current} />}
          </>
        ) : (
          <p className="note">Nessun cliente trovato.</p>
        )}
      </main>
    </div>
  );
}

const ETICHETTE = { copy: "Copy", grafica: "Grafica", report: "Report", shooting: "Idee shooting", promo: "Promo" };
const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
function meseEsteso(m) {
  const x = /^(\d{4})-(\d{2})$/.exec(m || "");
  return x ? `${MESI[+x[2] - 1]} ${x[1]}` : m;
}

/** Cosa abbiamo consegnato a questo cliente: prima era spazio vuoto. */
function Lavori({ dati, cliente }) {
  if (dati === null) return <p className="note">Guardo cosa abbiamo già fatto per {cliente}…</p>;

  if (!dati.totale)
    return (
      <div className="lavori vuoto">
        <div className="lavTitolo">Ancora nessun lavoro archiviato</div>
        <p className="note">
          Quello che generi qui sopra finisce nella cartella Dropbox di {cliente} e da quel momento
          compare in questo elenco: è lo storico di cosa gli avete consegnato.
        </p>
      </div>
    );

  return (
    <div className="lavori">
      <div className="lavHead">
        <div className="lavTitolo">Cosa abbiamo prodotto</div>
        <div className="lavConta">
          {Object.entries(dati.conteggi || {}).map(([t, n]) => (
            <span key={t} className="lavChip">{ETICHETTE[t] || t} · {n}</span>
          ))}
        </div>
      </div>
      <ul className="lavLista">
        {dati.lavori.map((l, i) => (
          <li key={i}>
            <span className="lavTipo">{ETICHETTE[l.tipo] || l.tipo}</span>
            <span className="lavNome">{l.nome}</span>
            <span className="lavMese">{meseEsteso(l.mese)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Missing({ detail, loading }) {
  if (loading)
    return (
      <div className="missing">
        <span className="mnote">Controllo i file del cliente su Dropbox…</span>
      </div>
    );
  if (!detail || !detail.have) return null;
  // Se Dropbox non ha risposto, i file ci sono ma noi non li vediamo: va detto,
  // altrimenti sembra che manchi tutto nella cartella del cliente.
  if (detail.source === "mock" && detail.error)
    return (
      <div className="missing">
        <span className="mk-no">⚠ Dropbox non raggiungibile</span>
        <div className="mnote">
          Non riesco a leggere la cartella del cliente, quindi non posso dire cosa manca.
          Dettaglio tecnico: <b>{detail.error}</b>
        </div>
      </div>
    );
  const CHECKS = [
    ["dossier", "Contesto"],
    ["promo", "Contesto promo"],
    ["cta", "CTA"],
    ["logo", "Logo cliente"],
  ];
  const missing = CHECKS.filter(([k]) => !detail.have[k]).map(([, l]) => l);
  return (
    <div className="missing">
      {CHECKS.map(([k, l]) =>
        detail.have[k] ? (
          <span key={k} className="mk-ok">✓ {l}</span>
        ) : (
          <span key={k} className="mk-no">⚠ {l}</span>
        )
      )}
      <div className="mnote">
        {missing.length ? (
          <>
            Da aggiungere nella cartella Dropbox: <b>{missing.join(", ")}</b> — più ogni cosa
            utile (foto, orari, listino, indirizzo).
          </>
        ) : (
          <>Cartella cliente completa ✓</>
        )}
      </div>
    </div>
  );
}

function Tool({ icon, t, d, href, mod, active, onSelect }) {
  const isActive = mod && active === mod;
  const onClick = () => {
    if (href) window.open(href, "_blank", "noopener");
    else if (mod && onSelect) onSelect(isActive ? null : mod);
  };
  return (
    <button className={"tool" + (isActive ? " toolActive" : "")} onClick={onClick}>
      <div className="tic">{icon}</div>
      <div className="tt">{t}</div>
      <div className="td">{d}</div>
      {href ? (
        <span className="badge muted">App collegata</span>
      ) : (
        <span className="badge">{isActive ? "Aperto ✓" : "Apri"}</span>
      )}
    </button>
  );
}
