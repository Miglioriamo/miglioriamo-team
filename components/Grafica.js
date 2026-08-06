"use client";

import { useState } from "react";

const FORMATS = {
  aperti: { name: "Siamo aperti", eyebrow: "MARTEDÌ 2 GIUGNO 2026", title: "SIAMO APERTI", subtitle: "Pranzo e cena" },
  offerta: { name: "Offerta", eyebrow: "SOLO QUESTA SETTIMANA", title: "2 Pizze + Birra 20€", subtitle: "Tutte le sere" },
  menu: { name: "Menù del giorno", eyebrow: "Oggi in cucina", title: "Amatriciana", subtitle: "fatta come tradizione" },
  evento: { name: "Evento", eyebrow: "SABATO 14 · ORE 20:00", title: "Cena con delitto", subtitle: "Posti limitati · prenota" },
};
const ORDER = ["aperti", "offerta", "menu", "evento"];
const BGS = [
  "radial-gradient(120% 90% at 70% 20%, #6b5836 0%, #241a10 55%, #0c0906 100%)",
  "radial-gradient(120% 90% at 30% 30%, #3f5a3a 0%, #1c2417 55%, #080b06 100%)",
  "radial-gradient(120% 100% at 60% 70%, #7a3b2a 0%, #2a1510 55%, #0b0605 100%)",
  "radial-gradient(120% 90% at 50% 20%, #4a4f63 0%, #1c1f2a 55%, #07080c 100%)",
];
const POS = [["top", "In alto"], ["center", "Al centro"], ["bottom", "In basso"], ["bottomleft", "In basso ↤"]];
const INKS = ["#FFFFFF", "#111111", "#F4AD15", "#EAD9AE", "#E23B3B", "#2E8B57", "#2D6CDF", "#F5C6D0", "#7A4B2A", "#D4AF37"];
const LINES = ["#F4AD15", "#FFFFFF", "#111111", "#C0392B", "#3E9E63", "#2D6CDF", "#E67E22", "#8E44AD", "#EAD9AE", "#D4AF37"];
const FONTS = [
  ["impatto", "Impatto", '"Haettenschweiler","Arial Narrow",Impact,sans-serif'],
  ["elegante", "Elegante", '"Bodoni 72","Didot","Playfair Display",Georgia,serif'],
  ["moderno", "Moderno", '"Avenir Next","Futura","Century Gothic",system-ui,sans-serif'],
  ["pulito", "Pulito", '"Helvetica Neue",Arial,sans-serif'],
  ["tondo", "Tondo", '"Arial Rounded MT Bold","Trebuchet MS",system-ui,sans-serif'],
];
const DARK = [["0", "No"], ["0.22", "Leggero"], ["0.42", "Medio"], ["0.6", "Forte"]];

export default function Grafica({ clientName }) {
  const [fmt, setFmt] = useState("aperti");
  const [pos, setPos] = useState("bottom");
  const [ink, setInk] = useState("#FFFFFF");
  const [line, setLine] = useState("#F4AD15");
  const [font, setFont] = useState("impatto");
  const [dark, setDark] = useState("0");
  const [bgi, setBgi] = useState(0);
  const [src, setSrc] = useState("ai");
  const [eyebrow, setEyebrow] = useState(FORMATS.aperti.eyebrow);
  const [title, setTitle] = useState(FORMATS.aperti.title);
  const [subtitle, setSubtitle] = useState(FORMATS.aperti.subtitle);

  const chooseFmt = (k) => {
    setFmt(k);
    setEyebrow(FORMATS[k].eyebrow);
    setTitle(FORMATS[k].title);
    setSubtitle(FORMATS[k].subtitle);
  };

  const stack = FONTS.find((f) => f[0] === font)[2];
  const titleHtml = fmt === "offerta" ? title.replace(/(\S*€\S*)/, "<b>$1</b>") : null;

  return (
    <div className="mod">
      <div className="modHead">
        <div><b>Grafica — {clientName}</b><span className="modSub">testo perfetto dal template · logo e sfondo dal cliente</span></div>
      </div>

      <div className="gfx">
        <div className="layout">
          <div className="panel">
            <div className="lab">Format</div>
            <div className="grid2">
              {ORDER.map((k) => (
                <button key={k} className={"fbtn" + (k === fmt ? " on" : "")} onClick={() => chooseFmt(k)}>{FORMATS[k].name}</button>
              ))}
            </div>

            <div className="lab">Testo</div>
            <div className="fld"><label>Riga alta</label><input value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} /></div>
            <div className="fld"><label>Titolo</label><input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="fld"><label>Sottotitolo</label><input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></div>

            <div className="lab">Posizione testo</div>
            <div className="grid2">
              {POS.map(([k, l]) => (
                <button key={k} className={"fbtn" + (k === pos ? " on" : "")} onClick={() => setPos(k)}>{l}</button>
              ))}
            </div>

            <div className="lab">Colore scritte</div>
            <Swatches list={INKS} cur={ink} onPick={setInk} />
            <div className="lab">Colore linee</div>
            <Swatches list={LINES} cur={line} onPick={setLine} />

            <div className="lab">Font titolo</div>
            <div className="grid2">
              {FONTS.map((f) => (
                <button key={f[0]} className={"fbtn" + (f[0] === font ? " on" : "")} style={{ fontFamily: f[2] }} onClick={() => setFont(f[0])}>{f[1]}</button>
              ))}
            </div>

            <div className="lab">Sfondo</div>
            <div className="toggle2">
              <button className={src === "ai" ? "on" : ""} onClick={() => setSrc("ai")}>🤖 AI</button>
              <button className={src === "foto" ? "on" : ""} onClick={() => setSrc("foto")}>🖼️ Foto cliente</button>
            </div>
            <button className="rowbtn" onClick={() => setBgi((bgi + 1) % BGS.length)}>🔄 Cambia sfondo</button>

            <div className="lab">Velo scuro <span className="labnote">(se la foto è chiara)</span></div>
            <div className="grid2">
              {DARK.map(([v, l]) => (
                <button key={v} className={"fbtn" + (v === dark ? " on" : "")} onClick={() => setDark(v)}>{l}</button>
              ))}
            </div>

            <button className="rowbtn primary" onClick={() => alert("Grafica pronta (nell'app vera: salvataggio su Dropbox + PNG)")}>💾 Salva grafica</button>
          </div>

          <div className="stageWrap">
            <div className={`stage fmt-${fmt} pos-${pos}`} style={{ "--ink": ink, "--line": line }}>
              <div className="bg" style={{ background: BGS[bgi] }} />
              <div className="dark" style={{ background: `rgba(0,0,0,${dark})` }} />
              <div className="ov" />
              <div className="logo">{clientName}</div>
              <div className="txt">
                <div className="eyebrow">{eyebrow}</div>
                {titleHtml ? (
                  <div className="title" style={{ fontFamily: stack }} dangerouslySetInnerHTML={{ __html: titleHtml }} />
                ) : (
                  <div className="title" style={{ fontFamily: stack }}>{title}</div>
                )}
                <div className="subtitle">{subtitle}</div>
              </div>
            </div>
            <div className="srcbadge">Sfondo: <b>{src === "ai" ? "generato con AI" : "foto del cliente"}</b> · 4:5</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Swatches({ list, cur, onPick }) {
  return (
    <div className="swatches">
      {list.map((c) => (
        <button key={c} className={"sw" + (c.toLowerCase() === cur.toLowerCase() ? " on" : "")} style={{ background: c }} onClick={() => onPick(c)} />
      ))}
      <input type="color" value={cur} onChange={(e) => onPick(e.target.value)} />
    </div>
  );
}
