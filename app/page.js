"use client";

import { useEffect, useState } from "react";
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
              <Tool icon="✍️" t="Copy" d="Didascalie dalle foto nuove (Claude vede le foto)" mod="copy" active={activeModule} onSelect={setActiveModule} />
              <Tool icon="🏷️" t="Promo" d="Idee promo dell'agente (cartella /PROMO)" mod="promo" active={activeModule} onSelect={setActiveModule} />
              <Tool icon="🎨" t="Grafica" d="Copertine e visual col brand del cliente" mod="grafica" active={activeModule} onSelect={setActiveModule} />
              <Tool icon="📊" t="Report" d="Andamento dai numeri di Business Suite" mod="report" active={activeModule} onSelect={setActiveModule} />
              <Tool icon="📸" t="Foto Studio ↗" d="Migliora le foto grezze per i social" href={EXTERNAL.foto} />
              <Tool icon="🎬" t="Idee Shooting ↗" d="Idee di scatto + brief PDF" href={EXTERNAL.shooting} />
            </div>

            {activeModule === "copy" && <Copy clientName={current} />}
            {activeModule === "promo" && <Promo clientName={current} />}
            {activeModule === "grafica" && <Grafica clientName={current} />}
            {activeModule === "report" && <Report clientName={current} />}

            {!activeModule && (
              <p className="note">Scegli uno strumento qui sopra. Il contesto del cliente è già caricato da Dropbox.</p>
            )}
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
