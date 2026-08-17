"use client";

import { useEffect, useState } from "react";

export default function Promo({ clientName }) {
  const [files, setFiles] = useState(null);
  const [error, setError] = useState(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setFiles(null);
    setError(null);
    setIdx(0);
    fetch(`/api/promo?name=${encodeURIComponent(clientName)}`)
      .then((r) => r.json())
      .then((d) => {
        // Errore di lettura ≠ cartella vuota: vanno distinti, altrimenti un
        // problema Dropbox sembra "l'agente non ha ancora generato niente".
        if (d.error) setError(d.error);
        setFiles(d.files || []);
      })
      .catch((e) => {
        setError(String(e && e.message ? e.message : e));
        setFiles([]);
      });
  }, [clientName]);

  if (files === null)
    return <div className="mod"><p className="note">Carico le promo da Dropbox…</p></div>;

  if (error)
    return (
      <div className="mod">
        <div className="modHead"><b>Promo — {clientName}</b><span className="modSub">cartella Dropbox /PROMO</span></div>
        <div className="empty">
          ⚠ Non riesco a leggere Dropbox, quindi non so se ci sono promo per questo cliente.<br />
          Dettaglio tecnico: <b>{error}</b>
        </div>
      </div>
    );

  if (files.length === 0)
    return (
      <div className="mod">
        <div className="modHead"><b>Promo — {clientName}</b><span className="modSub">cartella Dropbox /PROMO</span></div>
        <div className="empty">
          L&apos;agente Promo non ha ancora depositato file per questo cliente.<br />
          Quando li genera, i file <b>PROMO-IDEE-AAAA-MM.md</b> compaiono qui in automatico.
        </div>
      </div>
    );

  return (
    <div className="mod">
      <div className="modHead">
        <div><b>Promo — {clientName}</b><span className="modSub">generate dall&apos;agente · Dropbox /PROMO</span></div>
        <div className="tabs">
          {files.map((f, i) => (
            <button key={f.name} className={"tab" + (i === idx ? " on" : "")} onClick={() => setIdx(i)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mdbox" dangerouslySetInnerHTML={{ __html: mdLite(files[idx].content) }} />
    </div>
  );
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
}
function mdLite(md) {
  let out = "", inP = false;
  const closeP = () => { if (inP) { out += "</p>"; inP = false; } };
  (md || "").split("\n").forEach((raw) => {
    const l = raw.trim();
    if (l === "") { closeP(); return; }
    if (l === "---") { closeP(); out += "<hr>"; return; }
    const h = l.match(/^(#{1,4})\s+(.*)/);
    if (h) { closeP(); const lvl = Math.min(h[1].length + 2, 5); out += `<h${lvl}>${inline(h[2])}</h${lvl}>`; return; }
    if (l.startsWith("- ")) { closeP(); out += `<div class="li">• ${inline(l.slice(2))}</div>`; return; }
    if (!inP) { out += "<p>"; inP = true; } else { out += " "; }
    out += inline(l);
  });
  closeP();
  return out;
}
