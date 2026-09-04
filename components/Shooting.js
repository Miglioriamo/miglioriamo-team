"use client";

import { useState } from "react";

const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno",
              "luglio","agosto","settembre","ottobre","novembre","dicembre"];
const oggi = new Date();
const meseProssimo = `${MESI[(oggi.getMonth() + 1) % 12]} ${oggi.getMonth() === 11 ? oggi.getFullYear() + 1 : oggi.getFullYear()}`;

export default function Shooting({ clientName }) {
  const [obiettivo, setObiettivo] = useState("");
  const [mese, setMese] = useState(meseProssimo);
  const [indicazioni, setIndicazioni] = useState("");
  const [copioni, setCopioni] = useState(null);
  const [fascicolo, setFascicolo] = useState(null);
  const [precedenti, setPrecedenti] = useState([]);
  const [fase, setFase] = useState("form"); // form | lavoro | pronti
  const [errore, setErrore] = useState("");
  const [rigenero, setRigenero] = useState(null); // indice in rigenerazione
  const [nota, setNota] = useState({});           // note per singolo copione

  async function genera() {
    setFase("lavoro"); setErrore("");
    try {
      const res = await fetch("/api/shooting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente: clientName, obiettivo, mese, indicazioni }),
      });
      const d = await res.json();
      if (!res.ok || d.errore) throw new Error(d.errore || "non riesco a scrivere i copioni");
      setCopioni(d.copioni);
      setFascicolo(d.fascicolo);
      setPrecedenti(d.precedenti || []);
      setFase("pronti");
    } catch (e) {
      setErrore(String(e && e.message ? e.message : e));
      setFase("form");
    }
  }

  // Rigenera UN copione solo: gli altri restano esattamente come sono,
  // comprese le modifiche fatte a mano.
  async function rigenera(i) {
    setRigenero(i); setErrore("");
    try {
      const res = await fetch("/api/shooting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente: clientName, obiettivo, mese, indicazioni,
          rigenera: i, copioni, nota: nota[i] || "",
        }),
      });
      const d = await res.json();
      if (!res.ok || d.errore) throw new Error(d.errore || "non riesco a rifare questo copione");
      setCopioni((prec) => prec.map((c, k) => (k === i ? d.copione : c)));
      setNota((n) => ({ ...n, [i]: "" }));
    } catch (e) {
      setErrore(String(e && e.message ? e.message : e));
    } finally {
      setRigenero(null);
    }
  }

  const modifica = (i, campo) => (e) =>
    setCopioni((prec) => prec.map((c, k) => (k === i ? { ...c, [campo]: e.target.value } : c)));

  return (
    <div className="mod">
      <div className="modHead">
        <div>
          <b>Idee shooting — {clientName}</b>
          <span className="modSub">il contesto lo prende da solo dalla cartella del cliente</span>
        </div>
      </div>

      {fase === "form" ? (
        <>
          <div className="form">
            <div className="fld2 wide">
              <label>Obiettivo dello shooting</label>
              <div className="fldNota">Cosa deve ottenere questo giro di video. Es. “far conoscere i trattamenti cute”, “riempire i pranzi infrasettimanali”.</div>
              <input value={obiettivo} onChange={(e) => setObiettivo(e.target.value)} placeholder="far conoscere i nuovi arrivi" />
            </div>
            <div className="fld2">
              <label>Periodo</label>
              <input value={mese} onChange={(e) => setMese(e.target.value)} />
            </div>
            <div className="fld2 wide">
              <label>Indicazioni (facoltative)</label>
              <div className="fldNota">Quello che sai tu e l’app non può sapere: novità, promozioni in arrivo, cosa non riprendere, chi può stare in camera.</div>
              <textarea value={indicazioni} onChange={(e) => setIndicazioni(e.target.value)} rows={3}
                placeholder={"arriva la linea nuova per la cute\nil titolare preferisce non parlare in camera"} />
            </div>
          </div>
          {errore ? <div className="empty">⚠️ {errore}</div> : null}
          <div className="modBtns">
            <button className="btn primary" onClick={genera}>Scrivi i copioni →</button>
          </div>
        </>
      ) : fase === "lavoro" ? (
        <div className="empty">Sto leggendo il fascicolo di {clientName} e scrivendo i copioni…</div>
      ) : (
        <>
          <div className="cpInfo">
            <span className="lavChip">Contesto {fascicolo?.dossier ? "✓" : "assente"}</span>
            <span className="lavChip">Dati operativi {fascicolo?.dati ? "✓" : "assenti"}</span>
            <span className="lavChip">CTA {fascicolo?.cta ? "✓" : "assenti"}</span>
            <span className="lavChip">Paletti {fascicolo?.paletti ? "✓" : "assenti"}</span>
            {precedenti.length ? (
              <span className="lavChip">Shooting già fatti: {precedenti.length}</span>
            ) : null}
          </div>
          {fascicolo && !fascicolo.dati ? (
            <div className="empty">
              Nel fascicolo mancano i dati operativi: dove serviva un orario, un prezzo o un
              indirizzo troverai un segnaposto da riempire a mano.
            </div>
          ) : null}
          {errore ? <div className="empty">⚠️ {errore}</div> : null}

          {copioni.map((c, i) => (
            <div className="copione" key={i}>
              <div className="cpHead">
                <span className="cpNum">{i + 1}</span>
                <input className="cpTitolo" value={c.titolo} onChange={modifica(i, "titolo")} />
                <span className="cpFormat">{c.formatNome}</span>
              </div>

              <label className="cpLab">Gancio</label>
              <textarea rows={2} value={c.gancio} onChange={modifica(i, "gancio")} />

              <label className="cpLab">Script</label>
              <textarea rows={8} value={c.script} onChange={modifica(i, "script")} />

              <div className="cpDue">
                <div>
                  <label className="cpLab">Riprese</label>
                  <textarea rows={3} value={c.riprese} onChange={modifica(i, "riprese")} />
                </div>
                <div>
                  <label className="cpLab">Call to action</label>
                  <textarea rows={3} value={c.cta} onChange={modifica(i, "cta")} />
                </div>
              </div>

              <div className="cpAzioni">
                <input
                  className="cpNota"
                  placeholder="Cosa cambiare in questo copione (facoltativo)"
                  value={nota[i] || ""}
                  onChange={(e) => setNota((n) => ({ ...n, [i]: e.target.value }))}
                />
                <button className="btn" onClick={() => rigenera(i)} disabled={rigenero !== null}>
                  {rigenero === i ? "Lo rifaccio…" : "↻ Rifai solo questo"}
                </button>
              </div>
            </div>
          ))}

          <div className="modBtns">
            <button className="btn" onClick={() => setFase("form")}>← Cambia impostazioni</button>
            <button className="btn" onClick={genera} disabled={rigenero !== null}>↻ Rifai tutti</button>
          </div>
        </>
      )}
    </div>
  );
}
