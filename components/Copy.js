"use client";

import { useState } from "react";

export default function Copy({ clientName }) {
  const [path, setPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const generate = () => {
    if (!path.trim()) return;
    setLoading(true);
    setResult(null);
    fetch("/api/copy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: clientName, path: path.trim() }),
    })
      .then((r) => r.json())
      .then((d) => setResult(d))
      .catch((e) => setResult({ error: String(e) }))
      .finally(() => setLoading(false));
  };

  const copyText = (t, btn) => {
    if (navigator.clipboard) navigator.clipboard.writeText(t);
    const el = btn.currentTarget;
    const old = el.textContent;
    el.textContent = "✓ Copiato";
    setTimeout(() => (el.textContent = old), 1600);
  };

  return (
    <div className="mod">
      <div className="modHead">
        <div><b>Copy — {clientName}</b><span className="modSub">Claude vede le foto e scrive · voce dal dossier</span></div>
      </div>

      <div className="copyForm">
        <label>📎 Percorso della cartella con le foto (dentro Dropbox)</label>
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/NORCIA IN TAVOLA/072026 - NUOVI VIDEO ..."
        />
        <p className="hint">
          Incolla il percorso della cartella Dropbox con i contenuti nuovi. L&apos;app apre la cartella,
          <b> vede</b> ogni foto e scrive una didascalia corta (2-3 frasi + CTA) con la voce del cliente.
          Per ora legge le <b>foto</b> (jpg/png); i video arrivano più avanti.
        </p>
        <div style={{ marginTop: 14 }}>
          <button className="btn primary" onClick={generate} disabled={loading}>
            {loading ? "Genero… (Claude sta guardando le foto)" : "Genera copy →"}
          </button>
        </div>
      </div>

      {result && result.error && (
        <div className="empty">⚠️ {result.error}</div>
      )}
      {result && result.note && (
        <div className="empty">{result.note}</div>
      )}
      {result && result.captions && result.captions.map((c, i) => (
        <div className="post" key={i}>
          <div className="thumb">
            {c.imageUrl ? <img src={c.imageUrl} alt="" /> : null}
            <span className="fn">{c.name}</span>
          </div>
          <div>
            <div className="cap">{c.caption}</div>
            <button className="copybtn" onClick={(e) => copyText(c.caption, e)}>⧉ Copia didascalia</button>
          </div>
        </div>
      ))}
    </div>
  );
}
