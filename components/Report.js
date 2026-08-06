"use client";

import { useState } from "react";

export default function Report({ clientName }) {
  const [m, setM] = useState({
    per: "Luglio 2026",
    reach: "18.400",
    reachd: "+23%",
    fol: "+214",
    int: "3.120",
    vis: "1.050",
    top: "Reel del prodotto — 42.000 visualizzazioni",
  });
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setM({ ...m, [k]: e.target.value });

  return (
    <div className="mod">
      <div className="modHead">
        <div><b>Report andamento — {clientName}</b><span className="modSub">incolla i numeri da Meta Business Suite</span></div>
      </div>

      {!done ? (
        <>
          <div className="form">
            <Fld label="Periodo" v={m.per} on={set("per")} />
            <Fld label="Copertura (persone raggiunte)" v={m.reach} on={set("reach")} />
            <Fld label="Variazione copertura" v={m.reachd} on={set("reachd")} />
            <Fld label="Nuovi follower" v={m.fol} on={set("fol")} />
            <Fld label="Interazioni" v={m.int} on={set("int")} />
            <Fld label="Visite al profilo" v={m.vis} on={set("vis")} />
            <Fld label="Contenuto migliore" v={m.top} on={set("top")} wide />
          </div>
          <div className="modBtns">
            <button className="btn primary" onClick={() => setDone(true)}>Genera report →</button>
          </div>
        </>
      ) : (
        <>
          <div className="stats">
            <Tile l="Copertura" v={m.reach} d={m.reachd} />
            <Tile l="Nuovi follower" v={m.fol} />
            <Tile l="Interazioni" v={m.int} />
            <Tile l="Visite profilo" v={m.vis} />
          </div>
          <div className="commentary">
            <p>
              A {m.per.toLowerCase()} il profilo di <b>{clientName}</b> ha raggiunto <b>{m.reach}</b> persone
              (<b>{m.reachd}</b> rispetto al mese scorso), con <b>{m.fol}</b> nuovi follower e <b>{m.int}</b> interazioni.
              Il contenuto che ha funzionato meglio è stato <b>{m.top}</b>.
            </p>
            <p className="sug">💡 Prossimo passo: proporre più contenuti sul filone che ha generato interazioni e sostenere la copertura con una campagna sui periodi forti del cliente.</p>
          </div>
          <div className="modBtns">
            <button className="btn" onClick={() => setDone(false)}>← Modifica numeri</button>
            <button className="btn" onClick={() => alert("Nell'app vera: salvataggio su Dropbox output/report/ + PDF brandizzato")}>📄 Esporta PDF</button>
          </div>
        </>
      )}
    </div>
  );
}

function Fld({ label, v, on, wide }) {
  return (
    <div className={"fld2" + (wide ? " wide" : "")}>
      <label>{label}</label>
      <input value={v} onChange={on} />
    </div>
  );
}
function Tile({ l, v, d }) {
  return (
    <div className="tile">
      <div className="tl">{l}</div>
      <div className="tv">{v}</div>
      {d ? <div className="tl" style={{ color: "var(--good)", marginTop: 4 }}>{d}</div> : null}
    </div>
  );
}
