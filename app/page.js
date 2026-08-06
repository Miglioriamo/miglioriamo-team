"use client";

import { useEffect, useState } from "react";

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
    setDetailLoading(true);
    setDetail(null);
    fetch(`/api/client?name=${encodeURIComponent(current)}`)
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [current]);

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <div className="mark">M</div>
          <div>
            <div className="bname">MiglioriAmo Studio</div>
            <div className="bsub">Ambiente di lavoro</div>
          </div>
        </div>

        <div className="clientsWrap">
          <div className="navlabel">
            I tuoi clienti · {clients.length}
            {source === "mock" ? " (demo)" : ""}
          </div>
          <ul className="clients">
            {clients.map((c) => (
              <li key={c.name}>
                <button
                  className={"cbtn" + (c.name === current ? " active" : "")}
                  onClick={() => setCurrent(c.name)}
                >
                  <span className="dot" />
                  <span className="cname">{c.name}</span>
                </button>
              </li>
            ))}
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
                <div className="avatar">{current[0]}</div>
                <div>
                  <div className="ctitle">{current}</div>
                  <div className="cmeta">Cliente · contesto letto da Dropbox</div>
                </div>
              </div>
              <Missing detail={detail} loading={detailLoading} />
            </div>

            <div className="sech">Strumenti</div>
            <div className="tools">
              <Tool icon="✍️" t="Copy" d="Didascalie dai contenuti nuovi" soon />
              <Tool icon="🏷️" t="Promo" d="Idee promo dell'agente (cartella /PROMO)" soon />
              <Tool icon="🎨" t="Grafica" d="Copertine e visual col brand del cliente" soon />
              <Tool icon="📊" t="Report" d="Andamento organico dai numeri Business Suite" soon />
              <Tool icon="📸" t="Foto Studio ↗" d="Migliora le foto grezze per i social" href={EXTERNAL.foto} />
              <Tool icon="🎬" t="Idee Shooting ↗" d="Idee di scatto + brief PDF" href={EXTERNAL.shooting} />
            </div>

            <p className="note">
              Fase 1 · l&apos;hub legge i clienti{" "}
              {source === "dropbox"
                ? "dal vivo da Dropbox."
                : "in modalità demo (nessun token Dropbox impostato — vedi README)."}{" "}
              I moduli AI si agganciano nelle prossime fasi.
            </p>
          </>
        ) : (
          <p className="note">Nessun cliente trovato.</p>
        )}
      </main>
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

function Tool({ icon, t, d, href, soon }) {
  const onClick = () => {
    if (href) window.open(href, "_blank", "noopener");
    else alert(`${t} — modulo in arrivo (prossima fase)`);
  };
  return (
    <button className="tool" onClick={onClick}>
      <div className="tic">{icon}</div>
      <div className="tt">{t}</div>
      <div className="td">{d}</div>
      {soon ? (
        <span className="badge">Prossima fase</span>
      ) : (
        <span className="badge muted">App collegata</span>
      )}
    </button>
  );
}
