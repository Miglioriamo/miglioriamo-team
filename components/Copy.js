"use client";

import { useState } from "react";

const ETICHETTA = { specifico: "specifico", categoria: "categoria", generico: "generico" };

/** Quanti copy sono usciti precisi, e se non lo sono, perché. */
function Riepilogo({ captions, fascicolo }) {
  const conta = { specifico: 0, categoria: 0, generico: 0 };
  captions.forEach((c) => { if (c.registro) conta[c.registro] = (conta[c.registro] || 0) + 1; });
  const totale = conta.specifico + conta.categoria + conta.generico;
  if (!totale) return null;
  const manca = [];
  if (fascicolo && !fascicolo.dati) manca.push("i dati operativi");
  if (fascicolo && !fascicolo.cta) manca.push("le CTA");
  if (fascicolo && !fascicolo.paletti) manca.push("i paletti");

  return (
    <div className="riep">
      <div className="riepConta">
        <span className="regTag reg-specifico">{conta.specifico} specifici</span>
        <span className="regTag reg-categoria">{conta.categoria} di categoria</span>
        <span className="regTag reg-generico">{conta.generico} generici</span>
      </div>
      {conta.specifico < totale ? (
        <p className="hint">
          I copy non specifici escono così quando manca l&apos;informazione su cosa sia il contenuto:
          scrivi due parole nel campo qui sopra, o rinomina i file su Dropbox.
          {manca.length ? ` Nel fascicolo di questo cliente mancano ${manca.join(", ")}.` : ""}
        </p>
      ) : null}
    </div>
  );
}

export default function Copy({ clientName }) {
  const [path, setPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [commento, setCommento] = useState("");

  const generate = (target, skip) => {
    const wanted = (typeof target === "string" ? target : path).trim();
    if (!wanted) return;
    if (wanted !== path) setPath(wanted);
    setLoading(true);
    setResult(null);
    fetch("/api/copy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: clientName, path: wanted, skip, commento }),
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
        <div className="modTitle"><b>Copy — {clientName}</b><span className="modSub">Claude guarda foto e video e scrive · voce dal dossier</span></div>
      </div>

      <div className="copyForm">
        <label>📎 Cosa vuoi far guardare a Claude — link Dropbox o percorso</label>
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          placeholder="link Dropbox, oppure /CLIENTE/cartella"
        />
        <p className="hint">
          Su Dropbox tasto destro → <b>Copia link</b>, e incollalo qui. Va bene il link di una{" "}
          <b>cartella</b> (anche con un solo file dentro) oppure di un <b>singolo video o foto</b>;
          in alternativa il <b>percorso</b> (es. <i>/NORCIA IN TAVOLA/082026 - NUOVI VIDEO</i>).
          Se la cartella contiene solo sottocartelle, l&apos;app te le propone da cliccare.
          Legge <b>foto</b> (jpg, png, heic), <b>RAW</b> di macchina fotografica (arw, cr2, nef…)
          e <b>video</b>, di cui guarda tre momenti: inizio, metà e finale.
        </p>
        <label style={{ marginTop: 16 }}>🗣️ Cosa c&apos;è in questi contenuti (facoltativo, ma cambia tutto)</label>
        <input
          value={commento}
          onChange={(e) => setCommento(e.target.value)}
          placeholder="shooting coppe estive: banana split, coppa amarena, affogato"
        />
        <p className="hint">
          Trenta secondi di appunti coprono tutte le foto del gruppo. Se scrivi cosa sono,
          le didascalie escono <b>specifiche</b> invece che generiche.
        </p>
        <div style={{ marginTop: 14 }}>
          <button className="btn primary" onClick={() => generate()} disabled={loading}>
            {loading ? "Genero… (Claude sta guardando i contenuti)" : "Genera copy →"}
          </button>
        </div>
      </div>

      {result && result.error && (
        <div className="empty">⚠️ {result.error}</div>
      )}
      {result && result.note && (
        <div className="empty">{result.note}</div>
      )}
      {result && result.subfolders && result.subfolders.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {result.subfolders.map((s) => (
            <button
              key={s.path}
              className="btn"
              disabled={loading}
              onClick={() => generate(s.path)}
              title={s.path}
            >
              📁 {s.name}
              <span style={{ opacity: 0.6 }}>
                {" "}· {[s.foto ? `${s.foto} foto` : null, s.video ? `${s.video} video` : null].filter(Boolean).join(" · ")}
              </span>
            </button>
          ))}
        </div>
      )}
      {result && result.next && !result.error && (
        <div style={{ marginTop: 14 }}>
          <button className="btn" disabled={loading} onClick={() => generate(result.folder, result.next)}>
            {loading ? "Genero…" : `Continua con ${result.restano} →`}
          </button>
        </div>
      )}
      {result && result.folder && !result.error && (
        <p className="hint" style={{ marginTop: 10 }}>Cartella letta: <b>{result.folder}</b></p>
      )}
      {result && result.captions && result.captions.length > 0 && (
        <Riepilogo captions={result.captions} fascicolo={result.fascicolo} />
      )}
      {result && result.captions && result.captions.map((c, i) => (
        <div className="post" key={i}>
          <div className="thumb">
            {c.preview ? <img src={c.preview} alt="" /> : null}
            <span className="fn">
              {c.kind === "video" ? "▶ " : ""}{c.name}
              {c.seconds ? ` · ${Math.round(c.seconds)}s` : ""}
            </span>
          </div>
          <div>
            {c.registro ? (
              <div className="reg">
                <span className={"regTag reg-" + c.registro}>{ETICHETTA[c.registro] || c.registro}</span>
                {c.motivo ? <span className="regMot">{c.motivo}</span> : null}
              </div>
            ) : null}
            <div className="cap">{c.caption}</div>
            <button className="copybtn" onClick={(e) => copyText(c.caption, e)}>⧉ Copia didascalia</button>
          </div>
        </div>
      ))}
    </div>
  );
}
