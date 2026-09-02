"use client";

import { useEffect, useState } from "react";
import { rimuoviSfondo, haGiaTrasparenza, TOLLERANZE } from "../lib/sfondo";
import { estraiColori, scurisci } from "../lib/palette";

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
const PULIZIE = [["leggera", "Leggera"], ["media", "Media"], ["forte", "Forte"], ["massima", "Massima"]];
const TIPI_BG = [["foto", "Foto"], ["tinta", "Tinta unita"], ["sfumatura", "Sfumatura"], ["fantasia", "Fantasia"]];
const DIREZIONI = [["verticale", "Dall'alto"], ["diagonale", "Diagonale"], ["radiale", "Dal centro"]];
// Fondi che reggono bene il testo: scuri profondi, neutri caldi e qualche colore pieno.
const SFONDI = ["#111111", "#1C1F2A", "#241A10", "#12241C", "#2A1510", "#3A2E4A",
  "#F7F3EA", "#FFFFFF", "#F4AD15", "#C0392B", "#2D6CDF", "#2E8B57"];

export default function Grafica({ clientName }) {
  const [fmt, setFmt] = useState("aperti");
  const [pos, setPos] = useState("bottom");
  const [ink, setInk] = useState("#FFFFFF");
  const [line, setLine] = useState("#F4AD15");
  const [font, setFont] = useState("impatto");
  const [dark, setDark] = useState("0");
  const [bgi, setBgi] = useState(0);
  const [bgTipo, setBgTipo] = useState("fantasia");
  const [col1, setCol1] = useState("#1C1F2A");
  const [col2, setCol2] = useState(scurisci("#1C1F2A", 0.55));
  const [col2Auto, setCol2Auto] = useState(true); // finché non lo scegli tu, lo abbino io
  const [dir, setDir] = useState("verticale");
  const [palette, setPalette] = useState([]);
  const [foto, setFoto] = useState(null);        // { url, nome }
  const [inquadratura, setInquadratura] = useState(50); // quale parte della foto resta nel 4:5

  // La foto sta solo nel browser: si sceglie dal computer e si vede subito.
  function scegliFoto(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // così ricaricando lo stesso file riparte comunque
    if (!file) return;
    if (foto) URL.revokeObjectURL(foto.url);
    setFoto({ url: URL.createObjectURL(file), nome: file.name });
    setBgTipo("foto");
  }
  function togliFoto() {
    if (foto) URL.revokeObjectURL(foto.url);
    setFoto(null);
  }
  const [eyebrow, setEyebrow] = useState(FORMATS.aperti.eyebrow);
  const [title, setTitle] = useState(FORMATS.aperti.title);
  const [subtitle, setSubtitle] = useState(FORMATS.aperti.subtitle);
  const [logo, setLogo] = useState(clientName);
  // Logo vero del cliente, preso da Dropbox e ripulito dallo sfondo.
  const [logoImg, setLogoImg] = useState(null);
  const [logoInfo, setLogoInfo] = useState(null);
  const [logoStato, setLogoStato] = useState("vuoto"); // vuoto | carico | ok | errore
  const [logoMsg, setLogoMsg] = useState("");
  const [pulizia, setPulizia] = useState("media");
  const [togliFondo, setTogliFondo] = useState(true);
  const [ancheDentro, setAncheDentro] = useState(false);
  const [logoH, setLogoH] = useState(14); // altezza in % della grafica

  // Cambiando cliente il logo di prima non c'entra più niente.
  useEffect(() => {
    setLogoImg(null); setLogoInfo(null); setLogoStato("vuoto"); setLogoMsg(""); setPalette([]);
    // via anche la foto: è di un altro cliente
    setFoto((f) => { if (f) URL.revokeObjectURL(f.url); return null; });
    setInquadratura(50);
  }, [clientName]);

  // Scegliendo il colore principale, il secondo si abbina da solo (più scuro),
  // finché non lo si sceglie a mano.
  const scegliCol1 = (c) => {
    setCol1(c);
    if (col2Auto) setCol2(scurisci(c, 0.55));
  };
  const scegliCol2 = (c) => { setCol2Auto(false); setCol2(c); };

  const sfondoCss =
    bgTipo === "foto" && foto
      ? `url("${foto.url}") 50% ${inquadratura}% / cover no-repeat`
      : bgTipo === "tinta"
      ? col1
      : bgTipo === "sfumatura"
      ? dir === "radiale"
        ? `radial-gradient(120% 90% at 50% 25%, ${col1} 0%, ${col2} 100%)`
        : dir === "diagonale"
        ? `linear-gradient(135deg, ${col1} 0%, ${col2} 100%)`
        : `linear-gradient(180deg, ${col1} 0%, ${col2} 100%)`
      : BGS[bgi];

  async function caricaLogo(livello = pulizia, rimuovi = togliFondo, dentro = ancheDentro) {
    setLogoStato("carico"); setLogoMsg("");
    try {
      const res = await fetch(`/api/logo?name=${encodeURIComponent(clientName)}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setLogoMsg(j.motivo || j.errore || "Non riesco a leggere il logo dalla cartella.");
        setLogoStato("errore");
        return;
      }
      const formato = res.headers.get("X-Logo-Formato") || "";
      const img = await caricaBitmap(await res.blob());
      const { dataUrl, nota, colori } = elabora(img, rimuovi, TOLLERANZE[livello], dentro);
      setLogoImg(dataUrl);
      setPalette(colori);
      setLogoInfo({ formato });
      setLogoMsg(nota);
      setLogoStato("ok");
    } catch (e) {
      setLogoMsg(String(e && e.message ? e.message : e));
      setLogoStato("errore");
    }
  }

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
            <div className="fld"><label>Riga logo / testo in alto</label><input value={logo} onChange={(e) => setLogo(e.target.value)} /></div>

            <div className="lab">Logo del cliente <span className="labnote">(dalla cartella Dropbox)</span></div>
            {logoImg ? (
              <>
                <div className="logoBox">
                  <img src={logoImg} alt="logo del cliente" />
                  <div>
                    <div className="logoNome">{logoInfo?.formato ? logoInfo.formato.toUpperCase() : "logo"} caricato</div>
                    {logoMsg ? <div className="logoNota">{logoMsg}</div> : null}
                  </div>
                </div>
                <div className="fld">
                  <label>Dimensione logo</label>
                  <input type="range" min="6" max="30" value={logoH} onChange={(e) => setLogoH(Number(e.target.value))} />
                </div>
                <div className="lab">Pulizia sfondo</div>
                <div className="grid2">
                  {PULIZIE.map(([k, l]) => (
                    <button key={k} className={"fbtn" + (togliFondo && k === pulizia ? " on" : "")}
                      onClick={() => { setPulizia(k); setTogliFondo(true); caricaLogo(k, true, ancheDentro); }}>{l}</button>
                  ))}
                  <button className={"fbtn" + (togliFondo ? "" : " on")}
                    onClick={() => { setTogliFondo(false); caricaLogo(pulizia, false, ancheDentro); }}>Lascia lo sfondo</button>
                </div>
                <button className={"rowbtn" + (ancheDentro ? " primary" : "")}
                  onClick={() => { const v = !ancheDentro; setAncheDentro(v); caricaLogo(pulizia, true, v); }}>
                  {ancheDentro ? "✓ Pulisce anche dentro il logo" : "Pulisci anche dentro il logo"}
                </button>
                <div className="logoNota">
                  Da usare se resta del bianco nei buchi delle lettere o dentro una cornice.
                  Tienilo spento se il logo ha scritte bianche su fondo scuro: sparirebbero.
                </div>
                <button className="rowbtn" onClick={() => { setLogoImg(null); setLogoStato("vuoto"); setLogoMsg(""); }}>✕ Togli il logo</button>
              </>
            ) : (
              <>
                <button className="rowbtn" disabled={logoStato === "carico"} onClick={() => caricaLogo()}>
                  {logoStato === "carico" ? "Sto prendendo il logo…" : "🖼️ Aggiungi logo"}
                </button>
                {logoStato === "errore" ? <div className="logoNota err">{logoMsg}</div> : null}
              </>
            )}

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
            <div className="grid2">
              {TIPI_BG.map(([k, l]) => (
                <button key={k} className={"fbtn" + (k === bgTipo ? " on" : "")} onClick={() => setBgTipo(k)}>{l}</button>
              ))}
            </div>

            {bgTipo === "foto" ? (
              <>
                <label className="rowbtn fileBtn">
                  {foto ? "🖼️ Cambia foto" : "🖼️ Scegli una foto dal computer"}
                  <input type="file" accept="image/*" onChange={scegliFoto} />
                </label>
                {foto ? (
                  <>
                    <div className="logoNota">{foto.nome}</div>
                    <div className="fld">
                      <label>Inquadratura <span className="labnote">(cosa resta dentro il formato 4:5)</span></label>
                      <input type="range" min="0" max="100" value={inquadratura}
                        onChange={(e) => setInquadratura(Number(e.target.value))} />
                    </div>
                    <button className="rowbtn" onClick={togliFoto}>✕ Togli la foto</button>
                    <div className="logoNota">
                      Se la foto è chiara e le scritte si leggono male, alza il <b>velo scuro</b> qui sotto.
                    </div>
                  </>
                ) : (
                  <div className="logoNota">Va bene una foto qualsiasi del cliente: piatto, vetrina, locale. Viene ritagliata nel formato 4:5.</div>
                )}
              </>
            ) : bgTipo === "fantasia" ? (
              <button className="rowbtn" onClick={() => setBgi((bgi + 1) % BGS.length)}>🔄 Cambia fantasia</button>
            ) : (
              <>
                {palette.length ? (
                  <>
                    <div className="lab">Colori del logo <span className="labnote">(presi dal marchio del cliente)</span></div>
                    <Swatches list={palette} cur={col1} onPick={scegliCol1} senzaPicker />
                  </>
                ) : null}
                <div className="lab">{bgTipo === "sfumatura" ? "Colore principale" : "Colore"}</div>
                <Swatches list={SFONDI} cur={col1} onPick={scegliCol1} />
                {bgTipo === "sfumatura" ? (
                  <>
                    <div className="lab">Secondo colore</div>
                    <Swatches list={SFONDI} cur={col2} onPick={scegliCol2} />
                    <div className="lab">Direzione</div>
                    <div className="grid2">
                      {DIREZIONI.map(([k, l]) => (
                        <button key={k} className={"fbtn" + (k === dir ? " on" : "")} onClick={() => setDir(k)}>{l}</button>
                      ))}
                    </div>
                  </>
                ) : null}
              </>
            )}

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
              <div className="bg" style={{ background: sfondoCss }} />
              <div className="dark" style={{ background: `rgba(0,0,0,${dark})` }} />
              <div className="ov" />
              {logoImg ? (
                <div className="logo img" style={{ "--logoH": logoH + "cqw" }}>
                  <img src={logoImg} alt="" />
                </div>
              ) : (
                <div className="logo">{logo}</div>
              )}
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
            <div className="srcbadge">
              Sfondo: <b>{bgTipo === "foto" ? (foto ? "foto del cliente" : "foto da scegliere") : bgTipo === "tinta" ? "tinta unita" : bgTipo === "sfumatura" ? "sfumatura" : "fantasia"}</b> · 4:5
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Carica un file immagine (png/jpg/webp/svg) in modo che si possa disegnare. */
function caricaBitmap(blob) {
  return new Promise((risolvi, rifiuta) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); risolvi(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rifiuta(new Error("Il file del logo non è leggibile.")); };
    img.src = url;
  });
}

/** Ridisegna il logo su una tela, gli toglie lo sfondo e lo restituisce come PNG. */
function elabora(img, rimuovi, tolleranza, ancheDentro = false) {
  const lw = img.naturalWidth || img.width || 512;
  const lh = img.naturalHeight || img.height || 512;
  const scala = Math.min(1, 800 / Math.max(lw, lh));
  const tela = document.createElement("canvas");
  tela.width = Math.max(1, Math.round(lw * scala));
  tela.height = Math.max(1, Math.round(lh * scala));
  const ctx = tela.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, tela.width, tela.height);

  let nota = "";
  const dati = ctx.getImageData(0, 0, tela.width, tela.height);
  if (rimuovi) {
    if (haGiaTrasparenza(dati)) {
      nota = "aveva già lo sfondo trasparente";
    } else {
      const esito = rimuoviSfondo(dati, tolleranza, { ancheDentro, rifinisci: true });
      ctx.clearRect(0, 0, tela.width, tela.height);
      ctx.putImageData(dati, 0, 0);
      if (esito.percentuale < 0.05) nota = "sfondo poco uniforme: prova “Forte” o “Massima”";
    }
  } else {
    nota = "sfondo lasciato com'era";
  }
  // I colori del marchio servono a proporre sfondi coerenti col cliente.
  const colori = estraiColori(dati, 5);
  return { dataUrl: tela.toDataURL("image/png"), nota, colori };
}

function Swatches({ list, cur, onPick, senzaPicker }) {
  return (
    <div className="swatches">
      {list.map((c) => (
        <button key={c} className={"sw" + (c.toLowerCase() === cur.toLowerCase() ? " on" : "")} style={{ background: c }} onClick={() => onPick(c)} />
      ))}
      {senzaPicker ? null : <input type="color" value={cur} onChange={(e) => onPick(e.target.value)} />}
    </div>
  );
}
