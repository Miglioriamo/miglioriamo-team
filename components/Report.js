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
    attivita: "",
    passo: "",
    nota: "",
    firma: "",
  });
  const [adv, setAdv] = useState(false);          // il cliente investe in advertising?
  const [conProposta, setConProposta] = useState(true);
  const [racconto, setRacconto] = useState("");   // testo scritto dall'AI, poi ritoccabile
  const [proposta, setProposta] = useState("");
  const [fase, setFase] = useState("form");       // form | scrivo | pronto
  const [avviso, setAvviso] = useState("");
  const [scarico, setScarico] = useState(false);
  const [archivio, setArchivio] = useState(null); // {stato, percorso, motivo}
  const set = (k) => (e) => setM({ ...m, [k]: e.target.value });

  async function generaTesto() {
    setFase("scrivo"); setAvviso("");
    try {
      const res = await fetch("/api/report-testo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente: clientName, ...m, adv, conProposta }),
      });
      const d = await res.json();
      if (!res.ok || d.errore) throw new Error(d.errore || "non sono riuscito a scrivere il report");
      setRacconto(d.racconto || "");
      setProposta(conProposta ? d.proposta || m.passo : "");
      if (!d.conDossier) setAvviso("Questo cliente non ha il dossier in cartella: il testo è più generico del solito.");
    } catch (e) {
      // Senza AI il report si fa lo stesso: si usano gli appunti così come sono.
      setRacconto(m.attivita);
      setProposta(conProposta ? m.passo : "");
      setAvviso(`Testo non riscritto (${String(e.message || e)}). Sono rimasti i tuoi appunti: correggili a mano.`);
    } finally {
      setFase("pronto");
    }
  }

  // Archivia il PDF nella cartella Dropbox del cliente, in output/report/AAAA-MM.
  async function archiviaSuDropbox() {
    setArchivio({ stato: "lavoro" });
    try {
      const res = await fetch("/api/report-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente: clientName, ...m, racconto, passo: conProposta ? proposta : "", archivia: true }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.motivo || "archiviazione non riuscita");
      setArchivio({ stato: "fatto", percorso: d.percorso, link: d.link });
    } catch (e) {
      setArchivio({ stato: "errore", motivo: String(e && e.message ? e.message : e) });
    }
  }

  async function scaricaPdf() {
    setScarico(true);
    try {
      const res = await fetch("/api/report-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente: clientName, ...m, racconto, passo: conProposta ? proposta : "" }),
      });
      if (!res.ok) throw new Error("Il server non è riuscito a creare il PDF.");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `Report ${clientName} ${m.per}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      setAvviso(String(e && e.message ? e.message : e));
    } finally {
      setScarico(false);
    }
  }

  return (
    <div className="mod">
      <div className="modHead">
        <div><b>Report andamento — {clientName}</b><span className="modSub">tu i numeri e due appunti, il testo lo scrive l&apos;app</span></div>
      </div>

      {fase === "form" ? (
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
              nota="Appunti veloci, una riga per attività: ci pensa l'app a farne un discorso da mandare al cliente."
              v={m.attivita} on={set("attivita")} righe={4}
              placeholder={"12 contenuti tra post e reel\nshooting nuovi arrivi\nrisposte ai messaggi tutti i giorni"}
            />

            <div className="fld2 wide">
              <label>Questo cliente investe in advertising?</label>
              <div className="fldNota">Se non investe, nel report non si parlerà mai di campagne: promettere adv a chi non lo paga è il modo più veloce per creare un malinteso.</div>
              <div className="toggle2">
                <button className={adv ? "on" : ""} onClick={() => setAdv(true)}>Sì, fa campagne</button>
                <button className={!adv ? "on" : ""} onClick={() => setAdv(false)}>No, solo organico</button>
              </div>
            </div>

            <div className="fld2 wide">
              <label>Aggiungo la proposta per il prossimo periodo?</label>
              <div className="fldNota">È la sezione che guarda avanti. Facoltativa: se il rapporto è appena partito o è in fase di rinnovo, a volte è meglio parlarne a voce.</div>
              <div className="toggle2">
                <button className={conProposta ? "on" : ""} onClick={() => setConProposta(true)}>Sì, mettila</button>
                <button className={!conProposta ? "on" : ""} onClick={() => setConProposta(false)}>No, la salto</button>
              </div>
            </div>

            {conProposta ? (
              <Area
                label="Appunti per la proposta (facoltativi)"
                nota={adv
                  ? "Lascia pure vuoto: l'app propone qualcosa di coerente coi numeri, advertising compreso."
                  : "Lascia pure vuoto: l'app propone qualcosa di coerente coi numeri, restando sull'organico."}
                v={m.passo} on={set("passo")} righe={2}
                placeholder={"insistere sui reel dei tagli\ncontenuto fisso il giovedì"}
              />
            ) : null}

            <Area label="Una nota per il cliente (facoltativa)"
              nota="Due righe personali, come le diresti al telefono. Nel PDF escono in corsivo, così come le scrivi."
              v={m.nota} on={set("nota")} righe={2} />
            <Fld label="Firma (facoltativa)" v={m.firma} on={set("firma")} placeholder="Luisa — MiglioriAmo" />
          </div>
          <div className="modBtns">
            <button className="btn primary" onClick={generaTesto}>Scrivi il report →</button>
          </div>
        </>
      ) : fase === "scrivo" ? (
        <div className="empty">Sto scrivendo il report con i tuoi appunti…</div>
      ) : (
        <>
          <div className="stats">
            <Tile l="Copertura" v={m.reach} d={m.reachd} />
            <Tile l="Nuovi follower" v={m.fol} />
            <Tile l="Interazioni" v={m.int} />
            <Tile l="Visite profilo" v={m.vis} />
          </div>

          {avviso ? <div className="empty">⚠️ {avviso}</div> : null}

          <div className="form">
            <Area label="Cosa abbiamo fatto"
              nota="Scritto dall'app dai tuoi appunti. Rileggilo e correggi quello che vuoi: va al cliente così com'è."
              v={racconto} on={(e) => setRacconto(e.target.value)} righe={6} />
            {conProposta ? (
              <Area label="Cosa proponiamo adesso"
                nota={adv ? "Include l'advertising perché questo cliente investe." : "Solo organico: di campagne non si parla."}
                v={proposta} on={(e) => setProposta(e.target.value)} righe={4} />
            ) : null}
          </div>

          <div className="modBtns">
            <button className="btn" onClick={() => setFase("form")}>← Modifica i dati</button>
            <button className="btn" onClick={generaTesto}>↻ Riscrivi</button>
            <button className="btn primary" onClick={scaricaPdf} disabled={scarico}>
              {scarico ? "Preparo il PDF…" : "📄 Scarica il PDF"}
            </button>
            <button className="btn" onClick={archiviaSuDropbox} disabled={archivio?.stato === "lavoro"}>
              {archivio?.stato === "lavoro" ? "Archivio…" : "🗂️ Archivia nella cartella del cliente"}
            </button>
          </div>
          {archivio?.stato === "fatto" ? (
            <div className="empty">
              ✅ Archiviato in <b>{archivio.percorso}</b>
              {archivio.link ? <> · <a href={archivio.link} target="_blank" rel="noopener">apri su Dropbox</a></> : null}
            </div>
          ) : null}
          {archivio?.stato === "errore" ? <div className="empty">⚠️ {archivio.motivo}</div> : null}
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
