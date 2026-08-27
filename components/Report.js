"use client";

import { useState } from "react";

const PASSO_PREDEFINITO =
  "Proseguiamo sul filone di contenuti che ha generato più interazioni e sosteniamo la copertura con una campagna nei periodi forti.";

export default function Report({ clientName }) {
  const [m, setM] = useState({
    per: "Luglio 2026",
    reach: "18.400",
    reachd: "+23%",
    fol: "+214",
    int: "3.120",
    vis: "1.050",
    top: "Reel del prodotto — 42.000 visualizzazioni",
    attivita: "",
    passo: PASSO_PREDEFINITO,
    nota: "",
    firma: "",
  });
  const [done, setDone] = useState(false);
  const [scarico, setScarico] = useState(false);
  const [errore, setErrore] = useState("");
  const set = (k) => (e) => setM({ ...m, [k]: e.target.value });
  const voci = m.attivita.split("\n").map((v) => v.trim()).filter(Boolean);

  // Chiede il PDF al server e lo consegna al browser come file vero.
  async function scaricaPdf() {
    setScarico(true); setErrore("");
    try {
      const res = await fetch("/api/report-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente: clientName, ...m }),
      });
      if (!res.ok) throw new Error("Il server non è riuscito a creare il PDF.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Report ${clientName} ${m.per}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      setErrore(String(e && e.message ? e.message : e));
    } finally {
      setScarico(false);
    }
  }

  return (
    <div className="mod">
      <div className="modHead">
        <div><b>Report andamento — {clientName}</b><span className="modSub">i numeri da Business Suite, il resto lo scrivi tu</span></div>
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

            <Area
              label="Cosa abbiamo fatto"
              nota="Una riga per attività: diventano un elenco puntato nel PDF. Es. “3 shooting in negozio”, “12 contenuti pubblicati”, “campagna sull'offerta di agosto”."
              v={m.attivita}
              on={set("attivita")}
              righe={4}
              placeholder={"12 contenuti pubblicati tra post e reel\nShooting dedicato ai nuovi arrivi\nCampagna advertising sulla promo di fine stagione"}
            />
            <Area
              label="Cosa proponiamo adesso"
              nota="La proposta per il periodo che viene: è la parte che il cliente legge più volentieri."
              v={m.passo}
              on={set("passo")}
              righe={3}
            />
            <Area
              label="Una nota per il cliente (facoltativa)"
              nota="Due righe personali, come le diresti al telefono. Nel PDF escono in corsivo."
              v={m.nota}
              on={set("nota")}
              righe={3}
            />
            <Fld label="Firma (facoltativa)" v={m.firma} on={set("firma")} placeholder="Luisa — MiglioriAmo" />
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
            {voci.length ? (
              <>
                <div className="secLab">Cosa abbiamo fatto</div>
                <ul className="attList">{voci.map((v, i) => <li key={i}>{v}</li>)}</ul>
              </>
            ) : null}

            {m.top ? (
              <>
                <div className="secLab">Il contenuto che ha funzionato meglio</div>
                <p>{m.top}</p>
              </>
            ) : null}

            <div className="secLab">Come leggiamo questi numeri</div>
            <p>
              A {m.per.toLowerCase()} il profilo di <b>{clientName}</b> ha raggiunto <b>{m.reach}</b> persone
              ({m.reachd} rispetto al periodo precedente), con <b>{m.fol}</b> nuovi follower e <b>{m.int}</b> interazioni.
              Le visite al profilo (<b>{m.vis}</b>) sono il segnale più vicino al negozio: sono le persone che, dopo aver
              visto un contenuto, hanno voluto sapere chi siete.
            </p>

            {m.passo ? <p className="sug">Cosa proponiamo adesso: {m.passo}</p> : null}
            {m.nota ? <p className="notaCli">“{m.nota}”{m.firma ? <span> — {m.firma}</span> : null}</p> : null}
          </div>

          <div className="modBtns">
            <button className="btn" onClick={() => setDone(false)}>← Modifica</button>
            <button className="btn primary" onClick={scaricaPdf} disabled={scarico}>
              {scarico ? "Preparo il PDF…" : "📄 Scarica il PDF"}
            </button>
          </div>
          {errore ? <div className="empty">⚠️ {errore}</div> : null}
        </>
      )}
    </div>
  );
}

function Fld({ label, v, on, wide, placeholder }) {
  return (
    <div className={"fld2" + (wide ? " wide" : "")}>
      <label>{label}</label>
      <input value={v} onChange={on} placeholder={placeholder} />
    </div>
  );
}
function Area({ label, nota, v, on, righe = 3, placeholder }) {
  return (
    <div className="fld2 wide">
      <label>{label}</label>
      {nota ? <div className="fldNota">{nota}</div> : null}
      <textarea value={v} onChange={on} rows={righe} placeholder={placeholder} />
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
